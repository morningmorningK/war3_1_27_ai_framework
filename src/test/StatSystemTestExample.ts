/**
 * 属性系统地基的自测 —— **只用来验证数据层，验证完可整段删掉**。
 *
 * 每一条都打印**可核对的事实**（期望值 vs 实际值），不是「跑完没报错就算过」：
 * 这个仓库吃过「日志全绿但画面上什么都没有」的亏，所以自测一律以能对上的数字为凭据。
 *
 * 本文件覆盖的是**纯计算内核**（Step 1）：
 *   ① 公式与顺序   ② 上限钳制   ③ 暴击率溢出转暴伤   ⑦ 同源替换不叠加   ⑧ 事件只在变化时发
 * 原生写回（④）、Buff 泄漏回归（⑤）、圣遗物集成（⑥）要等 Step 2~4 接线之后再补。
 * 漂移折算（⑨，`StatSheet.foldNativeDrift`）、攻速接线（⑩）、写回顺序（⑪）需要英雄单位，
 * 挑不到就跳过。
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
  UNIT_STATE_ATTACK_SPEED,
  UNIT_STATE_DEFEND_WHITE,
  UNIT_STATE_LIFE,
  UNIT_STATE_MAX_LIFE,
  UNIT_TYPE_HERO,
} from "src/constants/game/units";
import {
  DEFAULT_CRIT_DMG,
  ELEMENTS,
  ELEM_RES_BASE,
  ELEM_VULN_BASE,
  STAT_COUNT,
  StatChangedPayload,
  StatId,
  STAT_EVENT_CHANGED,
  StatMod,
  StatModKind,
  StatModifier,
  StatSheetHost,
  StatSourceKind,
  StatType,
  clampFinal,
  elemDamageStat,
  elemResistStat,
  elemVulnStat,
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

  // ---- 元素易伤块（43..50，2026-10-08 为「激化」新开）----
  // ⚠️ 这三块是**连着**的：27..34 / 35..42 / 43..50，边界差一个数就会串味
  check("元素易伤块基址（35+8）", 43, ELEM_VULN_BASE);
  check("抗性块基址（27+8）", 35, ELEM_RES_BASE);
  check("属性总数 51（27 + 8×3）", 51, STAT_COUNT);
  check("物理易伤 id（43+0）", 43, elemVulnStat("physical"));
  check("雷易伤 id（43+3）", 46, elemVulnStat("thunder"));
  check("草易伤 id（43+7）", 50, elemVulnStat("grass"));

  // ⚠️ 这一条是本轮最隐蔽的坑：`statName` 的抗性分支原来上界写的是 `STAT_COUNT`，
  // 易伤块一加进来，那 8 格（43..50）就会被当成抗性、在日志里显示成 `thunder_res`。
  // 边界必须收成 `ELEM_VULN_BASE`（`types.ts` 已改），这里钉死它不再漂。
  checkText("雷易伤名字是 thunder_vuln（不是 thunder_res）", "thunder_vuln", statName(elemVulnStat("thunder")));
  checkText("草易伤名字是 grass_vuln", "grass_vuln", statName(elemVulnStat("grass")));
  checkText("物理易伤名字是 physical_vuln", "physical_vuln", statName(elemVulnStat("physical")));
  // 抗性那一段仍然报 `_res`（收边界时别把它一起收窄了）
  checkText("抗性那一段没被误伤", "thunder_res", statName(elemResistStat("thunder")));

  // ⚠️ 易伤钳 ≥ 0：负数会变成「元素减伤」，与抗性语义重叠
  check("易伤 -0.5 被钳到 0", 0, clampFinal(elemVulnStat("fire"), -0.5));
  check("易伤 0.3 原样保留", 0.3, clampFinal(elemVulnStat("fire"), 0.3));
  // 抗性**不**钳（它有自己的 `effectiveElementResist` 钳制，在伤害管线那一层）
  check("抗性 -0.5 在 clampFinal 里原样透传", -0.5, clampFinal(elemResistStat("fire"), -0.5));

  // 易伤块能真的参与计算，且与另两块互不干扰
  const s2 = new StatSheet(fakeHost(10));
  s2.setSource("t:vuln", [mod(elemVulnStat("grass"), StatModKind.FLAT, 0.2)]);
  check("草易伤 +0.2", 0.2, s2.getFinal(elemVulnStat("grass")));
  check("草抗性不受影响（三块独立）", 0, s2.getFinal(elemResistStat("grass")));
  check("草伤害加成不受影响", 0, s2.getFinal(elemDamageStat("grass")));
  // 同一个元素的三格必须是三个不同的 id —— 撞了就是「挂易伤结果改了抗性」
  checkBool("同元素三格互不相同", true,
    elemDamageStat("grass") !== elemResistStat("grass") &&
    elemResistStat("grass") !== elemVulnStat("grass") &&
    elemVulnStat("grass") !== elemDamageStat("grass"));
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

  // 这两个基准值下面会被**跨 `defer` 复用**（共 3 拍、约 0.6s）。`base` 现在不再是
  // 「冻死的快照」——`StatSheet.foldNativeDrift()` 会按漂移改它 —— 所以每个拍点都要
  // 显式验一下它没动，不能假设（下面两处 `base[...] 没有漂移`）。
  //
  // 这两个槽位**在** `DRIFT_SLOTS` 里（引擎对它们做的是加法），但这 0.3s 里既没升级
  // 也没换装、三围没动，引擎那份增量为零 —— 所以这两条其实是在验
  // **「折算不会自己造出漂移」**：名单放对了、写后读回也稳，就不该有假漂移。
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

    // 先验「基准没漂」，否则下面两条拿旧基准比就说不清了
    check("0.3s 期间 base[MAX_LIFE] 没有漂移", baseMax, sheet.getBase(StatType.MAX_LIFE));
    check("0.3s 期间 base[ARMOR] 没有漂移", baseArmor, sheet.getBase(StatType.ARMOR));

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

      check("0.6s 期间 base[MAX_LIFE] 没有漂移", baseMax, sheet.getBase(StatType.MAX_LIFE));
      check("0.6s 期间 base[ARMOR] 没有漂移", baseArmor, sheet.getBase(StatType.ARMOR));

      check("摘除后原生 MAX_LIFE 还原", baseMax, GetUnitState(u, UNIT_STATE_MAX_LIFE));
      check("摘除后原生 ARMOR 还原", baseArmor, GetUnitState(u, UNIT_STATE_DEFEND_WHITE));

      // 到这一步属性表里挂过的来源全部摘干净了，可以安全地在同一个单位上跑下面两组。
      // **串行而不是并行**：三组都要改这个单位的护甲，并行会互相看成对方留下的来源。
      testBuffLeakRegression(actor);
      testRelicIntegration(actor);

      // 第 ⑨ / ⑩ 组要挑的是**英雄**（三围、攻速都只有英雄身上才有意义），
      // 可能不是这个单位。它们自带全部前置与还原，跑不跑得了都在内部说清楚。
      testDriftFold();

      // 第 ⑩ / ⑪ 组都要动三围（敏捷）—— **必须排在 ⑨ 之后**：⑨ 用的是力量，
      // 两者互不干扰，但都改三围 → 引擎会重算派生槽位，串行起来读数干净。
      //
      // ⚠️ 它们都是**异步**的，**末尾自己调 `reportTotal()`** —— 链尾在 ⑪，
      // 在这里再打一次会把总数报两遍、而且第一遍漏掉它们那几条。
      testAttackSpeed();
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

// ==================== ⑨ 漂移折算（引擎在背后改的那份） ====================

/** 从场上挑一个**本地玩家的英雄**。漂移折算本轮只放三围，而三围只有英雄有 */
function pickHeroActor(): Actor | undefined {
  for (const key in Actor.allActors) {
    const a = Actor.allActors[key];
    if (a === undefined) continue;
    if (!stillValid(a.handle)) continue;
    if (!IsUnitType(a.handle, UNIT_TYPE_HERO)) continue;
    return a;
  }
  return undefined;
}

