/**
 * 冻结（控制效果）—— 与 `StunBuff` **同一条线**（`PauseUnit`），但多一个「碎冰」出口。
 *
 * ## 和眩晕的关系：共享开关，不共享身份
 *
 * 冻结和眩晕在**原生层是同一个动作**（`PauseUnit(u, true)`），差别只在于冻结能被
 * 「打碎」（`FreezeShatterSystem` 订阅伤害事件，够疼的一击会提前结束冻结并炸一次冰爆）。
 *
 * 所以本类刻意**不继承 `StunBuff`**：两者的 `typeId` 不同正是碎冰的判据
 * （只碎 `FREEZE`、不碎 `STUN`），继承会诱使人写 `instanceof StunBuff` 那种判据，
 * 一改就错。共用的部分（`PauseUnit` 的那对开关 + 守卫）**照抄**，不抽象。
 *
 * ## ⚠️ 与 `StunBuff` 唯一的**行为**差异：`pauseControl` 标志 + 守卫跨类型
 *
 * 两个类都覆写 `readonly pauseControl = true`，`onRemove()` 都走
 * `BuffManager.hasPauseControl()`。这样一来：
 *
 *   - 眩晕 + 冻结同时在身上时，**先到期的那个不会把另一个的暂停解开**；
 *   - 将来加第三个暂停类控制（击飞、恐惧）只需覆写标志。
 *
 * 这是**修掉一个既有 bug**：`StunBuff.onRemove()` 原来只数 `BuffTypeId.STUN`，
 * 冻结一旦也用 `PauseUnit`，眩晕先到期就会把仍在生效的冻结一起放开。
 *
 * ## 代价（与眩晕相同的两条，照抄在这里免得回头找）
 *
 *   - `PauseUnit` 冻住动画，除了 buff 栏那个图标没有别的视觉提示；
 *   - **原生控制技能吃不到韧性，这是设计**（见 `StunBuff.ts` 文件头）。
 *
 * ## 已知限制
 *
 * `movement.ts` 的 `lockUnit`/`unlockUnit` 也调 `PauseUnit`，`hasPauseControl()`
 * **盖不住它们** —— `PauseUnit` 没有「谁暂停的」这个概念。同 `StunBuff`。
 */

import { Buff } from "./Buff";
import { BuffPolarity, BuffTypeId } from "./types";
// ⚠️ **必须是 `import type`** —— 同 `StunBuff`，写成值导入会多一条
// `actor → BuffManager → FreezeBuff → actor` 的 require 环。
import type { Actor } from "../actor";

export class FreezeBuff extends Buff {
  readonly typeId = BuffTypeId.FREEZE;

  /**
   * **声明「我占着 `PauseUnit` 这一位」** —— 唯一消费者是
   * `BuffManager.hasPauseControl()`，由 `onRemove()` 的守卫读。
   *
   * ⚠️ 漏写这一行的后果是**静默**的：眩晕和冻结叠在一起时，先到期的那个会把
   * 另一个的暂停解开，单位提前能动，且不报任何错。
   */
  readonly pauseControl = true;

  /** 被冻结的单位。只能构造注入 —— `onApply()` / `onRemove()` 都不带参数。 */
  private readonly target: Actor;

  constructor(target: Actor, duration: number) {
    // `NEGATIVE` → buff 栏显示成红色（`BuffBarUI.buffCategoryColor`）
    super(duration, BuffPolarity.NEGATIVE);
    this.target = target;
  }

  onApply(): void {
    const u = this.target.handle;
    // 悬垂句柄守卫，判据同 `StunBuff`（`GetUnitTypeId(u) === 0`）
    if (u === undefined || GetUnitTypeId(u) === 0) {
      return;
    }
    // **先 stop 再暂停，顺序不能反** —— 完整理由见 `StunBuff.onApply()`：
    // 暂停不保证清命令队列，不 stop 的话解冻后单位会接着走原来那条路。
    IssueImmediateOrder(u, "stop");
    PauseUnit(u, true);
  }

  /**
   * 移除时解除暂停 —— 三条移除路径都汇到 `BuffManager.detach()`，所以只需要写在这一处。
   *
   * ⚠️ **守卫必须跨类型**（`hasPauseControl()` 而不是数 `FREEZE`）：理由见文件头。
   * 它成立的前提同样是「`BuffManager` 各移除路径都**先 `splice` 再 `detach`**」，
   * 所以数到的是**除自己之外**还剩几个占着暂停位的。
   *
   * 死亡清理（`clearAll()`）也会走到这里，此时句柄仍然有效 —— 刻意的：
   * 暂停位会跟着尸体留到复活，不清掉的话复活的单位会卡在被暂停状态。
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
