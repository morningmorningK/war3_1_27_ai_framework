import { Actor } from "src/system/actor";
import { StatMod, StatModKind, StatType } from "src/system/stat/types";
import { RelicDefinition } from "../types";

/**
 * 攻速加成：**+30%** —— 量纲是**加在 `0x51` 那个倍率上的绝对值**，所以 `0.3`。
 *
 * ⚠️ **必须用 `FLAT`，不能用 `PERCENT`。** 魔兽的攻速加成是**加法**的：
 *
 * ```
 *   0x51 = 1 + 0.02×敏捷 + Σ攻速加成
 * ```
 *
 * 敏捷 35 的英雄出厂 `0x51 = 1.70`，+30% 后是 **2.00**，
 * **不是** `1.70 × 1.3 = 2.21`。原生的「攻击速度增加」物编字段就是加进
 * 同一个加法区，所以多件加速装 / 多个加速 buff 之间也是**彼此相加、不是连乘**。
 *
 * ⚠️ 这一条原先写反过（2026-10-07 用户指正）。当时的论据是「base 不是 0，
 * 所以 `PERCENT` 才有意义」—— 那个判据回答的是「`FLAT` 会不会是空操作」，
 * **不是「该加还是该乘」**。用哪一种是**这个属性在游戏里的定义**决定的，
 * 与 base 有没有值无关。
 *
 * 对照 `tenacityCharm`：韧性那种「率」属性确实用 `PERCENT`（+50% 是乘在 0 上
 * 的增量）。两者的区别不在数值形状，在**语义**。
 */
export const HASTE_GLOVE_ATTACK_SPEED = 0.3;

/**
 * 加速手套：**攻速 +30%**，只声明一项属性（形状同 `ironPlate` / `shieldAmulet`）。
 *
 * 它是 `ATTACK_SPEED`（原生 `0x51`）接线以来**第一件真正给出该属性的游戏内实物** ——
 * 在那之前只有自测第 ⑩ 组在改这个槽位，游戏里毫无来源、也就毫无表现
 * （memory `wc3-zero-base-stat-invisible`）。
 *
 * 为什么走属性表而不是直接 `SetUnitState(u, 0x51, ...)`：
 * `0x51` 是**每写一次就把写那一刻的敏捷项固化一次**的槽位（写 3.700 后敏捷 +10
 * 读 3.900，再写 3.700 立刻读回 3.700、等 2 秒也没回来）。手写原生加减必然踩这个坑；
 * 挂成**来源**则由 `StatSheet.foldNativeDrift()` 每拍把引擎那份增量折回 `base`，
 * 是唯一能保住敏捷成长的路。详见 `StatSheet.ts` 的 `DRIFT_SLOTS` 表。
 */
export const hasteGloveDefinition: RelicDefinition = {
  id: "haste_glove",
  name: "加速手套",
  description: "攻击速度 +30%。",
  icon: "ReplaceableTextures\\CommandButtons\\BTNGlove.blp",
  rarity: "uncommon",
  maxStacks: 1,
  getStatModifiers(_actor: Actor, stacks: number): StatMod[] {
    return [
      {
        stat: StatType.ATTACK_SPEED,
        kind: StatModKind.FLAT,
        value: HASTE_GLOVE_ATTACK_SPEED * stacks,
      },
    ];
  },
};
