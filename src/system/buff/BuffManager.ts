/**
 * 挂在单位上的 Buff 管理器：添加/移除、按类型查询、护盾聚合、护盾伤害结算
 */

import { Actor } from "../actor";
import { eventBus } from "../event/EventBus";
import { BUFF_EVENT_BUFFS_CHANGED } from "./types";
import { Buff } from "./Buff";
import { ShieldBuff } from "./ShieldBuff";
import { StunBuff } from "./StunBuff";
import { FreezeBuff } from "./FreezeBuff";
import { RootBuff, SlowBuff } from "./ControlBuffs";
import { BUFF_DURATION_PERMANENT } from "./types";
import { StatModifier, StatSourceKind, StatType, toStatModifier } from "../stat/types";

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

/**
 * 护盾强效（`SHIELD_STRENGTH`）的**唯一消费者**。把「要发放的护盾量」放大成实际值。
 *
 * ## 在「发放时」乘，不在「吸收时」乘
 *
 * 盾一挂上就是放大后的值：100 的盾带 50% 强效，buff 里 `current = max = 150`，
 * 悬停 Tips 写「护盾：150 / 150」，护盾条也按 150 走 —— **玩家看到的数字和实际
 * 能挡的伤害是同一个数**，不会出现「显示 100 却挡了 150」。
 *
 * 代价（已知、可接受）：**先上盾、后捡护符，已有的盾不会变强**，要重新上一次盾。
 * 真要做成活的，就得给 `ShieldBuff` 加宿主引用、在吸收时现算 —— 那是另一条路，
 * 本轮明确不做（见计划「本轮不做」）。
 *
 * ## 为什么放在这个文件、这个位置
 *
 * `addShieldBuff` 是护盾值的**唯一收口** —— `Actor.addShield`（正数那条）和直接调
 * `buffManager.addShieldBuff` 的路径都会经过它。放在这里，两条路都自动吃到强效。
 *
 * ⚠️ **`delta < 0` 那条路不经过这里**（`addShield` → `reduceShield` →
 * `applyShieldDamage`），所以扣盾的量永远是实际点数、不会被乘 —— 那正是要的。
 *
 * ## ⚠️ 先 `hasStatSheet()` 再取 `statSheet`
 *
 * `actor.statSheet` 的 getter 是**惰性建表**的，在可能已 `detach` 的句柄上直接取
 * 会在那里重建一张表。写法与 `HealSystem_sheetOf` / `DamagePipeline_sheetOf` 一致。
 *
 * 语义上也说得通：**没有属性表 = 一条来源都没有 = 强效是 0**。
 */
function applyShieldStrength(owner: Actor, amount: number): number {
  if (!owner.hasStatSheet()) {
    return amount;
  }
  const rate = owner.statSheet.getFinal(StatType.SHIELD_STRENGTH);
  if (rate <= 0) {
    // **零开销路径**：场上绝大多数单位的强效是 0（这一项连 base 都没有），
    // 原样返回，不做乘法、也不给护盾值带上浮点尾数。
    return amount;
  }
  return amount * (1 + rate);
}

/**
 * 韧性（`TENACITY`）的**唯一消费者**：把「要施加的眩晕时长」按目标韧性缩短。
 *
 * 形状与上面的 `applyShieldStrength` 逐行对齐（`hasStatSheet()` 守卫 → 零开销短路
 * → 唯一收口），**只有方向相反**：护盾是 ×(1 + rate)，韧性是 ×(1 - rate)。
 *
 * 在**发放时**算，不在 tick 时算 —— 理由和护盾强效一样：buff 一挂上，
 * `duration` 就是缩短后的值，buff 栏的倒计时、`isExpired()` 的判据读的都是同一个数，
 * 不会出现「显示 5 秒却只定住 2.5 秒」。代价也一样：**先被眩晕、后拿到韧性，
 * 这一次不会变短**，要等下一次控制。
 *
 * ⚠️ **与护盾的唯一结构差异：rate = 1（免疫）时这里返回 0，而护盾永远 > 0。**
 * 所以调用处**必须**挡 `reduced <= 0` —— 否则 `addBuff` 会先调 `onApply()` 把单位
 * 暂停，要等到下一拍 0.1s 的 `BuffSystem.tick` 才发现 `isExpired()` 再解除，
 * 免疫单位被白暂停一帧（见 `addStunBuff`）。
 *
 * `clampFinal` 把 `TENACITY` 钳在 `[0, 1]`（`stat/types.ts`），所以这里不会算出负数。
 */
