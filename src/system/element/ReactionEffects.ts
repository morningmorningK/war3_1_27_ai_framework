/**
 * 剧变反应的**落地效果** —— 超载 / 超导 / 感电 / 绽放 / 燃烧 / 扩散各自「打什么、给谁、还附带什么」。
 *
 * ## 它在链路里的位置
 *
 * ```
 * 伤害事件 → DamagePipeline → dealElemental → resolve()        ← 判定 + 扣附着
 *                                              ├─ freeze   → applyFreeze（不造伤害，留在系统里）
 *                                              ├─ quicken  → applyQuicken（不造伤害，同上）
 *                                              └─ 其余六类 → ReactionEffects_apply ← 本文件
 *                                                            └─ dispatch.dealTransformSegment() → 又一段伤害
 * ```
 *
 * `resolve()` 是本文件的唯一调用方。它已经把附着扣完了（`consumed`），这里只管**效果**。
 *
 * ⚠️ **不造伤害的反应不进来**（冻结 / 激化）—— 本文件每个分支都以
 * `dispatch.dealTransformSegment()` 结尾，塞一个「其实不打人」的分支进来，
 * 下一个人读到这里会以为它漏了派发。它们在 `ElementalReactionSystem.resolve()` 里直接挂。
 *
 * ⚠️ **绽放与燃烧是这里两个「不当场结算」的** —— 绽放埋一颗核、1.5 秒后才炸
 *（`scheduler.defer`）；燃烧挂一条 DoT、每 `BURNING_TICK_SECONDS` 秒跳一次。其余四类都是
 * 「判定完立刻枚举 + 立刻派发」。
 *
 * ## 基数口径：`transformBase(等级) × transformCoeff`
 *
 * `todo §2.2.2` 的原文是「剧变伤害只由元素精通、触发者等级决定」——
 *
 *   - **等级**走 `transformBase()`（12 + 6×(lv−1)），
 *   - **每个反应自己的系数**走 `ReactionDef.transformCoeff`（超载 2.0 / 超导 0.5 / 感电 1.2），
 *   - **元素精通**不在这里 —— 它由 `dealRaw(kind:"transform")` 里的
 *     `emTransform(EM)` 补上（读的是**施法者**的 EM）。
 *
 * 三者是连乘关系，任何一环漏掉都**不会报错**，只是数字不对。
 * 等级数（`transformBase`）与系数（`transformCoeff`）各在纯函数自测里钉死。
 *
 * ⚠️ **读的是触发者（施法者）的等级，不是目标的** —— 与原神口径一致，
 * 也与 `FreezeShatterSystem` 读攻击者 EM 一致。
 *
 * ## ⚠️ 为什么 `dispatch` 是**注入**的，而不是直接 `import ElementalReactionSystem`
 *
 * 本文件需要两个只属于 `ElementalReactionSystem` 的能力：
 * 「登记并派发一段剧变伤害」与「刷新元素附着」。
 * 直接 import 会造出一条
 * `ElementalReactionSystem → ReactionEffects → ElementalReactionSystem` 的 require 环 ——
 * 而 tstl 的 import 是**加载期解引用**的（`local X = ____m.X`），环里读到的是半成品，
 * `X` 恒 `nil`，运行时「attempt to index a nil value」。
 * （`StunBuff.ts:33` 为同一个坑留过说明。）
 *
 * 所以调过来：**由调用方把这两个能力当参数传进来**（`ReactionDispatch`）。
 * 依赖方向是单向的：`ElementalReactionSystem → ReactionEffects`。本文件不认识
 * 「系统」这个概念，只认识「派发一段伤害」这个动作。
 *
 * ## ⚠️ 嵌套派发：本文件在伤害回调的调用栈里造新伤害
 *
 * `resolve()` 跑在 `DamagePipeline` 的伤害回调里，所以下面每一次
 * `dispatch.dealTransformSegment()` 都是**嵌套派发**（与碎冰同一类，实测深度能到 4 层）。
 *
 * 递归**不会**无限下去：剧变伤害用 `gauge = 0` 派发，而 `resolve()` 第一行就是
 * `gauge <= 0` 的早退 —— 内层不附着、不判反应。这是天然的终止条件，
 * **不需要额外的重入标志位**。
 *
 * `saveDamageContext()` / `restoreDamageContext()` 的守卫在 `dispatch.dealTransformSegment()` 的
 * **实现方**（`ElementalReactionSystem.dealTransformSegment`）—— 那一步是嵌套派发的
 * 唯一出口，包在那里就不会漏。
 *
 * ## ⚠️ 每个目标都要**各自**登记一次元素载荷
 *
 * `claimSpellElement()` 命中即 `splice` —— 一条载荷只能被**一个**目标认领。
 * 所以范围伤害**不能**登记一次载荷打一群人（那样只有第一个掉血、而且是被当成
 * 那个目标的元素伤害），必须每目标 `dispatch.dealTransformSegment()` 一次。这是本文件里
 * 所有范围循环都写成「循环里调它」而不是「先算总伤害再打」的原因。
 *
 * ## 没有施法者就**整个不结算**
 *
 * `source` 取不到（句柄已回收 / 单位从未注册成 `Actor`）时不硬编一个来源 ——
 * 与 `FreezeShatterSystem` 的「没有来源就只碎冰、不冰爆」是同一条口径：
 * 伤害归因错到别人头上，比少打一次更糟。
 * 注意此时**反应本身已经发生了**（附着扣了、反应名也飘了），本文件只是不加戏。
 */

