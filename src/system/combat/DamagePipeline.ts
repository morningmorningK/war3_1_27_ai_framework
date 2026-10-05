/**
 * 伤害接管层。以 `DAMAGE_PIPELINE_PRIORITY`(100) 订阅 `UNIT_DAMAGED`，全场最先跑。
 *
 * ## 完整形态（Step 3 打开之后）
 *
 * ```
 * 读原生元数据 → 置 0 → 自算 → 写回最终值
 * ```
 *
 * 四步**必须在同一个 100 层的回调内**完成，不能拆：
 * 拆了的话 `ShieldSystem(10)` 会吸到原生命中值、`DamageNumberDisplay(0)` 会飘错数。
 *
 * ## 当前状态：**Step 5 —— 遗物战斗钩子**
 *
 * - 物理段：`base = nativeDamage × armorCorrectionRatio(护甲, 穿透)`，
 *   **只替换引擎算好的护甲那一项**（路线详见 `ElementalDamage.ts` 文件头）。
 *   `ARMOR_PEN = 0` 时比值恰好为 1，物理段**逐位等于原生值**。
 * - 元素段：遍历攻击方的遗物，逐个调 `onDealDamage`，由它通过 `deal.add()`
 *   声明「加哪一段」。Step 4 那个 `DEBUG_FIRE_ON_ATTACK` 临时开关已删 ——
 *   现在由 `elementalEmber` 这件真遗物驱动。
 * - 非物理伤害（技能等）：**原样放行**，理由见 `DamagePipeline_compute()`。
 *
 * ## 为什么不取整
 *
 * 计划里写的是 `max(0, round(final))`，这里刻意不取整 —— 两条理由：
 *   1. `ARMOR_PEN = 0` 时物理段逐位等于 `nativeDamage`，一取整就漂最多 0.5，
 *      Step 4 与 Step 3 的对照就不再是「逐位相同」，等于自己给自己放宽验收。
 *   2. 魔兽的 HP 本来就是浮点，引擎自己写的就是 `45.4545` 这种数。
 *      取整是**展示**问题，归 `DamageNumberDisplay` 管。
 *
 * 地基已经被 Step 0 的探针实测钉死了（memory `wc3-damage-event-semantics`）：
 *
 * | 事实 | 实测 |
 * |---|---|
 * | `GetEventDamage()` 是减护甲**后**的值 | 护甲 2 → 89.2857，护甲 20 → 45.4545，与公式吻合到小数 6 位 |
 * | `EXSetEventDamage(x)` 返回 `true` 且**权威** | 写 100 → 掉 100.0，写 1000 → 掉 1000.0 |
 * | 写回值**不再过护甲** | 护甲 20 的靶写 100 照样掉 100.0 |
 *
 * 后两条合起来就是**判定结果 A**：直接覆盖最终值即可，**不需要**「置 0 + 重造」，
 * 因此**不需要任何重入守卫**。
 *
 * ⚠️ 但重入是真实存在的：探针实测在伤害回调里调 `UnitDamageTarget` 会**同步重入**，
 * 嵌套深度能到 4。本轮绕开了（主设计不调它），**元素反应阶段若要用它造连锁伤害，
 * 必须回来补守卫**。
 */

import { Actor } from "src/system/actor";
import { ELEMENT_COUNT, ELEM_RES_BASE, ElementId, StatId, StatSheet, StatType } from "src/system/stat";
// ⚠️ **直连文件，不走 `src/system/relic` 那个 barrel。** barrel 会连带拉进
// `registerDefaultContent` → 全部遗物定义 → `elementalEmber` → `combat`，
// 与本文件形成运行时的环。`RelicSystem.ts` 自己只依赖 actor / event / stat，不摸 combat。
import { RelicSystem } from "src/system/relic/RelicSystem";
import type { RelicInventoryItem } from "src/system/relic/types";
import { GameEventHandler, gameEvents } from "src/system/event";
import { UnitDamageEventData } from "src/system/event/GameEvent";
import { UNIT_STATE_DEFEND_WHITE } from "src/constants/game/units";
import { createLogger } from "src/utils/logger";
import { DAMAGE_PIPELINE_PRIORITY } from "./damageConstants";
import {
  captureDamageContext,
  DamageContext,
  DamageDealer,
  rememberDamageContext,
  sumHits,
} from "./DamageContext";
import {
  DamageCalcStats,
  armorCorrectionRatio,
  dealRaw,
  effectiveElementResist,
} from "./ElementalDamage";

