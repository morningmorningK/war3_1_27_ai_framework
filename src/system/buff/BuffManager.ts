/**
 * 挂在单位上的 Buff 管理器：添加/移除、按类型查询、护盾聚合、护盾伤害结算
 */

import { Actor } from "../actor";
import { eventBus } from "../event/EventBus";
import { BUFF_EVENT_BUFFS_CHANGED } from "./types";
import { Buff } from "./Buff";
import { ShieldBuff } from "./ShieldBuff";
import { BUFF_DURATION_PERMANENT } from "./types";

export class BuffManager {
  private owner: Actor;
  private buffs: Buff[] = [];

  constructor(owner: Actor) {
    this.owner = owner;
  }

  private emitChanged(): void {
    eventBus.emit(BUFF_EVENT_BUFFS_CHANGED, { actor: this.owner });
  }

  getOwner(): Actor {
    return this.owner;
  }

  addBuff(buff: Buff): void {
    buff.holderId = this.owner.id;
    this.buffs.push(buff);
    buff.onApply();
    this.emitChanged();
  }

  removeBuff(buff: Buff): boolean {
    const idx = this.buffs.indexOf(buff);
    if (idx < 0) return false;
    this.buffs.splice(idx, 1);
    buff.onRemove();
    this.emitChanged();
    return true;
  }

  removeBuffById(id: number): boolean {
    const b = this.buffs.find((x) => x.id === id);
    return b ? this.removeBuff(b) : false;
  }

  getBuffs(): Buff[] {
    return this.buffs.slice();
  }

  /**
   * 展示用排序（todo.md §1）：
   *   1. 限时在前、常驻在后（`duration < 0` 为常驻）
   *   2. 限时之间按**剩余时间升序**（快到期的靠前）
   *   3. 其余按 `id` 升序 —— id 单调自增，等价于「进入生效时间，旧在前」
   *
   * ⚠️ **只排副本，绝不排序 `this.buffs` 本身**：`applyShieldDamage()` 依赖
   * 列表的插入序（"先加的先吸"），原地排序会静默改掉护盾吸收顺序。
   *
   * 排序结果在稳态下是**时不变**的：所有 Buff 用同一个 `delta` tick，
   * 任意两个限时 Buff 的剩余时间之差恒定，不会每 0.1 秒重排一次导致整栏重建。
   */
  getSortedBuffs(): Buff[] {
    const arr = this.getBuffs();
    arr.sort((a, b) => {
      const pa = a.duration < 0 ? 1 : 0;
      const pb = b.duration < 0 ? 1 : 0;
      if (pa !== pb) return pb - pa;
      if (pa === 0) {
        // 直接用 duration - elapsed，不调 getRemainingSeconds()：数据层不反向依赖展示层
        const d = a.duration - a.elapsed - (b.duration - b.elapsed);
        if (d !== 0) return d;
      }
      return a.id - b.id;
    });
    return arr;
  }

  getBuffsByType(typeId: string): Buff[] {
    return this.buffs.filter((b) => b.typeId === typeId);
  }

  /** 卸掉全部 Buff（死亡回收，不保留实例） */
  clearAll(): void {
    if (this.buffs.length === 0) {
      return;
    }
    const copy = this.buffs;
    this.buffs = [];
    for (let i = copy.length - 1; i >= 0; i--) {
      copy[i].onRemove();
    }
    this.emitChanged();
  }

  /** 获取所有护盾 Buff（用于伤害吸收与 UI 聚合） */
  getShieldBuffs(): ShieldBuff[] {
    return this.buffs.filter((b): b is ShieldBuff => b instanceof ShieldBuff);
  }

  tick(delta: number): void {
    for (let i = this.buffs.length - 1; i >= 0; i--) {
      const buff = this.buffs[i];
      buff.tick(delta);
      if (buff.isExpired()) {
        this.buffs.splice(i, 1);
        buff.onRemove();
        this.emitChanged();
      }
    }
    // 移除已耗尽的护盾
    for (let i = this.buffs.length - 1; i >= 0; i--) {
      const b = this.buffs[i];
      if (b instanceof ShieldBuff && b.isDepleted()) {
        this.buffs.splice(i, 1);
        b.onRemove();
        this.emitChanged();
      }
    }
  }

  /** 当前护盾总量（所有 ShieldBuff 的 current 之和） */
  getTotalShieldCurrent(): number {
    return this.getShieldBuffs().reduce((sum, b) => sum + b.current, 0);
  }

  /** 护盾上限总量（所有 ShieldBuff 的 max 之和） */
  getTotalShieldMax(): number {
    return this.getShieldBuffs().reduce((sum, b) => sum + b.max, 0);
  }

  /**
   * 添加护盾 Buff（可选持续时间，默认永久直到被打破）
   */
  addShieldBuff(
    amount: number,
    duration: number = BUFF_DURATION_PERMANENT,
    displayKey?: string
  ): ShieldBuff {
    const buff = new ShieldBuff(amount, duration, displayKey);
    this.addBuff(buff);
    return buff;
  }

  /**
   * 对当前单位护盾造成伤害，返回未被吸收的剩余伤害。
   * 按现有护盾 buff 顺序依次吸收（先加的先吸）。
   */
  applyShieldDamage(damage: number): number {
    let remaining = damage;
    let changed = false;
    const shields = this.getShieldBuffs();
    for (const sh of shields) {
      if (remaining <= 0) {
        break;
      }
      const absorb = sh.absorbDamage(remaining);
      remaining -= absorb;
      if (absorb > 0) {
        changed = true;
      }
      if (sh.isDepleted()) {
        const idx = this.buffs.indexOf(sh);
        if (idx >= 0) {
          this.buffs.splice(idx, 1);
          sh.onRemove();
        }
      }
    }
    if (changed) {
      this.emitChanged();
    }
    return remaining;
  }

  /**
   * 仅扣减护盾值（不扣血），如驱散、技能消耗护盾等
   */
  reduceShield(amount: number): void {
    this.applyShieldDamage(amount);
  }
}
