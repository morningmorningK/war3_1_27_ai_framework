/**
 * 阶段 1 探针 —— 1.27a / KKWE 下的原生 Frame 可用性验证
 *
 * 背景（2026-10-04 重新核实后修正）：
 *   原先以为 `japi.d.ts` 是「类型声明的超集」。实际做全量比对后：
 *   `dev_lib/KKWE/jass/*.j` 定义了 842 个 `Dz*`，`japi.d.ts` 声明 751 个，
 *   其中**只有 2 个**（`DzAPI_Map_GetGuildName` / `DzAPI_Map_GetUserID`）
 *   在 `.j` 里查无定义，且都是平台存档 API。**frame/UI 这一层是准确完整的。**
 *
 *   所以本探针**不再需要**验证「函数是否存在」。真正剩下的未知量只有：
 *     (a) 暴雪原生 frame **名字**在 1.27a 下能否被 `DzFrameFindByName` 解析到
 *     (b) 命令卡按钮 getter 的行列顺序
 *     (c) CHECKBOX 的事件 id 编号（6/7 还是 7/8）与 `sync` 取值
 *     (d) `DzOriginalUIAutoResetPoint(false)` 是否会崩
 *     (e) 能否真的**改掉**一个原生按钮的位置（移植的最小可用性证明）
 *
 * 验证完毕即删除本文件，并移除 `src/main.ts` 里的 `runNativeUIProbe()` 调用。
 */

import { Timer } from "@eiriksgata/wc3ts/*";
import { createLogger } from "src/utils/logger";
import { dumpLookupReport, frameByName } from "src/system/ui/gameui/NativeFrames";
import { NativeUISystem } from "src/system/ui/gameui/NativeUISystem";

const log = createLogger("Probe");

/** bootstrap.lua 在 dev 模式下注入的全局，指向 dist/ 目录；prod 模式下不存在 */
declare const PROJECT_PATH: string | undefined;

/**
 * 是否执行**有副作用**的测试（第 3/4/5 项：建复选框、改 UI 锚点、挪命令卡按钮）。
 *
 * **当前关闭**：这几项会改掉原生 UI 的状态（第 4 项关掉自动锚点、第 5 项把
 * `CommandButton_0` 挪到屏幕中央），一旦跑过，同一局里再测别的就说不清了。
 * 现在正在验证「镜头拉高闪退」的修复，保持单变量。
 *
 * 只读部分（1/2 项）仍然会跑，结果进剪贴板。
 */
const PROBE_MUTATIONS = false;

// ---------------------------------------------------------------------------
// 输出通道
// ---------------------------------------------------------------------------

/**
 * 输出缓冲。
 *
 * `print` 只进游戏内覆盖层（`bootstrap.lua` 里的 `jass.console`），滚屏即丢，
 * 一百多行明细根本截不全。war3 又是 GUI 子系统程序，`test.ts` 的 stdio 抓不到。
 *
 * **不要用 `io.open`** —— 实测它在 KKWE 的 Lua 沙箱里会**阻塞**
 * （不是报错：报错的话 `pcall` 会吞掉、游戏继续跑；实际是整局卡死）。
 * 早先怀疑它是不是根因，后来查明崩溃是 `war3/Fonts-msyhsb.mix` 这个第三方
 * 字体 mod 引起的（已改名为 `.bak`），但 `io.open` 卡死是**独立成立**的实测结论，
 * 所以这里彻底不再碰文件系统。
 *
 * 取回结果的方式：
 *   - `DzSetClipboard(report)` —— **主通道**，退出游戏后直接粘贴到文本文件
 *   - `print` —— 只打里程碑行（SECTION / SUMMARY / DONE），游戏内能看进度
 */
const buffer: string[] = [];

/**
 * 每行同时写进 KKWE 平台日志（`DzWriteLog`，见 `japi.d.ts:1962` / `KKAPI.j`）。
 *
 * 这是**主持久通道**。`DzSetClipboard` 太脆：只要用户复制一次别的东西，报告就没了
 * —— 2026-10-04 实际发生过，用户复制控制台日志来反馈，把 107 行报告整个覆盖掉。
 * 平台日志是落盘的，不受任何操作影响，事后直接读文件即可。
 */
function persist(line: string): void {
  try {
    DzWriteLog(`[NativeUIProbe] ${line}`);
  } catch (e) {
    // 平台日志不可用就静默降级 —— 绝不能因为诊断把探针本身搞挂
  }
}

/** 明细行：进缓冲区 + 平台日志，最后一次性进剪贴板 */
function emit(line: string): void {
  buffer.push(line);
  persist(line);
}

/** 里程碑行：同时进缓冲区、平台日志与游戏内控制台，方便人肉看进度 */
function say(line: string): void {
  buffer.push(line);
  persist(line);
  print(`[Probe] ${line}`);
}

/**
 * 把缓冲区内容送进剪贴板。
 *
 * 可以调用多次：每次送的是**目前累计的全部内容**，
 * 所以后一次调用会覆盖前一次，且内容只增不减。
 */
