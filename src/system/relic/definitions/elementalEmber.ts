import { Actor } from "src/system/actor";
// ⚠️ **必须是 `import type` + 直连文件路径**，不能走 `src/system/combat` 那个 barrel。
// 否则形成运行时环：`combat/index` → `DamagePipeline` → `relic/RelicSystem` …… 反过来
// `relic/index` → `registerDefaultContent` → 本文件 → `combat/index`。
// 类型导入会被 tstl 整个擦掉，环自然消失。
import type { DamageContext, DamageDealer } from "src/system/combat/DamageContext";
import { RelicDefinition } from "../types";

/** 每层附加的火伤基数。**乘区之前的数** —— 火伤加成/暴击/火抗会再叠上去 */
export const ELEMENTAL_EMBER_FIRE_PER_STACK = 15;

/**
 * 余烬：**普通攻击附带火焰伤害**，可叠 3 层。
 *
 * ## 它在阶段 B 里的角色
 *
 * 它是「元素伤害通道」的第一个真实消费者，也是 `todo.md` §2.2.3.1 那条硬口径
 * （元素伤害自成一套结算链路、不与原生物理伤害混算）的**验收载体**：
 *
 * ```
 * 一刀下来 = 物理段（引擎算的原生值，被我们按护甲修正过）
 *          + 火焰段（我们凭空加的一段，完全不碰魔兽的护甲规则）
 * ```
 *
 * 两段在 `DamageContext.hits` 里是**并列的两条**，最后相加一次性写回引擎 ——
 * 火焰段不会经过护甲，物理段也不会吃掉火焰段的加成，这就是「不混算」。
 *
 * ## 为什么只有 `onDealDamage`、没有 `getStatModifiers`
 *
 * 它给的是「额外一段伤害」，不是「攻击力 +N」。走 `getStatModifiers` 加攻击力
 * 会被魔兽的护甲规则削一遍 —— 那正是要避免的。见 `RelicDefinition.onDealDamage`
 * 的职责边界表。
 *
 * 副作用是好的：`RelicSystem.applyRelicStatMods()` 在没有 `getStatModifiers`
 * 时**第一行就 return**，所以这件遗物**完全不碰属性表**，不给单位建表、不触发冲刷。
 *
 * ## 为什么 `base` 传 15 而不是算好的伤害
 *
 * 见 `DamageDealer` 的注释：遗物只说「加什么」，乘区由管线统一算。
 * 所以「+50% 火伤」对这一段同样生效，暴击、目标火抗也照吃 —— 不用在这里抄公式。
 */
export const elementalEmberDefinition: RelicDefinition = {
  id: "elemental_ember",
  name: "余烬",
  description: "普通攻击附带 15 点火焰伤害，最多叠加 3 层。",
  icon: "ReplaceableTextures\\CommandButtons\\BTNFlameStrike.blp",
  rarity: "uncommon",
  maxStacks: 3,
  onDealDamage(
    _actor: Actor,
    stacks: number,
    ctx: DamageContext,
    deal: DamageDealer
  ): void {
    // **仅普通攻击**。技能命中也走伤害管线，但这一件说的是「附带在普攻上」的
    // 火伤 —— 让火球术也白拿 15 点没道理。
    //
    // `ctx.isAttack` 来自原生槽位 `EXGetEventDamageData(2)`，探针实测可用
    // （平A = 1、技能 = 0）；`(1) IS_PHYSICAL` 那个槽位**不可信**，别换过去。
    if (!ctx.isAttack) {
      return;
    }
    deal.add("fire", ELEMENTAL_EMBER_FIRE_PER_STACK * stacks);
  },
};
