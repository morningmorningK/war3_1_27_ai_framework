/**
 * 控制台英雄头像 —— 把**原生英雄栏的第 0 格**搬到控制台的头像位。
 *
 * ## 为什么要「搬」而不是「画」
 *
 * 用户要的是「本地玩家第一个英雄的头像」。看似最简单的做法是自己建一个
 * BACKDROP frame、贴上英雄的图标 —— 但**运行时没有任何 API 能按单位类型拿图标**：
 * `Units\*unitfunc.txt` 里的 `Art=` 只在构建期存在于 SLK 数据里，`Dz*` / 原生 API
 * 一个 getter 都没有（3D 模型路径同理，见 `KKWEHeroBloodBar.getHeroArtPath` 那个
 * 只能写死圣骑士的 stub）。自绘就必须自备一张「单位类型 → 图标」的对照表。
 *
 * 而原生英雄栏按钮（`DzFrameGetHeroBarButton(i)`，`japi.d.ts:365-370`）**引擎自己
 * 就在填图标**，并且会自动跟着「第 i 个英雄」变 —— 换英雄、英雄死亡重生都不需要
 * 我们做任何事。所以这里只是把它的位置和大小改掉，内容一行都不用碰。
 *
 * ## 与已移植 UI 的关系
 *
 * 源实现（`war3map.lua:661-671` 的 `mt:onPortrait`）只是把**当前选中单位**的
 * 三维大头像（`DzFrameGetPortrait()`）摆到头像位并设可见 —— 没选中东西时那一格
 * 就是空的，这就是"界面没有英雄头像"的原因。`NativeUISystem.applyPortrait()`
 * 忠实照抄了它，**本文件不去改那一段**：接管与回退都由这里负责。
 *
 * ⚠️ 硬约束（与 `NativeUISystem` 一致）：**不创建、不销毁、不重挂父节点的原生
 * frame**。这里只对原生 frame 做「设位置 / 设缩放 / 设优先级 / 显隐」。
 */

import { Timer } from "@eiriksgata/wc3ts/*";
import { createLogger } from "src/utils/logger";
import { PORTRAIT_RECT } from "../gameui/layoutV3";
import {
  FRAMEPOINT_TOPLEFT,
  clearAndSetRect,
  isValidFrame,
  portraitFrame,
  setAlpha,
  setScale,
  setVisible,
} from "../gameui/NativeFrames";

const log = createLogger("HeroPortraitUI");

// ---------------------------------------------------------------------------
// 可调旋钮
//
// 进游戏调参时**一次只改一个** —— 位置和大小是 rect 与 scale 两个因子共同决定的
// （命令卡就是 `rect + 0.8205` 一起用才成立），同时改两个就分不清是谁在起作用。
// ---------------------------------------------------------------------------

/** 借用原生英雄栏的第几格（0 = 第一个英雄） */
const HERO_INDEX = 0;

/** 头像位矩形，直接复用源实现的 `PORTRAIT_RECT`（`layoutV3.ts:135`） */
const PORTRAIT = PORTRAIT_RECT;

/**
 * 缩放。**先留 1.0**：`rect` 已经是目标尺寸，scale 再乘上去很可能会溢出一大圈；
 * 等比放大时优先只调这一个，别同时动 `PORTRAIT`。
 */
const PORTRAIT_SCALE = 1.0;

/**
 * 轮询周期（秒）。
 *
 * **轮询不能省**：`main.ts:154` 的 `main()` 只是排了一个 0.01 秒的定时器去造那批
 * 圣骑士（`UnitEventExample.ts`），而定时器要等 `initialize()` 整个跑完才触发 ——
 * 也就是说 `create()` 被调用的那一刻，英雄栏第 0 格还是空的，一次性 apply 必然落空。
 */
const REFRESH_PERIOD = 1.0;

/**
 * 第 0 个英雄自带的迷你血条 / 蓝条要不要一起藏掉。
 *
 * **先不藏**：它们跟不跟着按钮走还没实测过。若跟随，留着反而好看；若不跟随，
 * 打开这个开关即可（`DzFrameGetHeroHPBar` / `DzFrameGetHeroManaBar`）。
 */
const HIDE_HERO_MINI_BARS = false;

