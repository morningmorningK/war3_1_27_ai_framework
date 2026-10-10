/**
 * 属性系统的类型层：属性 id、元素表、修正器、钳制规则。
 *
 * ## 两条硬约束
 *
 * 1. **属性 id 必须连续**（`0..STAT_COUNT-1`）。
 *    `StatSheet` 的 base / final / lastSynced 是按下标直取的密集数组，
 *    而 Lua 里带洞数组的 `.length` 是 **0**（见 memory `wc3-tstl-sparse-array-length`）。
 *    新属性只允许**追加到块尾**，块基址一律由 `SCALAR_STAT_COUNT` / `ELEMENT_COUNT` 推导。
 *
 * 2. **「本身就是百分比」的属性，base 恒为 0，来源要用 `FLAT` 加百分点。**
 *    暴击率、冷却缩减、韧性、免伤、擢升、穿透、吸血……这些都是 0~1 的系数，
 *    它们的 base 是 0。而 `PERCENT` 的定义是「乘在 base 上」（见 `StatSheet` 的公式），
 *    乘 0 永远是 0 —— 写 `PERCENT +0.1` 想加 10% 冷却缩减**不会有任何效果**。
 *    正确写法是 `FLAT +0.1`；想做成独立乘区就用 `MULTIPLIER +0.1`。
 *
 *    只有「有白值的属性」（生命上限、攻击力、护甲、三围……）才谈得上 `PERCENT`。
 */

/** 属性 id。用数字而非字符串 —— 真值表要按下标直取，字符串键还得过一遍哈希 */
export type StatId = number;

// ==================== 标量块（连续 0..26）====================

/**
 * 属性表。**值就是数组下标，不要重排**（重排会让存档/配置里的旧 id 全部错位）。
 * 注释里的「原生」表示这一步会写回魔兽原生 API，见 `StatSheet.writeNative`。
 */
export const StatType = {
  // ---- 生存 / 资源 ----
  LEVEL: 0, //          只读（原生 GetUnitLevel），不可加成
  LIFE: 1, //           当前生命。运行时状态，不参与修正器，getFinal 直接透传原生
  MAX_LIFE: 2, //       生命上限（原生）
  MANA: 3, //           当前魔法。同 LIFE
  MAX_MANA: 4, //       魔法上限（原生）

  // ---- 三围（原生，仅英雄）----
  STRENGTH: 5,
  AGILITY: 6,
  INTELLIGENCE: 7,

  // ---- 基础战斗 ----
  BASE_ATTACK: 8, //    白字基础攻击（原生 UNIT_STATE_ATTACK_WHITE）。`%攻击力` 作用在这一层
  BONUS_ATTACK: 9, //   绿字加成攻击（原生 UNIT_STATE_ATTACK_BONUS）。装备的固定攻击力落这一层
  ATTACK_SPEED: 10, //  攻速**倍率**（1.0 = 100%），原生可读写；加成一律用 FLAT，见下面 ⚠️
  ARMOR: 11, //         护甲（原生）
  HP_REGEN: 12, //      每秒生命回复（原生，走 JAPI 的 DzSetUnitLifeRegen）
  MP_REGEN: 13, //      每秒魔法回复（原生，走 JAPI 的 DzSetUnitManaRegen）

  // ---- 元素（非七元素维度）----
  ELEMENTAL_MASTERY: 14, // 元素精通

  // ---- 高阶 ----
  CRIT_RATE: 15, //         暴击率。base=0，用 FLAT 加百分点；溢出 1:1 转暴伤（见 StatSheet.recalc）
  CRIT_DMG: 16, //          暴击伤害。base 通常是 0.5（即「暴击打 1.5 倍」）
  LIFESTEAL: 17, //         吸血率
  HEAL_BONUS: 18, //        治疗效果加成
  ARMOR_PEN: 19, //         护甲穿透
  ELEMENTAL_PEN: 20, //     元素穿透
  SHIELD_STRENGTH: 21, //   护盾强效
  MOVE_SPEED: 22, //        移动速度（原生）
  COOLDOWN_REDUCTION: 23, // 冷却缩减，上限 0.5
  TENACITY: 24, //          韧性 0~1，=1 免疫控制
  DAMAGE_AMPLIFY: 25, //    伤害擢升：所有来源伤害的全局增伤乘区
  DAMAGE_REDUCTION: 26, //  免伤率：全局减伤乘区，上限 0.8
} as const;