const log = createLogger("DamagePipeline");

/**
 * 逐次伤害日志开关。**默认关闭** —— 每次伤害三行，场上多打几发就是纯刷屏。
 *
 * 阶段 B 逐步骤验时它一直开着，因为每一步的通过标准恰好就是日志里某一行：
 *
 * | 步骤 | 验收标准 | 看哪行 |
 * |---|---|---|
 * | Step 1 | 七个原生槽位在**真实平A**下的读数 | `attType=… dmgType=… wpnType=…` |
 * | Step 3 | 写回值 == 原生值 | `原生=… 写回=…` |
 * | Step 4/5 | 扣血 = 物理 + 元素 | `段: physical … + fire …` |
 * | Step 6 | 真物品拾取/丢弃后仍是上面两条 | 同上 |
 *
 * **现在恒为 `false`** —— Step 6 的数值验收已过，Step 7 那轮「暴击骰子只吐 0/1」
 * 的排查也已定位（真凶是 `Math.random()`，见 `compute()` 里那段）。要再排查数值
 * 问题时把它打开即可 —— 注意它与 `TAKEOVER_ENABLED` 无关：关了日志，接管照常进行，
 * 只是不再逐条打印。
 */
const LOG_EVERY_DAMAGE = false;

/**
 * 接管总开关。**Step 1/2 是 `false`（纯只读），Step 3 起 `true`**。
 *
 * 保留这个开关而不是直接删掉的原因：Step 4 出问题时，把它拨回 `false`
 * 就能一秒退回「原生伤害原样落地、我们只旁观」，用来把问题**隔离在
 * 「接管」还是「我们的公式」**这两侧 —— 一次只改一个变量。
 */
const TAKEOVER_ENABLED = true;

/**
 * 这个数能不能安全地写给引擎。
 *
 * 不直接用 `isFinite` —— tstl 对它的映射没验证过，而这里恰恰是最不该赌的地方。
 * NaN 是唯一不等于自己的值；±Infinity 用区间挡（1e15 远高于任何真实伤害，
 * 又远低于 Lua 双精度的上限）。
 */
function isUsableDamage(v: number): boolean {
  return v === v && v > -1e15 && v < 1e15;
}

export class DamagePipeline {
  private static instance: DamagePipeline | undefined;

  /** 幂等守卫。热重载会重复调 `initialize()`，不能重复订阅 */
  private static bound = false;

  private constructor() {}

  public static getInstance(): DamagePipeline {
    if (DamagePipeline.instance === undefined) {
      DamagePipeline.instance = new DamagePipeline();
    }
    return DamagePipeline.instance;
  }

  /**
   * 挂上 100 层订阅。
   *
   * **位置必须在 `DamageSystem.getInstance().initialize()` 之后** ——
   * 原生 `EVENT_UNIT_DAMAGED` 触发器由那一处按单位注册，它还没跑起来的时候
   * 挂在这里也收不到任何事件。
   *
   * 调用方（`main.ts`）负责包 try/catch：`initialize()` 里没有 pcall，
   * 这里抛出去后面所有 system 的 init 都不会执行。
   */
  public initialize(): void {
    if (DamagePipeline.bound) {
      return;
    }
    DamagePipeline.bound = true;
    gameEvents.onUnitDamaged(DamagePipeline_onUnitDamaged, {
      priority: DAMAGE_PIPELINE_PRIORITY,
    });
    log.info(
      "伤害接管层已挂载（" +
        (TAKEOVER_ENABLED ? "Step 3 接管已打开" : "只读") +
        "，priority " +
        DAMAGE_PIPELINE_PRIORITY +
        "）"
    );
  }
}

/**
 * 订阅回调。
 *
 * 写成模块级函数而不是类的方法：`gameEvents.onUnitDamaged` 拿的是函数引用，
 * 绑方法每次都是新引用，将来要反注册会对不上。
 */
