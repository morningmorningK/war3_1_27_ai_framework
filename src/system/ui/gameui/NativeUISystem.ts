/**
 * UI v1.6（Hive Workshop，chopinski / Tasyen）核心骨架 —— **阶段 3**。
 *
 * 对应源实现 `dev_lib/w3x2lni/script/luav3/map/war3map.lua` 里 `InitGlobals()`
 * 中的 `MainUI` 那一段（约 214-1238 行），用 `Dz*` API 重写。
 *
 * 本阶段移植的方法：
 *   onCommandButtons / onInventoryButtons / onInfoPanel / onPortrait
 *   onResources      —— 金币文本
 *   onPeriod         —— 血蓝条与数值
 *   自建 frame 部分（源 1046-1128 行的 onInit）
 *
 * **本阶段不做**（属阶段 4）：
 *   onHeroCheck / onGroupSelection / onChat / onMinimap / onMenu、
 *   ShopSlots 的显隐逻辑、4 个 QuestCheckBox。
 *   原因是源用的 `QuestCheckBox` 是 Reforged 内置 FDF 模板，1.27a 没有，
 *   得先自己写一份 FDF 或改成自绘 BACKDROP，那是独立一块工作。
 *
 * ---------------------------------------------------------------------------
 * 与源实现的两处**有意偏离**（都不是偷懒，是这里的模型更简单）：
 *
 * 1. **去掉了整套 per-player 机制**。源里有 `struct[id]` / `array` / `key`
 *    和 `GetLocalPlayer() == this.player` 的分支，那是为了在多人局里让每个玩家
 *    各自维护一份 UI 状态。但 `Dz*` 的 frame API 在 1.27a 下**本来就是纯本地的**
 *    （frame 只存在于本机），所以那套记账没有实际作用。这里只保留"当前选中单位"
 *    一个状态，效果等价，代码少一半。
 *
 * 2. **去掉了 `onSelect` + 选中事件**。源用 `EVENT_PLAYER_UNIT_SELECTED` 来惰性启动
 *    0.05s 计时器。这里直接让计时器常驻、每 tick 查一次 `DzGetSelectedLeaderUnit()`，
 *    省掉一个事件注册和一套生死簿。
 *
 * 另外源里那段 `GetMainSelectedUnitEx()`（按 `UNIT_RF_PRIORITY` 排序挑主选中单位，
 * 约 90 行）**整块删除**，改用 `DzGetSelectedLeaderUnit()`（语义就是"当前主选中单位"）。
 * 这是负成本替换。
 * ---------------------------------------------------------------------------
 */

import { Timer } from "@eiriksgata/wc3ts/*";
import { UNIT_STATE_LIFE, UNIT_STATE_MAX_LIFE, UNIT_STATE_MANA, UNIT_STATE_MAX_MANA } from "src/constants/game/units";
import { createLogger } from "src/utils/logger";
import {
  COMMAND_BUTTON_SCALES,
  COMMAND_BUTTONS_NORMAL,
  COMMAND_BUTTONS_SHOP,
  GOLD_ICON_RECT,
  GOLD_TEXT_RECT,
  HEALTH_BAR_RECT,
  HEALTH_BAR_TEXTURE,
  HERO_AGILITY_VALUE_RECT,
  HERO_INTELLECT_VALUE_RECT,
  HERO_MAIN_STAT_RECT,
  HERO_STRENGTH_VALUE_RECT,
  HIDE_SCALE,
  HP_TEXT_RECT,
  INFO_ICON_BACKDROP_SIZE,
  INVENTORY_BUTTON_RECTS,
  INVENTORY_BUTTON_SIZE,
  ATTACK_BACKDROP_RECT,
  ATTACK_VALUE_RECT,
  ARMOR_BACKDROP_RECT,
  ARMOR_VALUE_RECT,
  BUFF_BAR_RECT,
  CONSOLE_UI_TOPLEFT,
  MANA_BAR_RECT,
  MANA_BAR_TEXTURE,
  MP_TEXT_RECT,
  PORTRAIT_RECT,
  PROGRESS_BAR_RECT,
  RESOURCE_UPDATE_PERIOD,
  SHOP_ABILITY_IDS,
  SHOP_SLOTS_RECT,
  SHOP_SLOTS_TEXTURE,
  STATUS_UPDATE_PERIOD,
  UBERTOOLTIP_BOTTOMRIGHT,
  UI_BACKDROP_RECT,
  UI_TEXTURE,
} from "./layoutV3";
import {
  FRAMEPOINT_BOTTOMRIGHT,
  FRAMEPOINT_TOPLEFT,
  buffBarFrame,
  clearAndSetRect,
  clearFrameCache,
  commandBarButton,
  consoleParent,
  dumpLookupReport,
  frameByName,
  frameChild,
  gameUI,
  inventoryButton,
  hideByScale,
  isValidFrame,
  portraitFrame,
  setAbsPoint,
  setAlpha,
  setEnable,
  setParent,
  setScale,
  setSize,
  setText,
  setTexture,
  setVisible,
  tooltipFrame,
} from "./NativeFrames";

