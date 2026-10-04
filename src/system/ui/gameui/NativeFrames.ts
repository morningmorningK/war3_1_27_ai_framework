/**
 * 原生 frame 句柄的解析层。
 *
 * 这是整个移植的关键抽象：源实现（Reforged 1.32+）用 `BlzGetFrameByName` /
 * `BlzGetOriginFrame` 取暴雪原生 frame，本工程是 1.27a + KKWE，只有 `Dz*` API。
 * 两者**逐行同构**，所以移植的核心就是：
 *
 *   `BlzGetFrameByName(name, id)`  →  `DzFrameFindByName(name, id)`
 *   `BlzGetOriginFrame(TYPE, i)`   →  本文件里的几个专用 getter（见 originFrame 注释）
 *
 * 所有 `Dz*` 调用都集中在这里，好处是：万一某个名字在 1.27a 下解析不到，
 * 只需要改这一个文件，不用去 `NativeUISystem` 里满地找。
 *
 * 函数签名以 `dev_lib/KKWE/jass/*.j` 为准（那是 `Dz*` 的权威定义源），
 * 不要照抄 `Blz*` —— 至少这两处不同：
 *   - `DzFrameSetTexture(frame, texture, flag)` 只有 3 个参数（Blz 是 4 个）
 *   - `DzFrameSetTextAlignment(frame, align)` 只吃一个打包整数
 */

import { createLogger } from "src/utils/logger";

const log = createLogger("NativeFrames");

// ---------------------------------------------------------------------------
// FRAMEPOINT 枚举
//
// 取自 `dev_lib/w3x2lni/data/zhCN-1.32.8/mpq/Scripts/Common.j:1005-1013`
// （`FRAMEPOINT_TOPLEFT = ConvertFramePointType(0)` … `BOTTOMRIGHT = (8)`）。
// 工程里没有现成的常量表，所以在这里定义一份。
// ---------------------------------------------------------------------------

export const FRAMEPOINT_TOPLEFT = 0;
export const FRAMEPOINT_TOP = 1;
export const FRAMEPOINT_TOPRIGHT = 2;
export const FRAMEPOINT_LEFT = 3;
export const FRAMEPOINT_CENTER = 4;
export const FRAMEPOINT_RIGHT = 5;
export const FRAMEPOINT_BOTTOMLEFT = 6;
export const FRAMEPOINT_BOTTOM = 7;
export const FRAMEPOINT_BOTTOMRIGHT = 8;

// ---------------------------------------------------------------------------
// 句柄有效性
// ---------------------------------------------------------------------------

/**
 * `framehandle` 在 Lua 里就是 number，而 **Lua 把 0 当真值** ——
 * 所以判句柄必须显式比掉 0，不能写 `if (h)`。
 */
export function isValidFrame(handle: number | undefined | null): handle is number {
  return handle != null && handle !== 0;
}

// ---------------------------------------------------------------------------
// 按名字取原生 frame
// ---------------------------------------------------------------------------

/**
 * **1.27a 有四个「按名字找 frame」的函数，不是一个。**
 *
 * 这一点是踩坑踩出来的：第一版只用 `DzFrameFindByName`，结果 `ConsoleUIBackdrop`
 * 解析不到 → 整个 UI 一个都没建出来（游戏里界面纹丝不动）。
 * 四个函数的定义在 `dev_lib/KKWE/jass/BlizzardAPI.j:91-94`：
 *
 *   DzFrameFindByName            非 Simple 类 Frame —— 即 `DzCreateFrameByTagName`
 *                                自己建出来的那些（BACKDROP / TEXT / SIMPLESTATUSBAR）
 *   DzSimpleFrameFindByName      SimpleFrame —— **fdf 里的 `<Frame>` 模板**
 *   DzSimpleFontStringFindByName fdf 里的 `<String>`
 *   DzSimpleTextureFindByName    fdf 里的 `<Texture>`
 *
 * 而暴雪原生 UI（ConsoleUI / SimpleNameValue / InfoPanelIconValue / CommandButton_* …）
 * **全部来自 fdf**，所以全在 SimpleFrame 那一类里。
 *
 * ⚠️ 这份区分**只在 `jass/*.j` 里**。`dev_lib/KKWE/.../bzapi/call.txt`
 * （w3x2lni 编辑器用的函数表）虽然也列了这四个，但整张表停在 JAPI 早期版本 ——
 * 连 `DzFrameSetScale` / `DzFrameSetAbsolutePoint` 都没有，已证实是过期的，
 * **不要拿它当准**。
 *
 * 顺序：先试两个 Frame 级的 finder（返回的句柄更"完整"，settter 更保险），
 * 都失败再退到 FontString / Texture —— 少数名字（比如 `InventoryText`）
 * 在 fdf 里本身就是 `<String>` 或 `<Texture>`，只有后两个能找到。
 */