function flushToClipboard(quiet: boolean = false): void {
  if (buffer.length === 0) {
    return;
  }
  const report = [
    "===== NativeUIProbe @ 1.27a / KKWE =====",
    ...buffer,
    "===== end =====",
  ].join("\n");

  try {
    DzSetClipboard(report);
    if (!quiet) {
      say(`CLIPBOARD|written ${buffer.length} lines (${report.length} chars)`);
      log.info(`probe report copied to clipboard: ${buffer.length} lines`);
    }
  } catch (e) {
    if (!quiet) {
      say(`CLIPBOARD|FAILED ${e}`);
      log.error(`DzSetClipboard failed: ${e}`);
    }
  }
}

// ---------------------------------------------------------------------------

/**
 * framehandle 在 Lua 里是 number，0 在 Lua 中为真值，必须显式判断。
 * 写成类型谓词，这样 `if (!ok(h)) return;` 之后 h 会被收窄成 number。
 */
function ok(h: any): h is number {
  return h != null && h !== 0;
}

function fmt(h: any): string {
  if (h == null) return "nil";
  if (h === 0) return "0";
  return `#${h}`;
}

/**
 * 源端 `BlzGetFrameByName(name, id)` 用到的全部 (名字, id) 组合。
 * 逐条照抄自 `dev_lib/w3x2lni/script/luav3/map/war3map.lua`。
 */
const NAMED_FRAMES: Array<[string, number]> = [
  ["ConsoleUI", 0],
  ["ConsoleUIBackdrop", 0],
  ["ConsoleBottomBar", 0],
  ["ResourceBarFrame", 0],
  ["UpperButtonBarFrame", 0],
  ["MiniMapFrame", 0],
  ["SimpleInfoPanelUnitDetail", 0],
  ["SimpleNameValue", 0],
  ["SimpleClassValue", 0],
  ["SimpleHeroLevelBar", 0],
  ["SimpleInventoryCover", 0],
  ["InventoryText", 0],
  ["SimpleProgressIndicator", 0],
  ["InfoPanelIconBackdrop", 0],
  ["InfoPanelIconBackdrop", 2],
  ["InfoPanelIconLabel", 0],
  ["InfoPanelIconLabel", 2],
  ["InfoPanelIconValue", 0],
  ["InfoPanelIconValue", 2],
  ["InfoPanelIconHeroIcon", 6],
  ["InfoPanelIconHeroStrengthLabel", 6],
  ["InfoPanelIconHeroStrengthValue", 6],
  ["InfoPanelIconHeroAgilityLabel", 6],
  ["InfoPanelIconHeroAgilityValue", 6],
  ["InfoPanelIconHeroIntellectLabel", 6],
  ["InfoPanelIconHeroIntellectValue", 6],
  ["SimpleBuildTimeIndicator", 1],
  ["SimpleBuildingNameValue", 1],
  ["SimpleBuildingActionLabel", 1],
  ["SimpleHoldNameValue", 2],
  ["SimpleHoldDescriptionNameValue", 2],
  ["SimpleItemNameValue", 3],
  ["SimpleItemDescriptionValue", 3],
  ["SimpleDestructableNameValue", 4],
  ...Array.from({ length: 12 }, (_, i) => [`CommandButton_${i}`, 0] as [string, number]),
  ...Array.from({ length: 6 }, (_, i) => [`InventoryButton_${i}`, 0] as [string, number]),
];

/**
 * 1.27a 的四个 finder。**这是本探针第一版做错的地方** ——
 * 只用 `DzFrameFindByName` 一个，于是所有暴雪原生 frame（它们全来自 fdf，
 * 属 Simple 类）一律报 MISS。定义见 `dev_lib/KKWE/jass/BlizzardAPI.j:91-94`。
 */
const FINDERS: Array<[string, (name: string, id: number) => any]> = [
  ["SimpleFrame", (n, i) => DzSimpleFrameFindByName(n, i)],
  ["Frame", (n, i) => DzFrameFindByName(n, i)],
  ["SimpleFontString", (n, i) => DzSimpleFontStringFindByName(n, i)],
  ["SimpleTexture", (n, i) => DzSimpleTextureFindByName(n, i)],
];

/**
 * 第 1 项：名字 → 句柄 解析，**逐个 finder 对比**
 *
 * 这是**整个移植最关键的假设**：阶段 3 的骨架几乎全靠按名字取原生 frame。
 * 输出格式 `NAME|<名字>|<id>|SimpleFrame=X|Frame=Y|SimpleFontString=Z|SimpleTexture=W`，
 * 命中哪个 finder 一目了然。
 */
