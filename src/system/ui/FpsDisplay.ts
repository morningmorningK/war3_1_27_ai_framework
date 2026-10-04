/**
 * 帧率显示 —— 右上角「帧率显示」按钮控制的就是它。
 *
 * ## 为什么是自己数帧，而不是用 KKWE 的 `DzToggleFPS` / `DzGetFPS`
 *
 * 2026-10-04 在 1.27a + KKWE 上**实测**：这套原生 FPS 接口是坏的，两条都不通。
 *
 *   1. `DzToggleFPS(true)` 调了**不报错、也不画** —— 画面上根本没有 FPS 面板。
 *      （改动前 `main.ts` 里写死的就是这一句，一直如此，只是那时没有按钮、
 *      没人会去盯右上角，所以一直没暴露。）
 *   2. `DzGetFPS()` 返回的是**乱数**，不是帧率：
 *
 *        FPSDIAG|t0.6|DzGetFPS=2109
 *        FPSDIAG|t3.6|DzGetFPS=6442
 *        FPSDIAG|t6.6|DzGetFPS=6303   ← 不单调，不是计数器
 *        FPSDIAG|t7.9|DzGetFPS=6498
 *
 * 所以「读原生的值、自己画」那条退路也走不通 —— 读到的值本身就是垃圾。
 * 唯一还剩的办法就是**自己数帧**：`FrameLoop.onFrame` 每渲染一帧 +1，
 * 一个 1 秒的定时器读出计数、清零、写进自建的 TEXT frame。
 *
 * ## 位置：屏幕**正上方居中**
 *
 * 文字框左右对称地压在水平中线上，上边距 16px（与右上角按钮列的右边距同值）。
 *
 * 之所以不再挂在右上角按钮列下方：那个位置是为了躲开 `UnitBloodToggleUI` /
 * `DisplayToggleUI` 才定出来的（y=176），一旦那两处的行数变了就得跟着改。
 * 挪到正中顶部之后，**与那两组按钮再无坐标耦合**，改按钮排布不必回来看这里。
 *
 * 头顶正中在 1.27a 经典界面里**没有原生 frame**（资源条在右上、小地图 / 命令卡
 * 在下缘），所以不会和原生 UI 打架。若哪天发现被盖住，按 memory
 * `wc3-dz-frame-priority-required` 补一个 `DzFrameSetPriority` 档位。
 */

import { Frame, TEXT_ALIGN_CENTER, Timer } from "@eiriksgata/wc3ts/*";
import { createLogger } from "src/utils/logger";
import { onFrame } from "./FrameLoop";
import { ScreenCoordinates } from "./ScreenCoordinates";

const log = createLogger("FpsDisplay");

// ---------------------------------------------------------------------------
// 布局（像素，基准 1920x1080 —— 见 ScreenCoordinates 的约定）
// ---------------------------------------------------------------------------

const BOX_WIDTH_PX = 200;
const BOX_HEIGHT_PX = 24;

/** 水平正中：左右留白相等 */
const BOX_LEFT_PX = (1920 - BOX_WIDTH_PX) / 2;

/** 贴顶，但留一点边距免得贴着画面边缘不好看（同右上角按钮列的 MARGIN_RIGHT） */
const BOX_TOP_PX = 16;

/** 与血条开关、显示开关用的是同一支字体（能渲染中文，且已在游戏里验证过） */
const FONT_PATH = "resource\\Texture\\ui\\hpbar\\ZiTi.TTf";
const FONT_HEIGHT = 0.010;

/** 上色惯例：本仓库一律用 `|cffRRGGBB…|r` 前缀，**不用** `DzFrameSetTextColor` */
const COLOR = "FFFF00";

/** 采样窗口（秒）。取 1 秒最直观：数字就是「过去一秒渲染了多少帧」 */
const SAMPLE_INTERVAL = 1.0;

export class FpsDisplay {
  /**
   * 默认开 —— 与改动前 `main.ts` 里写死 `DzToggleFPS(true)` 的**意图**一致
   * （虽然那个调用实测没生效）。按钮初始显示「开」。
   */
  private static enabled = true;

  private static created = false;
  private static textFrame: Frame | undefined;
  private static sampleTimer: Timer | undefined;

  /** 本采样窗口内累计的渲染帧数。由 `onFrame` 回调自增 */
  private static frames = 0;

  public static isEnabled(): boolean {
    return FpsDisplay.enabled;
  }

