/**
 * 单个单位的属性真值表。
 *
 * ## 它是什么
 *
 * 魔兽原生只表达得了生命、魔法、攻击、护甲、移速、三围这几样，而且读一次打一次 API。
 * 我们需要的是「基础值 + 一堆来源的加成 → 最终值」，还要有原生根本没有的暴击率、
 * 元素精通、穿透、韧性……所以**在 TS 侧建一份分层真值**，这份真值就是唯一权威：
 *
 * ```
 *     base        从原生快照一次，之后**绝不回读**
 *     sources     按来源分组挂载的修正器（buff / 圣遗物 / 将来的装备、天赋、光环）
 *     final       (base * (1 + ΣPERCENT) + ΣFLAT) * Π(1 + MULTIPLIER)，再钳制
 * ```
 *
 * ## 三条不可动摇的边界
 *
 * 1. **修正器按来源分组**（`"buff:12"` / `"relic:war_fang"`）。摘除是一句
 *    `removeSource(key)`，不管这条来源贡献了几条修正器、几个属性。
 *    这是「漏摘 = 永久属性残留」的结构性防线 —— 不靠人记得写反向代码。
 *
 * 2. **base 只快照一次，之后绝不回读。** 写完 final 再读原生当 base，会把加上的值
 *    当成白值，下一次重算就翻倍。
 *
 * 3. **钳制与跨属性变换只在 `recalc()` 里做一次**，查询就是数组读取。
 *    查询点会很多（面板、伤害管线、技能），任一处忘钳制就是 bug。
 *
 * ## 什么时候重算
 *
 * 两个脏标记，语义分开：
 *
 * | 标记 | 作用 |
 * |---|---|
 * | `calcDirty` | `getFinal()` 读时惰性重算 —— **保证消费者拿到的一定是最新值** |
 * | `syncDirty` | `flush()` 里做副作用（写回原生 + 发事件）—— 由 `StatSystem` 定时驱动 |
 *
 * 一次穿 6 件装备会在同一帧产生几十次 `setSource`，脏标记把它们压成**一拍一次**原生写回。
 * `flush()` 不做正确性保证，只做副作用 —— 正确性由 `getFinal` 的惰性重算兜住。
 */

import { eventBus } from "../event/EventBus";
import {
  UNIT_STATE_ATTACK_BONUS,
  UNIT_STATE_ATTACK_WHITE,
  UNIT_STATE_DEFEND_WHITE,
  UNIT_STATE_LIFE,
  UNIT_STATE_MANA,
  UNIT_STATE_MAX_LIFE,
  UNIT_STATE_MAX_MANA,
  UNIT_TYPE_HERO,
} from "../../constants/game/units";
import {
  clampFinal,
  DEFAULT_CRIT_DMG,
  STAT_COUNT,
  STAT_EVENT_CHANGED,
  StatChangedPayload,
  StatId,
  StatModifier,
  StatModKind,
  StatSheetHost,
  StatType,
} from "./types";
// **运行时 import**（不是 `import type`）—— markDirty / dispose 里要真的调到它。
// 方向是单向的：`StatSheet → StatSystem`，`StatSystem` 那边只用 `import type` 拿本类，
// 生成的 StatSystem.lua 顶部不会 require 本文件，所以没有 require 环。
import { StatSystem } from "./StatSystem";

/** 生成一个长度 n、全 0 的密集数组。**必须用 push** —— 按下标赋值若留洞，Lua 里 `.length` 是 0 */
function fillZeros(n: number): number[] {
  const a: number[] = [];
  for (let i = 0; i < n; i++) a.push(0);
  return a;
}

/** 同上，全 1。乘区的初值 */
function fillOnes(n: number): number[] {
  const a: number[] = [];
  for (let i = 0; i < n; i++) a.push(1);
  return a;
}

export class StatSheet {
  /** 宿主单位。生产环境里是 `Actor`；自测里是假宿主 */
  public readonly host: StatSheetHost;

