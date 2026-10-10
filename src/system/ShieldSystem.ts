/**
 * 护盾系统（护盾为 Buff 的一种）
 * 1.27a：在单位受击事件中通过 BuffManager.applyShieldDamage 扣减护盾 buff，再用 data.setEventDamage 写回剩余伤害。
 * 依赖 gameEvents.onUnitDamaged，高优先级订阅以确保先于飘字等逻辑执行。
 */

import { gameEvents } from "./event";
import { UnitDamageEventData } from "./event/GameEvent";
import { findDamageContext, sumHits } from "./combat/DamageContext";

/** 高优先级，确保先于飘字等逻辑修改伤害值 */
const SHIELD_PRIORITY = 10;

export default class ShieldSystem {
  private static instance: ShieldSystem;

  private constructor() {}

  public static getInstance(): ShieldSystem {
    if (!ShieldSystem.instance) {
      ShieldSystem.instance = new ShieldSystem();
    }
    return ShieldSystem.instance;
  }

  public init(): void {
    gameEvents.onUnitDamaged(
      (data: UnitDamageEventData) => this.onUnitDamaged(data),
      { priority: SHIELD_PRIORITY }
    );
  }

  private onUnitDamaged(data: UnitDamageEventData): void {
    const target = data.Actor;
    if (!target || !target.hasShield() || data.damage <= 0) return;

    const ctx = findDamageContext(data);
    // 保存实例而不是只比较单位总盾值，避免移除 / 换盾时把新盾混入本次消耗。
    // 嵌套反应伤害在管线中已独立结算，这里只记录当前事件的扣盾。
    const shieldSnapshots = ctx === undefined ? [] :
      target.buffManager.getShieldBuffs().map(buff => ({ buff, current: buff.current }));
    let remaining: number;
    // 只有分段合计与本次实际伤害一致，才使用其中的元素归属。
    // 管线降级或其他订阅者修改过伤害时按普通吸收处理，不猜测元素。
    const usableSegments = ctx !== undefined && ctx.hits.length > 0 &&
      ctx.hits.every(hit => Number.isFinite(hit.amount) && hit.amount >= 0) &&
      sumHits(ctx) === data.damage;
    if (usableSegments && ctx !== undefined) {
      remaining = 0;
      for (let i = 0; i < ctx.hits.length; i++) {
        const hit = ctx.hits[i];
        remaining += target.buffManager.applyShieldDamage(hit.amount, hit.element, hit.shieldReaction);
      }
    } else {
      remaining = target.buffManager.applyShieldDamage(data.damage);
    }
    if (ctx !== undefined) {
      let consumed = 0;
      for (const snapshot of shieldSnapshots) {
        consumed += Math.max(0, snapshot.current - snapshot.buff.current);
      }
      ctx.shieldConsumed = consumed;
    }
    data.setEventDamage(remaining);
  }
}
