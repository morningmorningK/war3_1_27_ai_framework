/**
 * 护盾 Buff：具有当前值/上限，可被伤害扣减，可选持续时间
 */

import { Buff } from "./Buff";
import { BuffPolarity, BuffTypeId, BUFF_DURATION_PERMANENT } from "./types";
import { resolveShieldEffectStyle } from "./ShieldEffects";
import type { ShieldEffectStyle } from "./ShieldEffects";
import type { CrystalElement } from "../element/reactionTable";
import type { ElementId } from "../stat";

import { elementalShieldAbsorptionEfficiency } from "./ShieldRules";
import type { ElementalShieldElement, ShieldSourceKind } from "./ShieldRules";
export { CRYSTAL_SAME_ELEMENT_EFFICIENCY } from "./ShieldRules";

/** 绑定实际护盾实例，防止嵌套反应换盾后把旧盾倍率应用到新盾。 */
export interface ShieldReaction {
  shieldId: number;
  consumptionMultiplier?: number;
}

export class ShieldBuff extends Buff {
  readonly typeId = BuffTypeId.SHIELD;
  /** 当前护盾值 */
  current: number;
  /** 护盾上限（本 buff 的） */
  readonly max: number;
  readonly effectStyle: ShieldEffectStyle;
  readonly sourceKind: ShieldSourceKind;

  constructor(
    amount: number,
    duration: number = BUFF_DURATION_PERMANENT,
    displayKey?: string,
    effectStyle?: ShieldEffectStyle,
    sourceKind: ShieldSourceKind = "skill"
  ) {
    super(duration, BuffPolarity.BENEFICIAL);
    this.current = amount;
    this.max = amount;
    this.displayKey = displayKey;
    this.effectStyle = effectStyle ?? resolveShieldEffectStyle(displayKey);
    this.sourceKind = sourceKind;
  }

  /**
   * 返回实际挡住的伤害；current 保存基础盾值，与吸收效率分开计算。
   */
  absorbDamage(damage: number, element?: ElementId, consumptionMultiplier?: number): number {
    if (!(damage > 0) || this.current <= 0) return 0;
    const efficiency = 1 / this.damageConsumption(element, consumptionMultiplier);
    const capacity = this.current * efficiency;
    const absorb = Math.min(capacity, damage);
    // 容量用尽时直接置零，避免浮点往返留下极小残盾。
    this.current = damage >= capacity ? 0 : Math.max(0, this.current - absorb / efficiency);
    return absorb;
  }

  protected absorptionEfficiency(_element?: ElementId): number {
    return 1;
  }

  /** 每点被挡伤害消耗的基础盾值；增幅反应覆盖克制盾耗，不相乘。 */
  damageConsumption(element?: ElementId, consumptionMultiplier?: number): number {
    if (consumptionMultiplier !== undefined && Number.isFinite(consumptionMultiplier) && consumptionMultiplier > 0) {
      return consumptionMultiplier;
    }
    return 1 / this.absorptionEfficiency(element);
  }

  /** 是否已耗尽（可被移除） */
  isDepleted(): boolean {
    return this.current <= 0;
  }
}

/** 元素技能盾：明确指定实际元素；外观自动跟随元素，复用结晶承伤与反应。 */
export class ElementalShieldBuff extends ShieldBuff {
  readonly element: ElementalShieldElement;

  constructor(amount: number, duration: number, element: ElementalShieldElement,
    displayKey?: string, sourceKind: ShieldSourceKind = "skill") {
    super(amount, duration, displayKey, element, sourceKind);
    this.element = element;
  }

  protected override absorptionEfficiency(element?: ElementId): number {
    return elementalShieldAbsorptionEfficiency(this.element, element);
  }
}

/** 结晶来源保持独立，元素限制为火 / 水 / 雷 / 冰。 */
export class CrystallizeShieldBuff extends ElementalShieldBuff {
  override readonly element: CrystalElement;

  constructor(amount: number, duration: number, element: CrystalElement) {
    super(amount, duration, element, "crystal_shield_" + element, "crystallize");
    this.element = element;
  }
}
