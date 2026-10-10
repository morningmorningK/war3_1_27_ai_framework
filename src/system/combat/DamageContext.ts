/**
 * 伤害上下文 —— 一次伤害结算的**全部输入与中间产物**。
 *
 * ## 为什么另起一个类型，而不扩张 `UnitDamageEventData`
 *
 * `UnitDamageEventData` 是**原生事件的直接投影**，它的 `setEventDamage` 是一次真实的引擎副作用；
 * 而且它已经是 `ShieldSystem(10)` 和 `DamageNumberDisplay(0)` 的公共契约。
 * 动它 = 同时动两个既有订阅者。
 *
 * 所以分成两层：事件数据保持我原样不动，结算上下文是**我们自己的一张草稿纸**。
 *
 * ## 原生元数据是**易失**的
 *
 * `EXGetEventDamageData` / `GetEventDamage()` 只在**伤害回调那一次栈帧内**有效，
 * 出了回调就读不到。所以这些东西在 `captureDamageContext()` 里**一次性抄完**，
 * 之后随便异步用，都是这张草稿纸上的死数据。
 *
 * 反过来说：**不要**把 `DamageContext` 存起来、之后再去补读原生字段 —— 那时候读不到了。
 */

import { Actor } from "src/system/actor";
import { ElementId } from "src/system/stat";
import { UnitDamageEventData } from "src/system/event/GameEvent";
// ⚠️ `element/reactionTable` 是**纯数据 + 纯函数**（只依赖 `stat`），不摸 combat，
// 所以这里 import 它不会成环。`ReactionOutcome` 放在本文件（而不是
// `ElementalReactionSystem`）就是为了让 combat 与 element 两边共用一个定义，
// 且 element 那一侧不必反过来 import combat 的运行时模块。
import { ReactionId } from "src/system/element/reactionTable";
import { DAMAGE_TYPE_NORMAL_INDEX } from "./damageConstants";
import type { ShieldReaction } from "src/system/buff/ShieldBuff";

/** 一段伤害的来源。用于事后归因（「这一发是谁打的」），不影响结算 */
export type HitSource = "native" | "relic" | "reaction";

/**
 * 一次命中。**一段伤害就是一条 `DamageHit`**，元素伤害与物理伤害各占一条。
 *
 * 用数组积攒而不是几个固定字段：本轮只有「物理 + 一条元素」，
 * 但元素反应（§2.2 的 D 阶段）会一次结算出好几段，形状现在就得能装下。
 */
export interface DamageHit {
  /** 哪个元素 */
  element: ElementId;
  /** 结算前的基数 */
  base: number;
  /**
   * 走完全部乘区之后的量。
   *
   * ⚠️ **是浮点，没有取整** —— 管线全程用浮点，取整是 `DamageNumberDisplay` 的展示问题。
   * 理由见 `DamagePipeline.ts` 文件头（不取整才能让 `ARMOR_PEN = 0` 时物理段逐位等于原生值）。
   * `ElementalDamage.deal()` 那个取整版是给数值自测与展示用的，**管线用的是 `dealRaw()`**。
   */
  amount: number;
  isCrit: boolean;
  source: HitSource;
  /**
   * 这一段吃到了哪个元素反应（没吃到就没有）。**逐段归因** ——
   * 想看「这一发整体有没有反应」看 `ctx.reactionKind`，那是汇总。
   */
  reactionId?: ReactionId;
  /** 护盾反应的盾耗规则；不会增幅破盾后的生命伤害。 */
  shieldReaction?: ShieldReaction;
}

/**
 * 遗物往本次命中里**追加伤害**的口子。
 *
 * ## 为什么不干脆让遗物直接 `ctx.hits.push(...)`
 *
 *   1. **遗物只说「加什么」，不说「加多少」。** 元素加成、暴击率、暴击伤害、
 *      目标抗性、全局免伤这些乘区由管线统一结算。放给每个遗物自己算，
 *      等于每写一件遗物就要抄一遍公式 —— 抄错一处就是**静默的错数**，
 *      不会崩、不会报错，只在某天有人发现「怎么打不死人」。
 *   2. `hits` 里每条的 `amount` 是**已走完乘区**的值，`isCrit` 也是定局。
 *      让遗物直接写，等于把这套内部结构变成公共契约，以后改不动。
 *   3. 元素反应的「剧变」段（不吃加成、不暴击）是**另一条口子**，不在这里。
 *
 *      ⚠️ 这里原本写着「到时候加一个 `addTransform()` 即可」—— **实际没这么做**
 *      （2026-10-07）。剧变段不是从**来袭那一击**的管线里追加的，它是**独立的一发**
 *      `UnitDamageTarget`：反应系统 `registerSpellElement(..., kind:"transform")`
 *      声明 → 紧接着派发伤害 → 管线在 `addNonPhysicalNative` 认领到时把 `kind`
 *      透传给 `dealElemental` 的 `segmentKind`。
 *      这样**遗物那边的调用点确实一行都没动**（这一条实现了），但多出来的好处是
 *      剧变段有自己完整的 `DamageContext`：独立飘字、独立日志、独立抗性/免伤结算。
 *      把两段塞进同一个 `ctx` 反而做不到这些。
 */
