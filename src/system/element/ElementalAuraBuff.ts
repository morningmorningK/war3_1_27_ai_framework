/**
 * 元素附着 Buff —— 目标身上挂的一份「元素量」（`todo §2.2` 附着骨架）。
 *
 * ## 核心取舍：元素量映射到基类的 `duration` / `elapsed`，零覆写
 *
 * ```
 * duration = 初始元素量 / AURA_DECAY_PER_SECOND        // 1U → 7.5s、2U → 15s、4U → 30s
 * gauge    = 初始元素量 × (1 - elapsed / duration)      // 线性、无漂移
 * ```
 *
 * 好处一次拿到三样：
 *   1. **过期判定免费** —— 元素量归零 ⟺ `elapsed >= duration` ⟺ 基类 `isExpired()`
 *      自己就为真。不用覆写 `tick()` / `isExpired()`（覆写反而要自己再维护一套判定，
 *      和基类各算各的，迟早对不上）。
 *   2. **UI 倒计时天然同一个数** —— buff 栏那根时间条读的就是 `elapsed / duration`，
 *      而 `gauge` 是同一个比值推出来的，两者**不可能**对不上。
 *   3. **消耗 = 推进 `elapsed`** —— `consume()` 一行，不需要额外的字段。
 *
 * ## ⚠️ 两条硬约束
 *
 *   - **不覆写 `getStatModifiers()`**（默认 `[]`）：`BuffManager.applyStatMods()` 对空
 *     修正器会**提前 return**，完全不碰属性表。附着**不许带属性修正器** ——
 *     否则一次命中里后续的伤害段会读到「中途被改过」的属性（`statsFor` 的快照会漂），
 *     且原生要等 0.1s 才写回，两边不一致。
 *   - **消耗到 0 必须由调用方（`ElementalReactionSystem`）同步 `removeBuff`** ——
 *     不能等 `BuffSystem` 每 0.1s 的 `tick` 清理。伤害回调是**同步**的，
 *     扣空的附着在窗口内仍会被 `resolve` 查到（`gauge <= 0`），导致同一发重复判定反应。
 */

import { Buff } from "src/system/buff/Buff";
import { BuffPolarity, BuffTypeId } from "src/system/buff/types";
import { ElementId } from "src/system/stat";
import { AURA_DECAY_PER_SECOND } from "./reactionTable";

export class ElementalAuraBuff extends Buff {
  readonly typeId = BuffTypeId.ELEMENTAL_AURA;

  /** 挂的是哪个元素 */
  readonly element: ElementId;

  /** 初始元素量（U）。`gauge` 由它与 `elapsed/duration` 推出，不单独存 */
  readonly initialGauge: number;

  /**
   * 同一次伤害派发的身份 token（就是那次结算的 `DamageContext`）。
   *
   * 用途只有一个：**防止「同一发打出的两种元素互相反应」**。一次命中里若先挂了火、
   * 再挂水，第二次判定会看到「目标身上有火附着」—— 但那是**这一发自己刚挂的**，
   * 不该触发蒸发。判定时跳过 `attachedBy === 本次派发` 的附着即可。
   */
  attachedBy: object | undefined;

  constructor(element: ElementId, gauge: number) {
    // duration 必须在 super() 里给，所以 `element` / `initialGauge` 在 super 之后再赋。
    // `gauge` 由系统保证 > 0（0 会让 duration = 0 → 除零）。
    super(gauge / AURA_DECAY_PER_SECOND, BuffPolarity.NEUTRAL);
    this.element = element;
    this.initialGauge = gauge;
    this.displayKey = "aura_" + element;
  }

  /** 当前剩余元素量（U），线性衰减 */
  get gauge(): number {
    if (this.duration <= 0) {
      return 0;
    }
    const remain = this.initialGauge * (1 - this.elapsed / this.duration);
    return remain > 0 ? remain : 0;
  }

  /**
   * 消耗元素量（反应扣附着）。**只推进 `elapsed`** —— 推进多少就等于扣了多少元素量。
   *
   * 扣到 0 之后 `isExpired()` 为真，但**本类不负责移除自己**：由调用方同步 `removeBuff`
   * （见文件头第二条硬约束）。
   */
  consume(amount: number): void {
    if (amount <= 0) {
      return;
    }
    this.elapsed += amount / AURA_DECAY_PER_SECOND;
  }
}