  /** 基础值。来自原生快照或手动 `setBase`，**永不回写** */
  private base: number[];
  /** 最终值。`recalc()` 的产物，`getFinal()` 直接读它 */
  private final: number[];
  /** 上一次已经写回原生 / 发过事件的值。用来做「变了才写」的去重 */
  private lastSynced: number[];

  /** 按来源分组的修正器。key 见文件头 */
  private sources: Map<string, StatModifier[]>;

  private calcDirty: boolean = false;
  private syncDirty: boolean = false;
  private disposed: boolean = false;

  constructor(host: StatSheetHost) {
    this.host = host;
    this.base = fillZeros(STAT_COUNT);
    this.final = fillZeros(STAT_COUNT);
    this.lastSynced = fillZeros(STAT_COUNT);
    this.sources = new Map<string, StatModifier[]>();
  }

  // ==================== 读 ====================

  /**
   * 最终值。**这是唯一的对外读取入口** —— 惰性重算保证不会脏读，
   * 不必等 `flush()`（那是管副作用的一拍）。
   *
   * `LIFE` / `MANA` 是例外：它们是**引擎的运行时状态**（谁在被扣血、谁在回蓝是
   * 战斗过程决定的），不属于 base + sources 那套托管计算。所以这两个直接透传原生，
   * 不填 base、不写回、也永远不会进 `changed`。
   */
  public getFinal(stat: StatId): number {
    if (this.disposed) return 0;
    if (stat < 0 || stat >= STAT_COUNT) return 0;
    if (stat === StatType.LIFE || stat === StatType.MANA) return this.readNativeCurrent(stat);
    if (this.calcDirty) this.recalc();
    return this.final[stat];
  }

  public getBase(stat: StatId): number {
    if (this.disposed) return 0;
    if (stat < 0 || stat >= STAT_COUNT) return 0;
    return this.base[stat];
  }

  public isDisposed(): boolean {
    return this.disposed;
  }

  // ==================== 写 ====================

  /**
   * 从原生快照一次基础值。**建表时调一次，之后绝不回读**（见文件头边界 2）。
   *
   * 只快照原生表达得了的那几项；纯 TS 侧的属性（暴击率、穿透、韧性……）base 保持 0，
   * 它们全靠来源用 `FLAT` 加百分点（见 `types.ts` 文件头约束 2）。
   *
   * `CRIT_DMG` 是唯一的例外：它不是引擎给的，也不是装备给的，而是角色的出厂值，
   * 所以直接铺进 base 而不是挂一条来源 —— 否则每个单位建表时都得记得挂一次。
   *
   * ⚠️ 三围必须读 `includeBonuses = false`（**白字**），不能读 `true`（含加成）。
   * `SetHeroStr` 写的也是白字，两边都是白字才能对齐；读含加成的值会让
   * `final = base + 修正` 里混进装备绿字，而写回时又把它固化成白字 ——
   * **一摘一挂就翻一倍**。迁移前的 `warFang` 用的就是 `false`。
   */
  public snapshotBaseFromNative(): void {
    const u = this.host.handle;
    if (u === undefined) return;

    this.base[StatType.LEVEL] = GetUnitLevel(u);
    this.base[StatType.MAX_LIFE] = GetUnitState(u, UNIT_STATE_MAX_LIFE);
    this.base[StatType.MAX_MANA] = GetUnitState(u, UNIT_STATE_MAX_MANA);
    this.base[StatType.ARMOR] = GetUnitState(u, UNIT_STATE_DEFEND_WHITE);
    this.base[StatType.BASE_ATTACK] = GetUnitState(u, UNIT_STATE_ATTACK_WHITE);
    this.base[StatType.BONUS_ATTACK] = GetUnitState(u, UNIT_STATE_ATTACK_BONUS);
    this.base[StatType.MOVE_SPEED] = GetUnitMoveSpeed(u);
    this.base[StatType.CRIT_DMG] = DEFAULT_CRIT_DMG;

    // **非英雄不读三围** —— `GetHeroStr` 对非英雄单位的行为无保证。
    // 读白字（`false`）的理由见上面那段 ⚠️。
    if (IsUnitType(u, UNIT_TYPE_HERO)) {
      this.base[StatType.STRENGTH] = GetHeroStr(u, false);
      this.base[StatType.AGILITY] = GetHeroAgi(u, false);
      this.base[StatType.INTELLIGENCE] = GetHeroInt(u, false);
    }

    // 铺完 base 立刻算一次，并把它记为「已同步」。
    //
    // 刚建的表没有任何来源，final 就等于 base，写回原生是纯 no-op。把 lastSynced
    // 一并对齐之后，以后第一次挂来源时只有**真正变了的那几项**会被写回和发事件，
    // 而不是全表 43 项都算「变化」。
    //
    // 这里**不走 `markDirty()`** —— 那会把表塞进 `StatSystem` 的脏集合，
    // 而这一拍根本无值可写。
    this.recalc();
    for (let s = 0; s < STAT_COUNT; s++) {
      this.lastSynced[s] = this.final[s];
    }
    this.syncDirty = false;
  }