function probeNamedFrames(): void {
  const byFinder: Record<string, number> = { SimpleFrame: 0, Frame: 0, SimpleFontString: 0, SimpleTexture: 0 };
  let anyHit = 0;
  const allMissed: string[] = [];

  for (const [name, id] of NAMED_FRAMES) {
    const parts: string[] = [];
    let hitAny = false;

    for (const [label, find] of FINDERS) {
      // ⚠️ 不要在 catch 里写 `continue`：tstl 把 catch 编成内嵌函数，Lua 的 goto
      // 不跨函数找 label，生成的 `goto __continueN` 会让整个 .lua 加载失败。
      // 详见 src/system/ui/gameui/NativeFrames.ts 里的同名说明。
      let h: any;
      let threw = false;
      try {
        h = find(name, id);
      } catch (e) {
        threw = true;
      }

      if (threw) {
        parts.push(`${label}=<threw>`);
      } else if (ok(h)) {
        hitAny = true;
        byFinder[label]++;
        // 顺带回读一次名字，验证 API 双向可用
        let backName = "?";
        try {
          backName = DzFrameGetName(h);
        } catch (e) {
          backName = "<threw>";
        }
        parts.push(`${label}=${fmt(h)}("${backName}")`);
      } else {
        parts.push(`${label}=0`);
      }
    }

    if (hitAny) {
      anyHit++;
      emit(`NAME|${name}|${id}|HIT|${parts.join("|")}`);
    } else {
      allMissed.push(`${name}[${id}]`);
      emit(`NAME|${name}|${id}|MISS|${parts.join("|")}`);
    }
  }

  say(`NAME_SUMMARY|${anyHit}/${NAMED_FRAMES.length} resolved`);
  // ⚠️ 不要用 `JSON.stringify` —— tstl **不 polyfill `JSON`**（`Math`/`Object`/`Array`
  // 有，`JSON` 没有），Lua 里它是 nil，运行到这一行会抛
  // "attempt to index a nil value (global 'JSON')"。2026-10-04 就是这一行让探针
  // 在第 1 项之后整个中断，最终 `flushToClipboard()` 没跑到，报告全丢。
  // key 是固定的四个，直接列出来即可。
  emit(
    `BY_FINDER|SimpleFrame=${byFinder.SimpleFrame}, Frame=${byFinder.Frame}, ` +
      `SimpleFontString=${byFinder.SimpleFontString}, SimpleTexture=${byFinder.SimpleTexture}`
  );
  if (allMissed.length > 0) {
    emit(`ALL_MISSED|${allMissed.join(", ")}`);
  }
}

/**
 * 第 2 项：专用 getter 全景
 *
 * 清单来自 `dev_lib/KKWE/jass/BlizzardAPI.j` + `KKAPI.j` + `KKPRE.j` 的实测定义
 * （见文件头注释）。这些 getter 是「按名字取不到」时的兜底路径，
 * 但它们各自返回什么、在没选中单位时是否为空，必须实测。
 */