const FRAME_FINDERS: Array<[string, (name: string, id: number) => number]> = [
  ["SimpleFrame", (n, i) => DzSimpleFrameFindByName(n, i)],
  ["Frame", (n, i) => DzFrameFindByName(n, i)],
  ["SimpleFontString", (n, i) => DzSimpleFontStringFindByName(n, i)],
  ["SimpleTexture", (n, i) => DzSimpleTextureFindByName(n, i)],
];

/**
 * 命中缓存。**只缓存成功的解析**，不缓存失败 ——
 * 有些原生 frame（`CommandButton_*`、`SimpleHeroLevelBar` 之类）在加载期可能还不存在，
 * 要等到选中单位、或者升级成英雄之后才出现。把失败也缓存了，就永远拿不到了。
 */
const namedFrameCache = new Map<string, number>();

/**
 * 诊断用：每个 (名字, id) 是被哪个 finder 解析到的，还是全部落空。
 *
 * 只有一次 Map 写入的开销，但排查「某个原生 frame 怎么又没生效」时
 * 一眼就能看出是名字不对还是 finder 不对。`dumpLookupReport()` 会把它格式化出来。
 */
const lookupDiagnostics = new Map<string, string>();

/**
 * 取一个暴雪原生 frame。取不到返回 `undefined`（而不是 0），
 * 让调用方用 `if (!handle)` 就能判断。
 *
 * `id` 是同一个名字下的多实例下标，源实现里用到 0..6 若干档。
 */
export function frameByName(name: string, id: number = 0): number | undefined {
  const key = `${name}#${id}`;

  const cached = namedFrameCache.get(key);
  if (cached !== undefined) {
    return cached;
  }

  for (const [finderName, find] of FRAME_FINDERS) {
    // ⚠️ 这里刻意**不写 `continue`**。tstl 会把 catch 编成一个内嵌函数
    // `local function ____catch(e)`，而 Lua 的 `goto` 是不跨函数找 label 的 ——
    // catch 里的 `continue` 生成的 `goto __continueN` 永远找不到目标，Lua 5.3
    // 会以 "no visible label '__continueN' for <goto>" **拒绝加载整个 .lua 文件**。
    // 2026-10-04 就是这一行让 NativeFrames.lua 加载失败，连带 src.main 整条
    // import 链崩掉，表现为 MSVCP140/ydbase 的原生 FATAL ERROR。
    // 等价写法：用标志位代替 continue。
    let handle: number | undefined;
    let threw = false;
    try {
      handle = find(name, id);
    } catch (e) {
      // 某个 finder 不存在或炸了，不该拖垮整个查找 —— 换下一个继续
      threw = true;
    }

    if (threw) {
      lookupDiagnostics.set(key, `${finderName}:threw`);
    } else if (handle !== undefined && isValidFrame(handle)) {
      namedFrameCache.set(key, handle);
      lookupDiagnostics.set(key, finderName);
      return handle;
    }
  }

  lookupDiagnostics.set(key, "MISS");
  return undefined;
}

/**
 * 把查找诊断导成可读文本（每个 (名字, id) 一行）。
 * 给 `NativeUIProbe` 和排查用，正常游戏流程不调用。
 */
export function dumpLookupReport(): string[] {
  const lines: string[] = [];
  for (const [key, result] of lookupDiagnostics) {
    lines.push(`${result === "MISS" ? "MISS" : "HIT "}|${key}|${result}`);
  }
  return lines;
}

