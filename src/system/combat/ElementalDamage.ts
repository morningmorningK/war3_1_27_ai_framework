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
 *       × (1 + vuln)                 // elemVulnStat(element)，**受击方**的元素易伤
 *       × (1 - reduction)            // DAMAGE_REDUCTION，钳到 ≤0.8
 *       × reactionMultiplier         // none → 1；amplify → ratio×emAmplify；transform → emTransform
 * final = max(0, round(final))
 * ```
 *
 * **系数类属性一律是 0~1 的小数**（`0.5` = +50%），不是百分数。
 * 这是属性系统 `StatSheet` 的约定，别在这里再除一次 100。
 *
 * ## 剧变反应为什么单独一个分支
 *
 * `kind === "transform"`（超载 / 感电 / 超导 / 碎冰）的伤害**不吃加成、不暴击、
 * 不受擢升** —— 前三项直接跳过，只有抗性、免伤和 `emTransform(元素精通)` 生效。
 * 这是它和增幅反应（蒸发 / 融化）的分水岭。
 *
 * ⚠️ `transform` 说的是「**反应自己造的那一段**」的结算方式，不是「反应类别」。
 * 触发增幅的**那一击本身**走 `amplify`；触发了剧变的那一击本身**仍是 `none`**
 * （冻结挂 `FreezeBuff`，对那一击的伤害零影响）。详见 `DealInput.kind` 的注释。
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

import {
  ElementId,
  StatId,
  StatType,
  elemDamageStat,
  elemResistStat,
  elemVulnStat,
} from "src/system/stat";
import {
  REACTION_TABLE,
  ReactionId,
  emAmplify,
  emTransform,
} from "src/system/element/reactionTable";
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
  /**
   * **这一段伤害**被反应改成什么样 —— 不是「触发了哪一类反应」。
   *
   * 三个取值说的是**两段不同的伤害**，这是理解它的关键：
   *
   *   - `"none"`（默认）—— 普通段，什么反应都没改它。
   *     既包括「没触发反应」，也包括「触发了剧变但**来袭那一击本身**没被改」
   *     （冻结就属这一类：效果是挂 `FreezeBuff`，那段伤害照旧是普通元素伤害）。
   *   - `"amplify"` —— **来袭那一击**触发了增幅反应（蒸发/融化），倍率会乘上来。
   *   - `"transform"` —— **剧变反应自己造的那一段**（`ReactionEffects.ts` 派发：
   *     超载 / 超导 / 感电 / 碎冰）。它不是「来袭那一击」，是反应额外打出的第二段，
   *     所以它的 `base` 是反应按 `transformBase(等级) × transformCoeff` 算的，
   *     不是原攻击的基数。
   *
   * ⚠️ **前两者的主语是「来袭那一击」，第三者的主语是「反应自己那一段」。**
   * 上一轮定的是「来袭那一击永远只可能是 `none|amplify`」—— 那句话仍然成立；
   * 本轮补上另一半，不是把它推翻。
   *
   * 两者混用的后果不只是「标错」—— `transform` 会让 `dealRaw()` 跳过
   * 元素加成 / 暴击 / 擢升，于是**那一发水弹/冰弹自己变成裸伤**，
   * 不崩不报错，只是数字对不上。所以管线只在自己确实在结算剧变段时才传 `transform`
   * （`DamagePipeline_dealElemental` 的 `segmentKind` 参数，且**只有**认领到
   * `PendingSpellElement.kind === "transform"` 的载荷时才是它）。
   */
  kind: ReactionKind;
  /**
   * 反应 id（`todo §2.2` D 阶段）。**可选** —— 这是刻意的：
   *
   *   - 无反应时不需要；
   *   - 更重要的是 `ElementalDamageTestExample.ts` 有 6 处 `DealInput` 字面量、
   *     40 条断言**没带这个字段**，设成必填会全线编译失败。
   *
   * ⚠️ 剧变反应（如冻结）**会带 id 但 `kind` 是 `"none"`** —— 那是正确组合，
   * 表示「触发了冻结，但这一段伤害没被改动」。
   *
   * ⚠️ **只传 id，不传倍率**。倍率（`REACTION_TABLE[id].ratio × emAmplify(EM)`）
   * 必须留在 `reactionMultiplier()` 内部算 —— 让调用方能塞任意倍率，
   * 就是最容易产生「静默错数」的形状（见文件头第 1 条理由）。
   */
  reactionId?: ReactionId;
  /** 能不能暴击。剧变反应内部会强制不暴击，这个标志是给增幅/普通用的 */
  canCrit: boolean;
  /**
   * 暴击掷骰结果，0~1。
   * **由调用方注入而不是函数内部掷** —— 纯函数自己掷骰就没法写可复现的断言了。
   */
  critRoll: number;
  /** 有效减伤率 0~1。元素传 `effectiveElementResist()`，物理见文件头 */
  effectiveResist: number;
  /**
   * 元素易伤（`elemVulnStat(element)`）—— **受击方**的属性，「受到的该元素伤害增加」。
   *
   * ## ⚠️ 为什么由调用方传，而不是函数内部现取
   *
   * `stats.get()` 读的是**实时**的 `StatSheet.getFinal()`。而「激化」是在
   * `resolveElement()` 里给目标挂上 buff 的 —— 内部现取就会读到**刚刚挂上去**的那条，
   * 于是「触发激化的那一发**自己**也吃了增伤」。口径要的是「**后续**雷 / 草攻击」，
   * 所以管线必须在 `resolveElement` **之前**把值取好、再传进来
   * （`DamagePipeline_dealElemental` 的 `vulnBefore`）。
   *
   * ## 可选是刻意的
   *
   * 缺省 = 现取（老行为不变）。`ElementalDamageTestExample.ts` 有 6 处 `DealInput`
   * 字面量没带这个字段，设成必填会全线编译失败。不经过反应判定的路径
   * （数值自测、将来可能的遗物追加伤害）不必操心它。
   *
   * ⚠️ **只对非剧变段生效**（与元素加成 / 暴击 / 擢升同一个 `if` 块）——
   * 用户 2026-10-08 定的口径：激化不作用于剧变伤害段。
   */
  elementalVuln?: number;
}

/**
 * 取这一段的元素易伤：调用方预取的优先，否则现读 `stats`。
 *
 * 抽成函数是为了让「为什么有时要预取」这件事**只有一个出口** —— 见
 * `DealInput.elementalVuln` 的注释（触发激化的那一发不能吃自己挂的增伤）。
 */
function ElementalDamage_elementalVuln(input: DealInput, stats: DamageCalcStats): number {
  const preset = input.elementalVuln;
  if (preset !== undefined) {
    return preset;
  }
  return stats.get(elemVulnStat(input.element));
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
    dmg *= 1 + ElementalDamage_elementalVuln(input, stats);
  }

  // 全局减伤，所有人吃
  dmg *= 1 - clampRange(stats.get(StatType.DAMAGE_REDUCTION), 0, MAX_DAMAGE_REDUCTION);

  dmg *= reactionMultiplier(input.kind, stats, input.reactionId);

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
 * 元素反应倍率。**增幅/剧变两条精通曲线在整个仓里只有这里与 `emTransform()` 两个入口。**
 *
 * ```
 * none      → 1
 * amplify   → REACTION_TABLE[id].ratio × emAmplify(EM)     // 蒸发 2.0/1.5、融化 2.0/1.5
 * transform → emTransform(EM)                              // 剧变反应**自身**那段伤害的系数
 * ```
 *
 * ## ⚠️ `transform` 分支今天**不可达**，且不该被「改成可达」
 *
 * `kind` 描述的是「**这一段伤害**被反应改成什么样」，而剧变反应对**来袭那一击**
 * 零影响 —— 所以 `DamagePipeline_dealElemental` 只透传 `amplify`，
 * `DealInput.kind` 永远不可能是 `transform`（唯一构造出 `transform` 的调用点是
 * 数值自测里手写的字面量）。
 *
 * 这条分支保留给 D+ 阶段「剧变反应自己的伤害段」：那时它会以
 * `{ base: 反应基础伤害 × 等级系数, kind: "transform" }` 的形式走到这里，
 * 由本分支补上精通项。**用 `emTransform` 而不是 `emAmplify`** —— 剧变系数大得多
 * （EM=200 时 2.45 vs 1.35），写错了不会崩，只是数值差两倍多。
 *
 * ⚠️ `ELEMENTAL_MASTERY` **只在这里生效，不进普通伤害** —— 这是硬口径，
 * 别顺手把它加到 `deal()` 的乘区里去。
 *
 * ⚠️ **`amplify` 但没给 `reactionId` → 返回 1**，绝不返回 `NaN` / `0`。
 * 缺 id 是调用方的 bug，但反应热路径上「静默给 0」比「不放大」危险得多。
 * 同理，id 查不到定义也退回 1。
 *
 * ⚠️ 倍率**只在这里算**，不接受调用方传入 —— 见 `DealInput.reactionId` 的注释。
 */
export function reactionMultiplier(
  kind: ReactionKind,
  stats: DamageCalcStats,
  reactionId?: ReactionId
): number {
  if (kind === "none") {
    return 1;
  }

  const em = stats.get(StatType.ELEMENTAL_MASTERY);

  if (kind === "amplify") {
    if (reactionId === undefined) {
      return 1;
    }
    const def = REACTION_TABLE[reactionId];
    if (def === undefined) {
      return 1;
    }
    // `ratio` 是可选字段（剧变反应没有它）。缺失时退回 1 = 不放大，不给 NaN。
    if (def.ratio === undefined) {
      return 1;
    }
    return def.ratio * emAmplify(em);
  }

  return emTransform(em);
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
