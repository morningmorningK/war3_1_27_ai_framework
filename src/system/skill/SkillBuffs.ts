/**
 * 测试技能产出的**限时属性 Buff**。
 *
 * 这两个 Buff（`A012` 治疗加成 / `A010` 吸血）除了「改一项属性、到点自动消失」之外
 * 什么都不做，所以整个类是**纯声明**：
 *
 *   - **生命周期不用自己管** —— `BuffSystem` 那个 0.1s 的全局定时器会 tick 每个
 *     `BuffManager`，`isExpired()` 一到就把 Buff 摘掉（连同它挂在属性表上的那组修正器）。
 *     所以技能 handler 里只要 `addBuff` 一句，**没有配对的手动移除**。
 *   - **属性修正器不用自己算** —— 覆写 `getStatModifiers()` 返回一组 `StatMod`，
 *     `BuffManager.addBuff()` 会补上「这是 buff 来源 + buff 实例 id」再挂上属性表。
 *
 * ## ⚠️ 必须用 `StatModKind.FLAT`，不能用 `PERCENT`
 *
 * `LIFESTEAL` / `HEAL_BONUS` 这两项属性的 **base 恒为 0**（它们没有原生对应物，
 * 不像攻击力那样能从 `GetUnitState` 快照到一个初值）。而 `PERCENT` 的语义是
 * **乘在 base 上** —— 乘 0 永远是 0。用 `PERCENT` 写出来的 buff 会「挂上了、图标在、
 * 面板上也显示 0%」，游戏里毫无反应（`stat/types.ts` 文件头约束 2、
 * memory `wc3-zero-base-stat-invisible`）。
 *
 * 这两项属性本来就是**百分比量纲**（吸血率、治疗加成率），所以 `FLAT` 加进去的
 * 就直接是百分点：`1.0` = +100%。
 *
 * ## 图标
 *
 * 全部用**内置贴图**（本轮不做美术）。路径都核对过确实存在 ——
 * 是从 `dev_lib/w3x2lni/template/Custom/ability.ini` 里已有的 `Art = ` 行抄来的，
 * 不是自己拼的字符串（拼错的路径不会报错，只会画出一个空白格子）。
 */

import { Buff, BuffPolarity, BuffTypeId, registerBuffDisplay } from "src/system/buff";
import { StatMod, StatModKind, StatType } from "src/system/stat";

/**
 * 治疗加成幅度：**+100%**。
 *
 * 写法是 `1.0` 而不是 `100` —— 属性的量纲是「率」，`HEAL_BONUS = 1` 表示治疗量翻倍
 * （消费者在 `HealSystem.applyHeal`：`base * (1 + rate)`）。
 */
export const HEAL_BONUS_RATE = 1.0;

/**
 * 治疗加成的持续时间（秒）。
 *
 * 数值放在 TS 常量里而不是读物编的 `DataA`：技能基类的 `DataA..F` 语义按基类分，
 * 从 TS 读回来还得自己解析，本轮先不引入那层。调数值改这里。
 */
export const HEAL_BONUS_DURATION = 10;

/**
 * 治疗加成：让目标一段时间内受到的治疗量被放大。
 *
 * 「受到的治疗」而不是「造成的治疗」—— `applyHeal()` 读的是**受疗方**的属性表
 * （见 `HealSystem` 的取表那一步），所以这个 Buff 挂谁身上就放大谁被奶的量。
 * 这和绝大多数游戏的口径一致（治疗加成是防御向属性），也是本轮的既定设计。
 */
export class HealBonusBuff extends Buff {
  readonly typeId = BuffTypeId.HEAL_BONUS;

  constructor(duration: number) {
    super(duration, BuffPolarity.BENEFICIAL);
  }

  getStatModifiers(): StatMod[] {
    return [
      {
        stat: StatType.HEAL_BONUS,
        kind: StatModKind.FLAT,
        value: HEAL_BONUS_RATE,
      },
    ];
  }
}

/**
 * 吸血率加成：**+100%**。
 *
 * 「先挂上、再打人」才看得到效果 —— **本步只把属性挂上去，吸血逻辑在下一步**
 * （`LifestealSystem`）。这是刻意的切分：本步的验收标准是「属性到没到位」，
 * 打人回不回血是另一件事，两件混在一起验，出问题时分不清是哪一半。
 */
export const LIFESTEAL_RATE = 1.0;

/** 吸血的持续时间（秒） */
export const LIFESTEAL_DURATION = 5;

/**
 * 吸血：让**自己造成的物理伤害**按实际扣血量回复自身生命。
 *
 * ⚠️ 这里只声明「吸血率 +100%」，**不含任何吸血动作** —— 回血发生在
 * `LifestealSystem` 订阅的伤害事件里（它读的正是这个属性）。
 * Buff 只管属性，是刻意的分工：属性到期自动还原，比在 buff 里写一个
 * 「到期时把之前吸的血退回去」要可靠得多（那种写法根本说不通）。
 */
export class LifestealBuff extends Buff {
  readonly typeId = BuffTypeId.LIFESTEAL;

  constructor(duration: number) {
    super(duration, BuffPolarity.BENEFICIAL);
  }

