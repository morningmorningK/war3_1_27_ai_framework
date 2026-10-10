/**
 * 元素反应 —— **纯函数层**自测（`todo §2.2` 附着骨架 / Step 1）。
 *
 * 只测 `src/system/element/reactionTable.ts`：查表、消耗量、精通曲线、冻结时长、
 * 剧变等级基数、附着元素白名单。**纯计算，一次引擎调用都没有** —— 不给 `Actor`、
 * 不建单位、不读原生，所以它可以在任何时机跑，也不会因为场上没单位而失败。
 *
 * 期望值全部是**手算**写死的，不是从实现里抄回来的（抄回来就测不出东西）。
 *
 * ## 冻结这条尤其需要在这里钉死
 *
 * 冻结的**时长**单独在这里验：游戏内那条「冻上了没有」的自测挑的是场上任意一个单位，
 * 它身上可能带着「坚定护符」之类的韧性属性，把时长削短甚至削成 0（真实免疫）。
 * 玩真的那一层只能验「反应 id 对不对、附着扣干净没有」，秒数归这里。
 *
 * ## 剧变伤害的**数字**也归这里（2026-10-07 雷元素三兄弟）
 *
 * 超载 / 超导 / 感电的实际伤害 = `transformBase(等级) × transformCoeff × emTransform(EM)`
 * 再吃目标抗性与全局免伤。等级基数那一层（12 + 6×(lv−1)）与三条系数（2.0 / 0.5 / 1.2）
 * 都在这里钉死 —— 游戏内验不了，因为陪练单位带多少抗性、有没有免伤不受控。
 * 游戏内那层只验「反应触发了没有、是谁触发的、附着扣干净没有」。
 *
 * ## 草元素线（2026-10-08）加进来的是「形状」而不是「数字」
 *
 * 绽放（草+水）与激化（草+雷）这两条，能在这里钉的只有**表长什么样**：
 * `kind` / `effect` / `damageElement` / `transformCoeff` / `consumeRatio`。
 *
 * ⚠️ 其中**激化那条「什么都没有」是刻意的**（`transformCoeff` 与 `damageElement`
 * **都该是 `undefined`**）—— 它不自造伤害，只挂一条易伤 buff。这一条必须正面断言
 * 「确实缺字段」，否则将来有人顺手给它补个 `transformCoeff`，表现是
 * 「激化的那一发凭空多出一段草伤」，而查表路径全对、只有数字不对。
 *
 * `quickenVuln()` 是纯函数（只吃元素精通），所以它和三条精通曲线一样归这里。
 * 而**绽放的爆炸、激化的 buff** 都要真单位 —— 归 `ElementAuraTestExample`。
 *
 * ## 燃烧（草 + 火，2026-10-09）多一条「时长」要在这里钉
 *
 * 与冻结同理：燃烧时长由**被吃掉的草量**推出（`burningSeconds()`），游戏内那层
 * 挑的是场上任意单位、还带韧性之类的干扰，秒数只能在这里验。
 *
 * ⚠️ 而且这里顺带钉住一条**静默失效**的约束：`BURNING_MIN_SECONDS` 必须**大于一个
 * 跳间隔**（`BURNING_TICK_SECONDS`）。时长短于一个间隔时**一跳都跳不出来** ——
 * 表现是「燃烧触发了、飘了字、伤害为零」，而查表路径全绿。
 *
 * ⚠️ 还有一条口径落在这里：用户 2026-10-10 定了「**跳频可以调、总伤不变**」——
 * 于是「跳间隔」与「每跳系数」是**一对**常量（当前 0.6 / 0.5，2U 草 → 4 秒 → 6 跳
 * → 3.0×）。改单边会同时让这里的秒数断言和 `testLookup` 的系数断言红掉，那是故意的。
 *
 * ⚠️ 附着 buff / 反应系统（`ElementalReactionSystem`）的行为**不在这里** ——
 * 那些要真单位、真 `BuffManager`，属 Step 2 的游戏内自测。
 */

import {
  AURA_ELEMENTS,
  BURNING_GAUGE_PER_SECOND,
  BURNING_MAX_SECONDS,
  BURNING_MIN_SECONDS,
  BURNING_TICK_SECONDS,
  EM_AMPLIFY_CONST,
  EM_AMPLIFY_COEFF,
  EM_TRANSFORM_CONST,
  EM_TRANSFORM_COEFF,
  FROZEN_MAX_SECONDS,
  FROZEN_SECONDS_PER_GAUGE,
  QUICKEN_VULN_BASE,
  QUICKEN_VULN_COEFF,
  QUICKEN_VULN_CONST,
  REACTION_TABLE,
  TRANSFORM_BASE_LV1,
  TRANSFORM_BASE_PER_LEVEL,
  burningSeconds,
  consumeGauge,
  emAmplify,
  emTransform,
  frozenSeconds,
  isAuraElement,
  lookupReaction,
  quickenVuln,
  transformBase,
} from "src/system/element/reactionTable";
import { createLogger } from "src/utils/logger";

const log = createLogger("ElemReactionTest");

let passed = 0;
let failed = 0;

/** 三条断言辅助。**只有失败才打日志**（同 `ElementalDamageTestExample`）。 */
function check(label: string, expected: number, actual: number): void {
  if (Math.abs(expected - actual) < 1e-6) {
    passed++;
    return;
  }
  failed++;
  log.error(`[失败] ${label}：期望 ${expected}，实际 ${actual}`);
}

