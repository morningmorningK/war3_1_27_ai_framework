import { FourCC } from "src/utils/helper";
import { Actor } from "src/system/actor";
import { RelicDefinition } from "../types";

/** 大法师：召唤水元素（与 UnitEventExample 中 AHwe 一致） */
const AB_SUMMON_WATER_ELEMENTAL = FourCC("AHwe");

export const arcaneGrimoireDefinition: RelicDefinition = {
  id: "arcane_grimoire_water",
  name: "奥术魔典：涌流",
  description: "习得技能「召唤水元素」（与法师英雄水元素相同，需消耗魔法）。",
  icon: "ReplaceableTextures\\CommandButtons\\BTNSummonWaterElemental.blp",
  rarity: "rare",
  maxStacks: 1,
  onAcquire(actor: Actor): void {
    actor.addAbility(AB_SUMMON_WATER_ELEMENTAL);
  },
  onRemove(actor: Actor, _stacks: number): void {
    actor.removeAbility(AB_SUMMON_WATER_ELEMENTAL);
  },
};