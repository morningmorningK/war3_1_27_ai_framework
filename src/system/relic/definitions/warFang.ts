import { UNIT_TYPE_HERO } from "src/constants/game/units";
import { FourCC } from "src/utils/helper";
import { Actor } from "src/system/actor";
import { StatMod, StatModKind, StatType } from "src/system/stat/types";
import { RelicDefinition } from "../types";

/** 物品类「攻击伤害加成」技能（默认数据一般为每级 +1 伤害，具体以物编为准） */
const AB_ITEM_DAMAGE_BONUS = FourCC("AIat");

function isHero(u: unit): boolean {
  return IsUnitType(u, UNIT_TYPE_HERO);
}

/** +攻击力遗物：对英雄使用 +5 力量（近战主属性英雄每点力量 +1 近战攻击）；非英雄则叠物品加攻技能 */
export const WAR_FANG_ATTACK_BONUS = 5;
export const warFangDefinition: RelicDefinition = {
  id: "war_fang",
  name: "战鬼之牙",
  description:
    "永久增加 5 点力量（英雄）。近战英雄每点力量额外增加 1 点近战攻击力。",
  icon: "ReplaceableTextures\\CommandButtons\\BTNClawsOfAttack.blp",
  rarity: "rare",
  maxStacks: 1,
  /**
   * **英雄**走属性加成：力量 +5（每层）。写回原生由 `StatSheet.writeNative` 的
   * `STRENGTH` 分支做 `SetHeroStr`，等价于迁移前的 `addHeroStrength`。
   *
   * **非英雄返回空数组** —— 它们没有三围，走下面的加技能分支。返回空数组时
   * `RelicSystem` 会摘掉可能残留的旧来源，所以这个分支是安全的。
   */
  getStatModifiers(actor: Actor, stacks: number): StatMod[] {
    if (!isHero(actor.handle)) return [];
    return [
      {
        stat: StatType.STRENGTH,
        kind: StatModKind.FLAT,
        value: WAR_FANG_ATTACK_BONUS * stacks,
      },
    ];
  },
  onAcquire(actor: Actor): void {
    // 英雄的加成已由 getStatModifiers 提供，这里只管非英雄那条路
    if (isHero(actor.handle)) return;
    actor.addAbility(AB_ITEM_DAMAGE_BONUS);
    actor.setAbilityLevel(AB_ITEM_DAMAGE_BONUS, WAR_FANG_ATTACK_BONUS);
  },
  onRemove(actor: Actor, _stacks: number): void {
    // **加技能不是属性**，属性系统管不着，所以非英雄这条仍需手写反向代码。
    // 英雄那条不用管：来源一摘，力量自动回到 base（迁移前是 removeHeroStrength）。
    if (isHero(actor.handle)) return;
    actor.removeAbility(AB_ITEM_DAMAGE_BONUS);
  },
};
