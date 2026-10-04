import {
  Frame,
  FRAME_ALIGN_LEFT_TOP,
  FRAME_ALIGN_RIGHT_BOTTOM,
  MapPlayer,
  Timer,
} from "@eiriksgata/wc3ts/*";
import { FrameEventUtils } from "src/constants/frame/utils";
import { UIBackgrounds } from "src/constants/ui/preset";
import {
  type Buff,
  BUFF_EVENT_BUFFS_CHANGED,
  BuffPolarity,
  buildBuffTooltipText,
  formatSlotTimeShort,
  registerDefaultBuffDisplays,
  resolveBuffDisplay,
} from "src/system/buff";
import { Actor } from "../../actor";
import { UNIT_TYPE_HERO } from "src/constants/game/units";
import { eventBus } from "../../event/EventBus";
import { gameEvents } from "../../event";
import { ScreenCoordinates } from "../ScreenCoordinates";
import { Tips, TipsAnimation, TipsPosition } from "./Tips";
import { onFrame } from "../FrameLoop";
import { createLogger } from "src/utils/logger";

const log = createLogger("BuffBarUI");

/**
 * **结构**检查周期。只管「该挂几个槽、槽位对不对」，不管文字。
 *
 * 文字改成每帧刷了（`refreshPerFrame`），但 `rebuildSlots()` 要 **create / destroy
 * frame 句柄**，而每帧回调是**异步**的，句柄增删必须留在同步上下文 —— 所以结构检查
 * 继续用定时器，见 `refreshTimeLabels` 的注释。
 */
const REFRESH_INTERVAL = 0.1;
let nextBuffSlotNameId = 1;

/** 槽位时间角标用字体（与 UnitBlood 一致，地图内已有资源） */
const SLOT_TIME_FONT = "resource\\Texture\\ui\\hpbar\\ZiTi.TTf";

/**
 * `DzFrameSetTextAlignment` 的打包整数。
 *
 * 以前这里记的是「编码未知，别猜」—— 其实**仓库里已经有整张表**，
 * 只是全仓库一次都没用过：`wc3ts/src/globals/define.ts:884-892`。
 * 把九个常量按二进制拆开，编码就出来了：
 *
 *     水平位  8 = 左 / 16 = 中 / 32 = 右
 *     垂直位  1 = 上 /  2 = 中 /  4 = 下
 *     两者按位或
 *
 * 九个里七个严格符合（LEFT=8|2=10、CENTER=16|2=18、RIGHT=32|2=34、
 * LEFT_BOTTOM=8|4=12、BOTTOM=16|4=20、RIGHT_BOTTOM=32|4=36、TOP=16|1=17）；
 * 只有 LEFT_TOP(11) / RIGHT_TOP(37) 多带了一个位，像是抄表时的笔误 —— 反正用不到。
 * 这里只取两个：一个能对上、且 `UnitBlood.ts:215` 已经进游戏跑通（名牌文字就是 18）。
 *
 * ⚠️ 注意 `Frame.setTextAlignment(vert, horz)` 这个包装函数**把第二个参数丢掉了**
 * （`wc3ts/src/handles/frame.ts:316`，传参处还挂着 `no-unused-vars` 的 eslint 注释），
 * 它只把**第一个**数交给引擎。所以它的参数名 (vert, horz) 纯属误导，
 * 真正要写的是**打包后的那一个整数**。之前写的 `setTextAlignment(4, 0)` 实际生效 4
 * —— 只有垂直「下」、没有水平位，数字因此被丢到左下角而不是居中。
 */
const TEXT_ALIGN_CENTER = 18;
const TEXT_ALIGN_RIGHT_BOTTOM = 36;

/**
 * 槽位文字颜色 —— **两个数字用不同颜色**：
 *   剩余时间（压图标正中）：浅色
 *   层数（钉右下角）：深色
 *
 * 用 `|cffRRGGBB` 文本前缀上色，**不用 `DzFrameSetTextColor`** ——
 * 后者全仓库零调用、`action.txt` 也只写 `type = integer` 没给编码，
 * 而 `|cff` 是本仓库已经进游戏跑通的路子（`Text.setColor`、`UnitBloodToggleUI`）。
 */
