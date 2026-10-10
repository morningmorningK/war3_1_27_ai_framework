/**
 * 元素附着 / 反应系统的**游戏内**自测（`todo §2.2` / Step 2）。
 *
 * ## 它验什么
 *
 * 直接调 `ElementalReactionSystem.resolve()`，绕开伤害管线，验附着这一层的语义：
 * 附着、同元素刷新（不叠层）、异元素覆盖、增幅反应与消耗、**冻结**、
 * **剧变六条（超载 / 超导 / 感电 / 绽放 / 激化 / 燃烧）的识别与落点**、附着 CD、
 * 单附着上限、CD 表不泄漏。**端到端（真伤害触发反应）属 Step 3/5**，不在这里。
 *
 * ⚠️ 剧变那一组**验不到范围伤害与击退**（自测是「自己打自己」，范围按施法者的
 * 敌人筛选 ⇒ 受害者恒为空）。理由与边界写在 `testTransformReactions` 的注释里，
 * 别把它当成「已经验过了」。
 *
 * ⚠️ **草元素线（2026-10-08）是「一半验得到、一半验不到」**：绽放的延迟爆炸
 * 与那三条一样看不到（还多一层「1.5 秒后」的延迟），而**激化看得到** ——
 * 它直接给主目标挂 buff。别把这两条的可观察性混为一谈，详见 `testGrassLine`。
 *
 * ⚠️ **燃烧（2026-10-10）与上面全部相反**：它每跳打的就是**陪练单位本人**，
 * 是全仓唯一一条会在自测里**真打到目标**的 DoT（其余几条的受害者名单恒为空）。
 * 所以它留下的 buff **必须在用例里就清掉** —— 漏了的后果不是断言红，而是自测返回后
 * `BuffSystem` 抢跑一跳把单位打死。详见 `testBurning` 与 `clearReactionBuffs`。
 *
 * ⚠️ **冻结那条会给单位上控制效果**（`PauseUnit`），所以它自己清、`finally` 再兜一次；
 * 别把它挪到 `finally` 之后，也别去掉那道兜底。
 *
 * ## 为什么需要真单位
 *
 * 附着是挂在 `BuffManager` 上的 buff —— 没有真 `Actor` 就没有 `BuffManager`。
 * 所以它**不能**和纯函数自测挤在 0.01s，要等场上真有单位（同 `statPanelSelfTest`，
 * 排在 1.5s）。
 *
 * ## ⚠️ 附着 CD 与本自测的关系（2026-10-09）

CD 按 `(sourceId × 元素)` 记、时长 0.5 秒、走 `scheduler.elapsedSeconds`；而本自测是
**一个函数调用**里跑完全部用例的 —— 全程 `elapsedSeconds` 不变，所以**每个用例记下的
CD 在整轮里都还活着**。

- 那些不需要真 `Actor` 的用例各自用一个**编出来的 sourceId**（`9001`…`9105`）就是为了
  绕开这条，别把它们改成同一个号。
- 需要真触发者的那几组（剧变 / 草线 / 端到端）只能用 `target.id`，于是会撞车 ——
  **每个独立场景开头都要 `sys.clearCooldowns()`**（`testCooldown` 除外，它验的就是 CD）。
- 症状很有迷惑性：前置附着「挂了但读不到」、反应 id 是 `无`，看着像接线断了，
  其实是 CD 把那一发吞了。**踩过一次，红了 13 条。**

## 它**不**依赖属性系统
 *
 * 附着 buff 不带属性修正器，不碰属性表 —— 所以哪怕属性冲刷还没稳定也不影响这里。
 * 也因此不挑「无属性表」的单位（对比 `StatPanelTestExample`）。
 */

import {
  ATTACK_TYPE_MAGIC,
  DAMAGE_TYPE_COLD,
  WEAPON_TYPE_WHOKNOWS,
} from "@eiriksgata/wc3ts/*";
import { UNIT_STATE_LIFE } from "src/constants/game/units";
import { Actor } from "src/system/actor";
import { BuffTypeId } from "src/system/buff";
import { ElementalReactionSystem } from "src/system/element/ElementalReactionSystem";
import { StatType, elemVulnStat } from "src/system/stat";
import { createLogger } from "src/utils/logger";

const log = createLogger("ElemAuraTest");

let passed = 0;
let failed = 0;

function check(label: string, expected: number, actual: number, tol: number): void {
  if (Math.abs(expected - actual) <= tol) {
    passed++;
    return;
  }
  failed++;
  log.error(`[失败] ${label}：期望 ${expected}（±${tol}），实际 ${actual}`);
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

/** 找一个活着的单位（附着不挑有没有属性表） */
function pickAnyUnit(): Actor | undefined {
  const keys = Object.keys(Actor.allActors);
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    if (key === undefined) {
      continue;
    }
    const actor = Actor.allActors[Number(key)];
    if (actor === undefined) {
      continue;
    }
    const u = actor.handle;
    if (u === undefined || GetUnitTypeId(u) === 0) {
      continue;
    }
    return actor;
  }
  return undefined;
}

/** 目标身上当前附着 buff 的条数（单附着上限：应恒 ≤ 1） */
function auraCount(target: Actor): number {
  return target.buffManager.getBuffsByType(BuffTypeId.ELEMENTAL_AURA).length;
}

