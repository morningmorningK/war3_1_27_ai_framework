import { Actor } from "src/system/actor";
import { StatMod, StatModKind, StatType } from "src/system/stat/types";
import { RelicDefinition } from "../types";

/** 韧性加成：**50%**。量纲是「率」，`0.5` = 受到的控制效果时长 ×0.5。 */
export const TENACITY_CHARM_BONUS = 0.5;

/**
 * 坚定护符：**韧性 +50%，只声明一项属性**（形状同 `shieldAmulet` / `timeHourglass`）。
 *
 * ⚠️ **必须 `StatModKind.FLAT`**：`TENACITY` 的 base 恒为 0，而 `PERCENT` 是乘在
 * base 上 —— 乘 0 永远是 0，捡起来了、面板上也是 0%，游戏里毫无反应
 * （memory `wc3-zero-base-stat-invisible`）。`clampFinal` 把它钳在 `[0, 1]`，
 * 所以 +50% 是合法中间值。
 *
 * ⚠️ **本步还没有消费者**：读 `TENACITY` 的 `BuffManager.applyTenacity` 要到
 * Step 3 才写。所以现在只能验到「C 键面板第③页的韧性变成 +50.0%」，
 * **对眩晕时长不会有任何影响** —— 那是这一步该有的样子。
 */
export const tenacityCharmDefinition: RelicDefinition = {
  id: "tenacity_charm",
  name: "坚定护符",
  description: "韧性 +50%：受到的眩晕等控制效果持续时间减半。",
  icon: "ReplaceableTextures\\CommandButtons\\BTNAmulet.blp",
  rarity: "boss",
  maxStacks: 1,
  getStatModifiers(_actor: Actor, stacks: number): StatMod[] {
    return [
      {
        stat: StatType.TENACITY,
        kind: StatModKind.FLAT,
        value: TENACITY_CHARM_BONUS * stacks,
      },
    ];
  },
};