const DamagePipeline_onUnitDamaged: GameEventHandler<UnitDamageEventData> = (
  data: UnitDamageEventData
): void => {
  // 先挡悬垂句柄：伤害事件可能打在已经 detach 的单位上，
  // 那时 `statSheet` 会在死句柄上重建一张表（memory 风险清单 #11）。
  const target = data.Actor;
  if (target === undefined) {
    return;
  }

  // ⚠️ 顺序是**先抄后抹**。`captureDamageContext` 读的就是下面 `setEventDamage(0)`
  // 要抹掉的那个值（`GetEventDamage()`）；颠倒过来会读到干干净净的 0，
  // 而且不会报错 —— 表现为「全场伤害归零」，查起来极其费劲。
  const ctx = captureDamageContext(data);

  // 记进交接槽位，供优先级更低的 `DamageNumberDisplay(0)` 事后取用。
  // **放在 `settle()` 之前是刻意的** —— `ctx` 得先存在（所以只能在 capture 之后），
  // 但 `settle()` 里那句 `data.setEventDamage()` 是引擎副作用、可能抛；
  // 记在它前面，抛出去的时候槽位里至少还有一份完整的上下文。
  // 详情与「为什么不用 Map」见 `DamageContext.ts` 的槽位注释。
  rememberDamageContext(data, ctx);

  if (TAKEOVER_ENABLED) {
    DamagePipeline_settle(data, ctx);
  }

  if (LOG_EVERY_DAMAGE) {
    DamagePipeline_log(ctx);
  }
};

/**
 * 接管的核心三步：**置 0 → 自算 → 写回**。
 *
 * 三步必须在同一个回调内做完（见文件头）：拆到别的优先级去，
 * `ShieldSystem(10)` 会吸到原生命中值、`DamageNumberDisplay(0)` 会飘错数。
 */
function DamagePipeline_settle(data: UnitDamageEventData, ctx: DamageContext): void {
  // 1) 抹掉原生命中值。
  data.setEventDamage(0);

  // 2) 自算。**这里必须包 try/catch** —— 详情见 catch 里的注释。
  let final: number;
  try {
    final = DamagePipeline_compute(ctx);
  } catch (e) {
    final = ctx.nativeDamage;
    log.error(
      "自算伤害抛出异常，本发已退回原生值 " + ctx.nativeDamage + "：" + e
    );
  }

  // 兜底：自算返回 NaN / Infinity 时同样退回原生值。
  //
  // **没有这两道兜底会很难查**：伤害会停在上面那个 `setEventDamage(0)`，
  // 表现是「全场打不死人」，既没有报错、堆栈也不会指向这里。
  if (!isUsableDamage(final)) {
    log.error("自算伤害得到不可用的值 " + final + "，本发已退回原生值");
    final = ctx.nativeDamage;
  }
  if (!isUsableDamage(final)) {
    // 连原生值都是坏的 —— 只可能是引擎侧出了问题，那就干脆不打这一发，
    // 总好过把一个 NaN 写进血量里。
    log.error("原生伤害值本身不可用 " + final + "，本发伤害置 0");
    final = 0;
  }

  // 3) 写回。这一句之后，`data.damage` 与引擎侧的值都是我们算的了 ——
  //    下游的 ShieldSystem(10) / DamageNumberDisplay(0) 拿到的就是它。
  ctx.finalDamage = final;
  data.setEventDamage(final);
}

// ===========================================================================
// 结算
// ===========================================================================

/**
 * 自算。**Step 5：物理走「比例反算」，元素段由攻击方的遗物现查现调。**
 *
 * ## 全程不取整
 *
 * 计划里写的是 `max(0, round(final))`，这里**刻意不取整**，理由有两条：
 *
 *   1. **`ARMOR_PEN = 0` 时物理段逐位等于 `nativeDamage`**（`armorCorrectionRatio()`
 *      返回的比值恰好是 1）。一取整就漂掉最多 0.5，Step 4 与 Step 3 的对照
 *      就不再是「逐位相同」，白白给自己放宽了验收。
 *   2. 魔兽的 HP 本来就是浮点 —— 引擎自己写进去的就是 `45.4545` 这种数。
 *      取整是**展示**问题，归 `DamageNumberDisplay` 管。
 *
 * ## 非物理为什么原样放行
 *
 * 原生事件里**没有任何东西能告诉我们这是什么元素**。元素归属必须由施法者/遗物
 * 显式声明（那是 C/D 阶段的事）。凭空挑一个元素，只会造出「火球吃到了火伤加成」
 * 这种看着合理、实际毫无依据的行为 —— 不如老实当它是「未分类伤害」原样过。
 */