/**
 * 这个 `Actor` 的句柄还指得到活着的单位吗。
 *
 * ⚠️ **每次碰 `target.buffManager` 之前都要先问这个** —— 端到端那段会真的造一次
 * 伤害，万一那一下把单位打死了，句柄就成了废数，再拿它读原生是**访问违例**
 * （memory 里那类原生闪退）。自测宁可少清一次，也不能把游戏带崩。
 */
function isAlive(target: Actor): boolean {
  const u = target.handle;
  return u !== undefined && GetUnitTypeId(u) !== 0;
}

/** 清掉目标身上全部附着，回到干净状态 */
function clearAuras(target: Actor): void {
  if (!isAlive(target)) {
    return;
  }
  const auras = target.buffManager.getBuffsByType(BuffTypeId.ELEMENTAL_AURA);
  for (let i = 0; i < auras.length; i++) {
    const b = auras[i];
    if (b !== undefined) {
      target.buffManager.removeBuff(b);
    }
  }
}

/** 目标身上当前有几层冻结 */
function freezeCount(target: Actor): number {
  return target.buffManager.getBuffsByType(BuffTypeId.FREEZE).length;
}

/**
 * 卸掉目标身上的冻结。
 *
 * ⚠️ **必须在 `finally` 里调**：冻结会 `PauseUnit(u, true)` 把单位**真的暂停**，
 * 不自解的话这个自测会把场上一只单位永久定住（而且 `PauseUnit` 是个布尔位，
 * 别的系统来解也可能被误当成它的）。`removeBuff` 会走 `FreezeBuff.onRemove`，
 * 暂停在那一侧被解除（`BuffManager.hasPauseControl()` 守卫）。
 */
function clearFreeze(target: Actor): void {
  if (!isAlive(target)) {
    return;
  }
  const frozen = target.buffManager.getBuffsByType(BuffTypeId.FREEZE);
  for (let i = 0; i < frozen.length; i++) {
    const b = frozen[i];
    if (b !== undefined) {
      target.buffManager.removeBuff(b);
    }
  }
}

/**
 * 目标的韧性。自测挑的是**场上任意一个单位**，它的属性表不可控 ——
 * 万一带了「坚定护符」之类的控制减免，冻结会被削短（rate < 1）甚至直接免疫（rate ≥ 1）。
 * 秒数归纯函数层（`ElementalReactionTestExample` 的 `frozenSeconds`），
 * 这里只用它判断「该不该冻上」。
 */
function tenacityOf(target: Actor): number {
  if (!target.hasStatSheet()) {
    // 没有属性表 = 没有任何属性修正 = 韧性 0（同 `applyTenacity` 的零开销路径）
    return 0;
  }
  return target.statSheet.getFinal(StatType.TENACITY);
}

/** 目标身上某类 buff 的条数 */
function buffCount(target: Actor, typeId: BuffTypeId): number {
  return target.buffManager.getBuffsByType(typeId).length;
}

/** 摘掉目标身上某一类 buff 的全部条目（`getBuffsByType` 返回的是快照，边遍历边摘安全） */
function removeBuffsOfType(target: Actor, typeId: BuffTypeId): void {
  if (!isAlive(target)) {
    return;
  }
  const list = target.buffManager.getBuffsByType(typeId);
  for (let i = 0; i < list.length; i++) {
    const b = list[i];
    if (b !== undefined) {
      target.buffManager.removeBuff(b);
    }
  }
}

/**
 * 摘掉剧变反应留下的四条 buff（超导的削甲 / 感电的 DoT / 燃烧的 DoT / 激化的增伤）。
 *
 * ⚠️ **感电那条非摘不可**：它是个 4 秒的 DoT，自测跑完如果留着，目标身上会
 * 持续跳雷伤、并每秒把雷附着刷回来 —— 后面的用例（尤其是「附着 CD」那条）
 * 读到的是别人留下的状态，报的却是自己的错。
 *
 * ⚠️ **燃烧那条更非摘不可，而且和感电不是同一个理由。** 感电的受害者是
 * 「施法者的敌人」—— 自测里自己打自己，那个名单**恒为空**，所以它其实一跳都打不到人。
 * 燃烧每跳打的是**宿主本人**（用户口径 3：只打主目标），是**全仓唯一一条会在自测里
 * 真打到陪练单位**的 DoT。忘了摘的后果不是「读到脏状态」，而是自测返回之后
 * `BuffSystem` 抢跑一跳、把这个单位打伤甚至打死 —— 后面的用例再挑到它就会访问失效句柄。
 *
 * ⚠️ **激化那条也非摘不可**，理由又不同：它是个 6 秒的**纯属性** buff，不产生任何
 * 可观察的动作，所以忘了摘**不会报错** —— 只会让后面每条读到目标属性的用例
 * （端到端那一发会走完整乘区）算在一个多了 15% 易伤的目标身上。这类静默污染
 * 比感电那种「看得见的跳伤」更难查。
 */
function clearReactionBuffs(target: Actor): void {
  removeBuffsOfType(target, BuffTypeId.SUPERCONDUCT);
  removeBuffsOfType(target, BuffTypeId.ELECTRO_CHARGED);
  removeBuffsOfType(target, BuffTypeId.BURNING);
  removeBuffsOfType(target, BuffTypeId.QUICKEN);
}