const SLOT_TIME_COLOR = "FFFFFF";
const SLOT_STACK_COLOR = "000000";

/** 给槽位文本套颜色。空串原样返回，免得渲染出一对空的 `|cff|r` */
function slotColored(text: string, hexColor: string): string {
  return text === "" ? "" : `|cff${hexColor}${text}|r`;
}

/**
 * 没有选中任何单位时，自动跟随本地玩家 **id 最小的英雄**（没有英雄则最小 id 的本地单位）。
 *
 * **必须主动获取**：`bindFollowLocalSelection()` 只挂「选中 / 取消选中」两个事件，
 * 而开局一个人都不会被选中 —— 事件永远不触发，`watchTarget` 恒为 `undefined`，
 * `rebuildSlots()` 第一行就 return，**一个图标都不会画**。所以不能只靠接线。
 *
 * ⚠️ 副作用：因为每拍都会重新获取，**取消选中之后栏会切回英雄**，而不是变空。
 * 这与 todo.md「统一展示英雄全部状态」的常驻观感一致，故默认开启；
 * 想要「取消选中就留空栏」把它改成 false。
 */
const FOLLOW_FIRST_LOCAL_ACTOR_WHEN_IDLE = true;

export interface BuffBarLayoutConfig {
  slotsPerRow: number;
  maxRows: number;
  /** 默认可由 slotsPerRow * maxRows 推导；单独设置时可限制总格数 */
  maxSlots?: number;
  iconSizePx: number;
  borderPadPx: number;
  spacingPx: number;
  rowSpacingPx: number;
  rowPaddingPx: number;
  /** 相对屏幕几何中心的额外水平偏移（像素，右为正） */
  centerOffsetXPx: number;
  /** 相对网格底边锚点的额外垂直偏移（像素，**下**为正） */
  centerOffsetYPx: number;
  /**
   * 网格**底边**所在的归一化 y（WC3 坐标，向上为正）。
   *
   * 0.115 是原生状态栏的上边缘 —— 即 `layoutV3.ts:110` 的
   * `BUFF_BAR_RECT = [0.359120, 0.115000, …]` 的 `y1`，它是控制台那一整块里最高的
   * （`UI_BACKDROP_RECT` 0.09918、`PORTRAIT_RECT` 0.09776、血蓝条 0.06786 都更低）。
   * 默认 0.118 = 0.115 + 0.003 间隙，刚好压在它上方。
   *
   * ⚠️ 备忘：todo.md 阶段 4 若把团队选择行摆到 y 0.133（`war3map.lua:808-863`），
   * 那里的行高与这里的网格可能撞上，届时两边要一起重新排布。
   */
  gridBottomY: number;
}

export const DEFAULT_BUFF_BAR_LAYOUT: BuffBarLayoutConfig = {
  slotsPerRow: 10,
  maxRows: 3,
  iconSizePx: 36,
  borderPadPx: 2,
  spacingPx: 4,
  rowSpacingPx: 4,
  rowPaddingPx: 4,
  centerOffsetXPx: 0,
  centerOffsetYPx: 0,
  gridBottomY: 0.118,
};