function DamagePipeline_compute(ctx: DamageContext): number {
  const stats = DamagePipeline_statsFor(ctx);

  // 一次命中只掷**一次**骰：同一发的物理段与元素段要么一起暴、要么一起不暴。
  // 每段各掷一次会让「这一刀到底暴没暴」变成一个没有答案的问题。
  //
  // ⚠️ **必须用 `GetRandomReal`，不能用 `Math.random()`。** 后者编译成 Lua 的
  // `math.random()`，而 KKWE 把这个内建换掉了 —— 实测它**不返回 [0,1) 的小数，
  // 只在 0 和 1 两个值之间跳**（探针日志：率=1.000 时骰恒为 0.000 或 1.000）。
  // 于是 `critRoll < critRate` 退化成「只有掷到 0 才暴」，**100% 暴击率也只有
  // 大概一半会暴**。这个坑 `src/examples/HeroUnitSkill.ts:54` 有人踩过并留了警告，
  // 但那条注释在另一个文件里，不会有人搜到 —— 捡回来钉在这里。
  // 换掉还有第二个理由：Lua 自己的 RNG 与魔兽不同步，联机时各客户端会掷出
  // 不同的骰 → 伤害对不上。
  const critRoll = GetRandomReal(0, 1);

  // 留给下面的日志用（`DamagePipeline_log` 在另一个作用域，拿不到这两个局部量）。
  // 每次伤害都是**同步的一条线**，不存在跨事件串号。
  // ⚠️ 跟着开关一起关：这两个变量唯一的读者是日志，日志不开时写它们就是每次伤害
  // 白写两个 upvalue。`DamagePipeline_log` 本身也是同一个开关挡着的（见回调那处）。
  if (LOG_EVERY_DAMAGE) {
    lastCritRate = stats.get(StatType.CRIT_RATE);
    lastCritRoll = critRoll;
  }

  if (ctx.isPhysical) {
    DamagePipeline_addPhysical(ctx, stats, critRoll);
  } else {
    ctx.hits.push({
      element: "physical",
      base: ctx.nativeDamage,
      amount: ctx.nativeDamage,
      isCrit: false,
      source: "native",
    });
  }

  DamagePipeline_runRelicHooks(ctx, stats, critRoll);

  return sumHits(ctx);
}

/**
 * 物理段：只把引擎算好的**护甲那一项**换成我们想要的。
 *
 * `ARMOR_PEN = 0` 时 `armorCorrectionRatio()` 返回的比值**恰好是 1**，
 * 于是这一段逐位等于 `nativeDamage` —— 这是整条路线敢用的底气。
 */
function DamagePipeline_addPhysical(
  ctx: DamageContext,
  stats: DamageCalcStats,
  critRoll: number
): void {
  const armor = DamagePipeline_targetArmor(ctx);
  const pen = stats.get(StatType.ARMOR_PEN);
  const base = ctx.nativeDamage * armorCorrectionRatio(armor, pen);

  const phys = dealRaw(
    {
      base,
      element: "physical",
      kind: "none",
      canCrit: true,
      critRoll,
      // ⚠️ 传 0，**不是** `effectiveArmorResist()` —— 护甲已经在上面那个比例里
      // 替换过了，这里再减一次就是双重削甲。
      effectiveResist: 0,
    },
    stats
  );
  ctx.hits.push({
    element: "physical",
    base: ctx.nativeDamage,
    amount: phys.amount,
    isCrit: phys.isCrit,
    source: "native",
  });
  // 整次命中的暴击标记：任意一段暴了就算这次暴了。Step 7 的飘字靠它上高亮色。
  ctx.isCrit = phys.isCrit;
}

// ===========================================================================
// 遗物钩子
// ===========================================================================

/**
 * 遍历攻击方身上的遗物，把 `onDealDamage` 逐个调一遍。
 *
 * **现查现调**（而不是让遗物在 `onAcquire` 里自己订阅事件）是这一层的核心决定，
 * 理由见 `RelicDefinition.onDealDamage` 的注释：叠层 / 摘除 / 死亡三个失败模式
 * 被结构性地消掉了。
 *
 * 钩子抛异常的兜底在 `DamagePipeline_settle()` 那一层 —— 这里不再包一层 try/catch。
 * 原因：`catch` 块会被 tstl 编成**内嵌函数**，而本函数里有个 `for` 循环，
 * 一旦循环体内出现 `catch`，`goto` 就会跨函数找 label（memory
 * `wc3-tstl-continue-in-catch`，症状是原生 MSVCP140 闪退）。
 * 「一个坏遗物连带整次结算退回原生值」是可接受的降级，不值得冒那个险。
 */