export function elementAuraSelfTest(): void {
  passed = 0;
  failed = 0;
  log.info("=== 元素附着 / 反应系统自测开始 ===");

  const target = pickAnyUnit();
  if (target === undefined) {
    log.warn("=== 元素附着自测：跳过（场上没有活着的单位）===");
    return;
  }

  const sys = ElementalReactionSystem.getInstance();
  clearAuras(target);

  try {
    testAttachAndRefresh(sys, target);
    testOverwrite(sys, target);
    testVaporize(sys, target);
    testFreeze(sys, target);
    // ⚠️ 剧变那三条会**真造伤害**（`ReactionEffects` 派发 `transform` 段），
    // 也可能留下 buff —— 所以自己清干净，别让后面的纯判定用例读到脏状态
    testTransformReactions(sys, target);
    // 草元素线（2026-10-08）：绽放 + 激化。与上面那组同源 —— 也会真造伤害 / 留 buff
    testGrassLine(sys, target);
    // 燃烧（2026-10-09）：草 + 火，单体火 DoT。⚠️ 它留下的 buff 是**唯一会真打到
    // 陪练单位**的那条（其它几条的受害者名单在自测里恒为空），用例内部自己清干净
    testBurning(sys, target);
    testSwirl(sys, target);
    testSameDispatchGuard(sys, target);
    testCooldown(sys, target);
    testNoLeak(sys, target);
    // ⚠️ **端到端那条放最后** —— 它会真造一次伤害，可能改变单位状态
    // （掉血、触发别的订阅者）。前面那些纯判定的用例不该被它影响。
    testSpellClaimEndToEnd(sys, target);
  } finally {
    // 无论成败都要清场 —— 别把附着留在游戏里的单位身上，也别把它冻着
    clearAuras(target);
    clearFreeze(target);
    clearReactionBuffs(target);
  }

  log.info(`=== 元素附着 / 反应系统自测结束：通过 ${passed}，失败 ${failed} ===`);
}

// ==================== 附着 + 同元素刷新（不叠层） ====================

function testAttachAndRefresh(sys: ElementalReactionSystem, target: Actor): void {
  clearAuras(target);
  const d1: object = { tag: "attach1" };

  // 挂 2U 火
  const r1 = sys.resolve(9001, target, "fire", 2, d1);
  checkText("首次挂火：无反应", "none", r1.kind);
  checkText("首次挂火：附着是火", "fire", sys.peekAuraElement(target) ?? "无");
  check("首次挂火：元素量 2U", 2, sys.peekAuraGauge(target), 0.001);
  check("首次挂火：只有一条附着", 1, auraCount(target), 0);

  // 换个来源再挂火（绕开 CD）→ 刷新，不叠层
  const d2: object = { tag: "attach2" };
  sys.resolve(9002, target, "fire", 3, d2);
  checkText("再挂火：还是火", "fire", sys.peekAuraElement(target) ?? "无");
  check("再挂火：元素量刷成 3U（不是叠加）", 3, sys.peekAuraGauge(target), 0.001);
  check("再挂火：仍然只有一条附着（不叠层）", 1, auraCount(target), 0);
}

// ==================== 异元素无反应 → 覆盖 ====================

function testOverwrite(sys: ElementalReactionSystem, target: Actor): void {
  clearAuras(target);
  sys.resolve(9003, target, "wind", 2, { tag: "ow1" });
  checkText("覆盖前：风", "wind", sys.peekAuraElement(target) ?? "无");

  // 岩打风没有反应；岩打火已经会结晶，不能再用来验证覆盖。
  const r = sys.resolve(9004, target, "rock", 2, { tag: "ow2" });
  checkText("风→岩（无反应）：不触发反应", "none", r.kind);
  checkText("风→岩：附着被覆盖成岩", "rock", sys.peekAuraElement(target) ?? "无");
  check("风→岩：仍然只有一条附着", 1, auraCount(target), 0);
}

// ==================== 增幅反应：蒸发 + 消耗 ====================

function testVaporize(sys: ElementalReactionSystem, target: Actor): void {
  clearAuras(target);
  // 目标挂 2U 火
  sys.resolve(9005, target, "fire", 2, { tag: "vap1" });
  check("蒸发前置：火 2U", 2, sys.peekAuraGauge(target), 0.001);

  // 1U 水打火 → 蒸发（水打火 2.0），消耗比 0.5 → 只吃 0.5U，火剩 1.5U
  const r = sys.resolve(9006, target, "water", 1, { tag: "vap2" });
  checkText("水打火：触发增幅", "amplify", r.kind);
  checkText("水打火：反应 id 是 vaporize_water_on_fire", "vaporize_water_on_fire", r.id ?? "无");
  // `consumed` 是战斗日志（§2.2.3）要打的「消耗元素量」那一项，必须和实际扣掉的量一致
  check("水打火：消耗 0.5U（1U 水 × 消耗比 0.5）", 0.5, r.consumed ?? 0, 0.001);
  checkText("水打火：附着仍是火（来袭不附着）", "fire", sys.peekAuraElement(target) ?? "无");
  check("水打火：火剩 1.5U（消耗 0.5）", 1.5, sys.peekAuraGauge(target), 0.01);

  // 再补一发 4U 水 → 消耗 2.0，火被扣空 → 附着消失
  const r2 = sys.resolve(9007, target, "water", 4, { tag: "vap3" });
  checkText("水打火（第二发）：仍触发增幅", "amplify", r2.kind);
  checkText("水打火（第二发）：火被扣空 → 无附着", "无", sys.peekAuraElement(target) ?? "无");
  check("水打火（第二发）：附着条数归零", 0, auraCount(target), 0);
}

// ==================== 冻结：水 + 冰 ====================