export interface DamageDealer {
  /**
   * 追加一段元素伤害。
   *
   * @param element 元素
   * @param base    **乘区之前的基数**。「+15 火伤」就传 `15` ——
   *                火伤加成 / 暴击 / 目标火抗 / 免伤会自动叠上去。
   *                不传 `deal()` 算好的结果，理由见上面第 1 条。
   * @param canCrit 能不能暴击，**默认能**。剧变反应传 `false`（它不吃暴击）
   * @param gauge   本次附着的元素量（U），**默认 1U**。
   *                它只影响「挂上去的附着有多厚」，不影响这一段伤害的数值 ——
   *                「+15 火伤」传 `15`，附着量按默认 1U 走即可。
   */
  add(element: ElementId, base: number, canCrit?: boolean, gauge?: number): void;
}

/**
 * 元素反应类别。**实测已在用**（2026-10-07：增幅是蒸发/融化，剧变是冻结/超载/超导/感电）。
 *
 * - `none` —— 没反应（或剧变反应对**来袭那一击**零影响，如冻结）
 * - `amplify`（增幅：蒸发 / 融化）—— 加成、暴击、擢升**全生效**，再乘反应倍率
 * - `transform`（剧变：超载 / 感电 / 超导 / 碎冰）—— **不乘**加成、**不暴击**、
 *   不受擢升，只由 `transformBase(等级) × 系数 × emTransform(元素精通) × 抗性 × 免伤` 定
 *
 * 这两条的差别是公式级的分叉，所以 `dealRaw()` 里是两条独立分支。
 */
export type ReactionKind = "none" | "amplify" | "transform";

/**
 * 一次元素施加的判定结果。**由 `ElementalReactionSystem.resolve()` 产出**，
 * 定义放在这里是为了让 combat / element 两侧共用同一个类型（见文件头 import 那处注释）。
 */
export interface ReactionOutcome {
  kind: ReactionKind;
  /** 有值代表反应来自护盾，单位附着不参与该次判定。 */
  shieldReaction?: ShieldReaction;
  /** 触发了哪个反应。`kind !== "none"` 时才有；`amplify` 缺它会让倍率退回 1（防御） */
  id?: ReactionId;
  /**
   * 这次反应从附着上**扣掉了多少元素量**（U）。只有 `kind !== "none"` 时才有意义。
   * 只给日志/调试看，**不参与任何结算** —— 扣多少已经在 `resolve()` 里扣完了。
   */
  consumed?: number;
}

export interface DamageContext {
  target: Actor | undefined;
  source: Actor | undefined;
  unitTypeId: number;
  owner: player;

  /** 引擎在事件里报的值。**已经算完护甲减伤**（实测：护甲 2 → 89.2857） */
  originalDamage: number;
  /** 进入管线那一刻 `GetEventDamage()` 的最新值。Step 3 打开接管后它才是「待覆盖的原值」 */
  nativeDamage: number;

  /**
   * 是否物理。**由 `damageType === 4` 推出，不是读 `(1) IS_PHYSICAL`** ——
   * 后者实测在平A 时也给 0（见 `damageConstants.ts` 与 memory `wc3-damage-event-semantics`）。
   */
  isPhysical: boolean;
  /** 是否普通攻击（`(2)` 槽位，实测可用：平A=1、技能=0） */
  isAttack: boolean;
  /** 是否远程（`(3)`） */
  isRanged: boolean;
  /** `(6)` 原样回传的攻击类型索引 */
  attackType: number;
  /** `(4)` 原样回传的伤害类型索引 */
  damageType: number;
  /** `(5)` 武器类型索引 */
  weaponType: number;