function checkText(label: string, expected: string, actual: string): void {
  if (expected === actual) {
    passed++;
    return;
  }
  failed++;
  log.error(`[失败] ${label}：期望 ${expected}，实际 ${actual}`);
}

function checkBool(label: string, expected: boolean, actual: boolean): void {
  if (expected === actual) {
    passed++;
    return;
  }
  failed++;
  log.error(`[失败] ${label}：期望 ${expected}，实际 ${actual}`);
}

export function elementalReactionSelfTest(): void {
  passed = 0;
  failed = 0;
  log.info("=== 元素反应（纯函数层）自测开始 ===");

  testLookup();
  testSwirl();
  testConsume();
  testMastery();
  testFreezeSeconds();
  testBurningSeconds();
  testTransformBase();
  testAuraWhitelist();
  testTableShape();

  log.info(`=== 元素反应（纯函数层）自测结束：通过 ${passed}，失败 ${failed} ===`);
}

// ==================== 查表：二十三个组合 + 方向 ====================

/** `ratio` 现在是可选字段（剧变反应没有它），取不到时给个哨兵值方便断言报数 */
function ratioOf(def: { ratio?: number } | undefined): number {
  return def === undefined || def.ratio === undefined ? -1 : def.ratio;
}

/** `transformCoeff` 同理：增幅反应没有它，取不到给哨兵值 -1 */
function coeffOf(def: { transformCoeff?: number } | undefined): number {
  return def === undefined || def.transformCoeff === undefined ? -1 : def.transformCoeff;
}