import { UNIT_TYPE_DEAD, UNIT_TYPE_STRUCTURE } from "src/constants/game/units";
import { Actor } from "src/system/actor";
import { scheduler } from "src/system/async";
import { BuffTypeId } from "src/system/buff/types";
import { EffectEx } from "src/system/EffectEx";
import { ElementId } from "src/system/stat";
import { createLogger } from "src/utils/logger";
import {
  BurningBuff,
  ELECTRO_CHARGED_DURATION,
  ElectroChargedBuff,
  SUPERCONDUCT_DURATION,
  SuperconductBuff,
} from "./ReactionBuffs";
import {
  BURNING_TICK_SECONDS,
  ReactionDef,
  burningSeconds,
  transformBase,
} from "./reactionTable";

const log = createLogger("ReactionFx");

/**
 * 超载的爆炸半径（码）。
 *
 * **以目标为中心**，不是以施法者为中心 —— 打谁，就在谁脚底下炸。
 */
const OVERLOAD_RADIUS = 200;

/**
 * 超载把命中单位推开的距离（码）。
 *
 * ⚠️ **一次性 `SetUnitPosition`，不是击飞** —— 没有抛物线、没有落地伤害、
 * 撞墙也不会停。正规击飞在 `unit/skills/movement.ts` 的 `unitKnockUp` 里，
 * 本轮刻意不引：那会造出一条 `element/ → unit/skills/` 的层次依赖（元素系统
 * 反过来依赖单位技能库），不值得。
 */
const OVERLOAD_KNOCKBACK = 120;

/** 超导的削甲作用半径（码） */
const SUPERCONDUCT_RADIUS = 200;

/** 感电每跳的作用半径（码） */
const ELECTRO_CHARGED_RADIUS = 200;

/**
 * 绽放的草原核**从埋下到炸开**的延迟（秒）。
 *
 * 这是绽放与三条雷反应的分水岭：雷反应是「触发即炸」，绽放是「先留一颗核，
 * 过一会儿才炸」。延迟让对手有时间走开 —— 那是设计，不是手感问题。
 *
 * ⚠️ 时间基准是 `scheduler` 的 0.05s 心跳（`scheduler.defer`），
 * 不是 `BuffSystem` 那个 0.1s 名义心跳。两者是**独立的域**。
 */
const BLOOM_CORE_DELAY_SECONDS = 1.5;

/** 草原核爆炸的作用半径（码）。与三条雷反应一致 */
const BLOOM_RADIUS = 200;

/**
 * 草原核「埋着」时播的特效模型。
 *
 * ⚠️ 路径取自 **1.27.1 游戏数据**
 * （`dev_lib/w3x2lni/data/enUS-1.27.1/mpq/Units/nightelfabilityfunc.txt` 的
 * `[BEer] Targetart=`），不是随手编的 —— 编错**只会不可见、不会崩**，
 * 所以这类字符串一定要从权威表里抄（memory `wc3-objini-authoritative-lists`）。
 */
const BLOOM_SEED_MODEL = "Abilities\\Spells\\NightElf\\EntanglingRoots\\EntanglingRootsTarget.mdl";

/** 草原核炸开时播的特效模型。来源同 `BLOOM_SEED_MODEL`（`Effectart=` 那条） */
const BLOOM_BURST_MODEL = "Abilities\\Spells\\NightElf\\NatureTouch\\NatureTouchTarget.mdl";

/**
 * 爆炸特效播多久后销毁（秒）。
 *
 * ⚠️ **必须销毁**：`EffectEx.create` 出来的特效**不会自己消失**，
 * 漏掉这一句每次绽放泄漏一个特效句柄（`EffectEx.allEffects` 也会一直长）。
 */
const BLOOM_BURST_LINGER_SECONDS = 1.0;

/**
 * 感电每跳**重新挂上的**雷附着量（U）。
 *
 * 取 2U 与「雷弹」本身一致（`TestSkills.ELEMENT_BOLT_GAUGE`）—— 于是表现上
 * 「雷附着的时间条每跳回满一次」，一眼能看出感电在持续供雷。
 *
 * ⚠️ 这里走的是 `replaceAura`（覆盖式刷新），**不判反应**：
 * 刷新自己挂的雷不该触发超导/超载。被别的元素**消费**掉仍然是允许的
 * （那是「感电期间被冰打中触发超导」的正常玩法，**要的**）。
 */
const ELECTRO_CHARGED_AURA_GAUGE = 2;

/** 扩散以主目标为中心，向周围敌人传播 2U 被扩散的元素。 */
const SWIRL_RADIUS = 200;
const SWIRL_SPREAD_GAUGE = 2;
/** 1.27.1 nightelfabilityfunc.txt 的 [Bcyc] Effectart。 */
const SWIRL_MODEL = "Abilities\\Spells\\NightElf\\Cyclone\\CycloneTarget.mdl";
const SWIRL_LINGER_SECONDS = 1;