  /** 各段命中。**只准 `push`**，禁 `for-of` / `filter`（带洞数组陷阱） */
  hits: DamageHit[];
  /** 本次是否有任意一段暴击 */
  isCrit: boolean;
  /**
   * 本次**是否发生过任意反应**的汇总。⚠️ **不是「哪一段反应了」** ——
   * 想知道是哪一段、哪个反应，看 `hits[i].reactionId`。这里只回答「这一发有没有反应过」。
   */
  reactionKind: ReactionKind;
  /**
   * 本次派发内「**每个元素只判定一次反应**」的备忘。键 = 元素，值 = 那次 `resolve()` 的结果。
   *
   * ⚠️ **少了它就会重复消耗附着**：一次命中里若有两段同元素伤害（遗物连加两次火、
   * 或技能多段），每段各 `resolve` 一次 = 附着被扣两次、反应被算两次 → 数值翻倍。
   * 有了备忘，同元素的第二段直接复用第一段的判定结果（倍率一样，但附着只扣一次）。
   */
  reactionMemo: Map<ElementId, ReactionOutcome>;
  /** 最终写回引擎的值 */
  finalDamage: number;
  /** 本次事件实际消耗的基础盾值，由 ShieldSystem 写入，供括号漂浮字显示。 */
  shieldConsumed?: number;
  /** 本次事件发生碎冰，反应漂浮字据此错开高度。 */
  shattered?: boolean;
}

/**
 * 从原生事件一次性抄下全部易失元数据。
 *
 * ⚠️ **必须在伤害回调的同步执行路径上调用** —— 内部那七个 `EXGetEventDamageData`
 * 出了回调就是废数。
 */
export function captureDamageContext(data: UnitDamageEventData): DamageContext {
  const damageType = EXGetEventDamageData(4);
  const attackType = EXGetEventDamageData(6);
  const weaponType = EXGetEventDamageData(5);
  // Step 1 里 data.attackType/damageType 已经被 damage.ts 填上了，这里仍自己读一遍：
  // 上下文要的七个槽位里有三个（2/3/5）事件数据根本没带，与其一半读 data 一半读原生，
  // 不如七个数一次全从同一个地方取，读起来不会有"这两行为什么不一样"的疑问。
  const isAttack = EXGetEventDamageData(2) === 1;
  const isRanged = EXGetEventDamageData(3) === 1;
  const nativeDamage = GetEventDamage();

  return {
    target: data.Actor,
    source: data.source,
    unitTypeId: data.unitTypeId,
    owner: data.owner,

    originalDamage: data.originalDamage,
    nativeDamage,

    // 判物理用 damageType === 4；`(1) IS_PHYSICAL` 实测平A 也给 0，不可信
    isPhysical: damageType === DAMAGE_TYPE_NORMAL_INDEX,
    isAttack,
    isRanged,
    attackType,
    damageType,
    weaponType,

    // 密集数组，push 生成
    hits: [],
    isCrit: false,
    reactionKind: "none",
    // 每次派发一张新表 —— 上一发的判定结果绝不能漏到下一发
    reactionMemo: new Map<ElementId, ReactionOutcome>(),
    finalDamage: nativeDamage,
  };
}

/** 把 `hits` 里各段加起来。Step 2 起由 `ElementalDamage` 与管线共同使用 */
export function sumHits(ctx: DamageContext): number {
  let total = 0;
  for (let i = 0; i < ctx.hits.length; i++) {
    const h = ctx.hits[i];
    if (h !== undefined) {
      total += h.amount;
    }
  }
  return total;
}

// ===========================================================================
// 上下文交接槽位
// ===========================================================================

