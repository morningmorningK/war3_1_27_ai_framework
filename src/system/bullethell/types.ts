export enum SpellCardId {
  RING_BURST = 1,
  DUAL_SPIRAL = 2,
  FAN_PULSE = 3,
  ROSE_BLOOM = 4,
  ECHO_FAN = 5,
  LATTICE_SPIN = 6,
}

export interface StartSpellCardOptions {
  duration?: number;
  emissionInterval?: number;
  baseSpeed?: number;
  bulletLife?: number;
  bulletRadius?: number;
  bulletDamage?: number;
  maxDistance?: number;
}

export interface SpellCardEmitterState {
  id: number;
  active: boolean;
  caster: unit;
  cardId: SpellCardId;
  duration: number;
  elapsed: number;
  emissionInterval: number;
  emissionElapsed: number;
  baseSpeed: number;
  bulletLife: number;
  bulletRadius: number;
  bulletDamage: number;
  maxDistance: number;
  phase: number;
  wave: number;
}

export interface BulletState {
  id: number;
  active: boolean;
  activeSlot: number;
  owner: unit | undefined;
  cardId: SpellCardId;
  x: number;
  y: number;
  z: number;
  startX: number;
  startY: number;
  vx: number;
  vy: number;
  life: number;
  elapsed: number;
  radius: number;
  damage: number;
  maxDistanceSq: number;
}

export interface ImpactState {
  active: boolean;
  life: number;
  elapsed: number;
}

export interface BulletSystemStats {
  activeBullets: number;
  activeEmitters: number;
  totalSpawned: number;
  totalDropped: number;
  totalHit: number;
  totalRecycled: number;
}