/**
 * 第 ⑨ 组：**引擎在属性表背后改了原生值，冲刷一拍应该把它「吸收」进 base，
 * 而不是写回成旧值把它抹掉。**
 *
 * 这是 `StatSheet.foldNativeDrift()` 的验收。改造前这一组里每一条都必红 ——
 * 那段 `+5`（模拟引擎升级 / 光环 / 换装）会被写回成 `base + 来源` 直接抹平，
 * 而且**不报错**。
 *
 * 全程**同步**（`setSource` 标脏 + 手动 `flush()`）：走 `scheduler.defer` 的话，
 * 0.1s 的冲刷拍可能抢在前面把漂移折掉，那就变成在测 `StatSystem` 的定时器了。
 *
 * ⚠️ 断言全部用**相对量**，不假设这个英雄身上是空的 —— 它多半挂着别处的来源
 * （`final = base + 那些来源`），所以对账的是「原生与 final 自洽」而不是裸值。
 */
function testDriftFold(): void {
  const actor = pickHeroActor();
  if (actor === undefined) {
    // **不算失败**：测试地图里没有英雄是布景问题，不是属性系统的回归。
    log.warn("--- 第 ⑨ 组（漂移折算）跳过：场上找不到英雄（三围是英雄专有）---");
    return;
  }

  const u = actor.handle;
  const sheet = actor.statSheet;
  const STR = StatType.STRENGTH;
  const KEY = "selftest:drift";

  const nativeBefore = GetHeroStr(u, false);
  const baseBefore = sheet.getBase(STR);
  const src0 = sheet.sourceCount();

  // 前置：表得是跟原生同步的，不然下面的算术没意义
  check("漂移：前置（final 与原生同步）", nativeBefore, sheet.getFinal(STR));

  // ① 在背后写一次 —— 模拟引擎自己加了三围（升级 / 光环 / 换装）
  const injected = nativeBefore + 5;
  SetHeroStr(u, injected, true);
  check("漂移：背后写入已落到原生", injected, GetHeroStr(u, false));

  sheet.setSource(KEY, []); // 空来源：只标脏，不改 final
  sheet.flush();

  check("漂移：+5 被吸收，原生没被抹掉", injected, GetHeroStr(u, false));
  check("漂移：base 吸收了 +5", baseBefore + 5, sheet.getBase(STR));
  check("漂移：final 与原生自洽", GetHeroStr(u, false), sheet.getFinal(STR));

  // ② 再冲一拍：不该双计
  sheet.setSource(KEY, []);
  sheet.flush();
  check("漂移：第二拍不双计（原生）", injected, GetHeroStr(u, false));
  check("漂移：第二拍 base 不再涨", baseBefore + 5, sheet.getBase(STR));

  // ③ 撤掉那次外部写入 → 冲刷 → 不该留残留（增量形式才有的对称性）
  SetHeroStr(u, nativeBefore, true);
  sheet.setSource(KEY, []);
  sheet.flush();
  sheet.removeSource(KEY);

  check("漂移：撤销后原生归位", nativeBefore, GetHeroStr(u, false));
  check("漂移：撤销后 base 归位（无残留）", baseBefore, sheet.getBase(STR));
  check("漂移：本组来源已摘干净", src0, sheet.sourceCount());
}