/**
 * 「最近一次伤害的上下文」。**存成 `(data, ctx)` 一对，不是裸的 `ctx`。**
 *
 * ## 为什么要这个槽位
 *
 * 上下文是 `DamagePipeline` 在**优先级 100** 造的，而唯一的消费者
 * `DamageNumberDisplay` 在**优先级 0** —— 中间隔着 `ShieldSystem(10)`。
 * 两者之间没有任何数据通道：`UnitDamageEventData` 是原生事件的投影，
 * 按设计**不许**装我们自己的东西（见文件头）。所以在这儿开一个交接点。
 *
 * ## 为什么必须带 `data` 做身份校验
 *
 * 伤害回调**会重入** —— 探针实测在回调里调 `UnitDamageTarget` 能嵌套到 4 层。
 * 裸变量的失败是**静默**的：内层派发把槽位覆写成内层的 ctx，内层跑完返回外层，
 * 外层的 `ShieldSystem` 与飘字读到的却是**内层的上下文**，飘出别人的数。
 *
 * 每次派发的 `UnitDamageEventData` 都是**新对象**（`damage.ts:68` 现场 `new`，
 * 之后 `emit` 把同一个对象发给所有订阅者），所以比对 `data` 是不是同一个对象
 * 就够判定了：重入时外层拿回 `undefined`，飘字退回单色 —— 是**降级**，不是错数。
 *
 * ## 为什么不用 `Map<data, ctx>` 连这点降级也消掉
 *
 * 那样就得决定「什么时候删」，而**三个时点全都不行**：
 * 100 层不能删（0 层还没读）、0 层不能删（飘字没开的时候根本没人来读）、
 * 定时清理又意味着要在这个每发伤害都跑的热路径上挂个定时器。
 * 每发伤害漏一条 = 永久泄漏。单槽位 + 身份校验没有生命周期问题：**内存恒为一条**。
 */
let lastDamageContext: { data: UnitDamageEventData; ctx: DamageContext } | undefined =
  undefined;

/** 由 `DamagePipeline` 在 100 层里记下本次伤害的上下文。 */
export function rememberDamageContext(
  data: UnitDamageEventData,
  ctx: DamageContext
): void {
  lastDamageContext = { data: data, ctx: ctx };
}

/**
 * 取本次伤害的上下文。**只对同一次派发有效** —— 传进来的 `data` 不是
 * 槽位里记着的那一个（重入、或压根不是伤害派发）就返回 `undefined`。
 *
 * 返回 `undefined` 是**正常路径**，不是错误：调用方应当退回单一颜色的显示方式。
 */
export function findDamageContext(data: UnitDamageEventData): DamageContext | undefined {
  const slot = lastDamageContext;
  if (slot === undefined || slot.data !== data) {
    return undefined;
  }
  return slot.ctx;
}

/**
 * 槽位快照的**不透明句柄**。调用方只负责存下来、原样传回去，不要读它的字段。
 *
 * 「不透明」不是洁癖：`save` / `restore` 是**唯一**该碰这个槽位的地方，
 * 让调用方能读字段就等于给了它第二条改槽位的路。
 */
export type DamageContextSlot =
  | { data: UnitDamageEventData; ctx: DamageContext }
  | undefined;

/**
 * 存下当前槽位。**给「在伤害回调里又要造一次伤害」的系统用**
 * （目前只有 `FreezeShatterSystem` 的冰爆）。
 *
 * ## 为什么必须有这一对
 *
 * `findDamageContext()` 靠**比对 `data` 是不是同一个对象**判身份（见上面那段注释）。
 * 在伤害回调里调 `UnitDamageTarget` 会**同步重入**（实测嵌套能到 4 层）：
 *
 *   1. 外层派发 → `DamagePipeline(100)` 记下**外层的** ctx；
 *   2. 外层 `FreezeShatterSystem(4)` 造冰爆 → 内层派发**同步**跑完 →
 *      内层的 `DamagePipeline` 把槽位**覆写成内层的** ctx；
 *   3. 内层跑完返回外层，槽位里还是**内层**的 ctx ——
 *      外层的 `DamageNumberDisplay(0)` 拿到的 `data` 与槽位里的 `data` 不是一个对象，
 *      于是 `findDamageContext` 返回 `undefined` → **外层的飘字退化成单色**。
 *
 * 所以造嵌套伤害的一方要「**存 → 造 → 还原**」把槽位包起来，内外两层各拿到自己的 ctx。
 *
 * ## 为什么直接存引用就够
 *
 * `rememberDamageContext()` 是**整体赋值**一个新对象，从不原地改槽位里的字段
 * （见上面「内存恒为一条」那段）。所以存下来的引用就是那一刻的精确快照，
 * 不需要深拷贝。
 *
 * ## ⚠️ 要配对使用
 *
 * 中途抛异常会跳过 `restoreDamageContext()`，槽位留在**内层**的值上。
 * 后果只是**下一次**外层飘字退化成单色（降级，不是错数），不值得为此在伤害热路径上
 * 包一层 try/catch。但要**成对调用**，别只存不还原。
 */
export function saveDamageContext(): DamageContextSlot {
  return lastDamageContext;
}

/** 把槽位还原成 `saveDamageContext()` 存下的样子。配对使用见上面的注释。 */
export function restoreDamageContext(slot: DamageContextSlot): void {
  lastDamageContext = slot;
}
