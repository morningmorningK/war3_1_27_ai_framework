/**
 * 伤害数字显示 —— 右上角「伤害数字显示」按钮控制的就是它。
 *
 * ## 它只是「接线」，飘字本身是现成的
 *
 * 画飘字的全部实现早就在 `DamageTexttag.ts` 里了（世界坐标飘字、对象池、12 种飘向、
 * 红/黄/灰/蓝四色，贴图 `maps/resource/Texture/ui/dmg/{red,blue,yellow,gray}/0..9.tga`
 * 也真实存在）。但**它从来没被接进游戏** —— 唯一引用它的
 * `src/examples/DamageTextExample.ts` 没有被任何文件 import，模块顶层因而永不执行，
 * 编译产物里根本没有它。所以本文件干的事只有四件：
 *
 *   1. 以正确的优先级订阅 `UNIT_DAMAGED`
 *   2. 过滤出「与本地玩家相关」的那部分伤害
 *   3. 按需（首次开启时）懒建对象池
 *   4. 把一次伤害的各段拼成多色富文本串（`DamageNumberDisplay_text`）
 *
 * 第 4 件是 Step 7 加的。它需要 `DamageContext`，而那是 `DamagePipeline` 在
 * **优先级 100** 造的、本文件在 **0** —— 两者之间隔着 `ShieldSystem(10)`，
 * 没有任何现成通道。交接靠 `DamageContext.ts` 里那个「配对槽位 + 身份校验」，
 * 为什么是那个形状（以及重入时会发生什么）都写在那儿。
 *
 * ## 护盾吸收飘字是**白捡的**
 *
 * 一次伤害可能飘**两个**数：伤害本身，外加被盾吸掉的那部分（带括号，形如 `(20)`）。
 *
 * 护盾数**默认浅灰**，只在「盾吸一部分 + 剩下的真打到血」那一下**跟伤害同色、
 * 暴击时也跟着带 `!`**，读起来才是「同一次命中」而不是两件事。全额吸收时仍是
 * 浅灰、也没有 `!` —— 那时没有伤害数字可跟，而灰正好表示「血一点没掉」。
 * 理由都写在 `onUnitDamaged` 里。
 *
 * 吸收量不需要 `ShieldSystem` 往外报 —— 它就是 `ctx.finalDamage − data.damage`：
 * 管线在 100 层写下前者，护盾在 10 层改小后者，本层在 0 层最后跑，**两个值都还在**。
 * 所以这条功能没有碰 `ShieldSystem.ts`，也没有往 `GameEvent.ts` 加事件类型。
 * 代价是它依赖「100 与 0 之间只有护盾会改 `data.damage`」这个当前事实。
 *
 * ## 这里**不管**治疗飘字
 *
 * 治疗 = 浅绿带 `+`，色码常量 `HEAL_COLOR` 已经备好了，但**目前没有任何地方发它** ——
 * `GameEventType` 里没有 heal 事件，1.27a 也没有原生的「单位被治疗」事件。
 * 要做那条得先有事件源。
 *
 * ## ⚠️ 优先级必须小于 `ShieldSystem` 的 10
 *
 * `ShieldSystem` 用 `priority: 10` 订阅，在回调里调 `data.setEventDamage(remaining)`
 * 扣掉护盾 —— 它自己的注释写着「高优先级订阅**以确保先于飘字等逻辑执行**」，
 * 原作者早就给飘字留好了位置。事件派发**数值越大越先执行**（`GameEvent.ts:6`）。
 *
 * 所以这里取 **0**：等护盾扣完再读 `data.damage`，飘出来才是真实扣血量。
 * **若哪天被改成 >= 10，飘出的数字会比实际扣血大**（护盾挡掉的那部分还在），
 * 而且这种现象极难在游戏里发现。见 `DAMAGE_TEXT_PRIORITY`。
 *
 * ## 只飘本地玩家相关的伤害
 *
 * 自建飘字挂在 `gameUI()` 下、且每 0.02s 会重新锚定一次（`DamageTexttag.ts` 的
 * `updatePosition`），也就是说它会**一直跑到自己父树的顶层**去。全图单位的伤害
 * 都飘的话，画面会被 AI 互殴的数字淹掉，也白付那份渲染开销。所以只留两类：
 *
 *   - 本地玩家**造成**的（`data.source` 是自己人）→ **红**
 *   - 本地玩家**承受**的（`data.owner` 是自己）→ **黄**
 *
 * 两者同时成立（打自己人）按红。
 *
 * ⚠️ **这两个颜色只剩兜底路径在用。** 拼得出分段串时一律走元素色，
 * 物理段是**白色**（玩家指定的口径，见 `damageConstants.ts`）。也就是说
 * 平时看不出「谁打的」，只在拿不到上下文的那一发才会冒出红/黄。
 *
 * 比对用 `GetPlayerId(...) === MapPlayer.fromLocal().id` 而不是比对象，
 * 躲开 `MapPlayer` 实例相等性的坑（`BuffBarUI.ts:355` 那种 `!==` 比较能用是因为
 * 两边都是自己创建出来的实例，这里 `data.owner` 是引擎给的裸 `player`）。
 */

