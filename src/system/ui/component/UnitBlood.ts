import { Frame, FRAME_ALIGN_BOTTOM, FRAME_ALIGN_LEFT, FRAME_ALIGN_LEFT_TOP, FRAME_ALIGN_RIGHT, FRAME_ALIGN_RIGHT_BOTTOM, FRAME_ALIGN_TOP, MapPlayer, Timer, Unit, UNIT_TYPE_DEAD } from "@eiriksgata/wc3ts/*";
import { CameraControl } from "src/utils/CameraControl";
import { FourCC, worldToScreen } from "src/utils/helper";
import { Actor } from "../../actor";
import { createLogger } from "src/utils/logger";
import { UNIT_TYPE_HERO } from "src/constants/game/units";
import { onFrame } from "../FrameLoop";

const log = createLogger("UnitBlood");

/**
 * 等级数字框的几何，单位是本文件自己的 2400x1800 坐标系（和别处 `xx / 2400` 一样）。
 *
 * 底图 `01.tga` 是 140x28 像素，而 frame 是 130x28 —— 横向被压了 130/140，
 * 所以底图上的像素位置要乘这个比例才能变成 frame 内的坐标。
 */

/** 数字与框边之间的空隙，左右各一份。框宽 = 数字宽度 + 2 * 这个值 */
const LEVEL_BOX_PAD = 4;

/**
 * 底图里那条分隔线右边界的 frame 内坐标：第 26 个像素 * (130/140)。
 *
 * 实测（数 `01.tga` 像素）：分隔线是**双线**，占纹理 x 24..25，垂直贯穿 y 4..24；
 * 左边框占 x 2..3，上下边框占 y 2..3 / y 24..25，中间是纯黑。
 * 所以「烘死格子的右边界」和「分隔线的右缘」本来就是指同一条边。
 */
const LEVEL_BOX_BAKED_END = (26 * 130) / 140;

/**
 * 三条 bar（血 / 护盾 / 蓝）的左起点与宽度，单位同 `xx / 2400`。
 *
 * - 英雄：从 26 起 —— 左边那 26 个像素宽的地盘留给等级数字框。
 * - 普通单位：从 4 起 —— 烘死的等级格子不用了，把那块宽度一并吃进来填满。
 *   右端两边保持不动（26 + 100 = 4 + 122 = 126），所以只是往左长了一截、不留空隙。
 */
const BAR_LEFT_HERO = 26;
const BAR_WIDTH_HERO = 100;
const BAR_LEFT_NONHERO = 4;
const BAR_WIDTH_NONHERO = 122;

/**
 * 血条分类。开关是**按分类**控制的，不是按单个单位。
 *
 * 用分类而不是给每个单位存一个 flag，是因为「关闭某类血条」时要做的是
 * 「遍历所有 Actor、把这一类全部销毁」—— 分类是每次都能从单位本身重新算出来的
 * 固有属性（`IsUnitType(u, UNIT_TYPE_HERO)`），不需要额外存状态。
 */
export type BloodBarCategory = "hero" | "normal";


export class UnitBlood {

  public static allUnitBlood: Map<number, UnitBlood> = new Map();

  /**
   * 分类开关。**默认只开英雄条，普通单位条默认关闭** —— 这是用户指定的初始状态。
   *
   * 放在静态字段上（而不是 `UnitBloodToggleUI` 里）是因为 `create()` 需要在
   * 「单位被造出来的那一刻」就能读到它，好让关闭期间新造的单位不会凭空拿到血条。
   * 放这里也避免了 `UnitBlood` 反过来 import `Actor` 造成循环依赖。
   */
  private static enabled: Record<BloodBarCategory, boolean> = { hero: true, normal: false };

  /**
   * frame 名字的代数计数器。
   *
   * 开关「关闭 → 重新打开」会走「先销毁、再重建」，于是同一个 `actor.id` 会在
   * 第二次创建时**再次**用到 `UnitBloodFrame_${id}` 这类名字。
   *
   * 单看 `japi.d.ts` 的说法（「重复创建同名 Frame 请使用 Tag 创建」），
   * 我们用的 `Frame.createType` 正是 Tag 创建，本该没问题；但同一条注释里还有
   * 「销毁一个被重复创建过的 Frame 会导致游戏崩溃」，两句的边界并不清楚。
   * 加个自增代数、让名字**永远不重复**，就把这条风险整个绕开了 —— 成本只是一个数字。
   */
  private static generation: number = 0;