  /**
   * 设基础值。
   *
   * 生产路径是 `snapshotBaseFromNative()` 在建表时调一次（Step 2 接）；
   * 自测直接用它铺初值。**也用于将来「引擎外部改了原生值」的补课**
   * （升级加三围 / 加血 —— v1 尚未接管，见文件末尾的已知限制）。
   */
  public setBase(stat: StatId, value: number): void {
    if (stat < 0 || stat >= STAT_COUNT) return;
    this.base[stat] = value;
    this.markDirty();
  }

  /**
   * 整体挂载某来源的修正器。
   *
   * **同 key 再调就是整体替换**，天然幂等 —— 叠层数变了，调用方按新的 `stacks`
   * 重算一份数组再调一次即可，`StatSheet` 不需要懂叠层语义。
   */
  public setSource(key: string, mods: StatModifier[]): void {
    this.sources.set(key, mods);
    this.markDirty();
  }

  /** 摘除某来源的全部修正器。**幂等** —— key 不存在直接返回 */
  public removeSource(key: string): void {
    if (!this.sources.has(key)) return;
    this.sources.delete(key);
    this.markDirty();
  }

  public hasSource(key: string): boolean {
    return this.sources.has(key);
  }

  /** 当前挂了几条来源。调试用 */
  public sourceCount(): number {
    return this.sources.size;
  }

  // ==================== 重算 ====================

  /**
   * 标脏。
   *
   * `calcDirty` 管**正确性**（`getFinal` 读时惰性重算，任何消费者立刻拿到新值），
   * `syncDirty` 管**副作用**（下一拍写回原生 + 发事件）。两者分开的理由见文件头。
   *
   * 同时把本表登记进 `StatSystem` 的脏集合 —— 那边的 0.1s 定时器只冲刷被登记过的表，
   * 不是全地图单位。
   */
  private markDirty(): void {
    if (this.disposed) return;
    this.calcDirty = true;
    this.syncDirty = true;
    StatSystem.getInstance().markDirty(this);
  }

