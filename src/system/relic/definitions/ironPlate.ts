import { FourCC } from "src/utils/helper";
import { Actor } from "src/system/actor";
import { RelicDefinition } from "../types";

/** 物品类「护甲加成」坚韧（每级约 +1 护甲，具体以物编为准） */
const AB_ITEM_ARMOR_BONUS = FourCC("AItg");

/** +防御：坚韧护甲层数（约等于护甲点） */
export const IRON_PLATE_ARMOR_LEVELS = 5;
export const ironPlateDefinition: RelicDefinition = {
  id: "iron_plate",
  name: "铁卫板甲",
  description: "获得相当于 +5 护甲的坚韧加成（物品护甲类技能，具体数值以物编为准）。",
  icon: "ReplaceableTextures\\CommandButtons\\BTNHumanArmorUpOne.blp",
  rarity: "uncommon",
  maxStacks: 1,
  onAcquire(actor: Actor): void {
    actor.addAbility(AB_ITEM_ARMOR_BONUS);
    actor.setAbilityLevel(AB_ITEM_ARMOR_BONUS, IRON_PLATE_ARMOR_LEVELS);
  },
  onRemove(actor: Actor, _stacks: number): void {
    actor.removeAbility(AB_ITEM_ARMOR_BONUS);
  },
};