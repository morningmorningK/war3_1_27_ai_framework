import { Group, Rectangle, Timer } from "@eiriksgata/wc3ts/*";
import { Actor } from "src/system/actor";
import { eventBus } from "src/system/event/EventBus";
import { ScreenCoordinates } from "src/system/ui/ScreenCoordinates";
import { createLogger } from "src/utils/logger";
import { Button } from "./Button";
import { BloodBarCategory, UnitBlood } from "./UnitBlood";

const log = createLogger("UnitBloodToggleUI");

/**
 * 右上角的血条分类开关：两个按钮，分别控制英雄 / 普通单位的头顶血条。
 *
 * 「关」= 把该分类已经建好的血条**销毁**，「开」= 对场上所有该分类的单位**重建**
 * （用户选定的语义，不是「只隐藏」）。这样做的好处是关掉之后连每帧的
 * `updateUI` 开销都省了；代价是要处理两件事，见 `toggle()` 的注释。
 */

// ---------------------------------------------------------------------------
// 布局（像素，基准 1920x1080 —— 见 ScreenCoordinates 的约定）
// ---------------------------------------------------------------------------

const BUTTON_WIDTH = 140;
const BUTTON_HEIGHT = 32;
const MARGIN_RIGHT = 16;
const MARGIN_TOP = 16;
const ROW_GAP = 8;

/** 屏幕右上角：x 从**左**量起，所以是「屏宽 - 按钮宽 - 右边距」 */
const BUTTON_X = 1920 - BUTTON_WIDTH - MARGIN_RIGHT;

/** 与 UnitBlood 用的是同一支字体（能渲染中文，且已在游戏里验证过） */
const FONT_PATH = "resource\\Texture\\ui\\hpbar\\ZiTi.TTf";
const FONT_SIZE_PX = 14;

/** 开 / 关两种状态的颜色，`setTextColor` 吃不带 `|cff` 前缀的十六进制串 */
const COLOR_ON = "00FF00";
const COLOR_OFF = "808080";

interface ToggleSpec {
  category: BloodBarCategory;
  label: string;
  y: number;
}

const TOGGLES: ToggleSpec[] = [
  { category: "hero", label: "英雄血条", y: MARGIN_TOP },
  { category: "normal", label: "普通血条", y: MARGIN_TOP + BUTTON_HEIGHT + ROW_GAP },
];

export class UnitBloodToggleUI {
  private static instance: UnitBloodToggleUI | undefined;

  /** 与 TOGGLES 同序，下标一一对应 */
  private buttons: Button[] = [];
  private created = false;

  /** attachToAllUnits() 只允许生效一次（它会订阅事件、还会枚举全图） */
  private autoAttachBound = false;

  private constructor() {}

  public static getInstance(): UnitBloodToggleUI {
    if (!UnitBloodToggleUI.instance) {
      UnitBloodToggleUI.instance = new UnitBloodToggleUI();
    }
    return UnitBloodToggleUI.instance;
  }

  public create(): void {
    // 幂等：热重载或重复调用时会再进来一次，这里挡住，避免建出第二套按钮
    if (this.created) {
      log.warn("已创建过，重复调用被忽略");
      return;
    }
    this.created = true;

    for (const spec of TOGGLES) {
      const button = Button.createWithPreset(
        spec.label,
        BUTTON_X,
        spec.y,
        "SMALL",
        ScreenCoordinates.ORIGIN_TOP_LEFT
      );
      // BUTTON_SIZES 里没有 140x32 这个尺寸，建完再改
      button.setSize(BUTTON_WIDTH, BUTTON_HEIGHT);
      button.setTexturePreset("SHUIMO_STYLE_PANEL_BACKGROUND");
      button.setFont(FONT_PATH);
      button.setFontSizePixels(FONT_SIZE_PX);
      button.setOnClick(() => {
        this.toggle(spec.category);
      });
      this.buttons.push(button);
    }

    this.refresh();
    log.info("血条分类开关创建完成");
  }

