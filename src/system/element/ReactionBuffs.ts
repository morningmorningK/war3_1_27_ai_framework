/**
 * 元素反应挂上的四条 buff：**超导**（削甲）、**感电**（雷 DoT）、**燃烧**（火 DoT）、
 * **激化**（雷 / 草易伤）。
 *
 * 放在 `src/system/element/` 而不是 `src/system/buff/`，照 `SkillBuffs.ts` 的先例 ——
 * feature-local 的 buff 跟着自己的 feature 走。`src/system/buff/` 只放
 * 「谁都会用」的那几条（护盾、眩晕、控制）。
 *
 * ## 为什么超载和绽放没有 buff
 *
 * 它们是**一次性的**（超载：爆炸 + 击退；绽放：延迟爆炸），没有状态要维持，
 * 所以都在 `ReactionEffects.ts` 里直接做完就完了。这里只有需要**一条 buff 承载状态**
 * 的那四个：超导 / 激化是属性来源（`BuffManager` 负责挂/摘），
 * 感电 / 燃烧是自己的生命周期（DoT）。
 *
 * ## ⚠️ `Actor` 一律只当类型用（`import type`）
 *
 * `Buff` 子类持有宿主是常态，但**不能值导入 `Actor`** —— 那会造出一条
 * `actor → BuffManager → ReactionBuffs → actor` 的 require 环。
 * tstl 的 import 是**加载期就解引用**的（`local X = ____m.X`），环里读到的是
 * 半成品模块 → `X` 恒为 `nil` → 运行时「attempt to index a nil value」。
 * `StunBuff.ts:33` 已经为这件事留过说明，别踩第二遍。
 *
 * ## ⚠️ 这两条都**不走 `addXxxBuff` 收口**
 *
 * `BuffManager.addStunBuff` / `addSlowBuff` / `addRootBuff` / `addFreezeBuff` 那四个
 * 收口存在的唯一理由是**让韧性生效**。韧性管的是「无法行动」那一类控制效果：
 *
 *   - **超导的削甲不是控制** —— 目标照样移动、攻击、施法，只是护甲低了。
 *     削甲没有「时长被韧性缩短」的语义（原神口径里也不会），所以直接 `addBuff`。
 *   - **感电的 DoT 也不是控制** —— 同上。它的每跳伤害被韧性缩短没有任何依据。
 *
 * 换句话说：**这里没有漏收口，是刻意不走。** 将来若真出现「吃韧性的元素反应」，
 * 再补收口，别现在就把两者混起来。
 */

import { Buff } from "src/system/buff/Buff";
import { registerBuffDisplay } from "src/system/buff/BuffDisplayRegistry";
import { BuffPolarity, BuffTypeId } from "src/system/buff/types";
import { StatMod, StatModKind, StatType, elemVulnStat } from "src/system/stat/types";
// 跳间隔与每跳系数是一对，两个常量都住在纯函数层（那里才有 `burningSeconds()`），
// 这里只消费。见 `reactionTable.BURNING_TICK_SECONDS` 的注释。
import { BURNING_TICK_SECONDS } from "./reactionTable";
// ⚠️ 必须 `import type`（会造 require 环），理由见文件头
import type { Actor } from "src/system/actor";

/**
 * 超导的护甲乘区值：**`-0.4` → 护甲 ×0.6**（即削掉 40%）。
 *
 * ⚠️ 这是**乘区的值**，不是「削减率」。公式是 `mul *= 1 + value`，
 * 所以削 40% 要写 `-0.4` 而不是 `0.4`（写正的会变成**加护甲**，且不报错）。
 * 这与 `ControlBuffs.SLOW_MULTIPLIER` 是同一个约定。
 */
export const SUPERCONDUCT_ARMOR_MULTIPLIER = -0.4;

/** 超导削甲的持续时间（秒）。比冻结（4 秒）长得多 —— 它是个**输出窗口**，不是控制 */
export const SUPERCONDUCT_DURATION = 8;

/** 感电的持续时间（秒） */
export const ELECTRO_CHARGED_DURATION = 4;

