export type {
  RelicId,
  RelicRarity,
  RelicDefinition,
  RelicPoolEntry,
  RelicInventoryItem,
  RelicAddedPayload,
  RelicRemovedPayload,
  RelicInventoryChangedPayload,
} from "./types";
export { RelicRegistry } from "./RelicRegistry";
export { RelicPool } from "./RelicPool";
export {
  RelicSystem,
  RELIC_EVENT_ADDED,
  RELIC_EVENT_REMOVED,
  RELIC_EVENT_INVENTORY_CHANGED,
} from "./RelicSystem";
export { registerDefaultRelicsAndPools } from "./registerDefaultContent";
export { burningBloodDefinition, BURNING_BLOOD_MAX_HP_BONUS } from "./definitions/burningBlood";
export { warFangDefinition, WAR_FANG_ATTACK_BONUS } from "./definitions/warFang";
export { ironPlateDefinition, IRON_PLATE_ARMOR_LEVELS } from "./definitions/ironPlate";
export { arcaneGrimoireDefinition } from "./definitions/arcaneGrimoireWater";
