import {
  ATTACK_TYPE_HERO,
  ATTACK_TYPE_MAGIC,
  bj_RADTODEG,
  DAMAGE_TYPE_COLD,
  DAMAGE_TYPE_NORMAL,
  Timer,
  UNIT_TYPE_DEAD,
  WEAPON_TYPE_WHOKNOWS,
} from "@eiriksgata/wc3ts/*";

/**
 * 暴风雪技能：对目标点周围的区域持续造成伤害，并使用暴风雪特效
 * @param caster 施法者单位
 * @param targetX 目标点X
 * @param targetY 目标点Y
 * @param opts  技能参数（可配置）
 *   damage 每次落点伤害
 *   radius 技能作用半径
 *   duration 持续时间
 *   interval 每次落点的间隔
 *   stormCount 每次落点的数量
 */
export function castBlizzardSkill(
  caster: unit,
  targetX: number,
  targetY: number,
  opts?: {
    damage?: number,
    radius?: number,
    duration?: number,
    interval?: number,
    stormCount?: number,
  }
): void {
  // 默认参数，可在调用时自定义
  const damage = opts?.damage ?? 50;         // 每次落点伤害
  const radius = opts?.radius ?? 400;        // 技能作用半径
  const duration = opts?.duration ?? 3.0;    // 持续时间（秒）
  const interval = opts?.interval ?? 0.33;   // 每次落点的间隔（秒）
  const stormCount = opts?.stormCount ?? 5;  // 每次落点冰雹数量

  // 与物编暴风雪 Buff 一致：Human\Blizzard\BlizzardTarget.mdl（区域风雪；原 Other\FrostNova 路径无效）
  const effectModel = "Abilities\\Spells\\Human\\Blizzard\\BlizzardTarget.mdl";
  /** 单次落点特效保留时长（秒），避免同帧 Destroy 导致几乎不可见 */
  const effectLifetime = 0.5;
  let elapsed = 0;

  const GROUP_RADIUS = 120; // 冰雹伤害生效范围

  const timer = Timer.create().start(interval, true, () => {
    elapsed += interval;
    for (let i = 0; i < stormCount; i++) {
      // 圆盘内均匀分布：角度 U(0,2π)，半径 R*sqrt(U(0,1))。勿用 Math.random→Lua math.random，在图内常与 WC3 不同步或表现异常，改用 GetRandomReal
      const angle = GetRandomReal(0, 2 * Math.PI);
      const dist = Math.sqrt(GetRandomReal(0, 1)) * radius;
      const x = targetX + dist * Math.cos(angle);
      const y = targetY + dist * Math.sin(angle);

      const sfx = AddSpecialEffect(effectModel, x, y);
      const sfxTimer = Timer.create();
      sfxTimer.start(effectLifetime, false, () => {
        DestroyEffect(sfx);
        sfxTimer.destroy();
      });

      // 查找该点附近单位并造成伤害
      const g = CreateGroup();
      GroupEnumUnitsInRange(g, x, y, GROUP_RADIUS, null);

      let u = FirstOfGroup(g);
      while (u != null) {
        // 只对敌方单位生效，可适当调整
        if (IsUnitEnemy(u, GetOwningPlayer(caster)) && UnitAlive(u)) {
          UnitDamageTarget(
            caster,
            u,
            damage,
            true,
            false,
            ATTACK_TYPE_MAGIC(),
            DAMAGE_TYPE_COLD(),
            WEAPON_TYPE_WHOKNOWS()
          );
        }
        GroupRemoveUnit(g, u);
        u = FirstOfGroup(g);
      }
      DestroyGroup(g);
    }
    // 超时则销毁Timer
    if (elapsed >= duration) {
      timer.destroy();
    }
  });
}

/**
 * 判断单位是否存活（兼容写法）
 */
function UnitAlive(u: unit): boolean {
  return !IsUnitType(u, UNIT_TYPE_DEAD(),) && GetWidgetLife(u) > 0.405;
}

/**
 * 冲刺猛攻：瞬移到目标近战距离 → 连续攻击若干次（攻击动画 + 受击特效 + 短击退与自身前冲）。
 * 施法者在整套动作中通过 Pause + 移速 0 + 禁寻路 锁定，避免玩家打断位移。
 * 单次攻击内短暂解除暂停以便播放「attack」动画（全暂停时引擎往往不播模型动画）。
 */