/**
 * ⚠️ **`ATTACK_SPEED` 是「倍率」，不是「每秒攻击次数」—— 而且它是可以写回去的。**
 *
 * 2026-10-06 实测（memory `wc3-unit-state-japi-write`）：
 *
 * | 单位 | `GetUnitState(u, 0x51)` | `0x25`（基础攻击间隔，秒） |
 * |---|---|---|
 * | 步兵 hfoo | **1.000** | 1.350 |
 * | 圣骑士 Hpal | **1.260** = `1 + 13 敏捷 × 0.02` | 2.200 |
 *
 * 步兵间隔 1.35s ⇒ 若是「次/秒」应读 0.74，实测却是 1.000 整 —— 那是**没有任何
 * 加速的出厂倍率**。实际频率 = `0x51 / 0x25`。
 *
 * 写：`SetUnitState(u, UNIT_STATE_ATTACK_SPEED, v)`（`0x51`）。**验证过**：
 * 写 2.52 读回 2.52、撑过 6 秒没被冲、游戏里出手肉眼可见变快。
 * KKWE 的触发器动作「设置单位属性 [R]」就是这一句（`ydwe/action.txt` 的
 * `[SetUnitState]`）。wc3ts 的 `setUnitAttackSpeedJAPI` 也是它 —— 它那个形参名
 * `attacksPerSecond` 是错的。
 *
 * 另有一条更要紧的实测（2026-10-07 补全）：**引擎把写回值当初值、再按当前敏捷重算**
 * —— 存 `写值 − 0.02×敏捷`，读 `存的 + 0.02×敏捷`。写 2.520（敏捷 13）后敏捷涨到 23，
 * 读数变 2.720（+0.2）。**但「再写一次同一个值」会把那 0.2 永久抹掉**：写成偏离值
 * 3.700 后敏捷 +10 读 3.900，再写一次 3.700 立刻读回 3.700，等 2 秒也没回来。
 * 而 `StatSheet` 是**每拍都在写回**的，所以这就是它的日常 —— 攻速 buff
 * **并不是**「不会被升级冲掉」，冲不冲掉全看写回那一拍折没折。
 *
 * ✅ **已接线（2026-10-07）**：`snapshotBaseFromNative` 快照、`writeNative` 有对应
 * case、并且它在 `DRIFT_SLOTS` 名单里。折算（`foldNativeDrift`）把引擎叠的 0.02/点
 * 抬进 base，我们写回去的才是「含敏捷成长」的值 —— 对攻速来说折算是**唯一的活路**，
 * 不是「折了更好」。非英雄实测可写、写后 2 秒稳定（步兵 1.500 → 1.500），
 * 所以**没有**加英雄守卫。回归见自测第 ⑩ 组。
 *
 * 面板上那一行仍然**直读原生 `0x51`**、不碰属性表（`StatPanelUI.attackSpeedText`），
 * 显示成 `x1.26` —— 显示那条路没有因为接线而改变。所以「显示得出来」和
 * 「能不能被来源改」是两件独立的事，现在两件都有了。
 *
 * ### ⚠️ 加攻速的来源一律用 `FLAT`，**不要**用 `PERCENT`
 *
 * 魔兽的攻速加成是**加法**进那个倍率的：
 *
 * ```
 *   0x51 = 1 + 0.02×敏捷 + Σ攻速加成
 * ```
 *
 * 敏捷 35 的英雄出厂 `0x51 = 1.70`，+30% 后是 **2.00**，不是 `1.70 × 1.3 = 2.21`。
 * 原生的「攻击速度增加」物编字段加的就是同一个加法区，所以多件加速装之间也相加。
 * 用 `PERCENT` 会变成 `base × (1 + 0.3)`，敏捷越高偏得越远 —— 那不是原生语义。
 * **与「base 有没有值」无关**：那个判据只回答「`FLAT` 会不会是空操作」，
 * 回答不了「该加还是该乘」。样板见 `relic/definitions/hasteGlove.ts`。
 */
export const SCALAR_STAT_COUNT = 27;

// ==================== 元素块 ====================

/**
 * 物理 + 七元素。**顺序即下标**，两块（伤害加成 / 抗性）共用同一套下标。
 *
 * `physical` 排 0 是有意的 —— 面板上「物理伤害加成」和七元素是并列的一行，
 * 有了它就不用为物理单开一个 StatType。
 */
export const ELEMENTS = ["physical", "fire", "water", "thunder", "ice", "wind", "rock", "grass"] as const;

export type ElementId = (typeof ELEMENTS)[number];

export const ELEMENT_COUNT = 8;

