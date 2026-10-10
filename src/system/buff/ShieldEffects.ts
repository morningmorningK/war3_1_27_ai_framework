/** 基于 Vinz 的 Sacred Guard Classic 制作的淡色模型，颜色和透明度写在资源中。 */
export type ShieldElementStyle = "fire" | "water" | "ice" | "thunder" | "wind" | "rock" | "grass" | "none";
/** 保留旧颜色参数，兼容已有技能调用。 */
export type ShieldEffectStyle = ShieldElementStyle | "gold" | "blue" | "green" | "red";
export const SHIELD_EFFECT_ATTACH_POINT = "chest";

export const SHIELD_EFFECT_MODELS: Record<ShieldEffectStyle, string> = {
  fire: "war3mapImported\\Shield Pale Fire.mdx",
  water: "war3mapImported\\Shield Pale Water.mdx",
  ice: "war3mapImported\\Shield Pale Ice.mdx",
  thunder: "war3mapImported\\Shield Pale Thunder.mdx",
  wind: "war3mapImported\\Shield Pale Wind.mdx",
  rock: "war3mapImported\\Shield Pale Rock.mdx",
  grass: "war3mapImported\\Shield Pale Grass.mdx",
  none: "war3mapImported\\Shield Pale None.mdx",
  gold: "war3mapImported\\Shield Pale Rock.mdx",
  blue: "war3mapImported\\Shield Pale Water.mdx",
  green: "war3mapImported\\Shield Pale Grass.mdx",
  red: "war3mapImported\\Shield Pale Fire.mdx",
};

export function resolveShieldEffectStyle(displayKey?: string): ShieldEffectStyle {
  if (displayKey === "demo_fire" || displayKey === "shield_fire") return "fire";
  if (displayKey === "demo_frost" || displayKey === "shield_ice") return "ice";
  if (displayKey === "shield_water") return "water";
  if (displayKey === "shield_thunder") return "thunder";
  if (displayKey === "shield_wind") return "wind";
  if (displayKey === "shield_rock") return "rock";
  if (displayKey === "shield_grass") return "grass";
  return "none";
}
