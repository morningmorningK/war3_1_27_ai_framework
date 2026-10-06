/**
 * 战斗结算模块。对外只暴露这一层。
 *
 * 分三层各管一件事：
 *
 * | 文件 | 职责 |
 * |---|---|
 * | `damageConstants.ts` | 优先级、元素的引擎索引、取色 |
 * | `DamageContext.ts` | 一次伤害的草稿纸（易失元数据一次性抄完） |
 * | `DamagePipeline.ts` | 100 层接管：读 → 置 0 → 自算 → 写回 |
 * | `HealSystem.ts` | 回血入口 `applyHeal()` —— 伤害的反方向，但**不**走管线 |
 *
 * 元素的**定义**不在这里 —— 见 `src/system/stat/types.ts` 的 `ELEMENTS` / `ElementId`，
 * 属性表（伤害加成 / 抗性）就是按那套下标排的，这里只引不抄。
 */

export * from "./damageConstants";
export * from "./DamageContext";
export * from "./ElementalDamage";
export { applyHeal } from "./HealSystem";
export { DamagePipeline } from "./DamagePipeline";