  /**
   * 建文字、挂每帧计数、起采样定时器。由 `main.ts` 的 `initialize()` 调**一次**。
   *
   * 幂等：重复调用只生效一次。
   */
  public static init(): void {
    if (FpsDisplay.created) {
      log.warn("已初始化过，重复调用被忽略");
      return;
    }
    FpsDisplay.created = true;

    FpsDisplay.createTextFrame();
    FpsDisplay.subscribeFrameCounter();
    FpsDisplay.startSampler();
    FpsDisplay.applyVisibility();

    log.info("帧率显示初始化完成（自绘，不依赖 DzToggleFPS）");
  }

  public static setEnabled(value: boolean): void {
    FpsDisplay.enabled = value;
    FpsDisplay.applyVisibility();
  }

  // ------------------------------------------------------------------
  // 内部
  // ------------------------------------------------------------------

  /**
   * 建那个显示帧率的 TEXT frame。
   *
   * **两个锚点在创建时一次定死**，之后只 `setText`。
   * 不做事后重新锚定 —— `ClearAllPoints` + `setAbsPoint` 会把 frame 在同级里
   * 重排到最上层，是很久以前踩过的坑。
   *
   * 用「左上 + 右下」两个绝对点撑成一个定宽盒子，而不是单点锚：TEXT frame 会按
   * 文字自身宽度收缩（`BuffBarUI.ts:713` 那段注释就是拿这一点当特性用的），
   * 单点锚的话数字位数一变就会左右跳。
   */
  private static createTextFrame(): void {
    const parent = Frame.fromHandle(DzGetGameUI());
    if (parent === undefined) {
      log.error("拿不到 gameUI，帧率文字建不出来");
      return;
    }

    const topLeft = ScreenCoordinates.pixelToWC3(
      BOX_LEFT_PX,
      BOX_TOP_PX,
      ScreenCoordinates.ORIGIN_TOP_LEFT
    );
    const bottomRight = ScreenCoordinates.pixelToWC3(
      BOX_LEFT_PX + BOX_WIDTH_PX,
      BOX_TOP_PX + BOX_HEIGHT_PX,
      ScreenCoordinates.ORIGIN_TOP_LEFT
    );

    const frame = Frame.createType("FpsDisplayText", parent, 0, "TEXT", "");
    if (frame === undefined) {
      log.error("Frame.createType 返回空，帧率文字建不出来");
      return;
    }

    frame.setAbsPoint(0, topLeft.x, topLeft.y); // FRAMEPOINT_TOPLEFT
    frame.setAbsPoint(8, bottomRight.x, bottomRight.y); // FRAMEPOINT_BOTTOMRIGHT
    frame.setTextAlignment(TEXT_ALIGN_CENTER, 0);
    frame.setFont(FONT_PATH, FONT_HEIGHT, 0);
    frame.setText(`|cff${COLOR}-- FPS|r`);

    FpsDisplay.textFrame = frame;
  }

  /**
   * 挂每帧计数。
   *
   * `FrameLoop.onFrame` **无法注销**（底层是 `DzFrameSetUpdateCallbackByCode`，
   * Set 不是 Add），所以关掉开关后这个回调**仍然会每帧跑** —— 但它只做一次
   * 整数自增，开销可以忽略，换来的是不必和那个注销不掉的 native 较劲。
   *
   * 回调里**只改属性、绝不增删 frame 句柄**，这是 `FrameLoop` 文件头定死的纪律。
   */
  private static subscribeFrameCounter(): void {
    onFrame(() => {
      FpsDisplay.frames++;
    });
  }

  private static startSampler(): void {
    const timer = Timer.create();
    timer.start(SAMPLE_INTERVAL, true, () => FpsDisplay.sample());
    FpsDisplay.sampleTimer = timer;
  }

  /** 每秒结算一次：本窗口的帧数就是 FPS，然后清零重新计数 */
  private static sample(): void {
    const fps = FpsDisplay.frames;
    FpsDisplay.frames = 0;

    // 关着的时候不写文字 —— 省掉每秒一次无谓的 setText
    if (!FpsDisplay.enabled) {
      return;
    }

    const frame = FpsDisplay.textFrame;
    if (frame === undefined) {
      return;
    }

    try {
      frame.setText(`|cff${COLOR}${fps} FPS|r`);
    } catch (e) {
      log.error(`写入帧率文字失败：${e}`);
    }
  }

  private static applyVisibility(): void {
    const frame = FpsDisplay.textFrame;
    if (frame === undefined) {
      return;
    }
    try {
      frame.setVisible(FpsDisplay.enabled);
    } catch (e) {
      log.error(`切换帧率文字可见性失败：${e}`);
    }
  }
}
