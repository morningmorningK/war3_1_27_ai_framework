/**
 * 属性系统地基的自测 —— **只用来验证数据层，验证完可整段删掉**。
 *
 * 每一条都打印**可核对的事实**（期望值 vs 实际值），不是「跑完没报错就算过」：
 * 这个仓库吃过「日志全绿但画面上什么都没有」的亏，所以自测一律以能对上的数字为凭据。
 *
 * 本文件覆盖的是**纯计算内核**（Step 1）：
 *   ① 公式与顺序   ② 上限钳制   ③ 暴击率溢出转暴伤   ⑦ 同源替换不叠加   ⑧ 事件只在变化时发
 * 原生写回（④）、Buff 泄漏回归（⑤）、圣遗物集成（⑥）要等 Step 2~4 接线之后再补。
 *
 * 由 `main.ts` 的调试入口 `main()` 调用（只在 debug 模式跑）。
 */

import { createLogger } from "src/utils/logger";
import { eventBus } from "src/system/event/EventBus";
import { StatSheet } from "src/system/stat/StatSheet";
import { Actor } from "src/system/actor";
import { scheduler } from "src/system/async";
import { Buff } from "src/system/buff/Buff";
import { BUFF_DURATION_PERMANENT } from "src/system/buff/types";
import { RelicSystem } from "src/system/relic/RelicSystem";
import {
  UNIT_STATE_DEFEND_WHITE,
  UNIT_STATE_LIFE,
  UNIT_STATE_MAX_LIFE,
  UNIT_TYPE_HERO,
} from "src/constants/game/units";
import {
  DEFAULT_CRIT_DMG,
  ELEMENTS,
  StatChangedPayload,
  StatId,
  STAT_EVENT_CHANGED,
  StatMod,
  StatModKind,
  StatModifier,
  StatSheetHost,
  StatSourceKind,
  StatType,
  elemDamageStat,
  elemResistStat,
  statName,
} from "src/system/stat";

const log = createLogger("StatTest");

/** 浮点比较容差。Lua 的 number 是 double，`*1.1` 这种运算不会给出整数值 */
const EPS = 1e-6;

let passed = 0;
let failed = 0;

/**
 * 三条断言辅助。**只有失败才打日志** —— 通过的那些一个字都不占。
 *
 * 这么改是因为自测是**每局都跑**的：全部通过时它本来是六十多行「[通过] ……」，
 * 而每一行说的都是同一件事，真出问题时反而要在这堆噪音里找那一行红的。
 * 通过的条数没有丢，末尾的汇总行照旧报 `通过 N，失败 0`。
 * 与 `StatPanelTestExample` 的写法保持一致。
 */
function check(label: string, expected: number, actual: number): void {
  const ok = Math.abs(expected - actual) < EPS;
  if (ok) {
    passed++;
    return;
  }
  failed++;
  log.error(`[失败] ${label}：期望 ${expected}，实际 ${actual}`);
}

function checkBool(label: string, expected: boolean, actual: boolean): void {
  const ok = expected === actual;
  if (ok) {
    passed++;
    return;
  }
  failed++;
  log.error(`[失败] ${label}：期望 ${expected}，实际 ${actual}`);
}

function checkText(label: string, expected: string, actual: string): void {
  const ok = expected === actual;
  if (ok) {
    passed++;
    return;
  }
  failed++;
  log.error(`[失败] ${label}：期望「${expected}」，实际「${actual}」`);
}

/**
 * 自测用的假宿主。
 *
 * **不给 `handle`** —— 这样 `StatSheet.writeNative` 会整体跳过，自测期间碰不到任何引擎状态。
 * 生产环境里宿主是 `Actor`，它结构上满足 `StatSheetHost`。
 */
function fakeHost(id: number): StatSheetHost {
  return { id };
}

function mod(stat: StatId, kind: number, value: number): StatModifier {
  return { stat, kind, value, sourceKind: StatSourceKind.SYSTEM, sourceId: "selftest" };
}