const log = createLogger("NativeUISystem");

/**
 * 是否执行「按索引盲钻原生 frame」和「重挂原生 frame 的父节点」这两类操作。
 *
 * **默认关闭。** 源实现（Reforged 1.32+）里有这几行：
 *
 *   BlzFrameSetVisible(BlzFrameGetChild(BlzFrameGetChild(GAME_UI, 5), 0), false)
 *   BlzFrameSetVisible(BlzFrameGetChild(ConsoleBottomBar, 3), false)
 *   BlzFrameSetParent(MiniMapFrame, ConsoleUIBackdrop)
 *   BlzFrameSetParent(UBERTOOLTIP, ConsoleUIBackdrop)
 *
 * 前两行是**拿固定下标去猜节点**（1.27a 和 1.32 的子树顺序完全可能不同），
 * 后两行是把小地图和提示框改挂到另一个父节点下。这四件事的共同点是：
 * 收益只是「少显示两个装饰性东西」，代价却是**没有上界**的 ——
 * 藏错节点、改错父子关系，可能连带搞坏一大片原生 UI。
 *
 * 实测线索：阶段 3 第一次真正跑通（frame 能解析到）的那一轮，用户报
 * 「Lua 控制台都没了」。这四个操作就是那一轮新执行的东西里最可疑的。
 * 在探针把 1.27a 的实际节点结构dump 出来、逐个确认下标含义之前，先关着。
 */
const APPLY_UNVERIFIED_ORIGIN_FRAME_OPS = false;

/**
 * 是否用 `DzSetClipboard` 输出诊断。
 *
 * **默认关闭 —— 它是那族新闪退的唯一嫌疑。**
 *
 * `Errors/2026-10-04 01.40.40` / `01.40.50` 两族全新的崩溃：
 *
 *   MSVCP140.dll std::ios_base::~ios_base+76   EAX 已损坏，读 [eax+8] 越界
 *   ← MSVCP140.dll 0001:0000A352
 *   ← ydbase.dll   0001:0000278C
 *   ← ydbase.dll   0001:0000266F
 *   ← VCRUNTIME140.dll
 *
 * 全库 99 份报告里首帧落在 MSVCP140.dll 的**只有这 2 份**，都出现在同一分钟。
 * 而 `DzSetClipboard` 是 KKAPI.j 的扩展 native，实现就在栈上的 `ydbase.dll` 里。
 *
 * **注意这只是相关性，不是结论。** 要证实得单独跑一次「只开这个开关」。
 * 在那之前，用它换诊断信息不划算 —— 它本来就是为了绕开「控制台被藏掉」，
 * 结果自己可能是崩因。
 */
const ENABLE_CLIPBOARD_DIAGNOSTICS = false;

/**
 * 是否把 `create()` 的逐步结果 + frame 查找报告打到控制台。
 *
 * **默认关闭 —— 它是纯噪音，每局 42 行。**
 *
 * 那 42 行是阶段 1「原生 frame 到底能不能按名字找到」那个调查留下的：
 * 9 行 `OK |xxx`（各步骤成败）+ 26 行 `LOOK |HIT/MISS|名字|finder`。
 * 结论早就落定并写进了 `NativeFrames.ts` 的说明里，之后每次进游戏重打一遍
 * 没有任何信息增益 —— 只会把真正要看的那几十行淹掉。
 *
 * 报告**照旧会被收集**并存在 `this.lastReport` 里，所以要把这里改回 `true`
 * 随时能拿到，不用重新查一遍。
 */
const ENABLE_CREATE_DIAGNOSTICS = false;

/**
 * 玩家金币。
 *
 * **绝对不要写回 `ConvertPlayerState(1)` 这种在模块顶层求值的写法。**
 *
 * 工程自带的 `wc3ts/src/globals/define.ts` 把同族常量一律写成
 * `export const PLAYER_STATE_RESOURCE_GOLD = () => ConvertPlayerState(1)`——
 * 是个 thunk，**必须调用**。那不是风格，是绕开「模块加载期调 native」。
 *
 * 本模块被 `src/main.ts` 顶层 `import`，所以模块体在 `bootstrap.lua` 的
 * `require("src.main")` 阶段就会跑完。而 `console.enable = true` 原先是排在
 * require **之后**的 —— 这里一旦出错，现象是「Lua 控制台压根不出现 +
 * 所有触发/系统失效」，且因为控制台没开，连错误信息都看不到。
 * （2026-10-04 的 MSVCP140 闪退排查就是被这个形状困住了几轮。）
 *
 * 直接用字面量最稳：JASS 的 enum 在 Lua 里就是整数。
 * 依据 `dev_lib/KKWE/jass/system/ht/common.j:385`：
 * `constant playerstate PLAYER_STATE_RESOURCE_GOLD = ConvertPlayerState(1)`
 */