/**
 * 剧变反应需要、而本文件不拥有的两个能力。
 *
 * 由 `ElementalReactionSystem` 实现并传入（它就是 `dispatch` 本身）。
 * 两个方法的**唯一实现**在那里 —— 本接口只是一张契约，不含实现。
 */
export interface ReactionDispatch {
  /**
   * 登记并**派发一段剧变伤害**：`gauge = 0`（只声明元素、不附着）+
   * `kind = "transform"`（跳过元素加成 / 暴击 / 擢升）+ 嵌套派发的上下文守卫。
   *
   * 调用方只需给「打谁、什么元素、多少基数」，其余一概不管。
   *
   * ⚠️ 目标是**裸 `unit` 句柄**而不是 `Actor.id` —— 范围枚举（`GroupEnumUnitsInRange`）
   * 出来的单位可能**从来没被打过、也就还没有对应的 `Actor`**，用 id 反查会查不到、
   * 于是「范围内没参战过的野怪一个都打不到」。实现方自己 `Actor.fromHandle()` 现取
   * （get-or-create），这一层就不必关心单位注册到哪一步了。
   */
  dealTransformSegment(sourceId: number, targetUnit: unit, element: ElementId, base: number): void;

  /**
   * 刷新一个单位身上的元素附着（覆盖式，不判反应）。
   *
   * 感电持续供雷，扩散则向周围敌人传播元素；覆盖旧附着，不触发反应。
   */
  refreshAura(sourceId: number, target: Actor, element: ElementId, gauge: number): void;
}

/**
 * 一个剧变反应的落地效果。**`resolve()` 的唯一入口**。
 *
 * @param def      反应定义（取 `effect` / `transformCoeff` / `damageElement` / `name`）
 * @param sourceId 触发者（施法者）的句柄 id，透传给 `dispatch`
 * @param source   触发者。`undefined` = 句柄已回收 → 什么都不做（见文件头）
 * @param target   反应挂载的那个单位（附着被消耗的那一方）
 * @param dispatch 「派发伤害」与「刷新附着」的能力，由调用方注入
 * @param consumed 这次反应**实际扣掉的附着量**（`resolve()` 算好的，已按附着剩余量钳过）。
 *                 ⚠️ **不是来袭元素量** —— 传错的表现是「打一条快没了的附着照样烧满 4 秒」。
 *                 目前只有燃烧用它（推时长）；冻结那一侧走的是 `resolve()` 自己的分支，
 *                 没经过本函数。
 */
export function ReactionEffects_apply(
  def: ReactionDef,
  sourceId: number,
  source: Actor | undefined,
  target: Actor,
  dispatch: ReactionDispatch,
  consumed: number
): void {
  if (source === undefined) {
    log.warn("剧变反应「" + def.name + "」取不到触发者，本次不结算伤害");
    return;
  }
  if (def.effect === undefined) {
    // 表里写了 `kind: "transform"` 却没写 `effect` = 定义漏了。会走到这里的只有
    // 后面新加的反应忘了配 `effect` —— 明确报出来，别静默当成「无效果」
    log.warn("剧变反应「" + def.name + "」没有 effect，未结算");
    return;
  }

  // 目标句柄守卫。`resolve()` 的调用方拿的是刚被打中的单位，正常有效；
  // 但下面每一次读原生都以它为前提，先在入口挡一次比每处各挡一次清楚。
  const tu = target.handle;
  if (tu === undefined || GetUnitTypeId(tu) === 0) {
    log.warn("剧变反应「" + def.name + "」的目标句柄失效，未结算");
    return;
  }

  const base = ReactionEffects_transformBase(def, source);

  // ⚠️ 施法者的**句柄**也在这里挡一次。`source` 是个 `Actor` 引用 ——
  // 引用还在不代表句柄还有效（-1 = 已回收）。三个分支都要 `GetOwningPlayer(su)`
  // 才能算出「谁是敌人」，所以这个守卫是三者共用的，放在分派之前最省事。
  const su = source.handle;
  if (su === undefined || GetUnitTypeId(su) === 0) {
    log.warn("剧变反应「" + def.name + "」的触发者句柄失效，未结算");
    return;
  }

  if (def.effect === "overload") {
    ReactionEffects_applyOverload(def, sourceId, su, tu, base, dispatch);
  } else if (def.effect === "superconduct") {
    ReactionEffects_applySuperconduct(def, sourceId, su, tu, base, dispatch);
  } else if (def.effect === "electro_charged") {
    ReactionEffects_applyElectroCharged(def, sourceId, su, target, tu, base, dispatch);
  } else if (def.effect === "bloom") {
    ReactionEffects_applyBloom(def, sourceId, su, tu, base, dispatch);
  } else if (def.effect === "burning") {
    ReactionEffects_applyBurning(def, sourceId, target, base, consumed, dispatch);
  } else if (def.effect === "swirl") {
    ReactionEffects_applySwirl(def, sourceId, su, tu, base, dispatch);
  } else {
    // `freeze` / `quicken` 走不到这里 —— 那两个**不造伤害**，`resolve()` 在更早的
    // 分支就处理掉了（它们根本不会调本函数）。
    // 走到这里说明有人把 `ReactionEffect` 加了新取值忘了在这里接线。
    log.warn("剧变反应「" + def.name + "」的 effect=" + def.effect + " 尚未接线，未结算");
  }
}