/** 手写而不是 `Array.includes` —— 少一个要赌 tstl 支持面的东西 */
function hasStat(list: StatId[], stat: StatId): boolean {
  for (let i = 0; i < list.length; i++) {
    if (list[i] === stat) return true;
  }
  return false;
}

export function statSelfTest(): void {
  passed = 0;
  failed = 0;
  log.info("=== 属性系统自测开始 ===");

  // ---- 同步组：纯计算内核，不碰引擎 ----
  testFormula();
  testClamp();
  testCritOverflow();
  testSameSourceReplace();
  testEvents();
  testElementBlocks();

  // ---- 异步组：原生写回 ----
  // 这一组要等 `StatSystem` 的 0.1s 定时器拍上来才能读回原生值，所以是异步的。
  // **总计也搬进它的末尾打印** —— 在这里打会漏掉异步那几条，看起来像「跑了但少了一些」。
  testNativeWriteback();
}

function reportTotal(): void {
  log.info(`=== 属性系统自测结束：通过 ${passed}，失败 ${failed} ===`);
}

// ==================== ① 公式与顺序 ====================

function testFormula(): void {
  // (1000 * (1 + 0.5) + 200) * 1.1 = 1700 * 1.1 = 1870
  // 若误写成 (base + flat) * (1 + pct) 则是 1200 * 1.5 * 1.1 = 1980 —— 值不同，能区分。
  const a = new StatSheet(fakeHost(1));
  a.setBase(StatType.MAX_LIFE, 1000);
  a.setSource("t:flat", [mod(StatType.MAX_LIFE, StatModKind.FLAT, 200)]);
  a.setSource("t:pct", [mod(StatType.MAX_LIFE, StatModKind.PERCENT, 0.5)]);
  a.setSource("t:mul", [mod(StatType.MAX_LIFE, StatModKind.MULTIPLIER, 0.1)]);
  check("公式 (base*(1+pct)+flat)*mul（1870，非 1980）", 1870, a.getFinal(StatType.MAX_LIFE));

  // 同样的三条、换个挂载顺序 —— 结果必须一模一样。
  // flat 与 percent 同级且互不依赖，这正是「多处来源叠加」最容易出 bug 的地方。
  const b = new StatSheet(fakeHost(2));
  b.setBase(StatType.MAX_LIFE, 1000);
  b.setSource("t:mul", [mod(StatType.MAX_LIFE, StatModKind.MULTIPLIER, 0.1)]);
  b.setSource("t:pct", [mod(StatType.MAX_LIFE, StatModKind.PERCENT, 0.5)]);
  b.setSource("t:flat", [mod(StatType.MAX_LIFE, StatModKind.FLAT, 200)]);
  check("挂载顺序不影响结果", a.getFinal(StatType.MAX_LIFE), b.getFinal(StatType.MAX_LIFE));

  // base 为 0 的属性上挂 PERCENT 是无效的 —— 这是 types.ts 文件头点名的坑，验一下
  const c = new StatSheet(fakeHost(3));
  c.setSource("t:cdr", [mod(StatType.COOLDOWN_REDUCTION, StatModKind.PERCENT, 0.1)]);
  check("base=0 上挂 PERCENT 无效（应为 0）", 0, c.getFinal(StatType.COOLDOWN_REDUCTION));
  c.setSource("t:cdr", [mod(StatType.COOLDOWN_REDUCTION, StatModKind.FLAT, 0.1)]);
  check("base=0 上挂 FLAT 加百分点（应为 0.1）", 0.1, c.getFinal(StatType.COOLDOWN_REDUCTION));
}

// ==================== ② 上限钳制 ====================

