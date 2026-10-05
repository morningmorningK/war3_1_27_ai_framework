/**
 * 元素伤害结算 —— **纯函数，一次引擎调用都没有**。
 *
 * ## 为什么单独拎出来
 *
 * 公式是整条链路里唯一「错了会静默给出错数」的部分：数值算歪了不会崩、不会报错，
 * 只会在某天有人发现「怎么打不死人」。把它做成不碰引擎的纯函数，
 * 就能用普通断言把手算值钉死（见 `src/test/ElementalDamageTestExample.ts`），
 * 不必每次都进游戏看飘字。
 *
 * ## 公式
 *
 * ```
 * final = base
 *       × (1 + elemBonus)            // elemDamageStat(element)
 *       × (crit ? 1 + critDmg : 1)   // CRIT_RATE 掷骰，CRIT_DMG 默认 0.5
 *       × (1 - effResist)            // 元素用抗性−穿透；物理用护甲减伤−穿透
 *       × (1 + amplify)              // DAMAGE_AMPLIFY，独立乘区
 *       × (1 - reduction)            // DAMAGE_REDUCTION，钳到 ≤0.8
 *       × reactionMultiplier         // 本轮恒 1
 * final = max(0, round(final))
 * ```
 *
 * **系数类属性一律是 0~1 的小数**（`0.5` = +50%），不是百分数。
 * 这是属性系统 `StatSheet` 的约定，别在这里再除一次 100。
 *
 * ## 剧变反应为什么单独一个分支
 *
 * `kind === "transform"`（超载 / 感电 / 超导…）的伤害**不吃加成、不暴击、不受擢升**，
 * 只由 `f(等级, 元素精通)` 决定 —— 这是它和增幅反应（蒸发 / 融化）的分水岭。
 * 本轮 `kind` 恒 `"none"`，两个分支走的是同一条路，但分叉现在就摆好，
 * 免得 D 阶段回头改所有调用点。
 *
 * ## 物理伤害走「比例反算」（2026-10-05 定案）
 *
 * 实测（memory `wc3-damage-event-semantics`）：`GetEventDamage()` 拿到的**已经是减完护甲的值**。
 * 于是物理有两条互斥的路，**选错了就是双重削甲**：
 *
 * | 路线 | `base` | 要不要传 `effectiveArmorResist()` |
 * |---|---|---|
 * | 沿用引擎物理 | `nativeDamage`（已含护甲） | **不要**，传 0 |
 * | 完全自算物理 | 攻方攻击力（自主） | **要** |
 *
 * 两条都被否了，走的是第三条：**`armorCorrectionRatio()` 只替换护甲那一项**。
 *
 * ```
 * engine = 0.06a/(1+0.06a)                    ← 引擎实际用的减伤
 * wanted = armorReduction(max(0, a - pen))    ← 我们想要的
 * base   = nativeDamage × (1-wanted)/(1-engine)
 * ```
 *
 * 为什么不是「完全自算」：**1.27a 读不到单位的原始攻击力**，也读不到护甲**类型**
 * （`BlzGetUnitBaseDamage` 是 1.29+；KKWE 没有 EX 版；`ConvertAttackType` 只做 handle 转换）。
 * 攻击类型×护甲类型那张倍率表查不到就只能硬编码，版本一改就漂 —— 不值当。
 *
 * 为什么这条最稳：
 *   - **`pen = 0` 时 `(1-wanted)/(1-engine) === 1`，逐位恒等** —— 没点穿透就一丝不差。
 *   - 引擎算好的暴击、光环、攻击类型倍率、伤害骰浮动**全在 `nativeDamage` 里**，
 *     乘一个比例不会动它们（乘法可交换）。
 *   - **`ARMOR` 属性本来就生效**（`StatSheet` 把它写回 `SetUnitState(DEFEND_WHITE)`，
 *     引擎算 `nativeDamage` 时已经含了）；这条只额外救活 `ARMOR_PEN`。
 *
 * 负护甲（引擎其实是**增伤**）不在这条公式的射程内，见 `armorCorrectionRatio()`。
 */

import { ElementId, StatId, StatType, elemDamageStat, elemResistStat } from "src/system/stat";
import { ReactionKind } from "./DamageContext";

/** 减伤上限。与 `StatSheet` 对 `DAMAGE_REDUCTION` 的钳制**必须一致**，否则两处各说各话 */
export const MAX_DAMAGE_REDUCTION = 0.8;

