import { UNIT_STATE_LIFE, UNIT_STATE_MAX_LIFE } from "src/constants/game/units";
import { Actor } from "src/system/actor";
import { RelicDefinition } from "../types";

/** 燃烧之血：增加的最大生命（可改此常量调整数值） */
export const BURNING_BLOOD_MAX_HP_BONUS = 100;

function addMaxLife(actor: Actor, delta: number): void {
  const u = actor.handle;
  const max = GetUnitState(u, UNIT_STATE_MAX_LIFE);
  const life = GetUnitState(u, UNIT_STATE_LIFE);
  const newMax = max + delta;
  SetUnitState(u, UNIT_STATE_MAX_LIFE, newMax);
  SetUnitState(u, UNIT_STATE_LIFE, life + delta);
}

function removeMaxLife(actor: Actor, delta: number): void {
  const u = actor.handle;
  const max = GetUnitState(u, UNIT_STATE_MAX_LIFE);
  const life = GetUnitState(u, UNIT_STATE_LIFE);
  const newMax = math.max(1, max - delta);
  SetUnitState(u, UNIT_STATE_MAX_LIFE, newMax);
  SetUnitState(u, UNIT_STATE_LIFE, math.min(life, newMax));
}

export const burningBloodDefinition: RelicDefinition = {
  id: "burning_blood",
  name: "燃烧之血",
  description: "获得时增加 100 点生命上限，并回复等量生命。",
  icon: "ReplaceableTextures\\CommandButtons\\BTNHeartOfAszune.blp",
  rarity: "boss",
  maxStacks: 1,
  onAcquire(actor: Actor): void {
    addMaxLife(actor, BURNING_BLOOD_MAX_HP_BONUS);
  },
  onRemove(actor: Actor, stacks: number): void {
    removeMaxLife(actor, BURNING_BLOOD_MAX_HP_BONUS * stacks);
  },
};