/** 元素名 → 下标。由 `ELEMENTS` 生成，不另抄一份表（抄了就会漂移） */
const ELEMENT_INDEX: Record<string, number> = {};
for (let i = 0; i < ELEMENTS.length; i++) {
  const name = ELEMENTS[i];
  if (name !== undefined) ELEMENT_INDEX[name] = i;
}

export function elementIndex(e: ElementId): number {
  const i = ELEMENT_INDEX[e];
  return i === undefined ? 0 : i;
}

/** 元素伤害加成块基址（27..34，含物理） */
export const ELEM_DMG_BASE = SCALAR_STAT_COUNT;
/** 元素抗性块基址（35..42，含物理） */
export const ELEM_RES_BASE = ELEM_DMG_BASE + ELEMENT_COUNT;
/**
 * 元素**易伤**块基址（43..50，含物理）—— 「**受到的**该元素伤害增加」的比例。
 *
 * ## 为什么必须单开一块，而不是拿抗性做负数
 *
 * `elemResistStat()` 那一格被 `effectiveElementResist()` 钳在 `[0,1]`：挂负数只能
 * 抵消目标已有的正抗性，**永远无法低于 0 产生增伤**。那个钳制是**刻意的**
 * （抗性穿透到负数不额外增伤），不能拆。
 * 而 `elemDamageStat()` 那一格是**攻方**属性 —— 挂在受击方身上不生效
 * （`DamagePipeline_isDefensiveStat` 不含它）。
 * `DAMAGE_REDUCTION` 又是全局单值、没有元素维度。三条路都堵死，所以新开一块。
 *
 * ## 语义
 *
 * ```
 * 最终伤害 ×= (1 + elemVulnStat(element))      // 只对非剧变段生效
 * ```
 *
 * ⚠️ **读的是受击方**（`DamagePipeline_isDefensiveStat` 必须把这一块算进去，
 * 否则会从**攻方**读 ⇒ 恒 0、静默无效）。
 *
 * ⚠️ **`clampFinal` 钳 ≥ 0**：负数易伤会变成「元素减伤」，与抗性语义重叠。
 * 要减伤请用 `elemResistStat`。
 */
export const ELEM_VULN_BASE = ELEM_RES_BASE + ELEMENT_COUNT;
/** 属性总数。所有遍历都写 `for (i = 0; i < STAT_COUNT; i++)` */
export const STAT_COUNT = ELEM_VULN_BASE + ELEMENT_COUNT;

/** 某元素的伤害加成属性 id。传 "physical" 就是物理伤害加成 */
export function elemDamageStat(e: ElementId): StatId {
  return ELEM_DMG_BASE + elementIndex(e);
}

/** 某元素的抗性属性 id */
export function elemResistStat(e: ElementId): StatId {
  return ELEM_RES_BASE + elementIndex(e);
}

/** 某元素的**易伤**属性 id（「受到的该元素伤害增加」）。读受击方 */
export function elemVulnStat(e: ElementId): StatId {
  return ELEM_VULN_BASE + elementIndex(e);
}

/**
 * 标量块的属性名。**顺序必须和上面的 `StatType` 逐项对齐** ——
 * 下标即属性 id，不另记键，这样加属性时只会在同一个地方改。
 */
const SCALAR_STAT_NAMES = [
  "LEVEL",
  "LIFE",
  "MAX_LIFE",
  "MANA",
  "MAX_MANA",
  "STRENGTH",
  "AGILITY",
  "INTELLIGENCE",
  "BASE_ATTACK",
  "BONUS_ATTACK",
  "ATTACK_SPEED",
  "ARMOR",
  "HP_REGEN",
  "MP_REGEN",
  "ELEMENTAL_MASTERY",
  "CRIT_RATE",
  "CRIT_DMG",
  "LIFESTEAL",
  "HEAL_BONUS",
  "ARMOR_PEN",
  "ELEMENTAL_PEN",
  "SHIELD_STRENGTH",
  "MOVE_SPEED",
  "COOLDOWN_REDUCTION",
  "TENACITY",
  "DAMAGE_AMPLIFY",
  "DAMAGE_REDUCTION",
];