function DamagePipeline_runRelicHooks(
  ctx: DamageContext,
  stats: DamageCalcStats,
  critRoll: number
): void {
  const source = ctx.source;
  if (source === undefined) {
    return;
  }
  const rs = RelicSystem.getInstance();
  const relics = rs.getRelics(source);
  if (relics.length === 0) {
    return;
  }
  const deal = DamagePipeline_makeDealer(ctx, stats, critRoll);
  for (let i = 0; i < relics.length; i++) {
    const item = relics[i];
    if (item !== undefined) {
      DamagePipeline_runOneRelic(rs, source, item, ctx, deal);
    }
  }
}

/**
 * 调一件遗物的钩子。
 *
 * 拆成独立函数是为了**避开 `continue`**：循环体里若有 `catch` + `continue`，
 * tstl 会生成跨函数的 `goto`，整个 `.lua` 加载失败。用提前 `return` 最安全，
 * 而且不必为此牺牲可读性。
 */
function DamagePipeline_runOneRelic(
  rs: RelicSystem,
  actor: Actor,
  item: RelicInventoryItem,
  ctx: DamageContext,
  deal: DamageDealer
): void {
  const def = rs.getDefinition(item.id);
  if (def === undefined || def.onDealDamage === undefined) {
    return;
  }
  def.onDealDamage(actor, item.stacks, ctx, deal);
}

/**
 * 造一个 `DamageDealer` —— 遗物追加伤害的唯一入口。
 *
 * 它把「遗物说要加什么」翻译成「实际加多少」：元素加成、暴击、目标抗性、
 * 全局免伤都在这里经过 `dealRaw()` 统一结算。遗物那边传的只是**基数**。
 */
function DamagePipeline_makeDealer(
  ctx: DamageContext,
  stats: DamageCalcStats,
  critRoll: number
): DamageDealer {
  return {
    add: (element: ElementId, base: number, canCrit?: boolean): void => {
      const r = dealRaw(
        {
          base,
          element,
          // D 阶段的元素反应会在这里传 "amplify" / "transform"；本轮恒 "none"
          kind: "none",
          // 不传 = 能暴击。用 `!== false` 而不是 `?? true`：tstl 对 `??` 的支持
          // 在本仓库没验证过，而这里不值得赌。
          canCrit: canCrit !== false,
          critRoll,
          effectiveResist: effectiveElementResist(stats, element),
        },
        stats
      );
      ctx.hits.push({
        element,
        base,
        amount: r.amount,
        isCrit: r.isCrit,
        source: "relic",
      });
      if (r.isCrit) {
        ctx.isCrit = true;
      }
    },
  };
}

/** 受击方当前护甲。**必须是引擎此刻真的在用的那个值** —— 属性系统的 `ARMOR` 早已写回原生 */
function DamagePipeline_targetArmor(ctx: DamageContext): number {
  const t = ctx.target;
  if (t === undefined) {
    return 0;
  }
  return GetUnitState(t.handle, UNIT_STATE_DEFEND_WHITE);
}

/**
 * 这个属性该从**受击方**读还是**攻击方**读。
 *
 * 八个元素抗性 + 全局免伤是**受击方**的（谁挨打谁减免）；
 * 其余（元素加成、暴击、擢升、护甲穿透、元素穿透…）全是**攻击方**的。
 *
 * 这一层是必需的：`deal()` 只收一个 `stats`，但真实战斗里两边的属性**不是同一张表**。
 */
function DamagePipeline_isDefensiveStat(s: StatId): boolean {
  return (
    s === StatType.DAMAGE_REDUCTION ||
    (s >= ELEM_RES_BASE && s < ELEM_RES_BASE + ELEMENT_COUNT)
  );
}

/**
 * 把攻守两张表拼成 `deal()` 要的那一个读取口。
 *
 * 每次伤害建一个小对象，是刻意的取舍：`deal()` 的签名不动，
 * 26 条数值自测一条都不用改。伤害事件每秒也就几次，这点分配可以忽略。
 */
