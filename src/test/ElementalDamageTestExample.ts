/**
 * 元素伤害公式自测（阶段 B / Step 2）。
 *
 * **纯计算，一次引擎调用都没有** —— 不给 `Actor`、不建单位、不读原生。
 * 所以它可以在任何时机跑，也不会因为场上没单位而失败。
 *
 * 期望值全部是**手算**写死的，不是从实现里抄回来的。抄回来就变成
 * 「实现改了就跟着改」，测不出任何东西。
 *
 * 每个乘区单独一条断言（加成 / 暴击 / 抗性 / 擢升 / 减伤），
 * 之后再来一条全叠加的，这样某一条算歪了能直接看出是哪一条。
 */

import { STAT_COUNT, StatId, StatType, elemDamageStat, elemResistStat } from "src/system/stat";
import {
  DamageCalcStats,
  DealInput,
  DealResult,
  armorCorrectionRatio,
  armorReduction,
  deal,
  dealRaw,
  effectiveArmorResist,
  effectiveElementResist,
} from "src/system/combat";
import { createLogger } from "src/utils/logger";

const log = createLogger("ElemDmgTest");

let passed = 0;
let failed = 0;

/**
 * 三条断言辅助。**只有失败才打日志** —— 理由见 `StatSystemTestExample` 里同名注释：
 * 自测每局都跑，全绿的四十行是噪音，反而把真失败淹了。末尾的汇总行照旧报通过条数。
 */
function check(label: string, expected: number, actual: number): void {
  // 结果是取整过的整数，容差给 0.001 足够——算出来 178.2 期望 178 是「通过」
  const ok = Math.abs(expected - actual) < 0.001;
  if (ok) {
    passed++;
    return;
  }
  failed++;
  log.error(`[失败] ${label}：期望 ${expected}，实际 ${actual}`);
}

function checkFloat(label: string, expected: number, actual: number): void {
  const ok = Math.abs(expected - actual) < 1e-6;
  if (ok) {
    passed++;
    return;
  }
  failed++;
  log.error(`[失败] ${label}：期望 ${expected}，实际 ${actual}`);
}

function checkBool(label: string, expected: boolean, actual: boolean): void {
  const ok = expected === actual;
  if (ok) {
    passed++;
    return;
  }
  failed++;
  log.error(`[失败] ${label}：期望 ${expected}，实际 ${actual}`);
}

/**
 * 假属性表。**密集数组，先铺满再按 id 填** —— 不能按下标写、留 undefined，
 * 那样 `.length` 在 Lua 里会是 0（memory `wc3-tstl-sparse-array-length`）。
 */
function fakeStats(entries: Array<[StatId, number]>): DamageCalcStats {
  const vals: number[] = [];
  for (let i = 0; i < STAT_COUNT; i++) {
    vals.push(0);
  }
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    if (e !== undefined) {
      vals[e[0]] = e[1];
    }
  }
  return {
    get: (s: StatId): number => {
      const v = vals[s];
      return v === undefined ? 0 : v;
    },
  };
}

/** 一个不设任何属性的表：所有乘区都是「不生效」状态 */
function bareStats(): DamageCalcStats {
  return fakeStats([]);
}

/** 打一发火伤，只给最常调的三个量 */
function fire(base: number, stats: DamageCalcStats, resist: number, roll: number): DealResult {
  return deal(
    { base, element: "fire", kind: "none", canCrit: true, critRoll: roll, effectiveResist: resist },
    stats
  );
}

export function elementalDamageSelfTest(): void {
  passed = 0;
  failed = 0;
  log.info("=== 元素伤害公式自测开始 ===");

  testBaseOnly();
  testElementBonus();
  testCrit();
  testResist();
  testAmplify();
  testReduction();
  testCombined();
  testTransform();
  testClamp();
  testMasteryDoesNotApply();
  testArmorFormula();
  testPenetration();
  testArmorCorrection();
  testDealRawDoesNotRound();

  log.info(`=== 元素伤害公式自测结束：通过 ${passed}，失败 ${failed} ===`);
}

// ==================== 各乘区单独验证 ====================

function testBaseOnly(): void {
  check("无任何属性：100 进 100 出", 100, fire(100, bareStats(), 0, 0).amount);
}

function testElementBonus(): void {
  // elemDamageStat("fire") = 27 + 1（physical 占 0）
  const s = fakeStats([[elemDamageStat("fire"), 0.5]]);
  check("火伤加成 +50%：100 → 150", 150, fire(100, s, 0, 0).amount);
}

function testCrit(): void {
  const critOn = fakeStats([
    [StatType.CRIT_RATE, 1],
    [StatType.CRIT_DMG, 0.5],
  ]);
  const r1 = fire(100, critOn, 0, 0);
  check("必暴（暴伤 +50%）：100 → 150", 150, r1.amount);
  checkBool("必暴时 isCrit 标记为真", true, r1.isCrit);

  // 掷骰 0.9 而暴击率 0.5 → 不暴
  const critHalf = fakeStats([
    [StatType.CRIT_RATE, 0.5],
    [StatType.CRIT_DMG, 0.5],
  ]);
  const r2 = fire(100, critHalf, 0, 0.9);
  check("暴击率 0.5 掷出 0.9：不暴，100 → 100", 100, r2.amount);
  checkBool("没暴时 isCrit 标记为假", false, r2.isCrit);
}