  /**
   * 给「已经在场上的单位」补建血条，并订阅之后出现的单位。
   *
   * ## 为什么需要这个方法
   *
   * 血条**不是自动的**。`UnitBlood` 只在有人显式调 `Actor.createBloodBar()` 时才建条，
   * 而在这之前地图里唯一的调用方是测试脚手架 `UnitEventExample` 造的那 56 个单位。
   * 编辑器里预先摆好的单位（比如那张图上的阿克蒙德）没有任何东西会去调它 ——
   * 而且它们连 `Actor` 都不是：
   *
   *   `DamageSystem.enumExistingUnits` → `tryRegisterHandle` → `Unit.fromHandle(u)`
   *
   * 注册的是普通 `Unit`（damage.ts:148），**不进** `Actor.allActors`。所以这里必须
   * 主动枚举一遍全图单位并把它们升级成 Actor。
   *
   * ## 订阅为什么够用
   *
   * `Actor.create` 和 `Actor.fromHandle` 在成功登记一个 Actor 时都会发
   * `game:Actor:created`，而 `Actor.fromHandle` 正是「某个 `Unit` 第一次被当成
   * Actor 用」的统一入口（受伤、被选中、死亡等事件都会走到它）。所以订阅这一个
   * 事件就覆盖了「之后新出现的单位」。
   *
   * ## 调用时机
   *
   * 必须在四个 system 的 `init()` **之后**调 —— 血条每帧会读 `actor.shieldPercent`
   * （走 `BuffManager`），而 `BuffSystem` / `ShieldSystem` 要到那时才就绪。
   * 见 `main.ts` 里的调用点。
   *
   * 幂等：重复调用只生效一次。
   */
  public attachToAllUnits(): void {
    if (this.autoAttachBound) {
      return;
    }
    this.autoAttachBound = true;

    eventBus.on("game:Actor:created", ({ actor }: { actor: Actor }) => {
      this.attach(actor);
    });

    const bounds = Rectangle.getWorldBounds();
    const group = Group.create();
    if (bounds === undefined || group === undefined) {
      log.error("attachToAllUnits: 拿不到世界边界或单位组，跳过场上单位的枚举");
      return;
    }

    group.enumUnitsInRect(bounds, () => {
      const u = GetFilterUnit();
      // 这里**刻意不显式调 attach()**：`fromHandle` 会对**活着的**单位发出
      // `game:Actor:created`，上面那条订阅已经顺手把条建了。再调一次的话，
      // 对尸体也会建条 —— 而 fromHandle 不发事件正是那道闸。
      if (u != null) {
        Actor.fromHandle(u);
      }
      return false;
    });
    group.destroy();

    log.info("已为场上单位补建血条，并订阅后续出现的单位");
  }

  /**
   * 给单个 Actor 建条，并关掉它的原生预选血条（否则会和自建条叠成两条）。
   *
   * `createBloodBar()` 在「该分类的开关关着」或「单位句柄已失效」时返回
   * `undefined`（见 `UnitBlood.create`）。那种情况下**绝不能**去关原生预选 UI
   * —— 建不出来还把原生那条关了，这个单位就一条血条都不剩了。
   */
  private attach(actor: Actor): void {
    if (actor.createBloodBar() !== undefined) {
      actor.setPreselectUIVisible(false);
    }
  }

  /**
   * 切换某一类血条的开关。
   *
   * 分两段走，中间隔一个 0.01 秒的一次性定时器 —— 这不是为了节流，是必须的。
   *
   * 本方法是从 `DzFrameSetScriptByCode` 的点击分发里被调进来的，也就是说此刻
   * 正处在**引擎的 frame 事件派发过程中**，派发器自己还在遍历 frame 链表。
   * 在这个时刻增删 frame 树（下面那一轮 `createBloodBar` / `destroyBloodBar`
   * 一次要动几十棵 frame 树）是 JAPI 的经典雷区。用一次性定时器把它挪出派发
   * 过程之外，是社区里对这类操作的标准做法 —— 本仓库 `main.ts` 里那句
   * `Timer.create().start(0.01, false, ...)` 也是同样的用法。
   *
   * 开关状态本身**立刻**改：这样同一帧内新造出来的单位读到的就是新状态，
   * 「关闭期间新造的单位不会凭空长条」这条不受推迟影响。
   */
  private toggle(category: BloodBarCategory): void {
    const next = !UnitBlood.isCategoryEnabled(category);
    UnitBlood.setCategoryEnabled(category, next);

    Timer.create().start(0.01, false, () => {
      this.applyCategory(category, next);
    });
  }

  /**
   * 定时器里真正做事的部分。两件必须小心的事：
   *   1. 遍历 Actor 之前先取快照 —— 建/销血条会改动集合，单位也可能中途消失
   *   2. 重建时 frame 名字不能重复 —— 由 UnitBlood 的代数计数器保证
   */
  private applyCategory(category: BloodBarCategory, next: boolean): void {
    // 1. 先取快照。createBloodBar / destroyBloodBar 会增删 UnitBlood.allUnitBlood，
    //    而 Actor.detach（单位移除）也会 delete Actor.allActors —— 边遍历边改会漏项
    //    甚至读到已失效条目。UnitBlood.updateAllUnitBloods() 出于同样原因也这么做。
    const snapshot: Actor[] = [];
    for (const id in Actor.allActors) {
      const actor = Actor.allActors[id];
      if (actor === undefined) {
        continue;
      }
      if (UnitBlood.categoryOf(actor) === category) {
        snapshot.push(actor);
      }
    }

    // 2. 逐个建或销
    for (const actor of snapshot) {
      if (next) {
        actor.createBloodBar();
      } else {
        actor.destroyBloodBar();
      }
    }

    this.refresh();
    log.info(`${category} 血条开关 -> ${next ? "开" : "关"}，涉及 ${snapshot.length} 个单位`);
  }

  /** 按当前开关状态刷新两个按钮的文案与颜色 */
  private refresh(): void {
    for (let i = 0; i < TOGGLES.length; i++) {
      const spec = TOGGLES[i];
      const button = this.buttons[i];
      if (button === undefined) {
        continue;
      }
      const on = UnitBlood.isCategoryEnabled(spec.category);
      button.setText(`${spec.label} ${on ? "开" : "关"}`);
      button.setTextColor(on ? COLOR_ON : COLOR_OFF);
    }
  }

  public destroy(): void {
    for (const button of this.buttons) {
      button.destroy();
    }
    this.buttons = [];
    this.created = false;
  }
}
