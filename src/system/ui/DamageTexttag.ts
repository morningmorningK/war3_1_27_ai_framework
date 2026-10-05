import {
  Frame,
  FRAME_ALIGN_BOTTOM,
  FRAMEPOINT_BOTTOMRIGHT,
  FRAMEPOINT_TOPLEFT,
  TEXT_ALIGN_CENTER,
  Timer,
} from "@eiriksgata/wc3ts/*";
import { worldToScreen } from "src/utils/helper";
// ⚠️ **直连文件，不走 `src/system/combat` 那个 barrel** —— barrel 会把 `DamagePipeline`
// 拉进来（→ RelicSystem → 遗物定义 → 再回到 combat），而本文件是被
// `DamageNumberDisplay` 引的 UI 层。只取 `colorize` 这一个纯字符串函数，路径写死到文件。
import { colorize } from "src/system/combat/damageConstants";
import { ScreenCoordinates } from "./ScreenCoordinates";
import { createLogger } from "src/utils/logger";

const poolLog = createLogger("DamageTextPool");
const managerLog = createLogger("DamageTextManager");

/**
 * 飘字字体。与血条、属性面板、帧率显示用的是同一支（能渲染中文，已在游戏里验证过）。
 */
const FONT_PATH = "resource\\Texture\\ui\\hpbar\\ZiTi.TTf";

/**
 * 暴击的字号倍数。**「稍微」变大，不是翻倍** —— 1.25 在 32px 上只多了 8px，
 * 一眼能看出区别又不会把飘字撑到跟别的数字打架。
 */
const CRIT_FONT_BOOST = 1.5;

/**
 * 旧四色 → 6 位**大写**十六进制色码。
 *
 * 那四个名字（`red`/`yellow`/`gray`/`blue`）**原来指的是贴图目录**
 * （`Texture\ui\dmg\{red,blue,yellow,gray}\0..9.tga`）。换成字体渲染之后贴图整个不用了，
 * 名字只剩下「该用哪个颜色」这一层含义，所以必须给它配一套色码 ——
 * 不配的话这四个值就变成了四个死枚举。
 *
 * 用 if 链而不是 `Record<string, string>`：tstl 会把对象字面量编成 Lua table，
 * 按字符串键查表本身没问题，但这里只有四个分支，if 链既没有额外的表、也不用去想映射语义。
 */
export function colorHexOf(color: "red" | "yellow" | "gray" | "blue"): string {
  if (color === "red") return "FF5555";    // 自己打出去的
  if (color === "yellow") return "FFDD55"; // 自己挨的
  if (color === "blue") return "66CCFF";
  return "CCCCCC";                          // gray，默认
}

/**
 * 漂浮方向
 */
export enum FloatDirection {
  UP = "UP",       // 向上
  DOWN = "DOWN",   // 向下
  LEFT = "LEFT",   // 向左
  RIGHT = "RIGHT", // 向右
  NONE = "NONE"    // 不移动
}

/**
 * 伤害文字配置
 */
