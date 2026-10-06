import { burningBloodDefinition } from "./definitions/burningBlood";
import { warFangDefinition } from "./definitions/warFang";
import { ironPlateDefinition } from "./definitions/ironPlate";
import { arcaneGrimoireDefinition } from "./definitions/arcaneGrimoireWater";
import { elementalEmberDefinition } from "./definitions/elementalEmber";
import { timeHourglassDefinition } from "./definitions/timeHourglass";
import { shieldAmuletDefinition } from "./definitions/shieldAmulet";
import { tenacityCharmDefinition } from "./definitions/tenacityCharm";
import { RelicSystem } from "./RelicSystem";

/**
 * 注册示例遗物与命名池 `common`（可在 main 中调用一次）
 */
export function registerDefaultRelicsAndPools(): void {
  const rs = RelicSystem.getInstance();
  rs.registerDefinitions([
    burningBloodDefinition,
    warFangDefinition,
    ironPlateDefinition,
    arcaneGrimoireDefinition,
    elementalEmberDefinition,
    timeHourglassDefinition,
    shieldAmuletDefinition,
    // 固定物品，**不进下面的 `common` 权重池** —— 它是由 `I004` 单独绑定的，
    // 混进随机池会让它凭空出现在掉落里。
    tenacityCharmDefinition,
  ]);
  rs.registerPool("common", [
    { id: "burning_blood", weight: 1 },
    { id: "war_fang", weight: 1 },
    { id: "iron_plate", weight: 1 },
    { id: "arcane_grimoire_water", weight: 1 },
    { id: "elemental_ember", weight: 1 },
  ]);
  rs.bindDeathCleanup();
}