/** 传给 Tips 的组件几何。**像素坐标**；Tips 只用 x/y/width/height，它不看 frame */
interface SlotComponentInfo {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface SlotFrames {
  border: Frame;
  icon: Frame;
  timeText: Frame;
  /** 右下角层数角标 */
  stackText: Frame;
  hit: Frame;
  buffId: number;
  /**
   * 建这个槽位时用的 Buff 对象，**每帧刷文字直接读它**，不再去调 `getSortedBuffs()`
   * —— 那个方法每次都 slice + sort，挂在每帧回调上等于每秒白造几十个数组。
   * 对象里的 duration / elapsed / stacks 都只是普通数字，即使这个 buff 已经从
   * manager 里移除了也读得安全。集合真的变了（数量或 id 序列）由 0.1 秒那个
   * 定时器发现并重建（见 `refreshTimeLabels`）。
   */
  buff: Buff;
  /** 悬停 Tips 的定位用。每帧刷新也要它，所以得存下来（见 `refreshHoveredTooltip`） */
  componentInfo: SlotComponentInfo;
  /** 上次写进 timeText 的串，用来跳过没变化时的 setText（见 `refreshSlotTexts`） */
  lastTimeText: string;
  /** 同上，层数角标 */
  lastStackText: string;
  /** 上次给 Tips 的正文，用来跳过没变化时的重设（见 `refreshHoveredTooltip`） */
  lastTooltipText: string;
}

/**
 * 层数角标文本：**只有 > 1 才显示**。
 * 1 层是常态，每个图标都画个「1」只会把图标糊脏（todo.md 要的是「可堆叠被动」的层数）。
 */
function stackBadgeText(buff: Buff): string {
  return buff.stacks > 1 ? `${buff.stacks}` : "";
}

/**
 * Buff 分类配色 —— **一套调色板，两个消费者**（todo.md「统一UI色彩体系，通过颜色快速区分
 * Buff类型，降低玩家识别成本」）。
 *
 * | 分类 | 颜色 | 取色依据 |
 * |---|---|---|
 * | 增益 | 亮绿 | todo「增益Buff：亮绿色/浅色图标」 |
 * | 减益 | 暗红 | todo「减益Buff：暗红色/暗色图标」 |
 * | 中性 | 浅灰 | 既非增益也非减益（todo 中「部分光环」） |
 *
 * 两个消费者：
 *   1. **图标**用 `DzFrameSetVertexColor` 乘算上色；
 *   2. **悬停正文**用 `|cff` 前缀（`Tips.formatDisplayText`）。
 *
 * 两处必须**同源**，否则会出现「图标绿的、正文红的」，比不配色更乱 —— 所以只有这一个函数。
 *
 * ⚠️ 乘算是**只减不增**（结果 = 贴图 × 该色），所以给的是**接近白**的浅色。
 * 直接拿饱和纯色去乘会把彩色图标压成一块死色。要调色就改这里的三个三元组，
 * 别再往别处拷贝一份。
 */
function buffCategoryColor(buff: Buff): {
  r: number;
  g: number;
  b: number;
  hex: string;
} {
  switch (buff.polarity) {
    case BuffPolarity.BENEFICIAL:
      return { r: 168, g: 255, b: 168, hex: "A8FFA8" };
    case BuffPolarity.NEGATIVE:
      return { r: 255, g: 136, b: 136, hex: "FF8888" };
    case BuffPolarity.NEUTRAL:
      return { r: 204, g: 204, b: 204, hex: "CCCCCC" };
    default:
      return { r: 255, g: 255, b: 255, hex: "FFFFFF" };
  }
}

/** 悬停正文的颜色：直接取调色板的 `hex` 分量（见 `buffCategoryColor`） */
function buffTipsTextColor(buff: Buff): string {
  return buffCategoryColor(buff).hex;
}

/**
 * 屏幕居中 Buff 图标网格（紧凑、悬停 Tips、槽位显示剩余时间）
 */
export class BuffBarUI {
  private static instance: BuffBarUI | undefined;

  private layout: BuffBarLayoutConfig = { ...DEFAULT_BUFF_BAR_LAYOUT };
  private gameUI: Frame | null = null;
  private watchTarget: Actor | undefined;
  private slots: SlotFrames[] = [];
  /** 鼠标当前停在哪个槽位上（Tips 每帧刷新要知道刷谁）。离开或重建槽位时清空 */
  private hoveredSlot: SlotFrames | undefined = undefined;
  private subscriptionId: number = -1;
  private refreshTimer: Timer | null = null;
  private created = false;

  private static followSelectionBound = false;

  private constructor() {}

  public static getInstance(): BuffBarUI {
    if (!BuffBarUI.instance) {
      BuffBarUI.instance = new BuffBarUI();
    }
    return BuffBarUI.instance;
  }

  private getMaxSlots(): number {
    const cap = this.layout.slotsPerRow * this.layout.maxRows;
    if (this.layout.maxSlots !== undefined) {
      return math.min(this.layout.maxSlots, cap);
    }
    return cap;
  }

