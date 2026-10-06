/**
 * 回血入口 —— **全仓唯一**。
 *
 * ## 为什么要有这么一个函数
 *
 * 在这之前仓库里**一处回血实现都没有**：`StatType.HEAL_BONUS`（18）与 `LIFESTEAL`（17）
 * 算得再准也没有任何消费者，面板上永远是 0%。而 1.27a 又没有原生的「单位被治疗」
 * 事件（`GameEventType` 里直到本文件为止都不存在 heal），所以想做个治疗飘字都无从下手。
 *
 * 这个函数一次把三件事定下来，以后所有治疗类效果（技能、装备、光环、回血 tick）
 * **都从这里走**：
 *
 *   1. 治疗加成（`HEAL_BONUS`）乘区**只在这里算一次**
 *   2. 原生血量的读 → 钳 → 写，只有这一处
 *   3. `UNIT_HEALED` 事件只有这一个事件源（`GameEvent.ts` 的 `onUnitHealed` 有说明）
 *
 * 谁要回血就调它，**别自己写 `SetUnitState`** —— 绕过去的那次治疗不进加成、
 * 也不飘字，而且在游戏里看不出来（血确实涨了），属于最难查的一类不一致。
 *
 * ## 「治疗量」与「回血量」是两回事
 *
 * 返回值是**实际**回复的生命值，不是乘完加成算出来的治疗量：
 *
 *   - 满血 → 返回 0
 *   - 剩 3 点血上限、治疗 200 → 返回 3
 *
 * 调用方（尤其是飘字）靠这个区分「该不该飘」。所以**别把 `base * (1 + rate)`
 * 当成返回值用**，那是另一种语义。
 *
 * ## 取整口径跟着伤害管线走
 *
 * 这里**不取整** —— 与 `DamagePipeline` 用 `dealRaw()` 而不是 `deal()` 是同一个理由：
 * 每段各取整一次会让误差累积，而展示层（`DamageNumberDisplay`）本来就会
 * `Math.floor`。**取整只发生在最后要显示的那一刻。**
 */

import { UNIT_STATE_LIFE, UNIT_STATE_MAX_LIFE } from "src/constants/game/units";
import { Actor } from "src/system/actor";
import { GameEventType, gameEvents } from "src/system/event";
import { StatType } from "src/system/stat/types";

/**
 * 取单位的属性表，**没有就返回 `null`**。
 *
 * ⚠️ **必须先问 `hasStatSheet()`** —— `actor.statSheet` 的 getter 是**惰性建表**的，
 * 直接取就等于在（可能已经 `detach` 的）句柄上重建一张表（计划风险 #7）。
 * 写法与 `DamagePipeline.ts` 的 `DamagePipeline_sheetOf()` 逐字一致。
 *
 * 语义上也说得通：**没有属性表 = 没有任何属性修正 = 治疗加成是 0**。
 */
function HealSystem_sheetOf(a: Actor | undefined) {
  if (a === undefined) {
    return null;
  }
  if (!a.hasStatSheet()) {
    return null;
  }
  return a.statSheet;
}

/**
 * 给一个单位回血。返回**实际**回复的生命值（满血时是 0）。
 *
 * @param target 受疗单位。`undefined`（技能没取到目标）直接返回 0，不报错 ——
 *               那是正常路径，不是异常。
 * @param base   治疗基数，**不含加成**。加成由本函数乘上去。
 * @param source 治疗来源，随事件发出去（飘字那边暂时没用，但发事件时就该带上）
 */
export function applyHeal(target: Actor | undefined, base: number, source?: Actor): number {
  if (target === undefined) {
    return 0;
  }
  const u = target.handle;

  // 悬垂句柄守卫：`Actor.allActors` 里留着已死 / 已移除的单位，对它们调
  // `GetUnitState` 是访问违例。判据与 `Actor.getDisplayName()` 用的一致 ——
  // 单位没了 `GetUnitTypeId` 就是 0。
  if (u === undefined || GetUnitTypeId(u) === 0) {
    return 0;
  }

  const cur = GetUnitState(u, UNIT_STATE_LIFE);
  // 不给尸体回血。`<= 0` 也顺带挡掉了负数血量。
  if (cur <= 0) {
    return 0;
  }

  // ⚠️ 加成的读取**排在血量之后**：属性表能省一次是一样，但更重要的是
  // 上面那两道守卫命中时（打不到、单位没了）根本不需要碰属性表。
  const sheet = HealSystem_sheetOf(target);
  const rate = sheet === null ? 0 : sheet.getFinal(StatType.HEAL_BONUS);

  // `HEAL_BONUS` 已被 `clampFinal` 钳到 `>= -1`（`stat/types.ts:270`），
  // 所以 `1 + rate >= 0`，这里算不出负治疗。`Math.max` 只是兜底。
  const amount = Math.max(0, base * (1 + rate));
  if (amount <= 0) {
    return 0;
  }

  // 「实际回血」必须再被剩余血量削一次 —— 差一点也不行：
  // 少这一步的话，治疗量会顺着 `SetUnitState` 把血量顶到超过上限。
  const max = GetUnitState(u, UNIT_STATE_MAX_LIFE);
  const healed = Math.min(amount, max - cur);
  if (healed <= 0) {
    return 0;
  }

  SetUnitState(u, UNIT_STATE_LIFE, cur + healed);

  // 事件在写回**之后**发：订阅方读到的原生血量已经是回完血的新值，
  // 与 `UNIT_DAMAGED` 那套「派发中改值」的时序不同 —— 这里是既成事实的通报。
  gameEvents.emit(GameEventType.UNIT_HEALED, {
    Actor: target,
    unitTypeId: GetUnitTypeId(u),
    owner: GetOwningPlayer(u),
    amount: healed,
    source,
  });

  return healed;
}