import { MapPlayer, Timer } from "@eiriksgata/wc3ts/*";
import { gameEvents } from "../event";
import { UnitDamageEventData } from "../event/GameEvent";
import { createLogger } from "src/utils/logger";
import { DamageTextManager, FloatDirection, colorHexOf } from "./DamageTexttag";
// ⚠️ **直连文件，不走 `src/system/combat` 那个 barrel** —— barrel 会把 `DamagePipeline`
// 拉进来。这里只要「上下文的交接槽位」与两个取色函数，都是轻的东西。
import { DamageContext, findDamageContext, sumHits } from "src/system/combat/DamageContext";
import { SHIELD_COLOR, colorize, elementColor } from "src/system/combat/damageConstants";

const log = createLogger("DamageNumberDisplay");

/**
 * 订阅优先级。
 *
 * ⚠️ **必须严格小于 `ShieldSystem.SHIELD_PRIORITY`（= 10）**，理由见文件头。
 * 0 只是「比 10 小且不跟别人抢号」的一个稳妥取值，本身没有别的含义。
 */
const DAMAGE_TEXT_PRIORITY = 0;

/**
 * 对象池大小。
 *
 * 池是**一次性建满**的：一个 `DamageText` = 1 个容器 + 1 个 TEXT frame
 * （`DamageTexttag.ts` 的构造；Step 7 换成字体渲染之前是 1 容器 + 8 数字贴图 frame）。
 * 16 个实例 = **32 个 frame**，建的那一瞬的开销比原来那 144 个轻得多。
 * 只飘本地玩家相关之后同屏并发本来就低，16 是**可调的旋钮**。
 *
 * ⚠️ **一次伤害最多吃掉池里两个** —— 伤害本身 + 被盾吸掉的那部分。
 * 也就是实际能同时显示 8 次命中。池满了 `show()` 只是返回 false（静默丢弃），
 * 不会报错也不会卡，所以这里不必为那多出来的一个再把池子翻倍。
 */
const POOL_SIZE = 16;

/**
 * 飘字起始高度：离**地面**多少世界单位（`worldToScreen` 的 z）。
 *
 * 世界单位，不是像素。2026-10-04 先用 100，实测「位置太高」（飘在模型头顶以上
 * 一截），改成 40。
 *
 * ⚠️ **这是调飘字高低唯一的旋钮** —— 飘字整体还会在 1.5s 里再上浮 120 像素
 * （`speed: 80` × `duration: 1.5`，见下面 `show()` 的调用），所以调小这个值
 * 抬不高「漂浮过程」的高度，只挪起点。
 */
const FLOAT_HEIGHT = 40;

/**
 * 护盾飘字比伤害飘字**起点低多少**（世界单位）。
 *
 * 部分吸收时两个数会同时出现，必须错开 —— 但光错开起点还不够：
 * 两者速度一样的话间距恒定，数字变宽之后照样挨在一起。所以护盾那条的
 * `speed` 也更慢（55 vs 80），于是**越飘越开**。
 */
