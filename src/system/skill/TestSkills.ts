/**
 * 吸血 / 治疗 / 治疗加成 / 神圣护盾 / 眩晕 / 减速 / 禁锢 / 冻结 /
 * 火弹 / 水弹 / 冰弹 / 雷弹 / 草弹 —— 十三个测试技能的**定义与接线**。
 *
 * ## 这些技能是哪来的
 *
 * 物编里原先只有四个 `ANcl`（通魔）空模板 `A000`~`A003`，没有任何真技能。
 * 本模块对应 `maps/table/ability.ini` 里新加的 **`A010`（吸血）**、
 * **`A011`（治疗）**、**`A012`（治疗加成）**、**`A013`（神圣护盾）**、
 * **`A014`（眩晕）**、**`A015`（减速）**、**`A016`（禁锢）**、**`A017`（冻结）**、
 * **`A018`（火弹）**、**`A019`（水弹）**、**`A01A`（冰弹）**、**`A01B`（雷弹）**、
 * **`A01C`（草弹）** 十三段，
 * rawcode 必须与那边的段名逐字一致。
 * ⚠️ `A017` 曾经是**空引用**（TS 里有、ini 里没有），症状是「`FreezeBuff`
 * 从没在游戏里跑过」—— 每次加技能都要反解 `ability.ini` 确认段真的进包了。
 *
 * ## 五个元素弹为什么和别的技能不一样
 *
 * 其余八个都是「挂一条 buff」或「回一口血」；这五个是**本仓仅在的带元素归属的伤害**。
 * 原生伤害事件里没有任何元素信息，所以它们得先把「这一发是什么元素」声明给
 * `ElementalReactionSystem`，管线才会把伤害重新归类成火/水/冰/雷并判反应。
 * 完整链路见 `TestSkills_castElementBolt()`。
 *
 * ⚠️ **`A017`（直接冻结）与「水 + 冰 → 冻结」是两条独立的路**：前者是测试技能，
 * 直给 `FreezeBuff`；后者是元素反应（`reactionTable.FROZEN`）。两条都收口到
 * `BuffManager.addFreezeBuff`，所以韧性都生效。
 *
 * ## 为什么没有像 `ItemRelicBridge` 那样自建原生触发器
 *
 * 物品那边必需，是因为拾取/丢弃没有 `gameEvents` 包装。技能不一样 ——
 * `GameEventManager.registerSpellEvent()` 早就把 `EVENT_PLAYER_UNIT_SPELL_EFFECT`
 * 注册好了，而且每次派发会**同时**发两个频道：通用频道，以及
 * `${UNIT_SPELL_EFFECT}:${abilityId}` 这个技能专属频道
 * （`GameEvent.ts:307-310`）。`onSpellEffect(handler, abilityId)` 订阅的就是后者。
 * 再自建一个触发器等于把同一件事抄第二遍。
 *
 * ## 单位怎么拿到技能
 *
 * 技能是物编对象，但**不会自己长到单位身上** —— 得有人 `addAbility`。
 * 分成两处发放（用户口径：两边都挂）：
 *
 *   - `grantTestSkillsTo(actor)` —— 单个单位。debug 脚手架造单位时逐个调（`UnitEventExample`）。
 *   - `grantTestSkills()`      —— 扫 `Actor.allActors`，给**本地玩家**拥有的单位补一遍。
 *
 * 为什么用 `GetUnitAbilityLevel` 判重而不是自己记一张「发过了」的表：
 * `Actor.id` 是**句柄 id**，单位死了以后会被引擎回收复用 —— 记表会让复用同一 id 的
 * 新单位永远领不到技能，而这种漏发是**静默**的。
 */