// 见 updateResources()：`ConvertPlayerState(1)` 就地在调用点求值，绝不放模块顶层。

/**
 * 单位是否还活着、能不能安全地读它的状态。
 *
 * **判据只能是 `GetUnitTypeId(u) === 0`。** 这条是 `UnitBlood.updateUI` 那边用
 * 一次访问违例换来的：`u == null` 和 `GetHandleId(u) === 0` 都查不出"已被移除的单位"——
 * `RemoveUnit` 之后句柄仍非空、handle id 也不会归零，于是后续的 `GetUnitState` /
 * `GetUnitAbilityLevel` 会打在**悬垂句柄**上，1.27a 下表现为卡死后闪退。
 *
 * 这里用的是 `DzGetSelectedLeaderUnit()`，选中单位死亡/被移除后它是会变陈旧还是
 * 立刻变 null 没有实测过，所以两道都查。
 */
function isUnitAlive(u: unit | undefined): u is unit {
  if (u == null) {
    return false;
  }
  // 顺手把 `0` 也挡掉：这跟 `isValidFrame` 是同一条教训 —— 句柄在 Lua 里是 number，
  // 而 Lua 把 0 当真值，没选中单位时 API 返回 0 而不是 nil 是完全可能的。
  if ((u as unknown as number) === 0) {
    return false;
  }
  return GetUnitTypeId(u) !== 0;
}

export class NativeUISystem {
  private static instance: NativeUISystem | undefined;

  /** create() 只允许生效一次 —— 热重载重复建同名 frame 是有风险的 */
  private created: boolean = false;

  // 自建 frame 句柄
  private uiFrame?: number;
  private shopSlotsFrame?: number;
  private healthBarFrame?: number;
  private manaBarFrame?: number;
  private hpTextFrame?: number;
  private mpTextFrame?: number;
  private goldTextFrame?: number;
  private goldIconFrame?: number;

  // 上一帧的血/蓝条百分比。见 `setBarPercent` —— 用来跳过没变化的帧。
  private lastHealthPercent = -1;
  private lastManaPercent = -1;

  // 计时器
  private resourceTimer?: Timer;
  private statusTimer?: Timer;

  /** 上一次应用的商店状态，用于避免每 tick 重排命令卡 */
  private lastShopState: boolean | undefined = undefined;

  /**
   * `create()` 的逐步结果（`OK |步骤` / `FAIL |步骤|错误`）。
   *
   * 存下来是给**探针**取的 —— `flushDiagnostics` 只走 `print`，而控制台在
   * 移植生效后可能被一起藏掉（2026-10-04 第 2 次运行就是「所有触发失效 +
   * Lua 控制台没了」，结果什么线索都没留下）。探针在 0.6s 跑，那时 `create()`
   * 早已结束，把这份报告一起带进剪贴板/平台日志，控制台死了也不丢信息。
   */
  private lastReport: string[] = [];

  /** 取 `create()` 上一次的逐步结果（只读副本） */
  public getLastReport(): string[] {
    return this.lastReport.slice();
  }

  private constructor() {}

  public static getInstance(): NativeUISystem {
    if (NativeUISystem.instance === undefined) {
      NativeUISystem.instance = new NativeUISystem();
    }
    return NativeUISystem.instance;
  }

  // -------------------------------------------------------------------------
  // 生命周期
  // -------------------------------------------------------------------------

  public create(): void {
    if (this.created) {
      log.warn("NativeUISystem 已经创建过，重复调用被忽略");
      return;
    }
    this.created = true;
    clearFrameCache();

    // 每一步单独 try/catch，并且把结果记下来。
    //
    // 这么做是因为**游戏内控制台不可信**：阶段 3 第一次成功跑起来时，
    // 用户报「Lua 控制台都没了」——那段代码里包含几个按索引盲钻原生 frame
    // 的操作（见 applyConsoleLayout），很可能把 KKWE 的 console overlay 一起藏了。
    // 控制台一没，`print`/`log` 全部抓瞎，所以诊断必须另走一条路：
    // 逐步记录 + 结束时 `DzSetClipboard`。哪怕控制台是黑的，剪贴板里也有全部真相。
    const report: string[] = [];
    const step = (name: string, fn: () => void): boolean => {
      try {
        fn();
        report.push(`OK   |${name}`);
        return true;
      } catch (e) {
        report.push(`FAIL |${name}|${e}`);
        log.error(`${name} 失败：${e}`);
        return false;
      }
    };

    // 必须排在最前：黑边是**引擎的绘制边距**，不改的话下面所有布局都摆在一块
    // 无意义的底子上量。
    step("clearBlackBorders", () => this.clearBlackBorders());

    step("applyConsoleLayout", () => this.applyConsoleLayout());
    step("buildFrames", () => this.buildFrames());
    step("applyInfoPanel", () => this.applyInfoPanel());
    step("applyPortrait", () => this.applyPortrait());
    step("applyInventoryButtons", () => this.applyInventoryButtons());

    // 先按"非商店"排一次，之后由 statusTimer 按选中单位的状态重排。
    step("applyCommandButtons", () => this.applyCommandButtons(false));

    step("timers", () => {
      this.resourceTimer = Timer.create().start(RESOURCE_UPDATE_PERIOD, true, () => {
        this.updateResources();
      });
      this.statusTimer = Timer.create().start(STATUS_UPDATE_PERIOD, true, () => {
        this.updateSelectedUnitStatus();
      });
    });

    // 立即刷一次，免得进游戏后要等一个周期才看到数字
    step("updateResources", () => this.updateResources());
    step("updateSelectedUnitStatus", () => this.updateSelectedUnitStatus());

    // 把每一步的结果 + 每次 frame 查找是被哪个 finder 命中的，一起送进剪贴板
    step("dumpLookupReport", () => {
      for (const line of dumpLookupReport()) {
        report.push(`LOOK |${line}`);
      }
    });

    this.lastReport = report;
    log.info("NativeUISystem 创建完成（阶段 3 骨架）");
    this.flushDiagnostics(report);
  }

