/**
 * 冷却缩减系统 —— `COOLDOWN_REDUCTION`（23）这项属性的**唯一消费者**。
 *
 * ## 它做的事
 *
 * 订阅技能事件（**通用频道，不限定技能**），施法后把该技能的冷却改写成
 * `原值 × (1 - cdr)`。属性本身不产生任何行为，来源（目前是物品「时之沙漏」的遗物）
 * 只负责把数字放上去；读数、算数、写回都在这里。
 *
 * ## ⚠️ 为什么要延后 0.01s 写，而不是在 handler 里立刻写
 *
 * **不知道引擎是在 `EVENT_PLAYER_UNIT_SPELL_EFFECT` 触发之前还是之后启动技能冷却。**
 *
 *   - 若**之前**：立刻写、延后写，都对。
 *   - 若**之后**：立刻写会被引擎随后的「启动冷却」覆盖掉，只有延后写才生效。
 *
 * 延后一帧在两种情况**都成立**（冷却已启动的话，0.01s 后读到的仍然是原值），
 * 是严格优于「立刻写」的选择。代价只是每次施法多一个定时器 —— 而只有
 * `cdr > 0` 的单位才会走到那一步（守卫链第一道门就挡掉了其余所有单位）。
 *
 * ## ⚠️ 为什么不走 `EXGetAbilityState` / `EXGetUnitAbility` 那条路
 *
 * `ABILITY_STATE_COOLDOWN` 那条要先用 `EXGetUnitAbility(u, abilcode)` 取 ability 句柄，
 * 而 `NativeUISystem.ts:178` 记过：**1.27a 下对悬垂 ability 句柄调 `GetUnitAbilityLevel`
 * 会卡死闪退**。`DzGetUnitAbilityCool` / `DzSetUnitAbilityCool` 直接收 `(unit, abilCode)`，
 * 全程不碰 ability 句柄 —— `CommandCardCooldownUI` 就是因为这个理由选的同一条路。
 *
 * （顺带记一笔：`ABILITY_STATE_COOLDOWN` 的值是 **1**，不是 0。
 * 见 `dev_lib/KKWE/jass/japi/YDWEAbilityState.j:6` 与 `ydwe/define.txt:2548`。）
 *
 * ## ⚠️ 适用范围：只有通魔（Channel）技能是**保证**有效的
 *
 * `share/mpq/kkapi/action.txt:1301` 的官方注释写得很直白：
 *
 * > 单位的独立修改，不会影响其他单位身上的技能；删除技能后改动即清除；
 * > **保证通魔技能有效**，其他类型的技能也可以尝试使用不保证有效，
 * > 如无效果可以尝试刷新数据
 *
 * 本仓现有的 A010/A011/A012 全是 `_parent = "ANcl"`（通魔），正好落在「保证」那一档。
 * **以后接真正的技能（暴雪原生基类）时要重新验一遍** —— 这条不是「应该没事」，
 * 是明确写着「不保证」。
 *
 * ## ⚠️ `max_cool` 是持久覆盖值，必须原样回写
 *
 * 这是本文件最容易写错的一处，**已经用实测定案了**（细节见 `_apply` 里那段注释）：
 * `DzSetUnitAbilityCool` 写进去的 `max_cool` 会**留在单位身上**，引擎下次施法时
 * 直接拿它当基准，而不是回到物编里的原始冷却。所以传 `target` 会让冷却逐次腰斩
 * （10 → 5 → 2.5 → 1.25 → 0.62）。**必须传读到的 `total`。**
 *
 * 代价是命令卡时钟从半黑开始 —— 那是正确显示，别去「修」它。
 */

import { Timer } from "@eiriksgata/wc3ts/*";
import { Actor } from "src/system/actor";
import { gameEvents, SpellEventData } from "src/system/event";
import { StatType } from "src/system/stat/types";
import { i2c } from "src/utils/helper";
import { createLogger } from "src/utils/logger";

const log = createLogger("CooldownReductionSystem");