function testLookup(): void {
  // 蒸发：水打火 2.0、火打水 1.5
  const vwf = lookupReaction("fire", "water");
  checkText("蒸发 水打火 → vaporize_water_on_fire", "vaporize_water_on_fire", vwf ? vwf.id : "无");
  check("蒸发 水打火倍率 2.0", 2.0, ratioOf(vwf));
  check("蒸发 水打火消耗比 0.5", 0.5, vwf ? vwf.consumeRatio : -1);
  checkText("蒸发 水打火是增幅", "amplify", vwf ? vwf.kind : "无");

  const vfw = lookupReaction("water", "fire");
  checkText("蒸发 火打水 → vaporize_fire_on_water", "vaporize_fire_on_water", vfw ? vfw.id : "无");
  check("蒸发 火打水倍率 1.5", 1.5, ratioOf(vfw));

  // 融化：火打冰 2.0、冰打火 1.5
  const mfi = lookupReaction("ice", "fire");
  checkText("融化 火打冰 → melt_fire_on_ice", "melt_fire_on_ice", mfi ? mfi.id : "无");
  check("融化 火打冰倍率 2.0", 2.0, ratioOf(mfi));

  const mif = lookupReaction("fire", "ice");
  checkText("融化 冰打火 → melt_ice_on_fire", "melt_ice_on_fire", mif ? mif.id : "无");
  check("融化 冰打火倍率 1.5", 1.5, ratioOf(mif));

  // 冻结：水↔冰，**两个方向结果相同**（共用一条定义）
  const iw = lookupReaction("ice", "water");
  checkText("冻结 冰→水 → frozen", "frozen", iw ? iw.id : "无");
  const wi = lookupReaction("water", "ice");
  checkText("冻结 水→冰 → frozen", "frozen", wi ? wi.id : "无");
  checkText("冻结是剧变", "transform", iw ? iw.kind : "无");
  // 剧变反应**没有倍率** —— 它对来袭那一击零影响（管线只透传 amplify）
  check("冻结没有倍率（-1 = 字段缺失）", -1, ratioOf(iw));
  check("冻结消耗比 1.0（冻完附着清空）", 1.0, iw ? iw.consumeRatio : -1);
  checkText("冻结显示名", "冻结", iw ? iw.name : "无");
  checkBool("两个方向共用同一条定义", true, iw !== undefined && iw === wi);

  // ---- 雷元素三兄弟（2026-10-07）----
  // 超载：火↔雷，**打的是火伤**（不是雷 —— 别按来袭元素推）
  const ft = lookupReaction("fire", "thunder");
  const tf = lookupReaction("thunder", "fire");
  checkText("超载 火→雷 → overload", "overload", ft ? ft.id : "无");
  checkText("超载 雷→火 → overload", "overload", tf ? tf.id : "无");
  checkText("超载是剧变", "transform", ft ? ft.kind : "无");
  checkText("超载显示名", "超载", ft ? ft.name : "无");
  checkText("超载打火伤", "fire", ft && ft.damageElement !== undefined ? ft.damageElement : "无");
  check("超载系数 2.0", 2.0, coeffOf(ft));
  checkBool("超载两个方向共用同一条定义", true, ft !== undefined && ft === tf);

  // 超导：冰↔雷，打冰伤，系数 0.5（三兄弟里最弱）
  const it = lookupReaction("ice", "thunder");
  const ti = lookupReaction("thunder", "ice");
  checkText("超导 冰→雷 → superconduct", "superconduct", it ? it.id : "无");
  checkText("超导 雷→冰 → superconduct", "superconduct", ti ? ti.id : "无");
  checkText("超导打冰伤", "ice", it && it.damageElement !== undefined ? it.damageElement : "无");
  check("超导系数 0.5", 0.5, coeffOf(it));
  checkBool("超导两个方向共用同一条定义", true, it !== undefined && it === ti);

  // 感电：水↔雷，打雷伤，系数 1.2（**每跳**）
  const wt = lookupReaction("water", "thunder");
  const tw = lookupReaction("thunder", "water");
  checkText("感电 水→雷 → electro_charged", "electro_charged", wt ? wt.id : "无");
  checkText("感电 雷→水 → electro_charged", "electro_charged", tw ? tw.id : "无");
  checkText("感电打雷伤", "thunder", wt && wt.damageElement !== undefined ? wt.damageElement : "无");
  check("感电系数 1.2（每跳）", 1.2, coeffOf(wt));
  checkBool("感电两个方向共用同一条定义", true, wt !== undefined && wt === tw);

  // ---- 草元素线（2026-10-08）----
  // ⚠️ 标签沿用上面的「X打Y」写法：`lookupReaction(已有附着, 来袭元素)`，
  // 所以 `lookupReaction("water", "grass")` 是**草打在水的附着上**。
  // 绽放：水↔草，打草伤，系数 2.0
  const wg = lookupReaction("water", "grass");
  const gw = lookupReaction("grass", "water");
  checkText("绽放 草打水 → bloom", "bloom", wg ? wg.id : "无");
  checkText("绽放 水打草 → bloom", "bloom", gw ? gw.id : "无");
  checkText("绽放是剧变", "transform", wg ? wg.kind : "无");
  checkText("绽放显示名", "绽放", wg ? wg.name : "无");
  checkText("绽放打草伤", "grass", wg && wg.damageElement !== undefined ? wg.damageElement : "无");
  check("绽放系数 2.0", 2.0, coeffOf(wg));
  check("绽放消耗比 1.0", 1.0, wg ? wg.consumeRatio : -1);
  checkBool("绽放两个方向共用同一条定义", true, wg !== undefined && wg === gw);

  // 激化：草↔雷，**不自造伤害** —— 只挂易伤 buff，所以两个伤害字段都该缺
  const gt = lookupReaction("grass", "thunder");
  const tg = lookupReaction("thunder", "grass");
  checkText("激化 雷打草 → quicken", "quicken", gt ? gt.id : "无");
  checkText("激化 草打雷 → quicken", "quicken", tg ? tg.id : "无");
  checkText("激化是剧变", "transform", gt ? gt.kind : "无");
  checkText("激化显示名", "激化", gt ? gt.name : "无");
  check("激化消耗比 1.0", 1.0, gt ? gt.consumeRatio : -1);
  checkBool("激化两个方向共用同一条定义", true, gt !== undefined && gt === tg);
  // ⚠️ 这几条是「刻意缺字段」的**正面断言**，见文件头 —— 补上任何一个都会让激化凭空多打一段
  check("激化**没有**剧变系数（-1 = 字段缺失）", -1, coeffOf(gt));
  checkText("激化**没有**伤害元素", "无",
    gt && gt.damageElement !== undefined ? gt.damageElement : "无");
  check("激化**没有**增幅倍率（-1 = 字段缺失）", -1, ratioOf(gt));
  checkBool("激化的 effect 是 quicken", true, gt !== undefined && gt.effect === "quicken");
  checkBool("绽放的 effect 是 bloom", true, wg !== undefined && wg.effect === "bloom");

  // ---- 燃烧（草 + 火，2026-10-09）----
  // 草↔火，打**火**伤，系数 1.0（**每跳**，不是总计 —— 实际跳数见 burningSeconds 那一节）
  const gf = lookupReaction("grass", "fire");
  const fg = lookupReaction("fire", "grass");
  checkText("燃烧 火打草 → burning", "burning", gf ? gf.id : "无");
  checkText("燃烧 草打火 → burning", "burning", fg ? fg.id : "无");
  checkText("燃烧是剧变", "transform", gf ? gf.kind : "无");
  checkText("燃烧显示名", "燃烧", gf ? gf.name : "无");
  checkText("燃烧打火伤", "fire", gf && gf.damageElement !== undefined ? gf.damageElement : "无");
  check("燃烧每跳系数 0.5", 0.5, coeffOf(gf));
  check("燃烧消耗比 1.0（草被一次性吃光）", 1.0, gf ? gf.consumeRatio : -1);
  // ⚠️ 燃烧是剧变，**没有增幅倍率** —— 触发它的那一发火弹不被放大（管线只透传 amplify）
  check("燃烧没有增幅倍率（-1 = 字段缺失）", -1, ratioOf(gf));
  checkBool("燃烧两个方向共用同一条定义", true, gf !== undefined && gf === fg);
  checkBool("燃烧的 effect 是 burning", true, gf !== undefined && gf.effect === "burning");

  // 无反应组合一律 undefined
  checkBool("同元素（火打火）无反应", true, lookupReaction("fire", "fire") === undefined);
  checkBool("水打水 无反应", true, lookupReaction("water", "water") === undefined);
  checkBool("冰打冰 无反应（同元素，不是冻结）", true, lookupReaction("ice", "ice") === undefined);
  checkBool("雷打雷 无反应（同元素）", true, lookupReaction("thunder", "thunder") === undefined);
  checkBool("草打草 无反应（同元素）", true, lookupReaction("grass", "grass") === undefined);
  checkBool("物理打火 无反应", true, lookupReaction("fire", "physical") === undefined);
  checkBool("火打物理 无反应", true, lookupReaction("physical", "fire") === undefined);
  // ⚠️ 草与岩**还没有反应** —— 结晶（岩）是独立一条线（依赖元素护盾系统）。
  // 钉住它们，免得将来加那条线时把这几条顺手改成「有反应」
  // （那会让它们**静默地**开始触发）
  //
  // ⚠️ 火+草**已经不在这个清单里了**（2026-10-09 加了燃烧）—— 上面那一段是它的正向断言。
  // ⚠️ **风+雷 / 风+草 也已经不在这个清单里了**（2026-10-10 加了扩散）—— 见 `testSwirl`。
  checkBool("草打岩 无反应", true, lookupReaction("rock", "grass") === undefined);
  checkBool("岩打草 无反应", true, lookupReaction("grass", "rock") === undefined);
  checkBool("雷打岩 无反应（结晶单向）", true, lookupReaction("rock", "thunder") === undefined);
  checkBool("岩打雷 结晶", true, lookupReaction("thunder", "rock")?.id === "crystallize_thunder");
  // 扩散只有「风当来袭方」这一个方向：风当**已有附着**时与谁都不反应
  checkBool("风打火 无反应（风不能作为被扩散的一方）", true, lookupReaction("wind", "fire") === undefined);
  checkBool("风打草 无反应（同上）", true, lookupReaction("wind", "grass") === undefined);
  checkBool("风打风 无反应（同元素）", true, lookupReaction("wind", "wind") === undefined);
  // 风**扩散不了岩**
  checkBool("岩打风 无反应（风无法扩散岩）", true, lookupReaction("rock", "wind") === undefined);
  checkBool("物理打风 无反应", true, lookupReaction("physical", "wind") === undefined);
}

