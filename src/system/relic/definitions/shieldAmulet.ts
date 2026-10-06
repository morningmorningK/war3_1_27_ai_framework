import { Actor } from "src/system/actor";
import { StatMod, StatModKind, StatType } from "src/system/stat/types";
import { RelicDefinition } from "../types";

/**
 * 护盾强效加成：**50%**。
 *
 * 写法是 `0.5` 而不是 `50` —— 属性的量纲是「率」。
 * `SHIELD_STRENGTH = 0.5` 表示护盾值乘 `(1 + 0.5)`，也就是 ×1.5
 * （消费者在 `BuffManager.applyShieldStrength`）。
 */
export const SHIELD_AMULET_BONUS = 0.5;

/**
 * 守护护符：**护盾强效 +50%，直接写属性**。
 *
 * ## 为什么只有 `getStatModifiers`、没有 `onAcquire`
 *
 * 形状与 `timeHourglass` / `ironPlate` 完全一致：这件遗物**只声明一项属性**，
 * 不做任何一次性动作。拾取即生效、丢弃即还原，全部由
 * `RelicSystem.applyRelicStatMods()` / `stripRelicStatMods()` 自动完成 ——
 * 手写一对反向的原生加减反倒会重复扣一遍（见 `RelicDefinition.getStatModifiers`
 * 的注释）。
 *
 * ## ⚠️ 必须 `StatModKind.FLAT`，不能用 `PERCENT`
 *
 * `SHIELD_STRENGTH` 的 **base 恒为 0** —— 它没有原生对应物，不像攻击力那样
 * 能从 `GetUnitState` 快照到一个初值。而 `PERCENT` 的语义是**乘在 base 上**，
 * 乘 0 永远是 0：用 `PERCENT` 写出来的遗物会「捡起来了、面板上也显示 0%」，
 * 游戏里毫无反应（`stat/types.ts` 文件头约束 2；memory
 * `wc3-zero-base-stat-invisible`）。
 *
 * 这项属性本来就是**百分比量纲**，所以 `FLAT` 加进去的直接就是百分点。
 *
 * ## 与 `timeHourglass` 的一处不同：**没有上限**
 *
 * `clampFinal` 对 `COOLDOWN_REDUCTION` 是钳 `[0, 0.5]`，对 `SHIELD_STRENGTH`
 * 只兜下界（`v < 0 ? 0 : v`）。所以这里叠两件会真的变成 100%。
 * `maxStacks: 1` 因此写的不是「叠了没用」，而是**这件物品本来就只有一件**。
 *
 * ## 谁消费它
 *
 * `BuffManager.applyShieldStrength` —— 在 `addShieldBuff` 发放护盾时乘上去。
 * **属性本身不产生任何行为**，这条遗物只负责把数字放上去。
 *
 * 注意乘的是**发放那一刻**：先上盾、后捡护符，已经被挂上的那个盾不会变强，
 * 要重新放一次技能（这是「发放时算」这个设计选择的已知代价，见
 * `applyShieldStrength` 的注释）。
 */
export const shieldAmuletDefinition: RelicDefinition = {
  id: "shield_amulet",
  name: "守护护符",
  description: "护盾强效 +50%：原本能挡 100 伤害的护盾，能挡 150。",
  icon: "ReplaceableTextures\\CommandButtons\\BTNSpellShieldAmulet.blp",
  rarity: "boss",
  maxStacks: 1,
  getStatModifiers(_actor: Actor, stacks: number): StatMod[] {
    return [
      {
        stat: StatType.SHIELD_STRENGTH,
        kind: StatModKind.FLAT,
        value: SHIELD_AMULET_BONUS * stacks,
      },
    ];
  },
};