  /** 取一个新的代数号，仅供构造函数拼 frame 名字用 */
  private static nextGeneration(): number {
    UnitBlood.generation += 1;
    return UnitBlood.generation;
  }

  // 标记是否已经注册过绘制事件
  private static isDrawEventRegistered: boolean = false;

  actor: Actor;
  frame: Frame;
  lifeFrame: Frame;
  manaFrame: Frame;
  shieldFrame: Frame;
  /**
   * 等级数字。**只有英雄单位才有这个 frame** —— 普通单位的血条不要左边的等级数字
   * （用户要求）。所以它是可选的，用到它的地方都要判空。
   */
  levelFrame: Frame | undefined = undefined;

  /**
   * 等级数字外面的框。宽度跟着数字走（见构造函数的 ② 段），同样只有英雄才有。
   */
  levelBoxFrame: Frame | undefined = undefined;

  /**
   * 盖掉底图里烘焙的那个格子用的纯黑块。**两种分类都有**，只是盖的范围不同：
   * 英雄连左边框一起盖（接着会自建数字框把左边框重画回来），普通单位只盖分隔线。
   * 见构造函数的 ① 段。
   */
  levelMaskFrame: Frame | undefined = undefined;
  nameBoxFrame: Frame;
  nameFrame: Frame;

  /**
   * 三条 bar 的**满值宽度**（已除 2400 的归一化值）。`updateUI` 按百分比算实际宽度时要用它 ——
   * 两种分类的满宽不同（英雄 100 / 普通单位 122，见 `BAR_WIDTH_*`），
   * 写死 100 会让普通单位满血时只填到 82%。
   */
  private readonly barFullWidth: number;

  /** destroy() 只允许生效一次，见该方法的注释 */
  private destroyed: boolean = false;

  /** 上一次实际应用的缩放值，用于跳过无变化时的重复设置（见 updateUI 里的注释） */
  private lastScale: number = Number.NaN;

  /**
   * 血条缩放的取值范围。**下限必须严格大于 0**，这不是审美问题，见 updateUI。
   *
   * `CameraControl.viewLevelMax` 是 30，而 `setScale()` 会把这个值一路传到
   * `DzFrameSetScale()` 和 `DzFrameSetFont()` 的字号参数上。
   * 原始公式在 `viewLevel >= 18` 时得 0、再往上得负数，字号也跟着变 0/负 ——
   * 镜头拉到最高就闪退。所以这里夹一个安全区间。
   */
  private static readonly SCALE_MIN: number = 0.35;
  private static readonly SCALE_MAX: number = 1.4;

  /** 把任意输入夹到安全区间，供 updateUI 与 setScale 共用 */
  private static clampScale(scale: number): number {
    if (!Number.isFinite(scale)) {
      return 1;
    }
    return Math.min(UnitBlood.SCALE_MAX, Math.max(UnitBlood.SCALE_MIN, scale));
  }

