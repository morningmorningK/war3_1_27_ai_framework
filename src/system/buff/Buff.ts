/**
 * Buff 基类
 * 考虑：持续时间（-1 为永久）、正负面、施加者、挂在谁身上（holderId）
 */

import { BuffPolarity, BUFF_DURATION_PERMANENT } from "./types";

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
  /** 正面 / 负面 / 中性 */
  readonly polarity: BuffPolarity;
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

  /** 施加到单位时回调（子类可覆写） */
  onApply(): void {}

  /** 从单位移除时回调（子类可覆写） */
  onRemove(): void {}
}