  /**
   * 把创建过程的逐步结果输出出去。
   *
   * **当前只用 `print`（游戏内控制台），`DzSetClipboard` 关着。**
   * 关它的理由见下面 `ENABLE_CLIPBOARD_DIAGNOSTICS` 的注释 —— 它是唯一有嫌疑
   * 造成那族新的 `MSVCP140.dll` 闪退的东西。
   */
  private flushDiagnostics(report: string[]): void {
    if (!ENABLE_CREATE_DIAGNOSTICS) {
      return;
    }

    for (const line of report) {
      print(`[NativeUISystem] ${line}`);
    }
    log.info(`create() 逐步结果已打印（${report.length} 行）`);

    if (!ENABLE_CLIPBOARD_DIAGNOSTICS) {
      return;
    }

    const text = [
      "===== NativeUISystem.create() report =====",
      ...report,
      "===== end =====",
    ].join("\n");
    try {
      DzSetClipboard(text);
      print(`[NativeUISystem] report -> clipboard (${report.length} lines)`);
    } catch (e) {
      log.error(`写剪贴板失败：${e}`);
    }
  }

  public destroy(): void {
    if (!this.created) {
      return;
    }

    this.resourceTimer?.pause();
    this.statusTimer?.pause();
    this.resourceTimer = undefined;
    this.statusTimer = undefined;

    // 只销毁自己建的 frame。原生 frame 一个都不能碰 ——
    // 它们归暴雪 UI 管，DzDestroyFrame 上去就是闪退。
    for (const handle of [
      this.hpTextFrame,
      this.mpTextFrame,
      this.goldIconFrame,
      this.goldTextFrame,
      this.manaBarFrame,
      this.healthBarFrame,
      this.shopSlotsFrame,
      this.uiFrame,
    ]) {
      if (isValidFrame(handle)) {
        DzDestroyFrame(handle);
      }
    }
    this.uiFrame = undefined;
    this.shopSlotsFrame = undefined;
    this.healthBarFrame = undefined;
    this.manaBarFrame = undefined;
    this.lastHealthPercent = -1;
    this.lastManaPercent = -1;
    this.hpTextFrame = undefined;
    this.mpTextFrame = undefined;
    this.goldTextFrame = undefined;
    this.goldIconFrame = undefined;

    this.lastShopState = undefined;
    this.created = false;
    clearFrameCache();
  }

  // -------------------------------------------------------------------------
  // 控制台整体布局（源 1046-1056 行）
  // -------------------------------------------------------------------------

  /**
   * 清掉引擎的渲染黑边。
   *
   * 2026-10-04 探针实测定案：用户报的「底部一大片黑边」**不是任何 frame 画出来的**
   * —— 把命令卡按钮 / 物品栏按钮 / 头像 / 小地图 / `_ROOT_UI_FRAME` 的祖先链
   * 全爬了一遍，`rw`（屏宽占比）最大的也没有接近 1.0 的。它是引擎自己的绘制边距。
   *
   * 取值扫描（`BLACKBAND|BORDER #N`，9 个候选逐个试）结果：`(0, 0)` 就清干净了。
   * 单位是**屏幕比例**不是像素（XM 的四参数同名函数文档写「像素」，那版不可作准）。
   * 默认边距一直是引擎自己给的，本地图从来没调过这个函数，所以那条黑边一直在，
   * 只是平时被原生控制台盖住了 —— 移植把控制台挪上去之后才露出来。
   *
   * ⚠️ 雪月框架 `jass/XueYue/Framework/module/ui.lua:17` 初始化时调的也是
   * `DzFrameEditBlackBorders(0, 0)`。一度据此推测「(0,0) 是常态、调了也没用」，
   * **推错了** —— 人家调它同样是为了清边距。
   */
  private clearBlackBorders(): void {
    DzFrameEditBlackBorders(0, 0);
  }