/** 感电的跳间隔（秒） */
export const ELECTRO_CHARGED_TICK_SECONDS = 1.0;

/** 激化的持续时间（秒）。比超导（8 秒）短 —— 它加的是**伤害**，窗口太长会滚雪球 */
export const QUICKEN_DURATION = 6;

/**
 * 燃烧的 buff 图标。
 *
 * ⚠️ 叫 `BURNING_ICON` 而**不是** `BURNING_AURA_ICON`：燃烧**没有附着** ——
 * 草在触发那一下就被吃光了，烧的时候目标身上没有任何元素量。这是个普通 debuff 图标。
 */
export const BURNING_ICON = "ReplaceableTextures\\CommandButtons\\BTNIncinerate.blp";

/**
 * 超导：护甲 ×0.6，持续 8 秒。
 *
 * **纯属性 buff** —— 形状与 `ControlBuffs.SlowBuff` 完全一样：没有
 * `onApply()` / `onRemove()`，因为本类不碰原生。属性修正器由
 * `BuffManager.addBuff()` 挂上、`detach()` 摘掉，到期自动还原。
 *
 * ⚠️ 目标身上的护甲走 `StatType.ARMOR`。它是 `StatSheet` 的**漂移槽位**
 * （`DRIFT_SLOTS`，引擎自己会改），但 `FLAT` / `PERCENT` / `MULTIPLIER` 三类
 * 来源不受折算影响（折算只加在 `base` 上），所以这里挂 `MULTIPLIER` 是安全的。
 */
export class SuperconductBuff extends Buff {
  readonly typeId = BuffTypeId.SUPERCONDUCT;

  constructor(duration: number) {
    // `NEGATIVE` 会让 buff 栏显示成**红色**（`BuffBarUI.buffCategoryColor`）
    super(duration, BuffPolarity.NEGATIVE);
  }

  getStatModifiers(): StatMod[] {
    return [
      {
        stat: StatType.ARMOR,
        kind: StatModKind.MULTIPLIER,
        value: SUPERCONDUCT_ARMOR_MULTIPLIER,
      },
    ];
  }
}

/**
 * 感电：每跳一次雷伤，持续 4 秒 —— **本仓第一个 DoT buff**。
 *
 * ## 它是怎么跳的
 *
 * `Buff.tick(delta)` 由 `BuffSystem` 以固定 **0.1s** 驱动（`BuffSystem.ts:8`），
 * 基类只累加 `elapsed`。这里覆写它，在跨过 `nextTickAt` 时调一次注入的 `pulse()`。
 *
 * ⚠️ **不覆盖 `super.tick(delta)`** —— 那是 `elapsed` 的唯一推进者，
 * 漏掉它这个 buff 就永远不会到期（而这**不报错**，只是图标一直挂着、
 * 每秒都在跳）。到期判定也依赖 `elapsed`。
 *
 * ## 实际会跳几段
 *
 * 挂上时 `ReactionEffects` 已经**立即**打过一段；之后在 `elapsed` 跨过
 * **1.1 / 2.1 / 3.1** 时各跳一次，共 **3 跳**。合计 **4 段**范围雷伤。
 *
 * ⚠️ **不是 4 跳，也别按「4 秒 ÷ 1 秒 = 4 段」算。** 首跳落在 `1.1` 而不是 `1.0`：
 * `BuffManager` 以固定 0.1s 累加 `elapsed`，而浮点下 `0.1` 累加十次是
 * `0.9999999999999999` —— **小于 1.0**，那一步跨不过 `nextTickAt = 1.0`。
 * 于是 `nextTickAt = elapsed + 间隔` 把它推到 2.1、3.1…，**`duration` 秒只能跳 `duration − 1` 次**。
 *
 * ⚠️ 这一段**曾经写错成「共 4 跳，合计 5 段」**（按名义时间算的），2026-10-09 加燃烧时
 * 才实测订正。**只订正注释、不改行为** —— 改行为等于凭空给感电 +20% 伤害，
 * 那是单独一轮的事。新加 DoT（如 `BurningBuff`）时按实际跳数设计数值。
 *
 * （`BuffManager.tick` 是**先 tick 再判过期**，所以到点那一下跑得到，
 * 只是首跳的相位偏移让整个序列整体后移了一格。）
 *
 * ## ⚠️ 不用 `while` 补跳
 *
 * 「跨过了几个间隔就跳几次」在 delta 突然变大（暂停恢复、长卡帧）时会**一连串爆发
 * 出好几段伤害**。这里每次跳动后直接把 `nextTickAt` 推到「现在 + 一个间隔」——
 * 漏掉的跳数**直接丢弃**，宁可少打一次也不要在同一帧里爆一片。
 *
 * ## 每跳的「宿主还活着吗」由谁守
 *
 * 本类守**宿主**（`holder.handle` 失效就不跳）；**施法者**的守卫在注入的
 * `pulse()` 里（它才知道施法者是谁）。两者都在 tick 的最前面，理由同
 * `StunBuff.onApply()`：在已回收的句柄上调原生是 1.27a 的闪退来源之一。
 */