import {
  ATTACK_TYPE_MAGIC,
  DAMAGE_TYPE_COLD,
  MapPlayer,
  WEAPON_TYPE_WHOKNOWS,
} from "@eiriksgata/wc3ts/*";
import { Actor } from "src/system/actor";
import { applyHeal } from "src/system/combat";
import { ElementalReactionSystem } from "src/system/element/ElementalReactionSystem";
import { gameEvents, SpellEventData } from "src/system/event";
import { ElementId } from "src/system/stat";
import type { ShieldElement } from "src/system/buff/ShieldRules";
import { FourCC } from "src/utils/helper";
import {
  DIVINE_SHIELD_DISPLAY_KEY,
  HealBonusBuff,
  HEAL_BONUS_DURATION,
  LifestealBuff,
  LIFESTEAL_DURATION,
} from "./SkillBuffs";
import { createLogger } from "src/utils/logger";

const log = createLogger("TestSkills");

/**
 * 「治疗」的基础治疗量（**不含**治疗加成，加成由 `applyHeal` 乘上去）。
 *
 * 数值先写成 TS 常量而不是读物编 `DataA`：物编那套 `DataA..F` 的语义是按
 * 技能基类分的，从 TS 读回来还得自己解析，本轮先不引入那层。调数值改这里。
 */
const HEAL_BASE = 200;

/** 吸血：无目标，给自己挂限时吸血 buff */
export const AB_LIFESTEAL = FourCC("A010");
/** 治疗：单位目标 */
export const AB_HEAL = FourCC("A011");
/** 治疗加成：单位目标，给目标挂限时治疗加成 buff */
export const AB_HEAL_BONUS = FourCC("A012");
/** 神圣护盾：无目标，给自己挂限时护盾 buff */
export const AB_DIVINE_SHIELD = FourCC("A013");
/** 眩晕：单位目标，把目标定住若干秒 */
export const AB_STUN = FourCC("A014");
/** 减速：单位目标，移速减半，但目标照常攻击与施法 */
export const AB_SLOW = FourCC("A015");
/** 禁锢：单位目标，移速归零，但目标照常攻击与施法 */
export const AB_ROOT = FourCC("A016");
/** 冻结：单位目标，完全无法操作，且被打疼了会碎冰 */
export const AB_FREEZE = FourCC("A017");
/** 火弹：单位目标，打出一发**带火焰元素归属**的伤害（会挂火附着 / 触发蒸发） */
export const AB_FIRE_BOLT = FourCC("A018");
/** 水弹：单位目标，打出一发**带水元素归属**的伤害（会挂水附着 / 触发蒸发） */
export const AB_WATER_BOLT = FourCC("A019");
/** 冰弹：单位目标，打出一发**带冰元素归属**的伤害（会挂冰附着 / 触发融化、冻结） */
export const AB_ICE_BOLT = FourCC("A01A");
/** 雷弹：单位目标，打出一发**带雷元素归属**的伤害（会挂雷附着 / 触发超载、超导、感电） */
export const AB_THUNDER_BOLT = FourCC("A01B");
/** 草弹：单位目标，打出一发**带草元素归属**的伤害（会挂草附着 / 触发绽放、激化） */
export const AB_GRASS_BOLT = FourCC("A01C");
/** 风弹：扩散目标的火 / 水 / 雷 / 冰 / 草附着。 */
export const AB_WIND_BOLT = FourCC("A01D");
/** 岩弹：目标带火 / 水 / 雷 / 冰附着时生成结晶碎片。 */
export const AB_ROCK_BOLT = FourCC("A01E");

/**
 * 「神圣护盾」的基础护盾量与持续时间。
 *
 * **不含护盾强效** —— 强效是 `BuffManager.addShieldBuff` 在发放时乘上去的
 * （那里是护盾值的唯一收口，见 `BuffManager.applyShieldStrength`）。
 * 所以这里写 100，带着「守护护符」时会变成 150。
 *
 * 数值放 TS 常量而不是读物编 `DataA`：与 `HEAL_BASE` 同一个理由（那些字段语义按基类分）。
 */
const SHIELD_BASE = 100;
const SHIELD_DURATION = 10;
/** 技能护盾的实际元素；可改成七元素之一。none 保留原神圣护盾的普通承伤。 */
const DIVINE_SHIELD_ELEMENT: ShieldElement = "none";

