/**
 * Buff 类型标识，用于叠加规则、驱散等
 */
export const BuffTypeId = {
  /** 护盾（可多来源叠加，按施加顺序吸收伤害） */
  SHIELD: "shield",
  /** 治疗加成（测试技能 `A012`）：放大受疗方被治疗到的量 */
  HEAL_BONUS: "skill_heal_bonus",
  /** 吸血（测试技能 `A010`）：按物理伤害的实际扣血量回复自身 */
  LIFESTEAL: "skill_lifesteal",
  /**
   * 眩晕（测试技能 `A014`）：`PauseUnit` 控制效果，时长受目标「韧性」缩短。
   *
   * **本仓第一个负面 Buff** —— `BuffPolarity.NEGATIVE` 在此之前定义了却没人用，
   * 带它的 buff 在 buff 栏上会显示成红色（`BuffBarUI.buffCategoryColor`）。
   */
  STUN: "skill_stun",
  /**
   * 减速（测试技能 `A015`）：**纯属性 Buff** —— 只挂一条 `MOVE_SPEED` 的负向
   * `MULTIPLIER`，不碰任何原生调用。单位照常攻击、施法。
   */
  SLOW: "skill_slow",
  /**
   * 禁锢（测试技能 `A016`）：**纯属性 Buff**，把移速乘区归零。
   *
   * ⚠️ 它和眩晕的区别不是「谁更狠」，而是**走哪条路**：移速归零只挡寻路移动，
   * 单位仍能攻击施法；要连操作一起禁掉只能靠 `PauseUnit`（那是 `StunBuff` 那条线）。
   */
  ROOT: "skill_root",
  /**
   * 冻结（测试技能 `A017`）：`PauseUnit` 控制效果（与 `STUN` 同一条线），
   * 时长受目标「韧性」缩短。
   *
   * ⚠️ **与 `STUN` 是同一个原生开关，但是两个不同的 typeId** —— 这不是重复：
   * 两者的图标/文案/表现不同，而且**碎冰要靠它区分**（`FreezeShatterSystem` 只碎
   * `FREEZE`，不碎 `STUN`：把敌人的眩晕一并「打碎」显然不是要的）。
   *
   * 也正因为共用 `PauseUnit`，才必须引入 `Buff.pauseControl` 标志 —— 见那里的注释。
   */
  FREEZE: "skill_freeze",
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