/**
 * 冻结（`todo §2.2.2`）。**这是自测里唯一一个会给单位上控制效果的用例** ——
 * 它会真的 `PauseUnit(u, true)` 把目标定住，所以自己必须清干净，
 * `finally` 里再兜一次（见 `clearFreeze`）。
 *
 * ## 为什么不断言「冻了几秒」
 *
 * 时长由 `frozenSeconds(消耗的元素量)` 决定，那个函数在**纯函数层**
 * （`ElementalReactionTestExample`）用手算值钉死了。这里只验「接线通没通」：
 * 反应 id / 类别、附着被扣光、冻结挂上了。
 *
 * 但「挂上了没有」也不是无条件的 —— `addFreezeBuff` 会按**目标的韧性**削时长，
 * 削到 0 就是真实免疫（`addStubBuff` 那一族的约定：`reduced <= 0` 返回 `undefined`，
 * 不挂 buff）。自测挑的是场上任意一个单位，属性不可控，所以判据写成
 * 「韧性 < 1 就该冻上」，而不是硬写「必须 1 层」。
 */
function testFreeze(sys: ElementalReactionSystem, target: Actor): void {
  clearAuras(target);
  clearFreeze(target);

  // 目标挂 2U 冰
  sys.resolve(9100, target, "ice", 2, { tag: "frz1" });
  checkText("冻结前置：冰附着", "ice", sys.peekAuraElement(target) ?? "无");
  check("冻结前置：2U", 2, sys.peekAuraGauge(target), 0.001);

  // 2U 水打冰 → 冻结（消耗比 1.0，附着被扣光）
  const r = sys.resolve(9101, target, "water", 2, { tag: "frz2" });
  checkText("水打冰：响应类别是剧变", "transform", r.kind);
  checkText("水打冰：反应 id 是 frozen", "frozen", r.id ?? "无");
  check("水打冰：消耗 2U（附着被扣光）", 2, r.consumed ?? 0, 0.001);
  checkText("水打冰：附着清空", "无", sys.peekAuraElement(target) ?? "无");
  check("水打冰：附着条数归零", 0, auraCount(target), 0);
  const tenacity = tenacityOf(target);
  checkBool(
    "水打冰：目标被冻住（目标韧性 = " + tenacity + "，< 1 就该冻上）",
    tenacity < 1,
    freezeCount(target) >= 1
  );

  // 反向：冰打水，结果相同（两个方向共用一条定义）
  clearAuras(target);
  clearFreeze(target);
  sys.resolve(9102, target, "water", 2, { tag: "frz3" });
  const r2 = sys.resolve(9103, target, "ice", 2, { tag: "frz4" });
  checkText("冰打水：也触发冻结", "frozen", r2.id ?? "无");
  checkText("冰打水：附着清空", "无", sys.peekAuraElement(target) ?? "无");

  // ⚠️ 已经冻着的时候再冻一次：**不许叠层**。
  // 两层 FREEZE 会被 `FreezeShatterSystem` 一次性全碎掉（它文件头记过这个已知行为），
  // 而且「冻两层」的语义本身就没定义过 —— 所以 `applyFreeze()` 里主动收口成一层。
  sys.resolve(9104, target, "water", 2, { tag: "frz5" });
  const r3 = sys.resolve(9105, target, "ice", 2, { tag: "frz6" });
  checkText("已冻着再冻：仍然触发反应", "frozen", r3.id ?? "无");
  // 「不叠层」这条**无条件成立**（韧性只会让它变 0 层，不会让它变 2 层），
  // 所以它是硬断言；上一条「该冻上」要看目标自己的韧性。
  checkBool("已冻着再冻：冻结不叠层（≤ 1 层）", true, freezeCount(target) <= 1);

  // 收尾：别把单位留着冻（`finally` 里还有一道兜底）
  clearFreeze(target);
}

// ==================== 剧变反应：超载 / 超导 / 感电 ====================

/**
 * 三条剧变反应：判定对不对、附着扣没扣、落地效果挂没挂上。
 *
 * ## ⚠️ `sourceId` 必须传 `target.id`，不能像别处那样传 9008/9009 这种假号
 *
 * 那几条纯判定用例的 sourceId 是编的，因为 `resolve()` 的判定层**不认识**
 * `Actor`。剧变反应不一样 —— 它要 `ReactionEffects` 去派发伤害，而那里第一件事是
 * `Actor.getById(sourceId)`，**假号查不到人** → 打一条 warn 直接返回。
 * 于是「反应触发了、但什么都没发生」，脚本还全绿。传 `target.id` 才真的走进去。
 *
 * ## ⚠️ 这一组**验不到范围伤害**，而且这不是遗漏
 *
 * 自测挑的是场上任意一个单位，让它**自己打自己** —— 而三条剧变反应的范围都按
 * `IsUnitEnemy(u, 施法者的玩家)` 筛选。施法者与目标是同一个玩家，所以
 * 「目标的敌人」名单里**永远没有目标自己**，受害者列表恒为空：
 *
 *   - 超载的**范围火伤 + 击退**：一次都打不出来；
 *   - 超导的**范围冰伤 + 削甲**：同上（削甲是挂在受害者身上的，不是主目标）；
 *   - 感电的**立即范围雷伤**：同上。
 *
 * 所以这一组只验「反应识别 + 扣附着 + 落点不崩」；**伤害数值归纯函数层**
 * （`ElementalReactionTestExample` 的 `transformBase` 那组 +
 * `ElementalDamageTestExample` 的 `transform` 段），**范围与击退归手动验收**。
 *
 * 唯一能在自测里观察到的落地效果是**感电的 DoT** —— 它直接挂在**主目标**身上
 * （周围敌人只是被范围伤害擦到），所以不受上面那条限制。
 *
 * ## 会真的造伤害
 *
 * 三条都得走到 `dispatch.dealTransformSegment()`，那是真的 `UnitDamageTarget`。
 * 受害者列表为空 → 实际不掉血；但**这也是个断言**：
 * 「自己打自己不该被自己的超载炸到」（见下面那条血量检查）。
 */