export class ElectroChargedBuff extends Buff {
  readonly typeId = BuffTypeId.ELECTRO_CHARGED;

  /** 挂着这条 DoT 的单位（也就是感电的目标）。只能构造注入，理由见文件头 */
  private readonly holder: Actor;

  /**
   * 每跳要做什么。**由构造方注入** —— 本类只管节奏，不认识元素反应。
   *
   * ⚠️ 类型必须写成 `(this: void) => void`，**不能写 `() => void`** ——
   * tstl 会把「存进类成员的函数」当**方法**处理，于是调用点被编成
   * `self:pulse()`（把 `self` 当第一个参数传进去），而注入进来的闭包没有 `this`，
   * 编译期直接报 TSTL 错（**不是运行期**）：
   * `Unable to convert function with no 'this' parameter to function with 'this'`。
   * 标了 `this: void` 之后 tstl 才知道这是**普通函数值**，编成 `self.pulse()`。
   */
  private readonly pulse: (this: void) => void;

  /** 下一次该跳的 `elapsed` 时刻。挂上时不跳（那一段由反应自己立即打） */
  private nextTickAt: number = ELECTRO_CHARGED_TICK_SECONDS;

  constructor(holder: Actor, duration: number, pulse: (this: void) => void) {
    super(duration, BuffPolarity.NEGATIVE);
    this.holder = holder;
    this.pulse = pulse;
  }

  tick(delta: number): void {
    // ⚠️ 基类这一行不能漏（推 `elapsed`），理由见类注释
    super.tick(delta);

    if (this.elapsed < this.nextTickAt) {
      return;
    }
    // 先推进时刻再跳动：跳的过程中若 `pulse()` 出了岔子，节奏也不会卡在同一个点上
    this.nextTickAt = this.elapsed + ELECTRO_CHARGED_TICK_SECONDS;

    const u = this.holder.handle;
    if (u === undefined || GetUnitTypeId(u) === 0) {
      // 宿主已经没了 —— 本跳不伤害。**不 return 掉整个 tick**：`elapsed` 照常推进，
      // 到点由 `BuffManager` 摘掉（死亡清理那条路也会摘）。
      return;
    }

    // 这里能直接调，是因为 `pulse` 的声明带了 `this: void`（见字段注释）。
    // 少了那个标注，这一行会编成 `self:pulse()` 并直接编译不过。
    this.pulse();
  }
}

