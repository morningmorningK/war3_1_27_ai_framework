/**
 * 眩晕（控制效果）—— 本仓第一个**负面** Buff，也是「控制效果」这条线的样板。
 *
 * ## 设计路线：所有控制都用模拟，不用原生控制技能
 *
 * **后面做的每一个控制效果（沉默、缠绕、减速、击飞、恐惧…）都照这套来**：
 * 一个 `Buff` 子类 + 在 `onApply()` / `onRemove()` 里调原生开关。
 *
 * 为什么：原生控制的**剩余时长没有任何 API 可读、可改**（只有 `UnitRemoveBuffsEx`
 * 那种硬清除，没有「按比例缩短」），时长、层数、免疫、驱散全由引擎说了算，
 * 和属性系统（韧性、控制强度…）接不上。放进我们自己的 `Buff` 里就全部可控 ——
 * `PauseUnit(u, true/false)` 正好是一对开关，时长由 `Buff` 生命周期决定。
 *
 * 代价（已知，**接受**）：
 *
 *   - `PauseUnit` 只是**冻结**单位，会冻住动画 —— 除了 buff 栏那个图标，
 *     没有「头顶转圈」这类视觉提示。要补得自己上 `AddSpecialEffectTarget`。
 *   - **原生控制技能吃不到韧性。这是设计，不是遗漏** ——
 *     别再去找 `DzSetUnitAbilityDuration` 那条路。
 *
 * ## 宿主从哪来
 *
 * `Buff.onApply()` / `onRemove()` **都不带参数**（`Buff.ts:86,89`），所以宿主只能
 * 在**构造函数里注入**。没有改基类签名 —— 那两个无参钩子是全仓所有 buff 子类
 * 的共同约定，为了一个眩晕去改它，爆炸半径太大。
 */

import { Buff } from "./Buff";
import { BuffPolarity, BuffTypeId } from "./types";
// ⚠️ **必须是 `import type`** —— `Actor` 在这里只当类型用（存成字段、读 `.handle`），
// tstl 会把这一行整个擦掉。写成值导入会多一条
// `actor → BuffManager → StunBuff → actor` 的 require 环。
import type { Actor } from "../actor";

export class StunBuff extends Buff {
  readonly typeId = BuffTypeId.STUN;

  /**
   * **声明「我占着 `PauseUnit` 这一位」** —— 唯一消费者是
   * `BuffManager.hasPauseControl()`，由 `onRemove()` 的守卫读。
   *
   * ⚠️ 这一个字段是 2026-10-06 加冻结时补的，**它修的是一个既有 bug**：
   * 守卫原先只数 `BuffTypeId.STUN`，而冻结（`FreezeBuff`）也用同一个 `PauseUnit`，
   * 于是「眩晕 + 冻结同时在身上、眩晕先到期」会把仍在生效的冻结一起放开。
   * 完整的来龙去脉见 `FreezeBuff.ts` 文件头。
   */
  readonly pauseControl = true;

  /** 被眩晕的单位。只能构造注入，理由见文件头。 */
  private readonly target: Actor;

  constructor(target: Actor, duration: number) {
    // `NEGATIVE` 不只是个标记：`BuffBarUI.buffCategoryColor` 按它上色，
    // 所以「眩晕 buff 到底挂上没有」在 buff 栏上是**看得见**的（红色）。
    super(duration, BuffPolarity.NEGATIVE);
    this.target = target;
  }

  onApply(): void {
    const u = this.target.handle;
    // 悬垂句柄守卫。用 `GetUnitTypeId(u) === 0` 而**不是** `Actor.isHandleAlive` ——
    // 后者是 private static 取不到；而且本仓「句柄是否还能用」的既成判据就是这个
    // （`CooldownReductionSystem.ts:170`、`actor.ts:297`、`BuffBarTestExample.ts:56`）。
    // 在已回收的句柄上调原生是 1.27a 的闪退来源之一。
    if (u === undefined || GetUnitTypeId(u) === 0) {
      return;
    }
    // **先 stop 再暂停，顺序不能反**：暂停会冻住单位，但不保证清掉它的命令队列 ——
    // 不 stop 的话，解除眩晕后它会接着走原来那条路。而已经暂停的单位可能不再接受
    // 新命令，所以 stop 必须在 `PauseUnit(true)` 之前。
    IssueImmediateOrder(u, "stop");
    PauseUnit(u, true);
  }

  /**
   * 移除时解除暂停。
   *
   * ## 三条移除路径都会走到这里
   *
   * `BuffManager.detach()` 是 `removeBuff` / `clearAll` / `tick` 到期 /
   * `Actor.detach()`（死亡清理）四条路的共同收口，所以解除暂停只需要写在**这一处**。
   *
   * ## ⚠️ 叠层守卫：`PauseUnit` 是**布尔位，不是引用计数**
   *
   * 无条件 `PauseUnit(u, false)` 会连别人的暂停一起放开。两层眩晕叠着时（先挂 5 秒、
   * 再挂 3 秒），5 秒那层先到期，一解除就把还在生效的 3 秒那层打断 —— 眩晕提前结束。
   *
   * 解法是「还有别的家伙占着暂停位就先不解」，判据是 `BuffManager.hasPauseControl()`。
   *
   * **判据必须跨类型**（只数 `STUN` 是不够的）：冻结（`FreezeBuff`）用的是同一个
   * `PauseUnit`，眩晕先到期时若只看 `STUN`，会把仍在生效的冻结一起放开 ——
   * 这正是 2026-10-06 加冻结时修掉的那个 bug。两个类都靠覆写 `pauseControl`
   * 声明自己占位，见 `Buff.ts` 那个字段的注释。
   *
   * 它成立的前提是 **`BuffManager` 三条移除路径都是「先 `splice` 再 `detach`」**
   * （`BuffManager.ts:144` 那段注释写明了这条约定，各调用方负责先把实例从
   * `this.buffs` 里拿掉）—— 所以这里数到的是「**除自己之外**还剩几个」。
   * **那条约定要是被改反了，眩晕会永远解不开。**
   *
   * ## 已知限制（本轮不修）
   *
   * 引擎或别的模块（过场、`movement.ts` 那套 lock/unlock）用 `PauseUnit` 暂停时，
   * 我们的最后一次眩晕结束会把它一并放开 —— `PauseUnit` 没有「谁暂停的」这个概念，
   * 干净地区分需要额外维护 per-actor 状态 + `IsUnitPaused` 记录进入前的状态。
   *
   * ## 死亡时**照样**要解除
   *
   * 死亡清理（`actor.detach()` → `buffManager.clearAll()`）也会走到这里，此时句柄
   * **仍然有效**（尸体还在），所以下面的守卫不会拦它 —— 这是刻意的：
   * 暂停位会跟着尸体留到复活，不清掉的话复活的单位会卡在被暂停状态
   * （`UnitEventExample.ts` 那套 debug 脚手架就有 1 秒后 revive）。
   */
  onRemove(): void {
    const u = this.target.handle;
    if (u === undefined || GetUnitTypeId(u) === 0) {
      return;
    }
    if (this.target.buffManager.hasPauseControl()) {
      return;
    }
    PauseUnit(u, false);
  }
}