// ==================== 消耗量 ====================

function testConsume(): void {
  // 附着 2U、来袭 1U、消耗比 0.5 → 只吃掉 0.5
  check("附着2 来袭1 比0.5 → 消耗 0.5", 0.5, consumeGauge(2, 1, 0.5));
  // 附着 2U、来袭 4U、比 0.5 → 想吃 2，正好耗尽
  check("附着2 来袭4 比0.5 → 耗尽 2", 2, consumeGauge(2, 4, 0.5));
  // 附着 2U、来袭 8U、比 0.5 → 想吃 4，但只能扣到附着量 2
  check("附着2 来袭8 比0.5 → 封顶 2", 2, consumeGauge(2, 8, 0.5));
  // 消耗比 1.0：1U 来袭吃 1U 附着
  check("附着1 来袭1 比1.0 → 消耗 1", 1, consumeGauge(1, 1, 1.0));
  check("附着2 来袭1 比1.0 → 消耗 1", 1, consumeGauge(2, 1, 1.0));
  // 来袭量为负（异常输入）→ 不消耗，也不欠账
  check("来袭为负 → 消耗 0", 0, consumeGauge(2, -1, 0.5));
  // 附着为 0 → 消耗 0
  check("附着为 0 → 消耗 0", 0, consumeGauge(0, 4, 1.0));
}

// ==================== 精通曲线 ====================

function testMastery(): void {
  // ---- 增幅曲线 ----
  check("emAmplify(0) = 1", 1, emAmplify(0));
  check("emAmplify(负) = 1", 1, emAmplify(-10));
  check("emAmplify(200) = 1 + 556/1600", 1.3475, emAmplify(200));
  // 1 + 2.78×1000/(1000+1400) = 1 + 2780/2400 = 2.158333…
  check("emAmplify(1000) = 1 + 2780/2400", 2.158333333333333, emAmplify(1000));
  // 单调递增：精通越高系数越大
  checkBool("增幅曲线单调递增", true, emAmplify(500) > emAmplify(100) && emAmplify(100) > 1);
  // 常量值钉死，防有人改了公式没改注释
  check("EM_AMPLIFY_COEFF = 2.78", 2.78, EM_AMPLIFY_COEFF);
  check("EM_AMPLIFY_CONST = 1400", 1400, EM_AMPLIFY_CONST);

  // ---- 剧变曲线（碎冰 + 超载/超导/感电都用这条）----
  check("emTransform(0) = 1", 1, emTransform(0));
  check("emTransform(负) = 1", 1, emTransform(-10));
  // 1 + 16×200/(200+2000) = 1 + 3200/2200 = 2.454545…
  check("emTransform(200) = 1 + 3200/2200", 2.4545454545454546, emTransform(200));
  // 1 + 16×1000/3000 = 6.3333…
  check("emTransform(1000) = 1 + 16000/3000", 6.333333333333333, emTransform(1000));
  checkBool("剧变曲线单调递增", true, emTransform(500) > emTransform(100) && emTransform(100) > 1);
  check("EM_TRANSFORM_COEFF = 16", 16, EM_TRANSFORM_COEFF);
  check("EM_TRANSFORM_CONST = 2000", 2000, EM_TRANSFORM_CONST);

  // ⚠️ **两条曲线必须不同** —— 复用了同一条是「数值差两三倍」那类静默错，
  // 这条断言就是防它：把 emTransform 写回 emAmplify 时立刻红。
  checkBool("增幅 ≠ 剧变（不是同一条曲线）", true, emTransform(200) > emAmplify(200));

  // ---- 激化曲线（第三条，2026-10-08）----
  // 形状与上面两条相同（`base + coeff × EM/(EM+const)`），但**含义差一层**：
  // 它是「加在**目标易伤**上的比例」，不是「乘在伤害上的倍率」。
  check("quickenVuln(0) = 0.15", 0.15, quickenVuln(0));
  check("quickenVuln(负) = 0.15（退回基数，不会变成减伤）", 0.15, quickenVuln(-5));
  // 0.15 + 0.35×200/1200 = 0.15 + 0.058333… = 0.208333…
  check("quickenVuln(200) = 0.15 + 70/1200", 0.20833333333333334, quickenVuln(200));
  // 0.15 + 0.35×500/1500 = 0.15 + 0.116666… = 0.266666…
  check("quickenVuln(500) = 0.15 + 175/1500", 0.26666666666666666, quickenVuln(500));
  // 0.15 + 0.35×1000/2000 = 0.15 + 0.175 = 0.325
  check("quickenVuln(1000) = 0.325", 0.325, quickenVuln(1000));
  check("QUICKEN_VULN_BASE = 0.15", 0.15, QUICKEN_VULN_BASE);
  check("QUICKEN_VULN_COEFF = 0.35", 0.35, QUICKEN_VULN_COEFF);
  check("QUICKEN_VULN_CONST = 1000", 1000, QUICKEN_VULN_CONST);

  // 单调递增 + 有上界（渐近 0.5，永远够不着）
  checkBool("激化曲线单调递增", true,
    quickenVuln(1000) > quickenVuln(200) && quickenVuln(200) > quickenVuln(0));
  checkBool("激化曲线有上界（< 0.5）", true,
    quickenVuln(1000) < 0.5 && quickenVuln(100000) < 0.5);

  // ⚠️ **三条曲线互不相等** —— 这一条专门防「复制粘贴改了个名字忘了改常量」：
  // 三者的 COEFF / CONST 只要有两对撞上，曲线就会完全重合。
  // 取一个三条曲线各自都算得出不同值的 EM（200）来比。
  checkBool("三条曲线互不相同", true,
    emAmplify(200) !== emTransform(200) && emTransform(200) !== quickenVuln(200) &&
    quickenVuln(200) !== emAmplify(200));
}