const SHIELD_DROP = 20;

export class DamageNumberDisplay {
  /**
   * 默认**关**（用户选定）。开关交给右上角的「伤害数字显示」按钮。
   *
   * 关着的开销是**零**：对象池根本不建，一个 frame 都不会多出来。
   * 首次开启时才延迟 0.01s 去建那 32 个 frame（见 `schedulePool`）。
   */
  private static enabled = false;

  /** 是否已经订阅过伤害事件（幂等守卫，热重载时防重复挂） */
  private static bound = false;

  /** 对象池是否已建好。没建好之前来的伤害一律丢弃，不排队 */
  private static poolReady = false;

  /** 是否已有一次「建池」在排队，防连点按钮排出一串定时器 */
  private static poolPending = false;

  public static isEnabled(): boolean {
    return DamageNumberDisplay.enabled;
  }

  /**
   * 订阅伤害事件。由 `main.ts` 的 `initialize()` 调**一次**，位置在
   * `ShieldSystem.getInstance().init()` 之后（只是读起来因果清楚 —— 谁先谁后
   * 由事件的优先级决定，与登记顺序无关）。
   */
  public static init(): void {
    if (DamageNumberDisplay.bound) {
      log.warn("已订阅过伤害事件，重复调用被忽略");
      return;
    }
    DamageNumberDisplay.bound = true;

    gameEvents.onUnitDamaged(
      (data: UnitDamageEventData) => DamageNumberDisplay.onUnitDamaged(data),
      { priority: DAMAGE_TEXT_PRIORITY }
    );

    if (DamageNumberDisplay.enabled) {
      DamageNumberDisplay.schedulePool();
    }

    log.info(`伤害数字已接线（优先级 ${DAMAGE_TEXT_PRIORITY}，默认${DamageNumberDisplay.enabled ? "开" : "关"}）`);
  }

  public static setEnabled(value: boolean): void {
    if (DamageNumberDisplay.enabled === value) return;
    DamageNumberDisplay.enabled = value;

    if (value) {
      DamageNumberDisplay.schedulePool();
    } else if (DamageNumberDisplay.poolReady) {
      // 关闭时只把所有数字收起来，**不销毁池** —— 销毁了下次开启又要重建
      // 32 个 frame，而这点 frame 常驻的代价可以接受（见 POOL_SIZE 的注释）。
      try {
        DamageTextManager.getInstance().clear();
      } catch (e) {
        log.error(`收起伤害数字失败：${e}`);
      }
    }
  }

  // ------------------------------------------------------------------
  // 内部
  // ------------------------------------------------------------------

  /**
   * 延迟一拍再建池。
   *
   * 建池会一次性造 32 个 frame，而 `setEnabled(true)` 这个动作是在
   * `DzFrameSetScriptByCode` 的**点击派发过程中**执行的 —— 在 JAPI 的派发栈里
   * 增删 frame 是经典雷区（`UnitBloodToggleUI` 的 `toggle()` 注释里记过）。
   * 所以这里只改状态，真正的建池挪到 0.01s 之后的一次性定时器里。
   */
  private static schedulePool(): void {
    if (DamageNumberDisplay.poolReady || DamageNumberDisplay.poolPending) return;
    DamageNumberDisplay.poolPending = true;

    Timer.create().start(0.01, false, () => {
      DamageNumberDisplay.poolPending = false;
      if (DamageNumberDisplay.poolReady) return;
      try {
        // 构造 `DamageTextManager` 的副作用就是建满整池，拿句柄只是顺带
        DamageTextManager.getInstance(POOL_SIZE);
        DamageNumberDisplay.poolReady = true;
        log.info(`伤害数字对象池已建（${POOL_SIZE} 个）`);
      } catch (e) {
        log.error(`建伤害数字对象池失败，本次开启无效：${e}`);
      }
    });
  }

