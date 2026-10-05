import { EVENT_UNIT_DAMAGED, Group, Rectangle, Region, Timer, Trigger, Unit, UNIT_TYPE_DEAD } from "@eiriksgata/wc3ts/*";
import { gameEvents, GameEventType, UnitDeathEventData, UnitDamageEventData } from "./event";
import { FourCC } from "src/utils/helper";
import { Actor } from "./actor";
import { eventBus } from "./event/EventBus";

const LOCUST_ABILITY_ID = FourCC("Aloc");
const REBUILD_INTERVAL = 10 * 60;
const REBUILD_EVENT_THRESHOLD = 30000;

function isLocust(u: unit): boolean {
  return GetUnitAbilityLevel(u, LOCUST_ABILITY_ID) > 0;
}

function isAliveHandle(u: unit): boolean {
  return !IsUnitType(u, UNIT_TYPE_DEAD()) && GetWidgetLife(u) > 0.405;
}

export default class DamageSystem {

  public static unitGroup: Group;
  private static instance: DamageSystem;
  private static dmgTrigger: Trigger;
  private static enterTrigger: Trigger | undefined;
  private static worldRegion: Region | undefined;
  private static rebuildTimer: Timer | undefined;

  private static triggerEventCount = 0;
  private static createdBound = false;
  private static deathBound = false;

  private constructor() {
  }
  public static getInstance(): DamageSystem {
    if (!DamageSystem.instance) {
      DamageSystem.instance = new DamageSystem();
    }
    return DamageSystem.instance;
  }

  public initialize() {
    DamageSystem.unitGroup = DamageSystem.unitGroup ?? Group.create()!;
    DamageSystem.bindDamageTrigger();
    DamageSystem.bindEnterRegion();
    DamageSystem.enumExistingUnits();
    DamageSystem.bindRebuildTimer();
    DamageSystem.bindActorCreated();
    DamageSystem.bindUnitDeath();
  }

  private static bindDamageTrigger(): void {
    DamageSystem.dmgTrigger = Trigger.create();
    DamageSystem.dmgTrigger.addAction(() => {
      const damagedUnit = GetTriggerUnit();
      const damageSource = GetEventDamageSource();
      const rawDamage = GetEventDamage();

      // 后两个参数（attackType / damageType）此前**从来没被传过**，恒为 undefined。
      // 它们走的是 `EXGetEventDamageData` 的那七个槽位，实测有效：
      //   (6) ATTACK_TYPE 与 (4) DAMAGE_TYPE 都是**原样回传**（传 `ATTACK_TYPE_NORMAL()`
      //   即 `ConvertAttackType(0)`，(6) 读回来就是 0）。
      //
      // ⚠️ 这两个数**只在这一条同步调用链上有意义** —— `EXGetEventDamageData` 是
      // 「当前事件」上下文，出了这个触发器动作就读不到。所以必须在这里读、在这里存。
      //
      // 注意别顺手把 `(1) IS_PHYSICAL` 也当成可用值：实测它在平A 时也返回 0。
      // 判物理要用 `damageType === 4`，见 `src/system/combat/damageConstants.ts`。
      const data = new UnitDamageEventData(
        Actor.fromHandle(damagedUnit),
        GetUnitTypeId(damagedUnit),
        GetOwningPlayer(damagedUnit),
        Actor.fromHandle(damageSource),
        rawDamage,
        EXGetEventDamageData(6),
        EXGetEventDamageData(4)
      );

      gameEvents.emit(GameEventType.UNIT_DAMAGED, data);
    });
  }

  private static bindEnterRegion(): void {
    if (DamageSystem.enterTrigger !== undefined) {
      return;
    }
    DamageSystem.enterTrigger = Trigger.create();
    const region = Region.create();
    const worldBounds = Rectangle.getWorldBounds();
    region.addRect(worldBounds!);
    DamageSystem.worldRegion = region;
    DamageSystem.enterTrigger.registerEnterRegion(region, () => {
      const u = GetEnteringUnit();
      if (u == null) {
        return false;
      }
      DamageSystem.tryRegisterHandle(u);
      return false;
    });
  }

  private static enumExistingUnits(): void {
    const temp = Group.create()!;
    temp.enumUnitsInRange(0, 0, 10000, () => {
      const u = GetFilterUnit();
      if (u == null) {
        return false;
      }
      DamageSystem.tryRegisterHandle(u);
      return false;
    });
    temp.destroy();
  }

  private static bindRebuildTimer(): void {
    if (DamageSystem.rebuildTimer !== undefined) {
      return;
    }
    DamageSystem.rebuildTimer = Timer.create();
    DamageSystem.rebuildTimer.start(REBUILD_INTERVAL, true, () => {
      if (DamageSystem.triggerEventCount > REBUILD_EVENT_THRESHOLD) {
        DamageSystem.getInstance().releaseUnitEvent();
      }
    });
  }

  private static bindActorCreated(): void {
    if (DamageSystem.createdBound) {
      return;
    }
    DamageSystem.createdBound = true;
    eventBus.on("game:Actor:created", ({ actor }: { actor: Actor }) => {
      if (actor.handle == null) {
        return;
      }
      DamageSystem.tryRegisterHandle(actor.handle);
    });
  }

  private static bindUnitDeath(): void {
    if (DamageSystem.deathBound) {
      return;
    }
    DamageSystem.deathBound = true;
    gameEvents.onUnitDeath((data: UnitDeathEventData) => {
      const unit = data.Actor;
      if (unit == null) {
        return;
      }
      if (DamageSystem.unitGroup !== undefined) {
        DamageSystem.unitGroup.removeUnit(unit);
      }
    });
  }

  /** 跳过蝗虫、已注册单位；成功注册后计入 unitGroup */
  public static tryRegisterHandle(u: unit): boolean {
    if (u == null || !isAliveHandle(u) || isLocust(u)) {
      return false;
    }
    const wrapped = Unit.fromHandle(u);
    if (wrapped == null) {
      return false;
    }
    if (!DamageSystem.unitGroup || !DamageSystem.dmgTrigger) {
      return false;
    }
    if (DamageSystem.unitGroup.hasUnit(wrapped)) {
      return false;
    }
    DamageSystem.dmgTrigger.registerUnitEvent(wrapped, EVENT_UNIT_DAMAGED());
    DamageSystem.unitGroup.addUnit(wrapped);
    DamageSystem.triggerEventCount++;
    return true;
  }

  public releaseUnitEvent() {
    DamageSystem.dmgTrigger.destroy();
    DamageSystem.bindDamageTrigger();
    DamageSystem.triggerEventCount = 0;

    const stillAlive: Unit[] = [];
    DamageSystem.unitGroup.for(() => {
      const u = Unit.fromHandle(GetEnumUnit());
      if (u == null || u.handle == null) {
        return;
      }
      if (isAliveHandle(u.handle)) {
        stillAlive.push(u);
      }
    });

    DamageSystem.unitGroup.clear();
    for (const u of stillAlive) {
      DamageSystem.dmgTrigger.registerUnitEvent(u, EVENT_UNIT_DAMAGED());
      DamageSystem.unitGroup.addUnit(u);
      DamageSystem.triggerEventCount++;
    }
  }
}
