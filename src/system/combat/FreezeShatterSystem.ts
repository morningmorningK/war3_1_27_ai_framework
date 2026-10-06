/**
 * 碎冰系统 —— 冻结（`FreezeBuff`）的**唯一出口**。
 *
 * ## 它做的事
 *
 * 以 **priority 4** 订阅 `UNIT_DAMAGED`：被打的目标身上若有 `FREEZE`，
 * 且这一击**真正扣掉的血**够疼（≥ 目标最大生命的 15%），就
 * **提前摘掉冻结 + 额外爆一次冰伤**。
 *
 * ## ⚠️ 优先级为什么必须是 4
 *
 * `GameEvent.ts:6`：**数值越大越先执行**。这条链上的邻居是：
 *
 * | 优先级 | 谁 | 做什么 |
 * |---|---|---|
 * | 100 | `DamagePipeline` | 读原值 → 置 0 → 自算 → 写回 |
 * | 10 | `ShieldSystem` | 扣护盾，`setEventDamage(剩余)` |
 * | 5 | `LifestealSystem` | 按实际扣血吸血 |
 * | **4** | **本系统** | 碎冰 + 冰爆 |
 * | 0 | `DamageNumberDisplay` | 飘字 |
 *
 * **必须小于 10** —— 用户口径是「按**真正扣掉的血**判定」，排在护盾前面拿到的就是
 * 扣盾**之前**的值，先给目标套个盾再打就能骗出碎冰（而盾恰恰应该能保住冰）。
 * 又**必须大于 0**，免得和飘字抢同一个号；取 4 而不是 5 是因为 5 已经被吸血占了
 * （同号时谁先跑没有保证）。
 *
 * ## 判据是 `min(data.damage, 当前血)`，不是 `data.damage`
 *
 * 与 `LifestealSystem` 同一条口径：伤害回调跑在**扣血之前**，所以此刻读到的血量是
 * 「这一刀之前的血」。少了这个 `min`，用一记大伤害打一只残血单位会按整刀算，
 * 把「最后一击补刀」也能碎冰 —— 而它实际只扣了 5 点血。
 *
 * ## 冰爆**不强制暴击**，走正常管线
 *
 * 用户口径。`UnitDamageTarget` 会触发一次**新的** `UNIT_DAMAGED` 派发，
 * 于是护甲、抗性、暴击、飘字全按正常规则走 —— 本系统一个字都不用管这些。
 *
 * ## 往外只报两件事：日志 + `UNIT_SHATTERED` 事件
 *
 * 碎冰成功时 `emit(UNIT_SHATTERED)`（自建事件，定义见 `GameEvent.ts` 的
 * `onUnitShattered`）。它是**表现层唯一的入口** —— 飘「碎冰」两个字、
 * 将来可能的音效/特效都订阅它，本系统不认识任何 UI 类型。
 *
 * ⚠️ **发射点排在冰爆之前**，这样「碎冰」才**先于**伤害数字出现；
 * 而且它排在两条「没来源 → 只碎冰不冰爆」的早退之前 —— 冰碎了就该报，
 * 与有没有攻击者无关。
 *
 * ## ⚠️ 重入守卫（本系统是第一个撞上的）
 *
 * `DamagePipeline.ts:42-44` 早就写明：在伤害回调里调 `UnitDamageTarget` 会**同步重入**，
 * 嵌套深度实测能到 4 层。冰爆正是这个案例的第一个。
 *
 * 需要守的只有一处：`DamageContext.ts` 的**单槽位** `lastDamageContext`。
 * 嵌套派发会把槽位覆写成内层的，内层跑完返回外层后，外层的
 * `DamageNumberDisplay(0)` 读到内层的 ctx → 身份对不上 → 飘字**退化成单色**。
 * 所以冰爆要用 `saveDamageContext()` / `restoreDamageContext()` 把槽位包起来。
 *
 * **递归的天然终止条件**：冰爆自身会再次进本系统，但那时 `FREEZE` 已经被摘掉了
 * （碎冰在造冰爆**之前**），第 4 步直接返回。所以不需要额外的重入标志位。
 *
 * ## 一次碎掉**全部** `FREEZE`
 *
 * 现方案不区分来源（两次冰冻叠着就一起碎）。将来要按来源区分再加标记，
 * 本轮明确不做 —— 记在这里免得被当成 bug。
 */