  private applyConsoleLayout(): void {
    // 隐藏物品栏的底衬与 "Inventory" 文本
    setAlpha(frameByName("SimpleInventoryCover", 0), 0);
    hideByScale(frameByName("InventoryText", 0), 0.0001);

    // ConsoleUI 只设左上角一个点，把整个控制台压到下半屏
    setAbsPoint(frameByName("ConsoleUI", 0), FRAMEPOINT_TOPLEFT, CONSOLE_UI_TOPLEFT[0], CONSOLE_UI_TOPLEFT[1]);

    // 顶部的资源和菜单按钮条不要
    setVisible(frameByName("ResourceBarFrame", 0), false);
    setVisible(frameByName("UpperButtonBarFrame", 0), false);

    // 小地图和悬停提示改挂到 ConsoleUIBackdrop 下，跟着控制台走。
    // 提示框的**位置**不在这个开关里 —— 它本来就要跟着走，且只影响它自己。
    setAbsPoint(tooltipFrame(), FRAMEPOINT_BOTTOMRIGHT, UBERTOOLTIP_BOTTOMRIGHT[0], UBERTOOLTIP_BOTTOMRIGHT[1]);

    if (!APPLY_UNVERIFIED_ORIGIN_FRAME_OPS) {
      log.warn("跳过两个盲钻索引 + 两个重挂父节点（APPLY_UNVERIFIED_ORIGIN_FRAME_OPS=false）");
      return;
    }

    // GAME_UI 的孙子节点（没有名字，只能按索引下钻）。
    // 1.27a 的节点顺序与 1.32 未必一致，拿不到就算了 —— 只是少藏一个东西。
    setVisible(frameChild(frameChild(gameUI(), 5), 0), false);

    const consoleBackdrop = consoleParent();
    setParent(frameByName("MiniMapFrame", 0), consoleBackdrop);
    setVisible(frameChild(frameByName("ConsoleBottomBar", 0), 3), false);
    setParent(tooltipFrame(), consoleBackdrop);
  }

  // -------------------------------------------------------------------------
  // 自建 frame（源 1058-1128 行）
  // -------------------------------------------------------------------------

  private buildFrames(): void {
    const consoleBackdrop = consoleParent();
    const root = gameUI();

    // 主底板。**必须用 Tag 创建（DzCreateFrameByTagName）并给唯一名字** ——
    // japi.d.ts 明示：销毁一个被重复创建过的 Frame 会导致游戏崩溃。
    this.uiFrame = this.createBackdrop("UI", consoleBackdrop, UI_TEXTURE);
    clearAndSetRect(this.uiFrame, ...UI_BACKDROP_RECT);

    this.shopSlotsFrame = this.createBackdrop("ShopSlots", consoleBackdrop, SHOP_SLOTS_TEXTURE);
    clearAndSetRect(this.shopSlotsFrame, ...SHOP_SLOTS_RECT);
    // 阶段 3 先藏起来，商店逻辑属阶段 4
    setVisible(this.shopSlotsFrame, false);

    // 血条 / 蓝条
    this.healthBarFrame = this.createStatusBar("HealthBar", this.uiFrame, HEALTH_BAR_TEXTURE, HEALTH_BAR_RECT);
    this.manaBarFrame = this.createStatusBar("ManaBar", this.uiFrame, MANA_BAR_TEXTURE, MANA_BAR_RECT);

    // 血/蓝数值文本。挂在 GAME_UI 上（与源一致），不吃 UI 底板的裁剪
    this.hpTextFrame = this.createText("HPTEXT", root, HP_TEXT_RECT);
    this.mpTextFrame = this.createText("MPTEXT", root, MP_TEXT_RECT);

    // 金币。**没有粮草（Lumber）** —— 源实现里那个 Lumber frame 从头到尾没被创建过，
    // `onResources` 每 0.2s 对着 nil 调一次 SetText，是源实现自己的 bug。不跟。
    this.goldTextFrame = this.createText("GOLD", this.uiFrame, GOLD_TEXT_RECT);

    this.goldIconFrame = this.createBackdrop("GoldIcon", this.uiFrame, "");
    clearAndSetRect(this.goldIconFrame, ...GOLD_ICON_RECT);
    // 源里 GOLD_ICON 配置为空串时就把图标藏掉，这里保持一致
    setVisible(this.goldIconFrame, false);
  }

  private createBackdrop(name: string, parent: number | undefined, texture: string): number | undefined {
    if (!isValidFrame(parent)) {
      log.error(`无法创建 ${name}：父节点无效`);
      return undefined;
    }
    const handle = DzCreateFrameByTagName("BACKDROP", name, parent, "", 0);
    if (!isValidFrame(handle)) {
      log.error(`创建 BACKDROP ${name} 失败`);
      return undefined;
    }
    setTexture(handle, texture);
    return handle;
  }