// ==================== ⑩ 攻速（ATTACK_SPEED 接线） ====================

/**
 * 第 ⑩ 组：攻速接线（2026-10-07）。
 *
 * 两件要证的事，**顺序不能换**：
 *
 *   ① **来源真的落得到原生** —— 攻速以前是「面板看得见、但没有任何来源能改它」，
 *      这一条是那个能力的验收（memory `wc3-zero-base-stat-invisible`：没有来源的
 *      属性写完了游戏里毫无反应）。
 *   ② **写回不会抹掉引擎叠的敏捷增量** —— 攻速是「不折就必坏」的槽位：引擎把写回值
 *      当初值、再按当前敏捷重算，每写回一次就把那时的敏捷项固化一次（见 `DRIFT_SLOTS`）。
 *
 * ② 仍然放在**来源摘掉之后**（顺序照旧），但理由变了：来源用的是 `FLAT`，
 * 而 `FLAT` 是加法、**不会**放大敏捷那份成长 —— 所以这一步现在只是让两条观察各自独立
 * （① 断言绝对值、② 断言增量），不再是「不摘就会读到 0.3 而不是 0.2」的必答题。
 * 哪天有人把这里改回 `PERCENT`，那个理由才重新成立。
 *
 * ## ① 同步、② 异步 —— 这个不对称是故意的
 *
 * ① 是「我们写 → 我们立刻读」，读写是同一个原生槽位，同步成立（第 ⑨ 组同理）。
 * ② 是「**引擎**自己把敏捷重算到派生槽位上」，**不能假设它对 `SetHeroAgi` 是同步反应**
 * （探针那轮是 `SetHeroAgi` 之后等 2 秒才读 0x51 的）。所以 ② 只标脏、然后放手，
 * 让 `StatSystem` 那 0.1s 的冲刷拍自己去折 —— 顺带比手动 `flush()` 更接近生产路径。
 *
 * 等待的 0.3s 里那台定时器会跑三四拍，所以「原生只涨了 0.2」这一条同时也就验了
 * **不双计**（双计的话会涨成 0.4 / 0.6），不必再单开一条。
 *
 * ⚠️ 本组**不再**是链尾：⑪ 接在它后面。下面三个出口都改成调 `testCouplingOrder()`，
 * `reportTotal()` 由 ⑪ 收（每个出口自己调一次）—— 在这里打会漏掉 ⑪ 那几条。
 */
