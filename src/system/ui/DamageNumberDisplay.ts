/**
 * 伤害数字显示 —— 右上角「伤害数字显示」按钮控制的就是它。
 *
 * ## 它只是「接线」，飘字本身是现成的
 *
 * 画飘字的全部实现早就在 `DamageTexttag.ts` 里了（世界坐标飘字、对象池、12 种飘向、
 * 红/黄/灰/蓝四色，贴图 `maps/resource/Texture/ui/dmg/{red,blue,yellow,gray}/0..9.tga`
 * 也真实存在）。但**它从来没被接进游戏** —— 唯一引用它的
 * `src/examples/DamageTextExample.ts` 没有被任何文件 import，模块顶层因而永不执行，
 * 编译产物里根本没有它。所以本文件干的事只有三件：
 *
 *   1. 以正确的优先级订阅 `UNIT_DAMAGED`
 *   2. 过滤出「与本地玩家相关」的那部分伤害
 *   3. 按需（首次开启时）懒建对象池
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
 * 比对用 `GetPlayerId(...) === MapPlayer.fromLocal().id` 而不是比对象，
 * 躲开 `MapPlayer` 实例相等性的坑（`BuffBarUI.ts:355` 那种 `!==` 比较能用是因为
 * 两边都是自己创建出来的实例，这里 `data.owner` 是引擎给的裸 `player`）。
 */

import { MapPlayer, Timer } from "@eiriksgata/wc3ts/*";
import { gameEvents } from "../event";
import { UnitDamageEventData } from "../event/GameEvent";
import { createLogger } from "src/utils/logger";
import { DamageTextManager, FloatDirection } from "./DamageTexttag";

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
 * 池是**一次性建满**的：一个 `DamageText` = 1 个容器 + 8 个数字 frame
 * （`DamageTexttag.ts` 的构造），默认 30 就是 **270 个 frame**，建的那一瞬会卡。
 * 只飘本地玩家相关之后同屏并发低得多，16（= 144 个 frame）足够，**这是可调的旋钮**。
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

export class DamageNumberDisplay {
  /**
   * 默认**关**（用户选定）。开关交给右上角的「伤害数字显示」按钮。
   *
   * 关着的开销是**零**：对象池根本不建，一个 frame 都不会多出来。
   * 首次开启时才延迟 0.01s 去建那 144 个 frame（见 `schedulePool`）。
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
      // 144 个 frame，而这点 frame 常驻的代价可以接受（见 POOL_SIZE 的注释）。
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
   * 建池会一次性造 144 个 frame，而 `setEnabled(true)` 这个动作是在
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

    const amount = Math.floor(data.damage);
    // 护盾全额抵挡时是 0，不该飘一个 "0" 出来
    if (amount < 1) return;

    const localId = MapPlayer.fromLocal().id;
    const victimIsLocal = data.owner !== undefined && GetPlayerId(data.owner) === localId;
    const sourceIsLocal =
      data.source !== undefined &&
      data.source.owner !== undefined &&
      data.source.owner.id === localId;
    if (!victimIsLocal && !sourceIsLocal) return;

    const victim = data.Actor;
    if (victim === undefined) return;

    // 自己打出去的 = 红；自己挨的 = 黄。打自己人时两者都成立，按红
    const color = sourceIsLocal ? "red" : "yellow";

    try {
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
      });
    } catch (e) {
      log.error(`飘伤害数字失败：${e}`);
    }
  }
}
