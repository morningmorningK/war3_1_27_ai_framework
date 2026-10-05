import { Timer, Players } from "@eiriksgata/wc3ts/*";
import { Actor } from "src/system/actor";
import { gameEvents, SpellEventData, UnitDeathEventData } from "src/system/event";
import { FourCC } from "src/utils/helper";
import { createLogger } from "src/utils/logger";

const log = createLogger("UnitEventExample");

export function rgeisterUnitSpellEffectEvent(): void {
  gameEvents.onSpellEffect((data: SpellEventData) => {
    log.info("单位释放了技能: " + data.abilityId);
  });
  gameEvents.onUnitDeath((data: UnitDeathEventData) => {
    const time = Timer.create().start(1, false, () => {
      data.Actor?.revive(0, 0, true);
      data.Actor!.mana = 3000;
      time.destroy();
    });
  });

  // for (let j = 0; j < 1; j++) {
  //   for (let i = 0; i < 2; i++) {
  //     const unit = Actor.create(Players[3], FourCC("Hpal"), 0, 0);
  //     if (unit == null) continue;
  //     log.info("创建单位: " + unit.id);

  //     // 只用 Actor 自定义血条；原生预选条要关掉，否则会叠出第二条。
  //     unit.setPreselectUIVisible(false);
  //     unit.createBloodBar();
  //     // （`Actor.getLabel()` → `getDisplayName()`）。圣骑士会显示各自的英雄称谓。

  //     unit.addAbility(FourCC("AUfn"));
  //     unit.addAbility(FourCC("AHwe"));

  //     unit.maxMana = 3000;
  //     unit.mana = 3000;
  //     unit.addShield(1000);
  //   }
  // }

  // ---- 测试脚手架：普通（非英雄）单位 ----
  //
  // 上面那 50 个全是 `Hpal`（圣骑士），**都是英雄** —— 于是「普通单位血条」这个
  // 开关在地图里根本没有对象可验证。补几个步兵（`hfoo`）来当对照。
  //
  // 照常调 createBloodBar()，不在这里判断开关：单位建出来时若该分类的开关是关的，
  // `UnitBlood.create` 自己会返回 undefined、不建条（见那边的注释）。
  // 「关着的时候新造的单位不会凭空长出条」正是要验的行为之一，所以不能绕过这条路径。
  //
  for (let i = 0; i < 6; i++) {
    const unit = Actor.create(Players[3], FourCC("hfoo"), -300 + i * 120, 350);
    if (unit == null) continue;
    unit.setPreselectUIVisible(false);
    unit.createBloodBar();
    unit.maxLife = 1000;
    unit.life = 1000;
    unit.maxMana = 1000
    unit.mana = 1000;
    // 同上：步兵不是英雄，`getDisplayName()` 取单位名 —— 这里会显示「步兵」
  }
}