function testAttackSpeed(): void {
  const actor = pickHeroActor();
  if (actor === undefined) {
    log.warn("--- 第 ⑩ 组（攻速）跳过：场上找不到英雄 ---");
    testCouplingOrder();
    return;
  }

  const u = actor.handle;
  const sheet = actor.statSheet;
  // ⚠️ 两个 `AS` 别混：`AS_STAT` 是属性表的下标，`AS_STATE` 是原生 `unitstate` 常量
  const AS_STAT = StatType.ATTACK_SPEED;
  const AS_STATE = UNIT_STATE_ATTACK_SPEED;
  const KEY = "selftest:attack_speed";

  // ⚠️ `src0` 必须在挂本组那条来源**之前**取 —— 取晚了（挂完再取）末尾的
  // 「摘干净」就会拿「+1」去比「0」，恒红一条。第 ⑨ 组也是这么取的。
  const src0 = sheet.sourceCount();

  // 先空拍一次：把「引擎攒下、还没折进来」的那部分先落定（英雄可能刚升过级，
  // 而升级自己标不了脏就不折 —— 见 `flush()` 的早退）。
  sheet.setSource(KEY, []);
  sheet.flush();

  const baseBefore = sheet.getBase(AS_STAT);
  const agi0 = GetHeroAgi(u, false);

  check("攻速：前置（base 与原生同步）", baseBefore, GetUnitState(u, AS_STATE));

  // ---- ① 来源落到原生（同步） ----
  // 用 `FLAT` 而不是 `PERCENT`：加攻速的来源**只有**这一种写法（见 `types.ts` 的 ⚠️ 段
  // 与 `hasteGlove.ts`）—— 魔兽的攻速加成是加进 `1 + 0.02×敏捷 + Σ加成` 那个区，
  // 乘在 base 上不是原生语义。本组验的是接线通不通，两种写法都能通，
  // 但**不能**在仓库里留一个会被照抄的反例。
  sheet.setSource(KEY, [mod(AS_STAT, StatModKind.FLAT, 0.5)]);
  sheet.flush();
  check("攻速：+0.5 倍率落到原生", baseBefore + 0.5, GetUnitState(u, AS_STATE));

  sheet.removeSource(KEY);
  sheet.flush();
  check("攻速：摘掉来源后原生归位", baseBefore, GetUnitState(u, AS_STATE));

  // ---- ② 敏捷成长不被写回抹掉（异步：交给冲刷拍） ----
  const nativeBefore = GetUnitState(u, AS_STATE);

  SetHeroAgi(u, agi0 + 10, true); // 引擎侧：模拟升级
  sheet.setSource(KEY, []); // 只标脏，不手动 flush

  scheduler.defer(WRITEBACK_WAIT, () => {
    if (!stillValid(u)) {
      checkBool("攻速：0.3s 后英雄仍存活", true, false);
      testCouplingOrder();
      return;
    }
    check("攻速：敏捷 +10 的 0.2 被吸收，原生没被抹掉", nativeBefore + 0.2, GetUnitState(u, AS_STATE));
    check("攻速：base 吸收了 +0.2", baseBefore + 0.2, sheet.getBase(AS_STAT));
    check("攻速：final 与原生自洽", GetUnitState(u, AS_STATE), sheet.getFinal(AS_STAT));

    // 撤销外部写入 → 再等一拍（这一侧同样是引擎在动）→ 不该留残留
    SetHeroAgi(u, agi0, true);
    sheet.setSource(KEY, []);

    scheduler.defer(WRITEBACK_WAIT, () => {
      sheet.removeSource(KEY);
      check("攻速：撤销后原生归位", nativeBefore, GetUnitState(u, AS_STATE));
      check("攻速：撤销后 base 归位（无残留）", baseBefore, sheet.getBase(AS_STAT));
      check("攻速：本组来源已摘干净", src0, sheet.sourceCount());
      testCouplingOrder();
    });
  });
}

// ==================== ⑪ 写回顺序（同拍改三围 + 派生槽位） ====================