/**
 * 属性读取口。
 *
 * 故意只要求一个 `get(stat)` —— 这样纯函数不必认识 `Actor` / `StatSheet`，
 * 自测能塞一个假的进去，生产环境传 `actor.statSheet` 即可（它本来就有 `getFinal`，
 * 调用方包一层 `(s) => sheet.getFinal(s)`）。
 */
export interface DamageCalcStats {
  get(stat: StatId): number;
}

export interface DealInput {
  /** 结算基数。物理传什么见文件头那张表 */
  base: number;
  element: ElementId;
  kind: ReactionKind;
  /** 能不能暴击。剧变反应内部会强制不暴击，这个标志是给增幅/普通用的 */
  canCrit: boolean;
  /**
   * 暴击掷骰结果，0~1。
   * **由调用方注入而不是函数内部掷** —— 纯函数自己掷骰就没法写可复现的断言了。
   */
  critRoll: number;
  /** 有效减伤率 0~1。元素传 `effectiveElementResist()`，物理见文件头 */
  effectiveResist: number;
}

export interface DealResult {
  base: number;
  /** 最终量，已取整并钳到 ≥0 */
  amount: number;
  isCrit: boolean;
}

/** `dealRaw` 的结果。与 `DealResult` 只差一个「取不取整」 */
export interface DealRawResult {
  /** 走完全部乘区之后的值，**未取整**（浮点），也没钳到 ≥0 */
  amount: number;
  isCrit: boolean;
}

function clampRange(v: number, lo: number, hi: number): number {
  if (v < lo) return lo;
  if (v > hi) return hi;
  return v;
}

/**
 * 单段伤害结算，**不取整**。
 *
 * `stats.get()` 读的是**最终值**（`StatSheet.getFinal` 的语义：读时惰性重算，永远最新），
 * 所以这里读到的属性是当次结算那一刻的真值。
 *
 * ## 为什么管线用这个而不是 `deal()`
 *
 * 一次普攻有**两段**（物理 + 元素），若每段各自取整再加，误差会累积两回，
 * 而且 `pen = 0` 时物理段本该逐位等于 `nativeDamage`，一取整就漂掉半个点。
 * 所以管线全程用浮点，**只在最后**决定要不要取整（现在是不取整，理由见 `DamagePipeline`）。
 *
 * `deal()` 保留取整是为了数值自测与展示——那里要的是「人一眼能对上的整数」。
 */
export function dealRaw(input: DealInput, stats: DamageCalcStats): DealRawResult {
  // 剧变反应：加成、暴击、擢升全部不参与
  const isTransform = input.kind === "transform";

  let dmg = input.base;
  let isCrit = false;

  if (!isTransform) {
    // 元素伤害加成。注意 `physical` 也有自己的一格（`elemDamageStat("physical")` = 27），
    // 物理走这里不需要特判
    dmg *= 1 + stats.get(elemDamageStat(input.element));

    const critRate = stats.get(StatType.CRIT_RATE);
    if (input.canCrit && critRate > 0 && input.critRoll < critRate) {
      dmg *= 1 + stats.get(StatType.CRIT_DMG);
      isCrit = true;
    }
  }

  // 抗性，所有人吃（剧变也吃）
  dmg *= 1 - clampRange(input.effectiveResist, 0, 1);

  if (!isTransform) {
    dmg *= 1 + stats.get(StatType.DAMAGE_AMPLIFY);
  }

  // 全局减伤，所有人吃
  dmg *= 1 - clampRange(stats.get(StatType.DAMAGE_REDUCTION), 0, MAX_DAMAGE_REDUCTION);

  dmg *= reactionMultiplier(input.kind, stats);

  return { amount: dmg, isCrit };
}

/**
 * 单段伤害结算，取整版。**就是 `dealRaw()` 外面套一层取整** —— 实现只有一份，
 * 免得两个版本哪天算歪了其中一个还没人发现。
 */
export function deal(input: DealInput, stats: DamageCalcStats): DealResult {
  const r = dealRaw(input, stats);
  return {
    base: input.base,
    amount: Math.max(0, Math.round(r.amount)),
    isCrit: r.isCrit,
  };
}