/**
 * 延迟写入的时间（秒）。
 *
 * 0.01 是仓库里现成的最小值（`UnitEventExample.ts:17` 用的是 1 秒，
 * 但那是剧情延迟；这里要的是「下一帧」）。收得太小有可能落在引擎启动冷却**之前**，
 * 收得太大则白白吃掉一截冷却 —— 0.01s 在 1.27a 的帧率下就是一到两帧。
 */
const CDR_DELAY = 0.01;

/**
 * 冷却缩减的下限保留值（秒）。
 *
 * `cdr` 的理论上限是 0.5（`clampFinal` 钳过），算不出 0；写这个是为了防住
 * 「未来某个来源把 cdr 推到 1.0」时冷却被写成 0 甚至负数 —— 0 秒冷却在魔兽里
 * 不是「立刻可用」，行为未定义。
 */
const MIN_COOLDOWN = 0.01;

export default class CooldownReductionSystem {
  private static instance: CooldownReductionSystem | undefined;

  /** 是否已经订阅过（幂等守卫 —— 热重载会重复调 `initialize()`） */
  private bound = false;

  private constructor() {}

  public static getInstance(): CooldownReductionSystem {
    if (CooldownReductionSystem.instance === undefined) {
      CooldownReductionSystem.instance = new CooldownReductionSystem();
    }
    return CooldownReductionSystem.instance;
  }

  /**
   * 订阅技能事件。由 `main.ts` 的 `initialize()` 调**一次**。
   *
   * ⚠️ **自带 `bound` 守卫**（同 `LifestealSystem.init()`，不同于 `ShieldSystem.init()`）。
   * 重复订阅的后果是**同一次施法写两遍冷却** —— 不报错、不崩溃，只是缩减量翻倍，
   * 而热重载期间这条路径很容易被走到第二次。
   */
  public init(): void {
    if (this.bound) {
      return;
    }
    this.bound = true;

    // ⚠️ **不传 `abilityId`** —— 不传订阅的是通用频道（所有技能），
    // 传了就只有那一个技能的事件会进来。CDR 要作用于全部技能。
    gameEvents.onSpellEffect((data: SpellEventData) => this.onSpellEffect(data));

    log.info("冷却缩减系统已接线");
  }

  /**
   * 施法事件。这里**只读取和排期**，真正的写回在 `CDR_DELAY` 之后。
   *
   * 守卫链的每一道都是必要的，顺序也是刻意的：把「没这件物品」的零开销路径
   * 放在最前面 —— 这是全仓第一个「每次施法都可能触发」的系统，
   * 绝大多数单位身上没有 CDR，不该为它们建定时器。
   */
  private onSpellEffect(data: SpellEventData): void {
    const actor = data.Actor;
    if (actor === undefined) {
      return;
    }

    // ⚠️ **先 `hasStatSheet()` 再取 `statSheet`** —— getter 是惰性建表的，
    // 在可能已 `detach` 的句柄上直接取会在那里重建一张表（同 `LifestealSystem` 的风险 #7）。
    // 没有属性表 = 没挂过任何来源 = cdr 是 0，本来也没什么可缩的。
    if (!actor.hasStatSheet()) {
      return;
    }
    const cdr = actor.statSheet.getFinal(StatType.COOLDOWN_REDUCTION);
    if (cdr <= 0) {
      // **零开销路径**：没这件物品的单位，连定时器都不建。
      return;
    }

    const u = actor.handle;
    if (u === undefined) {
      return;
    }
    const abil = data.abilityId;

    // 句柄和 cdr 都捕进闭包。**不在这里重读 cdr** —— 0.01s 内属性不会变，
    // 重读只是多一次表查询，还要重新处理「表没了」这条路径。
    const timer = Timer.create().start(CDR_DELAY, false, () => {
      try {
        CooldownReductionSystem_apply(u, abil, cdr);
      } catch (e) {
        // 定时器回调里抛出去会冒泡到引擎的定时器线程，那里没人接。
        // 吞掉并记一行 —— 缩减没生效是小事，把后面的定时器带崩是大事。
        log.error(["冷却缩减写回失败（", i2c(abil), "）：", String(e)].join(""));
      }
      timer.destroy();
    });
  }
}

