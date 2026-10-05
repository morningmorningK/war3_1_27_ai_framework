import { Actor } from "src/system/actor";
import { StatMod, StatModKind, StatType } from "src/system/stat/types";
import { RelicDefinition } from "../types";

/** +防御：护甲点数 */
export const IRON_PLATE_ARMOR_LEVELS = 5;

/**
 * 铁卫板甲：**护甲 +5，直接写属性**。
 *
 * ## 迁移记录（2026-10-05）
 *
 * 迁移前是 `addAbility(FourCC("AItg"))` + `setAbilityLevel(..., 5)` —— 挂一个
 * 物品护甲技能来模拟 +5 护甲。那条路有两个问题：
 *   1. 实际加多少护甲**取决于物编里 AItg 的数据**，代码里写的 5 只是个假设；
 *   2. 技能挂在单位身上，会在命令卡等地方留下痕迹，还可能和别的技能互相顶掉。
 *
 * 现在是 `ARMOR` FLAT +5，走 `SetUnitState(UNIT_STATE_DEFEND_WHITE)`。
 * 「1.27a 上直接写护甲能不能生效」原本是这件事唯一的悬念 ——
 * 已在 `StatSystemTestExample` 的第 ④ 组实测通过（0 → 7 → 0 完整往返）。
 *
 * `onAcquire` / `onRemove` 都删掉了：来源一摘，护甲自动回到 base。
 */
export const ironPlateDefinition: RelicDefinition = {
  id: "iron_plate",
  name: "铁卫板甲",
  description: "获得 +5 护甲。",
  icon: "ReplaceableTextures\\CommandButtons\\BTNHumanArmorUpOne.blp",
  rarity: "uncommon",
  maxStacks: 1,
  getStatModifiers(_actor: Actor, stacks: number): StatMod[] {
    return [
      {
        stat: StatType.ARMOR,
        kind: StatModKind.FLAT,
        value: IRON_PLATE_ARMOR_LEVELS * stacks,
      },
    ];
  },
};