function applyTenacity(owner: Actor, duration: number): number {
  if (!owner.hasStatSheet()) {
    return duration;
  }
  const rate = owner.statSheet.getFinal(StatType.TENACITY);
  if (rate <= 0) {
    // **零开销路径**：场上绝大多数单位韧性是 0（这一项连 base 都没有），
    // 原样返回，不做乘法、也不给时长带上浮点尾数。
    return duration;
  }
  return duration * (1 - rate);
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

  /**
   * 场上还有没有**别的** buff 占着 `PauseUnit` 这一位。
   *
   * ## 为什么是「按标志」而不是「按类型」
   *
   * `PauseUnit(u, false)` 是一个**布尔位、没有引用计数** —— 谁都能解开别人的暂停。
   * 所以解除暂停前必须知道「还有没有别的家伙占着」，而**这个判断不能按 buff 类型写死**：
   * 原先 `StunBuff.onRemove()` 数的是 `BuffTypeId.STUN`，加进冻结（`FreezeBuff`，
   * 同样调 `PauseUnit`）之后就错了 —— 眩晕先到期会把仍在生效的冻结一起放开。
   *
   * 改成让每个控制类 buff 自己覆写 `Buff.pauseControl = true` 声明占位，
   * 判断收口到这里。将来加第三个暂停类控制（击飞、恐惧）不用动本文件。
   *
   * ## ⚠️ 只在「先删再问」的调用点有效
   *
   * 各移除路径都是**先 `splice` 再 `detach`**（所以这里数到的是「除自己之外」），
   * `StunBuff` / `FreezeBuff` 的守卫正是靠这条约定才成立。
   *
   * 唯一的例外是 `clearAll()`：它**先 `this.buffs = []` 再逐个 detach**
   * （见那里的注释），于是批量清理时本方法**恒返回 false**，每个控制 buff 都会
   * 各自调一次 `PauseUnit(u, false)`。这是**幂等、无害**的（单位正在死亡回收），
   * 但要知道守卫在这条路径上是被绕过的 —— 别把「守卫永远生效」当成不变量。
   */
  hasPauseControl(): boolean {
    for (let i = 0; i < this.buffs.length; i++) {
      const b = this.buffs[i];
      if (b !== undefined && b.pauseControl) {
        return true;
      }
    }
    return false;
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
   * 添加护盾 Buff（可选持续时间，默认永久直到被打破）。
   *
   * `amount` 是**基础量**，实际挂上去的是护盾强效放大后的值 —— 唯一的消费者
   * 就在下面这一行（`applyShieldStrength`）。所以返回的 `ShieldBuff.max`
   * 是放大后的，`Actor.shield` / buff 提示 / 护盾条读到的都是同一个数。
   */
  addShieldBuff(
    amount: number,
    duration: number = BUFF_DURATION_PERMANENT,
    displayKey?: string
  ): ShieldBuff {
    const buff = new ShieldBuff(
      applyShieldStrength(this.owner, amount),
      duration,
      displayKey
    );
    this.addBuff(buff);
    return buff;
  }

  /**
   * 施加眩晕。**眩晕时长的唯一收口** —— 施加方只调这里，韧性（将来）自动生效。
   *
   * 读 `this.owner` 的属性是对的：`owner` 就是**受害者**，而韧性该看被打的那个
   * （不是施法者的）。
   *
   * 返回 `StunBuff` 而不是 `void`：调用处要打日志念出**实际时长**，
   * 那是「韧性有没有生效」的读数。
   *
   * ⚠️ **`duration <= 0` 必须挡住，不能挂一个 0 时长的 buff** ——
   * `addBuff` 会先调 `onApply()`（把单位暂停），要等到下一拍 0.1s 的 `BuffSystem.tick`
   * 才发现 `isExpired()` 再解除，单位会被**白暂停一帧**。
   * Step 3 接上韧性后这条更重要：韧性 100% 就是 `duration` 被缩到 0。
   */
  addStunBuff(duration: number): StunBuff | undefined {
    if (duration <= 0) {
      return undefined;
    }
    const reduced = applyTenacity(this.owner, duration);
    if (reduced <= 0) {
      // **韧性 100% = 免疫**：不挂 buff、也不暂停。
      // 这一道不能省 —— 挂一个 0 时长的 buff 会先 `onApply()` 暂停单位，
      // 下一拍才发现过期（见 `applyTenacity` 的注释）。
      return undefined;
    }
    const buff = new StunBuff(this.owner, reduced);
    this.addBuff(buff);
    return buff;
  }

  /**
   * 施加减速。**减速时长的唯一收口** —— 施加方只调这里，韧性自动生效。
   *
   * 形状与 `addStunBuff` 逐行对齐（挡非法时长 → `applyTenacity` → 免疫短路），
   * 差别只在挂的是哪一类 buff。
   *
   * ⚠️ **必须走这里，不能直接 `addBuff(new SlowBuff(duration))`** ——
   * `applyTenacity` 是**本文件的模块私有函数**，绕过去就是**静默不吃韧性**：
   * buff 挂上了、图标也在、时长却一点没缩，且没有任何报错。
   *
   * 返回实例而不是 `void`：调用处要打日志念出**实际时长**，那是韧性的读数
   * （与 `addStunBuff` 同一个理由）。
   */
  addSlowBuff(duration: number): SlowBuff | undefined {
    if (duration <= 0) {
      return undefined;
    }
    const reduced = applyTenacity(this.owner, duration);
    if (reduced <= 0) {
      // **韧性 100% = 免疫**。减速比眩晕温和 —— 挂一个 0 时长的实例不会像
      // `PauseUnit` 那样白暂停一帧（`SlowBuff` 压根不碰原生）。但仍然不挂：
      // 留一个 0 秒 buff 会让图标闪一下，也让「到底免疫了没有」从日志上读不出来。
      return undefined;
    }
    const buff = new SlowBuff(reduced);
    this.addBuff(buff);
    return buff;
  }

  /**
   * 施加禁锢（移速归零，**但目标照常攻击、施法**）。**时长收口**。
   *
   * 形状与 `addSlowBuff` 完全一致，措辞与理由见那一段（尤其「不能绕过直接
   * `addBuff(new RootBuff(...))`」那条 —— 绕过就静默不吃韧性）。
   *
   * ⚠️ 与眩晕的**关键区别不在强弱**：`RootBuff` 只是把移速乘区归零，
   * 目标照样能打人；要连操作一起禁掉得用 `addStunBuff` / `addFreezeBuff`。
   */
  addRootBuff(duration: number): RootBuff | undefined {
    if (duration <= 0) {
      return undefined;
    }
    const reduced = applyTenacity(this.owner, duration);
    if (reduced <= 0) {
      return undefined;
    }
    const buff = new RootBuff(reduced);
    this.addBuff(buff);
    return buff;
  }

  /**
   * 施加冻结（`PauseUnit`，与眩晕同一条线；但可被够疼的一击**打碎**）。
   * **冻结时长的唯一收口** —— 施加方只调这里，韧性自动生效。
   *
   * 形状与 `addStunBuff` 逐行对齐（挡非法时长 → `applyTenacity` → 免疫短路），
   * 差别只在挂的是 `FreezeBuff`：它带 `pauseControl = true`，会和 `StunBuff` 一起
   * 被 `hasPauseControl()` 数到，两者叠加时先到期的不会错误放开另一个。
   *
   * ⚠️ **必须走这里，不能直接 `addBuff(new FreezeBuff(...))`** ——
   * `applyTenacity` 是**本文件的模块私有函数**，绕过去就是**静默不吃韧性**。
   *
   * 返回实例而不是 `void`：调用处要打日志念出**实际时长**（同 `addStunBuff`）。
   */
  addFreezeBuff(duration: number): FreezeBuff | undefined {
    if (duration <= 0) {
      return undefined;
    }
    const reduced = applyTenacity(this.owner, duration);
    if (reduced <= 0) {
      // **韧性 100% = 免疫**：不挂 buff、也不暂停。这道不能省 —— 理由同
      // `addStunBuff`（挂一个 0 时长的实例会先 `onApply()` 暂停单位）。
      return undefined;
    }
    const buff = new FreezeBuff(this.owner, reduced);
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
