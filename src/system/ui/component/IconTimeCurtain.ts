/**
 * 图标上的「时间暗幕」：一条深色遮盖从图标顶部往下压，压满即到期。
 *
 * 就是技能冷却/buff 持续期间画在图标上的那个时钟。**刻意不依赖 Buff** ——
 * 对外只有「一个 frame」和「0~1 的进度」两件事，所以任何限时的图标
 * （buff 图标、以后的技能图标、装备冷却……）都能原样复用同一个组件。
 *
 * ## 为什么要「拿图标自己的贴图乘算成黑」，而不是贴一张纯黑图
 *
 * `DzFrameSetVertexColor` 是**乘法**混合 —— 顶点色是 `(0,0,0)` 时，
 * `贴图 × 黑 = 黑`，无论贴图长什么样。所以遮盖帧干脆就用**目标图标自己的那张贴图**，
 * 乘成纯黑之后得到的是一块**有图标轮廓的黑影**。
 *
 * 这么做换来三件事：
 *
 * 1. **零新资源风险**。贴图路径与图标完全相同，图标能显示就一定能显示。
 *    本仓库吃过「引入没验证过的资源」的亏（`Textures\Black32.blp` 至今只躺在
 *    `KKWEHeroBloodBar.ts:132` 的注释里，没人证实过它在 1.27a 能用），这里不再引入。
 * 2. **贴着轮廓走**。图标带透明边时，暗幕跟着轮廓收边，比压一块方块好看。
 * 3. 只用**已经验证过生效**的原生（`DzFrameSetVertexColor` + `DzGetColor`），
 *    没有未知 API。
 *
 * 不透明度走 `setAlpha()`，与 `DzGetColor` 的第四个分量无关 —— 仓库现有代码就是这么分的
 * （`BuffBarUI.ts` 的 `.setAlpha(255).setVertexColor(DzGetColor(r,g,b,255))`）。
 *
 * ## 用法
 *
 * ```ts
 * const curtain = IconTimeCurtain.create("SomeCurtain", parentFrame, geo, iconPath, 170);
 * curtain.setProgress(elapsed / duration);   // 每帧调都行，内部去重
 * // ...
 * curtain.destroy();
 * ```
 */

import { Frame, FRAME_ALIGN_LEFT_TOP } from "@eiriksgata/wc3ts/*";

export interface CurtainGeometry {
  /** 满进度时的宽度（WC3 坐标，非像素） */
  width: number;
  /** 满进度时的高度（WC3 坐标）。高度随进度从 0 长到这个值 */
  height: number;
  /** 相对 parent 左上角的横向偏移（WC3 坐标） */
  offsetX: number;
  /** 相对 parent 左上角的纵向偏移（WC3 坐标，向上为正） */
  offsetY: number;
  /**
   * **绝对定位模式**。
   *
   * `true` 时上面四个数的含义整体改写：`offsetX` / `offsetY` 不再是「相对 parent
   * 左上角的偏移」，而是**屏幕左上角的 x** 和**矩形顶边的 y**；`width` / `height`
   * 是绝对尺寸，与 parent 无关（`offsetY` 依旧向上为正，所以底边是 `offsetY - height`）。
   *
   * ## 什么时候必须用它
   *
   * **parent 是原生 frame 的时候。** 本仓库挂 `consoleParent()` / `gameUI()` 的 frame
   * 一律走绝对坐标（`NativeUISystem.buildFrames` 的 `clearAndSetRect(...)`、
   * `BuffBarUI.rebuildSlots` 的、`Button` 的 `setAbsPoint(FRAME_ALIGN_LEFT_TOP, ...)`），
   * **没有任何一处用父节点相对偏移**。
   *
   * 理由：相对偏移要落在 parent 的**局部坐标系**里，而原生 frame 的局部坐标系
   * 不是我们能假设的东西 —— `DzFrameGetLowerLevelFrame()` 的左上角到底在屏幕的
   * (0, 0.6) 还是别处，没有任何依据。绝对坐标则不管 parent 是谁都成立。
   *
   * 2026-10-04：技能冷却暗幕第一版就是栽在这里 —— 拿屏幕归一化坐标当相对偏移用，
   * 而屏幕 y 是从**下**往上量的、父节点左上角又在屏幕**上**边，符号一翻就跑到屏幕外了。
   *
   * 默认为 `false`（相对定位）—— Buff 栏那条路一直是这么用的，不动它。
   */
  absolute?: boolean;
}

