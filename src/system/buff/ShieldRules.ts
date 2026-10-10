/** 技能元素盾与结晶盾共用的承伤规则；外观颜色不决定元素属性。 */
import type { ElementId } from "../stat";
import type { CrystalElement } from "../element/reactionTable";

export type ElementalShieldElement = Exclude<ElementId, "physical">;
export type ShieldElement = ElementalShieldElement | "none";
export type ShieldSourceKind = "skill" | "crystallize";
export const SHIELD_ELEMENT_NAMES: Record<ShieldElement, string> = {
  fire: "火", water: "水", thunder: "雷", ice: "冰", wind: "风", rock: "岩", grass: "草", none: "无元素",
};

export const CRYSTAL_SAME_ELEMENT_EFFICIENCY = 2.5;
/** 每点克制伤害消耗多少基础盾值。 */
export const CRYSTAL_COUNTER_CONSUMPTION = 2;

/** key 为护盾元素，value 为克制它的来袭元素。 */
export const CRYSTAL_COUNTER_ELEMENTS: Record<CrystalElement, ElementalShieldElement> = {
  fire: "water",
  ice: "fire",
  thunder: "ice",
  water: "grass",
};
export const CRYSTAL_COUNTER_NAMES: Record<CrystalElement, string> = {
  fire: "水", ice: "火", thunder: "冰", water: "草",
};

/** 1 点基础盾值能挡住的实际伤害；克制时为 0.5，而不是 2。 */
export function crystallizeAbsorptionEfficiency(shield: CrystalElement, incoming?: ElementId): number {
  return elementalShieldAbsorptionEfficiency(shield, incoming);
}

/** 七元素共用同元素效率；只保留已经确认的四组克制关系。 */
export function elementalShieldAbsorptionEfficiency(shield: ElementalShieldElement, incoming?: ElementId): number {
  if (incoming === shield) return CRYSTAL_SAME_ELEMENT_EFFICIENCY;
  const counter = elementalShieldCounter(shield);
  if (counter !== undefined && incoming === counter) return 1 / CRYSTAL_COUNTER_CONSUMPTION;
  return 1;
}

export function elementalShieldCounter(shield: ElementalShieldElement): ElementalShieldElement | undefined {
  if (shield === "fire" || shield === "ice" || shield === "thunder" || shield === "water") {
    return CRYSTAL_COUNTER_ELEMENTS[shield];
  }
  return undefined;
}