export interface DamageTextConfig {
  /** 显示的数字 */
  damage: number;
  /** 世界坐标 X（地图平面 X） */
  worldX: number;
  /** 世界坐标 Y（地图平面 Y） */
  worldY: number;
  /** 高度偏移（垂直方向） */
  height?: number;
  /**
   * 颜色。**这四个名字是历史遗留** —— 原来各自对应一个 tga 数字贴图目录，
   * 现在由 `colorHexOf()` 翻成色码。语义不变：`red` = 自己打出去的、
   * `yellow` = 自己挨的。
   */
  color?: 'red' | 'yellow' | 'gray' | 'blue';
  /** 漂浮方向 */
  direction?: FloatDirection;
  /** 移动速度（像素/秒） */
  speed?: number;
  /** 持续时间（秒） */
  duration?: number;
  /** 数字缩放比例 */
  scale?: number;
  /** 淡出效果 */
  fadeOut?: boolean;
  /**
   * 暴击。**只影响字号** —— 变大 `CRIT_FONT_BOOST` 倍。
   *
   * 「数字后面加 `!`」**不在这里做**，由调用方拼进 `richText`/`damage` 的串里：
   * 感叹号得跟它前面那个数字**同一个颜色**，而颜色归调用方（`richText` 是它拼的），
   * 渲染器再去补就得先解析色码、或者凭空挑一个颜色。字号则相反 —— 那是纯粹的
   * 版式参数，调用方传一个布尔就够。
   */
  crit?: boolean;
  /**
   * 已经上过色的富文本串。**给了就用它，`damage` + `color` 那套只当兜底。**
   *
   * 调用方（`DamageNumberDisplay`）把一次伤害的各段拼成
   * `|cffFF555545|r |cffFF663315|r` 这种多色串传进来 —— 一条伤害只有**一个**
   * TEXT frame，元素配色只能靠串内换色来表达。
   *
   * ⚠️ 传进来的串**必须自带 `|cff…|r`**：这里不会再套一层颜色。
   */
  richText?: string;
}

/**
 * 单个伤害文字实例
 */
class DamageText {
  private containerFrame: Frame | null = null;
  /**
   * 唯一的文字 frame。**取代了原来的 8 个数字 BACKDROP**
   * （`Texture\ui\dmg\{color}\0..9.tga`）—— 每实例 frame 数 9 → 2。
   *
   * 允许 `null`（`Frame.createType` 可能返回空）并在每个用点提前 return，
   * 而不是像容器那样用 `!`：建不出来时这里静默跳过，整条池子还活着；
   * 用 `!` 的话就是一次空指针抛异常，把 `DamageNumberDisplay` 的 try/catch 打出来，
   * 之后每一条伤害都重复抛一遍。
   */
  private labelFrame: Frame | null = null;
  private isActive: boolean = false;

  // 配置
  private damage: number = 0;
  private worldX: number = 0;
  private worldY: number = 0;
  private height: number = 0;
  private direction: FloatDirection = FloatDirection.UP;
  private speed: number = 100; // 像素/秒
  private duration: number = 1.5; // 秒
  private scale: number = 0.8;
  private fadeOut: boolean = true;
  /** 见 `DamageTextConfig.richText`。`undefined` = 走「数字 + 单色」那条路 */
  private richText: string | undefined = undefined;
  /** 见 `DamageTextConfig.crit`。只参与字号计算 */
  private crit: boolean = false;

  // 运行时状态
  private elapsedTime: number = 0;
  private offsetX: number = 0;
  private offsetY: number = 0;
  private currentAlpha: number = 255;
  private color: 'red' | 'yellow' | 'gray' | 'blue' = 'gray';
  
  /**
   * 文字盒子尺寸（像素，@ scale = 1）。
   *
   * ⚠️ **盒子必须有尺寸** —— 文字 frame 用「左上 + 右下」两个点填满这个盒子
   * （下面构造里 `setPoint`），容器没尺寸的话那两个相对锚点就是无效的。
   * 这与原来「容器尺寸 = 8 个数字宽度」是同一个道理，只是宽度不再随位数变了：
   * 文字居中在固定盒子里，**位数变化不会让飘字左右跳**。
   *
   * 宽度**按多段富文本串来定，不是按单个数字**：`"45 15"` 这种串比一次普攻长得多。
   * 盒子是居中且透明的，宽了不会有副作用（居中对齐下盒子宽度不影响文字的视觉中心），
   * 窄了才会 —— 文字会溢出盒子两侧。
   */
  private static readonly BOX_WIDTH = 260;
  private static readonly BOX_HEIGHT = 48;
  /**
   * 基准字号（像素，@ scale = 1）。40 × 默认 `scale` 0.8 = 32px。
   *
   * 与原来那套 40×64 的 tga 数字贴图 × 0.8 的视觉高度相当 ——
   * **换渲染方式不该顺带把飘字改大改小**，否则「飘字看起来正常」这条验收
   * 就分不清是换渲染的功劳还是尺寸变了。
   */
  private static readonly BASE_FONT_PX = 40;
  private static readonly STANDARD_WIDTH = 1920;
  private static readonly STANDARD_HEIGHT = 1080;