export class IconTimeCurtain {
  private frame: Frame | undefined;
  private width: number;
  private height: number;
  /** 绝对模式下的矩形左上角。相对模式下不用 */
  private x: number;
  private y: number;
  private absolute: boolean;
  /** 上次真正写进 frame 的进度；`-1` 是「还没写过」的哨兵值（合法进度不可能为负） */
  private lastProgress: number = -1;
  /** 当前是否显示。避免每帧都调一次 `DzFrameShow` */
  private visible: boolean = false;

  private constructor(frame: Frame | undefined, geometry: CurtainGeometry) {
    this.frame = frame;
    this.width = geometry.width;
    this.height = geometry.height;
    this.x = geometry.offsetX;
    this.y = geometry.offsetY;
    this.absolute = geometry.absolute === true;
  }

  /**
   * 建一个暗幕，挂在 `parent` 的左上角。
   *
   * @param name      frame 名。**必须全局唯一** —— 重名 frame 会让引擎出问题，
   *                  调用方负责拼上自己的唯一后缀（BuffBarUI 用的是槽位自增号）。
   * @param parent    挂靠的父 frame
   * @param geometry  几何。偏移一般直接抄目标图标自己的（这样两者严丝合缝）
   * @param texture   **目标图标自己的贴图**
   * @param alpha     不透明度 0~255
   */
  public static create(
    name: string,
    parent: Frame,
    geometry: CurtainGeometry,
    texture: string,
    alpha: number
  ): IconTimeCurtain {
    const frame = Frame.createType(name, parent, 0, "BACKDROP", "");
    const curtain = new IconTimeCurtain(frame, geometry);
    if (frame === undefined) {
      // createType 失败（引擎建不出这个 frame）。返回一个**哑对象**而不是 undefined：
      // 调用方每帧都会摸它，让这里保持「永远可调用、失败就什么都不做」比让每个
      // 调用点都判空更不容易漏。
      return curtain;
    }

    frame
      .setTexture(texture, 0, true)
      // 乘成纯黑：结果是「图标轮廓的黑影」，理由见文件头
      .setVertexColor(DzGetColor(0, 0, 0, 255))
      .setAlpha(alpha);

    // 定位。**只在建的时候分岔这一次** —— 之后两种模式的进度更新完全共用
    // （都是 `setSize`，见 `setProgress`）。
    //
    // 两种模式都锚**顶边**：高度往上长不了，只能往下长 —— 这就是「从上往下压」的来源。
    if (curtain.absolute) {
      // ⚠️ **只设一个绝对锚（左上角），之后靠 setSize 改高度。**
      //
      // 2026-10-04 的第一版是「每次都 `ClearAllPoints` + 两个绝对点」，被换掉有两个
      // 理由，第二个才是决定性的：
      //
      //   1. 每次进度变化就是 3 发原生调用，而进度几乎每帧都在变。
      //   2. **它会把暗幕顶到同父节点的最上层。** 实测现象：命令卡上数字明明建在
      //      暗幕之后（创建顺序在后 = 画在上面），跑起来却被暗幕盖住 —— 因为暗幕
      //      每跨一档就重新清点设点一次，位置关系被重排了。改成「锚一次 + setSize」
      //      之后，进度更新不再碰锚点，同父节点的层序就老老实实由创建顺序决定。
      //
      // `clearAllPoints` 仍然留在**建的时候**这一次（只此一次，不在进度路径上）：
      // 防的是模板/引擎给的默认锚点占着一个点，那样再设左上角就成了两点定框。
      DzFrameClearAllPoints(frame.handle);
      frame
        // 绝对模式下 `x` / `y` 就是屏幕坐标（见 `CurtainGeometry.absolute`），
        // 构造时已经从 offsetX / offsetY 取过来，不会随进度变。
        .setAbsPoint(FRAME_ALIGN_LEFT_TOP, curtain.x, curtain.y)
        .setSize(curtain.width, curtain.height);
    } else {
      // 锚点建这一次就够，之后只改 setSize，不再重复 setPoint。
      frame
        .setPoint(
          FRAME_ALIGN_LEFT_TOP,
          parent,
          FRAME_ALIGN_LEFT_TOP,
          geometry.offsetX,
          geometry.offsetY
        )
        .setSize(geometry.width, geometry.height);
    }

    // 初始隐藏：进度 0 时本来就不该有暗幕，等第一次 setProgress 再决定显不显
    frame.setVisible(false);

    return curtain;
  }