/**
 * 等**引擎自己的帧** —— 比 `WRITEBACK_WAIT` 宽得多。
 *
 * `WRITEBACK_WAIT` 等的是我们自己的 0.1s 冲刷拍；本组等的却是「引擎把敏捷重算到
 * 护甲上」这件事，而它可能滞后于我们那次写入（探针那轮对攻速就是 `SetHeroAgi`
 * 之后**等 2 秒**才读）。给足余量，否则「引擎慢」会被误读成「引擎那份丢了」。
 */
const ENGINE_SETTLE_WAIT = 1.0;

/**
 * 本组往护甲上加的那一点。
 *
 * **它不是陪衬**：写回循环只在 `final !== lastSynced` 时才写，护甲的 `final` 不变就
 * 根本不会写，也就盖不掉引擎那份 —— 这条差值正是用来触发「同一拍写护甲」的。
 */
const COUPLING_ARMOR_GAIN = 1;

/** 本组往敏捷上加的点数。引擎那份约 `0.3×10 = 3`，和上面那 1 点拉开距离 */
const COUPLING_AGI_GAIN = 10;

/**
 * 判据阈值：原生护甲涨过这个数才算「引擎那份还在」。
 *
 * 两个候选值 —— 只有我们那份（`1`）与含引擎那份（约 `1 + 3 = 4`）—— 相隔 3.0，
 * 取 2.0 两边都有大余量。**不硬编码 `0.3`**：实测值打进日志，万一系数不是 0.3
 * 看数字就知道（那时判据要重订）。
 */
const COUPLING_ENGINE_KEPT = 2.0;

/**
 * 第 ⑪ 组：**同一拍里既改三围、又改一个由三围派生的槽位**时，引擎因三围变化叠上去的
 * 那份会不会被我们紧随的写回盖掉。
 *
 * ## 为什么这条要单独测
 *
 * `flush()` 按下标升序写，于是 `AGILITY(6)` 先于 `ARMOR(11)`。「敏捷 +1 → 护甲 +0.3」
 * 是常识、也早实测过（`DRIFT_SLOTS` 表里那句「偏高值 58.5 后敏捷 +10 读 61.5」），
 * **但引擎在什么时刻把这份加上去，没人量过**：
 *
 *   - 若在 `SetHeroAgi` 那一次调用里**当场**就加 → 我们紧接着写护甲的那一笔会把它盖掉，
 *     而 `lastSynced` 记的正是我们写进去的值（**不是漂移**）→ 下一拍的折算也看不见
 *     → **永久丢失**。
 *   - 若引擎等自己下一帧才算 → 同拍写护甲时它还没加，它加的时候是叠在我们写的值上
 *     → **顺序根本无所谓，这条就是空测**。
 *
 * `todo_next.md` 里那条是**推断**出来的，没实测校正过（原文自己还标着「⚠️ 这条原先的
 * 『修法』写反了」）。所以先测：**红 = 确认存在，绿 = 推翻那条推断**。
 *
 * ## 为什么两个 `setSource` 之间不能有 `flush()`
 *
 * `StatSystem` 是 0.1s 定时器，同步块内插不进来。中间只要冲一次，两者就落到两拍上，
 * 这条就白测了。下面那条前置断言就是在钉死这一点。
 *
 * ## 与本组无关的一条已知性质
 *
 * 「只改三围」的那一拍**不会**写派生槽位（`final === lastSynced`），引擎那份会作为漂移
 * 在下一拍被 `foldNativeDrift()` 折回 —— 所以**普通升级路径本来就是安全的**，这一组
 * 覆盖的是更窄的那一种：同一拍里两者都变。
 *
 * ⚠️ 本组是**链尾**：`reportTotal()` 由它收尾（每个出口都要调）。
 */
