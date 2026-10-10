import { Actor } from "src/system/actor";
import { StatMod, StatModKind, StatType } from "src/system/stat/types";
import { RelicDefinition } from "../types";

/**
 * 元素精通加成：**+200**。量纲是「点数」（不是率），所以是 `200` 而不是 `2.0`。
 *
 * 为什么给 200 而不是 1000：`emAmplify()` 是**收益递减**的
 * （`2.78 × EM / (EM + 1400)`），
 *
 * | EM | 增幅系数 | 蒸发（2.0）最终倍率 |
 * |---|---|---|
 * | 0 | 1.0000 | 2.00 |
 * | 200 | 1.3475 | 2.70 |
 * | 1000 | 2.1583 | 4.32 |
 *
 * 200 点已经让蒸发从 2.00 涨到 2.70（**+35%**）—— 一眼能看出来，
 * 又不会把数值一次推到离谱的位置。要调只改这一个常量。
 */
export const ARCANE_CODEX_MASTERY = 200;

/**
 * 元素秘典：**元素精通 +200**，只声明一项属性（形状同 `tenacityCharm` / `hasteGlove`）。
 *
 * 它是 `ELEMENTAL_MASTERY` 在**游戏里的唯一来源** —— 在那之前这个属性只有面板和
 * 自测在读，捡不捡都毫无区别（memory `wc3-zero-base-stat-invisible` 那类症状）。
 * 它现在唯一的生效点是 `reactionMultiplier()`：**只放大增幅反应（蒸发 / 融化）**，
 * 不参与普通伤害（硬口径，见 `ElementalDamage.ts`）。
 *
 * ⚠️ **必须 `StatModKind.FLAT`**：`ELEMENTAL_MASTERY` 的 base 是 0
 * （`StatSheet` 的 `fillZeros`，没有任何原生字段给它填值），而 `PERCENT` 是乘在
 * base 上的 —— 乘 0 永远是 0，捡起来了、面板上也写着 +200%，游戏里一点变化没有。
 */
export const arcaneCodexDefinition: RelicDefinition = {
  id: "arcane_codex",
  name: "元素秘典",
  description: "元素精通 +200：蒸发 / 融化反应的伤害提高。",
  icon: "ReplaceableTextures\\CommandButtons\\BTNEnchantedGemstone.blp",
  rarity: "boss",
  maxStacks: 1,
  getStatModifiers(_actor: Actor, stacks: number): StatMod[] {
    return [
      {
        stat: StatType.ELEMENTAL_MASTERY,
        kind: StatModKind.FLAT,
        value: ARCANE_CODEX_MASTERY * stacks,
      },
    ];
  },
};
