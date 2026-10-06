/**
 * 吸血系统 —— `LIFESTEAL`（17）这项属性的**唯一消费者**。
 *
 * ## 它做的事
 *
 * 以 **priority 5** 订阅 `UNIT_DAMAGED`，在每次物理伤害落地时按「实际扣掉的血」
 * 乘吸血率，给自己回血。回血走 `applyHeal()`（唯一入口），所以治疗加成、治疗飘字
 * 这些都是白捡的。
 *
 * ## ⚠️ 优先级为什么必须卡在 5
 *
 * `GameEvent.ts:6`：**数值越大越先执行**。这条链上的邻居是：
 *
 * | 优先级 | 谁 | 做什么 |
 * |---|---|---|
 * | 100 | `DamagePipeline` | 读原值 → 置 0 → 自算 → 写回 |
 * | 10 | `ShieldSystem` | 扣护盾，`setEventDamage(剩余)` |
 * | **5** | **本系统** | 读 `data.damage` 吸自己的血 |
 * | 0 | `DamageNumberDisplay` | 飘字 |
 *
 * **必须小于 10** —— 用户口径是「吸血基数 = 实际扣血（扣盾后）」。
 * 排在护盾前面就会拿到扣盾**之前**的值：打一个带盾的目标能吸出比它实际掉的血还多的血，
 * 而且这种偏差在游戏里**看不出来**（血条确实涨了，只是涨多了）。
 * 又**必须大于 0**，免得和飘字抢同一个号。
 *
 * ## ⚠️ 基数不是 `data.damage`，是 `min(data.damage, 目标当前血)`
 *
 * 伤害回调跑在**扣血之前**，所以这一刻读到的血量是「这一刀之前的血」。
 * 少了这个 `min`，打一只剩 5 点血的兵会按一整个刀伤（比如 80）吸血
 * ——「打残血兵吸满一管血」正是这个 bug 的样子。
 *
 * ## 只吸物理伤害
 *
 * 用户口径。判据用 `ctx.isPhysical`，它由 `damageType === 4` 推出
 * （**不是** `EXGetEventDamageData(1)`，实测那格平A 也给 0，
 * 见 memory `wc3-damage-event-semantics`）。
 *
 * ## 不动 `DamagePipeline` 一行
 *
 * 吸血是**另一个订阅者**，不是管线的一环。管线负责「这一刀打多少」，
 * 吸血只负责「打完回多少」，两者没有数据依赖（吸血读的是管线的产物，不回写）。
 * 所以这一步只新增文件，`DamagePipeline.ts` / `ShieldSystem.ts` / `DamageContext.ts`
 * 一个字都不用改。
 */

import { UNIT_STATE_LIFE } from "src/constants/game/units";
import { Actor } from "src/system/actor";
import { gameEvents } from "src/system/event";
import { UnitDamageEventData } from "src/system/event/GameEvent";
import { StatType } from "src/system/stat/types";
import { findDamageContext } from "./DamageContext";
import { applyHeal } from "./HealSystem";

/**
 * 订阅优先级。**必须严格小于 `ShieldSystem` 的 10，且大于飘字的 0** —— 理由见文件头。
 * 5 只是那个区间里一个稳妥的取值，本身没有别的含义。
 */
const LIFESTEAL_PRIORITY = 5;

export default class LifestealSystem {
  private static instance: LifestealSystem | undefined;

  /** 是否已经订阅过（幂等守卫 —— 热重载会重复调 `initialize()`） */
  private bound = false;

  private constructor() {}

  public static getInstance(): LifestealSystem {
    if (LifestealSystem.instance === undefined) {
      LifestealSystem.instance = new LifestealSystem();
    }
    return LifestealSystem.instance;
  }

  /**
   * 订阅伤害事件。由 `main.ts` 的 `initialize()` 调**一次**。
   *
   * ⚠️ **自带 `bound` 守卫**，与 `ShieldSystem.init()` 不同（那个没有）。
   * 重复订阅的后果是**同一次伤害吸两遍血** —— 不报错、不崩溃，只是回血量翻倍，
   * 而热重载期间这条路径很容易被走到第二次。
   */
  public init(): void {
    if (this.bound) {
      return;
    }
    this.bound = true;

    gameEvents.onUnitDamaged((data) => this.onUnitDamaged(data), {
      priority: LIFESTEAL_PRIORITY,
    });
  }

  private onUnitDamaged(data: UnitDamageEventData): void {
    // 取不到上下文就是**正常路径**，不是错误：重入的嵌套派发、或者压根不是经管线来的
    // 伤害（`DamageContext` 的注释里写明了这一点）。退出去，不要报错。
    const ctx = findDamageContext(data);
    if (ctx === undefined) return;

    if (!ctx.isPhysical) return;

    const source = ctx.source;
    if (source === undefined) return;

    // ⚠️ **先 `hasStatSheet()` 再取 `statSheet`** —— getter 是惰性建表的，
    // 在可能已 `detach` 的句柄上直接取会在那里重建一张表（计划风险 #7）。
    // 没有属性表 = 没挂过任何来源 = 吸血率是 0，本来也没什么可吸的。
    if (!source.hasStatSheet()) return;
    const rate = source.statSheet.getFinal(StatType.LIFESTEAL);
    if (rate <= 0) return;

    const dealt = LifestealSystem_actualHpRemoved(ctx.target, data.damage);
    if (dealt <= 0) return;

    // 回血走唯一入口。治疗加成、`UNIT_HEALED`、绿色的 `+N` 都在那一边。
    applyHeal(source, dealt * rate);
  }
}

/**
 * 这一刀**实际扣掉了多少血**：`min(伤害, 目标当前血)`。
 *
 * 伤害回调跑在扣血之前，所以此刻读到的 `UNIT_STATE_LIFE` 就是「挨刀前的血」。
 * 打一个剩 5 点血的兵、刀伤 80 → 实际只扣了 5，就该只按 5 吸血。
 *
 * 取不到目标 / 句柄悬垂 / 目标已经死了 → **退回 `damage`**，而不是退回 0：
 * 那些情况下「扣了多少」无从得知，用刀伤当近似比凭空吞掉一次吸血更合理
 * （而且这些情况本来就少见）。
 */
function LifestealSystem_actualHpRemoved(target: Actor | undefined, damage: number): number {
  if (target === undefined) {
    return damage;
  }
  const u = target.handle;
  if (u === undefined) {
    return damage;
  }
  const life = GetUnitState(u, UNIT_STATE_LIFE);
  if (life <= 0) {
    return damage;
  }
  return damage < life ? damage : life;
}