  public setLayout(config: Partial<BuffBarLayoutConfig>): this {
    this.layout = { ...this.layout, ...config };
    if (this.created && this.watchTarget) {
      this.rebuildSlots();
    }
    return this;
  }

  public getLayout(): BuffBarLayoutConfig {
    return { ...this.layout };
  }

  public create(): void {
    if (this.created) return;
    registerDefaultBuffDisplays();

    const gui = Frame.fromHandle(DzGetGameUI());
    this.gameUI = gui ?? null;
    if (!this.gameUI) {
      log.error("DzGetGameUI failed");
      return;
    }

    // 把 Tips 的帧**提前到这里**建出来（同步、非事件上下文），不要等第一次悬停。
    //
    // 悬停回调是 `DzFrameSetScriptByCode(hit, MOUSE_ENTER, ..., sync=true)` 注册的，
    // 按 `bzapi/action.txt` 的注释，sync=true 时「执行会阻止它原本的功能继续响应」——
    // 也就是说回调嵌在**引擎的鼠标事件分发内部同步执行**。在里面调 `Tips.getInstance()`
    // 会触发 `Tips.create()`，往引擎**正在遍历的帧树里新增节点**（还要 `DzFrameSetPriority`）。
    // 表现就是鼠标一移到 buff 图标上直接原生闪退：Game.dll 里拿一个空句柄去取字段
    // （ACCESS_VIOLATION 读 0x1C，崩溃报告的前 4 层全是 Game.dll，从 kkapi 的 JAPI 分发进来）。
    //
    // 为什么只有 buff 栏中招：`RelicBarUI` 在建槽位时（`rebuildSlots`）就调了
    // `Tips.getInstance()`，等于在同步上下文里提前建好了，悬停时只剩改属性。
    //
    // 只提前**建帧**，不改任何显示行为：`create()` 会把三个 frame 都设成 alpha 0、
    // `isVisible = false`，并且逐个 `setIgnoreTrackEvents(true)`，不会挡鼠标。
    Tips.getInstance();

    this.subscriptionId = eventBus.on(
      BUFF_EVENT_BUFFS_CHANGED,
      (payload: { actor: Actor }) => {
        if (this.watchTarget && payload.actor.id === this.watchTarget.id) {
          this.rebuildSlots();
        }
      }
    );

    this.refreshTimer = Timer.create();
    this.refreshTimer.start(REFRESH_INTERVAL, true, () => {
      this.refreshTimeLabels();
    });

    // 每帧绘制：刷文字 + 刷悬停 Tips 的正文。
    // **只写 frame 属性，不建/毁句柄** —— 回调是异步的，句柄增删归上面那个同步定时器
    // （纪律见 `FrameLoop` 的注释）。
    onFrame(() => {
      this.refreshPerFrame();
    });

    this.created = true;
  }

  public bindFollowLocalSelection(): void {
    if (BuffBarUI.followSelectionBound) return;
    BuffBarUI.followSelectionBound = true;

    gameEvents.onUnitSelected((data) => {
      if (GetTriggerPlayer() !== GetLocalPlayer()) return;
      BuffBarUI.getInstance().setWatchTarget(data.Actor);
    });
    gameEvents.onUnitDeselected(() => {
      if (GetTriggerPlayer() !== GetLocalPlayer()) return;
      BuffBarUI.getInstance().setWatchTarget(undefined);
    });
  }

  public setWatchTarget(actor: Actor | undefined): void {
    this.watchTarget = actor;
    if (!actor || actor.owner !== MapPlayer.fromLocal()) {
      this.clearSlots();
      return;
    }
    this.rebuildSlots();
  }

  public getWatchTarget(): Actor | undefined {
    return this.watchTarget;
  }

  public destroy(): void {
    if (this.subscriptionId >= 0) {
      eventBus.off(this.subscriptionId);
      this.subscriptionId = -1;
    }
    if (this.refreshTimer) {
      this.refreshTimer.destroy();
      this.refreshTimer = null;
    }
    this.clearSlots();
    this.watchTarget = undefined;
    this.created = false;
    this.gameUI = null;
    BuffBarUI.instance = undefined;
  }