  getStatModifiers(): StatMod[] {
    return [
      {
        stat: StatType.LIFESTEAL,
        kind: StatModKind.FLAT,
        value: LIFESTEAL_RATE,
      },
    ];
  }
}

/**
 * 「神圣护盾」（`A013`）那个护盾 buff 的展示 key。
 *
 * ⚠️ **不能直接用 `BuffTypeId.SHIELD`** —— 那是**所有**护盾 buff 共用的类型 id
 * （`registerDefaultBuffDisplays()` 已经拿它注册了通用的「护盾」），
 * 拿它注册会把通用护盾的展示一起覆盖掉。自定义 key 只作用在这一个 buff 上：
 * `resolveBuffDisplay()` 先查 `buff.displayKey`，查不到才回退 `typeId`。
 *
 * 定义在这里而不是 `TestSkills.ts` 里：`SkillBuffs` 不 import `TestSkills`，
 * 反过来写会成循环依赖。常量跟着注册它的函数走，方向也就只有一个。
 */
export const DIVINE_SHIELD_DISPLAY_KEY = "divine_shield";

/**
 * 注册技能 Buff 的展示信息（buff 栏上的名字、悬停 Tips、图标）。
 *
 * ⚠️ **必须在 `BuffBarUI.getInstance().create()` 之后调** —— 那个 `create()` 里会
 * `registerDefaultBuffDisplays()` 先注册内置那一批。两边的 key 不重叠、晚注册也追得上
 * （渲染时才查表），排这个顺序只是让「内置的先、本仓的后」读起来清楚。
 *
 * 幂等：`registerBuffDisplay` 就是 `Map.set`，重复调只是覆盖同一个值。
 */
export function registerSkillBuffDisplays(): void {
  registerBuffDisplay(BuffTypeId.HEAL_BONUS, {
    name: "治疗加成",
    description: "受到的治疗量提高 100%。",
    icon: "ReplaceableTextures\\CommandButtons\\BTNHealingSalve.blp",
  });
  registerBuffDisplay(BuffTypeId.LIFESTEAL, {
    name: "吸血",
    description: "造成的物理伤害按实际扣血量回复自身生命，吸血率 +100%。",
    icon: "ReplaceableTextures\\CommandButtons\\BTNPotionOfVampirism.blp",
  });
  registerBuffDisplay(DIVINE_SHIELD_DISPLAY_KEY, {
    name: "神圣护盾",
    // 描述**不写死数值** —— 带着「守护护符」时实际是 150，写死 100 会撒谎。
    // 确切数字由 `buildBuffTooltipText` 自动追加的「护盾：150 / 150」给。
    description: "吸收伤害，持续 10 秒；护盾耗尽或时间结束时消失。",
    icon: "ReplaceableTextures\\CommandButtons\\BTNDivineIntervention.blp",
  });
  // 下面三条是**负面 buff** 的展示。和上面几条不同，这里的 key 都是 `typeId` 本身
  // —— `STUN` / `SLOW` / `ROOT` 各自只有一个来源（`StunBuff` / `SlowBuff` / `RootBuff`），
  // 不像 `SHIELD` 那样是共享类型 id，所以不需要 `DIVINE_SHIELD_DISPLAY_KEY` 那种自定义 key。
  // 三条都靠 `NEGATIVE` 极性在 buff 栏上显示成**红色**（`BuffBarUI.buffCategoryColor`）。
  registerBuffDisplay(BuffTypeId.STUN, {
    name: "眩晕",
    // 描述**不写死秒数** —— 带着「坚定护符」时实际是 2.5 秒，写死 5 会撒谎。
    // 确切数字由 `buildBuffTooltipText` 自动追加的「剩余时间：x 秒」给。
    description: "无法移动、攻击或施法，持续时间结束时自动解除。",
    icon: "ReplaceableTextures\\CommandButtons\\BTNStun.blp",
  });
  registerBuffDisplay(BuffTypeId.SLOW, {
    name: "减速",
    // 描述**不写死秒数**（同 `STUN`）：韧性会把它砍短。
    // 数值 50% 是写死的 —— 那是 `SLOW_MULTIPLIER` 的固定语义，不会被任何属性改。
    description: "移动速度降低 50%，但仍可攻击与施法。",
    icon: "ReplaceableTextures\\CommandButtons\\BTNSlowOn.blp",
  });
  registerBuffDisplay(BuffTypeId.ROOT, {
    name: "禁锢",
    description: "无法移动，但仍可攻击与施法。",
    icon: "ReplaceableTextures\\CommandButtons\\BTNEntanglingRoots.blp",
  });
  registerBuffDisplay(BuffTypeId.FREEZE, {
    name: "冻结",
    // 描述里**要提碎冰**：这是冻结与眩晕唯一的行为差异，玩家只从图标上看不出来。
    // 秒数仍不写死（韧性会改它，碎冰还会让它提前结束）。
    description: "无法移动、攻击或施法；受到超过最大生命 15% 的伤害时会提前碎裂并炸出冰爆。",
    icon: "ReplaceableTextures\\CommandButtons\\BTNGlacier.blp",
  });
}