/**
 * 「眩晕」的**基础**时长（秒）。
 *
 * **不含韧性** —— 韧性是 `BuffManager.addStunBuff` 在发放时乘上去的
 * （那里是眩晕时长的唯一收口，见 `BuffManager.applyTenacity`）。
 * 所以这里写 5，目标带着「坚定护符」时会变成 2.5。
 *
 * 数值放 TS 常量而不是读物编 `DataA`：与 `HEAL_BASE` / `SHIELD_BASE` 同一个理由
 * （那些字段语义按基类分）。
 */
const STUN_BASE_DURATION = 5;

/**
 * 「减速」的基础时长（秒）。**不含韧性**（`addSlowBuff` 是唯一收口）。
 *
 * 给到 8 秒、比眩晕的 5 秒长得多是有意的：减速是这一组里**最温和**的控制
 * （目标照常打人），所以配最长的窗口；副作用是「韧性把它砍掉一半」在游戏里
 * 也看得更清楚。
 */
const SLOW_BASE_DURATION = 8;

/**
 * 「禁锢」的基础时长（秒）。**不含韧性**（`addRootBuff` 是唯一收口）。
 *
 * 比眩晕短（3 < 5）：禁锢期间目标仍能攻击施法，但它**站着不动**，
 * 是个更容易打中的靶子 —— 这种效果不适合给太长。
 */
const ROOT_BASE_DURATION = 3;

/**
 * 「冻结」的基础时长（秒）。**不含韧性**（`addFreezeBuff` 是唯一收口）。
 *
 * 比眩晕（5 秒）短一点是有意的：冻结**可以被打碎**，实际持续时间取决于对手，
 * 写太长会让「碎冰」这个机制显得多余（本来就快到期了）。
 */
const FREEZE_BASE_DURATION = 4;

/**
 * 「火弹」/「水弹」打出的伤害基数。
 *
 * **不含**元素加成 / 暴击 / 抗性 / 免伤 —— 那些由 `DamagePipeline` 走完整乘区时叠上
 * （技能声明的是「这一发是火伤」，不是「这一发打多少」）。所以这个 100 在带火伤加成的
 * 单位手里会打出更高的数，这是**要的**。
 */
const ELEMENT_BOLT_DAMAGE = 100;

/**
 * 「火弹」/「水弹」挂上的**元素量**（U）。2U ≈ 15 秒的自行为期（见 `AURA_DECAY_PER_SECOND`）。
 *
 * 给 2U 而不是 1U 是有意的：水打火时消耗比是 0.5，2U 水只吃掉 1U 火，
 * 目标身上**还剩 1U 火**（图标不消失、只是时间条短了一半）—— 一眼就能看出
 * 「反应消耗了附着」而不是「附着被整个替换了」。
 */
const ELEMENT_BOLT_GAUGE = 2;

/**
 * 发放用的技能表。
 *
 * **字面量数组一次建出来**（密集、无洞）—— 事后按下标写、留 `undefined` 的数组
 * 在 Lua 里 `.length` 是 0，遍历会整段静默失效（记忆 `wc3-tstl-sparse-array-length`）。
 *
 * 加技能**只改这一个数组**：`grantTestSkillsTo()` 与 `grantTestSkills()` 两条发放路径
 * 都遍历它，不需要各自再写一遍。
 */
const ALL_TEST_ABILITIES: number[] = [
  // AB_LIFESTEAL,  // 吸血
  // AB_HEAL,     // 生命恢复
  // AB_HEAL_BONUS, // 治疗效果提升
  // AB_DIVINE_SHIELD, // 护盾
  // AB_STUN, // 眩晕
  // AB_SLOW, // 减速
  // AB_ROOT, // 禁锢
  AB_FREEZE,
  AB_FIRE_BOLT,
  AB_WATER_BOLT,
  AB_ICE_BOLT,
  AB_THUNDER_BOLT,
  // AB_GRASS_BOLT, // 查看草元素对水结晶护盾的克制效果
  // AB_WIND_BOLT,
  // AB_ROCK_BOLT,
];

let bound = false;

/**
 * 订阅五个技能的效果事件。**幂等** —— 热重载会重复调 `initialize()`，
 * 不守的话同一个技能上会挂两遍处理函数，一次施法加两层 buff。
 */