  /** 像素字号 → WC3 字体高度。与 `StatPanelUI.pixelFontSize` / `Text.setFontSizePixels` 同一套换算 */
  private static pixelFontSize(px: number): number {
    return (px / DamageText.STANDARD_HEIGHT) * ScreenCoordinates.WC3_SCREEN_HEIGHT;
  }

  /**
   * 按 `scale` 撑开容器盒子。**字号和盒子必须一起缩放** ——
   * 字放大了盒子不动，文字就会溢出自己的锚点盒子，对齐跟着错。
   *
   * 那两个子级锚点是**相对**容器的（`setPoint`），所以盒子一改，文字框自动跟着改，
   * 不需要在这里重设锚点 —— 而重设锚点恰恰是会引发重排的那件事，得避开。
   *
   * 宽度按同样的 `scale` 缩放，于是「盒宽 / 字号」这个比值恒定，
   * 任何 `scale` 下能塞下的位数都一样多。
   */
  private applyBoxSize(scale: number): void {
    const frame = this.containerFrame;
    if (frame === null) {
      return;
    }
    const w = Math.max(1, DamageText.BOX_WIDTH * scale);
    const h = Math.max(1, DamageText.BOX_HEIGHT * scale);
    frame.setSize(
      (w / DamageText.STANDARD_WIDTH) * ScreenCoordinates.WC3_SCREEN_WIDTH,
      (h / DamageText.STANDARD_HEIGHT) * ScreenCoordinates.WC3_SCREEN_HEIGHT
    );
  }

  constructor() {
    // 创建容器 Frame
    this.containerFrame = Frame.createType(
      `DamageTextContainer_${GetRandomInt(0, 999999)}`,
      Frame.fromHandle(DzGetGameUI())!,
      0,
      "BACKDROP",
      ""
    )!;

    this.containerFrame.setTexture(`Texture\\ui\\dmg\\transparent.tga`, 0, true);

    // 设置容器尺寸（重要！没有尺寸的话子 frame 相对定位无效）。
    // 这里先按 scale = 1 撑一次，只是为了下面那两个相对锚点一建出来就有效；
    // 每次 `show()` 时 `setupText()` 会按真实 scale 再撑一次。
    this.applyBoxSize(1);

    // 唯一的文字 frame。**不用 `Text` 组件** —— 那个组件无条件给每个实例建一个
    // 吃点击的 BUTTON 命中层（`Text.ts:378`，注释说「仅在拖拽时需要」但代码不看条件），
    // 池里 16 个实例就是 16 个凭空多出来的点击层。
    const label = Frame.createType(
      `DamageTextLabel_${GetRandomInt(0, 999999)}`,
      this.containerFrame,
      0,
      "TEXT",
      ""
    );
    if (label !== undefined) {
      // 两个点填满容器盒子 + 居中对齐。**创建时一次定死**，之后只 `setText`,
      // 不再动锚点 —— `clearPoints()` + 重锚会把 frame 在同级里重排到最上层。
      label.setPoint(FRAMEPOINT_TOPLEFT, this.containerFrame, FRAMEPOINT_TOPLEFT, 0, 0);
      label.setPoint(FRAMEPOINT_BOTTOMRIGHT, this.containerFrame, FRAMEPOINT_BOTTOMRIGHT, 0, 0);
      // ⚠️ `Frame.setTextAlignment(vert, horz)` 的包装**把第二个参数丢了**
      // （`frame.ts:316` 只把 `vert` 传下去），所以第一个参数实际是**打包后的整数**，
      // 不是「垂直对齐」。`TEXT_ALIGN_CENTER` = 18 = 居中/居中。
      label.setTextAlignment(TEXT_ALIGN_CENTER, 0);
      label.setVisible(false);
      this.labelFrame = label;
    }

    this.containerFrame.setVisible(false);
  }