function probeGetters(): void {
  const rows: Array<[string, () => any]> = [
    // —— 根节点 ——
    ["DzGetGameUI", () => DzGetGameUI()],
    // —— 顶部/底部/侧边面板 ——
    ["DzFrameGetPortrait", () => DzFrameGetPortrait()],
    ["DzFrameGetMinimap", () => DzFrameGetMinimap()],
    ["DzFrameGetMinimapButton(0)", () => DzFrameGetMinimapButton(0)],
    ["DzFrameGetUpperButtonBarButton(0)", () => DzFrameGetUpperButtonBarButton(0)],
    ["DzFrameGetLowerLevelFrame", () => DzFrameGetLowerLevelFrame()],
    ["DzFrameGetPeonBar", () => DzFrameGetPeonBar()],
    ["DzFrameGetChatEditBar", () => DzFrameGetChatEditBar()],
    ["DzGetCursorFrame", () => DzGetCursorFrame()],
    // —— 选中单位 ——
    ["DzGetSelectedLeaderUnit", () => DzGetSelectedLeaderUnit()],
    ["DzGetLocalSelectUnitCount", () => DzGetLocalSelectUnitCount()],
    ["DzGetLocalSelectUnit(0)", () => DzGetLocalSelectUnit(0)],
    // —— buff 条 ——
    ["DzGetBuffBar", () => DzGetBuffBar()],
    ["DzGetBuffBarButton(0,0)", () => DzGetBuffBarButton(0, 0)],
    ["DzFrameGetInfoPanelBuffButton(0)", () => DzFrameGetInfoPanelBuffButton(0)],
    ["DzFrameGetInfoPanelBuffButton(1)", () => DzFrameGetInfoPanelBuffButton(1)],
    // —— 英雄头像栏 ——
    ["DzFrameGetHeroBarButton(0)", () => DzFrameGetHeroBarButton(0)],
    ["DzFrameGetHeroHPBar(0)", () => DzFrameGetHeroHPBar(0)],
    ["DzFrameGetHeroManaBar(0)", () => DzFrameGetHeroManaBar(0)],
    // —— 命令卡（行列顺序是本项的重点） ——
    ["DzFrameGetCommandBarButton(0,0)", () => DzFrameGetCommandBarButton(0, 0)],
    ["DzFrameGetCommandBarButton(0,1)", () => DzFrameGetCommandBarButton(0, 1)],
    ["DzFrameGetCommandBarButton(1,0)", () => DzFrameGetCommandBarButton(1, 0)],
    ["DzFrameGetCommandBarButton(1,1)", () => DzFrameGetCommandBarButton(1, 1)],
    ["DzFrameGetCommandBarButton(2,0)", () => DzFrameGetCommandBarButton(2, 0)],
    ["DzFrameGetCommandBarButton(3,0)", () => DzFrameGetCommandBarButton(3, 0)],
    // —— 命令卡下钻四件套（阶段 3 画冷却/自动施法指示要用） ——
    ["CmdBarButton(0,0).CooldownIndicator", () => DzFrameGetCommandBarButtonCooldownIndicator(DzFrameGetCommandBarButton(0, 0))],
    ["CmdBarButton(0,0).AutoCastIndicator", () => DzFrameGetCommandBarButtonAutoCastIndicator(DzFrameGetCommandBarButton(0, 0))],
    ["CmdBarButton(0,0).NumberOverlay", () => DzFrameGetCommandBarButtonNumberOverlay(DzFrameGetCommandBarButton(0, 0))],
    ["CmdBarButton(0,0).NumberText", () => DzFrameGetCommandBarButtonNumberText(DzFrameGetCommandBarButton(0, 0))],
    // —— 物品栏（DzGetInventoryBarButton 优于 DzFrameGetItemBarButton，后者只支持前 6 格） ——
    ["DzGetInventoryBarButton(0)", () => DzGetInventoryBarButton(0)],
    ["DzFrameGetItemBarButton(0)", () => DzFrameGetItemBarButton(0)],
    // —— 信息面板 / 提示 / 消息 ——
    ["DzFrameGetInfoPanelSelectButton(0)", () => DzFrameGetInfoPanelSelectButton(0)],
    ["DzFrameGetTooltip", () => DzFrameGetTooltip()],
    ["DzFrameGetChatMessage", () => DzFrameGetChatMessage()],
    ["DzFrameGetUnitMessage", () => DzFrameGetUnitMessage()],
    ["DzFrameGetTopMessage", () => DzFrameGetTopMessage()],
    ["DzFrameGetWorldFrameMessage", () => DzFrameGetWorldFrameMessage()],
    // —— 鼠标/触发者 ——
    ["DzGetTriggerUIEventFrame", () => DzGetTriggerUIEventFrame()],
    ["DzGetTriggerUIEventPlayer", () => fmt(DzGetTriggerUIEventPlayer())],
    ["DzGetMouseFocus", () => DzGetMouseFocus()],
    ["DzFrameGetMouse", () => DzFrameGetMouse()],
    // —— 屏幕尺寸基准（阶段 3 的坐标换算要） ——
    ["DzGetWindowWidth", () => DzGetWindowWidth()],
    ["DzGetWindowHeight", () => DzGetWindowHeight()],
    ["DzGetClientWidth", () => DzGetClientWidth()],
    ["DzGetClientHeight", () => DzGetClientHeight()],
    ["DzGetLocale", () => DzGetLocale()],
  ];

  for (const [label, fn] of rows) {
    let value: string;
    try {
      value = fmt(fn());
    } catch (e) {
      value = `<threw: ${e}>`;
    }
    emit(`GETTER|${label}|${value}`);
  }

  // 行列顺序判定：命令卡按钮 (0,0) 与 (1,1) 若都非 0，说明 (0,0) 是有效起点
  const a = DzFrameGetCommandBarButton(0, 0);
  const b = DzFrameGetCommandBarButton(1, 1);
  emit(`CMDBAR_BASE|(0,0)=${fmt(a)}|(1,1)=${fmt(b)}`);
}

/**
 * 第 3 项：CHECKBOX 事件 id 实测
 *
 * 对同一个复选框把 1..9 全部绑一遍，每个 id 一个独立闭包，点击后看哪个打印出来。
 * `sync` 参数并排建两个框对比（A=true / B=false）。
 *
 * 这一步决定 `src/constants/frame/events.ts` 里那批错位常量该怎么修 ——
 * 现有常量以 `MOUSE_WHEEL` 为界整体偏移，`CHECKBOX_UNCHECKED` 还整条缺失。
 *
 * 注意：光秃秃的 `CHECKBOX` 没有贴图，肉眼找不到，所以借一张内置贴图让它可见。
 */
function probeCheckboxEvents(): number {
  const parent = DzGetGameUI();
  if (!ok(parent)) {
    say("CHECKBOX_CREATE_FAIL|no-gameui");
    return 0;
  }

  let created = 0;
  for (const sync of [true, false]) {
    const name = sync ? "ProbeCheckBoxSync" : "ProbeCheckBoxAsync";
    const frame = DzCreateFrameByTagName("CHECKBOX", name, parent, "", 0);
    if (!ok(frame)) {
      say(`CHECKBOX_CREATE_FAIL|${name}`);
      continue;
    }
    created++;

    const x = sync ? 0.30 : 0.45;
    DzFrameSetSize(frame, 0.06, 0.06);
    DzFrameSetAbsolutePoint(frame, 0, x, 0.36); // FRAMEPOINT_TOPLEFT
    DzFrameSetTexture(frame, "UI\\Widgets\\EscMenu\\Human\\editbox-background.blp", 0);
    DzFrameSetAlpha(frame, 255);

    for (let eventId = 1; eventId <= 9; eventId++) {
      const bound = eventId;
      const boundSync = sync;
      DzFrameSetScriptByCode(
        frame,
        bound,
        () => {
          say(`CHECKBOX_FIRE|sync=${boundSync}|eventId=${bound}|state=${DzFrameGetCheckBoxState(frame)}`);
        },
        sync
      );
    }

    emit(`CHECKBOX_CREATED|${name}|sync=${sync}|${fmt(frame)}`);
  }

  if (created > 0) {
    say(`CHECKBOX_READY|${created} 个方框已建在屏幕中部（左=sync，右=async），请各点几下`);
  }
  return created;
}