export function initTestSkills(): void {
  if (bound) {
    return;
  }
  bound = true;

  gameEvents.onSpellEffect((data: SpellEventData) => TestSkills_onLifesteal(data), AB_LIFESTEAL);
  gameEvents.onSpellEffect((data: SpellEventData) => TestSkills_onHeal(data), AB_HEAL);
  gameEvents.onSpellEffect((data: SpellEventData) => TestSkills_onHealBonus(data), AB_HEAL_BONUS);
  gameEvents.onSpellEffect((data: SpellEventData) => TestSkills_onDivineShield(data), AB_DIVINE_SHIELD);
  gameEvents.onSpellEffect((data: SpellEventData) => TestSkills_onStun(data), AB_STUN);
  gameEvents.onSpellEffect((data: SpellEventData) => TestSkills_onSlow(data), AB_SLOW);
  gameEvents.onSpellEffect((data: SpellEventData) => TestSkills_onRoot(data), AB_ROOT);
  gameEvents.onSpellEffect((data: SpellEventData) => TestSkills_onFreeze(data), AB_FREEZE);
  gameEvents.onSpellEffect((data: SpellEventData) => TestSkills_onWaterBolt(data), AB_WATER_BOLT);
  gameEvents.onSpellEffect((data: SpellEventData) => TestSkills_onIceBolt(data), AB_ICE_BOLT);
  gameEvents.onSpellEffect((data: SpellEventData) => TestSkills_onFireBolt(data), AB_FIRE_BOLT);
  gameEvents.onSpellEffect((data: SpellEventData) => TestSkills_onThunderBolt(data), AB_THUNDER_BOLT);
  gameEvents.onSpellEffect((data: SpellEventData) => TestSkills_onGrassBolt(data), AB_GRASS_BOLT);
  gameEvents.onSpellEffect((data: SpellEventData) => TestSkills_onWindBolt(data), AB_WIND_BOLT);
  gameEvents.onSpellEffect((data: SpellEventData) => TestSkills_castElementBolt(data, "rock"), AB_ROCK_BOLT);

  log.info(
    "测试技能已接线：吸血 / 治疗 / 治疗加成 / 神圣护盾 / 眩晕 / 减速 / 禁锢 / 冻结 / 火弹 / 水弹 / 冰弹 / 雷弹 / 草弹 / 风弹 / 岩弹"
  );
}

// ===========================================================================
// 技能效果
// ===========================================================================

/** A010 吸血：无目标技能，给**施法者自己**挂吸血 buff */
function TestSkills_onLifesteal(data: SpellEventData): void {
  // 无目标技能没有 `targetUnit`，受益人是施法者本人。取不到施法者是异常情况
  // （事件本该总带着它），但在这里抛出去会冒泡到触发器回调里 —— 挡一下更划算。
  if (data.Actor === undefined) {
    log.warn("技能「吸血」没取到施法者：" + TestSkills_describe(data));
    return;
  }
  // ⚠️ **这一步只挂属性，不打人也不回血**。回血在 `LifestealSystem`（下一阶段）里，
  // 它订阅伤害事件、读的正是这个 buff 挂上去的 `LIFESTEAL`。
  data.Actor.buffManager.addBuff(new LifestealBuff(LIFESTEAL_DURATION));
  log.info("技能「吸血」被释放：" + TestSkills_describe(data));
}

/** A011 治疗：治疗目标单位 */
function TestSkills_onHeal(data: SpellEventData): void {
  if (data.targetUnit === undefined) {
    // 取不到目标 = 技能的目标类型与物编对不上（Channel 的经典坑）。
    // 这是**要修的配置问题**，不是异常，所以 warn 而不是 error、也不抛。
    log.warn("技能「治疗」没取到目标单位：" + TestSkills_describe(data));
    return;
  }
  const healed = applyHeal(data.targetUnit, HEAL_BASE, data.Actor);
  log.info("技能「治疗」被释放：" + TestSkills_describe(data) + " 实际回复=" + healed);
}