  /**
   * 初始化并显示伤害文字
   */
  public show(config: DamageTextConfig): void {
    this.damage = config.damage;
    this.worldX = config.worldX;
    this.worldY = config.worldY;
    this.height = config.height || 0;
    this.direction = config.direction || FloatDirection.UP;
    this.speed = config.speed || 100;
    this.duration = config.duration || 1.5;
    this.scale = config.scale || 0.8;
    this.fadeOut = config.fadeOut !== undefined ? config.fadeOut : true;
    this.color = config.color || 'gray';
    this.richText = config.richText;
    this.crit = config.crit === true;

    this.elapsedTime = 0;
    this.offsetX = 0;
    this.offsetY = 0;
    this.currentAlpha = 255;
    this.isActive = true;

    // 设置文字
    this.setupText();

    // 显示
    this.containerFrame!.setVisible(true);
    this.updatePosition();
  }

  /**
   * 设置文字内容与字号。
   *
   * **缩放一律由字号承担，不碰 `setScale`** —— `DzFrameSetScale(0)` 会闪退
   * （`layoutV3.ts:24`、`UnitBlood.ts:812` 都记过），字号 0 同样闪退。
   *
   * 下面那个 `Math.max(1, …)` 只挡**负数**：`0` 和 `NaN` 在 `show()` 里已经被
   * `config.scale || 0.8` 吃掉了（两者都是 falsy）。挡负数是必要的 ——
   * `-1` 是 truthy，会一路走到 `setFont` 拿到一个负字号。
   */
  private setupText(): void {
    const label = this.labelFrame;
    if (label === null) {
      return;
    }

    // 富文本串自带颜色，**不再套一层** —— 套了的话外层那个 `|cff…|r` 会把
    // 串里所有内层色码覆盖掉，表现为「多色串渲染成单色」。
    const rich = this.richText;
    const text =
      rich !== undefined
        ? rich
        : // 颜色走富文本前缀，**不用 `DzFrameSetTextColor`** —— 那个原生接口的编码
          // 没人验证过，全仓零调用，多处注释明写「别用」。
          colorize(Math.floor(Math.abs(this.damage)).toString(), colorHexOf(this.color));

    // 暴击的字号倍数**先算出来、两处都用同一份**：盒子和字号必须按同一个数缩，
    // 各算各的就会在暴击时错位（盒子没跟上，文字溢出去）。
    const effectiveScale = this.scale * (this.crit ? CRIT_FONT_BOOST : 1);

    // 盒子和字号一起缩，否则字放大了盒子还是原来那么大（见 `applyBoxSize`）
    this.applyBoxSize(effectiveScale);

    const fontPx = Math.max(1, DamageText.BASE_FONT_PX * effectiveScale);
    label.setFont(FONT_PATH, DamageText.pixelFontSize(fontPx), 0);
    label.setText(text);
    label.setAlpha(255);
    label.setVisible(true);
  }

  /**
   * 更新（每帧调用）
   */
  public update(deltaTime: number): void {
    if (!this.isActive) return;

    this.elapsedTime += deltaTime;

    // 检查是否超时
    if (this.elapsedTime >= this.duration) {
      this.hide();
      return;
    }

    // 更新移动偏移
    this.updateOffset(deltaTime);

    // 更新透明度（淡出效果）
    if (this.fadeOut) {
      const progress = this.elapsedTime / this.duration;
      // 最后 30% 的时间开始淡出
      if (progress > 0.7) {
        const fadeProgress = (progress - 0.7) / 0.3;
        this.currentAlpha = 255 * (1 - fadeProgress);

        // 只剩一个 frame 要改透明度了（原来是 8 个数字逐个改）。
        // 空值判断放在这个每帧都跑的分支里是故意的：它只在最后 30% 的时间里执行，
        // 平时一次都不走。
        const label = this.labelFrame;
        if (label !== null && label.visible) {
          label.setAlpha(Math.floor(this.currentAlpha));
        }
      }
    }

    // 更新位置
    this.updatePosition();
  }