function testClamp(): void {
  const s = new StatSheet(fakeHost(4));
  s.setSource("t:cdr", [mod(StatType.COOLDOWN_REDUCTION, StatModKind.FLAT, 0.8)]);
  s.setSource("t:dr", [mod(StatType.DAMAGE_REDUCTION, StatModKind.FLAT, 1.0)]);
  s.setSource("t:ten", [mod(StatType.TENACITY, StatModKind.FLAT, 1.5)]);
  check("冷却缩减上限 0.5（喂 0.8）", 0.5, s.getFinal(StatType.COOLDOWN_REDUCTION));
  check("免伤上限 0.8（喂 1.0）", 0.8, s.getFinal(StatType.DAMAGE_REDUCTION));
  check("韧性上限 1.0（喂 1.5）", 1.0, s.getFinal(StatType.TENACITY));

  const t = new StatSheet(fakeHost(5));
  t.setSource("t:cdr", [mod(StatType.COOLDOWN_REDUCTION, StatModKind.FLAT, -0.2)]);
  t.setSource("t:ls", [mod(StatType.LIFESTEAL, StatModKind.FLAT, -0.3)]);
  check("冷却缩减下限 0（喂 -0.2）", 0, t.getFinal(StatType.COOLDOWN_REDUCTION));
  check("吸血下限 0（喂 -0.3）", 0, t.getFinal(StatType.LIFESTEAL));
}

// ==================== ③ 暴击率溢出转暴伤 ====================

function testCritOverflow(): void {
  // 用 1.25 而不是 1.3：1.3-1 在二进制里是 0.30000000000000004，会让「精确相等」这类
  // 断言变成噪音。取 1.25 让溢出部分刚好是 0.25，误差只剩容差以内的部分。
  const s = new StatSheet(fakeHost(6));
  s.setBase(StatType.CRIT_DMG, 0.5);
  s.setSource("t:crit", [mod(StatType.CRIT_RATE, StatModKind.FLAT, 1.25)]);
  check("暴击率溢出后钳到 1.0", 1.0, s.getFinal(StatType.CRIT_RATE));
  check("溢出 0.25 按 1:1 转进暴伤（0.5+0.25）", 0.75, s.getFinal(StatType.CRIT_DMG));

  // 溢出必须**不被持久化**：摘掉来源后暴伤要回到 0.5，不能残留上一次算出来的 0.75
  s.removeSource("t:crit");
  check("摘掉来源后暴击率归 0", 0, s.getFinal(StatType.CRIT_RATE));
  check("摘掉来源后暴伤回 0.5（溢出没被持久化）", 0.5, s.getFinal(StatType.CRIT_DMG));
}

// ==================== ⑦ 同源替换不叠加 ====================

function testSameSourceReplace(): void {
  const s = new StatSheet(fakeHost(7));
  s.setSource("t:armor", [mod(StatType.ARMOR, StatModKind.FLAT, 5)]);
  check("先挂 +5 护甲", 5, s.getFinal(StatType.ARMOR));

  // 同一个 key 再挂一次 = 整体替换。**不是叠加** —— 这条是叠层数变化时的正确用法。
  s.setSource("t:armor", [mod(StatType.ARMOR, StatModKind.FLAT, 8)]);
  check("同 key 再挂 +8：应替换为 8，不是 13", 8, s.getFinal(StatType.ARMOR));

  // 另一条 key 才是叠加
  s.setSource("t:armor2", [mod(StatType.ARMOR, StatModKind.FLAT, 2)]);
  check("不同 key 才叠加（8+2）", 10, s.getFinal(StatType.ARMOR));

  const before = s.sourceCount();
  s.removeSource("t:armor");
  s.removeSource("t:armor"); // 幂等：重复摘不炸
  check("摘除后只剩 1 条来源", 1, s.sourceCount());
  check("摘除生效，护甲回落到 2", 2, s.getFinal(StatType.ARMOR));
  checkBool("重复摘除是幂等的（摘前 2 条）", true, before === 2);
}

// ==================== ⑧ 事件只在变化时发 ====================