/** A012 治疗加成：给目标单位挂治疗加成 buff */
function TestSkills_onHealBonus(data: SpellEventData): void {
  if (data.targetUnit === undefined) {
    // 同 `onHeal`：取不到目标是物编的目标类型写错了，不是异常。
    log.warn("技能「治疗加成」没取到目标单位：" + TestSkills_describe(data));
    return;
  }
  // **只管挂**。到期摘除、属性还原都是 `BuffSystem` + `BuffManager` 的事
  //（见 `SkillBuffs.ts` 文件头），这里不写配对的手动移除 —— 写了反而是两份生命周期。
  data.targetUnit.buffManager.addBuff(new HealBonusBuff(HEAL_BONUS_DURATION));
  log.info("技能「治疗加成」被释放：" + TestSkills_describe(data));
}

/**
 * A013 神圣护盾：无目标技能，给**施法者自己**挂一个限时护盾。
 *
 * **只管挂**。10 秒到期、盾被打空，都是 `BuffManager.tick` 的事 ——
 * `ShieldBuff` 是 `Buff` 的子类、带着 `duration`，`isExpired()` / `isDepleted()`
 * 两条摘除路径都现成，这里不写配对的手动移除（写了反而是两份生命周期）。
 *
 * `displayKey` 传的是自定义 key 而**不是** `BuffTypeId.SHIELD`：传类型 id 会让这个
 * 护盾在 buff 栏上显示成通用的「护盾」，而不是「神圣护盾」（见 `SkillBuffs.ts`）。
 */
function TestSkills_onDivineShield(data: SpellEventData): void {
  // 无目标技能没有 `targetUnit`，受益人是施法者本人（同 `onLifesteal`）
  if (data.Actor === undefined) {
    log.warn("技能「神圣护盾」没取到施法者：" + TestSkills_describe(data));
    return;
  }
  data.Actor.addElementalShield(SHIELD_BASE, DIVINE_SHIELD_ELEMENT, SHIELD_DURATION, DIVINE_SHIELD_DISPLAY_KEY);
  // ⚠️ 打 `data.Actor.shield` 而不是 `SHIELD_BASE`：**这一行就是「护盾强效有没有生效」
  // 的读数**。属性来源摘干净时打 100，带着「守护护符」时打 150。
  // 打常量的话这一行永远是 100，强效接没接上从日志上完全看不出来。
  log.info("技能「神圣护盾」被释放：" + TestSkills_describe(data) + " 护盾=" + data.Actor.shield);
}

/**
 * A014 眩晕：单位目标技能，把目标定住若干秒。
 *
 * **只管挂**。解除暂停、到期摘除都是 `BuffManager` + `StunBuff` 的事 ——
 * `StunBuff` 带着 `duration`，`isExpired()` 那条路径现成，这里不写配对的手动解除
 * （写了反而是两份生命周期，而且手动解除拿不到「还有没有别的眩晕撑着」这个信息）。
 */
function TestSkills_onStun(data: SpellEventData): void {
  if (data.targetUnit === undefined) {
    // 同 `onHeal`：取不到目标是物编的目标类型写错了，不是异常
    log.warn("技能「眩晕」没取到目标单位：" + TestSkills_describe(data));
    return;
  }
  const buff = data.targetUnit.buffManager.addStunBuff(STUN_BASE_DURATION);
  // ⚠️ 打**实际时长**而不是 `STUN_BASE_DURATION`：**这一行就是「韧性有没有生效」
  // 的读数**。属性来源摘干净时打 5，带着「坚定护符」时打 2.5。
  // 打常量的话这一行永远是 5，韧性接没接上从日志上完全看不出来。
  // `buff === undefined` = 被韧性完全免疫（`addStunBuff` 没挂、也没暂停）。
  const actual = buff === undefined ? 0 : buff.duration;
  log.info("技能「眩晕」被释放：" + TestSkills_describe(data) + " 实际时长=" + actual);
}