import {
  ATTACK_TYPE_MAGIC,
  DAMAGE_TYPE_COLD,
  WEAPON_TYPE_WHOKNOWS,
} from "@eiriksgata/wc3ts/*";
import { UNIT_STATE_LIFE, UNIT_STATE_MAX_LIFE } from "src/constants/game/units";
import { BuffTypeId } from "src/system/buff/types";
import { GameEventType, gameEvents } from "src/system/event";
import { UnitDamageEventData } from "src/system/event/GameEvent";
import { createLogger } from "src/utils/logger";
import { restoreDamageContext, saveDamageContext } from "./DamageContext";

const log = createLogger("FreezeShatter");

/**
 * 订阅优先级。**必须严格小于 `ShieldSystem` 的 10、大于飘字的 0**，取 4 避开吸血。
 * 理由见文件头那张表。
 */
const SHATTER_PRIORITY = 4;

/**
 * 碎冰阈值：这一击真正扣掉的血要达到目标**最大生命**的这个比例。
 *
 * 15% 是用户口径。注意它是**相对最大生命**、不是「当前生命」——
 * 打一个残血单位时阈值不会跟着变小，否则最后一击人人碎冰。
 */
const SHATTER_THRESHOLD_RATIO = 0.15;

/**
 * 冰爆的伤害量 = 触发碎冰那一击**实际扣血**的这个比例。
 *
 * 与攻击强度挂钩（玩家堆伤害时冰爆也随之变强），而不是钉死的绝对值。
 */
const ICE_SHATTER_RATIO = 0.5;

export default class FreezeShatterSystem {
  private static instance: FreezeShatterSystem | undefined;

  /** 幂等守卫 —— 热重载会重复调 `init()`，重复订阅 = 一次碎冰爆两次 */
  private bound = false;

  private constructor() {}

  public static getInstance(): FreezeShatterSystem {
    if (FreezeShatterSystem.instance === undefined) {
      FreezeShatterSystem.instance = new FreezeShatterSystem();
    }
    return FreezeShatterSystem.instance;
  }

  /** 订阅伤害事件。由 `main.ts` 的 `initialize()` 调**一次**。 */
  public init(): void {
    if (this.bound) {
      return;
    }
    this.bound = true;

    gameEvents.onUnitDamaged((data) => this.onUnitDamaged(data), {
      priority: SHATTER_PRIORITY,
    });
  }