/** 诊断表的原始访问口，热重载重建前清掉 */
export function getLookupDiagnostics(): Map<string, string> {
  return lookupDiagnostics;
}

/** 热重载/重建 UI 时清掉缓存，避免握着上一局的句柄 */
export function clearFrameCache(): void {
  namedFrameCache.clear();
  lookupDiagnostics.clear();
}

// ---------------------------------------------------------------------------
// 原生 frame 的专用 getter（`BlzGetOriginFrame` 的替代）
// ---------------------------------------------------------------------------

/**
 * 取游戏 UI 根节点。对应源里的 `BlzGetOriginFrame(ORIGIN_FRAME_GAME_UI, 0)`。
 * 几乎所有自建 frame 都挂在这上面。
 */
export function gameUI(): number | undefined {
  const h = DzGetGameUI();
  return isValidFrame(h) ? h : undefined;
}

/**
 * 取头像框。对应 `ORIGIN_FRAME_PORTRAIT`。
 *
 * 注意 `DzFrameGetPortrait()` 是真实存在的（早先误以为不存在，是因为
 * grep 用了 `DzGet*` 而真名是 `DzFrameGet*`）。
 */
export function portraitFrame(): number | undefined {
  const h = DzFrameGetPortrait();
  return isValidFrame(h) ? h : undefined;
}

/**
 * 取单位面板的 buff 条。对应 `ORIGIN_FRAME_UNIT_PANEL_BUFF_BAR`。
 * `DzGetBuffBar()` 返回 number（不是 framehandle，但同样可比 0）。
 */
export function buffBarFrame(): number | undefined {
  const h = DzGetBuffBar();
  return isValidFrame(h) ? h : undefined;
}

/**
 * 鼠标悬停提示框。对应 `ORIGIN_FRAME_UBERTOOLTIP`。
 *
 * 有专用 getter；`DzFrameGetTooltip()` 返回 number。
 */
export function tooltipFrame(): number | undefined {
  const h = DzFrameGetTooltip();
  return isValidFrame(h) ? h : undefined;
}

/**
 * 取子节点。对应 `BlzFrameGetChild(frame, index)`。
 * 源实现用 `BlzFrameGetChild(BlzFrameGetChild(GAME_UI, 5), 0)` 这种下钻来抓
 * 没有名字的原生节点 —— 这是**按索引**取的，1.27a 和 1.32 的节点顺序不一定一致，
 * 所以拿不到时只是少隐藏一个东西，不能当成致命错误。
 */
export function frameChild(parent: number | undefined, index: number): number | undefined {
  if (!isValidFrame(parent)) {
    return undefined;
  }
  const h = DzFrameGetChild(parent, index);
  return isValidFrame(h) ? h : undefined;
}

// ---------------------------------------------------------------------------
// 1.27a 上「按名字取不到」的几个关键 frame —— 改用专用 getter
//
// 2026-10-04 探针实测：52 个原生名字里 24 个 MISS，而且是**成对**的 ——
// 同一个东西按名字查不到、用 getter 却拿得到：
//
//   CommandButton_0..11   12/12 MISS   |  DzFrameGetCommandBarButton(0,0)  ✓
//   InventoryButton_0..5   6/6  MISS   |  DzGetInventoryBarButton(0)       ✓
//   MiniMapFrame             MISS      |  DzFrameGetMinimap()              ✓
//
// 所以不是「1.27a 没有这些 frame」，是「它们不在全局名字表里」。
// 另外 `DzFrameFindByName`（非 Simple 那个）在 52 个名字上**零命中**，
// 1.27a 原生 UI 全部只走 Simple 系 finder。
// ---------------------------------------------------------------------------