/** 扩散：范围剧变伤害，向仍存活的其他敌人传播同元素附着。 */
function ReactionEffects_applySwirl(
  def: ReactionDef,
  sourceId: number,
  su: unit,
  tu: unit,
  base: number,
  dispatch: ReactionDispatch
): void {
  const element = def.damageElement;
  if (element === undefined) {
    log.warn("扩散缺少伤害元素，未结算");
    return;
  }
  const cx = GetUnitX(tu);
  const cy = GetUnitY(tu);
  const mainTargetId = GetHandleId(tu);
  const victims = ReactionEffects_enemiesInRange(cx, cy, SWIRL_RADIUS, GetOwningPlayer(su));
  let spreadCount = 0;
  for (let i = 0; i < victims.length; i++) {
    const u = victims[i];
    if (u === undefined || GetUnitTypeId(u) === 0 || !ReactionEffects_unitAlive(u)) {
      continue;
    }
    // 剧变段 gauge=0，不会触发连锁反应。主目标也吃这段伤害。
    dispatch.dealTransformSegment(sourceId, u, element, base);
    // 伤害可能杀死或移除单位，传播前再次检查。主目标不回挂，避免自循环。
    if (GetUnitTypeId(u) === 0 || !ReactionEffects_unitAlive(u) || GetHandleId(u) === mainTargetId) {
      continue;
    }
    const actor = Actor.fromHandle(u);
    if (actor === undefined) {
      continue;
    }
    // 单附着模型：覆盖周围敌人的旧附着，不在传播当场再判反应。
    dispatch.refreshAura(sourceId, actor, element, SWIRL_SPREAD_GAUGE);
    spreadCount++;
  }
  const fx = EffectEx.create(SWIRL_MODEL, cx, cy);
  if (fx !== undefined) {
    scheduler.defer(SWIRL_LINGER_SECONDS, () => fx.destroy());
  }
  log.info("扩散：" + element + " 基数=" + base + " 范围目标=" + victims.length +
    " 传播=" + spreadCount + " 半径=" + SWIRL_RADIUS);
}

/** 等级基数 × 反应系数；元素精通由伤害管线补上，避免重复计算。 */
function ReactionEffects_transformBase(def: ReactionDef, source: Actor): number {
  const coeff = def.transformCoeff;
  if (coeff === undefined) {
    // 表里给了 `kind: "transform"` 却没给系数 → 基数是 0 → 反应「触发了但没伤害」。
    // 静默 0 伤害是这个设计里最难查的一类，所以留一条警告。
    log.warn("剧变反应「" + def.name + "」缺 transformCoeff，基数为 0");
    return 0;
  }
  return transformBase(source.level) * coeff;
}

// ===========================================================================
// 超载
// ===========================================================================

/**
 * 超载：以目标为中心 `OVERLOAD_RADIUS` 内的敌人各吃一段**火**伤，并被推离施法者。
 *
 * ⚠️ **打火伤而不是雷伤** —— 虽然触发它的是雷（火 → 雷 / 雷 → 火），但落地伤害
 * 是火（`ReactionDef.damageElement = "fire"`，与 `reactionTable` 文件头那张表一致）。
 * 「按来袭元素推落地元素」在这里一定得到错的答案。
 *
 * 目标自己也在范围内（距离 0），所以不需要额外补一段单体伤害。
 */
function ReactionEffects_applyOverload(
  def: ReactionDef,
  sourceId: number,
  su: unit,
  tu: unit,
  base: number,
  dispatch: ReactionDispatch
): void {
  const element = ReactionEffects_damageElement(def, "fire");
  const cx = GetUnitX(tu);
  const cy = GetUnitY(tu);

  // ⚠️ 判据必须是**施法者**的玩家，不能是目标的（`ReactionEffects_enemiesInRange`
  // 的注释里写了理由）：传目标的话，主目标自己会被排除掉（它不是自己的敌人，
  // 于是「超载了但目标不掉血」），反而把**施法者本人**圈进受害者名单
  // ——「超载把自己炸飞」。传施法者则受害者 = 目标 + 目标的友军，才是要的。
  const owner = GetOwningPlayer(su);

  // 先算伤害，再算击退：击退会把单位挪走，用挪走之后的位置去炸，
  // 就会把「本来该被炸到的人」漏掉（半径边缘那几位）。
  const victims = ReactionEffects_enemiesInRange(cx, cy, OVERLOAD_RADIUS, owner);
  for (let i = 0; i < victims.length; i++) {
    const u = victims[i];
    if (u === undefined) {
      continue;
    }
    dispatch.dealTransformSegment(sourceId, u, element, base);
  }

  // 击退：从**施法者**的位置往外推（不是从爆炸中心推）。
  // 用爆炸中心推的话，站在目标另一侧的敌人会被推向施法者 —— 方向反了。
  const sx = GetUnitX(su);
  const sy = GetUnitY(su);
  for (let i = 0; i < victims.length; i++) {
    const u = victims[i];
    if (u === undefined) {
      continue;
    }
    ReactionEffects_knockAway(u, sx, sy, OVERLOAD_KNOCKBACK);
  }

  log.info(
    "超载：基数=" + base + " 命中=" + victims.length + " 半径=" + OVERLOAD_RADIUS + " 击退=" + OVERLOAD_KNOCKBACK
  );
}

