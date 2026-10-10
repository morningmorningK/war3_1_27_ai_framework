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
 *     base        从原生快照一次，之后只接受**引擎漂移**的折算（见下）
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
 * 2. **base 只快照一次，之后绝不把原生当前值直接当成 base。** 写完 final 再读原生
 *    当 base，会把加上的值当成白值，下一次重算就翻倍。
 *
 *    ⚠️ **但「绝不回读」不等于「绝不改」** —— 有些槽位引擎自己也会写（升级加三围、
 *    力量涨了它给生命上限加 25/点、物品的回复那份累加在同一字段上）。以前的模型
 *    对此**瞎着**：我们一写回就把引擎那份抹掉，不报错，面板还接着撒谎。现在这些
 *    槽位走**受控折算** —— `foldNativeDrift()` 在 `flush()` 里把
 *    `原生当前值 - lastSynced` 这份**增量**折回 base（**不是**把原生值当 base，
 *    那会双重计数）。哪些槽位参与、依据是什么，见 `DRIFT_SLOTS` 那张表，
 *    **那是对着实测读数一条条填的，不是「引擎认识就都放进来」**。
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
 *
 * `syncDirty` 那一拍里**先折算再写回**（`foldNativeDrift` → 比对循环）：不折算的话
 * 写回去的是「不含引擎那份漂移」的旧账，等于把引擎改的抹掉。折算只在**标过脏**的表上做，
 * 没标脏的表根本不必知道引擎干了什么。
 */