/**
 * A015 减速：单位目标技能，让目标 8 秒内移速减半。
 *
 * **只管挂**。`SlowBuff` 是纯属性 buff：属性修正器由 `BuffManager.addBuff()` 挂上、
 * `detach()` 摘掉，到期自动还原 —— 这里一行配对代码都不用写（与 `onHealBonus` 同一个分工）。
 *
 * ⚠️ **走 `addSlowBuff` 而不是 `addBuff(new SlowBuff(...))`** —— 前者是时长的唯一收口，
 * 韧性在那里生效。直接 `addBuff` 会**静默不吃韧性**（buff 挂得上、图标也在、时长不缩）。
 */
function TestSkills_onSlow(data: SpellEventData): void {
  if (data.targetUnit === undefined) {
    // 同 `onHeal`：取不到目标是物编的目标类型写错了，不是异常
    log.warn("技能「减速」没取到目标单位：" + TestSkills_describe(data));
    return;
  }
  const buff = data.targetUnit.buffManager.addSlowBuff(SLOW_BASE_DURATION);
  // ⚠️ 打**实际时长**而不是 `SLOW_BASE_DURATION`：**这一行就是「韧性有没有生效」
  // 的读数**（同 `onStun`）。属性来源摘干净时打 8，带着「坚定护符」时打 4。
  // `buff === undefined` = 被韧性完全免疫。
  const actual = buff === undefined ? 0 : buff.duration;
  log.info("技能「减速」被释放：" + TestSkills_describe(data) + " 实际时长=" + actual);
}

/**
 * A016 禁锢：单位目标技能，让目标 3 秒内移速归零 —— **但它照常攻击、施法**。
 *
 * 「仍能攻击」不是漏做，而是**这条路能表达的极限**：`SetUnitMoveSpeed` 只影响寻路移动，
 * 禁操作要 `PauseUnit`（那是 `StunBuff` 那条线）。细节见 `ControlBuffs.ts` 文件头。
 *
 * ⚠️ 同上：只能 `addRootBuff()`，直接 `addBuff()` 会跳过韧性。
 */
function TestSkills_onRoot(data: SpellEventData): void {
  if (data.targetUnit === undefined) {
    // 同 `onHeal`：取不到目标是物编的目标类型写错了，不是异常
    log.warn("技能「禁锢」没取到目标单位：" + TestSkills_describe(data));
    return;
  }
  const buff = data.targetUnit.buffManager.addRootBuff(ROOT_BASE_DURATION);
  // ⚠️ 打**实际时长**（同 `onStun` / `onSlow`）。摘干净时打 3，带「坚定护符」时打 1.5。
  const actual = buff === undefined ? 0 : buff.duration;
  log.info("技能「禁锢」被释放：" + TestSkills_describe(data) + " 实际时长=" + actual);
}

/**
 * A017 冻结：单位目标技能，把目标**完全定住**（不能移动、攻击、施法）若干秒；
 * 期间若吃到够疼的一击（≥ 最大生命的 15%）会**碎冰**，提前解冻并炸一次冰伤。
 *
 * **只管挂**。解冻（到期、碎冰、死亡清理）全是 `BuffManager.detach()` 的事；
 * 碎冰与冰爆在 `FreezeShatterSystem` 里，它订阅伤害事件，这里一个字都不涉及。
 *
 * ⚠️ **走 `addFreezeBuff` 而不是 `addBuff(new FreezeBuff(...))`** —— 前者是时长的
 * 唯一收口，韧性在那里生效（同 `onStun` / `onSlow` / `onRoot`）。
 */
function TestSkills_onFreeze(data: SpellEventData): void {
  if (data.targetUnit === undefined) {
    // 同 `onHeal`：取不到目标是物编的目标类型写错了，不是异常
    log.warn("技能「冻结」没取到目标单位：" + TestSkills_describe(data));
    return;
  }
  const buff = data.targetUnit.buffManager.addFreezeBuff(FREEZE_BASE_DURATION, undefined, data.Actor?.id ?? 0);
  // ⚠️ 打**实际时长**（同 `onStun`）：摘干净时打 4，带「坚定护符」时打 2。
  // 碎冰是这条日志**之后**才可能发生的事，别把它和时长读混了。
  const actual = buff === undefined ? 0 : buff.duration;
  log.info("技能「冻结」被释放：" + TestSkills_describe(data) + " 实际时长=" + actual);
}