// ==================== 冻结时长 ====================

function testFreezeSeconds(): void {
  check("FROZEN_SECONDS_PER_GAUGE = 2.5", 2.5, FROZEN_SECONDS_PER_GAUGE);
  check("FROZEN_MAX_SECONDS = 8", 8, FROZEN_MAX_SECONDS);

  // 2U 附着被吃掉 → 5 秒（火弹/水弹/冰弹的附着量都是 2U，所以这是最常见的一档）
  check("消耗 2U → 冻 5 秒", 5, frozenSeconds(2));
  // 1U → 2.5 秒
  check("消耗 1U → 冻 2.5 秒", 2.5, frozenSeconds(1));
  // 附着衰减到只剩 0.6U 时被水打中 → 只冻 1.5 秒（「元素量决定时长」的意义就在这）
  check("消耗 0.6U → 冻 1.5 秒", 1.5, frozenSeconds(0.6));
  // 3.2U = 8 秒，正好撞上限
  check("消耗 3.2U → 冻 8 秒（撞上限）", 8, frozenSeconds(3.2));
  // 超过上限一律钳到 8 —— 没有上限的话 12U 的高附着攻击会冻 30 秒
  check("消耗 10U → 钳到 8 秒", 8, frozenSeconds(10));
  // 异常输入：不冻，也不返回负数
  check("消耗 0 → 不冻", 0, frozenSeconds(0));
  check("消耗为负 → 不冻", 0, frozenSeconds(-5));
}

// ==================== 剧变等级基数 ====================

/**
 * 剧变反应的伤害基数：`transformBase(等级) × ReactionDef.transformCoeff`。
 *
 * 这个函数是「等级基数表」口径的**唯一落点** —— 剧变伤害只由元素精通与触发者等级决定，
 * 不参与原攻击的结算。等级越界 / 小数 / 0 / 负数一律按 1 级，不返回 0 也不返回负数
 * （返回 0 会让整个反应静默地「触发了但没伤害」，返回负数会变成治疗）。
 */