/**
 * 把英雄按钮顶到自建底板上方。
 *
 * ⚠️ 风险点：自建主底板 `UI_BACKDROP_RECT = [0.1324, 0.09918, 0.66738, 0.0]`
 * （`layoutV3.ts:148`）**完整覆盖**头像位，而「把原生英雄按钮叠到自建底板上」
 * 这条路源实现从没走过。头像若完全看不见，第一嫌疑就是层级。
 * 898 沿用 `BuffBarUI` 里自建槽位的值。
 */
const PORTRAIT_PRIORITY = 898;

/** 位置比较容差 */
const EPS = 1e-4;

/**
 * 连续几次取不到句柄才报一次警。
 *
 * 开了就报会在开局第一秒误报 —— 那时英雄还没造出来，取不到是**正常**的。
 */
const MISS_GRACE_TICKS = 5;

/**
 * 控制台英雄头像。单例，`create()` 幂等。
 */
export class HeroPortraitUI {
  private static instance: HeroPortraitUI | undefined;

  private timer: Timer | null = null;
  private created = false;

  /** 上一次接管时的句柄，用于「只在变化时才写」 */
  private lastHandle = 0;
  /** 是否已经成功接管（决定要回退时该不该把原生大头像放回来） */
  private takenOver = false;
  /** 连续取不到句柄的次数 */
  private missCount = 0;
  /** 「已接管」的 info 只打一次 */
  private announced = false;
  /** 异常日志只打一次，避免每秒刷屏 */
  private errorLogged = false;
  /** 迷你血蓝条的失败日志只打一次 */
  private miniBarWarned = false;
  /** 位置读取（KKAPI 的扩展）不可用 —— 退化成每次都重设位置 */
  private pointReadersBroken = false;
  /** 设优先级失败（只影响层级，不影响位置） */
  private priorityFailed = false;

  private constructor() {}

  public static getInstance(): HeroPortraitUI {
    if (!HeroPortraitUI.instance) {
      HeroPortraitUI.instance = new HeroPortraitUI();
    }
    return HeroPortraitUI.instance;
  }

  public create(): void {
    if (this.created) return;
    this.created = true;

    this.timer = Timer.create();
    // 先起定时器再 apply：万一首次 apply 就抛，下一拍还能自己恢复。
    this.timer.start(REFRESH_PERIOD, true, () => {
      this.apply();
    });

    this.apply();
  }

  public destroy(): void {
    if (this.timer) {
      this.timer.destroy();
      this.timer = null;
    }
    // 只把原生大头像放回来，**不销毁任何原生 frame**
    this.releaseNativePortrait();

    this.created = false;
    this.lastHandle = 0;
    this.missCount = 0;
    this.announced = false;
    this.errorLogged = false;
    this.miniBarWarned = false;
    this.pointReadersBroken = false;
    this.priorityFailed = false;
    HeroPortraitUI.instance = undefined;
  }

  // -------------------------------------------------------------------------
  // 主循环
  // -------------------------------------------------------------------------

  /**
   * 整个 apply 兜一层 try/catch。
   *
   * 一是 `Dz*` 在本机 KKWE 上不一定存在 —— 调用不存在的原生函数会抛
   * `Call jass function crash.<unknown>`（`consoleParent` 那儿的实录）。
   * 二是不能让异常穿到定时器回调外面去。日志因此**只打一次**。
   */
  private apply(): void {
    try {
      this.applyInner();
    } catch (e) {
      if (!this.errorLogged) {
        this.errorLogged = true;
        log.error(`apply() 抛出异常，已隔离（之后每秒仍会重试）：${e}`);
      }
    }
  }

  private applyInner(): void {
    const btn = DzFrameGetHeroBarButton(HERO_INDEX);

    if (!isValidFrame(btn)) {
      // 英雄还没造出来（开局常见），或者这个 getter 在本机根本不可用
      this.missCount++;
      if (this.missCount === MISS_GRACE_TICKS) {
        log.warn(
          `连续 ${MISS_GRACE_TICKS} 次取不到英雄栏第 ${HERO_INDEX} 格` +
            `（DzFrameGetHeroBarButton 返回 0/空）。头像位退回原生大头像；` +
            `若一直是这个状态，说明该 getter 在 1.27a 上不可用`
        );
      }
      this.releaseNativePortrait();
      return;
    }

    this.missCount = 0;

    if (this.needsReapply(btn)) {
      clearAndSetRect(btn, PORTRAIT[0], PORTRAIT[1], PORTRAIT[2], PORTRAIT[3]);
      setScale(btn, PORTRAIT_SCALE);
      this.trySetPriority(btn);

      // 原生那一格自带可见性/透明度状态，**经典 UI 下它可能是隐藏的** ——
      // 那样把它搬到哪都看不见（这也是"取到句柄 ≠ 能看见"的又一例）。
      // 接管时顺手确认一次即可：不需要每拍都设，因为位置没变我们就不会再进来，
      // 所以即使引擎之后自己把它淡掉/藏掉，我们也不会跟它对着干。
      setVisible(btn, true);
      setAlpha(btn, 255);

      this.lastHandle = btn;

      if (!this.announced) {
        this.announced = true;
        log.info(`已接管英雄栏第 ${HERO_INDEX} 格作为控制台头像`);
      }
    }

    this.tryHideMiniBars();

    // **接管成功之后**才藏原生大头像：先藏后失败会留一个空白格，
    // 而先接管后藏的话，任何一步失败都还能从 releaseNativePortrait 里退回来。
    if (!this.takenOver) {
      setVisible(portraitFrame(), false);
      this.takenOver = true;
    }
  }

