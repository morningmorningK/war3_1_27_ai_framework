/**
 * 护盾 Buff：具有当前值/上限，可被伤害扣减，可选持续时间
 */

import { Buff } from "./Buff";
import { BuffPolarity, BuffTypeId, BUFF_DURATION_PERMANENT } from "./types";

export class ShieldBuff extends Buff {
  readonly typeId = BuffTypeId.SHIELD;
  /** 当前护盾值 */
  current: number;
  /** 护盾上限（本 buff 的） */
  readonly max: number;

  constructor(
    amount: number,
    duration: number = BUFF_DURATION_PERMANENT,
    displayKey?: string
  ) {
    super(duration, BuffPolarity.BENEFICIAL);
    this.current = amount;
    this.max = amount;
    this.displayKey = displayKey;
  }

  /**
   * 吸收伤害，返回本 buff 吸收的量（不超过 current）
   */
  absorbDamage(damage: number): number {
    const absorb = Math.min(this.current, damage);
    this.current = Math.max(0, this.current - absorb);
    return absorb;
  }

  /** 是否已耗尽（可被移除） */
  isDepleted(): boolean {
    return this.current <= 0;
  }
}
