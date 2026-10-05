import { UNIT_STATE_LIFE } from "src/constants/game/units";
import { Actor } from "src/system/actor";
import { StatMod, StatModKind, StatType } from "src/system/stat/types";
import { RelicDefinition } from "../types";

/** 燃烧之血：增加的最大生命（可改此常量调整数值） */
export const BURNING_BLOOD_MAX_HP_BONUS = 100;

/**
 * 燃烧之血：**属性部分**走 `getStatModifiers`（生命上限 +100 每层），
 * `onAcquire` 只留一次性的「回复等量生命」。
 *
 * 为什么这么拆：生命上限是**持续性**的属性加成 —— 换个装备、被驱散、叠层变化时
 * 都要跟着重算，交给属性系统托管才不会漏。而「回复等量生命」是**施加瞬间的一次
 * 动作**，不是属性，所以留在钩子里。
 *
 * 迁移前这里是一对 `addMaxLife` / `removeMaxLife` 手写原生加减 —— 那种写法在
 * 「上 buff → 摘 buff」一来一回里只要漏掉一次就对不上账。现在 `onRemove` 整个删掉了：
 * 来源一摘，属性自动还原到 base，当前生命超出新上限的部分由 `StatSheet.writeNative`
 * 顺手钳回去（原来 `removeMaxLife` 那句话现在归它管）。
 */
export const burningBloodDefinition: RelicDefinition = {
  id: "burning_blood",
  name: "燃烧之血",
  description: "获得时增加 100 点生命上限，并回复等量生命。",
  icon: "ReplaceableTextures\\CommandButtons\\BTNHeartOfAszune.blp",
  rarity: "boss",
  maxStacks: 1,
  getStatModifiers(_actor: Actor, stacks: number): StatMod[] {
    return [
      {
        stat: StatType.MAX_LIFE,
        kind: StatModKind.FLAT,
        value: BURNING_BLOOD_MAX_HP_BONUS * stacks,
      },
    ];
  },
  onAcquire(actor: Actor): void {
    // ⚠️ 时机：`RelicSystem.addRelic` 会**先**挂属性并同步冲刷，才调到这里 ——
    // 所以此刻原生生命上限已经是加过 100 的新值了。
    //
    // 这里只回血、不碰上限：上限交给属性系统，两边都写会重复加。
    const u = actor.handle;
    const life = GetUnitState(u, UNIT_STATE_LIFE);
    SetUnitState(u, UNIT_STATE_LIFE, life + BURNING_BLOOD_MAX_HP_BONUS);
  },
};