  private clearSlots(): void {
    // 槽位马上要被销毁，指向它的悬停记录必须一起清掉：
    // 否则每帧的 `refreshHoveredTooltip` 会对着一个已经 release 的槽位写 Tips。
    this.hoveredSlot = undefined;
    for (const s of this.slots) {
      s.hit.destroy();
      s.stackText.destroy();
      s.timeText.destroy();
      s.icon.destroy();
      s.border.destroy();
    }
    this.slots = [];
  }

  /**
   * 每 0.1 秒跑一次，只管**结构** —— 该挂几个槽、槽位对不对。
   *
   * 文字不在这里刷了，挪去了每帧的 `refreshSlotTexts()`（见 `refreshPerFrame`）。
   * 这个定时器必须留着：`rebuildSlots()` 会 **create / destroy frame 句柄**，
   * 而每帧回调是**异步**的，句柄增删得留在同步上下文里（FrameLoop 的纪律 2）。
   */
  private refreshTimeLabels(): void {
    if (!this.created || !this.gameUI) return;

    // 懒获取：开局不会有任何选中/取消选中事件，不主动抓就永远是空栏（见文件头常量注释）
    if (!this.watchTarget && FOLLOW_FIRST_LOCAL_ACTOR_WHEN_IDLE) {
      const idle = this.resolveIdleTarget();
      if (idle) {
        this.setWatchTarget(idle); // 内部自己会 rebuildSlots
      }
    }

    if (!this.watchTarget) return;
    if (this.watchTarget.owner !== MapPlayer.fromLocal()) return;

    const buffs = this.watchTarget.buffManager.getSortedBuffs();
    const n = math.min(buffs.length, this.getMaxSlots());
    if (this.slots.length !== n) {
      this.rebuildSlots();
      return;
    }
    for (let i = 0; i < n; i++) {
      const slot = this.slots[i];
      const b = buffs[i];
      if (!slot || b.id !== slot.buffId) {
        this.rebuildSlots();
        return;
      }
    }
  }

  /**
   * 每帧绘制，挂在 `FrameLoop` 的异步回调上。
   *
   * ⚠️ **只写 frame 的文本属性**，不 create / destroy 任何句柄 ——
   * 句柄增删在 `refreshTimeLabels()` 那个同步定时器里做，理由见 FrameLoop 的纪律 2。
   */
  private refreshPerFrame(): void {
    if (!this.created || !this.gameUI) return;
    this.refreshSlotTexts();
    this.refreshHoveredTooltip();
  }

  /**
   * 把每个槽位的时间角标和层数角标重新写成当前值。
   *
   * **串没变就不碰 frame**：现在是每帧都跑，而剩余时间的精度只到 0.1 秒
   * （`formatSlotTimeShort` 对 r >= 10 直接取整），绝大多数帧算出来的串和上一帧一样。
   * 拿同样的内容反复调 `setText` 会让引擎重排文字、还可能闪 —— 这与
   * `NativeUISystem.setBarPercent` 按 0.1 精度比较、没变就不设值是同一套理由。
   */
  private refreshSlotTexts(): void {
    for (const slot of this.slots) {
      const timeStr = slotColored(formatSlotTimeShort(slot.buff), SLOT_TIME_COLOR);
      if (timeStr !== slot.lastTimeText) {
        slot.lastTimeText = timeStr;
        slot.timeText.setText(timeStr);
      }

      const stackStr = slotColored(stackBadgeText(slot.buff), SLOT_STACK_COLOR);
      if (stackStr !== slot.lastStackText) {
        slot.lastStackText = stackStr;
        slot.stackText.setText(stackStr);
      }
    }
  }