/**
 * 第 4 项：UI 自动锚点重置
 *
 * 源端 `BlzEnableUIAutoPosition(false)`（war3map.lua:664）的替代。
 * 这是**全局副作用**：关掉之后暴雪原生 UI 不再自动调整锚点。
 * 如果它会崩，阶段 3 得换一条路（自己算锚点）。
 */
function probeAutoResetPoint(): void {
  try {
    DzOriginalUIAutoResetPoint(false);
    emit("AUTORESET|ok");
  } catch (e) {
    emit(`AUTORESET|threw:${e}`);
  }
}

/**
 * 第 5 项：实际挪动一个命令卡按钮 —— 整个移植的最小可用性证明
 *
 * 比上面任何「能取到句柄」都关键：取到句柄 ≠ 能改布局。
 */
function probeMoveCommandButton(): void {
  // 走 NativeFrames 的查找层，而不是直接调某一个 finder ——
  // 这样这一步同时也在验证「阶段 3 实际用的那条路径」通不通。
  const h = frameByName("CommandButton_0", 0);
  if (!ok(h)) {
    say("MOVE_SKIP|CommandButton_0 not found");
    return;
  }

  // 挪到屏幕中央偏上，两个对角都设一遍以确保生效
  DzFrameClearAllPoints(h);
  DzFrameSetAbsolutePoint(h, 0, 0.36, 0.34); // TOPLEFT
  DzFrameSetAbsolutePoint(h, 8, 0.46, 0.24); // BOTTOMRIGHT
  DzFrameSetScale(h, 1.5);

  const after = frameByName("CommandButton_0", 0);
  emit(`MOVED|CommandButton_0|${fmt(h)}|refind=${fmt(after)}`);
  say("MOVED|CommandButton_0 已挪到屏幕中部偏上，请确认按钮是否真的移动了");
}

/**
 * 第 6 项：`NativeUISystem` 自己解析出来的结果
 *
 * 上面第 1 项是拿一份写死的名字清单去问「哪些能解析」，
 * 这一项问的是另一个问题：**阶段 3 的骨架实际发起的那些查找，结果如何**。
 * 两者可能不一致（比如某个名字骨架用到了但清单里漏了）。
 */
function probeNativeUILookup(): void {
  const lines = dumpLookupReport();
  emit(`NATIVEUI_LOOKUP|${lines.length} entries`);
  for (const line of lines) {
    emit(`NATIVEUI|${line}`);
  }

  // `create()` 自己的逐步结果。**这条通道是专为「控制台被藏掉」准备的** ——
  // flushDiagnostics 只走 print，而移植生效后控制台可能一起没掉
  // （2026-10-04 第 2 次运行就是这样，什么线索都没留下）。
  // 探针在 0.6s 跑，那时 create() 早已结束。
  const report = NativeUISystem.getInstance().getLastReport();
  emit(`NATIVEUI_STEPS|${report.length} entries`);
  for (const line of report) {
    emit(`NATIVEUI_STEP|${line}`);
  }
}

// ---------------------------------------------------------------------------
// 第 7 项：按索引下钻，dump 原生 frame 树
// ---------------------------------------------------------------------------

/**
 * 1.27a 下**一大半原生 frame 按名字找不到**：52 个名字 24 个 MISS，包括
 * `ConsoleUIBackdrop`、`ConsoleBottomBar`、`SimpleInventoryCover`、`InventoryText`、
 * `MiniMapFrame`、`CommandButton_0..11`、`InventoryButton_0..5`。
 * 但专用 getter（`DzFrameGetCommandBarButton` / `DzFrameGetMinimap` / `DzGetBuffBar` …）
 * **全都正常返回有效句柄**。所以它们不是不存在，只是"不在全局名字表里"。
 *
 * 名字走不通，就只剩索引这一条路：从拿得到的句柄出发，用
 * `DzFrameGetChildrenCount` + `DzFrameGetChild` 逐层下钻，`DzFrameGetName` 读出真名。
 * 这样就能看到 1.27a 的原生 UI 到底长什么样、叫什么名字。
 */