// ===========================================================================
// 超导
// ===========================================================================

/**
 * 超导：以目标为中心 `SUPERCONDUCT_RADIUS` 内的敌人各吃一段**冰**伤，
 * 并各挂一条 `SuperconductBuff`（护甲 ×0.6，8 秒）。
 *
 * 削甲**每个命中单位各挂一条**，不是只给主目标 —— 「范围削甲」是超导的主要价值。
 *
 * ⚠️ 直接 `addBuff`，**不走 `addXxxBuff` 收口**：削甲不是控制效果，
 * 不该吃韧性。理由见 `ReactionBuffs.ts` 文件头。
 */
function ReactionEffects_applySuperconduct(
  def: ReactionDef,
  sourceId: number,
  su: unit,
  tu: unit,
  base: number,
  dispatch: ReactionDispatch
): void {
  const element = ReactionEffects_damageElement(def, "ice");
  // ⚠️ 施法者的玩家，理由同超载（传目标的会把主目标自己排除掉）
  const owner = GetOwningPlayer(su);
  const victims = ReactionEffects_enemiesInRange(GetUnitX(tu), GetUnitY(tu), SUPERCONDUCT_RADIUS, owner);

  for (let i = 0; i < victims.length; i++) {
    const u = victims[i];
    if (u === undefined) {
      continue;
    }
    dispatch.dealTransformSegment(sourceId, u, element, base);
  }

  // 削甲：**重新触发时先摘旧的**，保证场上永远只有一层。
  // 与 `applyFreeze` 的单层收口同一个理由 —— `addBuff` 只是 `push`，没有同类去重，
  // 连放两次会挂两条，属性乘区变成 ×0.36（0.6 × 0.6）而不是 ×0.6。
  // 这里**刻意选「覆盖」而不是「取更长的那条」**：削甲是纯粹的输出窗口，
  // 刷新成满时长比保留残余更符合直觉。
  for (let i = 0; i < victims.length; i++) {
    const u = victims[i];
    if (u === undefined) {
      continue;
    }
    ReactionEffects_attachSuperconduct(u, SUPERCONDUCT_DURATION);
  }

  log.info("超导：基数=" + base + " 命中=" + victims.length + " 半径=" + SUPERCONDUCT_RADIUS);
}

/** 摘掉 `u` 身上旧的超导再挂一条新的。挂不上（没 `Actor`）就跳过 */
function ReactionEffects_attachSuperconduct(u: unit, duration: number): void {
  const actor = Actor.fromHandle(u);
  if (actor === undefined) {
    return;
  }
  const bm = actor.buffManager;
  const old = bm.getBuffsByType(BuffTypeId.SUPERCONDUCT);
  for (let i = 0; i < old.length; i++) {
    const b = old[i];
    if (b !== undefined) {
      bm.removeBuff(b);
    }
  }
  bm.addBuff(new SuperconductBuff(duration));
}

// ===========================================================================
// 感电
// ===========================================================================

/**
 * 感电：目标与周围 `ELECTRO_CHARGED_RADIUS` 内的敌人各吃一段**雷**伤，
 * 再给**主目标**挂一条 `ElectroChargedBuff` —— 它在 4 秒里每秒重复一次这段范围雷伤，
 * 并刷新目标身上的雷附着。
 *
 * ⚠️ **只有主目标挂 DoT**（周围的敌人只是被这一次范围伤害擦到）——
 * 每个被擦到的人都挂一条 DoT 的话，一群怪叠在一起会互相引爆，
 * 伤害随目标数指数级放大。
 *
 * DoT 的**单层收口**：重新触发时先摘旧的（同超导）。
 * 摘之前先把旧的 `pulse` 放掉即可 —— 它的闭包跟着实例一起被丢弃。
 */