function testEvents(): void {
  let fired = 0;
  let lastChanged: StatId[] = [];

  const sub = eventBus.on<StatChangedPayload>(STAT_EVENT_CHANGED, (p) => {
    fired++;
    lastChanged = p.changed;
  });

  const s = new StatSheet(fakeHost(8));

  // 第一次：真的变了 → 应发一次，且 changed 里要有 ARMOR
  s.setSource("t:a", [mod(StatType.ARMOR, StatModKind.FLAT, 5)]);
  s.flush();
  check("变化后发事件：次数 1", 1, fired);
  checkBool("payload.changed 含 ARMOR", true, hasStat(lastChanged, StatType.ARMOR));

  // 第二次：加一条 +5 和一条 -5，最终值没变 → **不该发**
  s.setSource("t:b", [mod(StatType.ARMOR, StatModKind.FLAT, 5)]);
  s.setSource("t:c", [mod(StatType.ARMOR, StatModKind.FLAT, -5)]);
  s.flush();
  check("最终值没变时**不发**事件：次数仍为 1", 1, fired);

  // 第三次：摘掉最初那条 +5 → 净值从 5 掉到 0 → 应发第二次。
  //   ⚠️ **不能摘 `t:b` / `t:c`** —— 那两条是 +5 和 -5，一起摘掉净值仍是 5，
  //   与上一条断言的场景等价，`flush` 不发事件才是对的（第一次写这条用例时就踩了这个坑）。
  s.removeSource("t:a");
  s.flush();
  check("再次变化后发事件：次数 2", 2, fired);
  check("摘回基线 0", 0, s.getFinal(StatType.ARMOR));

  eventBus.off(sub);
}

// ==================== 元素块接线 ====================

function testElementBlocks(): void {
  // 七元素 + 物理，两块（伤害加成 / 抗性）各占一段，且两段不重叠
  check("物理伤害加成 id", 27, elemDamageStat("physical"));
  check("草元素伤害加成 id（27+7）", 34, elemDamageStat("grass"));
  check("物理抗性 id（35+0）", 35, elemResistStat("physical"));
  check("草元素抗性 id（35+7）", 42, elemResistStat("grass"));
  checkText("物理伤害加成名字", "physical_dmg", statName(elemDamageStat("physical")));
  checkText("冰抗性名字", "ice_res", statName(elemResistStat("ice")));
  check("元素表长度（物理 + 七元素）", 8, ELEMENTS.length);

  // 元素块能真的参与计算（而不是只对了个名字）
  const s = new StatSheet(fakeHost(9));
  s.setSource("t:fire", [mod(elemDamageStat("fire"), StatModKind.FLAT, 0.35)]);
  check("火元素伤害加成 +0.35", 0.35, s.getFinal(elemDamageStat("fire")));
  check("火抗性不受影响（两块独立）", 0, s.getFinal(elemResistStat("fire")));
}

// ==================== ④ 原生写回（异步） ====================

/**
 * 等 `StatSystem` 的 0.1s 定时器冲刷。取 0.3s = 至少两拍，留足余量 ——
 * 卡在 0.1s 边界上容易因为定时器起算时刻的抖动而读到还没写的值。
 */
const WRITEBACK_WAIT = 0.3;

/** 句柄还算不算一个活着的单位。用在 defer 回调里 —— 0.3s 内单位可能已经没了 */
function stillValid(u: unit | undefined): boolean {
  if (u === undefined) return false;
  if (GetUnitTypeId(u) === 0) return false;
  return GetUnitState(u, UNIT_STATE_LIFE) > 0.405;
}

/**
 * 从场上挑一个能拿来测的活单位。
 *
 * 直接复用场上已有的单位而不 `Actor.create` 造一个：造了要销毁，销毁会连带
 * 血条 UI 的建设/拆除，测属性却引入一堆无关变量。
 *
 * **优先挑没有 buff 的** —— 第 ⑤ 组要测 `clearAll()`（会清掉该单位身上全部 buff），
 * 而 `seedBuffBarDemo()` 造出来的演示单位正好是拿来给人看 buff 栏效果的。
 * 挑一个干净的就不会把演示效果清掉。
 */