  /**
   * 血条 / 蓝条。
   *
   * ⚠️ **不能用 `"SIMPLESTATUSBAR"`。** 2026-10-04 实测：这个名字不是
   * `DzCreateFrameByTagName` 的合法类型，调用会**当场抛 native 错误**
   * （`Call jass function crash.<unknown>`），把整个 `buildFrames` 打断 ——
   * 表现是「底板建出来了，血蓝条以及其后的所有 frame 一个都没有」。
   * `.github/copilot-instructions.md:158` 里那条
   * `JAPI::GUI::DzCreateFrameByTagName, err tag` = 「类型名称无效」说的就是这个。
   * 合法类型只有 `BACKDROP` / `BUTTON` / `TEXT` / `FRAME` / `GLUEBUTTON` / `MODEL`。
   *
   * 所以条形改成「BACKDROP + 按百分比缩宽度」—— 这是本仓库**已有运行验证**的做法：
   * `KKWEHeroBloodBar.onTimerTick` 就是 `DzFrameSetSize` 缩宽度画血条/护盾条。
   * 代价是贴图被拉伸而不是裁剪；但源端血蓝条本来就是纯色 teamcolor 贴图，
   * 横向拉伸看不出区别。
   */
  private createStatusBar(
    name: string,
    parent: number | undefined,
    texture: string,
    rect: readonly [number, number, number, number]
  ): number | undefined {
    if (!isValidFrame(parent)) {
      log.error(`无法创建 ${name}：父节点无效`);
      return undefined;
    }
    const handle = DzCreateFrameByTagName("BACKDROP", name, parent, "", 0);
    if (!isValidFrame(handle)) {
      log.error(`创建 BACKDROP ${name} 失败`);
      return undefined;
    }
    setTexture(handle, texture);
    clearAndSetRect(handle, ...rect);
    return handle;
  }

  /**
   * 把条形按 0-100 的百分比缩到对应宽度（左端固定，右端收）。
   *
   * 每 tick 都会调（20 次/秒 × 2 根条），所以先把百分比夹到 0-100 再**按 0.1 精度比较**：
   * 数值没变就不碰 frame —— 否则每 tick 三发 native 调用（ClearAllPoints + 两个
   * SetAbsolutePoint）纯属浪费，反复清点重设还可能引起闪烁。
   *
   * `lastPercent` 传上一帧的值，返回本帧该记住的值（句柄无效时原样返回）。
   */
  private setBarPercent(
    handle: number | undefined,
    rect: readonly [number, number, number, number],
    percent: number,
    lastPercent: number
  ): number {
    if (!isValidFrame(handle)) {
      return lastPercent;
    }
    const p = percent > 100 ? 100 : percent > 0 ? percent : 0;
    const rounded = Math.round(p * 10) / 10;
    if (rounded === lastPercent) {
      return lastPercent;
    }
    const [x1, y1, x2, y2] = rect;
    clearAndSetRect(handle, x1, y1, x1 + (x2 - x1) * (rounded / 100), y2);
    return rounded;
  }

  private createText(
    name: string,
    parent: number | undefined,
    rect: readonly [number, number, number, number]
  ): number | undefined {
    if (!isValidFrame(parent)) {
      log.error(`无法创建 ${name}：父节点无效`);
      return undefined;
    }
    const handle = DzCreateFrameByTagName("TEXT", name, parent, "", 0);
    if (!isValidFrame(handle)) {
      log.error(`创建 TEXT ${name} 失败`);
      return undefined;
    }
    clearAndSetRect(handle, ...rect);
    setText(handle, "");
    setEnable(handle, false);
    setScale(handle, 1.0);
    // TODO: 文本对齐。源实现是 `BlzFrameSetTextAlignment(f, TEXT_JUSTIFY_CENTER, TEXT_JUSTIFY_MIDDLE)`，
    // 但 `DzFrameSetTextAlignment(frame, align)` 只吃**一个打包整数**，而且
    // KKWE 的 bzapi/action.txt 里只写了 `type = integer`，没有给出编码表。
    // 与其瞎猜一个魔数，先不设（默认左对齐）—— 第一次跑起来看一眼再定。
    return handle;
  }

  // -------------------------------------------------------------------------
  // 命令卡（源 onCommandButtons）
  // -------------------------------------------------------------------------

  private applyCommandButtons(shop: boolean): void {
    const table = shop ? COMMAND_BUTTONS_SHOP : COMMAND_BUTTONS_NORMAL;

    for (let i = 0; i < table.length; i++) {
      // 1.27a 上 `CommandButton_0..11` 按名字 12/12 全 MISS，走专用 getter
      const handle = commandBarButton(i);
      const rect = table[i];
      clearAndSetRect(handle, rect[0], rect[1], rect[2], rect[3]);
      setScale(handle, COMMAND_BUTTON_SCALES[i]);
    }
  }