import { eventBus } from "../event/EventBus";
import {
  UNIT_STATE_ATTACK_BONUS,
  UNIT_STATE_ATTACK_SPEED,
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
import { createLogger } from "src/utils/logger";

const log = createLogger("StatSheet");

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

/**
 * 漂移折算的**容差**。写入再读回不保证逐位相等（浮点存储、JAPI 侧的换算），
 * 没有容差就会变成「每拍都算出一丁点漂移 → 每拍 recalc + 写回 + 发事件」。
 */
const DRIFT_EPS = 1e-4;

/**
 * **参与漂移折算的槽位**（折算本身见 `foldNativeDrift`）。
 *
 * ⚠️ 这份名单是**实测出来的**，不是「引擎认识就都放进来」。折算有两条硬前提，
 * 缺一条就不能放：
 *
 * 1. **写后读稳定** —— 写进去的值两秒后还在。不满足的话每拍都会算出一股漂移，
 *    折一次就把这股漂移往 `base` 里折一次，**单调漂移**。
 * 2. **引擎侧的改动是加法** —— 引擎只会对 `原生` 做 `±`。若引擎是「从别的字段
 *    整槽重算」（忽略我们写进去的值），折算会把我们的修正**精确抵消**：
 *
 *    ```
 *    base_new = base_old + (引擎重算值 - (base_old + 修正)) = 引擎重算值 - 修正
 *    final    = base_new + 修正 = 引擎重算值        ← 修正归零，而且不报错
 *    ```
 *
 * 两条都只能实测。2026-10-07 三轮一次性探针（`DriftSlotProbe`，已删）的读数：
 *
 * | 槽位 | 稳定 | 引擎侧 | 结论 |
 * |---|---|---|---|
 * | 三围 | 是 | 升级/直接写都是 `+=` | ✅ 放 |
 * | 英雄 `MAX_LIFE` | 是 | **加法**：写成偏离值 2100 后力量 +10，读 **2350**（= 2100 + 25×10），不是被换回派生值 1350 | ✅ 放 |
 * | 英雄 `ARMOR` | 是 | **加法**：偏高值 58.5 后敏捷 +10 读 **61.5**（= 58.5 + 0.3×10） | ✅ 放 |
 * | 英雄 `BASE_ATTACK` | 是 | **加法**：偏高值 135 后（主属性=力量的英雄）力量 +10 读 **145**（= 135 + 1×10）。这就是「1 力量 = 1 点近战白字攻击」那条 | ✅ 放 |
 * | `MAX_MANA` | 是 | 不随三围动（同一批实验里纹丝不动） | ✅ 放（等价于「引擎不碰」，折是空操作） |
 * | `MP_REGEN` | 是（10 秒平到 0.000） | 按更早那轮实测是**累加**（挂 `Arel` +2.00，再拿 `rlif` 又 +2.00） | ✅ 放（**本轮里最弱的一条**，见下） |
 * | `BONUS_ATTACK` | 是 | **加法，而且是双向的**：写成偏离值 100 后挂非英雄 `war_fang`（`addAbility(AIat)`）读 **103**（引擎叠了能力那份 3），`removeRelic` 后**当场**回 **100**（不是延迟扣） | ✅ 放 |
 * | `HP_REGEN` | **否** —— 不是在漂，是在 **-10.5 ~ +20.5 之间来回跳**（有东西在周期写它） | —— | ❌ 排除 |
 * | `MOVE_SPEED` | 是 | —— | ❌ ① `unit/skills/movement.ts` 是属性表之外的第二写入方；② 禁锢的 `MULTIPLIER = -1` 让我们写回 0，此后冲刺写回 270 会被误算成 `+270`（270→540 永久加速）；③ `MaxUnitSpeed` 的向上钳制也会让 drift 恒非零。等「只有一个写入方」做完再议 |
 * | `ATTACK_SPEED` | 是 | **加法**：写成偏离值 3.700 后敏捷 +10 读 **3.900**（= 3.700 + 0.02×10）；**但再写一次同一个值，读回 3.700** —— 引擎把「写的那一刻」的敏捷项减掉了（存 `写值 − 0.02×敏捷`），所以每拍写回会**永久**抹掉这段时间攒下的敏捷成长（那 0.2 等了 2 秒也没自己回来） | ✅ 放（**不折就必坏**，见下） |
 *
 * ⚠️ **`MP_REGEN` 是这份名单里证据最薄的一项**：它只有「10 秒读数平」+ 更早那轮
 * 「回复字段是累加」两条旁证，而**同族的 `HP_REGEN` 被推翻了** —— 那条更早的
 * memory 把两项并成一条写，`MP_REGEN` 是搭了便车进来的。**将来出「魔法回复的
 * 装备/光环被抹掉」这类症状时，第一个该回退的就是它**（从下面这行删掉即可）。
 *
 * 放新槽位**只改这一处**（外加删掉上表对应的一行）。以 `[]` 字面量写，
 * **不要**用 `arr[i] = x` 按下标填 —— 留洞的话 Lua 里 `.length` 是 0
 * （memory `wc3-tstl-sparse-array-length`）。
 *
 * ⚠️ **`ATTACK_SPEED` 是「不折就必坏」的那一类**（不是「折了更好」）：引擎对它的处理
 * 是把写回值当初值、再按当前敏捷重算，所以折算是**它唯一的活路**。它也因此和
 * `ARMOR` 属于同一族的「受三围影响的派生槽位」—— 同一拍里既改敏捷又写它的话，
 * 引擎因敏捷变化叠的那份会被紧接着的写回抹掉。**这个坑已由 `WRITE_ORDER` 堵上**
 * （三围最后写），实测读数与方法在那张表的注释里。
 */
const DRIFT_SLOTS: StatId[] = [
  // 三围：引擎升级与直接写都走 `+=`，而且它正是 `writeNative` 风险 #10 的病根
  StatType.STRENGTH,
  StatType.AGILITY,
  StatType.INTELLIGENCE,
  // 三围的派生项：引擎在**我们的值上**叠加它算出来的增量（2026-10-07 实测）
  StatType.MAX_LIFE,
  StatType.MAX_MANA,
  StatType.ARMOR,
  // 白字攻击同样由主属性派生（近战英雄 1 力量 = 1 点），实测也是加法
  StatType.BASE_ATTACK,
  // 绿字攻击：引擎侧唯一来源是非英雄 `warFang` 的 `AIat` 加技能，
  // 实测挂/摘两个方向都是增量（挂 +3、摘当场 −3），所以折了是保它、不是抹它
  StatType.BONUS_ATTACK,
  // 攻速：引擎把写回值当初值、再按当前敏捷重算（0.02/点），**写回本身会抹掉
  // 那段时间的敏捷成长**（2026-10-07 实测，见上表），所以折算是它的活路
  StatType.ATTACK_SPEED,
  // 回复：证据最薄，回退时先删这一行（见上表后的 ⚠️）
  StatType.MP_REGEN,
];

/**
 * `flush()` 写回原生的**顺序**：三围留到最后写。
 *
 * ## 为什么不能按下标升序写
 *
 * 引擎的「三围 → 派生属性」是**加法增量**，而且**在我们 `SetHeroAgi` 那次调用里就地叠上去**
 * （不是等它自己下一帧）。按下标升序写的话 `AGILITY(6)` 先于 `ATTACK_SPEED(10)` / `ARMOR(11)`：
 *
 * ```
 *   写 AGILITY  → 引擎当场把 +0.3×10 叠到护甲上
 *   写 ARMOR    → 我们那一笔不含那 3 点，把它整个盖掉
 *   记 lastSynced = 我们写的值 → 下一拍的折算量到 0 → 连漂移都不算，**永久丢失**
 * ```
 *
 * **2026-10-07 自测第 ⑪ 组实测**（同一拍里敏捷 +10、护甲 +1）：原生护甲只涨了 `1.000`
 * —— 引擎那份 3 点被盖掉，0.3s 与 1.3s 读数一样，说明不是「引擎慢」而是「来过又没了」。
 * 把三围挪到最后：先写 `ARMOR`（引擎的敏捷项此时还是旧的，写进去的初值干净），
 * 再写 `AGILITY` → 引擎把增量叠在**我们写的值之上** → 下一拍 `foldNativeDrift()` 看得见、折得回。
 *
 * ## 牵连的槽位不止护甲
 *
 * `BASE_ATTACK(8)` ← 主属性、`ARMOR(11)` ← 敏捷、`ATTACK_SPEED(10)` ← 敏捷、
 * `MP_REGEN(13)` ← 智力，这四个下标都**大于**三围（5/6/7），全在坑里，一起被这一张表修好。
 * `MAX_LIFE(2)` / `MAX_MANA(4)` 本来就在三围**之前**，所以「写完上限再压 `LIFE`/`MANA`」
 * 那个副作用的相对时机**不因本表改变**。
 *
 * ## 怎么维护
 *
 * 用 push **生成**而不是手写 43 项字面量 —— 漏一项/重一项在 Lua 里完全静默
 * （`changed.push()` 会跟着漏，`STAT_EVENT_CHANGED` 静默失落）。
 * 不变量：`WRITE_ORDER.length === STAT_COUNT`，且是 `0..STAT_COUNT-1` 的一个排列。
 * 新增 `StatType` 时这里**不用动**（除非新槽位也由三围派生，那要重新想顺序）。
 */
const WRITE_ORDER: StatId[] = [];
for (let s = 0; s < STAT_COUNT; s++) {
  if (s !== StatType.STRENGTH && s !== StatType.AGILITY && s !== StatType.INTELLIGENCE) {
    WRITE_ORDER.push(s);
  }
}
WRITE_ORDER.push(StatType.STRENGTH, StatType.AGILITY, StatType.INTELLIGENCE);

export class StatSheet {
  /** 宿主单位。生产环境里是 `Actor`；自测里是假宿主 */
  public readonly host: StatSheetHost;

  /**
   * 基础值。来自原生快照或手动 `setBase`，之后只被 `foldNativeDrift()` 按**增量**改
   * （见文件头边界 2）—— 绝不把原生当前值整个读回来当 base。
   */
  private base: number[];
  /** 最终值。`recalc()` 的产物，`getFinal()` 直接读它 */
  private final: number[];
  /**
   * 上一次已经写回原生 / 发过事件的值。
   *
   * 两个用途：① 比对出「变了才写」；② 当**漂移的基准线** ——
   * `foldNativeDrift` 算的是 `readNative(s) - lastSynced[s]`。
   *
   * ⚠️ 所以在参与折算的槽位上，它记的是**引擎实际接受的值**（写回后读回一次），
   * 不是「我们想写的值」—— 否则 `SetHeroStr` 的 `Math.max(1, ·)` 这类钳制
   * 会被当成引擎改的漂移，来回抽动。见 `flush()`。
   */
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

  /**
   * 基础值。**注意它会变** —— `DRIFT_SLOTS` 里的槽位会被 `foldNativeDrift()` 按
   * 引擎的增量改写（见文件头边界 2）。所以别把某一次的读数当成常量缓存起来复用，
   * 要基准就现取。
   */
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
   * 从原生快照一次基础值。**建表时调一次**；之后不再从这里回读，
   * 引擎后来的增量走 `foldNativeDrift()`（见文件头边界 2）。
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

    // 攻速快照的是**总值**（英雄 `1.0 + 0.02×敏捷`），敏捷那一份也在里面 ——
    // 这不影响正确性，但意味着「攻速 +30%」这类百分比来源会把敏捷派生的那份一起
    // 放大，和 `%最大生命` 放大力量派生的那份是同一个约定（见文件头公式）。
    //
    // 它是**引擎自己也会改**的槽位：敏捷一变，引擎就在我们的写回值之上按 0.02/点
    // 重算，而且**每写回一次就把当时的敏捷项固化一次**（2026-10-07 实测）。所以它
    // 必须待在 `DRIFT_SLOTS` 里 —— 对它是「不折就必坏」，不是「折了更好」。
    //
    // 非英雄没有敏捷，写进去多少就是多少；步兵实测可写、写后 2 秒稳定
    // （写 1.500 读 1.500），所以**不需要英雄守卫**（不像三围那样必须挡）。
    this.base[StatType.ATTACK_SPEED] = GetUnitState(u, UNIT_STATE_ATTACK_SPEED);

    // 每秒回复走 **JAPI**，不是 `GetUnitState` —— 1.27a 的 `GetUnitState` 里压根
    // 没有这两个槽位（`constants/game/units.ts` 里也没有对应常量）。
    // KKWE 的 `DzGetUnitLifeRegen` / `DzGetUnitManaRegen` 是唯一的读法，
    // 对应的写回是 `DzSetUnitLifeRegen` / `DzSetUnitManaRegen`（见 `writeNative`）。
    this.base[StatType.HP_REGEN] = DzGetUnitLifeRegen(u);
    this.base[StatType.MP_REGEN] = DzGetUnitManaRegen(u);

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
   * 设基础值。生产路径是 `snapshotBaseFromNative()` 在建表时调一次，自测直接用它铺初值。
   *
   * ⚠️ **别用它去「补课」引擎改过的原生值** —— 那条路现在由 `foldNativeDrift()`
   * 自动走：手动把原生值灌进来会跳过 `lastSynced` 的对账，下一拍就会被当成漂移
   * 再折一次（双重计数）。要外部写入就用原生 API 直接写，然后标脏等折算。
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
   * 这个槽位参不参与漂移折算。名单与理由见 `DRIFT_SLOTS`（放在文件头）。
   *
   * 线性扫一张三项的表 —— 别改成 `Set`：Lua 侧每次建对象，而这里在 `flush()` 的
   * 逐项循环里被调到，是每拍都走的热路径。
   */
  private isDriftSlot(stat: StatId): boolean {
    for (let i = 0; i < DRIFT_SLOTS.length; i++) {
      if (DRIFT_SLOTS[i] === stat) return true;
    }
    return false;
  }

  /**
   * **漂移折算** —— 把「引擎在我们背后改的那份」折回 `base`。
   *
   * ## 为什么是增量
   *
   * ```
   * drift    = readNative(s) - lastSynced[s]     // 引擎自己改了多少
   * base[s] += drift                             // 折回 base
   * ```
   *
   * ⚠️ **绝不能写成 `base[s] = readNative(s)`** —— 原生里已经含了我们上次写进去的
   * 修正，直接当 base 会让下一次 `final = base + 修正` **双重计数**。增量形式才对称：
   * 引擎加多少我们跟着抬多少，引擎拿走时反号、不留残留。
   *
   * 折完 `base` 变了、`final` 跟着变，`flush()` 里原来那个比对循环自然会写回一次
   * 并发事件 —— **不新增第二条写入路径**，事件语义也保持「值真变了才发」。
   *
   * 返回「有没有折到东西」，调用方据此决定要不要先重算一次。
   *
   * ## 守卫
   *
   * 悬垂句柄（`handle === undefined` / 单位已死）整步跳过 —— 宁可不折，也不要拿着
   * 它去打原生 API。照 `Actor.getDisplayName()` 的写法。
   */
  private foldNativeDrift(): boolean {
    const u = this.host.handle;
    if (u === undefined || GetUnitTypeId(u) === 0) return false;

    let folded = false;
    for (let i = 0; i < DRIFT_SLOTS.length; i++) {
      const s = DRIFT_SLOTS[i];
      if (s === undefined) continue;

      const now = this.readNative(s);
      // 这个单位没有这一项（比如非英雄没有三围）—— 没什么可折的
      if (now === undefined) continue;

      const drift = now - this.lastSynced[s];
      if (Math.abs(drift) < DRIFT_EPS) continue;

      this.base[s] += drift;
      folded = true;
    }
    return folded;
  }

  /**
   * 把 final 与 `lastSynced` 逐项比对，只写变化了的：写回原生 + 收集起来发一次事件。
   *
   * 写回顺序**不是**下标升序，而是 `WRITE_ORDER`（三围最后）—— 三围一写引擎就当场
   * 把派生增量叠到护甲/攻速/白字攻击上，先写它们的话会被我们紧随的写回盖掉。
   * 理由与实测读数见 `WRITE_ORDER` 的注释。
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

    // 先把「引擎在我们背后改的那份」折回 base 再重算（见 `foldNativeDrift`）——
    // 必须在下面的比对循环**之前**，否则写回去的还是那份不含漂移的旧账，
    // 引擎那份就被抹掉了（这正是本方法要修的病）。
    if (this.foldNativeDrift()) this.recalc();

    const changed: StatId[] = [];
    // 遍历 `WRITE_ORDER` 而不是 `0..STAT_COUNT` —— 三围必须**最后**写，
    // 否则引擎因三围变化当场叠给派生槽位的那份会被我们的写回盖掉且无处可查
    // （实测算出的是 `1.000` 而不是 `4.0`）。理由与实测读数见 `WRITE_ORDER` 的注释。
    // `changed` 因此也按这个顺序收集，订阅者不得依赖它（见 `StatChangedPayload.changed`）。
    for (let i = 0; i < WRITE_ORDER.length; i++) {
      const s = WRITE_ORDER[i];
      const v = this.final[s];
      if (v !== this.lastSynced[s]) {
        this.writeNative(s, v);
        // `lastSynced` 记**引擎实际接受的值**，不是「我们想写的值」。
        // 两者只在参与折算的槽位上可能不同（`writeNative` 里有 `Math.max(1, ·)`
        // 这类钳制、regen 那两个还会失败）—— 记错了下一拍就会被当成引擎改的漂移
        // 折进 base，来回抽动。读回与折算共用同一份名单（`isDriftSlot`）：
        // 对**不参与折算**的槽位读回没有收益，只会把「引擎没接受我们的写入」
        // 变成每次标脏都重写一遍的写战。
        let synced = v;
        if (this.isDriftSlot(s)) {
          const actual = this.readNative(s);
          if (actual !== undefined) synced = actual;
        }
        this.lastSynced[s] = synced;
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
   * 原生表达得了的有下面这 **12 项**，其余（暴击率、元素精通、穿透、韧性、擢升、
   * 免伤……）纯 TS 侧，落到 `default` 什么都不做 —— 它们是给伤害管线读的，
   * 引擎本来就不认识。
   *
   * ⚠️ **每秒回复那两项走的是 JAPI**（`DzSetUnit*Regen`），不是 `SetUnitState` ——
   * 1.27a 的原生单位状态里没有回复这个槽位。接它们时最容易走的一条弯路是
   * 「自建一个每秒 tick 的定时器去加血」，**不需要**：值写进去引擎自己会按秒结算。
   *
   * ⚠️ **攻速（`0x51`）写的是「总值」，引擎内部会减掉写的那一刻的敏捷项**
   * （存 `写值 − 0.02×敏捷`）。所以这条 case 本身是绝对写，**正确性全靠它待在
   * `DRIFT_SLOTS` 里**：折算把这段时间引擎叠的 0.02/点抬进 base，我们每拍写回去的
   * 才是「含敏捷成长」的值。少了折算，每拍写回都会把那段成长永久抹掉
   * （2026-10-07 实测：写回后那 0.2 等 2 秒也没回来）。非英雄无敏捷，实测可写、稳定。
   *
   * ⚠️ **不写 `LIFE` / `MANA`**：那两个是引擎管的运行时状态（见 `getFinal`），
   * 我们只在上限下调时顺手钳一下别让它超过上限。
   *
   * ⚠️ **上面「base 就是引擎的全部」这个前提，对一部分槽位是假的**（2026-10-06/07
   * 实测）：回复字段里物品 / 能力加的那份**累加在同一字段**（挂 `Arel` 读 +2.00，
   * 再拿 `rlif` 又 +2.00）；英雄的力量涨了，引擎给生命上限加 25/点、给白字攻击
   * 加 1/点；敏捷涨了给护甲加 0.3/点。引擎写的这些**一律是增量** ——
   * 2026-10-07 探针把 `MAX_LIFE` 写成偏离值 2100 再动力量，读回 2350
   * （= 2100 + 25×10），`ARMOR` / `BASE_ATTACK` 同理，**不是**整槽重算覆盖。
   *
   * 所以 `base` 是建表那一刻的快照这件事本身没错，错的是「之后引擎不会再动这些槽位」。
   * 现在由 `DRIFT_SLOTS` 列出的槽位走 `foldNativeDrift()` 把这份增量折回 `base`；
   * **没列进去的槽位仍然是老行为（一写回就抹掉引擎那份）**，那份风险清单见
   * `DRIFT_SLOTS` 那张表和 `todo_next.md`。
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

      // 攻速：`0x51` 是**倍率**（1.0 = 100%），不是「每秒攻击次数」；
      // 实际出手频率 = `0x51 / 0x25`。语义与实测见 `types.ts` 的 ⚠️ 与上面那段。
      case StatType.ATTACK_SPEED:
        SetUnitState(u, UNIT_STATE_ATTACK_SPEED, value);
        break;

      case StatType.MOVE_SPEED:
        SetUnitMoveSpeed(u, value);
        break;

      // 每秒回复，同样是「写进去引擎自己按秒结算」——
      // **不需要自建 tick 定时器**，这一条是接之前最容易走弯路的地方。
      //
      // 两个 `DzSet*` 是**唯一**带返回值的写回接口（其余 9 项全是 void），
      // 所以这里能顺手把「没写进去」这种失败暴露出来。**只打日志、不重试**：
      // `flush()` 只在值变化时调到本方法，重试等于每拍都写一次，而那并不能
      // 让一个本来就失败的调用成功。日志是给「游戏里怎么不回血」这类问题查因的。
      case StatType.HP_REGEN:
        if (!DzSetUnitLifeRegen(u, value)) {
          log.warn(`写回每秒生命回复失败：${value}`);
        }
        break;

      case StatType.MP_REGEN:
        if (!DzSetUnitManaRegen(u, value)) {
          log.warn(`写回每秒魔法回复失败：${value}`);
        }
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

  /**
   * `writeNative` 的**镜像**：把某个槽位的原生当前值读回来。
   *
   * 两个调用方，都只关心「引擎实际收下了什么」：
   *   - `flush()` 写回后立刻读一次，用来记 `lastSynced`（决策 3）—— 不读就分不清
   *     「我们想写的」和「引擎接受的」，`SetHeroStr` 的 `Math.max(1, ·)`、
   *     `SetUnitMoveSpeed` 的 [150,400] 钳制都会变成永动的假漂移；
   *   - `foldNativeDrift()` 算漂移。
   *
   * ⚠️ **集合必须与 `writeNative` 逐项相同**，差一项就会读到一个恒定的假值、
   * 把它当成「一直在漂」折进 base。特别是：
   *   - `LIFE` / `MANA` / `LEVEL` **不在其中**：前两个是引擎管的运行时状态（见
   *     `getFinal`），`LEVEL` 我们只读不写。把它们算进来会变成单调漂移。
   *   - 三围那三项**带英雄守卫**、非英雄返回 `undefined`；攻速**不带** ——
   *     非英雄实测可写（步兵写 1.500 读 1.500），守卫只会把非英雄的攻速来源变成静默失效。
   *
   * 返回 `undefined` = 「这个单位没有这一项」，调用方必须**跳过**而不是当成 0 ——
   * 非英雄的三围读出来是有值的垃圾，不是 0。
   */
  private readNative(stat: StatId): number | undefined {
    const u = this.host.handle;
    if (u === undefined) return undefined;

    switch (stat) {
      case StatType.MAX_LIFE:
        return GetUnitState(u, UNIT_STATE_MAX_LIFE);
      case StatType.MAX_MANA:
        return GetUnitState(u, UNIT_STATE_MAX_MANA);
      case StatType.ARMOR:
        return GetUnitState(u, UNIT_STATE_DEFEND_WHITE);
      case StatType.BASE_ATTACK:
        return GetUnitState(u, UNIT_STATE_ATTACK_WHITE);
      case StatType.BONUS_ATTACK:
        return GetUnitState(u, UNIT_STATE_ATTACK_BONUS);
      // 攻速：读写对称、**无英雄守卫**（理由见上面 ⚠️ 的第二条）
      case StatType.ATTACK_SPEED:
        return GetUnitState(u, UNIT_STATE_ATTACK_SPEED);
      case StatType.MOVE_SPEED:
        return GetUnitMoveSpeed(u);

      // 回复走 JAPI，见 `snapshotBaseFromNative` 的同名注释 —— 读法只有这两个
      case StatType.HP_REGEN:
        return DzGetUnitLifeRegen(u);
      case StatType.MP_REGEN:
        return DzGetUnitManaRegen(u);

      // 三围的守卫与 `writeNative` 逐字相同：读写都是白字、非英雄一律不碰
      case StatType.STRENGTH:
        return IsUnitType(u, UNIT_TYPE_HERO) ? GetHeroStr(u, false) : undefined;
      case StatType.AGILITY:
        return IsUnitType(u, UNIT_TYPE_HERO) ? GetHeroAgi(u, false) : undefined;
      case StatType.INTELLIGENCE:
        return IsUnitType(u, UNIT_TYPE_HERO) ? GetHeroInt(u, false) : undefined;

      default:
        // 引擎不认识 / 不该读回来的槽位（`LIFE` / `MANA` / `LEVEL` / 纯 TS 侧……）
        return undefined;
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