function DamagePipeline_statsFor(ctx: DamageContext): DamageCalcStats {
  const src = DamagePipeline_sheetOf(ctx.source);
  const tgt = DamagePipeline_sheetOf(ctx.target);
  return {
    get: (s: StatId): number => {
      const sheet = DamagePipeline_isDefensiveStat(s) ? tgt : src;
      return sheet === null ? 0 : sheet.getFinal(s);
    },
  };
}

/**
 * 取单位的属性表，**没有就返回 `null`**。
 *
 * ⚠️ **必须先问 `hasStatSheet()`** —— `actor.statSheet` 的 getter 是**惰性建表**的，
 * 直接取就等于在（可能已经 `detach` 的）句柄上重建一张表（计划风险 #11）。
 * 全仓的读取方（`StatPanelUI.resolveSheet`、`BuffManager` 的摘除路径）都是这么办的；
 * 只有**写入方**才直接取 getter。
 *
 * 语义上也说得通：**没有属性表 = 没有任何属性修正 = 所有乘区为 0 = 恒等**。
 */
function DamagePipeline_sheetOf(a: Actor | undefined): StatSheet | null {
  if (a === undefined) {
    return null;
  }
  if (!a.hasStatSheet()) {
    return null;
  }
  return a.statSheet;
}

/**
 * 逐条日志。**分条打，不拼成一个长串** ——
 * Lua 5.3.6 的 C-level 调用上限是 200，长 `+` 链会把加载链顶穿
 * （memory `wc3-lua53-ccalls-limit`）。
 *
 * Step 3 的验收看 `原生=` 与 `写回=` 是否**逐位相同**；
 * Step 4 的验收看 `段:` 那一行是不是「物理 + 火」且加起来等于 `写回=`。
 */
/**
 * 上一次 `compute()` 的暴击骰子与读到的暴击率。**只给日志看。**
 *
 * 为什么不塞进 `DamageContext`：这三个数是调试观测值，不是那次命中的语义一部分，
 * 塞进去会让一个「事件快照」类型多带两个没人消费的字段。而放这里的前提是
 * **`compute` 与 `log` 在同一次事件的同一条同步线上**（`settle` 里先算、回调里后打），
 * 所以不会读到别的命中的值。若哪天日志改成异步打，这个前提就没了。
 */
let lastCritRate = 0;
let lastCritRoll = 1;

function DamagePipeline_log(ctx: DamageContext): void {
  const src = ctx.source === undefined ? "-" : String(ctx.source.id);
  log.info(
    "dmg 源=" + src +
    " 原值=" + ctx.originalDamage.toFixed(1) +
    " 原生=" + ctx.nativeDamage.toFixed(1) +
    " 写回=" + ctx.finalDamage.toFixed(1) +
    " 物理=" + String(ctx.isPhysical) +
    " 平A=" + String(ctx.isAttack) +
    " 远程=" + String(ctx.isRanged)
  );
  log.info(
    "     attType=" + ctx.attackType +
    " dmgType=" + ctx.damageType +
    " wpnType=" + ctx.weaponType +
    "（dmgType=4 才是走护甲的那个）"
  );
  log.info("     段: " + DamagePipeline_hitsText(ctx));
  // 暴击的三个数必须一起看：
  //   率=0        → 攻方的属性表没读到（`sheetOf(ctx.source)` 返回了 null）
  //   骰 >= 率    → 正常没暴（骰子是 [0,1) 的均匀分布，率=1 时恒暴）
  //   本次=false 而率 > 骰 → 判定那行代码没生效，问题在别处
  log.info(
    "     暴击: 率=" + lastCritRate.toFixed(3) +
    " 骰=" + lastCritRoll.toFixed(3) +
    " 本次=" + String(ctx.isCrit)
  );
}

/**
 * 把各段拼成 `physical 45.5 + fire 20.0`。
 *
 * 用 `push` + `join` 而不是 `reduce`/长 `+` 链：Lua 5.3.6 的 C-level 调用上限是 200，
 * 而且手写 `+` 链在段数变多时会把加载链顶穿（memory `wc3-lua53-ccalls-limit`）。
 */
function DamagePipeline_hitsText(ctx: DamageContext): string {
  const parts: string[] = [];
  for (let i = 0; i < ctx.hits.length; i++) {
    const h = ctx.hits[i];
    if (h !== undefined) {
      parts.push(h.element + " " + h.amount.toFixed(1));
    }
  }
  return parts.join(" + ");
}