function ReactionEffects_applyElectroCharged(
  def: ReactionDef,
  sourceId: number,
  su: unit,
  target: Actor,
  tu: unit,
  base: number,
  dispatch: ReactionDispatch
): void {
  const element = ReactionEffects_damageElement(def, "thunder");

  // ⚠️ 施法者的**玩家**在挂 DoT 时就取出来给闭包捕获 —— 判据必须是施法者
  // （理由同超载），而 `player` 句柄不会随单位死亡被回收、`unit` 句柄会。
  // 每跳再去 `GetOwningPlayer(施法者)` 的话就得多守一次句柄，没必要。
  const owner = GetOwningPlayer(su);

  // ---- 立即那一段 ----
  ReactionEffects_pulseElectroCharged(sourceId, GetUnitX(tu), GetUnitY(tu), owner, element, base, dispatch);

  // ---- 之后的每秒一跳 ----
  const bm = target.buffManager;
  const old = bm.getBuffsByType(BuffTypeId.ELECTRO_CHARGED);
  for (let i = 0; i < old.length; i++) {
    const b = old[i];
    if (b !== undefined) {
      bm.removeBuff(b);
    }
  }

  // 闭包捕获 `target` / `dispatch` / `base` —— 4 秒后跑的时候它们仍然有效，
  // 因为 `target` 是个 `Actor` 引用（不是句柄），而 `dispatch` 是单例。
  // ⚠️ **每跳都重新读一次位置**（`ReactionEffects_pulseElectroCharged` 内部做的）：
  // 目标在 4 秒里会跑动，用挂上时的坐标炸会一直炸在原地。
  const pulse = (): void => {
    const hu = target.handle;
    if (hu === undefined || GetUnitTypeId(hu) === 0) {
      return;
    }
    ReactionEffects_pulseElectroCharged(
      sourceId,
      GetUnitX(hu),
      GetUnitY(hu),
      owner,
      element,
      base,
      dispatch
    );
    // 刷新雷附着：**排在伤害之后** —— 先打再供雷，顺序反了的话这一跳的伤害
    // 会撞上刚挂的附着（虽然 `gauge = 0` 不判反应，但读起来更绕）
    dispatch.refreshAura(sourceId, target, element, ELECTRO_CHARGED_AURA_GAUGE);
  };

  bm.addBuff(new ElectroChargedBuff(target, ELECTRO_CHARGED_DURATION, pulse));

  log.info(
    "感电：每跳基数=" + base + " 半径=" + ELECTRO_CHARGED_RADIUS +
    " 持续=" + ELECTRO_CHARGED_DURATION + " 秒"
  );
}

/**
 * 感电的一次范围雷击：以 `(centerX, centerY)` 为中心枚举敌人，**每目标各登记一次载荷**。
 *
 * 立即那一段与之后每一次 DoT 跳都走它 —— 两处若各写一遍，改了半径忘了改另一处
 * 就是「第一下和后面几下范围不一样」，而那在游戏里几乎看不出来。
 *
 * ⚠️ 收**坐标**而不是收 `unit`：DoT 每跳都得重新读一次宿主位置
 * （目标在 4 秒里会跑动），调用方本来就要 `GetUnitX/GetUnitY`；
 * 而且中心点跑出施法者的视野也不影响——真正决定「谁是敌人」的是 `owner`（施法者的玩家）。
 */
function ReactionEffects_pulseElectroCharged(
  sourceId: number,
  centerX: number,
  centerY: number,
  owner: player,
  element: ElementId,
  base: number,
  dispatch: ReactionDispatch
): void {
  const victims = ReactionEffects_enemiesInRange(
    centerX,
    centerY,
    ELECTRO_CHARGED_RADIUS,
    owner
  );
  for (let i = 0; i < victims.length; i++) {
    const u = victims[i];
    if (u === undefined) {
      continue;
    }
    dispatch.dealTransformSegment(sourceId, u, element, base);
  }
}

// ===========================================================================
// 燃烧
// ===========================================================================

/**
 * 燃烧：给**主目标**挂一条 `BurningBuff`，之后每秒对它本人打一段**火**伤。
 *
 * 用户 2026-10-09 定的三个口径（见 `reactionTable.BURNING`）：
 * 草被**一次性吃光**、触发那一拍**不额外造伤害**、每跳**只打主目标**。
 *
 * ## 为什么比感电短这么多
 *
 * 感电要 `owner`（算「施法者的敌人」）、要范围枚举、还要 `refreshAura` 供雷；
 * 燃烧这三样**一样都不需要**：
 *
 *   - **单体** —— 不枚举，所以连 `GetOwningPlayer` 都不用取，也就没有「玩家句柄
 *     要不要跟着闭包捕获」这个问题（感电那一侧的注释在这里不适用）。
 *   - **不刷新附着** —— 草已经在 `resolve()` 里被扣光了，烧的时候目标身上
 *     **没有任何元素量**。所以燃烧期间**不会**被激化 / 绽放（那两个都要先有草附着，
 *     得重新挂）。这是设计，不是漏了。
 *   - **触发拍不跳** —— 那一段由触发燃烧的那发火弹自己造成（`BurningBuff` 的
 *     `nextTickAt` 初值就是一个间隔）。
 *
 * ## ⚠️ 时长 ≠ 跳数
 *
 * `burningSeconds(consumed)` 给出的是**秒数**，跳数要按 `BURNING_TICK_SECONDS`
 * 的浮点相位实测（没有干净公式）。当前这对数（间隔 0.6 / 每跳 0.5）下
 * **2U 草 → 4 秒 → 6 跳 → 总 3.0×**，实测表在
 * `reactionTable.burningSeconds()` 的注释里。
 *
 * ⚠️ 这两个常量是**一对**：用户 2026-10-10 的口径是「跳频可以调、总伤不变」，
 * 所以调了间隔就必须重算每跳系数。
 *
 * ## DoT 的单层收口
 *
 * 重新点燃时先摘旧的（同感电 / 超导）—— `BuffManager.addBuff` 只 `push` 不去重，
 * 不摘的话两层 DoT 会各跳各的、伤害翻倍，而**不报错**。
 */
