/**
 * Buff 类型标识，用于叠加规则、驱散等
 */
export const BuffTypeId = {
  /** 护盾（单位最多一个，旧盾剩余值与新盾上限择高，技能盾与结晶盾不叠加） */
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
  /**
   * 元素附着（`todo §2.2`）：目标身上挂的「火 / 水 / 冰…」元素量，用于触发元素反应。
   *
   * ⚠️ **一个单位最多一条**（本轮的简化，见 `ElementalReactionSystem`）——
   * 与上面那些「可以叠好几个来源」的类型不同，附着是**独占**的。
   * 具体是哪个元素看 `ElementalAuraBuff.element`，展示走各自的 `displayKey`（`aura_fire` 等）。
   */
  ELEMENTAL_AURA: "elemental_aura",
  /**
   * 超导（冰 + 雷反应）：**纯属性 Buff** —— 挂一条 `ARMOR` 的负向 `MULTIPLIER -0.4`。
   *
   * ⚠️ **刻意不走 `addXxxBuff` 收口、不过 `applyTenacity`**：削甲是 debuff，
   * **不是控制**（目标照样移动、攻击、施法）。韧性管的是「无法行动」那一类，
   * 把削甲也塞进去会让「带韧性就少削 40% 护甲」这种没有依据的行为出现。
   * 详见 `ReactionBuffs.ts` 文件头。
   */
  SUPERCONDUCT: "reaction_superconduct",
  /**
   * 感电（水 + 雷反应）：本仓**第一个 DoT Buff** —— 4 秒内每秒跳一次范围雷伤。
   *
   * 同上，不走韧性收口（持续伤害不吃韧性）。
   */
  ELECTRO_CHARGED: "reaction_electro_charged",
  /**
   * 激化（草 + 雷反应）：目标**受到的雷 / 草伤害增加**，6 秒。
   *
   * 全仓第一条挂在**元素易伤**（`elemVulnStat`）上的来源 —— 那个属性块是 2026-10-08
   * 为它新开的（「受到的某元素伤害增加」用抗性 / 出伤加成两条路都表达不出来，
   * 见 `stat/types.ts` 的 `ELEM_VULN_BASE`）。
   *
   * 同上，不走韧性收口（增伤不是控制）。
   */
  QUICKEN: "reaction_quicken",
  /**
   * 燃烧（草 + 火反应）：草附着被一次性吃光，转成一段**只打主目标**的持续火伤。
   *
   * ⚠️ 与感电那两条 DoT 有一处**本质不同**：感电/超导/绽放的受害者是「施法者的敌人」，
   * 自测里自己打自己**恒为空**；燃烧每跳打的就是**宿主本人**。所以自测里
   * 忘了清它，`BuffSystem` 会在用例返回后抢跑一跳、把陪练单位打伤甚至打死
   * （见 `ElementAuraTestExample` 的 `clearReactionBuffs`）。
   *
   * 同上，不走韧性收口（持续伤害不是控制）。
   */
  BURNING: "reaction_burning",
  // 可扩展：毒、光环等
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