export function castRushBarrageSkill(
  caster: unit,
  target: unit,
  opts?: {
    hitCount?: number;
    /** 两次攻击之间间隔（秒），与单次攻击动画展示窗口配合 */
    hitInterval?: number;
    damagePerHit?: number;
    /** 目标每次被击退距离 */
    knockbackDist?: number;
    /** 施法者每次向目标小幅位移（突进感） */
    selfLungeDist?: number;
    /** 冲刺后与目标保持的近似距离 */
    standDist?: number;
    /** 每次命中后重新把施法者切回暂停前的动画展示时间（秒） */
    attackAnimUnpauseSec?: number;
  }
): void {
  if (!UnitAlive(caster) || !UnitAlive(target)) {
    return;
  }
  if (!IsUnitEnemy(target, GetOwningPlayer(caster))) {
    return;
  }

  const hitCount = opts?.hitCount ?? 10;
  const hitInterval = opts?.hitInterval ?? 0.14;
  const damagePerHit = opts?.damagePerHit ?? 40;
  const knockbackDist = opts?.knockbackDist ?? 42;
  const selfLungeDist = opts?.selfLungeDist ?? 28;
  const standDist = opts?.standDist ?? 90;
  const attackAnimUnpauseSec = opts?.attackAnimUnpauseSec ?? 0.09;

  const hitEffect = "Abilities\\Weapons\\HydraliskImpact\\HydraliskImpact.mdl";

  const savedSpeed = GetUnitMoveSpeed(caster);

  // 冲刺到目标附近（沿目标→施法者方向退 standDist，避免与模型重叠）
  {
    const tx = GetUnitX(target);
    const ty = GetUnitY(target);
    const cx = GetUnitX(caster);
    const cy = GetUnitY(caster);
    const dx = tx - cx;
    const dy = ty - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 0.01) {
      const nx = dx / dist;
      const ny = dy / dist;
      SetUnitPosition(caster, tx - nx * standDist, ty - ny * standDist);
    }
  }

  const tcx = GetUnitX(target);
  const tcy = GetUnitY(target);
  const ccx = GetUnitX(caster);
  const ccy = GetUnitY(caster);
  SetUnitFacing(caster, Math.atan2(tcy - ccy, tcx - ccx) * bj_RADTODEG);

  PauseUnit(caster, true);
  SetUnitPathing(caster, false);
  SetUnitMoveSpeed(caster, 0);

  let hitsDone = 0;
  let ended = false;
  let attackTimer: Timer | undefined;

  const endSkill = () => {
    if (ended) {
      return;
    }
    ended = true;
    PauseUnit(caster, false);
    SetUnitPathing(caster, true);
    SetUnitMoveSpeed(caster, savedSpeed);
    attackTimer?.destroy();
    attackTimer = undefined;
  };

  const playAttackAnimPulse = () => {
    PauseUnit(caster, false);
    SetUnitAnimation(caster, "attack");
    const animTimer = Timer.create();
    animTimer.start(attackAnimUnpauseSec, false, () => {
      if (!ended) {
        PauseUnit(caster, true);
      }
      animTimer.destroy();
    });
  };

  const oneHit = () => {
    if (!UnitAlive(caster) || !UnitAlive(target)) {
      endSkill();
      return;
    }
    playAttackAnimPulse();

    UnitDamageTarget(
      caster,
      target,
      damagePerHit,
      true,
      false,
      ATTACK_TYPE_HERO(),
      DAMAGE_TYPE_NORMAL(),
      WEAPON_TYPE_WHOKNOWS()
    );

    const tx = GetUnitX(target);
    const ty = GetUnitY(target);
    const cx = GetUnitX(caster);
    const cy = GetUnitY(caster);
    const dx = tx - cx;
    const dy = ty - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 1) {
      const nx = dx / dist;
      const ny = dy / dist;
      SetUnitPosition(target, tx + nx * knockbackDist, ty + ny * knockbackDist);
      SetUnitPosition(caster, cx + nx * selfLungeDist, cy + ny * selfLungeDist);
      SetUnitFacing(caster, Math.atan2(
        GetUnitY(target) - GetUnitY(caster),
        GetUnitX(target) - GetUnitX(caster),
      ) * bj_RADTODEG);
    }

    const hx = GetUnitX(target);
    const hy = GetUnitY(target);
    const sfx = AddSpecialEffect(hitEffect, hx, hy);
    const sfxTimer = Timer.create();
    sfxTimer.start(0.45, false, () => {
      DestroyEffect(sfx);
      sfxTimer.destroy();
    });

    hitsDone++;
  };

  oneHit();
  if (hitsDone >= hitCount) {
    endSkill();
    return;
  }

  attackTimer = Timer.create().start(hitInterval, true, () => {
    if (ended) {
      attackTimer?.destroy();
      attackTimer = undefined;
      return;
    }
    if (!UnitAlive(caster) || !UnitAlive(target)) {
      endSkill();
      return;
    }
    oneHit();
    if (hitsDone >= hitCount) {
      endSkill();
    }
  });
}