function pickTestActor(): Actor | undefined {
  let fallback: Actor | undefined = undefined;
  for (const key in Actor.allActors) {
    const a = Actor.allActors[key];
    if (a === undefined) continue;
    if (!stillValid(a.handle)) continue;
    // `hasBuffManager()` 而不是 `buffManager` —— 后者是惰性 getter，会凭空建一个
    if (!a.hasBuffManager()) return a;
    if (a.buffManager.getBuffs().length === 0) return a;
    if (fallback === undefined) fallback = a;
  }
  return fallback;
}

/**
 * 第 ④ 组：改属性 → 等一拍 → 读原生，确认真的写进去了；摘掉 → 再等一拍 → 确认还原。
 *
 * 这一组是 Step 2 的核心验收：**前面那 30 多条验的是「算得对」，这一组验的是
 * 「算出来的值真能变成游戏里的效果」**。三条时序断言缺一不可：
 *   1. `getFinal` 立刻反映修正（同步，证明惰性重算没坏）
 *   2. 同一时刻原生**还没**变（证明副作用确实是攒到下一拍，不是每次 setSource 都写）
 *   3. 等够时间后原生变了，摘掉后又变回来（证明写回与还原都真的落到引擎）
 */
function testNativeWriteback(): void {
  const actor = pickTestActor();
  if (actor === undefined) {
    checkBool("场上找得到一个可测单位", true, false);
    reportTotal();
    return;
  }

  const u = actor.handle;
  // 第一次访问 statSheet = 惰性建表 + 从原生快照一次 base
  const sheet = actor.statSheet;

  const baseMax = sheet.getBase(StatType.MAX_LIFE);
  const baseArmor = sheet.getBase(StatType.ARMOR);

  check("快照 base[MAX_LIFE] = 建表时的原生值", GetUnitState(u, UNIT_STATE_MAX_LIFE), baseMax);
  check("快照 base[ARMOR] = 建表时的原生值", GetUnitState(u, UNIT_STATE_DEFEND_WHITE), baseArmor);
  check("默认暴伤 base = 0.5", DEFAULT_CRIT_DMG, sheet.getBase(StatType.CRIT_DMG));

  // 英雄的三围快照必须取**白字**（见 `snapshotBaseFromNative` 里那段 ⚠️）：
  // 取含加成的值会让 `SetHeroStr` 把装备绿字固化成白字，一摘一挂就翻一倍。
  // 这里拿 `GetHeroStr(u, false)` 对账。非英雄没有三围，跳过。
  if (IsUnitType(u, UNIT_TYPE_HERO)) {
    check("英雄三围快照取白字", GetHeroStr(u, false), sheet.getBase(StatType.STRENGTH));
  }

  // 挂两条来源。此刻只标脏，副作用还没发生
  sheet.setSource("selftest:native_life", [mod(StatType.MAX_LIFE, StatModKind.FLAT, 100)]);
  sheet.setSource("selftest:native_armor", [mod(StatType.ARMOR, StatModKind.FLAT, 7)]);

  check("getFinal 立刻反映 +100（不等冲刷）", baseMax + 100, sheet.getFinal(StatType.MAX_LIFE));
  check("此刻原生 MAX_LIFE **还没**变", baseMax, GetUnitState(u, UNIT_STATE_MAX_LIFE));
  check("此刻原生 ARMOR **还没**变", baseArmor, GetUnitState(u, UNIT_STATE_DEFEND_WHITE));

  scheduler.defer(WRITEBACK_WAIT, () => {
    if (!stillValid(u)) {
      checkBool("0.3s 后测试单位仍存活", true, false);
      reportTotal();
      return;
    }

    check("0.3s 后原生 MAX_LIFE 已写回", baseMax + 100, GetUnitState(u, UNIT_STATE_MAX_LIFE));
    check("0.3s 后原生 ARMOR 已写回", baseArmor + 7, GetUnitState(u, UNIT_STATE_DEFEND_WHITE));

    // 摘掉两条来源，验还原
    sheet.removeSource("selftest:native_life");
    sheet.removeSource("selftest:native_armor");

    scheduler.defer(WRITEBACK_WAIT, () => {
      if (!stillValid(u)) {
        checkBool("0.6s 后测试单位仍存活", true, false);
        reportTotal();
        return;
      }

      check("摘除后原生 MAX_LIFE 还原", baseMax, GetUnitState(u, UNIT_STATE_MAX_LIFE));
      check("摘除后原生 ARMOR 还原", baseArmor, GetUnitState(u, UNIT_STATE_DEFEND_WHITE));

      // 到这一步属性表里挂过的来源全部摘干净了，可以安全地在同一个单位上跑下面两组。
      // **串行而不是并行**：三组都要改这个单位的护甲，并行会互相看成对方留下的来源。
      testBuffLeakRegression(actor);
      testRelicIntegration(actor);

      reportTotal();
    });
  });
}