function testTransformReactions(sys: ElementalReactionSystem, target: Actor): void {
  const u = target.handle;
  if (u === undefined || !isAlive(target)) {
    log.warn("剧变反应用例跳过：单位句柄已失效");
    return;
  }

  // ⚠️ 这一组开始用**真 `target.id`** 当 sourceId（理由见上），于是会踩到附着 CD：
  // CD 按 `(sourceId × 元素)` 记、走 `scheduler.elapsedSeconds`，而自测整轮跑在**同一帧**里
  // ⇒ 前面那些假 id 的用例记下的 CD 虽然与本组无关，但**本组自己**的「感电再触发」
  // 会撞上第一次感电留下的 `(target.id, water)`。每个独立场景前清一次。
  sys.clearCooldowns();

  // ---- 超载：火 + 雷 ----
  clearAuras(target);
  const lifeBefore = GetUnitState(u, UNIT_STATE_LIFE);
  sys.resolve(target.id, target, "fire", 2, { tag: "ol-1" });
  const over = sys.resolve(target.id, target, "thunder", 2, { tag: "ol-2" });
  checkText("火→雷：反应 = 超载", "overload", over.id === undefined ? "无" : over.id);
  checkText("超载：kind = transform", "transform", over.kind);
  check("超载：附着被扣光（消耗比 1.0）", 0, auraCount(target), 0);
  // 施法者 == 目标 ⇒ 不在自己的受害者名单里。写死这条是为了钉住
  // 「范围按**施法者**的敌人筛选」这个口径：哪天有人把它改成「按目标筛选」或
  // 干脆不筛，自伤会立刻在这里红掉。
  check(
    "超载自己打自己：不掉血（施法者不在受害者名单里）",
    0,
    lifeBefore - GetUnitState(u, UNIT_STATE_LIFE),
    0.01
  );

  // ---- 超导：冰 + 雷 ----
  clearAuras(target);
  sys.resolve(target.id, target, "ice", 2, { tag: "sc-1" });
  const sc = sys.resolve(target.id, target, "thunder", 2, { tag: "sc-2" });
  checkText("冰→雷：反应 = 超导", "superconduct", sc.id === undefined ? "无" : sc.id);
  checkText("超导：kind = transform", "transform", sc.kind);
  check("超导：附着被扣光（消耗比 1.0）", 0, auraCount(target), 0);
  // 削甲是挂在**受害者**身上的，自己打自己时名单为空 ⇒ 这里**不该**有 buff。
  // 断「没有」而不是断「有」，正是上面那段原因的直接体现。
  check("超导自己打自己：削甲挂在受害者身上，主目标没有", 0, buffCount(target, BuffTypeId.SUPERCONDUCT), 0);

  // ---- 感电：水 + 雷 ----
  clearAuras(target);
  sys.resolve(target.id, target, "water", 2, { tag: "ec-1" });
  const ec = sys.resolve(target.id, target, "thunder", 2, { tag: "ec-2" });
  checkText("水→雷：反应 = 感电", "electro_charged", ec.id === undefined ? "无" : ec.id);
  checkText("感电：kind = transform", "transform", ec.kind);
  check("感电：附着被扣光（消耗比 1.0）", 0, auraCount(target), 0);
  // 感电的 DoT **直接挂在主目标**身上（不看受害者名单），所以这条能看到
  check("感电：主目标挂上 DoT buff（1 层）", 1, buffCount(target, BuffTypeId.ELECTRO_CHARGED), 0);
  // 单层收口：再来一次不应该变成 2 层（叠起来就是双倍每秒伤害）
  clearAuras(target);
  // ⚠️ 必须清 CD，否则这一发的「水」会被上一次感电留下的 `(target.id, water)` 挡掉，
  // 于是**根本没触发第二次感电**、buff 仍是上一次那一条 —— 断言「仍是 1 层」就变成
  // 一句空话（恒真），红不了也绿不了。
  sys.clearCooldowns();
  sys.resolve(target.id, target, "water", 2, { tag: "ec-3" });
  sys.resolve(target.id, target, "thunder", 2, { tag: "ec-4" });
  check("感电再触发：DoT 不叠层（仍是 1 层）", 1, buffCount(target, BuffTypeId.ELECTRO_CHARGED), 0);

  // ⚠️ 必须在**这里**清掉，不能只靠 `finally`：DoT 是 4 秒的，
  // 下一个用例（「同一发派发不自反应」）会立刻读附着状态，而它每一秒都在刷雷附着。
  clearReactionBuffs(target);
  clearAuras(target);
}

// ==================== 草元素线：绽放 / 激化（2026-10-08） ====================

