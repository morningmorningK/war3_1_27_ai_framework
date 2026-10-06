/**
 * 控制效果线里**走属性系统**的那两个：减速（`A015`）、禁锢（`A016`）。
 *
 * ## 这条线的分工
 *
 * | 效果 | 走哪条路 | 单位还能做什么 |
 * |---|---|---|
 * | 减速 / **禁锢**（本文件） | `MOVE_SPEED` 的负向 `MULTIPLIER` | **照常攻击、施法** |
 * | 眩晕 / 冻结（`StunBuff.ts` / `FreezeBuff.ts`） | `PauseUnit` | 什么都做不了 |
 *
 * 这个差别不是「谁更狠」，而是**两项原生能力各自管什么**：
 * `SetUnitMoveSpeed` 只影响寻路移动，`PauseUnit` 才禁操作。所以
 * 「不能移动但仍能打人」这种效果，**只能用移速做** —— 暂停会连攻击一起禁掉。
 *
 * ## 为什么是 `MULTIPLIER`，不是 `PERCENT`，更不是直接调原生
 *
 * `StatSheet.recalc()` 的公式是
 * `final = (base * (1 + ΣPERCENT) + ΣFLAT) * Π(1 + MULTIPLIER)`，三条路各自的后果：
 *
 *   - **直接 `SetUnitMoveSpeed(u, 0)`**：和 `StatSheet.flush()` 的写回**抢同一条通道**
 *     （`StatSheet.ts` 的 `case StatType.MOVE_SPEED` 就是调它）。更要命的是叠层要自己
 *     存 / 恢复 `savedSpeed` —— `unit/skills/movement.ts` 那种「开闭配对」写法对
 *     buff 不成立：buff 有四条移除路径（`removeBuff` / `clearAll` / 到期 / 护盾耗尽），
 *     漏一条就是永久移速异常。
 *   - **`PERCENT = -1`**：`PERCENT` **只乘 base**。单位身上只要有「+20% 移速」这类来源，
 *     `base * (1 + 0.2 - 1) = base * 0.2 ≠ 0` —— **禁锢静默失效**，不报错、数值看起来也对。
 *   - **`MULTIPLIER = -1`**：最后的乘区。无论 `base` / `FLAT` / `PERCENT` 是多少，乘 0 都是 0；
 *     两个 -1 相乘仍是 `0 * 0 = 0`，**不会算出负移速**（负数那侧另有 `clampFinal` 兜底）。
 *
 * 减速同理用 `MULTIPLIER = -0.5`（语义是「移速 ×0.5」，与禁锢同一条线，一条规则管两个）。
 *
 * ## ⚠️ 前置条件：必须拆掉引擎的「移速地板」
 *
 * **`SetUnitMoveSpeed` 会把写入值钳到游戏常量「移动 - 单位最小速度」**
 * （`Advanced → Gameplay Constants → Movement - Unit Speed - Minimum`，**引擎默认 150**）。
 * 常量不拆，本文件的两个 buff 都是**假的**：
 *
 *   | final | 实际写进引擎的值 | 表现 |
 *   |---|---|---|
 *   | `0`（禁锢） | **150** | 照常走动 —— 「禁锢完全没效果」 |
 *   | `135`（减速） | **150** | 和禁锢**一模一样** —— 两者看起来是同一个技能 |
 *
 * 最阴的是**它不报错**：`StatSheet` 里 final 确实是 0 / 135，属性面板读的也是 TS 侧的
 * final，于是**面板显示 135、游戏里却在用 150 跑** —— 面板撒谎，比崩了还难查。
 *
 * 所以本仓在 `maps/table/misc.ini` 里把 `minunitspeed` 改写为 `0.0`
 * （键名就是游戏常量 `MinUnitSpeed`，在 `[Misc]` 段里，**全小写**）。
 * 这是**全局游戏常量**，改它等于承认「本图的移速下限由属性系统说了算」——
 * 与「`MOVE_SPEED` 只有 `StatSheet` 一个写入方」是同一条设计。
 * 副作用是原版的霜冻减速之类也能真的降到 150 以下了，方向一致，不算回归。
 *
 * ⚠️ **2026-10-06 实测教训：这条常量曾经「只写在文档里、没写进 ini」**，
 * 于是 `[A016]` 禁锢被静默钳成 150 —— 与 `[A015]` 减速的表现**完全相同**，
 * 玩家的反馈是「禁锢怎么只有减速效果」。文档说做过 ≠ 做过：改完必须用
 * `w2l.exe lni` 反解 `dist/map.w3x`，确认 `table/misc.ini` 里**真的**有这一行
 * （打包时若与预置默认值相同会被省略，看不到就是没生效）。
 *
 * ## 叠加语义：**乘算**
 *
 * 同一次技能连放两次会生成**两个独立实例**（属性来源 key 是 `buff:<实例 id>`，
 * 见 `BuffManager.statSourceKey`）—— 两个减速是 `×0.5 * ×0.5 = ×0.25`，不是 ×0。
 * 这与眩晕「多次施加即叠加」的既成语义一致，`StunBuff` 那边还专门为叠层写了守卫。
 *
 * ## 已知代价（接受，不修）
 *
 *   - **生效 / 解除有最多 0.1s 延迟**：本文件不碰原生，最终是 `StatSystem` 定时把
 *     算好的值写回 `SetUnitMoveSpeed`。而冻结 / 眩晕在 `onApply()` 里直接调
 *     `PauseUnit`，是**立即**的。验收时别把这半拍误判成「没生效」。
 *   - **和 `unit/skills/movement.ts` 的冲刺 / 击退互相冲掉**：那边的
 *     `unlockUnit(u, savedSpeed)` 结束时写回的是**进入前的移速**，会当场覆盖掉减速 /
 *     禁锢；而 `StatSheet` 的 `lastSynced` 还以为值没变、不会自动重写，要等下一个
 *     脏事件（比如 buff 到期）才恢复。根治要让 `MOVE_SPEED` 只有一个写入方，本轮不做。
 *   - **移速 0 只挡寻路移动**，挡不住 `SetUnitPosition` / 击退 / 冲刺。所以「禁锢」
 *     是**近似**的锁位置，不是真的钉死。
 *   - ⚠️ **属性表如果在冲刺途中第一次创建**，`snapshotBaseFromNative()` 会把当时的
 *     移速（可能是 0）快照成 base，此后减速 / 禁锢**永远失灵**且无任何报错。
 *     生产路径只在 `actor.ts` 建表时快照一次，正常玩不会撞上。
 */