// ==================== ⑤ Buff 移除路径的泄漏回归 ====================

/**
 * 会加护甲的测试 Buff。用 `stacks` 参与计算，顺带验叠层重挂。
 *
 * 刻意**不覆写 `onRemove()` 写反向代码** —— 本组测的正是「收口到 `detach` 之后，
 * buff 作者不需要记得写反向代码」。如果哪天有人把某条移除路径改回直接 `splice`，
 * 这里会立刻红。
 */
class TestStatBuff extends Buff {
  readonly typeId = "selftest_stat";
  constructor(duration: number) {
    super(duration);
  }
  getStatModifiers(): StatMod[] {
    return [{ stat: StatType.ARMOR, kind: StatModKind.FLAT, value: 5 * this.stacks }];
  }
}

/** 手写而不是 `Array.includes` —— 少一个要赌 tstl 支持面的东西 */
function listHasBuff(list: Buff[], b: Buff): boolean {
  for (let i = 0; i < list.length; i++) {
    if (list[i] === b) return true;
  }
  return false;
}

/**
 * 第 ⑤ 组：**遍历 `BuffManager` 的每一条移除路径，断言属性都回到了基线。**
 *
 * 这是整个属性系统里最容易出静默 bug 的地方：漏摘一条来源不会报错、不会崩溃，
 * 只是那个单位的数值从此偏高且再也降不回来。四条路径各自验一遍。
 *
 * 用手动 `mgr.tick()` 推进时钟而不 `scheduler.defer` 等真实时间 —— 第 ④ 组已经
 * 占用了 defer 链，这里再开一条会让两组同时在改同一个单位。全同步也更好读。
 *
 * 所有断言都用**相对基线**（`src0` / `n0`），不假设单位身上是空的 —— 万一
 * `pickTestActor()` 只找得到一个带 buff 的单位，测试也不能因此失败。
 */