/**
 * 燃烧：每跳一次**火**伤，打的是**宿主本人**，持续时长由被吃掉的草量推出。
 *
 * 结构与 `ElectroChargedBuff` **逐行对称**（去读那一条的注释，这里只写不一样的地方）：
 * 同样覆写 `tick()`、同样不覆盖 `super.tick(delta)`、同样用
 * `nextTickAt = this.elapsed + 间隔` 丢掉漏掉的跳数、同样持有 `holder` 并守它的句柄。
 *
 * ## 与感电的三处不同
 *
 *   1. **只打主目标**（用户 2026-10-09 定）—— `pulse()` 里不枚举敌人，
 *      所以本类连 `owner` 都不需要（感电要它来算「施法者的敌人」）。
 *   2. **挂上时不跳**，触发那一拍由**触发它的那发火弹自己**造成伤害
 *      （用户口径 2：反应不额外加伤害）。所以 `nextTickAt` 的初值就是
 *      `BURNING_TICK_SECONDS`，与感电一样，但这里**没有**「立即那一段」——
 *      感电是 1 立即 + 3 跳 = 4 段，燃烧是纯 6 跳 = 6 段（2U 草那一档）。
 *   3. **时长是算出来的**（`reactionTable.burningSeconds(consumed)`），
 *      不是常量 —— 构造参数 `duration` 由调用方传进来。
 *
 * ⚠️ **跳间隔（`BURNING_TICK_SECONDS`，0.6 秒）与每跳系数（`transformCoeff`，0.5）
 * 是一对**：用户 2026-10-10 的口径是「跳频可以调、**总伤不变**」，所以改一个必须
 * 重算另一个。实际跳数没有干净公式（浮点相位），实测表在
 * `reactionTable.burningSeconds()` 的注释里。
 *
 * ## ⚠️ 宿主守卫在这里是**必需**的，不是照抄
 *
 * 感电那一侧守卫漏了最多是「打了一段无效伤害」；燃烧这边 `pulse()` 里
 * `dealTransformSegment` 还要拿 `Actor.getById(sourceId)` —— 两边都得守。
 * 在已回收句柄上调原生是 1.27a 的闪退来源之一（`StunBuff.onApply()` 也留过说明）。
 *
 * ## ⚠️ 施法者在 DoT 期间死亡 ⟹ 后续跳**静默**地什么都不做
 *
 * `dealTransformSegment` 拿不到施法者就直接返回。这是**已知行为**、与感电一致，
 * 不是 bug —— 只是别在排查「燃烧没伤害」时把它当成漏配。
 */
export class BurningBuff extends Buff {
  readonly typeId = BuffTypeId.BURNING;

  /** 被烧的单位（也就是燃烧的目标）。只能构造注入，理由见文件头 */
  private readonly holder: Actor;

  /**
   * 每跳要做什么。**由构造方注入** —— 本类只管节奏，不认识元素反应。
   *
   * ⚠️ 类型必须写成 `(this: void) => void`，理由与 `ElectroChargedBuff.pulse` 完全相同
   * （tstl 会把「存进类成员的函数」当**方法**编成 `self:pulse()`，编译期直接报错）。
   */
  private readonly pulse: (this: void) => void;

  /** 下一次该跳的 `elapsed` 时刻。挂上时**不跳**（那一拍是来袭的火弹自己打的） */
  private nextTickAt: number = BURNING_TICK_SECONDS;

  constructor(holder: Actor, duration: number, pulse: (this: void) => void) {
    // `NEGATIVE` 会让 buff 栏显示成**红色**（`BuffBarUI.buffCategoryColor`）
    super(duration, BuffPolarity.NEGATIVE);
    this.holder = holder;
    this.pulse = pulse;
  }

  tick(delta: number): void {
    // ⚠️ 基类这一行不能漏（推 `elapsed`），理由见 `ElectroChargedBuff` 的类注释
    super.tick(delta);

    if (this.elapsed < this.nextTickAt) {
      return;
    }
    // 先推进时刻再跳动，理由同感电（跳的过程中出了岔子也不卡在同一个点）
    this.nextTickAt = this.elapsed + BURNING_TICK_SECONDS;

    const u = this.holder.handle;
    if (u === undefined || GetUnitTypeId(u) === 0) {
      // 宿主已经没了 —— 本跳不伤害。**不 return 掉整个 tick**：`elapsed` 照常推进，
      // 到点由 `BuffManager` 摘掉。
      return;
    }

    this.pulse();
  }
}