  /**
   * 更新移动偏移
   */
  private updateOffset(deltaTime: number): void {
    const moveDistance = this.speed * deltaTime;

    switch (this.direction) {
      case FloatDirection.UP:
        this.offsetY += moveDistance;
        break;
      case FloatDirection.DOWN:
        this.offsetY -= moveDistance;
        break;
      case FloatDirection.LEFT:
        this.offsetX -= moveDistance;
        break;
      case FloatDirection.RIGHT:
        this.offsetX += moveDistance;
        break;
      case FloatDirection.NONE:
        // 不移动
        break;
    }
  }

  /**
   * 更新屏幕位置
   */
  private updatePosition(): void {
    // 世界坐标转屏幕坐标
    // worldToScreen(地图X, 地图Y, 高度) - 正确的参数顺序
    const screenPos = worldToScreen(this.worldX, this.worldY, this.height);

    // 调试输出
    // print(`[DamageText] 世界坐标: X=${this.worldX}, Y=${this.worldY}, H=${this.height}`);
    // print(`[DamageText] 屏幕坐标: screenX=${screenPos.screenX}, screenY=${screenPos.screenY}, z=${screenPos.z}`);

    // 应用偏移（像素转 WC3 屏幕坐标）
    // WC3 屏幕坐标范围是 0.8 x 0.6，而不是 1.0 x 1.0
    const offsetXScreen = (this.offsetX / DamageText.STANDARD_WIDTH) * ScreenCoordinates.WC3_SCREEN_WIDTH;
    const offsetYScreen = (this.offsetY / DamageText.STANDARD_HEIGHT) * ScreenCoordinates.WC3_SCREEN_HEIGHT;

    const finalX = screenPos.screenX + offsetXScreen;
    const finalY = screenPos.screenY + offsetYScreen;

    // print(`[DamageText] 最终坐标: finalX=${finalX}, finalY=${finalY}`);

    // 检测是否在屏幕外
    if (this.isOffScreen(finalX, finalY)) {
      this.containerFrame!.setVisible(false);
      return;
    }

    if (!this.containerFrame!.visible) {
      this.containerFrame!.setVisible(true);
    }

    // 设置位置
    this.containerFrame!.clearPoints();
    this.containerFrame!.setAbsPoint(FRAME_ALIGN_BOTTOM, finalX, finalY);
  }

  /**
   * 检测是否在屏幕外
   */
  private isOffScreen(screenX: number, screenY: number): boolean {
    // 参考 UnitBlood 的检测逻辑
    // 屏幕坐标范围：X [0.04, 0.96], Y [0.16, 0.84]
    return (
      screenY >= 1000 / 1800 ||  // 下边界
      screenY <= 300 / 1800 ||   // 上边界
      screenX >= 1850 / 2400 ||  // 右边界
      screenX <= 70 / 2400       // 左边界
    );
  }

  /**
   * 隐藏并标记为可重用
   */
  public hide(): void {
    this.isActive = false;
    this.containerFrame!.setVisible(false);

    // 文字 frame 是容器的子级，藏容器就够了；这里显式再藏一次是为了与
    // 「容器 + 文字」两个句柄的生命周期保持对称，不依赖「父级隐藏会级联到子级」
    // 这个没在游戏里逐条验证过的行为。
    const label = this.labelFrame;
    if (label !== null) {
      label.setVisible(false);
    }
  }

  /**
   * 检查是否激活
   */
  public active(): boolean {
    return this.isActive;
  }

  /**
   * 销毁（清理资源）
   */
  public destroy(): void {
    if (this.containerFrame) {
      this.containerFrame.destroy();
      this.containerFrame = null;
    }
    // 文字 frame 是容器的子级，随容器一起销毁，这里只清引用
    this.labelFrame = null;
  }
}