function ReactionEffects_applyBurning(
  def: ReactionDef,
  sourceId: number,
  target: Actor,
  base: number,
  consumed: number,
  dispatch: ReactionDispatch
): void {
  const element = ReactionEffects_damageElement(def, "fire");
  const duration = burningSeconds(consumed);

  const bm = target.buffManager;
  const old = bm.getBuffsByType(BuffTypeId.BURNING);
  for (let i = 0; i < old.length; i++) {
    const b = old[i];
    if (b !== undefined) {
      bm.removeBuff(b);
    }
  }

  // 闭包捕获 `target` / `dispatch` / `base` / `element` / `sourceId` —— 燃烧期间它们仍然有效：
  // `target` 是个 `Actor` 引用（不是句柄），`dispatch` 是单例，其余是数字/字符串。
  // ⚠️ **施法者在 DoT 期间死亡 ⟹ 后续跳静默地什么都不做**
  //（`dealTransformSegment` 里 `Actor.getById` 拿不到人就返回）。与感电一致，不是漏配。
  const pulse = (): void => {
    const hu = target.handle;
    if (hu === undefined || GetUnitTypeId(hu) === 0) {
      return;
    }
    dispatch.dealTransformSegment(sourceId, hu, element, base);
  };

  bm.addBuff(new BurningBuff(target, duration, pulse));

  // ⚠️ 日志里**故意不写跳数**：实际跳数没有干净公式（`BuffManager` 的 0.1s 定步长
  // 遇上 `nextTickAt = elapsed + 间隔` 会有浮点相位偏移），硬算一个数写进来
  // 反而会撒谎。实测表在 `reactionTable.burningSeconds()` 的注释里。
  log.info(
    "燃烧：消耗草=" + consumed + " 每跳基数=" + base +
    " 时长=" + duration + " 秒（每 " + BURNING_TICK_SECONDS + " 秒一跳）"
  );
}

// ===========================================================================
// 工具
// ===========================================================================

/**
 * 反应落地伤害打什么元素。`ReactionDef.damageElement` 缺失时退回调用方给的默认值
 * （三个反应都写齐了，走到退回分支说明表被改坏了）。
 *
 * 抽出来是为了让「缺字段」这件事**只有一个出口** —— 三个反应各写一遍
 * `def.damageElement === undefined ? ... : ...` 的话，迟早有一处忘了退。
 */
function ReactionEffects_damageElement(def: ReactionDef, fallback: ElementId): ElementId {
  const e = def.damageElement;
  if (e === undefined) {
    log.warn("剧变反应「" + def.name + "」缺 damageElement，退回 " + fallback);
    return fallback;
  }
  return e;
}

// ===========================================================================
// 绽放
// ===========================================================================

/**
 * 绽放（水 + 草）：在**反应发生的坐标**埋一颗草原核，`BLOOM_CORE_DELAY_SECONDS`
 * 秒后原地炸出一段范围**草**伤。
 *
 * ## 它是本文件唯一一个「不是当场结算」的反应
 *
 * 三条雷反应都是「`resolve()` 走到这里 → 立刻枚举 + 立刻派发」。绽放不行：
 * 它的伤害要**延迟** 1.5 秒。所以这里 `scheduler.defer()` 一个闭包，
 * 真正的伤害在 1.5 秒后的另一拍才派发。
 *
 * ⚠️ **落点固定在「反应发生那一刻」的目标坐标**（`cx` / `cy` 是当场取的快照），
 * 之后**不跟人走**。目标跑了就炸空 —— 这是「延迟爆炸」的设计本身，不是 bug。
 * 每拍重新读目标位置是另一条路（感电的 DoT 就是那样），但那是**追踪型**效果；
 * 绽放要的是「脚下埋了一颗核」。
 *
 * ## 闭包捕获的东西在 1.5 秒后还有效吗
 *
 *   - `dispatch` —— 单例（`ElementalReactionSystem.getInstance()`），一直在。
 *   - `owner`（`player`）—— **玩家句柄不会被回收**（`unit` 才会）。所以不必每跳重取。
 *   - `sourceId` —— 是个数字。**施法者可能已经死了**，但这里**不判**：
 *     `dispatch.dealTransformSegment()` 自己会 `Actor.getById()` + 守句柄，
 *     查不到就静默跳过。在这里再判一次是第二份判据，迟早跟那边对不上。
 *
 * ## 为什么目标句柄守卫只在入口做一次
 *
 * `tu` 只用来取**当场**的坐标，取完就不再碰它 —— 1.5 秒后跑的那段代码
 * 一个字都不读它。所以 `ReactionEffects_apply` 入口那次守卫就够了。
 */