  private static onUnitDamaged(data: UnitDamageEventData): void {
    if (!DamageNumberDisplay.enabled) return;
    // 池还没建好（刚开启的头 0.01s）就直接丢 —— 不排队，伤害数字没有补发的必要
    if (!DamageNumberDisplay.poolReady) return;

    const victim = data.Actor;
    if (victim === undefined) return;

    // ⚠️ **本地玩家过滤必须排在「算数值」之前。** 原来它在 `amount < 1` 那道
    // 提前返回之后 —— 顺序换过来是因为现在「打了 0 点」也可能是要显示的情况
    // （护盾全吸），而过滤与显示与否是两件独立的事。
    const localId = MapPlayer.fromLocal().id;
    const victimIsLocal = data.owner !== undefined && GetPlayerId(data.owner) === localId;
    const sourceIsLocal =
      data.source !== undefined &&
      data.source.owner !== undefined &&
      data.source.owner.id === localId;
    if (!victimIsLocal && !sourceIsLocal) return;

    const ctx = findDamageContext(data);

    // 护盾吸收量 = **管线算完的值 − 扣过盾之后剩下的值**。
    //
    // 这两个数在这一次派发里同时读得到：`ctx.finalDamage` 是管线在 **100 层**写的，
    // `data.damage` 是护盾在 **10 层**改小的，本层（**0**）最后跑。
    // 所以**不需要 `ShieldSystem` 往外报数，也就不需要动那个文件**，
    // 更不需要往 `GameEvent.ts` 里加事件类型。
    //
    // 前提是「100 与 0 之间除护盾外没有别的订阅者改过 `data.damage`」——
    // 现在确实只有 `ShieldSystem` 一个。**将来若多一个改值的层，这里要跟着改**
    // （否则它的改动会被算成「护盾吸收」）。
    const absorbed = ctx === undefined ? 0 : ctx.finalDamage - data.damage;

    const amount = Math.floor(data.damage);
    // 全额被盾挡下时 `data.damage` 是 0 —— 那时候**只飘护盾数字，不飘伤害数字**
    // （飘一个 "0" 没有意义）。
    const showDamage = amount >= 1;
    const showShield = absorbed >= 1;
    if (!showDamage && !showShield) return;

    // 自己打出去的 = 红；自己挨的 = 黄。打自己人时两者都成立，按红。
    // ⚠️ **这两个颜色现在只在兜底路径上出现** —— 拼得出分段串时一律走元素色
    // （物理段是白色），见 `DamageNumberDisplay_text`。
    const color = sourceIsLocal ? "red" : "yellow";

    // 这一次命中暴没暴。**两个数共用同一个值** —— 伤害数字用它放大字号（`!` 拼在
    // 串里），护盾数字用它拼 `!`。`isCrit` 只存在于上下文里，原生事件不带它，
    // 所以取不到上下文时就是 false。
    const isCrit = ctx !== undefined && ctx.isCrit;

    // 护盾数的颜色：**默认浅灰**，只有「破盾那一下」才改跟伤害同色。
    //
    // 「破盾那一下」= `showDamage && showShield` 同时成立，也就是盾吸走一部分、
    // 剩下的真打到血。那时候屏幕上两个数并排，若一个灰一个彩，读起来像两件事；
    // 同色之后是一句话：「这一刀打进来这么多，其中这么多被盾吃了」。
    //
    // 全额吸收时**保持浅灰** —— 那时没有伤害数字可跟（`showDamage` 为 false，
    // 下面的赋值根本不会执行），灰反而正好表示「全被盾吃了，血没掉」。
    let shieldHex = SHIELD_COLOR;

    try {
      if (showDamage) {
        const parts = DamageNumberDisplay_text(ctx, amount, color);
        // 跟的是**最后一个真正画出来的元素段**的颜色，与暴击 `!` 取的是同一个
        // `tailHex` —— 两处若各取各的，多段伤害下会分叉成两种颜色。
        // 取不到上下文（兜底路径）时 `tailHex` 就是红/黄，护盾数跟着变红/黄。
        shieldHex = parts.tailHex;

        DamageTextManager.show({
          damage: amount,
          worldX: victim.x,
          worldY: victim.y,
          height: FLOAT_HEIGHT,
          color,
          direction: FloatDirection.UP,
          speed: 80,
          duration: 1.5,
          scale: 0.8,
          fadeOut: true,
          // 文本**永远由这里拼**（包括暴击那个 `!`），渲染器只负责版式。
          // 所以 `damage` / `color` 对这条路径其实是多余的 —— 留着是因为它们是
          // `DamageTextConfig` 的兜底契约。
          richText: parts.text,
          // 暴击：字号放大一档。`!` **不在这里** —— 它已经拼进 `parts.text` 了，
          // 因为它的颜色必须跟末段一致，而颜色归拼串那边管。
          crit: isCrit,
        });
      }

      if (showShield) {
        // 全吸的时候没有伤害数字，这就是屏幕上唯一一个数 —— 起点低一点无所谓；
        // 部分吸收时两个数**同时出现**，所以必须错开，否则重叠成一片糊的。
        //
        // 错开手法：起点低 `SHIELD_DROP`，速度也慢一档。两个数于是**越飘越开**，
        // 而不是保持一个固定间距（固定间距在两串数字都变宽时会挨到一起）。
        //
        // **括号是给「分不清这两个数是什么关系」兜底的。** 全靠位置和颜色区分的话，
        // 战斗里两个数一闪而过，看到「45 白色」和「20 灰色」根本没空去推哪个是哪个。
        // 括号一出，`(20)` 是吸走的、`45` 是真掉的血。
        //
        // 颜色用 `shieldHex`：破盾那一下跟着伤害走，全额吸收时是浅灰。**括号负责
        // 「这是什么」，颜色负责「这属于哪一刀」** —— 两者管的是不同的事，
        // 所以即使同色了括号也照样留着。
        //
        // ## 暴击的 `!` 也要跟过来
        //
        // 上一轮定了「破盾那一下两个数同色 = 同一次命中」，那么这一刀暴没暴同理得
        // 同时出现在两个数上 —— 只同色不同暴击标记，等于这条口径只做了一半。
        // 而且反过来的样子很怪：`60!`（放大 + `!`）旁边跟一个正常大小、没有 `!` 的
        // `(20)`，颜色还一样，看着像渲染出了 bug。
        //
        // ⚠️ **`!` 在括号外面**：`(20)!` 而不是 `(20!)`。括号是一对、圈住「被吸走的
        // 值」这个整体，`!` 修饰的是整个数（跟伤害那串 `60!` 形状对称）。
        // 塞进括号里会变成「吸走了 20! 点」这种读不通的东西。
        //
        // ⚠️ 括号和 `!` **都包在同一个色码里面** —— 写成 `"(" + colorize(...) + ")"`
        // 的话，括号本身是默认色（白），数字两边挂两个白括号，看着像拼错的。
        // `!` 同理，分开写就会是一个白感叹号。
        DamageTextManager.show({
          damage: Math.floor(absorbed),
          worldX: victim.x,
          worldY: victim.y,
          height: FLOAT_HEIGHT - SHIELD_DROP,
          direction: FloatDirection.UP,
          speed: 55,
          duration: 1.5,
          scale: 0.8,
          fadeOut: true,
          richText: colorize(
            "(" + Math.floor(absorbed) + ")" + (isCrit ? "!" : ""),
            shieldHex
          ),
          crit: isCrit,
        });
      }
    } catch (e) {
      log.error(`飘伤害数字失败：${e}`);
    }
  }
}