function dumpTree(label: string, root: number, maxDepth: number, maxNodes: number): void {
  if (!ok(root)) {
    emit(`TREE|${label}|ROOT_INVALID`);
    return;
  }

  const queue: Array<{ h: number; path: string; depth: number }> = [{ h: root, path: label, depth: 0 }];
  let qi = 0;
  let visited = 0;

  while (qi < queue.length && visited < maxNodes) {
    const node = queue[qi];
    qi++;
    visited++;

    let name = "?";
    try {
      name = DzFrameGetName(node.h) ?? "?";
    } catch (e) {
      name = "<threw>";
    }

    let count = -1;
    try {
      count = DzFrameGetChildrenCount(node.h);
    } catch (e) {
      count = -1;
    }

    // 尺寸 / 透明度 / 可见性一起带上。
    //
    // 2026-10-04 加：用户报「底部一大片黑边」，需要**自动认出**那块黑是什么。
    // 黑边是全屏宽的一块，所以 `rw`（DzFrameGetRealWidth，真实屏幕像素）一量
    // 就能和 `CLIENT` 行对比出来 —— 比我俩隔着截图猜靠谱。
    // 每个 getter 独立 try/catch：1.27a 上某个没实现不该让整棵树 dump 不出来。
    let rw = -1;
    let rh = -1;
    let alpha = -1;
    let visible = "?";
    try {
      rw = DzFrameGetRealWidth(node.h);
      rh = DzFrameGetRealHeight(node.h);
    } catch (e) {
      rw = -1;
      rh = -1;
    }
    try {
      alpha = DzFrameGetAlpha(node.h);
    } catch (e) {
      alpha = -1;
    }
    try {
      visible = DzFrameIsVisible(node.h) ? "1" : "0";
    } catch (e) {
      visible = "?";
    }

    emit(
      `TREE|${node.path}|d${node.depth}|n=${count}|name=${name}` +
        `|rw=${rw}|rh=${rh}|a=${alpha}|v=${visible}`
    );

    if (node.depth < maxDepth) {
      for (let i = 0; i < count; i++) {
        let child = 0;
        try {
          child = DzFrameGetChild(node.h, i);
        } catch (e) {
          child = 0;
        }
        if (ok(child)) {
          queue.push({ h: child, path: `${node.path}/${i}`, depth: node.depth + 1 });
        }
      }
    }
  }

  if (visited >= maxNodes) {
    emit(`TREE|${label}|TRUNCATED_AT_${maxNodes}`);
  }
}

/** 第 7 项入口：dump 几棵最要紧的子树 */
function probeTree(): void {
  // 基准线：黑边是「全屏宽」的，所以要拿客户端尺寸当尺子比对下面的 rw/rh
  emit(`CLIENT|w=${DzGetClientWidth()}|h=${DzGetClientHeight()}`);

  // `DzFrameGetLowerLevelFrame()` 是 `consoleParent()` 的兜底、也是自建 frame 实际的父节点。
  // 它到底是谁（名字、父节点、多大）一直没落实过 —— 顺手量一下。
  // 如果它就是那块黑（rw 接近屏宽、rh 很大），那黑边的根就在这儿。
  const lower = DzFrameGetLowerLevelFrame();
  if (ok(lower)) {
    let lowerName = "?";
    let lowerParent = 0;
    try {
      lowerName = DzFrameGetName(lower) ?? "?";
    } catch (e) {
      lowerName = "<threw>";
    }
    try {
      lowerParent = DzFrameGetParent(lower);
    } catch (e) {
      lowerParent = 0;
    }
    emit(
      `LOWERLEVEL|${fmt(lower)}|name=${lowerName}|parent=${fmt(lowerParent)}` +
        `|rw=${DzFrameGetRealWidth(lower)}|rh=${DzFrameGetRealHeight(lower)}` +
        `|a=${DzFrameGetAlpha(lower)}`
    );
    dumpTree("LOWERLEVEL", lower, 2, 80);
  } else {
    emit("LOWERLEVEL|INVALID");
  }

  dumpTree("GAMEUI", DzGetGameUI(), 2, 150);
  dumpTree("CONSOLEUI", frameByName("ConsoleUI", 0) ?? 0, 3, 250);
  dumpTree("CMDBTN00", DzFrameGetCommandBarButton(0, 0), 2, 60);
  dumpTree("MINIMAP", DzFrameGetMinimap(), 2, 60);
  dumpTree("PORTRAIT", DzFrameGetPortrait(), 2, 60);
  dumpTree("INVENTORY0", DzGetInventoryBarButton(0), 2, 40);
}

// ---------------------------------------------------------------------------
// 第 8 项：定位「底部黑边」
// ---------------------------------------------------------------------------

/**
 * 是否轮流把候选 frame 藏掉 / 试各种黑边取值（每个 5 秒）。
 *
 * **已关闭。** 2026-10-04 定案：黑边不是 frame，是引擎的渲染边距，
 * `DzFrameEditBlackBorders(0, 0)` 清掉。正式代码已接手
 * （`NativeUISystem.clearBlackBorders()`），探针再开着只会**和正式代码抢同一个设置**
 * —— 每 5 秒把黑边重新设成别的值，正好把刚修好的东西盖回去。
 *
 * 保留开关和图谱，是为了以后换分辨率/换引擎版本时能一键重跑定位。
 */
const BLACKBAND_SWEEP = false;

/** 每个候选停几秒。太短人眼跟不上，太长一轮跑不完。 */
const SWEEP_SECONDS = 5;

/**
 * 渲染黑边的候选取值 `[上, 下]`，逐个试给用户看。
 *
 * **单位不明，所以两种量级都试。** XM 的四参数版 `XMSetFrameEditBlackBorders`
 * 文档写「单位：像素」，但 Dz 这版参数名是 `upperHeight`/`bottomHeight` 且
 * 触发器编辑器里默认值显示 `0.00`，更像**屏幕比例**。与其猜，不如都试：
 * 0.2 和 60 分别是两种量级下的可见变化量。
 *
 * **正负号也未知**（哪个方向是"扩"哪个是"缩"），所以都试。
 *
 * `[0, 0]` 排第一当基线：[1.9.3k6_xueyue_editor/jass/XueYue/Framework/module/ui.lua:17]
 * 里雪月框架就是拿它当"无黑边"的常态值调的 —— 先看看它到底动不动。
 */