/**
 * 自建 frame 的父节点。
 *
 * 源实现用 `BlzGetFrameByName("ConsoleUIBackdrop", 0)`。但 1.27a 上这个名字
 * **解析不到**，而它是所有自建 frame 的父节点 —— 一旦为 undefined，
 * `createBackdrop` / `createStatusBar` / `createText` 会连锁失败，
 * 报「无法创建 XXX：父节点无效」，整个移植表现为「界面纹丝不动」。
 *
 * 按可用性依次降级：
 *   1. `ConsoleUIBackdrop` —— 1.32 的原名，本机拿不到，留着是为别的环境
 *   2. `ConsoleUI`        —— 1.27a 实测 HIT，ConsoleUIBackdrop 在它下面，语义最近
 *   3. `DzGetGameUI()`    —— 兜底，永远存在
 */
export function consoleParent(): number | undefined {
  // 1.32 的原名。1.27a 上解析不到，留着是为别的环境
  const backdrop = frameByName("ConsoleUIBackdrop", 0);
  if (backdrop !== undefined) {
    return backdrop;
  }

  // ⚠️ **不要拿 `ConsoleUI` 当创建父节点。** 2026-10-04 实测：`ConsoleUI` 能被
  // finder 解析到（HIT），但拿它当 parent 调 `DzCreateFrameByTagName` 会直接抛
  //     NativeUISystem.lua:406: Call jass function crash.<unknown>
  // 它是 SimpleFrame，1.27a 的原生 frame 不接受自定义子节点。
  // 好在它是可捕获的（`buildFrames` 那一步 FAIL 之后其余八步照常跑完），
  // 不是硬崩 —— 但这条路的结论是「此路不通」，别退回去。

  // 自建 UI 的标准宿主：`DzFrameGetLowerLevelFrame()`。
  // 仓库里正在跑的 `src/system/ui/component/KKWEHeroBloodBar.ts` 就是这么挂的
  // （`getLifeBaseFrame()`），是 1.27a + KKWE 下唯一有实际运行验证的创建父节点。
  const lower = DzFrameGetLowerLevelFrame();
  if (isValidFrame(lower)) {
    return lower;
  }

  return gameUI();
}

/**
 * 命令卡按钮。`slot` = **FDF 名字里的下标**，即 `CommandButton_%d` 的 `%d`（0..11），
 * 与源实现、与 `COMMAND_BUTTONS_NORMAL` / `COMMAND_BUTTON_SCALES` 的下标同一套。
 *
 * `slot` → `(row, col)` 的换算：**`row = slot 的十位、col = slot 的个位`**，
 * 也就是 `slot = col + 4 * row` —— 每行 4 格、从上往下数行。
 * 依据两条：
 *
 *   1. 源实现自己标的注释（Move=0 / Stop=1 / Hold=2 / Attack=3 / Patrol=4）
 *      与 `Units\commandfunc.txt` 的 Buttonpos 完全吻合：Move(0,0)、Stop(1,0)、
 *      Hold(2,0)、Attack(3,0)、Patrol(0,1)。5 条全中 ⇒ FDF 是**按行**定义的，
 *      `%d = X + 4Y`，即 `(col, row) = (X, Y)`。
 *   2. 探针实测的句柄间隔恒为 448，顺序是
 *      `(0,0)=+0  (1,0)=+448  (2,0)=+896  (0,1)=+1344  (1,1)=+1792`。
 *      这说明**引擎内部的存储是「每列 3 格」的列优先**，与 FDF 的行优先定义顺序
 *      **不一致** —— 所以不能拿 `slot` 直接当线性内存下标用（旧代码就是这么错的：
 *      它按每列 3 格去摊 `slot`，于是把 8 号映射成了 (2,2)）。
 *
 * 交叉验证（用户 2026-10-04 报的期望映射）：从左到右的可见格应当是物编
 * (0,2)(1,2)(2,2)(3,2)(1,1)(2,1)(3,1)，即 FDF 下标 8,9,10,11,5,6,7。
 * 用 `(row, col) = (floor(slot/4), slot%4)` 摊出来正好是
 * (2,0)(2,1)(2,2)(2,3)(1,1)(1,2)(1,3) —— 与期望逐条相同。
 */
export function commandBarButton(slot: number): number | undefined {
  const row = Math.floor(slot / 4);
  const col = slot % 4;
  const h = DzFrameGetCommandBarButton(row, col);
  return isValidFrame(h) ? h : undefined;
}