/**
 * 草 + 水（绽放）与草 + 雷（激化）。
 *
 * ## ⚠️ 两条的「可观察性」完全不同，别一起写结论
 *
 *   - **绽放**：与超载/超导/感电同样的限制 —— 它把范围伤害派发给**施法者的敌人**，
 *     而自测是「自己打自己」，受害者名单恒为空 ⇒ **爆炸一点都看不到**。
 *     更麻烦的是它是**延迟**的（`BLOOM_CORE_DELAY_SECONDS`），自测跑完那一拍根本
 *     还没炸。所以这里只能验「反应识别 + 扣附着 + 不崩」，**范围伤害与特效归手动验收**。
 *   - **激化**：和感电的 DoT 一样**直接挂在主目标身上**，所以自测里**看得到**。
 *     这是本轮唯一能在自测里验证落地效果的草线反应 —— 断言「挂上了」和「不叠层」。
 *
 * ## 副作用（都写在注释里，免得下次有人当成泄漏）
 *
 * 绽放会 `scheduler.defer` 一个 1.5 秒后的回调、并在目标脚下留一颗**种子特效**
 * （1.5 秒后自己销毁、换成爆炸特效再销毁 1 秒）。所以自测结束后，目标脚下会
 * 短暂出现两个草元素特效。**那不是 bug** —— 是这条反应被真的触发了的证据。
 */
function testGrassLine(sys: ElementalReactionSystem, target: Actor): void {
  const u = target.handle;
  if (u === undefined || !isAlive(target)) {
    log.warn("草元素线用例跳过：单位句柄已失效");
    return;
  }

  // ---- 绽放：水 + 草 ----
  clearAuras(target);
  clearReactionBuffs(target);
  // ⚠️ 清 CD：`(target.id, water)` 已经被前面的**感电**那一组占掉了（同一帧内不会过期）。
  // 不清的话这一发的「水」被静默挡掉 → 前置附着读不到 → 后面四条连锁全红，
  // 看起来像「绽放没接线」，其实是自测自己把水吞了。2026-10-09 实际就红了 5 条。
  sys.clearCooldowns();
  sys.resolve(target.id, target, "water", 2, { tag: "bl-1" });
  checkText("绽放前置：水附着", "water", sys.peekAuraElement(target) ?? "无");
  const lifeBefore = GetUnitState(u, UNIT_STATE_LIFE);
  const bloom = sys.resolve(target.id, target, "grass", 2, { tag: "bl-2" });
  checkText("水→草：反应 = 绽放", "bloom", bloom.id === undefined ? "无" : bloom.id);
  checkText("绽放：kind = transform", "transform", bloom.kind);
  check("绽放：消耗 2U（消耗比 1.0）", 2, bloom.consumed ?? 0, 0.001);
  check("绽放：附着被扣光", 0, auraCount(target), 0);
  // ⚠️ 爆炸在自测里**验不到**（受害者名单为空 + 延迟 1.5 秒），见函数注释。
  // 这一条钉的是「**当场**不掉血」—— 延迟爆炸本来就不该在判定那一拍结算，
  // 哪天有人把它改成「立刻炸」，这条会红（而正确性其实取决于口径，见下）。
  check(
    "绽放：判定那一拍不掉血（爆炸是延迟的）",
    0,
    lifeBefore - GetUnitState(u, UNIT_STATE_LIFE),
    0.01
  );

  // ---- 激化：草 + 雷 ----
  clearAuras(target);
  clearReactionBuffs(target);
  // ⚠️ 同上：`(target.id, grass)` 刚被上一段的绽放占掉（那段用草当来袭元素）。
  sys.clearCooldowns();
  sys.resolve(target.id, target, "grass", 2, { tag: "qt-1" });
  checkText("激化前置：草附着", "grass", sys.peekAuraElement(target) ?? "无");
  const quick = sys.resolve(target.id, target, "thunder", 2, { tag: "qt-2" });
  checkText("草→雷：反应 = 激化", "quicken", quick.id === undefined ? "无" : quick.id);
  checkText("激化：kind = transform", "transform", quick.kind);
  check("激化：消耗 2U（消耗比 1.0）", 2, quick.consumed ?? 0, 0.001);
  check("激化：附着被扣光", 0, auraCount(target), 0);
  // 激化**不自造伤害**，所以不像另外几条那样有「自己打自己不掉血」那条 ——
  // 它压根没有伤害段。下面这条断的是**落地效果**：buff 挂在主目标身上。
  check("激化：主目标挂上增伤 buff（1 层）", 1, buffCount(target, BuffTypeId.QUICKEN), 0);

  // 属性那一侧：有属性表就该读到雷 / 草两条易伤都是 0.15（EM=0 的基数）。
  // ⚠️ 自测挑的是**场上任意单位**，它的 `ELEMENTAL_MASTERY` 不可控 —— 所以判据
  // 写成「> 0 且雷草两条相等」，而不是硬写 0.15。数值本身归纯函数层
  //（`ElementalReactionTestExample` 的 `quickenVuln` 那组）。
  if (target.hasStatSheet()) {
    const thunderVuln = target.statSheet.getFinal(elemVulnStat("thunder"));
    const grassVuln = target.statSheet.getFinal(elemVulnStat("grass"));
    checkBool(
      "激化：雷易伤 > 0（读到了受击方那一格，实际 " + thunderVuln + "）",
      true,
      thunderVuln > 0
    );
    check(
      "激化：雷、草两条易伤幅度相同（都挂上了）",
      thunderVuln,
      grassVuln,
      0.0001
    );
  } else {
    log.info("激化易伤数值跳过：该单位没有属性表（buff 的属性修正器没有落点）");
  }

  // 单层收口：再来一次不该变成 2 层（两条相加就是 30% 而不是 15%）
  clearAuras(target);
  sys.clearCooldowns();
  sys.resolve(target.id, target, "grass", 2, { tag: "qt-3" });
  sys.resolve(target.id, target, "thunder", 2, { tag: "qt-4" });
  check("激化再触发：增伤不叠层（仍是 1 层）", 1, buffCount(target, BuffTypeId.QUICKEN), 0);

  // ⚠️ 必须在**这里**清掉，不能只靠 `finally`：6 秒的易伤会污染后面每一条
  // 读到目标属性的用例（端到端那一发走完整乘区）。它不产生任何可观察的动作，
  // 所以漏清了**不会报错**，只会让数字对不上。
  clearReactionBuffs(target);
  clearAuras(target);
}