function testTransformBase(): void {
  // 公式按手算写死，不从实现里抄
  check("TRANSFORM_BASE_LV1 = 12", 12, TRANSFORM_BASE_LV1);
  check("TRANSFORM_BASE_PER_LEVEL = 6", 6, TRANSFORM_BASE_PER_LEVEL);

  // 12 + 6×(lv−1)
  check("transformBase(1) = 12", 12, transformBase(1));
  check("transformBase(2) = 18", 18, transformBase(2));
  check("transformBase(5) = 36", 36, transformBase(5));
  check("transformBase(10) = 66", 66, transformBase(10));

  // 等级越界一律按 1 级 —— 普通单位 `GetUnitLevel` 返回 1，但 0 也会出现（召唤物/建筑）
  check("transformBase(0) = 12（按 1 级）", 12, transformBase(0));
  check("transformBase(-3) = 12（按 1 级）", 12, transformBase(-3));

  // 小数向下取整：3.7 → 3 级 → 12 + 12 = 24
  check("transformBase(3.7) = 24（向下取整）", 24, transformBase(3.7));

  // 单调递增且恒正 —— 等级越高基数越大，「返回 0」那种坏值会在这里红
  checkBool("等级基数单调递增", true,
    transformBase(10) > transformBase(5) && transformBase(5) > transformBase(1) && transformBase(1) > 0);

  // ---- 三兄弟在 10 级时的实际基数（基数 × 系数），数值设计的一览 ----
  // 超载 66 × 2.0 = 132、超导 66 × 0.5 = 33、感电 66 × 1.2 = 79.2（**每跳**）
  check("10 级超载基数 = 132", 132, transformBase(10) * coeffOf(lookupReaction("fire", "thunder")));
  check("10 级超导基数 = 33", 33, transformBase(10) * coeffOf(lookupReaction("ice", "thunder")));
  check("10 级感电每跳基数 = 79.2", 79.2, transformBase(10) * coeffOf(lookupReaction("water", "thunder")));
  // 绽放（2026-10-08）：与超载同为 2.0 —— 但它是**延迟**那一段的基数，不是当场结算
  check("10 级绽放基数 = 132", 132, transformBase(10) * coeffOf(lookupReaction("water", "grass")));
  // 超载必须显著强于超导 —— 「系数抄反」是这张表最容易犯的错，后果是数值差 4 倍
  checkBool("超载 > 感电 > 超导（系数排序）", true,
    coeffOf(lookupReaction("fire", "thunder")) > coeffOf(lookupReaction("water", "thunder")) &&
    coeffOf(lookupReaction("water", "thunder")) > coeffOf(lookupReaction("ice", "thunder")));
}

// ==================== 附着元素白名单 ====================

function testAuraWhitelist(): void {
  // physical 必须被排除：否则一次物理追加伤害会挂出无展示的 aura_physical
  check("AURA_ELEMENTS 有 7 个（8 元素去掉物理）", 7, AURA_ELEMENTS.length);
  checkBool("physical 不能附着", false, isAuraElement("physical"));
  checkBool("fire 能附着", true, isAuraElement("fire"));
  checkBool("grass 能附着", true, isAuraElement("grass"));

  // 逐个确认白名单里没有 physical
  let hasPhysical = false;
  for (let i = 0; i < AURA_ELEMENTS.length; i++) {
    if (AURA_ELEMENTS[i] === "physical") {
      hasPhysical = true;
    }
  }
  checkBool("白名单不含 physical", false, hasPhysical);
}

// ==================== 表结构完整性 ====================

function testSwirl(): void {
  const elements = ["fire", "water", "thunder", "ice", "grass"] as const;
  for (let i = 0; i < elements.length; i++) {
    const element = elements[i];
    const def = lookupReaction(element, "wind");
    checkBool("风扩散 " + element + " 有定义", true, def !== undefined);
    if (def === undefined) {
      continue;
    }
    checkText("扩散 id " + element, "swirl_" + element, def.id);
    checkText("扩散显示名 " + element, "扩散", def.name);
    checkText("扩散类别 " + element, "transform", def.kind);
    checkText("扩散效果 " + element, "swirl", def.effect ?? "无");
    checkText("扩散伤害元素 " + element, element, def.damageElement ?? "无");
    check("扩散系数 " + element, 0.6, coeffOf(def));
    check("扩散消耗比 " + element, 1, def.consumeRatio);
    checkBool("扩散无增幅倍率 " + element, true, def.ratio === undefined);
    checkBool("扩散反向无反应 " + element, true, lookupReaction("wind", element) === undefined);
    for (let j = 0; j < i; j++) {
      checkBool("扩散定义独立 " + element + "/" + elements[j], true,
        def !== lookupReaction(elements[j], "wind"));
    }
  }
}

