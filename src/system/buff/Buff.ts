/**
 * Buff 基类
 * 考虑：持续时间（-1 为永久）、正负面、施加者、挂在谁身上（holderId）
 */

import { BuffPolarity, BUFF_DURATION_PERMANENT } from "./types";
import type { StatMod } from "../stat/types";

let nextBuffId = 1;

export abstract class Buff {
  /** 实例 id，用于移除与调试 */
  readonly id: number;
  /** 类型标识，用于叠加/驱散等（如 BuffTypeId.SHIELD） */
  abstract readonly typeId: string;
  /**
   * 展示键（可选）：用于 UI 图标/文案区分。
   * 例如多个技能都产出 shield 类型时，可分别设置为 shield_fire / shield_ice。
   */
  displayKey?: string;
  /** 挂载单位 id（由 BuffManager 设置） */
  holderId: number = 0;
  /** 剩余持续时间（秒），BUFF_DURATION_PERMANENT 表示永久 */
  duration: number;
  /** 已经过时间（秒） */
  elapsed: number = 0;
  /**
   * 叠加层数（默认 1）。
   *
   * ⚠️ 基类**只负责携带与展示**，不会自动增减 —— 叠层语义（攻击叠层、损血叠层、
   * 装备被动等）由各自的施加方在业务里写 `stacks`。UI 在图标右下角显示它。
   */
  stacks: number = 1;
  /** 叠层上限（可选）。未设置表示无上限 */
  maxStacks?: number;
  /** 正面 / 负面 / 中性 */
  readonly polarity: BuffPolarity;
  /**
   * 本 Buff 是否通过 `PauseUnit` **占用着宿主的暂停位**。默认 `false`。
   *
   * ## 为什么需要这个标志
   *
   * `PauseUnit(u, false)` 是**一个布尔位，没有引用计数** —— 谁都能解开别人的暂停。
   * 所以「移除时要不要解除暂停」这个判断，必须知道**场上还有没有别的家伙也占着这一位**。
   *
   * 原先 `StunBuff.onRemove()` 是自己数 `getBuffsByType(BuffTypeId.STUN)` 的，
   * 那在只有眩晕一个暂停类的时候是对的，**加进冻结之后就错了**：
   * 单位同时被眩晕 + 冻结时，眩晕先到期 → 数 `STUN` 数到 0 → 解除暂停 →
   * **冻结还在生效，单位已经能动了**。
   *
   * 改成让 buff 自己声明「我占不占暂停位」，判断交给 `BuffManager.hasPauseControl()`。
   * 将来加第三个暂停类控制（击飞、恐惧）只需覆写这一个字段，`BuffManager` 一行都不用动。
   *
   * ⚠️ **只声明「我用 `PauseUnit`」**，不要往里塞别的语义（比如「我禁止攻击」）——
   * 那个判断的唯一消费者是暂停位守卫。
   */
  readonly pauseControl: boolean = false;
  /** 施加者单位 id，可选 */
  sourceId: number = 0;

  constructor(
    duration: number = BUFF_DURATION_PERMANENT,
    polarity: BuffPolarity = BuffPolarity.BENEFICIAL
  ) {
    this.id = nextBuffId++;
    this.duration = duration;
    this.polarity = polarity;
  }

  /** 是否已过期（仅当 duration >= 0 时检查） */
  isExpired(): boolean {
    if (this.duration < 0) return false;
    return this.elapsed >= this.duration;
  }

  /** 每帧/周期 tick，delta 为秒 */
  tick(delta: number): void {
    if (this.duration < 0) return;
    this.elapsed += delta;
  }

  /**
   * 本 Buff 提供的属性修正器。**默认空** —— 不加属性的 Buff（护盾、纯特效）不用覆写。
   *
   * 覆写者只管写「哪个属性、怎么加、加多少」，**不用填来源标记** ——
   * `BuffManager` 挂载时会补上「这是 buff 来源」和 buff 的实例 id。
   *
   * ## 两条容易踩的
   *
   * 1. **返回值表达的是「按当前 `stacks` 算出来的一整组」**，不是增量。
   *    `BuffManager` 是整体替换着挂的（`setSource`），所以叠层变了要按新层数重算整组
   *    再重挂一次 —— 改完 `stacks` 记得调 `owner.buffManager.refreshStatMods(this)`，
   *    否则属性停在旧层数的值上，**不报错、只是数值不对**。
   *
   * 2. **本身就是百分比的属性（暴击率、冷却缩减……）base 是 0，要用 `FLAT` 加百分点**。
   *    用 `PERCENT` 乘在 0 上没有任何效果，见 `stat/types.ts` 文件头约束 2。
   *
   * ⚠️ 挂上之后**属性还没写回原生**（要等 `StatSystem` 下一拍，最多 0.1s）。
   * `onApply()` 里若需要读到最新的原生属性，得自己显式冲刷一次。
   */
  getStatModifiers(): StatMod[] {
    return [];
  }

  /** 施加到单位时回调（子类可覆写） */
  onApply(): void {}

  /** 从单位移除时回调（子类可覆写） */
  onRemove(): void {}
}
