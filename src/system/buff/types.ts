/**
 * Buff 类型标识，用于叠加规则、驱散等
 */
export const BuffTypeId = {
  /** 护盾（可多来源叠加，按施加顺序吸收伤害） */
  SHIELD: "shield",
  // 可扩展：毒、灼烧、光环等
} as const;

export type BuffTypeId = (typeof BuffTypeId)[keyof typeof BuffTypeId];

/**
 * Buff 正负面
 */
export const enum BuffPolarity {
  /** 正面（增益，如护盾、治疗） */
  BENEFICIAL = 1,
  /** 负面（减益，如毒、眩晕） */
  NEGATIVE = -1,
  /** 中性（如部分光环） */
  NEUTRAL = 0,
}

/**
 * 持续时间语义：负数表示永久（如光环或直到被打破的护盾）
 */
export const BUFF_DURATION_PERMANENT = -1;

/**
 * Buff 列表变化（增删、过期、护盾耗尽移除），载荷 `{ actor: Actor }`
 */
export const BUFF_EVENT_BUFFS_CHANGED = "buff:buffsChanged";