function testTableShape(): void {
  // 十六个 id 都要有定义（`Record<ReactionId, ReactionDef>` 是穷尽的，缺一个编译就过不去 ——
  // 这里再钉一遍是因为**编译过了不等于填对了**，值可能是复制粘贴来的另一条）
  check("表里 20 条反应", 20.0, REACTION_TABLE.vaporize_water_on_fire !== undefined &&
    REACTION_TABLE.vaporize_fire_on_water !== undefined &&
    REACTION_TABLE.melt_fire_on_ice !== undefined &&
    REACTION_TABLE.melt_ice_on_fire !== undefined &&
    REACTION_TABLE.frozen !== undefined &&
    REACTION_TABLE.overload !== undefined &&
    REACTION_TABLE.superconduct !== undefined &&
    REACTION_TABLE.electro_charged !== undefined &&
    REACTION_TABLE.bloom !== undefined &&
    REACTION_TABLE.quicken !== undefined &&
    REACTION_TABLE.burning !== undefined &&
    REACTION_TABLE.swirl_fire !== undefined &&
    REACTION_TABLE.swirl_water !== undefined &&
    REACTION_TABLE.swirl_thunder !== undefined &&
    REACTION_TABLE.swirl_ice !== undefined &&
    REACTION_TABLE.swirl_grass !== undefined &&
    REACTION_TABLE.crystallize_fire !== undefined &&
    REACTION_TABLE.crystallize_water !== undefined &&
    REACTION_TABLE.crystallize_thunder !== undefined &&
    REACTION_TABLE.crystallize_ice !== undefined ? 20 : 0);

  // 倍率 2.0 的那两条消耗比都该是 0.5；倍率 1.5 的两条都该是 1.0
  check("2.0 侧消耗比 0.5（水打火）", 0.5, REACTION_TABLE.vaporize_water_on_fire.consumeRatio);
  check("2.0 侧消耗比 0.5（火打冰）", 0.5, REACTION_TABLE.melt_fire_on_ice.consumeRatio);
  check("1.5 侧消耗比 1.0（火打水）", 1.0, REACTION_TABLE.vaporize_fire_on_water.consumeRatio);
  check("1.5 侧消耗比 1.0（冰打火）", 1.0, REACTION_TABLE.melt_ice_on_fire.consumeRatio);

  // 显示名：蒸发 / 融化 / 冻结。⚠️ 飘字层与战斗日志都直接念这个字段
  checkText("水打火显示名 蒸发", "蒸发", REACTION_TABLE.vaporize_water_on_fire.name);
  checkText("火打冰显示名 融化", "融化", REACTION_TABLE.melt_fire_on_ice.name);
  checkText("冻结显示名 冻结", "冻结", REACTION_TABLE.frozen.name);

  // id 与键必须自洽 —— 复制粘贴一条定义忘了改 id 是这张表最容易犯的错，
  // 后果是「触发了 A 却按 B 结算」，而查表路径全是对的，只有日志看着别扭。
  checkText("frozen 的 id 自洽", "frozen", REACTION_TABLE.frozen.id);
  checkBool("frozen 带冻结效果", true, REACTION_TABLE.frozen.effect === "freeze");
  checkBool("蒸发不带落地效果", true, REACTION_TABLE.vaporize_water_on_fire.effect === undefined);

  // ---- 雷元素三兄弟（2026-10-07）----
  // 三条都是剧变：**不许有增幅倍率**（有 ratio 就会被管线当成增幅乘到来袭那一击上）
  checkBool("overload 无增幅倍率", true, REACTION_TABLE.overload.ratio === undefined);
  checkBool("superconduct 无增幅倍率", true, REACTION_TABLE.superconduct.ratio === undefined);
  checkBool("electro_charged 无增幅倍率", true, REACTION_TABLE.electro_charged.ratio === undefined);

  // 消耗比一律 1.0：反应完把附着清空
  check("overload 消耗比 1.0", 1.0, REACTION_TABLE.overload.consumeRatio);
  check("superconduct 消耗比 1.0", 1.0, REACTION_TABLE.superconduct.consumeRatio);
  check("electro_charged 消耗比 1.0", 1.0, REACTION_TABLE.electro_charged.consumeRatio);

  // damageElement / effect 必须与查表分支一致 —— 抄错就是「飘字说超载、伤害是雷伤」
  // 用三元而不是 `??`：本仓对 `??` 的 tstl 代码生成持保留态度（见 `DamagePipeline_makeDealer`）
  checkText("overload 打火伤", "fire",
    REACTION_TABLE.overload.damageElement === undefined ? "无" : REACTION_TABLE.overload.damageElement);
  checkText("superconduct 打冰伤", "ice",
    REACTION_TABLE.superconduct.damageElement === undefined ? "无" : REACTION_TABLE.superconduct.damageElement);
  checkText("electro_charged 打雷伤", "thunder",
    REACTION_TABLE.electro_charged.damageElement === undefined ? "无" : REACTION_TABLE.electro_charged.damageElement);
  checkText("overload 的 effect", "overload",
    REACTION_TABLE.overload.effect === undefined ? "无" : REACTION_TABLE.overload.effect);
  checkText("superconduct 的 effect", "superconduct",
    REACTION_TABLE.superconduct.effect === undefined ? "无" : REACTION_TABLE.superconduct.effect);
  checkText("electro_charged 的 effect", "electro_charged",
    REACTION_TABLE.electro_charged.effect === undefined ? "无" : REACTION_TABLE.electro_charged.effect);

  // id 自洽（同 frozen 那条）
  checkText("overload 的 id 自洽", "overload", REACTION_TABLE.overload.id);
  checkText("superconduct 的 id 自洽", "superconduct", REACTION_TABLE.superconduct.id);
  checkText("electro_charged 的 id 自洽", "electro_charged", REACTION_TABLE.electro_charged.id);
  checkText("overload 显示名 超载", "超载", REACTION_TABLE.overload.name);
  checkText("superconduct 显示名 超导", "超导", REACTION_TABLE.superconduct.name);
  checkText("electro_charged 显示名 感电", "感电", REACTION_TABLE.electro_charged.name);

  // ---- 草元素线（2026-10-08）----
  // 两条都是剧变：不许有增幅倍率（有 ratio 就会被管线当成增幅乘到来袭那一击上）
  checkBool("bloom 无增幅倍率", true, REACTION_TABLE.bloom.ratio === undefined);
  checkBool("quicken 无增幅倍率", true, REACTION_TABLE.quicken.ratio === undefined);

  // 消耗比一律 1.0
  check("bloom 消耗比 1.0", 1.0, REACTION_TABLE.bloom.consumeRatio);
  check("quicken 消耗比 1.0", 1.0, REACTION_TABLE.quicken.consumeRatio);

  // id 自洽 + 显示名（飘字与战斗日志直接念这两个字段）
  checkText("bloom 的 id 自洽", "bloom", REACTION_TABLE.bloom.id);
  checkText("quicken 的 id 自洽", "quicken", REACTION_TABLE.quicken.id);
  checkText("bloom 显示名 绽放", "绽放", REACTION_TABLE.bloom.name);
  checkText("quicken 显示名 激化", "激化", REACTION_TABLE.quicken.name);

  // 绽放：打草伤、系数 2.0、effect 是 bloom
  checkText("bloom 打草伤", "grass",
    REACTION_TABLE.bloom.damageElement === undefined ? "无" : REACTION_TABLE.bloom.damageElement);
  check("bloom 系数 2.0", 2.0, coeffOf(REACTION_TABLE.bloom));
  checkText("bloom 的 effect", "bloom",
    REACTION_TABLE.bloom.effect === undefined ? "无" : REACTION_TABLE.bloom.effect);

  // ⚠️ 激化：**两个伤害字段都必须是 `undefined`**（见文件头）—— 它不自造伤害。
  // 补上任一个的表现是「激化那一发凭空多打一段」，查表路径全对、只有数字不对。
  checkText("quicken 无伤害元素（刻意的）", "无",
    REACTION_TABLE.quicken.damageElement === undefined ? "无" : REACTION_TABLE.quicken.damageElement);
  check("quicken 无剧变系数（刻意的）", -1, coeffOf(REACTION_TABLE.quicken));
  checkText("quicken 的 effect", "quicken",
    REACTION_TABLE.quicken.effect === undefined ? "无" : REACTION_TABLE.quicken.effect);

  // ---- 燃烧（草 + 火，2026-10-09）----
  checkBool("burning 无增幅倍率", true, REACTION_TABLE.burning.ratio === undefined);
  check("burning 消耗比 1.0", 1.0, REACTION_TABLE.burning.consumeRatio);
  checkText("burning 的 id 自洽", "burning", REACTION_TABLE.burning.id);
  checkText("burning 显示名 燃烧", "燃烧", REACTION_TABLE.burning.name);
  checkText("burning 打火伤", "fire",
    REACTION_TABLE.burning.damageElement === undefined ? "无" : REACTION_TABLE.burning.damageElement);
  check("burning 每跳系数 0.5", 0.5, coeffOf(REACTION_TABLE.burning));
  checkText("burning 的 effect", "burning",
    REACTION_TABLE.burning.effect === undefined ? "无" : REACTION_TABLE.burning.effect);
}