/**
 * 激化：目标**受到的雷 / 草伤害** ×(1 + vuln)，持续 6 秒。
 *
 * **纯属性 buff**（形状同 `SuperconductBuff`），但它是全仓第一条挂在
 * **元素易伤**（`elemVulnStat`）上的来源 —— 那一块是这一轮为它新开的，
 * 因为「受到的某元素伤害增加」用抗性（`clampFinal` 钳 ≥0）/ 出伤加成（攻方属性）
 * 都表达不出来（见 `stat/types.ts` 的 `ELEM_VULN_BASE`）。
 *
 * ⚠️ **`vuln` 由构造注入**（`reactionTable.quickenVuln(触发者 EM)` 算出来的）——
 * 本类不认识元素精通，只管「挂多久、加多少」。把曲线搬进来的话，
 * 「读谁的 EM」这件事就会在 buff 里被重新猜一遍。
 *
 * ⚠️ **雷、草两条来源都要挂**。只挂一条的表现是「激化后打雷弹有加成、打草弹没有」，
 * 看起来像元素克制而不像 bug —— 静默的错。
 *
 * ⚠️ 与超导一样**刻意不走 `addXxxBuff` 收口**：增伤不是控制，不该吃韧性。
 */
export class QuickenBuff extends Buff {
  readonly typeId = BuffTypeId.QUICKEN;

  /** 增伤幅度（0.15 = +15%）。构造注入，见类注释 */
  private readonly vuln: number;

  constructor(duration: number, vuln: number) {
    // `NEGATIVE` 会让 buff 栏显示成**红色**（`BuffBarUI.buffCategoryColor`）
    super(duration, BuffPolarity.NEGATIVE);
    this.vuln = vuln;
  }

  getStatModifiers(): StatMod[] {
    return [
      // `FLAT` 而不是 `PERCENT`：`elemVulnStat` 是「本身就是百分比」的属性，
      // base 恒为 0，`PERCENT` 乘在 0 上永远是 0（`types.ts` 的硬约束 2）
      { stat: elemVulnStat("thunder"), kind: StatModKind.FLAT, value: this.vuln },
      { stat: elemVulnStat("grass"), kind: StatModKind.FLAT, value: this.vuln },
    ];
  }
}

/**
 * 注册这四条 buff 的展示。**幂等**（`Map.set` 后写覆盖），可以重复调。
 *
 * ⚠️ 图标名是从 `dev_lib/KKWE/plugin/w3x2lni.../prebuilt/default/ability.ini` 里
 * **核实过存在**的，不是随手编的 —— 写一个不存在的路径会在 buff 栏上画一个空白格
 * （护盾图标踩过这个坑，见 `BuffDisplayRegistry.registerDefaultBuffDisplays`）。
 */
export function registerReactionBuffDisplays(): void {
  registerBuffDisplay(BuffTypeId.SUPERCONDUCT, {
    name: "超导",
    description: "冰元素与雷元素反应产生。护甲降低 40%，持续 " + SUPERCONDUCT_DURATION + " 秒。",
    icon: "ReplaceableTextures\\CommandButtons\\BTNFrostBolt.blp",
  });
  registerBuffDisplay(BuffTypeId.ELECTRO_CHARGED, {
    name: "感电",
    description:
      "水元素与雷元素反应产生。持续 " + ELECTRO_CHARGED_DURATION + " 秒，每秒对周围敌人造成一次雷元素伤害。",
    icon: "ReplaceableTextures\\CommandButtons\\BTNChainLightning.blp",
  });
  registerBuffDisplay(BuffTypeId.QUICKEN, {
    name: "激化",
    description:
      "草元素与雷元素反应产生。持续 " + QUICKEN_DURATION +
      " 秒，期间受到的雷元素、草元素伤害提升（幅度取决于触发者的元素精通）。",
    icon: "ReplaceableTextures\\CommandButtons\\BTNPurge.blp",
  });
  // ⚠️ 这一条的**时长是变动的**（由被吃掉的草量推出），所以描述里写不出具体秒数 ——
  // 别照抄上面那三条去拼一个常量，那会写死一个不存在的固定时长。
  registerBuffDisplay(BuffTypeId.BURNING, {
    name: "燃烧",
    description:
      "草元素与火元素反应产生。草附着在触发时被一次烧尽，" +
      "随后每 " + BURNING_TICK_SECONDS + " 秒对目标造成一次火元素伤害。",
    icon: BURNING_ICON,
  });
}