function testBuffLeakRegression(actor: Actor): void {
  const sheet = actor.statSheet;
  const mgr = actor.buffManager;
  const baseArmor = sheet.getBase(StatType.ARMOR);

  const src0 = sheet.sourceCount();
  const n0 = mgr.getBuffs().length;

  // ---- 路径 1：显式 removeBuff ----
  const b1 = new TestStatBuff(BUFF_DURATION_PERMANENT);
  mgr.addBuff(b1);
  check("addBuff：护甲 +5", baseArmor + 5, sheet.getFinal(StatType.ARMOR));
  check("addBuff：属性表多 1 条来源", src0 + 1, sheet.sourceCount());
  check("addBuff：buff 进列表", n0 + 1, mgr.getBuffs().length);

  mgr.removeBuff(b1);
  check("removeBuff：护甲归位", baseArmor, sheet.getFinal(StatType.ARMOR));
  check("removeBuff：来源归位", src0, sheet.sourceCount());

  // ---- 路径 2：clearAll ----
  const b2 = new TestStatBuff(BUFF_DURATION_PERMANENT);
  const b3 = new TestStatBuff(BUFF_DURATION_PERMANENT);
  mgr.addBuff(b2);
  mgr.addBuff(b3);
  // 同 typeId 的两条是**两条独立来源**，key 用的是实例 id 而不是 typeId，所以会叠加
  check("两条同类 buff 叠加：护甲 +10", baseArmor + 10, sheet.getFinal(StatType.ARMOR));

  mgr.clearAll();
  check("clearAll：护甲归位", baseArmor, sheet.getFinal(StatType.ARMOR));
  check("clearAll：两条来源都摘了", src0, sheet.sourceCount());
  check("clearAll：buff 列表也空了", 0, mgr.getBuffs().length);

  // ---- 路径 3：叠层变化后重挂 ----
  const b4 = new TestStatBuff(BUFF_DURATION_PERMANENT);
  mgr.addBuff(b4);
  b4.stacks = 3;
  mgr.refreshStatMods(b4);
  // 是 +15 而不是 +5（没重挂）也不是 +20（错误地叠加了两次）
  check("refreshStatMods：按新层数 +15", baseArmor + 15, sheet.getFinal(StatType.ARMOR));
  check("refreshStatMods：仍然只占 1 条来源", src0 + 1, sheet.sourceCount());
  mgr.removeBuff(b4);

  // ---- 路径 4：自然过期 ----
  // 手动推时钟而不等真实时间：`BuffSystem` 的 tick 走的是同一个 `tick(delta)`，
  // 这里手推等价，还省 0.3s
  const b5 = new TestStatBuff(0.2);
  mgr.addBuff(b5);
  check("限时 buff 挂上：护甲 +5", baseArmor + 5, sheet.getFinal(StatType.ARMOR));

  mgr.tick(0.3); // 越过 0.2s 的持续时间
  check("过期后：护甲归位", baseArmor, sheet.getFinal(StatType.ARMOR));
  check("过期后：来源归位（本条是四处里最容易漏的）", src0, sheet.sourceCount());
  checkBool("过期后：实例已从列表移除", false, listHasBuff(mgr.getBuffs(), b5));
}

// ==================== ⑥ 遗物集成 ====================

/**
 * 第 ⑥ 组：加遗物 → 属性生效 → 移除 → 还原。
 *
 * 用 `iron_plate`（护甲 FLAT +5）—— 它最简单、和第 ⑤ 组断言风格一致，而且是
 * 这一轮从「加物编技能」改成「直接写属性」的那一个，正好验迁移没走样。
 *
 * `burningBlood` / `warFang` 更适合别的验证方式，理由写在各自的定义文件里：
 * 前者会连带改当前生命、后者有英雄/非英雄两条分支，都不适合做数值精细断言。
 *
 * `silent: true` 是为了不触发 `relic:added` / `relic:inventoryChanged` ——
 * 那会连带刷新遗物栏 UI，而验属性不需要动 UI。
 */
function testRelicIntegration(actor: Actor): void {
  const sheet = actor.statSheet;
  const sys = RelicSystem.getInstance();

  // 挑测试单位时保证的是「没有 buff」，遗物是另一回事，单独挡一道
  if (sys.hasRelic(actor, "iron_plate")) {
    checkBool("前置：测试单位身上没有 iron_plate", true, false);
    return;
  }

  const baseArmor = sheet.getBase(StatType.ARMOR);
  const src0 = sheet.sourceCount();

  const added = sys.addRelic(actor, "iron_plate", { silent: true });
  checkBool("addRelic 返回成功", true, added);
  check("遗物加成：护甲 +5", baseArmor + 5, sheet.getFinal(StatType.ARMOR));
  check("遗物占 1 条来源", src0 + 1, sheet.sourceCount());

  const removed = sys.removeRelic(actor, "iron_plate", { silent: true, all: true });
  checkBool("removeRelic 返回成功", true, removed);
  check("移除后：护甲归位", baseArmor, sheet.getFinal(StatType.ARMOR));
  check("移除后：来源归位（遗物也要摘干净）", src0, sheet.sourceCount());
  checkBool("移除后：hasRelic 为假", false, sys.hasRelic(actor, "iron_plate"));
}