/**
 * 伤害文字对象池
 */
export class DamageTextPool {
  private pool: DamageText[] = [];
  private poolSize: number;
  private updateTimer: Timer | null = null;
  private lastUpdateTime: number = 0;

  constructor(poolSize: number = 30) {
    this.poolSize = poolSize;
    this.initializePool();
    this.startUpdateTimer();
  }

  /**
   * 初始化对象池
   */
  private initializePool(): void {
    for (let i = 0; i < this.poolSize; i++) {
      // 每个实例 = 1 个容器 + 1 个 TEXT frame（原来是 1 容器 + 8 数字 frame）。
      // 位数不再需要预留 —— 文字 frame 自己按内容排布。
      this.pool.push(new DamageText());
    }
    poolLog.info(`初始化了 ${this.poolSize} 个伤害文字对象`);
  }

  /**
   * 启动更新计时器
   */
  private startUpdateTimer(): void {
    this.updateTimer = Timer.create();
    this.updateTimer.start(0.02, true, () => { // 50 FPS
      const deltaTime = 0.02; // 固定 50 FPS
      this.updateAll(deltaTime);
    });
  }

  /**
   * 更新所有激活的伤害文字
   */
  private updateAll(deltaTime: number): void {
    for (const damageText of this.pool) {
      if (damageText.active()) {
        damageText.update(deltaTime);
      }
    }
  }

  /**
   * 从池中获取一个可用的伤害文字对象
   */
  private acquire(): DamageText | null {
    for (const damageText of this.pool) {
      if (!damageText.active()) {
        return damageText;
      }
    }
    return null; // 池已满
  }

  /**
   * 显示伤害文字
   */
  public show(config: DamageTextConfig): boolean {
    const damageText = this.acquire();
    if (!damageText) {
      // print("DamageTextPool: 对象池已满，无法显示新的伤害文字");
      return false;
    }

    damageText.show(config);
    return true;
  }

  /**
   * 清理所有伤害文字
   */
  public clear(): void {
    for (const damageText of this.pool) {
      if (damageText.active()) {
        damageText.hide();
      }
    }
  }

  /**
   * 销毁对象池
   */
  public destroy(): void {
    if (this.updateTimer) {
      this.updateTimer.destroy();
      this.updateTimer = null;
    }

    for (const damageText of this.pool) {
      damageText.destroy();
    }

    this.pool = [];
  }
}

/**
 * 全局伤害文字管理器（单例）
 */
export class DamageTextManager {
  private static instance: DamageTextManager | null = null;
  private pool: DamageTextPool;

  private constructor(poolSize: number = 30) {
    this.pool = new DamageTextPool(poolSize);
  }

  /**
   * 获取单例实例
   */
  public static getInstance(poolSize: number = 30): DamageTextManager {
    if (!DamageTextManager.instance) {
      DamageTextManager.instance = new DamageTextManager(poolSize);
      managerLog.info("单例已创建");
    }
    return DamageTextManager.instance;
  }

  /**
   * 显示伤害文字（便捷方法）
   */
  public static show(config: DamageTextConfig): boolean {
    return DamageTextManager.getInstance().pool.show(config);
  }

  /**
   * 快速显示伤害（使用默认配置）
   */
  public static showDamage(
    damage: number,
    worldX: number,
    worldY: number,
    height: number = 100
  ): boolean {
    return DamageTextManager.show({
      damage,
      worldX,
      worldY,
      height,
      direction: FloatDirection.UP,
      speed: 80,
      duration: 1.5,
      scale: 0.8,
      fadeOut: true
    });
  }

  /**
   * 清理所有伤害文字
   */
  public clear(): void {
    this.pool.clear();
  }

  /**
   * 销毁管理器
   */
  public destroy(): void {
    this.pool.destroy();
    DamageTextManager.instance = null;
  }
}
