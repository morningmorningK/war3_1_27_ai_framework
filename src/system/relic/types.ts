import { Actor } from "../actor";
import type { StatMod } from "../stat/types";
// `import type` 是**必须的**：`combat/DamagePipeline` 反过来要 import `RelicSystem`，
// 这里若留下运行时 import 就形成一个环。类型导入会被 tstl 整个擦掉，环就不存在。
import type { DamageContext, DamageDealer } from "../combat/DamageContext";

/** 遗物唯一标识（稳定、可序列化） */
export type RelicId = string;

/** 遗物稀有度（可选，供 UI 配色扩展） */
export type RelicRarity = "common" | "uncommon" | "rare" | "boss" | string;

/**
 * 遗物定义：注册到 RelicRegistry 后由 RelicSystem 在获得/移除时调用钩子
 */
export interface RelicDefinition {
  id: RelicId;
  name: string;
  description: string;
  /** 图标路径（BLP/TGA 等） */
  icon: string;
  rarity?: RelicRarity;
  /** 是否同 id 仅允许一条库存记录（默认 true） */
  unique?: boolean;
  /** 最大层数，默认 1；大于 1 时重复获得会叠加并触发 onStack */
  maxStacks?: number;
  /**
   * 本遗物提供的属性修正器。**可选** —— 纯加技能的遗物（如奥术魔典）不用写。
   *
   * 与 `Buff.getStatModifiers()` 同一套语义：作者只写「哪个属性、怎么加、加多少」，
   * 来源标记由 `RelicSystem` 统一补。返回值按**当前 `stacks` 算出一整组**，
   * 叠层变化时 `RelicSystem` 会整体重挂。
   *
   * ## 什么时候该用它、什么时候不该
   *
   * | 加成形式 | 走哪条 |
   * |---|---|
   * | 加生命上限 / 护甲 / 攻击力 / 暴击率…… | **用它** —— 会被记进属性真值表，可叠加、可查询、可被面板展示 |
   * | 加一个技能（`addAbility`） | 留在 `onAcquire` / `onRemove` —— 那不是属性，是单位的技能表 |
   *
   * 用它之后**不要再在 `onAcquire` / `onRemove` 里写手工的原生加减**。来源一摘，
   * 属性自动还原 —— 手写反向代码反倒会重复扣一遍。
   */
  getStatModifiers?: (actor: Actor, stacks: number) => StatMod[];
  /**
   * 首次获得该遗物（该 id 第一次进背包）。
   *
   * **可选**：纯属性遗物（只有 `getStatModifiers`，没有一次性动作）不必写它 ——
   * 见 `ironPlate`。需要做「回血」「加技能」这类非属性动作时才写。
   */
  onAcquire?: (actor: Actor) => void;
  /** 从单位移除时（整层移除或清空） */
  onRemove?: (actor: Actor, stacks: number) => void;
  /** 叠加层数增加时（不含首次 onAcquire） */
  onStack?: (actor: Actor, newStacks: number) => void;
  /**
   * **造成伤害时**的钩子 —— 「普攻附带元素伤害」这类效果挂在这里。
   *
   * ## 由伤害管线**现查现调**，遗物自己不订阅事件
   *
   * 每发伤害，管线拿攻击方的库存（`RelicSystem.getRelics`）当场遍历一遍。
   * 这不是性能取舍，是**正确性**取舍：如果改成遗物在 `onAcquire` 里自己订阅，
   * 立刻冒出三个失败模式 ——
   *
   *   - **叠层**：同一遗物叠 3 层就挂 3 个 handler，伤害翻 3 倍变 9 倍；
   *   - **摘除**：得精确反注册，漏一次就是永久残留；
   *   - **死亡**：`clearUnit()` 走的路径若漏摘，单位都 detach 了 handler 还在。
   *
   * 现查现调把这三个**从结构上**消掉：库存里没有，就一次都不会被调到。
   *
   * ## 职责边界
   *
   * | 效果 | 走哪条 |
   * |---|---|
   * | 加攻击力 / 暴击率 / 火伤加成…… | `getStatModifiers`（会被记进属性真值表） |
   * | **命中时追加伤害** | `onDealDamage` + `deal.add(...)` |
   *
   * 两者不重叠：`getStatModifiers` 改的是「这一刀的底子」，
   * `onDealDamage` 加的是「额外一段伤害」。
   *
   * ## 只管「加什么」，不管「加多少」
   *
   * 追加伤害一律通过 `deal.add(元素, 基数)`，乘区由管线统一算 —— 理由见
   * `DamageDealer` 的注释。**不要**在这里自己乘元素加成或抗性。
   *
   * @param actor  遗物持有者（= 本次伤害的攻击方）
   * @param stacks 当前层数
   * @param ctx    本次命中的上下文。常用于 `if (!ctx.isAttack) return;`（仅普攻生效）
   * @param deal   追加伤害的口子
   */
  onDealDamage?: (
    actor: Actor,
    stacks: number,
    ctx: DamageContext,
    deal: DamageDealer
  ) => void;
}

/** 池内一条权重项 */
export interface RelicPoolEntry {
  id: RelicId;
  weight: number;
}

/** 单位身上一条遗物记录（有序，决定 UI 从左到右） */
export interface RelicInventoryItem {
  id: RelicId;
  stacks: number;
}

export interface RelicAddedPayload {
  actor: Actor;
  relicId: RelicId;
  stacks: number;
}

export interface RelicRemovedPayload {
  actor: Actor;
  relicId: RelicId;
  stacks: number;
}

export interface RelicInventoryChangedPayload {
  actor: Actor;
}