  /**
   * 私有构造函数，防止直接实例化
   */
  private constructor(actor: Actor) {
    this.actor = actor;
    //actor.setPreselectUIVisible(false);

    // 本次实例的 frame 名字后缀。见 `generation` 的注释 —— 销毁后重建时名字必须不同。
    const gen = UnitBlood.nextGeneration();

    // 英雄 / 普通单位的分叉点。分类是每次都能从单位本身重新算出来的固有属性（见 `categoryOf`）。
    const isHero = UnitBlood.categoryOf(actor) === "hero";
    // 三条 bar 的左起点与宽度：普通单位把烘死的等级格子那块宽度吃进来（详见常量注释）
    const barLeft = (isHero ? BAR_LEFT_HERO : BAR_LEFT_NONHERO) / 2400;
    const barWidth = (isHero ? BAR_WIDTH_HERO : BAR_WIDTH_NONHERO) / 2400;
    this.barFullWidth = barWidth;

    //血条UI基底框架
    this.frame = Frame.createType(`UnitBloodFrame_${actor.id}_g${gen}`, Frame.fromHandle(DzGetGameUI())!, 0, "BACKDROP", "")!;
    this.frame.setSize(130 / 2400, 28 / 1800);
    this.frame.setTexture("Texture\\ui\\hpbar\\01.tga", 0, false);
    this.frame.setVisible(true);

    // ## 底图里烘死的那个等级格子
    //
    // 原先用的框是**烘在底图 `01.tga` 里的**：一个固定宽度的小格子（纹理 x 2..25，
    // 即 frame 内 0..22.3，实测约 14 屏幕像素宽），数字不管几位都塞在里面，
    // 而数字只有 4~5 像素 —— 一位数时框里空一大半，两位数又几乎顶满。
    // 用户要的是「框随里面的内容大小变化」，所以那层烘焙格子**本实现不再使用**，
    // 改成下面这几个 frame 自己搭：
    //
    //   ① levelMaskFrame —— 纯黑，把烘死的左边框 / 分隔线盖掉
    //   ② levelBoxFrame  —— 自建的数字框（**仅英雄**），贴图是那格子的切图，宽度跟着数字走
    //   ③ levelFrame     —— 数字本身（**仅英雄**，最后建，压在最上面）
    //
    // 兄弟 frame 的绘制顺序就是创建顺序，所以 ① 必须建在三条 bar **之前** ——
    // 否则普通单位被左移的 bar 会被盖块压住（英雄的 bar 从 x26 起，和盖块不重叠，建哪都一样）。
    //
    // 盖块只盖 y 4..24：上下边框（纹理 y 2..3 / 24..25）不能碰，横向盖到分隔线右缘
    // `LEVEL_BOX_BAKED_END` 为止。两种分类的左起点不同：
    //   · 英雄：从 x0 起，**连左边框一起盖** —— 紧接着自建的 ② 会把左边框重画回来。
    //   · 普通单位：从 `BAR_LEFT_NONHERO` 起，**留住左边框**（没有 ② 去重画它），
    //     只盖分隔线。屏幕上普通单位血条左边那个空方格，就是这条分隔线。
    this.levelMaskFrame = Frame.createType(`LevelMaskFrame_${actor.id}_g${gen}`, this.frame, 0, "BACKDROP", "")!;
    this.levelMaskFrame.setTexture("Texture\\ui\\hpbar\\levelmask.tga", 0, false);
    this.levelMaskFrame.setPoint(FRAME_ALIGN_LEFT_TOP, this.frame, FRAME_ALIGN_LEFT_TOP, (isHero ? 0 : BAR_LEFT_NONHERO) / 2400, -4 / 1800);
    this.levelMaskFrame.setPoint(FRAME_ALIGN_RIGHT_BOTTOM, this.frame, FRAME_ALIGN_LEFT_TOP, LEVEL_BOX_BAKED_END / 2400, -24 / 1800);

    //血条生命值框架
    this.lifeFrame = Frame.createType(`LifeFrame_${actor.id}_g${gen}`, this.frame, 0, "BACKDROP", "")!;
    this.lifeFrame.setSize(barWidth, 12 / 1800);
    this.lifeFrame.setTexture("Texture\\ui\\hpbar\\02.tga", 0, false);
    this.lifeFrame.setPoint(FRAME_ALIGN_LEFT_TOP, this.frame, FRAME_ALIGN_LEFT_TOP, barLeft, -4 / 1800);

    // 护盾值框架：与血条同位置同大小，覆盖在血条上方，只显示护盾百分比宽度，更直观
    this.shieldFrame = Frame.createType(`ShieldFrame_${actor.id}_g${gen}`, this.frame, 0, "BACKDROP", "")!;
    this.shieldFrame.setSize(barWidth, 12 / 1800);
    this.shieldFrame.setTexture("Texture\\ui\\hpbar\\huduntiao.tga", 0, false);
    this.shieldFrame.setPoint(FRAME_ALIGN_LEFT_TOP, this.frame, FRAME_ALIGN_LEFT_TOP, barLeft, -4 / 1800);
    this.shieldFrame.setVisible(false);

    //血条魔法值框架
    this.manaFrame = Frame.createType(`ManaFrame_${actor.id}_g${gen}`, this.frame, 0, "BACKDROP", "")!;
    this.manaFrame.setSize(barWidth, 8 / 1800);
    this.manaFrame.setTexture("Texture\\ui\\hpbar\\03.tga", 0, false);
    // 向下微调，为护盾条留出空间
    this.manaFrame.setPoint(FRAME_ALIGN_LEFT_TOP, this.frame, FRAME_ALIGN_LEFT_TOP, barLeft, -18 / 1800);

    // 等级数字：**只有英雄才建**。普通单位的血条按用户要求去掉左边的等级数字。
    //
    // 这里是「根本不建」而不是「建了再藏」—— 少一个 frame，`updateUI` / `setScale`
    // 里也就没有对着隐藏 frame 白调 setText / setFont 的开销。
    //
    // ②③ 的编号接的是上面 ① 盖线块那段注释 —— 盖块已经无条件建好了，这里只补英雄专属的
    // 自建框和数字本身。
    if (isHero) {
      // ② 自建数字框。
      //
      // 左边缘钉死在整条血条的左边缘（0），右边缘**挂在数字 frame 的右边缘**（+ 空隙）。
      // TEXT frame 的宽度会收成文字本身的宽度，所以数字一位变两位时这个框自动变宽 ——
      // 这就实现了「框随内容变化」。本文件下面的 `nameBoxFrame` 用 `nameFrame` 的两个角
      // 定尺寸，是同一个套路（而且已经跑通了，截图里名牌的底框就是紧贴文字的）。
      //
      // 第二个锚点垂直方向写的是「数字垂直中心再往下 14」：数字的中心在frame 内 y=14，
      // 再往下 14 正好落到血条下边缘（28），也就是框的上下边仍然贴满整条血条的高度。
      this.levelBoxFrame = Frame.createType(`LevelBoxFrame_${actor.id}_g${gen}`, this.frame, 0, "BACKDROP", "")!;
      this.levelBoxFrame.setTexture("Texture\\ui\\hpbar\\levelbox.tga", 0, false);
      this.levelBoxFrame.setPoint(FRAME_ALIGN_LEFT_TOP, this.frame, FRAME_ALIGN_LEFT_TOP, 0, 0);

      // ③ 数字本体。锚点从原来的「居中在框里」改成「左对齐、留出空隙」——
      //    框现在贴着数字走，数字居中已经没有意义（框本身就是按数字宽度定的）。
      this.levelFrame = Frame.createType(`LevelFrame_${actor.id}_g${gen}`, this.frame, 0, "TEXT", "")!;
      this.levelFrame.setTextAlignment(50, 0);
      this.levelFrame.setText(`${actor.level}`);
      this.levelFrame.setFont("resource\\Texture\\ui\\hpbar\\ZiTi.TTf", 1, 0);
      this.levelFrame.setPoint(FRAME_ALIGN_LEFT, this.frame, FRAME_ALIGN_LEFT_TOP, LEVEL_BOX_PAD / 2400, -14 / 1800);

      // 框的右边缘挂到数字的右边缘上（必须在数字建好之后才能设）
      this.levelBoxFrame.setPoint(FRAME_ALIGN_RIGHT_BOTTOM, this.levelFrame, FRAME_ALIGN_RIGHT, LEVEL_BOX_PAD / 2400, -14 / 1800);
    }

    //血条名称框架
    this.nameBoxFrame = Frame.createType(`NameBoxFrame_${actor.id}_g${gen}`, this.frame, 0, "BACKDROP", "")!;
    this.nameBoxFrame.setTexture("Texture\\ui\\hpbar\\07.tga", 0, false);
    this.nameBoxFrame.alpha = 75;

    //血条名称文本框架
    this.nameFrame = Frame.createType(`NameFrame_${actor.id}_g${gen}`, this.nameBoxFrame, 0, "TEXT", "")!;
    this.nameFrame.setText(actor.getLabel());
    this.nameFrame.setTextAlignment(18, 0);
    this.nameFrame.setFont("resource\\Texture\\ui\\hpbar\\ZiTi.TTf", 1, 0);

    this.nameFrame.alpha = 255;
    this.nameFrame.setPoint(FRAME_ALIGN_BOTTOM, this.frame, FRAME_ALIGN_TOP, 0.003, 10 / 1800);

    this.nameBoxFrame.setPoint(FRAME_ALIGN_LEFT_TOP, this.nameFrame, FRAME_ALIGN_LEFT_TOP, -0.003, 0.004);
    this.nameBoxFrame.setPoint(FRAME_ALIGN_RIGHT_BOTTOM, this.nameFrame, FRAME_ALIGN_RIGHT_BOTTOM, 0.004, -0.004);

    if (actor.owner == MapPlayer.fromLocal()) {
      this.lifeFrame.setTexture("Texture\\ui\\hpbar\\02.tga", 0, false);
    } else {
      if (actor.isAlly(MapPlayer.fromLocal())) {
        this.lifeFrame.setTexture("Texture\\ui\\hpbar\\06.tga", 0, false);
      } else {
        this.lifeFrame.setTexture("Texture\\ui\\hpbar\\05.tga", 0, false);
      }
    }

    UnitBlood.allUnitBlood.set(actor.id, this);
  }