// ---------------------------------------------------------------------------
// 富文本拼装
// ---------------------------------------------------------------------------

/**
 * 拼串的结果。
 *
 * `tailHex` 是**最后一个真正画出来的那一段的颜色**。它有两个消费者，而且必须是
 * 同一个值：
 *
 *   - 暴击那个 `!`（跟在末段后面，用末段的色）
 *   - 破盾那一下的护盾数 `(20)`（跟着伤害走，见 `onUnitDamaged`）
 *
 * 所以这里一次算出来给两边用。**若将来再冒出一个「跟伤害同色」的东西，也接这里**，
 * 别自己在调用方重新扫一遍 `ctx.hits` —— 那种扫法迟早和这边的取整/过滤规则分叉。
 */
interface DamageTextResult {
  text: string;
  tailHex: string;
}

/**
 * 拼出这次飘字的**完整内容串**（已上色）与末段色。**永远返回可显示的东西。**
 *
 * ## 分段路径：每段自己的元素色
 *
 * 「普攻 45 + 余烬 45」拼成 `|cffFFFFFF45|r |cffFF444445|r` —— 白色 45、红色 45。
 * 颜色表与依据见 `damageConstants.ts` 的 `ELEMENT_COLORS` 注释。
 *
 * **物理段是白色，不借红/黄。** 早期版本让物理段用红/黄表达「出 / 受」，
 * 与「物理 = 白色」这条口径冲突，已按口径统一。红/黄只剩兜底路径在用。
 *
 * ## 兜底路径：单色总数
 *
 * 下面两种情形退回 `amount` 的单色串，**飘出的数值仍然是正确的扣血量**：
 *
 *   1. **取不到上下文** —— 不是同一次派发的 `data`（重入），或 `DamagePipeline`
 *      还没记。
 *   2. **分段加起来对不上实际扣血** —— 说明有下游层改过值（`ShieldSystem(10)`
 *      吸了盾）。这时候按分段显示就是在报「没真正打进去的伤害」，宁可退回单色。
 *
 * ## 暴击的 `!`
 *
 * 跟在最后一个数字后面、**用那个数字的颜色**（`tailHex`）。放在这里而不是渲染器里，
 * 是因为颜色归这里管（串是这里拼的），渲染器补的话得先解析色码或者凭空挑一个颜色。
 * 字号放大那一半在渲染器（`DamageTextConfig.crit`）。
 */