  /**
   * 悬停中的那个槽位，把它的 Tips 正文每帧重算一遍。
   *
   * 原实现只在 `onMouseEnter` 那一下用 `buildBuffTooltipText()` 生成过一次，之后
   * **再也不更新** —— 正文里那句「剩余时间: X 秒」会永远停在鼠标移入的那一瞬间
   * （截图里定住不动的那个「2.7 秒」就是这么来的）。
   *
   * `Tips.show()` 对「已经可见」是**原地更新内容、不重播动画**（`Tips.ts:352-356`），
   * 所以重复调不会闪也不会抖；只有正文真的变了才调，省掉每帧的 `calculatePosition`
   * 和一堆 native 调用。
   *
   * `onMouseLeave` 会**同步**把 `hoveredSlot` 清空，所以这里不会把正在淡出的 Tips
   * 又「复活」回来。
   */
  private refreshHoveredTooltip(): void {
    const slot = this.hoveredSlot;
    if (slot === undefined) return;

    const text = buildBuffTooltipText(slot.buff);
    if (text === slot.lastTooltipText) return;
    this.showSlotTooltip(slot, text);
  }

  /**
   * 把某个槽位的 Tips 显示 / 原地更新出来。
   *
   * 悬停进入与每帧刷新共用这一份配置 —— 免得同样的 width / maxHeight / 颜色
   * 在两处各写一遍，改一处忘一处。
   */
  private showSlotTooltip(slot: SlotFrames, text: string): void {
    slot.lastTooltipText = text;
    Tips.getInstance().showFromComponentInfo(
      {
        text,
        textColor: buffTipsTextColor(slot.buff),
        icon: resolveBuffDisplay(slot.buff).icon,
        width: 300,
        maxHeight: 360,
        position: TipsPosition.AUTO,
        animation: TipsAnimation.NONE,
        delayShow: 0,
      },
      slot.componentInfo
    );
  }

  /**
   * 空闲时该跟谁：本地玩家 **id 最小** 的存活英雄；没有英雄就退而取最小 id 的存活单位。
   *
   * 取「最小 id」而不是「遍历时碰到的第一个」—— Lua 的 `pairs()` 顺序不确定，
   * 取第一个会让「跟着谁」变得随机。
   */
  private resolveIdleTarget(): Actor | undefined {
    const local = MapPlayer.fromLocal();
    let bestHero: Actor | undefined;
    let bestOther: Actor | undefined;

    for (const key in Actor.allActors) {
      const actor = Actor.allActors[key];
      if (actor === undefined) continue;
      if (actor.owner !== local) continue;

      // ⚠️ 必须先挡掉失效 handle 再调 IsUnitType —— `allActors` 里装着**全地图**的单位
      // （伤害系统初始化时把所有单位都注册了进来），含已死/已移除的。`IsUnitType`
      // 对失效 handle 不是安全的，会去打悬垂指针。这道守卫照抄
      // `UnitBlood.categoryOf`（那里是上次访问违例排查后定下来的写法）。
      if (actor.handle === undefined || GetUnitTypeId(actor.handle) === 0) continue;

      if (IsUnitType(actor.handle, UNIT_TYPE_HERO)) {
        if (bestHero === undefined || actor.id < bestHero.id) bestHero = actor;
      } else if (bestOther === undefined || actor.id < bestOther.id) {
        bestOther = actor;
      }
    }

    return bestHero !== undefined ? bestHero : bestOther;
  }