// ==================== 燃烧时长 ====================

/**
 * 燃烧时长：`consumed × BURNING_GAUGE_PER_SECOND`，钳在 `[MIN, MAX]`。
 *
 * ⚠️ 秒数不等于跳数：跳点受固定 0.1 秒心跳与浮点相位影响。
 * 当前间隔 0.6 秒，4 秒燃烧共 6 跳；完整实测表见 reactionTable.ts。
 *
 * 那条约束的**下限**（`MIN > 一跳的间隔`）在这里正面钉死：若把 MIN 调到不超过跳间隔，
 * 表现是「燃烧触发了、飘了字、伤害为零」，而所有查表断言全绿 —— 静默失效。
 */
function testBurningSeconds(): void {
  check("BURNING_GAUGE_PER_SECOND = 2.0", 2.0, BURNING_GAUGE_PER_SECOND);
  check("BURNING_TICK_SECONDS = 0.6", 0.6, BURNING_TICK_SECONDS);
  check("BURNING_MIN_SECONDS = 1.5", 1.5, BURNING_MIN_SECONDS);
  check("BURNING_MAX_SECONDS = 8", 8, BURNING_MAX_SECONDS);

  // ⚠️ 核心约束：下限必须**严格大于**一个跳间隔，否则一跳都跳不出来
  // （「燃烧触发了、飘了字、伤害为零」—— 查表断言全绿的静默失效）
  checkBool("时长下限 > 一个跳间隔", true, BURNING_MIN_SECONDS > BURNING_TICK_SECONDS);

  // ⚠️ 「总伤不变」这条口径落在两个常量上：2U 草（草弹的附着量）→ 4 秒 → **6 跳**
  // × 每跳 0.5 = **3.0×**。实测跳数表见 `burningSeconds()` 的注释。
  // 改间隔就必须改每跳系数 —— 这两条断言钉住那对值，改单边会红。
  check("消耗 2U → 烧 4 秒（= 6 跳 × 0.5）", 4, burningSeconds(2));
  // 1U → 2 秒 → 3 跳
  check("消耗 1U → 烧 2 秒（= 3 跳）", 2, burningSeconds(1));
  // 4U → 8 秒，正好撞上限
  check("消耗 4U → 烧 8 秒（撞上限）", 8, burningSeconds(4));
  // 超过上限一律钳到 8
  check("消耗 100U → 钳到 8 秒", 8, burningSeconds(100));

  // ⚠️ 与 `frozenSeconds(0) === 0` 不同：燃烧走到这里说明反应**已经触发了**，
  // 返回 0 等于「反应发生了但什么也没发生」，所以宁可给下限
  check("消耗 0 → 给下限 1.5 秒（不是 0）", 1.5, burningSeconds(0));
  check("消耗为负 → 给下限 1.5 秒", 1.5, burningSeconds(-5));
  // 快衰减完的附着（0.6U → 1.2 秒）也被抬到下限
  check("消耗 0.6U → 抬到下限 1.5 秒", 1.5, burningSeconds(0.6));

  // 单调不减
  checkBool("时长随消耗量单调不减", true,
    burningSeconds(1) <= burningSeconds(2) && burningSeconds(2) <= burningSeconds(3));
}
