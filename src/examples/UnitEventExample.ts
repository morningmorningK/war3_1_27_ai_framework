import { Timer, Players } from "@eiriksgata/wc3ts/*";
import { Actor } from "src/system/actor";
import { gameEvents, SpellEventData, UnitDeathEventData } from "src/system/event";
import { grantTestSkillsTo } from "src/system/skill/TestSkills";
import { FourCC, i2c } from "src/utils/helper";
import { createLogger } from "src/utils/logger";
import { StatType } from "src/system/stat";

const log = createLogger("UnitEventExample");

export function rgeisterUnitSpellEffectEvent(): void {
  gameEvents.onSpellEffect((data: SpellEventData) => {
    // 打 rawcode 而不是十进制：`GetSpellAbilityId()` 返回的是整数，
    // 1093677360 这种数字在排查"点 A 放出 B"时要手工换算成 A010 才看得懂。
    log.info("单位释放了技能: " + i2c(data.abilityId));
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

  // ---- 测试脚手架：本地玩家（玩家1）的英雄 ----
  //
  // 本地玩家就是 `Players[0]`（w3i 里「玩家1」，类型 = 用户）。留一个英雄在这里，
  // 是为了有一个**归属本地玩家**的载体 —— 命令卡只在选中自己的单位时才画得出来。
  //
  // `createBloodBar()` 照常调，不在这里判断开关：单位建出来时若该分类的开关是关的，
  // `UnitBlood.create` 自己会返回 undefined、不建条（见那边的注释）。
  // 「关着的时候新造的单位不会凭空长出条」正是要验的行为之一，所以不能绕过这条路径。
  const hero = Actor.create(Players[0], FourCC("Hpal"), -300, 350);
  if (hero != null) {
    hero.setPreselectUIVisible(false);
    hero.createBloodBar();
    hero.setBaseDamageJAPI(500);
    hero.maxLife = 3000;
    hero.life = 3000;
    hero.maxMana = 1000;
    hero.mana = 1000;

    // 测试技能（吸血 / 治疗 / 治疗加成 / 神圣护盾 / 眩晕）**发给这一个圣骑士**。
    //
    // 用户口径：不搞「扫全场按归属补发」那一套（`main.ts` 里原来那句
    // `grantTestSkills()` 已按此去掉），**谁造的单位谁负责发** —— 和下面那 6 个步兵
    // 是同一个写法。技能是给人**施放**用的，只有归本地玩家的这个圣骑士需要。
    //
    // 时机：必须在 `Actor.create` 之后、且传的是 `Actor` 而不是 rawcode ——
    // `grantTestSkillsTo` 内部要读 `actor.handle` 去调 `addAbility`。
    grantTestSkillsTo(hero);
  }

  // ---- 测试脚手架：普通（非英雄）单位 ----
  //
  // 上面那个圣骑士是**英雄** —— 于是「普通单位血条」这个开关在地图里没有对照物。
  // 补几个步兵（`hfoo`）来当对照（都归 ` Players[3]`）。
  for (let i = 0; i < 6; i++) {
    const unit = Actor.create(Players[3], FourCC("hfoo"), -300 + i * 120, 350);
    if (unit == null) continue;
    unit.setPreselectUIVisible(false);
    unit.createBloodBar();
    unit.maxLife = 1000;
    unit.life = 1000;
    unit.maxMana = 1000
    unit.mana = 1000;
    unit.addShield(1000)
    // 同上：步兵不是英雄，`getDisplayName()` 取单位名 —— 这里会显示「步兵」
  }
}