  /**
   * 创建或获取 UnitBlood 实例
   * 如果已存在则返回现有实例，否则创建新实例
   */
  /** 这个 Actor 属于哪一类血条 */
  public static categoryOf(actor: Actor): BloodBarCategory {
    // handle 可能已经失效（单位被移除）。`IsUnitType` 对无效 handle **不是安全的**
    // ——它会去打悬垂指针，是访问违例。所以这里必须先把失效的挡掉，
    // 判不出来就按普通单位处理。
    //
    // 这道守卫不是理论洁癖：`Actor.allActors` 里装的**不只是我们造的单位**。
    // `DamageSystem.enumExistingUnits`（damage.ts）在初始化时把地图上所有单位都
    // 注册了进来，`DamageSystem` / `GameEvent` 的各个事件也会随伤害、死亡、选中
    // 往里塞 `Actor.fromHandle(...)`。也就是说这个表里随时可能有已经死掉或被移除
    // 的单位；而「血条分类开关」是**第一段遍历全表、对每个 Actor 都调本方法**的代码
    // （`create()` 只对刚造出来的那个调）。
    //
    // 判据用 `GetUnitTypeId(handle) === 0`，与本文件 `updateUI()` 里那段是同一个
    // —— 那个写法是上次访问违例排查后定下来的，注释在 updateUI 上面。
    if (actor.handle === undefined || GetUnitTypeId(actor.handle) === 0) {
      return "normal";
    }
    return IsUnitType(actor.handle, UNIT_TYPE_HERO) ? "hero" : "normal";
  }