  private rebuildSlots(): void {
    this.clearSlots();
    if (!this.gameUI || !this.watchTarget) return;
    if (this.watchTarget.owner !== MapPlayer.fromLocal()) return;

    const buffs = this.watchTarget.buffManager.getSortedBuffs();
    const n = math.min(buffs.length, this.getMaxSlots());

    const {
      slotsPerRow,
      iconSizePx,
      borderPadPx,
      spacingPx,
      rowSpacingPx,
      rowPaddingPx,
      centerOffsetXPx,
      centerOffsetYPx,
    } = this.layout;

    const slotOuter = iconSizePx + borderPadPx * 2;
    const cols = slotsPerRow;
    // 行数按**实际**行数算，不再用 maxRows —— 只有这样，「离状态栏最近的那一行」
    // 才永远贴着状态栏，而不是被预留的空行顶上去。maxRows 从此只通过
    // getMaxSlots() 起上限作用。
    const rows = math.max(1, math.ceil(n / cols));

    const gridWidthPx =
      cols * slotOuter + (cols - 1) * spacingPx + 2 * rowPaddingPx;
    const gridHeightPx =
      rows * slotOuter + (rows - 1) * rowSpacingPx + 2 * rowPaddingPx;
    const anchorLeft =
      (ScreenCoordinates.STANDARD_WIDTH - gridWidthPx) / 2 +
      centerOffsetXPx;

    // 网格**底边**贴在原生状态栏上边缘之上。WC3 的 y 向上为正、像素 y 向下为正，
    // 所以这里要把 gridBottomY 翻成「从屏幕顶部往下数」的像素值。
    const bottomPy =
      ((ScreenCoordinates.WC3_SCREEN_HEIGHT - this.layout.gridBottomY) /
        ScreenCoordinates.WC3_SCREEN_HEIGHT) *
        ScreenCoordinates.STANDARD_HEIGHT +
      centerOffsetYPx;
    const anchorTop = bottomPy - gridHeightPx;

    const padX =
      (borderPadPx / ScreenCoordinates.STANDARD_WIDTH) *
      ScreenCoordinates.WC3_SCREEN_WIDTH;
    const padY =
      (borderPadPx / ScreenCoordinates.STANDARD_HEIGHT) *
      ScreenCoordinates.WC3_SCREEN_HEIGHT;
    const wc3Icon = ScreenCoordinates.pixelSizeToWC3(iconSizePx, iconSizePx);
    const timeH = 14;
    const wc3Stack = ScreenCoordinates.pixelSizeToWC3(slotOuter / 2, timeH);

    for (let i = 0; i < n; i++) {
      const buff = buffs[i];
      const def = resolveBuffDisplay(buff);
      const row = math.floor(i / slotsPerRow);
      const col = i % slotsPerRow;

      const slotLeft =
        anchorLeft + rowPaddingPx + col * (slotOuter + spacingPx);
      // 第 0 行在最下（离状态栏最近），往上生长
      const slotTop =
        anchorTop +
        rowPaddingPx +
        (rows - 1 - row) * (slotOuter + rowSpacingPx);

      const wc3Outer = ScreenCoordinates.pixelSizeToWC3(slotOuter, slotOuter);
      const wc3Pos = ScreenCoordinates.pixelToWC3(
        slotLeft,
        slotTop,
        ScreenCoordinates.ORIGIN_TOP_LEFT
      );
      const rightX = wc3Pos.x + wc3Outer.width;
      const bottomY = wc3Pos.y - wc3Outer.height;

      const nameId = nextBuffSlotNameId++;

      // 两个角标的初始串**先算出来**：建 frame 时要用，存进槽位记录当「上次写的值」
      // 也要用。算两遍的话两份可能不一致，之后每帧的「变了才写」判断就会从第一步就错。
      const timeStr = slotColored(formatSlotTimeShort(buff), SLOT_TIME_COLOR);
      const stackStr = slotColored(stackBadgeText(buff), SLOT_STACK_COLOR);

      const border = Frame.createType(
        `BuffSlotBorder_${nameId}_${i}`,
        this.gameUI,
        0,
        "BACKDROP",
        ""
      )!;
      border
        .setAbsPoint(FRAME_ALIGN_LEFT_TOP, wc3Pos.x, wc3Pos.y)
        .setAbsPoint(FRAME_ALIGN_RIGHT_BOTTOM, rightX, bottomY)
        .setTexture(UIBackgrounds.BLACK_TRANSPARENT, 0, true)
        .setAlpha(200);
      DzFrameSetPriority(border.handle, 898);

      const catColor = buffCategoryColor(buff);
      const icon = Frame.createType(
        `BuffSlotIcon_${nameId}_${i}`,
        border,
        0,
        "BACKDROP",
        ""
      )!;
      icon
        .setPoint(FRAME_ALIGN_LEFT_TOP, border, FRAME_ALIGN_LEFT_TOP, padX, -padY)
        .setSize(wc3Icon.width, wc3Icon.height)
        .setTexture(def.icon, 0, true)
        .setAlpha(255)
        // 按分类给图标乘算上色（todo.md「统一UI色彩体系」）。
        //
        // 用 `DzGetColor(r,g,b,a)` 打包而不是自己写位运算：它是 kkapi 提供的原生
        // （`bzapi/call.txt:488`，`BlizzardAPI.j:71` 有声明），rgba 的位序由它负责，
        // 调用方不必也知道（本仓库没人验证过那个位序，猜错会得到完全不对的颜色）。
        //
        // 全仓库此前 `DzFrameSetVertexColor` 零调用 —— 这一处是第一个消费者。
        // 若进游戏后发现图标颜色**毫无变化**，那就是这个原生在 1.27a 上不生效，
        // 不是配色写错了；此时退回「只给正文上色」即可（正文那条路是已验证的）。
        .setVertexColor(DzGetColor(catColor.r, catColor.g, catColor.b, 255));

      // 剩余时间：铺满整个槽位 + 居中对齐 → 数字落在图标正中。
      // 这里**必须**用两个锚点把 frame 撑成槽位大小，不能再用「单点 + setSize」：
      // TEXT frame 会按文字自身宽度收缩（`UnitBlood.ts:185` 那段注释就是拿这一点当特性用的），
      // 宽度既然是跟着文字走的，「居中」就没有参照物了。
      const timeText = Frame.createType(
        `BuffSlotTime_${nameId}_${i}`,
        border,
        0,
        "TEXT",
        ""
      )!;
      timeText
        .setPoint(FRAME_ALIGN_LEFT_TOP, border, FRAME_ALIGN_LEFT_TOP, 0, 0)
        .setPoint(FRAME_ALIGN_RIGHT_BOTTOM, border, FRAME_ALIGN_RIGHT_BOTTOM, 0, 0)
        .setText(timeStr);
      timeText.setTextAlignment(TEXT_ALIGN_CENTER, 0);
      timeText.setFont(SLOT_TIME_FONT, 0.008, 0);

      // 层数角标：钉在图标右下角（todo.md「图标右下角实时显示当前层数」）。
      // 这个反过来用「单点锚 + setSize」：框从右下角往左上撑开，配合右下对齐，
      // 数字就永远贴着图标右下角，且是个位数变两位数时往左长、不会吃掉右边。
      const stackText = Frame.createType(
        `BuffSlotStack_${nameId}_${i}`,
        border,
        0,
        "TEXT",
        ""
      )!;
      stackText
        .setPoint(
          FRAME_ALIGN_RIGHT_BOTTOM,
          border,
          FRAME_ALIGN_RIGHT_BOTTOM,
          -padX,
          padY
        )
        .setSize(wc3Stack.width, wc3Stack.height)
        .setText(stackStr);
      stackText.setTextAlignment(TEXT_ALIGN_RIGHT_BOTTOM, 0);
      stackText.setFont(SLOT_TIME_FONT, 0.008, 0);

      const hit = Frame.createType(
        `BuffSlotHit_${nameId}_${i}`,
        border,
        0,
        "BUTTON",
        ""
      )!;
      hit.setAllPoints(border);
      DzFrameSetPriority(hit.handle, 899);

      // 槽位记录。**要在绑事件之前建好** —— 两个鼠标回调都要闭包引用它
      // （进入时把它记成「当前悬停」，离开时清掉）。
      const componentInfo: SlotComponentInfo = {
        x: slotLeft,
        y: slotTop,
        width: slotOuter,
        height: slotOuter,
      };
      const slot: SlotFrames = {
        border,
        icon,
        timeText,
        stackText,
        hit,
        buffId: buff.id,
        buff,
        componentInfo,
        lastTimeText: timeStr,
        lastStackText: stackStr,
        lastTooltipText: "",
      };

      FrameEventUtils.bindEvents(hit, {
        onMouseEnter: () => {
          this.hoveredSlot = slot;
          // 正文先在这里生成一次（Tips 默认有延迟，别让第一帧是空的），
          // 之后交给每帧的 `refreshHoveredTooltip` 往下滚。
          this.showSlotTooltip(slot, buildBuffTooltipText(buff));
        },
        onMouseLeave: () => {
          // 必须先清记录再 hide：hide 是带淡出动画的，只要记录还在，
          // 每帧的刷新就会把 Tips 又拽回完全可见 —— 悬停移开后会关不掉。
          this.hoveredSlot = undefined;
          Tips.getInstance().hide();
        },
      });

      this.slots.push(slot);
    }
  }
}
