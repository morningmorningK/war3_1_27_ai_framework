import { Actor } from "src/system/actor";
import { StatMod, StatModKind, StatType } from "src/system/stat/types";
import { RelicDefinition } from "../types";

/**
 * 冷却缩减幅度：**50%**。
 *
 * 写法是 `0.5` 而不是 `50` —— 属性的量纲是「率」。`COOLDOWN_REDUCTION = 0.5`
 * 表示冷却时间乘 `(1 - 0.5)`，也就是减半（消费者在 `CooldownReductionSystem`）。
 */
export const TIME_HOURGLASS_CDR = 0.5;

/**
 * 时之沙漏：**技能冷却缩减 50%，直接写属性**。
 *
 * ## 为什么只有 `getStatModifiers`、没有 `onAcquire`
 *
 * 形状与 `ironPlate` 完全一致：这件遗物**只声明一项属性**，不做任何一次性动作。
 * 拾取即生效、丢弃即还原，全部由 `RelicSystem.applyRelicStatMods()` /
 * `stripRelicStatMods()` 自动完成 —— 手写一对反向的原生加减反倒会重复扣一遍
 * （见 `RelicDefinition.getStatModifiers` 的注释）。
 *
 * ## ⚠️ 必须 `StatModKind.FLAT`，不能用 `PERCENT`
 *
 * `COOLDOWN_REDUCTION` 的 **base 恒为 0** —— 它没有原生对应物，不像攻击力那样
 * 能从 `GetUnitState` 快照到一个初值。而 `PERCENT` 的语义是**乘在 base 上**，
 * 乘 0 永远是 0：用 `PERCENT` 写出来的遗物会「挂上了、面板上也显示 0%」，
 * 游戏里毫无反应（`stat/types.ts` 文件头约束 2；memory `wc3-zero-base-stat-invisible`）。
 *
 * 这项属性本来就是**百分比量纲**，所以 `FLAT` 加进去的直接就是百分点。
 * `StatSystemTestExample.ts` 已实测过这两条（FLAT 有效 / PERCENT 无效）。
 *
 * ## 50% 正好是上限
 *
 * `clampFinal`（`stat/types.ts:255-256`）把 `COOLDOWN_REDUCTION` 钳在 `[0, 0.5]`，
 * 所以这一件物品就是**顶格**。`maxStacks: 1` 也是这个缘故 —— 叠两件是 1.0，
 * 会被钳回 0.5，叠层没有任何意义。
 *
 * ## 谁消费它
 *
 * `CooldownReductionSystem` —— 订阅技能事件，在施法后把该技能的冷却改写成
 * `原值 × (1 - cdr)`。**属性本身不产生任何行为**，这条遗物只负责把数字放上去。
 */
export const timeHourglassDefinition: RelicDefinition = {
  id: "time_hourglass",
  name: "时之沙漏",
  description: "技能冷却缩减 50%。",
  icon: "ReplaceableTextures\\CommandButtons\\BTNStaffOfTeleportation.blp",
  rarity: "boss",
  maxStacks: 1,
  getStatModifiers(_actor: Actor, stacks: number): StatMod[] {
    return [
      {
        stat: StatType.COOLDOWN_REDUCTION,
        kind: StatModKind.FLAT,
        value: TIME_HOURGLASS_CDR * stacks,
      },
    ];
  },
};