  /**
   * 无敌的中立单位 —— 地图上那些商店、生命之泉之类的摆设建筑，不给它们画血条。
   *
   * 判据是**单位技能 `Avul`**，不是护甲类型。为什么：
   *   1.27a 的护甲类型只有 8 种（`UI\UnitEditorData.txt` 的 `[defenseType]`：
   *      normal/small/medium/large/fort/hero/divine/none），**没有「无敌」这一种**。
   *   这些单位在数据里护甲全是 `fort`（加强型），跟普通建筑一模一样，区分不出来。
   *   `Units\neutralabilitystrings.txt` 里 `[Avul] Name=无敌的`、`EditorSuffix= (中立的)`
   *   —— 编辑器里显示的就是「无敌的（中立的）」，正是用户说的那个。让它们打不死的
   *   是 `unitabilities.slk` 里挂的这个技能：
   *     ngme（地精商店）abilList = Aneu,Avul,Apit
   *     nfoh（生命之泉）abilList = Avul,ACnr
   *   而 hfoo（步兵）、htow（城镇大厅）这类正常单位没有它。
   *
   * 中立按**拥有者**判（玩家编号 >= 12，即中立敌对 / 受害 / 额外 / 被动四个位置）。
   * 两个条件都要求，是照用户原话「无敌**且**中立」：万一以后给某个玩家单位挂了
   * `Avul`（比如阶段性无敌的 Boss），它的血条不会被误吞掉。
   */
  public static isInvulnerableNeutral(actor: Actor): boolean {
    // 与 `create()` / `categoryOf()` 同一道守卫：句柄失效时打原生调用是访问违例。
    // `GetUnitAbilityLevel` 尤其如此（见 NativeUISystem.ts 里那段注释）。
    const handle = actor.handle;
    if (handle === undefined || GetUnitTypeId(handle) === 0) {
      return false;
    }
    if (GetUnitAbilityLevel(handle, FourCC("Avul")) <= 0) {
      return false;
    }
    return actor.owner.id >= 12;
  }

  public static isCategoryEnabled(category: BloodBarCategory): boolean {
    return UnitBlood.enabled[category];
  }

  public static setCategoryEnabled(category: BloodBarCategory, value: boolean): void {
    UnitBlood.enabled[category] = value;
  }