function DamageNumberDisplay_text(
  ctx: DamageContext | undefined,
  amount: number,
  color: "red" | "yellow"
): DamageTextResult {
  const crit = ctx !== undefined && ctx.isCrit;

  // 先把各段拼出来，拼不出来再走兜底。`lastHex` 跟着最后一个**真的画出来的**段走，
  // 暴击那个 `!` 与调用方的护盾数都用它上色。
  let parts: string[] | undefined = undefined;
  let lastHex = "FFFFFF";
  if (ctx !== undefined && ctx.hits.length > 0) {
    // 用**未取整**的浮点和来比：`sumHits` 全程不取整（管线刻意如此，见其文件头），
    // `amount` 是取过整的。两边都取整再比，才不会因为 45.6 + 14.6 这种数误判。
    if (Math.floor(sumHits(ctx)) === amount) {
      const built: string[] = [];
      for (let i = 0; i < ctx.hits.length; i++) {
        const hit = ctx.hits[i];
        // 写成 if 而不是 `continue`：本函数没有 catch，`continue` 本身是安全的，
        // 但仓库里那条铁律（memory `wc3-tstl-continue-in-catch`）值得一个统一的写法 ——
        // 循环体以后加一个 try/catch 时，`continue` 会变成跨函数的 goto。
        if (hit !== undefined) {
          const shown = Math.floor(hit.amount);
          // 取整后是 0 的段不显示 —— 元素基数被抗性削到不足 1 时会出现，显示一个 "0"
          // 只是噪声。**注意这会让「一段都不剩」成为可能**（各段都 < 1、加起来却够 1），
          // 所以下面那个 `built.length > 0` 的判断不是防御性代码，是真的会走到。
          if (shown >= 1) {
            const hex = elementColor(hit.element);
            lastHex = hex;
            built.push(colorize(String(shown), hex));
          }
        }
      }
      if (built.length > 0) {
        parts = built;
      }
    }
  }

  if (parts === undefined) {
    // 兜底路径：整串一个色。`tailHex` 取的就是这个色 —— 调用方的护盾数跟着它，
    // 「和伤害同色」这条口径在兜底路径上也照样成立。
    const fallbackHex = colorHexOf(color);
    return {
      text: colorize(String(amount) + (crit ? "!" : ""), fallbackHex),
      tailHex: fallbackHex,
    };
  }

  let text = parts.join(" ");
  if (crit) {
    text = text + colorize("!", lastHex);
  }
  return { text: text, tailHex: lastHex };
}