const BORDER_TESTS: Array<[number, number]> = [
  [0, 0],
  [0, 0.2],
  [0, -0.2],
  [0, 0.4],
  [0, -0.4],
  [0, 60],
  [0, -60],
  [0.2, 0.2],
  [-0.2, -0.2],
];

interface Ancestor {
  label: string;
  handle: number;
  rw: number;
  alpha: number;
}

/**
 * 从 `start` 沿 `DzFrameGetParent` **往上爬**，把祖先链连同尺寸/透明度打出来。
 *
 * 为什么不用 `DzFrameGetChild` 下钻：2026-10-04 实测它是坏的 —— 同一棵树里
 * 不同节点报出完全相同的尺寸（连 `INVENTORY0/0` 都报回 GAMEUI 的 0.8×0.6），
 * 所以 TREE 行只有 depth 0 可信。`DzFrameGetParent` 相反是准的。
 *
 * `rw` 是**归一化到屏幕宽度的比例**（不是像素）—— 拿我们自己的 UI 底板校验过：
 * 设的 0.132400→0.667380，实测 `rw=0.53497993946075`，精确等于 0.667380-0.132400。
 * 所以「全屏宽的黑带」的 `rw` 应该接近 1.0，可以直接当判据。
 *
 * 尺寸 ≥ 0.5 屏宽的祖先会被收集起来当 sweep 候选 —— 黑带是全屏宽的。
 */
function dumpAncestors(label: string, start: number, maxDepth: number): Ancestor[] {
  const found: Ancestor[] = [];
  let h = start;

  for (let d = 0; d <= maxDepth; d++) {
    if (!ok(h)) {
      break;
    }

    let name = "?";
    let rw = -1;
    let rh = -1;
    let alpha = -1;
    let vis = "?";
    try {
      name = DzFrameGetName(h) ?? "?";
    } catch (e) {
      name = "<threw>";
    }
    try {
      rw = DzFrameGetRealWidth(h);
      rh = DzFrameGetRealHeight(h);
    } catch (e) {
      rw = -1;
      rh = -1;
    }
    try {
      alpha = DzFrameGetAlpha(h);
    } catch (e) {
      alpha = -1;
    }
    try {
      vis = DzFrameIsVisible(h) ? "1" : "0";
    } catch (e) {
      vis = "?";
    }

    const path = `${label}/${d}`;
    emit(`ANC|${path}|${fmt(h)}|name=${name}|rw=${rw}|rh=${rh}|a=${alpha}|v=${vis}`);

    // **不按尺寸过滤。** 一开始只想收「宽度 ≥ 半屏」的，但 `ConsoleUI` 自己报
    // `rw=0.0` —— 一个 0×0 的 frame 照样能画出全屏宽的子背景，按宽度筛会正好把它筛掉。
    // 所以全收，交给下面按 rw 降序排，宽的先试。
    found.push({ label: path, handle: h, rw, alpha });

    let p = 0;
    try {
      p = DzFrameGetParent(h);
    } catch (e) {
      p = 0;
    }
    if (!ok(p)) {
      break;
    }
    h = p;
  }

  return found;
}