  /**
   * 创建或获取 UnitBlood 实例
   * 如果已存在则返回现有实例，否则创建新实例
   *
   * 分类开关关着时返回 `undefined`（不建、也不入册）。这道门禁放在这里而不是调用方，
   * 是为了让「关闭期间新造的单位」无论从哪条路径进来都不会凭空长出条。
   */
  public static create(actor: Actor): UnitBlood | undefined {
    // 如果已经存在，直接返回现有实例
    const existing = UnitBlood.allUnitBlood.get(actor.id);
    if (existing !== undefined) {
      return existing;
    }

    // 只给**活着的**单位建条。理由与 categoryOf 上面那段相同：`Actor.allActors`
    // 里可能残留已经死亡 / 被移除的单位，而构造函数会去读 `actor.owner`、
    // `actor.level`、`actor.getLabel()`、`actor.isAlly(...)` —— 全是打在 unit 句柄上的
    // 原生调用，句柄悬垂就是访问违例。
    //
    // 必经之路：开关「打开」时会遍历全表调 `createBloodBar()`，那时表里有什么
    // 不由我们决定。
    if (actor.handle === undefined || GetUnitTypeId(actor.handle) === 0) {
      return undefined;
    }

    // 无敌的中立单位（商店、生命之泉这类摆设）不画：它们本来就打不死，血条永远
    // 是满的、也不会动，纯粹碍眼。判据见 isInvulnerableNeutral。
    if (UnitBlood.isInvulnerableNeutral(actor)) {
      return undefined;
    }

    if (!UnitBlood.isCategoryEnabled(UnitBlood.categoryOf(actor))) {
      return undefined;
    }

    // 不存在则创建新实例
    return new UnitBlood(actor);
  }

  /**
   * 获取指定单位的血条UI
   */
  public static get(unit: Unit): UnitBlood | undefined {
    return UnitBlood.allUnitBlood.get(unit.id);
  }

  /**
   * 移除指定单位的血条UI
   */
  public static remove(unit: Unit): void {
    const unitBlood = UnitBlood.allUnitBlood.get(unit.id);
    if (unitBlood !== undefined) {
      unitBlood.destroy();
      UnitBlood.allUnitBlood.delete(unit.id);
    }
  }

  /**
   * 销毁血条UI
   *
   * **必须先销毁子 frame、最后销毁 `frame`** —— 这条是踩出来的，不是洁癖。
   *
   * `DzDestroyFrame` 只销毁传进去的那一个 frame，**不会**连带销毁它的子 frame。
   * 只销毁 `this.frame` 的后果是：根 frame 被释放，子 frame 还挂在引擎的 frame
   * 树上，各自的父指针指向已释放的内存 —— 下一次布局/渲染遍历到它就是一个
   * 访问违例（`0xC0000005`，读一个空基址 + 固定偏移）。
   *
   * 2026-10-04 14:02 的三次崩溃就是这个（`Errors/2026-10-04 14.02.*`）：
   *   Exception: 0xC0000005 at 0023:78961D23   读地址 0x0000001C
   * 四次的栈完全一致（Game.dll 四层 + kkapi 插件四层），是当时**全新**的崩溃族。
   * 触发点是「英雄血条」开关 —— 它是本文件 `destroy()` 的第一个真实调用方：
   * 在这之前地图里那 50 个英雄从不死亡，`destroy()` 一次都没跑过，
   * `DzDestroyFrame` 在整个地图里等于未验证的 API。
   */
  public destroy(): void {
    // 幂等：死亡流程（detach → UnitBlood.remove）和每帧回调里的消失检测
    // 可能先后都走到这里。重复 DzDestroyFrame 同一个句柄本身就会崩，
    // 所以必须保证只销毁一次。
    if (this.destroyed) {
      return;
    }
    this.destroyed = true;

    this.destroyChildFrames();
    this.frame.destroy();
    //this.actor.setPreselectUIVisible(true);
    UnitBlood.allUnitBlood.delete(this.actor.id);
    // print(`UnitBlood for unit ${this.unit.id} destroyed.`);
    // 其他清理工作...
  }

  /**
   * 销毁所有子 frame。**必须由深到浅**：`nameFrame` 挂在 `nameBoxFrame` 下面，
   * 得先送走孙子再送儿子 —— 否则父 frame 先被释放，子的父指针当场悬空。
   *
   * 另外这里每个子 frame 也各自走一遍 `Frame.destroy()`，其中的 `uncache()` 会把
   * 句柄从 `Handle` 的缓存表里摘掉。不摘的话，引擎回收并复用这个句柄号时，
   * 缓存里那个已经死掉的 Frame 包装对象会被当成新 frame 返回。
   */
  private destroyChildFrames(): void {
    const children: (Frame | undefined)[] = [
      // 等级框的锚点**引用了等级数字 frame**，必须排在它前面销毁；
      // 否则数字先被释放，框还挂着一个悬垂锚点，下一次布局遍历就踩空。
      this.levelBoxFrame, // 本行与下一行的 frame 仅英雄有；levelMaskFrame 两种分类都有（见构造函数）
      this.levelMaskFrame,
      this.levelFrame,
      this.lifeFrame,
      this.shieldFrame,
      this.manaFrame,
      this.nameFrame, // 父是 nameBoxFrame，必须排在它前面
      this.nameBoxFrame,
    ];
    for (const child of children) {
      if (child !== undefined) {
        child.destroy();
      }
    }
  }