  // -------------------------------------------------------------------------
  // 物品栏（源 onInventoryButtons）
  // -------------------------------------------------------------------------

  private applyInventoryButtons(): void {
    for (let i = 0; i < INVENTORY_BUTTON_RECTS.length; i++) {
      // 1.27a 上 `InventoryButton_0..5` 按名字 6/6 全 MISS，走专用 getter
      const handle = inventoryButton(i);
      const rect = INVENTORY_BUTTON_RECTS[i];
      clearAndSetRect(handle, rect[0], rect[1], rect[2], rect[3]);
      setSize(handle, INVENTORY_BUTTON_SIZE[0], INVENTORY_BUTTON_SIZE[1]);
    }
  }

  // -------------------------------------------------------------------------
  // 信息面板（源 onInfoPanel）
  // -------------------------------------------------------------------------

  private applyInfoPanel(): void {
    // buff 条
    const buffBar = buffBarFrame();
    clearAndSetRect(buffBar, BUFF_BAR_RECT[0], BUFF_BAR_RECT[1], BUFF_BAR_RECT[2], BUFF_BAR_RECT[3]);

    // TODO: 源还隐藏了 buff 条上的 "Status" 标签
    // （`ORIGIN_FRAME_UNIT_PANEL_BUFF_BAR_LABEL`）。Dz 这边既没有专用 getter，
    // 也没法按名字取，暂时留着 —— 只是多一个原生小字，不影响布局。

    // 隐藏各种名称/描述文本，靠缩到极小
    for (const [name, id] of [
      ["SimpleNameValue", 0],
      ["SimpleClassValue", 0],
      ["SimpleBuildingNameValue", 1],
      ["SimpleBuildingActionLabel", 1],
      ["SimpleHoldNameValue", 2],
      ["SimpleHoldDescriptionNameValue", 2],
      ["SimpleItemNameValue", 3],
      ["SimpleItemDescriptionValue", 3],
      ["SimpleDestructableNameValue", 4],
    ] as Array<[string, number]>) {
      hideByScale(frameByName(name, id), HIDE_SCALE);
    }

    // 主属性图标
    this.setRectFromTuple(frameByName("InfoPanelIconHeroIcon", 6), HERO_MAIN_STAT_RECT);

    // 三围：标签藏掉，数值条单独摆
    hideByScale(frameByName("InfoPanelIconHeroStrengthLabel", 6), HIDE_SCALE);
    this.setRectFromTuple(frameByName("InfoPanelIconHeroStrengthValue", 6), HERO_STRENGTH_VALUE_RECT);
    hideByScale(frameByName("InfoPanelIconHeroAgilityLabel", 6), HIDE_SCALE);
    this.setRectFromTuple(frameByName("InfoPanelIconHeroAgilityValue", 6), HERO_AGILITY_VALUE_RECT);
    hideByScale(frameByName("InfoPanelIconHeroIntellectLabel", 6), HIDE_SCALE);
    this.setRectFromTuple(frameByName("InfoPanelIconHeroIntellectValue", 6), HERO_INTELLECT_VALUE_RECT);

    // 三条进度条叠在同一个位置：计时生命 / 英雄经验 / 建造进度
    this.setRectFromTuple(frameByName("SimpleProgressIndicator", 0), PROGRESS_BAR_RECT);
    this.setRectFromTuple(frameByName("SimpleHeroLevelBar", 0), PROGRESS_BAR_RECT);
    this.setRectFromTuple(frameByName("SimpleBuildTimeIndicator", 1), PROGRESS_BAR_RECT);

    // 攻击块
    const attackBackdrop = frameByName("InfoPanelIconBackdrop", 0);
    this.setRectFromTuple(attackBackdrop, ATTACK_BACKDROP_RECT);
    setSize(attackBackdrop, INFO_ICON_BACKDROP_SIZE[0], INFO_ICON_BACKDROP_SIZE[1]);
    this.setRectFromTuple(frameByName("InfoPanelIconValue", 0), ATTACK_VALUE_RECT);
    hideByScale(frameByName("InfoPanelIconLabel", 0), 0.0001);

    // 护甲块
    const armorBackdrop = frameByName("InfoPanelIconBackdrop", 2);
    this.setRectFromTuple(armorBackdrop, ARMOR_BACKDROP_RECT);
    setSize(armorBackdrop, INFO_ICON_BACKDROP_SIZE[0], INFO_ICON_BACKDROP_SIZE[1]);
    this.setRectFromTuple(frameByName("InfoPanelIconValue", 2), ARMOR_VALUE_RECT);
    hideByScale(frameByName("InfoPanelIconLabel", 2), 0.0001);
  }

  private setRectFromTuple(
    handle: number | undefined,
    rect: readonly [number, number, number, number]
  ): void {
    clearAndSetRect(handle, rect[0], rect[1], rect[2], rect[3]);
  }