function testResist(): void {
  check("抗性 25%：100 → 75", 75, fire(100, bareStats(), 0.25, 0).amount);
}

function testAmplify(): void {
  const s = fakeStats([[StatType.DAMAGE_AMPLIFY, 0.3]]);
  check("擢升 +30%：100 → 130", 130, fire(100, s, 0, 0).amount);
}

function testReduction(): void {
  const s = fakeStats([[StatType.DAMAGE_REDUCTION, 0.2]]);
  check("免伤 20%：100 → 80", 80, fire(100, s, 0, 0).amount);
}

// ==================== 全叠加 ====================

function testCombined(): void {
  // 手算：100 ×1.5(火伤) ×1.5(暴伤) ×0.8(抗性20%) ×1.1(擢升10%) ×0.9(免伤10%)
  //     = 100 → 150 → 225 → 180 → 198 → 178.2 → round → 178
  const s = fakeStats([
    [elemDamageStat("fire"), 0.5],
    [StatType.CRIT_RATE, 1],
    [StatType.CRIT_DMG, 0.5],
    [StatType.DAMAGE_AMPLIFY, 0.1],
    [StatType.DAMAGE_REDUCTION, 0.1],
  ]);
  check("五乘区叠加：100 → 178", 178, fire(100, s, 0.2, 0).amount);
}

// ==================== 剧变反应的分岔 ====================

function testTransform(): void {
  // 剧变反应**不吃**加成 / 暴击 / 擢升，只吃抗性与免伤
  const s = fakeStats([
    [elemDamageStat("fire"), 0.5],
    [StatType.CRIT_RATE, 1],
    [StatType.CRIT_DMG, 0.5],
    [StatType.DAMAGE_AMPLIFY, 0.3],
  ]);
  const r = deal(
    { base: 100, element: "fire", kind: "transform", canCrit: true, critRoll: 0, effectiveResist: 0 },
    s
  );
  check("剧变不吃加成/暴击/擢升：100 → 100", 100, r.amount);
  checkBool("剧变不暴击", false, r.isCrit);
}

// ==================== 钳制 ====================

function testClamp(): void {
  // 免伤被钳到 0.8 → 只剩 20%
  const hugeReduction = fakeStats([[StatType.DAMAGE_REDUCTION, 5]]);
  check("免伤 500% 被钳到 80%：100 → 20", 20, fire(100, hugeReduction, 0, 0).amount);

  // 抗性超 1 → 全免
  check("抗性 150% 被钳到 100%：100 → 0", 0, fire(100, bareStats(), 1.5, 0).amount);

  // 结果不为负
  check("抗性恰好 100%：100 → 0（不为负）", 0, fire(100, bareStats(), 1, 0).amount);
  check("负数基数：-50 → 0", 0, fire(-50, bareStats(), 0, 0).amount);
}

// ==================== 元素精通不该进普通伤害 ====================

function testMasteryDoesNotApply(): void {
  const s = fakeStats([[StatType.ELEMENTAL_MASTERY, 1000]]);
  check("元素精通拉满，普通伤害纹丝不动：100 → 100", 100, fire(100, s, 0, 0).amount);
}

// ==================== 护甲公式（对真机实测值） ====================

function testArmorFormula(): void {
  // 这两个数是探针在真机上量出来的：护甲 2 → 掉 89.3，护甲 20 → 掉 45.5
  check("护甲减伤(2)：100 → 89", 89, fire(100, bareStats(), armorReduction(2), 0).amount);
  check("护甲减伤(20)：100 → 45", 45, fire(100, bareStats(), armorReduction(20), 0).amount);

  checkFloat("armorReduction(2) = 0.107142857", 0.107142857142857, armorReduction(2));
  checkFloat("armorReduction(20) = 0.545454545", 0.545454545454545, armorReduction(20));

  checkFloat("护甲 0 → 无减伤", 0, armorReduction(0));
  checkFloat("负护甲 → 0（本轮不做增伤）", 0, armorReduction(-5));
}

// ==================== 穿透 ====================

function testPenetration(): void {
  const s = fakeStats([
    [elemResistStat("fire"), 0.3],
    [StatType.ELEMENTAL_PEN, 0.1],
  ]);
  checkFloat("火抗 30% 减元素穿透 10% = 20%", 0.2, effectiveElementResist(s, "fire"));

  // 穿透过量要钳在 0，**不能变成负抗性去增伤**
  const overPen = fakeStats([
    [elemResistStat("fire"), 0.1],
    [StatType.ELEMENTAL_PEN, 0.5],
  ]);
  checkFloat("穿透过量钳到 0", 0, effectiveElementResist(overPen, "fire"));

  // 物理：护甲 20 被穿透 5 → 按护甲 15 算 → 0.9/1.9
  const phys = fakeStats([
    [StatType.ARMOR, 20],
    [StatType.ARMOR_PEN, 5],
  ]);
  checkFloat("护甲 20 减穿透 5 → 按 15 算", 0.9 / 1.9, effectiveArmorResist(phys));
}

