/**
 * 挂在单位上的 Buff 管理器：添加/移除、按类型查询、护盾聚合、护盾伤害结算
 */

import { Actor } from "../actor";
import { eventBus } from "../event/EventBus";
import { BUFF_EVENT_BUFFS_CHANGED } from "./types";
import { Buff } from "./Buff";
import { ShieldBuff } from "./ShieldBuff";
import { BUFF_DURATION_PERMANENT } from "./types";
import { StatModifier, StatSourceKind, toStatModifier } from "../stat/types";

/**
 * buff 挂属性修正器用的来源 key。
 *
 * 与 `RelicSystem` 的 `relic:<id>` 对称，前缀让调试日志里「这条来源是谁留下的」一眼可见。
 * key 里用 buff 的**实例 id** 而不是 `typeId` —— 同一个单位身上两个「+5 护甲」buff
 * 是两条独立来源，摘掉一个不该把另一个的加成也带走。
 */
function statSourceKey(buffId: number): string {
  return `buff:${buffId}`;
}

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

  /**
   * 把 buff 的属性修正器挂到宿主单位的属性表上。`addBuff` 与 `refreshStatMods` 共用。
   *
   * ⚠️ **挂完属性还没写回原生** —— 那要等 `StatSystem` 的下一拍（最多 0.1s）。
   * 但 TS 侧读 `statSheet.getFinal()` 是**立刻**能看到新值的（惰性重算）。
   *
   * 不加属性的 buff（`getStatModifiers()` 返回空）会走 `removeSource` 而不是直接返回
   * —— 这是给「叠层归零 / 条件消失 → 不再提供加成」兜底的，不摘的话旧修正器会永远留着。
   */
  private applyStatMods(buff: Buff): void {
    const key = statSourceKey(buff.id);
    const mods = buff.getStatModifiers();

    if (mods.length === 0) {
      // 不碰 getter：没表就说明这个 buff 从没挂过修正器，没什么可摘的
      if (this.owner.hasStatSheet()) {
        this.owner.statSheet.removeSource(key);
      }
      return;
    }

    // `this.owner.statSheet` 的 getter 会**建表**（如果还没有）—— 这里正是想要的行为：
    // 挂上加属性的 buff 就是第一次用得上属性表。
    const sourceId = String(buff.id);
    const full: StatModifier[] = [];
    for (let i = 0; i < mods.length; i++) {
      const m = mods[i];
      if (m === undefined) continue;
      full.push(toStatModifier(m, StatSourceKind.BUFF, sourceId));
    }
    this.owner.statSheet.setSource(key, full);
  }

  /**
   * 重新挂载某个 buff 的属性修正器。**改完 `buff.stacks` 之后必须调一次。**
   *
   * 修正器是「按当前 `stacks` 算出来的一整组」整体挂上去的，挂完就和 buff 脱钩了
   * （`StatSheet` 不懂叠层语义）。改了 `stacks` 不重挂，属性会**停在旧层数的值上** ——
   * 不报错、不崩溃，只是数值不对，属于最难查的那类问题。
   *
   * 之所以要主动调而不是自动钩：`stacks` 由施加方在业务里直接改（基类只携带不增减），
   * `Buff` 基类拿不到 `BuffManager`，加回调链反而更容易漏。
   */
  public refreshStatMods(buff: Buff): void {
    if (this.buffs.indexOf(buff) < 0) return; // 已经不在身上了，别再给摘掉的东西补挂
    this.applyStatMods(buff);
  }

  /**
   * 把一个 buff 从宿主身上**彻底摘掉**：摘属性来源 + 调 `onRemove()`。
   *
   * ## 为什么所有移除路径都要走这里
   *
   * 本类原来有五处各自 `splice + onRemove()`：`removeBuff`、`clearAll`、
   * `tick` 的过期分支、`tick` 的护盾耗尽分支、`applyShieldDamage` 的耗尽分支。
   * 加了属性修正器之后，每处都得记得多摘一句 `removeSource` —— 而**漏摘是静默的**：
   * 不报错、不崩溃，只是那个单位的数值从此偏高，且再也降不回来。
   *
   * 收口成一条之后，只有这一处能摘、也只有这一处需要维护。
   *
   * ⚠️ 调用方负责从 `this.buffs` 里删掉（`clearAll` 是整体换表、其余用 `splice`）
   * —— 这里只管「与列表无关的清理」，因为各调用方遍历和删除的写法不一样。
   */
  private detach(buff: Buff): void {
    // **不碰 `owner.statSheet` 的 getter**：那会惰性建表，在一个从没碰过属性的单位上
    // 凭空造一张表 + 快照一次原生。没表 = 这个 buff 从没挂过修正器。
    if (this.owner.hasStatSheet()) {
      this.owner.statSheet.removeSource(statSourceKey(buff.id));
    }
    buff.onRemove();
  }

  addBuff(buff: Buff): void {
    buff.holderId = this.owner.id;
    this.buffs.push(buff);
    // 顺序：**先挂属性修正器，再 `onApply()`** —— 让 `onApply()` 里用
    // `getFinal()` 读到的是含本 buff 加成的值（TS 侧惰性重算保证立刻可见）。
    this.applyStatMods(buff);
    buff.onApply();
    this.emitChanged();
  }

  removeBuff(buff: Buff): boolean {
    const idx = this.buffs.indexOf(buff);
    if (idx < 0) return false;
    this.buffs.splice(idx, 1);
    this.detach(buff);
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
      this.detach(copy[i]);
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
        this.detach(buff);
        this.emitChanged();
      }
    }
    // 移除已耗尽的护盾
    for (let i = this.buffs.length - 1; i >= 0; i--) {
      const b = this.buffs[i];
      if (b instanceof ShieldBuff && b.isDepleted()) {
        this.buffs.splice(i, 1);
        this.detach(b);
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
          this.detach(sh);
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