  // -------------------------------------------------------------------------
  // 头像（源 onPortrait）
  // -------------------------------------------------------------------------

  private applyPortrait(): void {
    // 对应源里的 `BlzEnableUIAutoPosition(false)`：关掉原生 UI 的自动锚点重置，
    // 否则暴雪 UI 会在每次窗口尺寸变化时把我们的布局顶回去。
    // 这是**全局副作用**，与能不能取到头像 frame 无关，所以放在 guard 之前。
    DzOriginalUIAutoResetPoint(false);

    const portrait = portraitFrame();
    if (!isValidFrame(portrait)) {
      log.warn("取不到头像 frame，跳过（布局其余部分不受影响）");
      return;
    }

    setVisible(portrait, true);
    clearAndSetRect(portrait, PORTRAIT_RECT[0], PORTRAIT_RECT[1], PORTRAIT_RECT[2], PORTRAIT_RECT[3]);
  }

  // -------------------------------------------------------------------------
  // 金币（源 onResources）
  // -------------------------------------------------------------------------

  private updateResources(): void {
    const player = GetLocalPlayer();
    // `ConvertPlayerState(1)` 就地在调用点求值（对应 `common.j:385` 的
    // `PLAYER_STATE_RESOURCE_GOLD`）。**不要提到模块顶层做成常量** —— 见文件头
    // 关于「模块加载期调 native」的说明：本模块被 main.ts 顶层 import，
    // 顶层求值发生在 bootstrap 的 require 阶段，那时控制台都还没开，
    // 一旦出错就是「界面全无 + 无从定位」。
    const gold = GetPlayerState(player, ConvertPlayerState(1));
    setText(this.goldTextFrame, `|cffffcc00${Math.floor(gold)}|r`);
  }

  // -------------------------------------------------------------------------
  // 血/蓝条（源 onPeriod）
  // -------------------------------------------------------------------------

  private updateSelectedUnitStatus(): void {
    const u = DzGetSelectedLeaderUnit();

    if (!isUnitAlive(u)) {
      this.lastHealthPercent = this.setBarPercent(this.healthBarFrame, HEALTH_BAR_RECT, 0, this.lastHealthPercent);
      this.lastManaPercent = this.setBarPercent(this.manaBarFrame, MANA_BAR_RECT, 0, this.lastManaPercent);
      setText(this.hpTextFrame, "|cffFFFFFF|r");
      setText(this.mpTextFrame, "|cffFFFFFF|r");
      return;
    }

    // 商店状态变化时重排一次命令卡（源实现放在这里，理由相同：
    // 只有每 tick 才知道当前选中的单位变没变）
    const shop = this.isShopUnit(u);
    if (shop !== this.lastShopState) {
      this.lastShopState = shop;
      this.applyCommandButtons(shop);
    }

    const maxLife = GetUnitState(u, UNIT_STATE_MAX_LIFE);
    const life = GetUnitState(u, UNIT_STATE_LIFE);
    const maxMana = GetUnitState(u, UNIT_STATE_MAX_MANA);
    const mana = GetUnitState(u, UNIT_STATE_MANA);

    // 源实现用的是 `GetUnitLifePercent` / `GetUnitManaPercent` —— 那是 Blizzard.j 里的
    // 包装函数，本工程只有 Common.j 的原生函数，没有这两个名字。自己算，
    // 写法与 `KKWEHeroBloodBar.onTimerTick` 保持一致（含 max <= 0 的除零保护）。
    // 条形本身是 BACKDROP，靠缩宽度表现百分比（见 `createStatusBar`）。
    this.lastHealthPercent = this.setBarPercent(
      this.healthBarFrame,
      HEALTH_BAR_RECT,
      maxLife <= 0 ? 0 : (life / maxLife) * 100,
      this.lastHealthPercent
    );
    this.lastManaPercent = this.setBarPercent(
      this.manaBarFrame,
      MANA_BAR_RECT,
      maxMana <= 0 ? 0 : (mana / maxMana) * 100,
      this.lastManaPercent
    );

    setText(this.hpTextFrame, `|cffFFFFFF${Math.round(life)} / ${Math.round(maxLife)}|r`);
    setText(this.mpTextFrame, `|cffFFFFFF${Math.round(mana)} / ${Math.round(maxMana)}|r`);
  }

  /**
   * 源实现的判据：拥有"选单位 / 选英雄 / 购买物品"任一技能，且不是敌人。
   */
  private isShopUnit(u: unit): boolean {
    if (!isUnitAlive(u)) {
      return false;
    }
    if (IsUnitEnemy(u, GetLocalPlayer())) {
      return false;
    }
    for (const abilityId of SHOP_ABILITY_IDS) {
      if (GetUnitAbilityLevel(u, abilityId) > 0) {
        return true;
      }
    }
    return false;
  }
}