// ==================== 护甲修正比例（Step 4 物理路线的立身之本） ====================

/**
 * `armorCorrectionRatio(armor, pen)` 有一条**闭式解**，这组断言就是拿它当尺子：
 *
 * ```
 * (1-r(a))/(1-r(b)) = (1+0.06b)/(1+0.06a)      // 因为 1-r(x) = 1/(1+0.06x)
 * ⟹ 比例 = (1 + 0.06·armor) / (1 + 0.06·max(0, armor-pen))
 * ```
 *
 * 好处是**全是精确有理数**，不必依赖浮点容差去「差不多对」。
 * 护甲 20 穿透 5 恰好 = `2.2/1.9`，是这组里最漂亮的一个。
 */
function testArmorCorrection(): void {
  // 穿透为 0：**必须逐位恒等**。这是整条路线敢用的底气 ——
  // 没点穿透的单位拿到的就是引擎原值，一个比特都不差。
  checkFloat("穿透 0（护甲20）：比例恰为 1", 1, armorCorrectionRatio(20, 0));
  checkFloat("穿透 0（护甲2）：比例恰为 1", 1, armorCorrectionRatio(2, 0));

  // 护甲 20 穿透 5 → (1+1.2)/(1+0.9) = 2.2/1.9
  checkFloat("护甲20 穿透5 → 2.2/1.9", 2.2 / 1.9, armorCorrectionRatio(20, 5));
  // 护甲 2 穿透 5 → 已打穿 → (1+0.12)/1 = 1.12
  checkFloat("护甲2 穿透5（打穿）→ 1.12", 1.12, armorCorrectionRatio(2, 5));
  // 刚好打穿 → 100/2.2 再乘 2.2/1 = 100，即全量
  checkFloat("穿透恰好打穿护甲20 → 2.2", 2.2, armorCorrectionRatio(20, 20));
  // 穿透过量不额外增伤（下一行与上一行必须相等）
  checkFloat("穿透过量（30）不额外增伤 → 还是 2.2", 2.2, armorCorrectionRatio(20, 30));

  // 负护甲 / 零护甲：返回 1，不参与（引擎在负护甲下是增伤，另有公式）
  checkFloat("护甲 0 → 1（不参与）", 1, armorCorrectionRatio(0, 5));
  checkFloat("负护甲 → 1（不参与）", 1, armorCorrectionRatio(-5, 0));

  // 穿透永远不会让伤害变低
  checkBool(
    "比例恒 ≥ 1（穿透只增不减）",
    true,
    armorCorrectionRatio(20, 5) > 1 && armorCorrectionRatio(2, 5) > 1
  );

  // ★ 路线的核心恒等式：把引擎给的「100 打护甲20」修正回来，
  //   应当恰好等于「100 打护甲15」。这正是「替换护甲那一项」的意思。
  const native = 100 / 2.2; // 引擎在护甲 20 下的输出（100 的 1/(1+1.2)）
  checkFloat(
    "比例反算：护甲20 穿透5 == 直算 100 打护甲15",
    100 * (1 - armorReduction(15)),
    native * armorCorrectionRatio(20, 5)
  );
}

// ==================== dealRaw 不取整 ====================

/**
 * `deal()` 与 `dealRaw()` 只差最后那一次取整，**实现只有一份**。
 * 管线用的是 `dealRaw()` —— 每段各取整一次会让误差累积两回，
 * 还会把 `ARMOR_PEN = 0` 时物理段与原生值的逐位相等破掉。
 */
function testDealRawDoesNotRound(): void {
  const s = fakeStats([[elemDamageStat("fire"), 0.5]]);
  const input: DealInput = {
    base: 100.4,
    element: "fire",
    kind: "none",
    canCrit: false,
    critRoll: 0,
    effectiveResist: 0,
  };

  checkFloat("dealRaw 保留小数：100.4 × 1.5 = 150.6", 150.6, dealRaw(input, s).amount);
  check("deal 同一输入取整 → 151", 151, deal(input, s).amount);

  // 负数不钳（钳制是管线最后那一步的事），这里只保证两个版本对「取整」的分工清楚
  const neg = dealRaw(
    { base: -10, element: "fire", kind: "none", canCrit: false, critRoll: 0, effectiveResist: 0 },
    bareStats()
  );
  checkFloat("dealRaw 不钳负：-10 原样", -10, neg.amount);
  check("deal 把负数钳到 0", 0, deal(
    { base: -10, element: "fire", kind: "none", canCrit: false, critRoll: 0, effectiveResist: 0 },
    bareStats()
  ).amount);
}