// ==================== 燃烧（草 + 火） ====================

/**
 * 燃烧：草 + 火，单体火 DoT。用户 2026-10-09 定的三个口径 ——
 * 草被**一次性吃光**、触发那一拍**不额外造伤害**、每跳**只打主目标**。
 *
 * ## 自测能验到哪一步
 *
 * 前两个口径都能在这里正面钉死：
 *
 *   - **吃光**：`auraCount(target) === 0`（草附着被扣干净）。
 *   - **触发拍零伤害**：`resolve()` 前后 `GetUnitState(u, LIFE)` 不变。
 *     ⚠️ 注意这只说明「**反应**不额外加伤害」，**不是**「这一拍不掉血」——
 *     真打起来触发燃烧的那发火弹照常造成它自己的伤害（那是伤害管线的事，
 *     不经过 `resolve()`）。别把这条断言读成后者。
 *
 * ⚠️ **DoT 的跳数验不了**（整个自测跑在同一帧，`BuffSystem` 不会 tick），
 * 归纯函数层（`ElementalReactionTestExample` 的 `testBurningSeconds`）。
 */
function testBurning(sys: ElementalReactionSystem, target: Actor): void {
  const u = target.handle;
  if (u === undefined || !isAlive(target)) {
    log.warn("燃烧用例跳过：单位句柄已失效");
    return;
  }

  // ---- 触发 ----
  clearAuras(target);
  clearReactionBuffs(target);
  // ⚠️ 清 CD：`(target.id, grass)` 被前面的**激化**那一组占掉了（同一帧内不会过期）。
  // 不清的话这一发的草被静默挡掉 → 前置附着读不到 → 整段连锁全红。
  sys.clearCooldowns();
  sys.resolve(target.id, target, "grass", 2, { tag: "bn-1" });
  checkText("燃烧前置：草附着", "grass", sys.peekAuraElement(target) ?? "无");
  const lifeBefore = GetUnitState(u, UNIT_STATE_LIFE);
  const burn = sys.resolve(target.id, target, "fire", 2, { tag: "bn-2" });
  checkText("草→火：反应 = 燃烧", "burning", burn.id === undefined ? "无" : burn.id);
  checkText("燃烧：kind = transform", "transform", burn.kind);
  check("燃烧：消耗 2U（消耗比 1.0）", 2, burn.consumed ?? 0, 0.001);
  check("燃烧：附着被扣光（草被一次烧尽）", 0, auraCount(target), 0);
  check("燃烧：主目标挂上 DoT（1 层）", 1, buffCount(target, BuffTypeId.BURNING), 0);
  // ⚠️ 这一条钉的是口径 2（**反应**不额外造伤害）。它**不是**「这一拍不掉血」——
  // 触发它的那发火弹照常走完整乘区，那发生在伤害管线里、不经过 `resolve()`。
  check(
    "燃烧：触发那一拍不额外造伤害（纯 DoT）",
    0,
    lifeBefore - GetUnitState(u, UNIT_STATE_LIFE),
    0.01
  );

  // ---- 单层收口：再来一次不该变成 2 层（两层各跳各的 = 伤害翻倍，且不报错）----
  clearAuras(target);
  sys.clearCooldowns();
  sys.resolve(target.id, target, "grass", 2, { tag: "bn-3" });
  sys.resolve(target.id, target, "fire", 2, { tag: "bn-4" });
  check("燃烧再触发：DoT 不叠层（仍是 1 层）", 1, buffCount(target, BuffTypeId.BURNING), 0);

  // ⚠️ **必须在 `finally` 之前就清掉** —— 这是唯一一条会真打到陪练单位的 DoT，
  // 留着它，自测返回后 `BuffSystem` 会抢跑一跳，把这个单位打伤甚至打死。
  clearReactionBuffs(target);
  clearAuras(target);
}

// ==================== 同一发派发不自反应 ====================

/** 自己打自己只能验证反应与消耗，范围伤害和传播需要敌方单位手动验收。 */
function testSwirl(sys: ElementalReactionSystem, target: Actor): void {
  clearAuras(target);
  sys.clearCooldowns();
  sys.resolve(target.id, target, "fire", 2, { tag: "swirl-aura" });
  const result = sys.resolve(target.id, target, "wind", 2, { tag: "swirl-hit" });
  checkText("扩散火的 id", "swirl_fire", result.id ?? "无");
  checkText("扩散是剧变", "transform", result.kind);
  check("扩散消耗 2U", 2, result.consumed ?? 0, 0.001);
  check("扩散后主目标不回挂附着", 0, auraCount(target), 0);
  // 无附着时保留风附着；以新场景清 CD 避免同帧用例互相影响。
  sys.clearCooldowns();
  const empty = sys.resolve(target.id, target, "wind", 2, { tag: "wind-empty" });
  checkText("无附着风弹不触发反应", "none", empty.kind);
  checkText("无附着风弹挂风", "wind", sys.peekAuraElement(target) ?? "无");
  clearAuras(target);
}