  /**
   * 设置进度。**每帧调都行** —— 值没变就直接返回，不碰 frame。
   *
   * @param progress 0 = 完全露出（刚上），1 = 完全盖住（到期）。超出范围会被夹住。
   *
   * 去重的理由与 `BuffBarUI.refreshSlotTexts` 那条注释一致：反复设同样的尺寸
   * 会让引擎白重排一遍，挂在每帧回调上就是纯开销。
   */
  public setProgress(progress: number): void {
    const frame = this.frame;
    if (frame === undefined) return;

    const p = progress > 1 ? 1 : progress < 0 ? 0 : progress;
    if (p === this.lastProgress) return;
    this.lastProgress = p;

    // 进度为 0 时**隐藏**而不是设成零高度：留着零高度 frame 没意义，
    // 也躲开可能存在的除零/退化尺寸问题。
    if (p <= 0) {
      if (this.visible) {
        this.visible = false;
        frame.setVisible(false);
      }
      return;
    }

    if (!this.visible) {
      this.visible = true;
      frame.setVisible(true);
    }
    // 两种模式到这里完全一样：锚点在 `create` 里设过一次，进度只改高度。
    // ⚠️ **不要在这里动锚点**（`clearAllPoints` / `setAbsPoint`）—— 见 `create`
    // 里那段注释：动锚点会把暗幕重排到同父节点的最上层，盖住后建的兄弟 frame。
    frame.setSize(this.width, this.height * p);
  }

  /**
   * 设置**跨父节点的层序**（`DzFrameSetPriority`）。
   *
   * 只在「暗幕的父节点和目标图标不在同一棵子树里」时才需要 —— 命令卡就是这种情况：
   * 暗幕挂在 `DzFrameGetLowerLevelFrame()` 下，而命令卡按钮在 `ConsoleUI` 子树下。
   * 两棵树之间的层序不是创建顺序能决定的，得显式给优先级，否则暗幕会被按钮整个盖住
   * （frame 建出来了、尺寸也对，就是看不见）。
   *
   * Buff 栏那种「暗幕和图标是同一个 `border` 的子节点」的情形不需要调这个 ——
   * 同父节点的层序由创建顺序决定，`IconTimeCurtain` 本来就建在图标之后。
   *
   * @param priority 越大越靠上。本仓库的取号惯例：Buff 栏 898/899、
   *                 RelicBar 900/901、Tips 1000。
   */
  public setPriority(priority: number): void {
    const frame = this.frame;
    if (frame === undefined) return;
    DzFrameSetPriority(frame.handle, priority);
  }

  /**
   * 引擎认为这个 frame 现在显示着没有（`DzFrameIsVisible`）。
   *
   * **不是给业务判断用的** —— 组件自己的 `visible` 字段才是权威。这个存在的唯一
   * 理由是排查「明明调了 `setProgress(>0)` 却画面上什么都没有」：那种情况下
   * 「引擎说它显示着」和「引擎说它没显示」指向完全不同的两个方向
   * （前者是层序/贴图问题，后者是显示调用根本没生效）。
   */
  public isShown(): boolean {
    const frame = this.frame;
    if (frame === undefined) return false;
    return DzFrameIsVisible(frame.handle);
  }

  public destroy(): void {
    const frame = this.frame;
    if (frame === undefined) return;
    this.frame = undefined;
    frame.destroy();
  }
}