// ===========================================================================
// 元素载荷通道（§2.2）
// ===========================================================================

/**
 * A018 火弹：单位目标，打出一发**火焰元素**伤害。
 *
 * ⚠️ **顺序不能反**：先 `registerSpellElement`（声明这一发是什么元素），
 * 再 `UnitDamageTarget`（造伤害）。`UnitDamageTarget` 会**同步**派发伤害事件，
 * 管线在回调里 `claimSpellElement()` 认领 —— 反过来的话管线先跑完、认领不到，
 * 这发火弹就退化成「未分类伤害」：既没有火附着、也吃不到火伤加成。
 */
function TestSkills_onFireBolt(data: SpellEventData): void {
  TestSkills_castElementBolt(data, "fire");
}

/** A019 水弹：单位目标，打出一发**水元素**伤害。与火弹是同一套接线，只有元素不同 */
function TestSkills_onWaterBolt(data: SpellEventData): void {
  TestSkills_castElementBolt(data, "water");
}

/**
 * A01A 冰弹：单位目标，打出一发**冰元素**伤害。与火弹/水弹是同一套接线。
 *
 * 它是**冻结的唯一元素来源** —— 水弹 + 冰弹（任一顺序）触发冻结，
 * 见 `reactionTable.ts` 的 `FROZEN`。
 */
function TestSkills_onIceBolt(data: SpellEventData): void {
  TestSkills_castElementBolt(data, "ice");
}

/**
 * A01B 雷弹：单位目标，打出一发**雷元素**伤害。与火弹/水弹/冰弹是同一套接线。
 *
 * 它是**三条剧变反应（超载 / 超导 / 感电）的唯一元素来源** ——
 * 火+雷、冰+雷、水+雷（任一顺序），见 `reactionTable.ts` 的
 * `OVERLOAD` / `SUPERCONDUCT` / `ELECTRO_CHARGED`。
 */
function TestSkills_onThunderBolt(data: SpellEventData): void {
  TestSkills_castElementBolt(data, "thunder");
}

/**
 * A01C 草弹：单位目标，打出一发**草元素**伤害。与火弹/水弹/冰弹/雷弹是同一套接线。
 *
 * 它是**绽放（水+草）与激化（雷+草）两条剧变反应的唯一元素来源**（任一顺序），
 * 见 `reactionTable.ts` 的 `BLOOM` / `QUICKEN`。
 */
function TestSkills_onGrassBolt(data: SpellEventData): void {
  TestSkills_castElementBolt(data, "grass");
}

function TestSkills_onWindBolt(data: SpellEventData): void {
  TestSkills_castElementBolt(data, "wind");
}

/**
 * 元素弹的公共实现。**只差一个 `element`** —— 六个技能各写一遍是会写歪的那种重复
 * （改了火弹忘了改水弹）。
 */