  // -------------------------------------------------------------------------
  // 变化检测：稳态下每秒只有几个 getter 调用，不写 frame
  // -------------------------------------------------------------------------

  /**
   * 该不该重设位置。
   *
   * ⚠️ 这里的三个读取函数（`DzFrameGetPointValid/PointX/PointY`）在 `KKAPI.j`
   * 那段**扩展**里，和核心的 `DzFrameGetHeroBarButton`（`BlizzardAPI.j`）
   * **不是同一批** —— 万一本机构建没注册它们，调用会抛 `crash.<unknown>`。
   * 所以单独兜住：读不了就退化成「每次都重设」。位置设置本身是幂等的，
   * 视觉上完全一样，只是每秒白做一次 —— **绝不能让它把整个搬迁也带崩**。
   */
  private needsReapply(btn: number): boolean {
    if (btn !== this.lastHandle) return true;
    if (this.pointReadersBroken) return true;

    try {
      if (!DzFrameGetPointValid(btn, FRAMEPOINT_TOPLEFT)) return true;

      // ⚠️ 这里假设 `DzFrameGetPointX/Y` 与 `DzFrameSetAbsolutePoint` 是同一套坐标。
      // 若实际不是（比如 getter 返回像素），比较永远为真 → 每秒重设一次位置 ——
      // 同样只是白做功，不会画错。所以这条假设即使不成立也无害。
      const x = DzFrameGetPointX(btn, FRAMEPOINT_TOPLEFT);
      const y = DzFrameGetPointY(btn, FRAMEPOINT_TOPLEFT);
      return Math.abs(x - PORTRAIT[0]) > EPS || Math.abs(y - PORTRAIT[1]) > EPS;
    } catch (e) {
      this.pointReadersBroken = true;
      log.warn(`位置读取不可用，退化为每秒重设一次位置（效果不受影响）：${e}`);
      return true;
    }
  }

  /**
   * 把按钮顶到自建底板上方。
   *
   * 单独包一层是为了让失败模式可诊断：位置和缩放都生效、头像却看不见时，
   * 日志能直接区分「没搬过去」和「搬过去了但被 UI.blp 底板挡住」。
   */
  private trySetPriority(btn: number): void {
    if (this.priorityFailed) return;
    try {
      DzFrameSetPriority(btn, PORTRAIT_PRIORITY);
    } catch (e) {
      this.priorityFailed = true;
      log.warn(`DzFrameSetPriority 调用失败，头像可能被自建底板挡住：${e}`);
    }
  }

  // -------------------------------------------------------------------------
  // 原生大头像 / 迷你条
  // -------------------------------------------------------------------------

  /** 把原生大头像放回可见（回到「没有英雄头像但界面正常」的已知良态） */
  private releaseNativePortrait(): void {
    if (!this.takenOver) return;
    setVisible(portraitFrame(), true);
    this.takenOver = false;
    // 下次接到时重新摆一次位置（顺带把句柄变化的情况也覆盖掉）
    this.lastHandle = 0;
  }

  private tryHideMiniBars(): void {
    if (!HIDE_HERO_MINI_BARS) return;
    try {
      setVisible(DzFrameGetHeroHPBar(HERO_INDEX), false);
      setVisible(DzFrameGetHeroManaBar(HERO_INDEX), false);
    } catch (e) {
      if (!this.miniBarWarned) {
        this.miniBarWarned = true;
        log.warn(`藏英雄迷你血/蓝条失败（不影响头像本身）：${e}`);
      }
    }
  }
}