/**
 * 元素反应倍率。**本轮恒返回 1** —— 反应本身属 todo §2.2 的 D 阶段。
 *
 * 留着这个空函数而不是把 1 写死在 `deal()` 里，是为了让 D 阶段的接入点**只有一个**：
 * 到时候在这里读 `ELEMENTAL_MASTERY` 与等级即可，`deal()` 一行都不用动。
 *
 * ⚠️ `ELEMENTAL_MASTERY` **只在这里生效，不进普通伤害** —— 这是硬口径，
 * 别顺手把它加到 `deal()` 的乘区里去。
 */
export function reactionMultiplier(kind: ReactionKind, stats: DamageCalcStats): number {
  return 1;
}

// ===========================================================================
// 抗性 / 穿透
// ===========================================================================

/**
 * 元素有效抗性 = `clamp(抗性 − 元素穿透, 0, 1)`。
 *
 * 钳下界是有意的：抗性被穿透到负数时**不额外增伤**（那需要另一套公式，
 * 本轮没有需求，先不做——但别以为漏了，是刻意钳的）。
 */
export function effectiveElementResist(stats: DamageCalcStats, element: ElementId): number {
  const resist = stats.get(elemResistStat(element));
  const pen = stats.get(StatType.ELEMENTAL_PEN);
  return clampRange(resist - pen, 0, 1);
}

/**
 * WC3 标准护甲减伤：`r = 0.06a / (1 + 0.06a)`。
 *
 * 实测吻合：护甲 2 → 0.107143（100 点伤害掉 89.2857），
 * 护甲 20 → 0.545455（掉 45.4545）。两条都跟真机探针的读数一致到小数第 6 位。
 *
 * 负护甲在 WC3 里是**增伤**（另有公式），本轮按 0 处理 —— 没有需求，
 * 且真要做得先探针实测负护甲在 1.27a 下的行为。
 */
export function armorReduction(armor: number): number {
  if (armor <= 0) {
    return 0;
  }
  return (0.06 * armor) / (1 + 0.06 * armor);
}

/**
 * 物理有效减伤 = 穿透后的护甲减伤。
 *
 * ⚠️ **只在「完全自算物理」那条路线上用**。若 `base` 取自 `nativeDamage`
 * （已经是减完护甲的），再调这个就是**双重削甲**。
 *
 * 本管线走的既不是「沿用引擎」也不是「完全自算」，而是 `armorCorrectionRatio()`
 * 的**比例替换**，所以**生产代码里没有调用点** —— 留着是给将来「真·完全自算」
 * 和数值自测用的。
 */
export function effectiveArmorResist(stats: DamageCalcStats): number {
  const armor = stats.get(StatType.ARMOR);
  const pen = stats.get(StatType.ARMOR_PEN);
  return armorReduction(Math.max(0, armor - pen));
}

/**
 * 护甲修正比例 —— 把引擎算好的护甲那一项**替换成我们想要的**，其余一律不动。
 *
 * ```
 * base = nativeDamage × armorCorrectionRatio(armor, pen)
 * ```
 *
 * ## 为什么是「比例」而不是「减伤」
 *
 * `nativeDamage` 里除了护甲，还压着引擎算好的暴击、光环、攻击类型×护甲类型倍率、
 * 伤害骰浮动 —— 这些我们**读不到也复刻不了**（1.27a 没有对应 native）。
 * 但它们和护甲是**相乘**关系，所以只要乘上「新护甲项 / 旧护甲项」这个比例，
 * 那些读不到的部分就原封不动地留着了。
 *
 * ## `pen = 0` 时**逐位恒等**
 *
 * `wanted` 与 `engine` 是同一个表达式，比值为 1。所以没点穿透的单位
 * 拿到的就是引擎原值，一个比特都不差 —— 这是这条路线敢用的底气。
 *
 * ## 负护甲不处理
 *
 * 护甲 ≤ 0 时直接返回 1（引擎在负护甲下是**增伤**，另有公式；且 `armorReduction()`
 * 对负数本来就返回 0，硬套会算出错的比值）。要支持得先探针实测负护甲在 1.27a
 * 下的真实行为，本轮没有这个需求。
 */
export function armorCorrectionRatio(armor: number, penetration: number): number {
  if (armor <= 0) {
    return 1;
  }
  const engine = armorReduction(armor);
  const wanted = armorReduction(armor - penetration);
  // `armor > 0` 时 `engine < 1` 恒成立（0.06a/(1+0.06a) 只趋近 1、永不等于 1），
  // 所以 `1 - engine` 不会为 0，不必再防一次除零。
  return (1 - wanted) / (1 - engine);
}