/** 属性 id → 可读名字。只给日志和调试用，不参与计算 */
export function statName(stat: StatId): string {
  if (stat >= ELEM_DMG_BASE && stat < ELEM_RES_BASE) {
    return `${elemName(stat - ELEM_DMG_BASE)}_dmg`;
  }
  // ⚠️ 上界必须是 `ELEM_VULN_BASE` 而**不是** `STAT_COUNT` —— 用后者的话
  // 易伤那 8 格（43..50）会被当成抗性，日志里显示成 `thunder_res`。
  // 加属性块时这条边界要跟着块走，它是唯一一处靠下标区间判断的地方。
  if (stat >= ELEM_RES_BASE && stat < ELEM_VULN_BASE) {
    return `${elemName(stat - ELEM_RES_BASE)}_res`;
  }
  if (stat >= ELEM_VULN_BASE && stat < STAT_COUNT) {
    return `${elemName(stat - ELEM_VULN_BASE)}_vuln`;
  }
  const n = SCALAR_STAT_NAMES[stat];
  return n === undefined ? `STAT_${stat}` : n;
}

function elemName(index: number): string {
  const n = ELEMENTS[index];
  return n === undefined ? `elem${index}` : n;
}

// ==================== 修正器 ====================

/**
 * 修正器的三种作用方式。
 *
 * 公式（见 `StatSheet.recalc`）：
 * ```
 * raw = (base * (1 + ΣPERCENT) + ΣFLAT) * Π(1 + MULTIPLIER)
 * ```
 */
export const StatModKind = {
  /** 固定值加成。**百分比型属性（暴击率/CDR/韧性…）也用这个来加「百分点」** —— 见文件头约束 2 */
  FLAT: 0,
  /** 百分比加成，**只乘 base**（不是 base+flat）。对标「装备：攻击力+20%」这类词条 */
  PERCENT: 1,
  /** 独立乘区，最后的 `Π(1+value)`。用于「伤害擢升」这类与其他加成解耦的乘区 */
  MULTIPLIER: 2,
} as const;

/** 修正器的来源大类。用于调试归类、将来的「同类只取最高」规则 */
export const StatSourceKind = {
  BASE: "base",
  EQUIPMENT: "equipment",
  RELIC: "relic",
  BUFF: "buff",
  TALENT: "talent",
  AURA: "aura",
  SYSTEM: "system",
} as const;

export type StatSourceKindValue = (typeof StatSourceKind)[keyof typeof StatSourceKind];

/**
 * 一条属性修正器的**内容**：加什么属性、怎么加、加多少。
 *
 * 这是修正器提供者（`Buff.getStatModifiers()` / `RelicDefinition.getStatModifiers()`）
 * 要写的部分。他俩都不知道自己该归到哪个来源大类、自己的实例 id 是多少 ——
 * 那是挂载方（`BuffManager` / `RelicSystem`）才知道的事，由它补齐成 `StatModifier`。
 */
export interface StatMod {
  stat: StatId;
  /** `StatModKind` 之一 */
  kind: number;
  value: number;
}

/**
 * 一条**完整**的属性修正器 = 内容 + 来源标记。这是 `StatSheet.setSource()` 收的东西。
 *
 * 修正器**不自己登记在自己身上**，而是被 `setSource(key, mods[])` 按来源整体挂载
 * —— 摘除就是一句 `removeSource(key)`，不管这条来源贡献了几条修正器、几个属性。
 * 这是「漏摘 = 永久属性残留」的结构性防线。
 */
export interface StatModifier extends StatMod {
  sourceKind: StatSourceKindValue;
  /** 来源实例标识，参与拼 `sourceKey`（如 relic id / buff 实例 id / 装备 uid） */
  sourceId: string;
}

/**
 * 把修正器内容补齐成完整修正器。挂载方用它批量组装。
 *
 * 补的是 `sourceKind` / `sourceId` 两个「提供者填不了、也不该填」的字段 ——
 * 一个 buff 的修正器必然是 BUFF 类、必然属于那个 buff 实例，没有第二种答案。
 */
export function toStatModifier(
  m: StatMod,
  sourceKind: StatSourceKindValue,
  sourceId: string
): StatModifier {
  return { stat: m.stat, kind: m.kind, value: m.value, sourceKind, sourceId };
}

// ==================== 钳制 ====================

function clampRange(v: number, lo: number, hi: number): number {
  if (v < lo) return lo;
  if (v > hi) return hi;
  return v;
}

/**
 * 单属性上限 / 下限。**在 `StatSheet.recalc()` 里统一调用一次**，查询时不再钳 ——
 * 查询点很多（面板、伤害管线、技能），任何一处忘钳制就是 bug；缓存一次、查询即读。
 *
 * ⚠️ `CRIT_RATE` 的**上限不在这里**：暴击率溢出要 1:1 转成暴伤，而那必须读钳制前的原始值。
 * 那一步在 `StatSheet.recalc()` 里单独做，这里只管它的下限。
 */