  /**
   * 注册本地绘制事件
   * 此方法只能调用一次，重复调用会被忽略
   */
  public static registerLocalDrawEvent(): boolean {
    // 如果已经注册过，直接返回 false 表示未执行
    if (UnitBlood.isDrawEventRegistered) {
      log.warn("绘制事件已经注册过，重复调用被忽略");
      return false;
    }

    // 标记为已注册
    UnitBlood.isDrawEventRegistered = true;

    // 执行注册逻辑
    //
    // ⚠️ 必须走 `onFrame()`，**不要**在这里直接调 `DzFrameSetUpdateCallbackByCode` ——
    // 那是 Set 不是 Add，全局只有一个回调槽，直接调会把别的每帧订阅者顶掉
    // （或者反过来被别人顶掉，表现是血条突然不跟着镜头动了），详见 FrameLoop 的注释。
    onFrame(() => {
      CameraControl.update();
      UnitBlood.updateAllUnitBloods();
    });

    //使用计时器更新
    // Timer.create().start(0.03, true, () => {
    //   CameraControl.update();
    //   UnitBlood.updateAllUnitBloods();
    // });

    log.info("绘制事件注册成功");
    return true;
  }

  /**
   * 检查绘制事件是否已注册
   */
  public static isRegistered(): boolean {
    return UnitBlood.isDrawEventRegistered;
  }

  /**
   * 更新所有血条UI（每帧调用）
   */
  private static updateAllUnitBloods(): void {
    // updateUI() 内部可能调 destroy()（单位已消失时），那会改动 allUnitBlood。
    // 边遍历 Map 边删元素会漏项甚至读到已失效条目，先取快照再遍历。
    const snapshot: UnitBlood[] = [];
    for (const unitBlood of UnitBlood.allUnitBlood.values()) {
      snapshot.push(unitBlood);
    }

    for (const unitBlood of snapshot) {
      unitBlood.updateUI();
    }
  }

  /**
   * 更新单个血条UI
   */
  private updateUI(): void {
    // 检查单位是否还存在。
    //
    // 旧守卫只查 handle == undefined / id === 0，这两条对“已被移除的单位”都查不出来：
    // RemoveUnit 之后 handle 仍非空、handle id 也不会变成 0，于是下面的 actor.life /
    // actor.x / actor.y 会对着**悬垂句柄**调用 GetUnitState / GetUnitX / GetUnitY。
    // 1.27a 下这是访问违例（表现为游戏卡死后闪退，Errors/ 里留下一堆 0xC0000005）。
    //
    // GetUnitTypeId 对不存在的单位返回 0，是唯一可靠的存活判据。
    if (!this.actor || this.actor.handle == undefined || this.actor.id === 0
      || GetUnitTypeId(this.actor.handle) === 0) {
      this.destroy();
      return;
    }
    if (this.actor.life <= 0) {
      //隐藏血条
      this.frame.setVisible(false);
      return;
    }

    // 更新血条位置、生命值等
    // 这里可以添加具体的更新逻辑
    this.updateLifeBar();
    this.updateManaBar();
    this.updateShieldBar();

    //this.updatePositionByNative();
    this.updatePosition();

    // 普通单位没有这个 frame（见构造函数），必须判空
    if (this.levelFrame !== undefined) {
      this.levelFrame.setText(`${this.actor.level}`);
    }

    // 更新缩放比例。
    //
    // **只在缩放值真正变化时才调用 setScale()** —— 这一点很关键，不是微优化。
    // setScale() 内部会调 DzFrameSetFont()，而设置字体会去读字体文件（经由
    // Storm.dll 的文件层）。CameraControl.viewLevel 是整数档位，
    // 两次镜头缩放之间 scale 恒定，所以原写法等于**每帧、每个可见单位读两次
    // 字体文件**：20 个单位 60fps ≈ 2400 次/秒，白白的开销。
    //
    // 计算后**必须 clampScale()**：viewLevel 的上限是 30（不是早期注释里写的 13），
    // 原始公式 `1 - (L - 8) * 0.1` 在 L >= 18 时得 0、再往上得负数，
    // 于是 `DzFrameSetScale(0/负)` 与 `DzFrameSetFont(..., 0.01*scale, 0)` 拿到
    // 非正数 —— 镜头拉到最高就闪退。见 SCALE_MIN 的注释。
    const scale = UnitBlood.clampScale(1 - (CameraControl.getViewLevel() - 8) * 0.1);
    if (scale !== this.lastScale) {
      this.lastScale = scale;
      this.setScale(scale);
    }


  }

