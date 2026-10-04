/**
 * 护盾系统（护盾为 Buff 的一种）
 * 1.27a：在单位受击事件中通过 BuffManager.applyShieldDamage 扣减护盾 buff，再用 data.setEventDamage 写回剩余伤害。
 * 依赖 gameEvents.onUnitDamaged，高优先级订阅以确保先于飘字等逻辑执行。
 */

import { gameEvents } from "./event";
import { UnitDamageEventData } from "./event/GameEvent";

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

    const remaining = target.buffManager.applyShieldDamage(data.damage);
    data.setEventDamage(remaining);
  }
}