export function clampFinal(stat: StatId, v: number): number {
  // 元素易伤块：钳 ≥ 0。负数易伤会变成「元素减伤」，与 `elemResistStat` 的语义
  // 重叠 —— 要减伤请用抗性那一格。区间判断而不是 `case`：这一块是 8 个连续 id。
  if (stat >= ELEM_VULN_BASE && stat < STAT_COUNT) {
    return v < 0 ? 0 : v;
  }
  switch (stat) {
    case StatType.COOLDOWN_REDUCTION:
      return clampRange(v, 0, 0.5); // 冷却缩减最高 50%
    case StatType.DAMAGE_REDUCTION:
      return clampRange(v, 0, 0.8); // 免伤最高 80%
    case StatType.TENACITY:
      return clampRange(v, 0, 1); // 韧性 0~1，=1 霸体
    case StatType.CRIT_RATE:
      return clampRange(v, 0, 1); // 上限由溢出变换负责，这里只兜底
    case StatType.CRIT_DMG:
    case StatType.LIFESTEAL:
    case StatType.ARMOR_PEN:
    case StatType.ELEMENTAL_PEN:
    case StatType.SHIELD_STRENGTH:
    case StatType.DAMAGE_AMPLIFY:
      return v < 0 ? 0 : v;
    case StatType.HEAL_BONUS:
      return v < -1 ? -1 : v; // 治疗可以被削到 0 收益（-100%），但不该变成负数治疗
    case StatType.MOVE_SPEED:
      // 移速下限 0。「禁锢」是用 `MULTIPLIER = -1` 做的（乘区归零，见
      // `ControlBuffs.ts`），而 `MULTIPLIER` 是累乘的 —— 写 -1 两次得到
      // `0 * 0 = 0` 没问题，但**任何 `< -1` 的值都会算出负移速**，喂给
      // `SetUnitMoveSpeed` 的行为无保证。钳在这里同时也是把「禁锢 = 移速归零」
      // 钉成**显式**语义，而不是依赖乘法恰好得 0。
      return v < 0 ? 0 : v;
    default:
      return v;
  }
}

// ==================== 事件 ====================

/**
 * 属性变化事件。走 `eventBus`（`BuffManager` / `RelicSystem` 用的也是它），
 * 不是 `gameEvents` —— 后者是引擎级的单位事件管理器（伤害、死亡），属性变化是系统内部事件。
 *
 * **合并发射**：不是每次 `setSource` 都发，而是 `StatSheet.flush()` 里比较
 * final 与 lastSynced 确有差异时才为该单位发一次。无变化的修改**不发**，
 * 否则将来属性面板会被每拍重绘。
 */
export const STAT_EVENT_CHANGED = "stat:changed";

/**
 * `StatSheet` 的宿主。生产环境里就是一个 `Actor`（`Actor` 结构上满足这个形状）。
 *
 * 之所以声明成一个最小接口而不是直接 `import type { Actor }`：
 *   - 自测可以塞一个假宿主进来，不必真的造一个魔兽单位；
 *   - 彻底避开 `stat/ → actor` 的 import 环。
 *
 * `handle` 是可选的 —— 自测的假宿主不给它，`StatSheet.writeNative` 会整体跳过，
 * 且 `StatSystem.markDirty` 也会因为「没有原生可写」而不收它进脏集合。
 */
export interface StatSheetHost {
  readonly id: number;
  readonly handle?: unit;
}

/**
 * 暴击伤害的默认值。`CRIT_DMG` 是「暴击打多少倍」里的**增量** ——
 * 0.5 表示暴击打 1.5 倍（伤害 ×(1 + 0.5)）。它不是装备给的，是角色的出厂值，
 * 所以由 `snapshotBaseFromNative` 直接铺进 base，而不是挂一条来源。
 */
export const DEFAULT_CRIT_DMG = 0.5;

export interface StatChangedPayload {
  /** 生产环境里这就是那个 `Actor` */
  actor: StatSheetHost;
  /**
   * 本次真正发生变化的属性 id 列表（密集数组，`push` 生成）。
   *
   * ⚠️ **顺序 = `StatSheet` 的 `WRITE_ORDER`，不是属性 id 升序**（三围排在最后，
   * 因为引擎的三围派生是就地叠加的增量，必须先写派生槽位）。**订阅者不得依赖顺序** ——
   * 只用 `indexOf`/遍历判定「有没有变」，别拿 `changed[0]` 当「最重要的那个」。
   */
  changed: StatId[];
}
