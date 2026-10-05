/**
 * 属性系统。对外只暴露这一层。
 *
 * 用法：
 * ```ts
 * const sheet = actor.statSheet;                       // 惰性建表 + 首次快照原生 base
 * sheet.setSource("relic:war_fang", [                  // 一条来源，整组挂载
 *   { stat: StatType.STRENGTH, kind: StatModKind.FLAT, value: 5,
 *     sourceKind: StatSourceKind.RELIC, sourceId: "war_fang" },
 * ]);
 * sheet.removeSource("relic:war_fang");                // 摘除，一句搞定
 * const str = sheet.getFinal(StatType.STRENGTH);       // 惰性重算，永远是最新值
 * ```
 */

export * from "./types";
export { StatSheet } from "./StatSheet";
export { StatSystem } from "./StatSystem";