import { Buff } from "./Buff";
import { BuffPolarity, BuffTypeId } from "./types";
import { StatMod, StatModKind, StatType } from "../stat/types";

/**
 * 减速的移速乘区值：**`-0.5` → 移速 ×0.5**。
 *
 * ⚠️ 这是**乘区的值**，不是「减速率」。公式里是 `mul *= 1 + value`，
 * 所以减半要写 `-0.5` 而不是 `0.5`。写成正数会变成**加速**，且同样不报错。
 */
export const SLOW_MULTIPLIER = -0.5;

/**
 * 禁锢的移速乘区值：**`-1.0` → 移速 ×0**。
 *
 * ⚠️ **值域下限就是 -1**，再小（比如 -1.5）会算出负移速。`clampFinal` 里
 * `case StatType.MOVE_SPEED` 会把负值钳回 0 兜底，但那种值本身没有语义，别写。
 */
export const ROOT_MULTIPLIER = -1.0;

/**
 * 减速：移速减半，**不禁止攻击与施法**。
 *
 * 纯声明 —— 没有 `onApply()` / `onRemove()`，因为本类不碰原生：属性修正器由
 * `BuffManager.addBuff()` 挂上、`detach()` 摘掉，到期自动还原，这里一行都不用写。
 * （对比 `StunBuff` 那种「挂上时调原生开关」的 buff，必须在两个钩子里配对。）
 *
 * ⚠️ **不能直接 `addBuff(new SlowBuff(...))`** —— 那样**吃不到韧性**。
 * 必须走 `buffManager.addSlowBuff(duration)`，那里是时长的唯一收口。
 */
export class SlowBuff extends Buff {
  readonly typeId = BuffTypeId.SLOW;

  constructor(duration: number) {
    // `NEGATIVE` 会让 buff 栏把它显示成**红色**（`BuffBarUI.buffCategoryColor`），
    // 符合 todo §1.6 的色彩规范（红色系 = 负面减益 / 控制 Debuff）。
    super(duration, BuffPolarity.NEGATIVE);
  }

  getStatModifiers(): StatMod[] {
    return [
      {
        stat: StatType.MOVE_SPEED,
        kind: StatModKind.MULTIPLIER,
        value: SLOW_MULTIPLIER,
      },
    ];
  }
}

/**
 * 禁锢：移速归零 —— **停在原地，但照常攻击、施法**。
 *
 * 与 `SlowBuff` 是同一个形状，只有乘区值不同（`-1.0` 而不是 `-0.5`）。
 * 刻意**不去合并成一个带参数的类**：两者的 `typeId`、buff 栏图标、文案都不同，
 * 合成一个反而要在构造参数里传一堆「我是谁」。
 *
 * ⚠️ 同上：只能 `buffManager.addRootBuff()`，不能直接 `addBuff()`（会跳过韧性）。
 */
export class RootBuff extends Buff {
  readonly typeId = BuffTypeId.ROOT;

  constructor(duration: number) {
    super(duration, BuffPolarity.NEGATIVE);
  }

  getStatModifiers(): StatMod[] {
    return [
      {
        stat: StatType.MOVE_SPEED,
        kind: StatModKind.MULTIPLIER,
        value: ROOT_MULTIPLIER,
      },
    ];
  }
}
