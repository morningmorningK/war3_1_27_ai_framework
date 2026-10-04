/**
 * Buff 栏演示数据 —— todo.md §1「第一步」的验证脚手架。
 *
 * 目的只有一个：让「排序 / 常驻无倒计时 / 层数角标」这三件事**一眼可见**。
 * 所以只需要**一个**英雄身上的 **三个** buff：
 *
 *     [灼烧护盾 20s ×2]  [寒冰护盾 45s]  [护盾（无数字）]
 *        ↑ 层数角标        ↑ 限时排序        ↑ 常驻排最后、不显示时间
 *
 * 其中第三个**不用造** —— `UnitEventExample.ts:37` 给每个圣骑士开局就挂了
 * 永久 1000 护盾（没有 displayKey，所以走 `BuffTypeId.SHIELD` 的默认展示）。
 *
 * ⚠️ 这是演示数据，不是正式内容。验证完把 `main.ts` 里那一行调用删掉即可。
 */

import { MapPlayer } from "@eiriksgata/wc3ts/*";
import { Actor } from "src/system/actor";
import { registerBuffDisplay } from "src/system/buff";
import { UNIT_TYPE_HERO } from "src/constants/game/units";
import { createLogger } from "src/utils/logger";

const log = createLogger("BuffBarDemo");

/** 本地玩家 id 最小的存活英雄（没有英雄则最小 id 的存活单位） */
function findLeadActor(): Actor | undefined {
  const local = MapPlayer.fromLocal();
  let bestHero: Actor | undefined;
  let bestOther: Actor | undefined;

  for (const key in Actor.allActors) {
    const actor = Actor.allActors[key];
    if (actor === undefined) continue;
    if (actor.owner !== local) continue;

    // 先挡失效 handle 再调 IsUnitType —— allActors 里装着全地图单位，含已死/已移除的
    if (actor.handle === undefined || GetUnitTypeId(actor.handle) === 0) continue;

    if (IsUnitType(actor.handle, UNIT_TYPE_HERO)) {
      if (bestHero === undefined || actor.id < bestHero.id) bestHero = actor;
    } else if (bestOther === undefined || actor.id < bestOther.id) {
      bestOther = actor;
    }
  }

  return bestHero !== undefined ? bestHero : bestOther;
}

/**
 * 给本地玩家的第一个英雄挂两个限时护盾（其中一个 2 层）。
 *
 * **必须在 `rgeisterUnitSpellEffectEvent()` 之后调用** —— 单位是那一行同步造出来的，
 * 早于此则 `Actor.allActors` 里根本没有本地玩家的单位。
 */
export function seedBuffBarDemo(): void {
  registerBuffDisplay("demo_fire", {
    name: "灼烧护盾",
    description: "演示用：限时护盾，带 2 层叠层角标。",
    icon: "ReplaceableTextures\\CommandButtons\\BTNFireBolt.blp",
  });
  registerBuffDisplay("demo_frost", {
    name: "寒冰护盾",
    description: "演示用：限时护盾，用来对照排序（剩余时间更长的应排在后面）。",
    icon: "ReplaceableTextures\\CommandButtons\\BTNFrostNova.blp",
  });

  const hero = findLeadActor();
  if (!hero) {
    log.warn("找不到本地玩家的单位，Buff 栏演示数据没造出来");
    return;
  }

  const stacked = hero.buffManager.addShieldBuff(500, 20, "demo_fire");
  stacked.stacks = 2; // ⚠️ 目前只有这里会写 stacks，业务侧还没有自动叠层逻辑
  hero.buffManager.addShieldBuff(800, 45, "demo_frost");

  // 诊断：把目标单位身上的**全部** buff 打出来。
  // 期望 3 条（fire:20 / frost:45 / 常驻:-1）。
  //   · 只有 2 条  → 数据问题：选中的不是那个带常驻护盾的圣骑士（看 `是英雄` 那一项）
  //   · 有 3 条    → 绘制问题：第 3 个图标画了但看不见，
  //                  多半是默认护盾图标 `BTNSpell_ShieldWall.blp` 这个路径在 1.27a 里无效
  const all = hero.buffManager.getBuffs();
  const isHero =
    hero.handle !== undefined && IsUnitType(hero.handle, UNIT_TYPE_HERO);
  const desc = all.map((b) => `${b.displayKey ?? b.typeId}:${b.duration}`).join("  ");
  log.info(`目标单位 id=${hero.id} 是英雄=${isHero} buff数=${all.length} [ ${desc} ]`);
}