function testCouplingOrder(): void {
  const actor = pickHeroActor();
  if (actor === undefined) {
    log.warn("--- 第 ⑪ 组（写回顺序）跳过：场上找不到英雄 ---");
    reportTotal();
    return;
  }

  const u = actor.handle;
  const sheet = actor.statSheet;
  const AGI_STAT = StatType.AGILITY;
  const ARM_STAT = StatType.ARMOR;
  const KEY_AGI = "selftest:coupling_agi";
  const KEY_ARM = "selftest:coupling_armor";
  /** 清场阶段用来反复标脏的空来源（本身不加任何东西） */
  const KEY_DIRTY = "selftest:coupling_dirty";

  // ⚠️ `src0` 必须在挂本组任何来源**之前**取（第 ⑨/⑩ 组同理，取晚了末尾恒红一条）。
  const src0 = sheet.sourceCount();
  const agi0 = GetHeroAgi(u, false);

  // 先空拍一次：⑩ 结尾那次 `removeSource` 的 fold/写回还没发生就同步进了本组。
  sheet.setSource(KEY_AGI, []);
  sheet.setSource(KEY_ARM, []);
  sheet.flush();

  const armor0 = GetUnitState(u, UNIT_STATE_DEFEND_WHITE);
  check("写回顺序：前置（表与原生自洽）", armor0, sheet.getFinal(ARM_STAT));

  // ---- 同一拍里同时改三围和派生槽位 ----
  sheet.setSource(KEY_AGI, [mod(AGI_STAT, StatModKind.FLAT, COUPLING_AGI_GAIN)]);
  sheet.setSource(KEY_ARM, [mod(ARM_STAT, StatModKind.FLAT, COUPLING_ARMOR_GAIN)]);

  // 前置：来源真的改了 `final`。不成立的话敏捷那一笔根本不会写，「同一拍」就是空的，
  // 这条会**静默变成空测** —— 所以必须报红，不能放过去。
  check(
    "写回顺序：前置（来源确实抬了 final）",
    COUPLING_AGI_GAIN,
    sheet.getFinal(AGI_STAT) - sheet.getBase(AGI_STAT)
  );

  scheduler.defer(WRITEBACK_WAIT, () => {
    if (!stillValid(u)) {
      checkBool("写回顺序：0.3s 后英雄仍存活", true, false);
      reportTotal();
      return;
    }
    // 0.3s 处先看一眼它在不在动 —— 读数是给「引擎慢 / 引擎快」留现场证据的
    log.info(
      "写回顺序：0.3s 处护甲涨了 " +
        (GetUnitState(u, UNIT_STATE_DEFEND_WHITE) - armor0).toFixed(3)
    );

    scheduler.defer(ENGINE_SETTLE_WAIT, () => {
      if (!stillValid(u)) {
        checkBool("写回顺序：1.3s 后英雄仍存活", true, false);
        reportTotal();
        return;
      }

      const grown = GetUnitState(u, UNIT_STATE_DEFEND_WHITE) - armor0;
      // 实测值打进日志 —— 万一引擎那条系数不是 0.3，看这个数就知道判据要不要重订
      log.info(
        "写回顺序：1.3s 处护甲共涨 " +
          grown.toFixed(3) +
          "（我们加的是 " +
          COUPLING_ARMOR_GAIN +
          "，引擎那份约 " +
          (COUPLING_AGI_GAIN * 0.3).toFixed(1) +
          "、被盖掉则是 0）"
      );
      checkBool("写回顺序：同拍写三围+护甲，引擎那份没被盖掉", true, grown > COUPLING_ENGINE_KEPT);

      // ---- 清场（一）----
      // 摘掉两条来源后再等一拍，让「引擎那份」的去向在原生与 `base` 上都定下来。
      // **不能在这里就把原生护甲硬拉回基线** —— `lastSynced` 这时还停在本组写进去的
      // 值上，硬拉早了会被折成一次假漂移（差额被当成引擎改的，折进 base）。
      sheet.removeSource(KEY_AGI);
      sheet.removeSource(KEY_ARM);
      sheet.setSource(KEY_DIRTY, []);

      scheduler.defer(WRITEBACK_WAIT, () => {
        check("写回顺序：清场后敏捷归位", agi0, GetHeroAgi(u, false));

        // ---- 清场（二）----
        // 本组会在护甲上留下一点残留（引擎那份被折进 `base` 之后，敏捷一还原就找不回来
        // 了 —— 那正是本组要观察的现象本身）。硬拉回基线，下一拍折算把 `base` 一起带回来：
        // 硬拉后的原生与 `lastSynced` 不同 → 差额被折进 base → final 跟着写回去。
        SetUnitState(u, UNIT_STATE_DEFEND_WHITE, armor0);
        sheet.setSource(KEY_DIRTY, []);

        scheduler.defer(WRITEBACK_WAIT, () => {
          check("写回顺序：清场后原生护甲归位", armor0, GetUnitState(u, UNIT_STATE_DEFEND_WHITE));
          check("写回顺序：清场后 base 也无残留", armor0, sheet.getBase(ARM_STAT));
          sheet.removeSource(KEY_DIRTY);
          check("写回顺序：本组来源已摘干净", src0, sheet.sourceCount());
          reportTotal();
        });
      });
    });
  });
}