  /**
   * 更新生命值条
   */
  private updateLifeBar(): void {
    const maxLife = this.actor.maxLife;
    const lifePercent = maxLife > 0 ? this.actor.life / maxLife : 0;
    this.lifeFrame.setSize(this.barFullWidth * lifePercent, 12 / 1800);
  }

  private updateManaBar(): void {
    const maxMana = this.actor.maxMana;
    const manaPercent = maxMana > 0 ? this.actor.mana / maxMana : 0;
    this.manaFrame.setSize(this.barFullWidth * manaPercent, 8 / 1800);
  }

  /**
   * 更新护盾值条
   */
  private updateShieldBar(): void {
    const shieldPercent = this.actor.shieldPercent;

    if (shieldPercent <= 0) {
      if (DzFrameIsVisible(this.shieldFrame.handle)) {
        this.shieldFrame.setVisible(false);
      }
      return;
    }

    if (!DzFrameIsVisible(this.shieldFrame.handle)) {
      this.shieldFrame.setVisible(true);
    }

    const clamped = Math.max(0, Math.min(shieldPercent, 1));
    this.shieldFrame.setSize(this.barFullWidth * clamped, 12 / 1800);
  }

  /**
   * 更新血条位置（世界坐标转屏幕坐标）
   */
  private updatePosition(): void {
    // 获取单位的世界坐标
    const unitX = this.actor.x;
    const unitY = this.actor.y;

    const unitHeightOffset = this.actor.hpBarUIHeight * this.actor.size; // 单位高度偏移

    // 转换为屏幕坐标（传入计算好的偏移量）
    const screenPos = worldToScreen(unitX - 30, unitY + unitHeightOffset, 0);

    //判断是否在控制台的位置
    if (screenPos.screenY >= 1000 / 1800 ||
      screenPos.screenY <= 300 / 1800 ||
      this.actor.life < 0.05 ||
      this.actor.isUnitType(UNIT_TYPE_DEAD()) ||
      screenPos.screenX >= 1850 / 2400 ||
      screenPos.screenX <= 70 / 2400
    ) {
      this.frame.setVisible(false);
      return;
    }

    if (this.actor == undefined || this.actor.id == 0) {
      this.destroy();
      return;
    }
    if (DzFrameIsVisible(this.frame.handle) == false) {
      this.frame.setVisible(true);
    }

    this.frame.setAbsPoint(FRAME_ALIGN_BOTTOM, screenPos.screenX, screenPos.screenY);

  }

  /**
   * 设置所有Frame的大小
   * @param scale 缩放因子
   */
  public setScale(scale: number): void {
    // 再夹一次：本方法是 public 的，不能让任何调用方把 0 或负数递进来 ——
    // 下面 .setFont() 的字号是 `0.01 * scale`，scale 一旦 <= 0 字号就非正，
    // 那是会闪退的（见 SCALE_MIN 的注释）。
    const s = UnitBlood.clampScale(scale);

    // this.frame.setSize((130 / 2400) * scale, (28 / 1800) * scale);
    // this.lifeFrame.setSize((100 / 2400) * scale, (12 / 1800) * scale);
    // this.manaFrame.setSize((100 / 2400) * scale, (8 / 1800) * scale);
    this.frame.setScale(s);
    this.lifeFrame.setScale(s);
    this.manaFrame.setScale(s);
    this.shieldFrame.setScale(s);
    this.nameBoxFrame.setScale(s);
    // 普通单位没有等级 frame（见构造函数）
    if (this.levelFrame !== undefined) {
      this.levelFrame.setFont("resource\\Texture\\ui\\hpbar\\ZiTi.TTf", 0.01 * s, 0);
    }
    this.nameFrame.setFont("resource\\Texture\\ui\\hpbar\\ZiTi.TTf", 0.01 * s, 0);

  }

}