function ReactionEffects_applyBloom(
  def: ReactionDef,
  sourceId: number,
  su: unit,
  tu: unit,
  base: number,
  dispatch: ReactionDispatch
): void {
  const element = ReactionEffects_damageElement(def, "grass");
  // ⚠️ 施法者的玩家，理由同超载（传目标的会把主目标自己排除掉，
  // 反而把施法者本人圈进受害者名单）
  const owner = GetOwningPlayer(su);
  const cx = GetUnitX(tu);
  const cy = GetUnitY(tu);

  // 种子：让 1.5 秒的等待**看得见**。没有它，玩家只会觉得「刚才那一下没伤害」
  const seed = EffectEx.create(BLOOM_SEED_MODEL, cx, cy);

  scheduler.defer(BLOOM_CORE_DELAY_SECONDS, () => {
    if (seed !== undefined) {
      seed.destroy();
    }

    const victims = ReactionEffects_enemiesInRange(cx, cy, BLOOM_RADIUS, owner);
    for (let i = 0; i < victims.length; i++) {
      const u = victims[i];
      if (u === undefined) {
        continue;
      }
      dispatch.dealTransformSegment(sourceId, u, element, base);
    }

    const burst = EffectEx.create(BLOOM_BURST_MODEL, cx, cy);
    if (burst !== undefined) {
      scheduler.defer(BLOOM_BURST_LINGER_SECONDS, () => {
        burst.destroy();
      });
    }

    log.info("绽放：基数=" + base + " 命中=" + victims.length + " 半径=" + BLOOM_RADIUS);
  });

  log.info(
    "绽放：核已埋下，坐标=(" + Math.round(cx) + "," + Math.round(cy) + ")" +
    " 延迟=" + BLOOM_CORE_DELAY_SECONDS + " 秒"
  );
}

/**
 * 枚举一个圆形范围内的**敌方存活非建筑**单位，返回一个**密集**数组。
 *
 * 过滤三件事，缺一件的表现都不是报错而是「打错人」或「不生效」：
 *   - `unitAlive` —— 尸体还留在组里（引擎在单位死透之前不会把它移出组）
 *   - `!IsUnitType(u, UNIT_TYPE_STRUCTURE)` —— 范围技能**不砸建筑**
 *   - `IsUnitEnemy(u, owner)` —— 不误伤自己人（`owner` 传**施法者**的玩家，
 *     所以范围内的敌人包括反应目标本身；传目标的玩家会把它自己排除掉）
 *
 * ## `FirstOfGroup` 的写法照抄 `movement.ts:447-474`
 *
 * ⚠️ **先 `GroupRemoveUnit` 再 `FirstOfGroup`** —— 顺序反了会重复拿到同一只
 * （死循环）或漏掉中间的。`DestroyGroup` 也不能漏，否则每发范围伤害泄漏一个组句柄。
 *
 * 返回值是 `push` 出来的**密集数组**（不是按下标写的），所以在 Lua 里
 * `.length` 是真实的 —— 带洞数组的 `.length` 恒为 0（memory
 * `wc3-tstl-sparse-array-length`）。
 */
function ReactionEffects_enemiesInRange(
  centerX: number,
  centerY: number,
  radius: number,
  owner: player
): unit[] {
  const victims: unit[] = [];
  const g = CreateGroup();
  GroupEnumUnitsInRange(g, centerX, centerY, radius, null);
  let u = FirstOfGroup(g);

  while (u != null) {
    if (
      ReactionEffects_unitAlive(u) &&
      !IsUnitType(u, UNIT_TYPE_STRUCTURE) &&
      IsUnitEnemy(u, owner)
    ) {
      victims.push(u);
    }
    // ⚠️ 这一句必须在所有读取之后 —— 它把 `u` 从组里摘掉
    GroupRemoveUnit(g, u);
    u = FirstOfGroup(g);
  }
  DestroyGroup(g);

  return victims;
}

/**
 * 把 `u` 沿「从 `(fromX, fromY)` 指向它」的方向推 `distance` 码。
 *
 * 自己归一化而不用 `unitVector2`（`unit/skills/physics.ts`）——
 * 引那个会让 `element/` 依赖 `unit/skills/`，层次反了，而这里只要一次除法。
 *
 * 与起点重合（`len` 约等于 0）时不推：没有方向。硬推一个默认方向会让
 * 「贴着施法者的目标被推向随机一侧」，看起来像 bug。
 */
function ReactionEffects_knockAway(
  u: unit,
  fromX: number,
  fromY: number,
  distance: number
): void {
  const x = GetUnitX(u);
  const y = GetUnitY(u);
  const dx = x - fromX;
  const dy = y - fromY;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 1) {
    return;
  }
  SetUnitPosition(u, x + (dx / len) * distance, y + (dy / len) * distance);
}

/**
 * 单位是否活着。**`movement.ts:15` 有一份同样的私有副本**（那份取不到），
 * 判据与它逐字一致：`UNIT_TYPE_DEAD` 标记 + 血量阈值。
 *
 * 0.405 是魔兽的经典阈值 —— 血量低于它的单位在引擎眼里已经是尸体，
 * 但 `IsUnitType(u, UNIT_TYPE_DEAD)` 在某些时序下还没置位。
 */
function ReactionEffects_unitAlive(u: unit): boolean {
  return !IsUnitType(u, UNIT_TYPE_DEAD) && GetWidgetLife(u) > 0.405;
}