  /**
   * 从 base + 全部修正器重推 final。
   *
   * **全程无 try/catch** —— 这里一旦有 catch，tstl 会把 catch 编成内嵌函数，
   * 而 Lua 的 `goto` 不跨函数找 label，整个 `.lua` 会加载失败（原生闪退）。
   * 见 memory `wc3-tstl-continue-in-catch`。
   */
  private recalc(): void {
    this.calcDirty = false;

    const flat = fillZeros(STAT_COUNT);
    const pct = fillZeros(STAT_COUNT);
    const mul = fillOnes(STAT_COUNT);

    this.sources.forEach((mods) => {
      for (let i = 0; i < mods.length; i++) {
        const m = mods[i];
        if (m === undefined) continue;
        if (m.stat < 0 || m.stat >= STAT_COUNT) continue;
        if (m.kind === StatModKind.FLAT) {
          flat[m.stat] += m.value;
        } else if (m.kind === StatModKind.PERCENT) {
          pct[m.stat] += m.value;
        } else {
          mul[m.stat] *= 1 + m.value;
        }
      }
    });

    // percent 只乘 base、不乘 flat —— 对标「装备：生命值+5%」加在白值上、
    // 固定生命 +200 是独立项。两者同级且互不依赖，所以来源的挂载顺序不影响结果。
    for (let s = 0; s < STAT_COUNT; s++) {
      this.final[s] = (this.base[s] * (1 + pct[s]) + flat[s]) * mul[s];
    }

    // ---- 跨属性变换：暴击率溢出 1:1 转暴伤 ----
    // **必须在单属性钳制之前**，因为要读钳制前的原始值；`clampFinal` 里
    // 因此只管 CRIT_RATE 的下限。每次 recalc 都从 base+mods 重推，所以
    // 溢出值不会被持久化、不会被下一次重算重复计入。
    const rawCrit = this.final[StatType.CRIT_RATE];
    if (rawCrit > 1) {
      this.final[StatType.CRIT_RATE] = 1;
      this.final[StatType.CRIT_DMG] += rawCrit - 1;
    }

    for (let s = 0; s < STAT_COUNT; s++) {
      this.final[s] = clampFinal(s, this.final[s]);
    }
  }

  // ==================== 冲刷（副作用）====================

  /**
   * 把 final 与 `lastSynced` 逐项比对，只写变化了的：写回原生 + 收集起来发一次事件。
   *
   * 无变化时**不发事件** —— 否则将来属性面板会被每拍重绘（见 `STAT_EVENT_CHANGED` 注释）。
   *
   * ⚠️ 事件在**所有写回完成之后**才发。回调里若又改了属性，只会重新标脏、下一拍处理，
   * 不会在本拍重入这段循环。
   */
  public flush(): void {
    if (this.disposed) return;
    if (this.calcDirty) this.recalc();
    if (!this.syncDirty) return;
    this.syncDirty = false;

    const changed: StatId[] = [];
    for (let s = 0; s < STAT_COUNT; s++) {
      const v = this.final[s];
      if (v !== this.lastSynced[s]) {
        this.writeNative(s, v);
        this.lastSynced[s] = v;
        changed.push(s);
      }
    }

    if (changed.length > 0) {
      const payload: StatChangedPayload = { actor: this.host, changed };
      eventBus.emit(STAT_EVENT_CHANGED, payload);
    }
  }

  /** 读当前生命 / 魔法。只有 `LIFE` / `MANA` 走这里，见 `getFinal` */
  private readNativeCurrent(stat: StatId): number {
    const u = this.host.handle;
    if (u === undefined) return 0;
    return GetUnitState(u, stat === StatType.LIFE ? UNIT_STATE_LIFE : UNIT_STATE_MANA);
  }