function TestSkills_castElementBolt(data: SpellEventData, element: ElementId): void {
  const caster = data.Actor;
  const target = data.targetUnit;
  if (caster === undefined || target === undefined) {
    // 取不到目标是物编的目标类型写错了（Channel 的经典坑），不是异常 —— 同 `onHeal`
    log.warn("元素弹没取到施法者或目标：" + TestSkills_describe(data));
    return;
  }

  const cu = caster.handle;
  const tu = target.handle;
  if (cu === undefined || tu === undefined || GetUnitTypeId(tu) === 0) {
    // 句柄失效就别往下走了 —— 拿废句柄去 `UnitDamageTarget` 是访问违例
    log.warn("元素弹的施法者或目标句柄失效：" + TestSkills_describe(data));
    return;
  }

  // 1) 声明这一发打出去的**元素**（管线靠它把伤害重新归类，并挂附着 / 判反应）
  //
  // ⚠️ `ELEMENT_BOLT_DAMAGE` 要**同时**传进这里和 `UnitDamageTarget`，两个数必须一样。
  //    下面那行是**引擎**算的，它会按目标的护甲类型再乘一次攻/防类型表
  //    （实测打英雄 ×0.5、打步兵 ×2.0）；这里传的才是**真正结算用的基数**。
  //    只改一处就会出现「技能写 100、实际打出去 50」这种对不上的数。
  ElementalReactionSystem.getInstance().registerSpellElement(
    caster.id,
    target.id,
    element,
    ELEMENT_BOLT_GAUGE,
    ELEMENT_BOLT_DAMAGE
  );

  // 2) 造伤害。`DAMAGE_TYPE_COLD` 只是「**非物理**伤害类型」的一个入口 ——
  //    真正决定它是火还是水的，是上面那行载荷声明。
  //
  // ⚠️ **不要改成 `DAMAGE_TYPE_NORMAL`（= 引擎的物理）**：那条路走 `addPhysical`
  //    的护甲比例替换，**压根不问载荷** —— 症状正是本轮要修的那个
  //    「元素伤害被静默算成物理」。
  //
  //    这里的 `ELEMENT_BOLT_DAMAGE` 只是喂给引擎、好让它派发出一次伤害事件
  //    （事件是认领载荷的唯一时机），**结算不用它** —— 见上面那行的注释。
  UnitDamageTarget(
    cu,
    tu,
    ELEMENT_BOLT_DAMAGE,
    false,
    false,
    ATTACK_TYPE_MAGIC(),
    DAMAGE_TYPE_COLD(),
    WEAPON_TYPE_WHOKNOWS()
  );

  log.info(
    "元素弹「" + element + "」被释放：" + TestSkills_describe(data) +
    " 基数=" + ELEMENT_BOLT_DAMAGE + " 元素量=" + ELEMENT_BOLT_GAUGE
  );
}

/**
 * 把一次技能事件描述成一行日志。
 *
 * 目标单位打印 `id` 而不是名字：`getDisplayName()` 会去查对象数据，而这几个技能
 * 现在正是在排查「目标到底取到没有」，打印取名字的过程会把它自己的失败也混进来。
 */
function TestSkills_describe(data: SpellEventData): string {
  const caster = data.Actor === undefined ? "无" : String(data.Actor.id);
  const target = data.targetUnit === undefined ? "无" : String(data.targetUnit.id);
  return "施法者=" + caster + " 目标单位=" + target;
}

// ===========================================================================
// 技能发放
// ===========================================================================

/**
 * 给一个单位补上全部测试技能。**已经有的不重复加**。
 *
 * `addAbility` 对已存在的技能不是空操作 —— 它会把技能等级重置回 1，
 * 所以哪怕只是重复调一次，也得挡住。
 */
export function grantTestSkillsTo(actor: Actor | undefined): void {
  if (actor === undefined) {
    return;
  }
  const u = actor.handle;
  for (let i = 0; i < ALL_TEST_ABILITIES.length; i++) {
    const ability = ALL_TEST_ABILITIES[i];
    if (ability === undefined) {
      continue;
    }
    if (GetUnitAbilityLevel(u, ability) > 0) {
      continue;
    }
    actor.addAbility(ability);
  }
}

/**
 * 扫场上全部 `Actor`，给**本地玩家**拥有的单位发放测试技能。
 *
 * 与 `grantTestSkillsTo` 的分工见文件头。必须在单位造出来**之后**调 ——
 * `Actor.allActors` 里有什么，取决于调用的时机。
 */
export function grantTestSkills(): void {
  const localId = MapPlayer.fromLocal().id;
  let count = 0;

  // 与 `BuffSystem` 同一个遍历写法。**不用 `Object.keys` + `for-of`** ——
  // 遍历 Lua 表的键这件事在本仓库有既成写法，别另开一种。
  for (const id in Actor.allActors) {
    const actor = Actor.allActors[id];
    if (actor === undefined) {
      continue;
    }
    if (actor.owner === undefined || actor.owner.id !== localId) {
      continue;
    }
    grantTestSkillsTo(actor);
    count++;
  }

  log.info("已给 " + count + " 个本地玩家单位发放测试技能");
}