function testSameDispatchGuard(sys: ElementalReactionSystem, target: Actor): void {
  clearAuras(target);
  // 同一 dispatch：先挂火，再打水 —— 火是「这一发自己挂的」，不该触发蒸发
  const same: object = { tag: "same-dispatch" };
  sys.resolve(9008, target, "fire", 2, same);
  const r = sys.resolve(9008, target, "water", 1, same);
  checkText("同一次派发：火→水不自反应", "none", r.kind);
}

// ==================== 附着 CD ====================

function testCooldown(sys: ElementalReactionSystem, target: Actor): void {
  clearAuras(target);
  // 同一来源、同一元素，连挂两次（第二次给更大的量）
  sys.resolve(9009, target, "wind", 2, { tag: "cd1" });
  sys.resolve(9009, target, "wind", 4, { tag: "cd2" });
  // CD 生效的话，第二次被挡 → 元素量停在 2U（而不是刷成 4U）
  check("同源同元素 CD 内不重复附着：停在 2U", 2, sys.peekAuraGauge(target), 0.5);
  check("CD 内仍只有一条附着", 1, auraCount(target), 0);

  // 换个元素不受同一个 CD 影响（CD 键是 来源×元素）
  // 同 testOverwrite：岩与风不反应，换元素只覆盖附着。
  const r = sys.resolve(9009, target, "rock", 2, { tag: "cd3" });
  checkText("同源换元素：CD 不拦（无反应则覆盖）", "none", r.kind);
  checkText("同源换元素：附着变岩", "rock", sys.peekAuraElement(target) ?? "无");
}

// ==================== 不泄漏 ====================

function testNoLeak(sys: ElementalReactionSystem, target: Actor): void {
  clearAuras(target);
  // 未登记的载荷应恒为 0
  check("待认领的施法载荷不泄漏", 0, sys.pendingCount(), 0);
  // CD 表条目数是个小数（本轮只用了几个来源），断言上界防永久泄漏
  checkBool("CD 表条目数有界（< 64）", true, sys.cooldownCount() < 64);
}

// ==================== 端到端：施法载荷 → 管线认领 → 附着落地 ====================

/**
 * 这一条**串起了 Step 3 的全部接线**，也是本轮唯一一处真的引擎调用：
 *
 * ```
 * registerSpellElement(sourceId, targetId, "fire", 2, 1)   ← 技能 handler 该做的事
 *   （第 4 个是附着量 U，第 5 个是**结算基数** —— 它才是真正算伤害用的那个数；
 *     下面 `UnitDamageTarget` 的那个 1 只负责让引擎派发出一次伤害事件）
 *   ↓
 * UnitDamageTarget(u, u, 1, false, false, MAGIC, COLD, WHOKNOWS)   ← 同步派发伤害事件
 *   ↓
 * DamagePipeline(100) → addNonPhysicalNative → claimSpellElement() 认领
 *   ↓
 * dealElemental → resolve() → 目标身上挂上火附着
 * ```
 *
 * ## 为什么「自己打自己」
 *
 * 只需要一个 `(source, target)` 对，而自己就是现成的两个角色 —— 不必再去找第二个单位、
 * 也不必管它站哪、还活着没有。伤害给 **1** 点：附着量由 `gauge` 决定，与伤害无关，
 * 所以不需要为了看清附着而真打疼它（打疼了反而有把它打死的风险，见 `isAlive`）。
 *
 * ⚠️ 这一发会走**完整乘区**（元素加成 / 暴击 / 抗性 / 免伤）并飘一个伤害数字 ——
 * 都是预期内的，不是异常。
 */
function testSpellClaimEndToEnd(sys: ElementalReactionSystem, target: Actor): void {
  clearAuras(target);
  // ⚠️ 清 CD：`(target.id, fire)` 被最前面的**超载**那一组占掉了（同一帧内不会过期）。
  // 不清的话载荷认领、管线归类全都对，只有最后那一步「挂附着」被静默挡掉 ——
  // 端到端那两条会红，看起来像「接线断了」，其实是 CD。
  sys.clearCooldowns();
  const u = target.handle;
  if (u === undefined || !isAlive(target)) {
    log.warn("端到端用例跳过：单位句柄已失效");
    return;
  }

  // 1) 施法者「声明」本次的元素（真技能 handler 就是这么写的）
  sys.registerSpellElement(target.id, target.id, "fire", 2, 1);

  // 2) 造伤害。⚠️ 必须是**非物理**伤害类型（`DAMAGE_TYPE_COLD`），否则走的是
  //    物理分支（`addPhysical`），压根不问载荷 —— 那才是「火伤被静默算成物理」的老毛病。
  UnitDamageTarget(
    u,
    u,
    1,
    false,
    false,
    ATTACK_TYPE_MAGIC(),
    DAMAGE_TYPE_COLD(),
    WEAPON_TYPE_WHOKNOWS()
  );

  // 3) 附着落地 = 整条链通了
  checkText("端到端：目标挂上火附着", "fire", sys.peekAuraElement(target) ?? "无");
  check("端到端：附着量 2U（来自载荷，不是伤害）", 2, sys.peekAuraGauge(target), 0.05);
  // 4) 载荷认领即删 —— 留一条在表里说明 `claimSpellElement` 没接上
  check("端到端：载荷已被认领，不残留", 0, sys.pendingCount(), 0);
}