function probeBlackBand(): void {
  const candidates: Ancestor[] = [];
  const seen = new Set<number>();

  const roots: Array<[string, number]> = [
    ["cmdbarbtn", DzFrameGetCommandBarButton(0, 0)],
    ["invbtn", DzGetInventoryBarButton(0)],
    ["portrait", DzFrameGetPortrait()],
    ["minimap", DzFrameGetMinimap()],
    ["lowerlevel", DzFrameGetLowerLevelFrame()],
  ];

  for (const [label, h] of roots) {
    for (const a of dumpAncestors(label, h, 12)) {
      if (!seen.has(a.handle)) {
        seen.add(a.handle);
        candidates.push(a);
      }
    }
  }

  // 宽的先试 —— 黑带是全屏宽的，`rw` 大的命中概率高。试完一圈还没找到就重新来。
  candidates.sort((a, b) => b.rw - a.rw);

  emit(`BLACKBAND|${candidates.length} candidates`);
  for (let i = 0; i < candidates.length; i++) {
    emit(`BLACKBAND_CAND|#${i}|${candidates[i].label}|rw=${candidates[i].rw}|a=${candidates[i].alpha}`);
  }

  if (!BLACKBAND_SWEEP) {
    say("BLACKBAND|sweep 已关闭（BLACKBAND_SWEEP=false）");
    return;
  }

  say(`BLACKBAND|先测渲染黑边取值，每个 ${SWEEP_SECONDS}s —— 盯住底部黑边看变化`);

  const borderCount = BORDER_TESTS.length;
  const alphaCount = candidates.length;

  // 一个定时器跑两段：先黑边取值，再 alpha 扫描。用一个手写状态机而不是两个
  // Timer —— `Timer.start(period, true, cb)` 是永久的，起两个的话第一段跑完
  // 停不掉，会和第二段抢同一片原生 frame。
  let step = 0;
  let current: Ancestor | undefined = undefined;

  Timer.create().start(SWEEP_SECONDS, true, () => {
    // 每步开头先把上一号 alpha 恢复成**原始值**而不是写死 255 ——
    // 有的原生 frame 本来就不是全不透明，写死会把它改成另一个样子。
    if (current !== undefined) {
      if (ok(current.handle) && current.alpha >= 0) {
        DzFrameSetAlpha(current.handle, current.alpha);
      }
      current = undefined;
    }

    // --- 第一段：渲染黑边取值 ---
    if (step < borderCount) {
      const t = BORDER_TESTS[step];
      step++;
      try {
        DzFrameEditBlackBorders(t[0], t[1]);
        say(`BLACKBAND|BORDER #${step - 1} 上=${t[0]} 下=${t[1]} (${step}/${borderCount})`);
      } catch (e) {
        say(`BLACKBAND|BORDER #${step - 1} 上=${t[0]} 下=${t[1]} 抛错：${e}`);
      }
      return;
    }

    // --- 第二段：alpha 扫描 ---
    const ai = step - borderCount;
    if (ai >= alphaCount) {
      DzFrameEditBlackBorders(0, 0);
      step = 0;
      say("BLACKBAND|一轮跑完，已全部恢复。重新开始");
      return;
    }

    step++;
    const c = candidates[ai];
    if (ok(c.handle)) {
      DzFrameSetAlpha(c.handle, 0);
    }
    current = c;
    say(`BLACKBAND|现在隐藏 #${ai} ${c.label} rw=${c.rw} (${ai + 1}/${alphaCount})`);
  });
}

/**
 * 跑一段探针并打点。
 *
 * **单段抛错不拖垮整份报告。** 之前 `probeNamedFrames()` 在最后一行抛错，
 * 整个计时器回调直接中断，后面所有段连同最终的 `flushToClipboard()` 全部没跑到，
 * 结果只剩控制台里那半句 `NAME_SUMMARY`。现在每段独立 try/catch，错误原文也进缓冲。
 */
function section(name: string, fn: () => void): void {
  say(`SECTION|${name}`);
  try {
    fn();
  } catch (e) {
    emit(`SECTION_FAIL|${name}|${e}`);
    say(`SECTION_FAIL|${name}|${e}`);
  }
}

/**
 * 入口：延迟到 UI 就绪后再跑。
 */
export function runNativeUIProbe(): void {
  say(`START|projectPath=${PROJECT_PATH ?? "<none>"}`);

  // 0.6s：地图此前会在进游戏后约 1~2 秒崩，推迟太久会什么都抓不到。
  Timer.create().start(0.6, false, () => {
    section("1-named-frames", () => probeNamedFrames());
    section("2-getters", () => probeGetters());

    // 放在 getters 之后：此时 NativeUISystem 的 create() 早已跑完（0.01s 计时器 vs 这里 0.6s），
    // 它发起的每一次查找都记在诊断表里了。
    section("6-nativeui-lookup", () => probeNativeUILookup());

    // 名字找不到的那 24 个，靠索引下钻把真实结构 dump 出来
    section("7-tree", () => probeTree());

    // 只读结果此刻已经进剪贴板。下面开始有副作用的部分 —— 万一崩了，
    // 最有价值的「名字能否解析」结论已经在剪贴板里了。
    flushToClipboard();
    say("READONLY_DONE|只读部分完成，结果已进剪贴板");

    // 第 8 项在只读结论落盘之后跑：它要动原生 frame 的 alpha，万一把游戏搞崩，
    // 最有价值的「名字能否解析 / 祖先链尺寸」已经进剪贴板了。
    section("8-blackband", () => probeBlackBand());

    // 每 2 秒重刷一次剪贴板。
    //
    // 报告只写一次根本不够用 —— 2026-10-04 连着两次被顶掉：一次是用户复制
    // 控制台文字来反馈，一次是截图工具（Win+Shift+S 之类）自动进剪贴板。
    // 定时重刷能让报告自己回来，用户截完图过两秒剪贴板就又是对的。
    // `quiet=true`：不往缓冲区/控制台写「已写入」那行，否则每秒刷屏且缓冲区无限膨胀。
    Timer.create().start(2.0, true, () => flushToClipboard(true));

    if (!PROBE_MUTATIONS) {
      say("SKIP|3/4/5 全部跳过（PROBE_MUTATIONS=false）");
      say("DONE|只读探针完成");
      return;
    }

    // 每一步之前都刷一次剪贴板：万一卡在其中某一步，剪贴板末尾就是卡住的位置。
    section("3-checkbox-events", () => probeCheckboxEvents());
    flushToClipboard();

    section("4-autoreset", () => probeAutoResetPoint());
    flushToClipboard();

    section("5-move-command-button", () => probeMoveCommandButton());
    flushToClipboard();

    say("DONE|请在游戏内点击屏幕中部两个方框，看 CHECKBOX_FIRE 行；然后退出游戏粘贴剪贴板");
  });
}