/**
 * 真正的写回。**延迟 `CDR_DELAY` 之后才跑**，理由见文件头。
 *
 * 每一步都有一道守卫，且**只缩短、绝不拉长**：
 * 如果算出来的目标比当前剩余还长（引擎把冷却设得比预期短、或读到不一致的值），
 * 直接放弃 —— 宁可少缩一次，也不要把一个本来很快能用的技能改得更久。
 */
function CooldownReductionSystem_apply(u: unit, abil: number, cdr: number): void {
  // 这 0.01s 里单位可能已经死了 / 被移除了。悬垂句柄上的一切调用都别做。
  if (GetUnitTypeId(u) === 0) {
    return;
  }

  const remain = DzGetUnitAbilityCool(u, abil);
  if (remain <= 0) {
    // 冷却压根没启动 —— 这是个**没有冷却的技能**，或者技能不在这个单位身上。
    // 是正常路径，不是错误，所以不打印。
    return;
  }

  let total = DzGetUnitAbilityMaxCool(u, abil);
  if (total < remain) {
    // 读到不一致时以 remain 为准。正常不该发生；发生了说明有个我们没预料到的
    // 状态，这时候「把剩余时间当成总时间」比用那个更小的值算更保守。
    total = remain;
  }

  const target = Math.max(MIN_COOLDOWN, total * (1 - cdr));
  if (target >= remain) {
    // **只缩短，绝不拉长**。
    return;
  }

  // ⚠️ **`max_cool` 必须原样回写（传 `total`），不能传 `target`。**
  //
  // 实测（2026-10-06，连放 6 次 A011）确认了原先那个「先这么写、用日志定案」的猜测：
  // `max_cool` 是**持久化的每单位覆盖值**，引擎**不会**在下次施法时把它重置回物编基准，
  // 而是直接拿这个覆盖值当新基准来启动冷却。传 `target` 的后果是逐次腰斩：
  //
  //   remain=9.99 total=10.00 → 5.00
  //   remain=4.99 total= 5.00 → 2.50     ← 引擎把上次写的 5.00 当成了基准
  //   remain=2.49 total= 2.50 → 1.25
  //   remain=1.24 total= 1.25 → 0.62     ← 10 秒的技能，第 4 次只剩 0.6 秒
  //
  // 原样回写 `max_cool` 之后，覆盖值永远停在物编基准上、不会漂移，每次施法
  // 引擎给出的 `total` 都是 10.00，减半得的 `target` 恒为 5.00。
  //
  // **代价（已知、可接受）**：命令卡时钟 `progress = remain / total`
  // （`CommandCardCooldownUI.ts:20-30`），所以图标从**半黑**开始、5 秒内变亮，
  // 而不是从全黑开始。这不是 bug —— 它显示的正是「原始冷却还剩多少比例」。
  // 想换成全黑就得把 `max_cool` 也压小，而那正是上面这条腰斩的来源，不能换。
  DzSetUnitAbilityCool(u, abil, target, total);

  // ⚠️ 这一行是**诊断用的**，不是装饰：连放几次，看总时间（total）有没有逐次变小，
  // 就能看出 `max_cool` 的覆盖值有没有漂移。上面那条结论就是靠它定案的。
  // 以后再动这个文件时留着它 —— 一旦有人又写成 `target`，日志立刻会显形。
  //
  //
  // ⚠️ **用数组 `join` 拼，不要写成 `a + b + c` 的一长串。** tstl 把 `+` 编译成
  // 左嵌套的 `((a..b)..c)`，嵌套深度直接吃 Lua 解析器的 `nCcalls`
  // （5.3.6 上限 200），超了整个 `.lua` 加载失败、表现成 MSVCP140 原生闪退。
  // `join` 出的是 `table.concat{...}`，各段是兄弟关系，不互相嵌套。
  // 见 memory `wc3-lua53-ccalls-limit`。
  const parts = [
    "技能冷却缩减：",
    i2c(abil),
    " remain=",
    remain.toFixed(2),
    " total=",
    total.toFixed(2),
    " → ",
    target.toFixed(2),
    "（cdr=",
    (cdr * 100).toFixed(0),
    "%）",
  ];
  log.info(parts.join(""));
}