/**
 * 物品栏按钮。1.27a 上 `InventoryButton_0..5` 全部解析不到。
 * 用 `DzGetInventoryBarButton`（`DzFrameGetItemBarButton` 只覆盖前 6 格）。
 */
export function inventoryButton(slot: number): number | undefined {
  const h = DzGetInventoryBarButton(slot);
  return isValidFrame(h) ? h : undefined;
}

// ---------------------------------------------------------------------------
// 位置 / 显示 的小封装
//
// 统一处理「句柄可能取不到」和「源实现漏了 ClearAllPoints」两件事。
// ---------------------------------------------------------------------------

/**
 * 清掉既有锚点再设两个对角点。
 *
 * 源实现**没有**调 `BlzFrameClearAllPoints` 就直接设点。Reforged 那边有
 * `BlzEnableUIAutoPosition(false)` 兜着，但对我们来说：`applyCommandButtons()`
 * 会在每次商店状态翻转时重跑，不先清点的话锚点会一层层累积，位置越跑越偏。
 */
export function clearAndSetRect(
  handle: number | undefined,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): void {
  if (!isValidFrame(handle)) {
    return;
  }
  DzFrameClearAllPoints(handle);
  DzFrameSetAbsolutePoint(handle, FRAMEPOINT_TOPLEFT, x1, y1);
  DzFrameSetAbsolutePoint(handle, FRAMEPOINT_BOTTOMRIGHT, x2, y2);
}

/** 只设一个绝对点（用于 ConsoleUI / UberTooltip 这种只有一个点的） */
export function setAbsPoint(
  handle: number | undefined,
  point: number,
  x: number,
  y: number
): void {
  if (!isValidFrame(handle)) {
    return;
  }
  DzFrameSetAbsolutePoint(handle, point, x, y);
}

/**
 * 缩放。**scale 必须 > 0** —— 0 或负数会让游戏闪退
 * （血条那边踩过：`DzFrameSetScale(0)` 加上派生出的字号 0）。
 */
export function setScale(handle: number | undefined, scale: number): void {
  if (!isValidFrame(handle) || !(scale > 0)) {
    if (isValidFrame(handle) && !(scale > 0)) {
      log.warn(`拒绝把 scale 设成 ${scale}（必须 > 0，否则会闪退）`);
    }
    return;
  }
  DzFrameSetScale(handle, scale);
}

/** 用缩到极小来隐藏一个原生 frame（源实现隐藏标签的手法） */
export function hideByScale(handle: number | undefined, scale: number): void {
  setScale(handle, scale);
}

export function setVisible(handle: number | undefined, visible: boolean): void {
  if (!isValidFrame(handle)) {
    return;
  }
  DzFrameShow(handle, visible);
}

export function setTexture(handle: number | undefined, texture: string, flag: number = 0): void {
  if (!isValidFrame(handle) || texture === "") {
    return;
  }
  DzFrameSetTexture(handle, texture, flag);
}

export function setSize(
  handle: number | undefined,
  width: number,
  height: number
): void {
  if (!isValidFrame(handle)) {
    return;
  }
  DzFrameSetSize(handle, width, height);
}

export function setText(handle: number | undefined, text: string): void {
  if (!isValidFrame(handle)) {
    return;
  }
  DzFrameSetText(handle, text);
}

export function setValue(handle: number | undefined, value: number): void {
  if (!isValidFrame(handle)) {
    return;
  }
  DzFrameSetValue(handle, value);
}

export function setAlpha(handle: number | undefined, alpha: number): void {
  if (!isValidFrame(handle)) {
    return;
  }
  DzFrameSetAlpha(handle, alpha);
}

export function setParent(handle: number | undefined, parent: number | undefined): void {
  if (!isValidFrame(handle) || !isValidFrame(parent)) {
    return;
  }
  DzFrameSetParent(handle, parent);
}

export function setEnable(handle: number | undefined, enable: boolean): void {
  if (!isValidFrame(handle)) {
    return;
  }
  DzFrameSetEnable(handle, enable);
}