  /**
   * 把某个属性的 final 写回魔兽原生。**只有变化过的项才会被调到**（见 `flush`）。
   *
   * 原生表达得了的只有下面这 9 项，其余（暴击率、元素精通、穿透、韧性、擢升、免伤、
   * 攻速、回复……）纯 TS 侧，落到 `default` 什么都不做 —— 它们是给伤害管线读的，
   * 引擎本来就不认识。
   *
   * ⚠️ **不写 `LIFE` / `MANA`**：那两个是引擎管的运行时状态（见 `getFinal`），
   * 我们只在上限下调时顺手钳一下别让它超过上限。
   *
   * ⚠️ 三围（`SetHeroStr` 那一组）的**已知限制**：引擎会在力量变化时自己重算生命上限，
   * 而我们的 `base[MAX_LIFE]` 是建表时的一次快照，不会跟着动。也就是说「引擎替我们
   * 改的那部分」我们的账面上看不见。v1 接受这个漂移 —— 它和迁移前的行为一致
   * （原 `warFang` 也是直接 `SetHeroStr`），没有回归。详见风险 #10。
   *
   * ⚠️ **英雄的 `MAX_LIFE` / `ARMOR` 有掉值的风险**：这两项在英雄身上是从
   * 「白值 + 力量/敏捷」推导的，引擎在升级、加三围、换装时都会重算一遍，
   * 把这里写进去的值盖掉。1.27a 上是否真的会盖、什么时点会盖，**尚未实测**。
   * 如果发现掉了，替代路线是改成挂 `STRENGTH` / `AGILITY` 修正器，让引擎自己算
   * ——代价是那条路会把其他生命/护甲来源也一起放大。普通单位没有这个顾虑。
   */
  private writeNative(stat: StatId, value: number): void {
    const u = this.host.handle;
    if (u === undefined) return;

    switch (stat) {
      case StatType.MAX_LIFE:
        SetUnitState(u, UNIT_STATE_MAX_LIFE, value);
        // 上限降下来时当前生命可能已经超了 —— 引擎不会自动钳，得自己来，
        // 否则血条会显示「600/500」
        if (GetUnitState(u, UNIT_STATE_LIFE) > value) {
          SetUnitState(u, UNIT_STATE_LIFE, value);
        }
        break;

      case StatType.MAX_MANA:
        SetUnitState(u, UNIT_STATE_MAX_MANA, value);
        if (GetUnitState(u, UNIT_STATE_MANA) > value) {
          SetUnitState(u, UNIT_STATE_MANA, value);
        }
        break;

      case StatType.ARMOR:
        SetUnitState(u, UNIT_STATE_DEFEND_WHITE, value);
        break;

      // 白字与绿字分开写 —— 合在一起会让 `%攻击力` 把绿字也放大（见 units.ts 注释）
      case StatType.BASE_ATTACK:
        SetUnitState(u, UNIT_STATE_ATTACK_WHITE, value);
        break;

      case StatType.BONUS_ATTACK:
        SetUnitState(u, UNIT_STATE_ATTACK_BONUS, value);
        break;

      case StatType.MOVE_SPEED:
        SetUnitMoveSpeed(u, value);
        break;

      // 三围：**非英雄守卫必须有**。`SetHeroStr` 打在普通单位上是访问违例。
      // 正常情况下非英雄的三围 base 与 final 都是 0、永远不会进 changed，
      // 但「有人给非英雄挂了三围来源」这种误用必须在这里挡住，而不是崩在引擎里。
      //
      // 下限 1 也是必需的：三围可以来源是负的（减益），而引擎对 0 或负数三围的
      // 反应没有保证。这个 `Math.max(1, ...)` 是从迁移前的 `warFang` 那边继承来的
      // （它原来在 `removeHeroStrength` 里做同样的事）。
      case StatType.STRENGTH:
        if (IsUnitType(u, UNIT_TYPE_HERO)) SetHeroStr(u, Math.max(1, value), true);
        break;

      case StatType.AGILITY:
        if (IsUnitType(u, UNIT_TYPE_HERO)) SetHeroAgi(u, Math.max(1, value), true);
        break;

      case StatType.INTELLIGENCE:
        if (IsUnitType(u, UNIT_TYPE_HERO)) SetHeroInt(u, Math.max(1, value), true);
        break;

      default:
        // 纯 TS 侧属性（暴击率 / 精通 / 穿透 / 韧性 / 攻速 / 回复 ……）—— 引擎不认识，无需写回
        break;
    }
  }

  // ==================== 生命周期 ====================

  /**
   * 单位销毁时归零。
   *
   * 这是「三重保险」的最后一重：即使前面 `BuffManager` / `RelicSystem` 漏摘了某条来源，
   * 这里也一次性清空。同时保证死亡单位不会再被 `StatSystem` 的定时器碰到悬垂句柄
   * —— `unmarkDirty` 把本表从脏集合里摘掉，`disposed` 则让任何残留的调用直接返回。
   */
  public dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    StatSystem.getInstance().unmarkDirty(this);
    this.sources.clear();
    this.base = [];
    this.final = [];
    this.lastSynced = [];
  }
}