  private onUnitDamaged(data: UnitDamageEventData): void {
    // `Actor` 是被打的那个（`ctx.target` 同源），取不到就是异常派发 —— 退出去
    const target = data.Actor;
    if (target === undefined) {
      return;
    }

    // ⚠️ **先 `hasBuffManager()` 再取 `buffManager`** —— getter 是惰性建表的，
    // 在一个从没挂过 buff 的单位上直接取会凭空造一个空的 manager。
    // 没有 manager = 没挂过任何 buff = 更不可能冻着。
    if (!target.hasBuffManager()) {
      return;
    }

    // 悬垂句柄守卫，判据同本仓其它处（`GetUnitTypeId(u) === 0`）。
    // 下面要读原生血量，在已回收的句柄上读是 1.27a 的闪退来源之一。
    const u = target.handle;
    if (u === undefined || GetUnitTypeId(u) === 0) {
      return;
    }

    // `getBuffsByType` 内部是 `filter`，**返回的就是一份新数组** ——
    // 可以在下面边遍历边 `removeBuff`，不会踩到「遍历中列表变化」。
    const frozen = target.buffManager.getBuffsByType(BuffTypeId.FREEZE);
    if (frozen.length === 0) {
      // **常见的正常路径**（绝大多数伤害打在没冻的单位上），也是冰爆递归的终止条件
      return;
    }

    const dealt = FreezeShatterSystem_actualHpRemoved(u, data.damage);
    if (dealt <= 0) {
      return;
    }

    const maxLife = GetUnitState(u, UNIT_STATE_MAX_LIFE);
    if (maxLife <= 0) {
      return;
    }
    if (dealt < maxLife * SHATTER_THRESHOLD_RATIO) {
      return; // 不够疼 —— 冰不碎，冻结照常吃满时长
    }

    // ---- 碎冰：先把冰摘掉，**再**造冰爆 ----
    // 顺序不能反：反了的话冰爆自己会再进本系统，那时冰还在，会递归下去。
    for (let i = 0; i < frozen.length; i++) {
      const b = frozen[i];
      if (b !== undefined) {
        target.buffManager.removeBuff(b);
      }
    }

    // ---- 通报「冰碎了」 ----
    // 位置有讲究：**必须在冰爆之前**、也在下面那两条「没来源」的早退分支之前。
    //   - 在早退分支之前：这个事件报的是「冰碎了」，跟有没有攻击者无关
    //     （拿不到来源时冰照样碎了，只是不冰爆）。
    //   - 在冰爆之前：飘字层订阅了它，于是「碎冰」两个字**先**被建出来，
    //     之后才轮到冰爆那串数字、以及这一刀本身的数字 —— 用户要求的
    //     「碎冰字样在伤害数字之前」就是靠这个发射顺序 + 飘字起点高一档实现的
    //     （见 `DamageNumberDisplay.onUnitShattered`）。
    gameEvents.emit(GameEventType.UNIT_SHATTERED, {
      Actor: target,
      unitTypeId: GetUnitTypeId(u),
      owner: GetOwningPlayer(u),
      source: data.source,
    });

    // 打碎冰的那个攻击者。取不到就**只碎冰、不冰爆** —— 没有来源就没有「谁打的」，
    // 硬编一个来源会让伤害归因错到别人头上，比少爆一次更糟。
    const source = data.source;
    if (source === undefined) {
      log.info("碎冰（无来源，不冰爆）：实际扣血=" + dealt);
      return;
    }
    const su = source.handle;
    if (su === undefined || GetUnitTypeId(su) === 0) {
      log.info("碎冰（施暴者句柄失效，不冰爆）：实际扣血=" + dealt);
      return;
    }

    const explosion = dealt * ICE_SHATTER_RATIO;

    // ⚠️ **存 → 造 → 还原**：包住这一次嵌套派发，别让内层覆写掉外层的
    // `lastDamageContext`（外层飘字会因此退化成单色）。完整理由见
    // `DamageContext.ts` 的 `saveDamageContext()`。
    const saved = saveDamageContext();
    UnitDamageTarget(
      su,
      u,
      explosion,
      true,
      false,
      ATTACK_TYPE_MAGIC(),
      DAMAGE_TYPE_COLD(),
      WEAPON_TYPE_WHOKNOWS()
    );
    restoreDamageContext(saved);

    // 打**实际扣血**与**冰爆量**两个数：前者是「碎冰判据算对了没有」的读数，
    // 后者是「冰爆接上了没有」的读数。只打其中一个的话，另一个只能靠猜。
    log.info(
      "碎冰：实际扣血=" + dealt + " 冰爆=" + explosion + "（" + frozen.length + " 层冻结）"
    );
  }
}

/**
 * 这一击**实际扣掉了多少血**：`min(伤害, 目标当前血)`。
 *
 * 与 `LifestealSystem_actualHpRemoved` 是同一个形状、同一个理由（回调跑在扣血之前），
 * 但**刻意各写一份**：两边的「取不到时怎么退回」不一样 —— 吸血那里退回 `damage`
 * （用刀伤当近似总比吞掉一次吸血好），而这里**退回 0**（判不出来就不要碎冰，
 * 宁可漏一次，不能凭一个来路不明的数把控制效果提前结束）。
 */
function FreezeShatterSystem_actualHpRemoved(u: unit, damage: number): number {
  const life = GetUnitState(u, UNIT_STATE_LIFE);
  if (life <= 0) {
    return 0;
  }
  return damage < life ? damage : life;
}
