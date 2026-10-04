/**
 * 异步底座模块
 *
 * 魔兽地图是**单线程帧驱动**模型，没有真正的多线程。这里所说的「异步」本质是
 * **帧分片、延迟回调、非阻塞任务** —— `todo.md:22` 把这条写死了：严禁在单帧内执行
 * 大量循环，否则直接造成卡顿掉帧。
 *
 * 三件套：
 *
 * - `scheduler`：全地图唯一的 20Hz 心跳。`onTick` / `defer` / `runChunked` 都挂在它上面
 * - `locks`：状态锁，防「异步任务没跑完玩家又点了一次」
 * - `AsyncOwner`：对象销毁时一句 `release()` 取消自己名下全部回调
 *
 * @example
 * ```ts
 * import { scheduler, locks, AsyncOwner } from "src/system/async";
 *
 * // 大批量循环切成每拍 5 条
 * scheduler.runChunked({
 *   count: 200,
 *   perTick: 5,
 *   step: (i) => renderSlot(i),
 *   done: () => chatSystem("背包渲染完毕"),
 * });
 *
 * // 把「改 frame 树」挪出同步回调（点击分发里建帧会闪退）
 * scheduler.defer(0.01, () => panel.rebuild());
 *
 * // 防重复点击
 * const lock = locks.tryAcquire(`forge:${playerId}`, `p${playerId}`, 10, "锻造");
 * if (lock === undefined) {
 *   chatWarn("正在锻造中，请稍候");
 *   return;
 * }
 * ```
 *
 * ⚠️ 两条纪律（本仓库踩过的坑）：`catch` 里**绝不写 `continue`**；带洞的数组
 * **不能用 `.length` / `for...of` / `.filter`**。
 */

export { AsyncOwner, type Releasable } from "./AsyncOwner";
export { AsyncLock, LockHandle, locks, DEFAULT_LOCK_TIMEOUT } from "./AsyncLock";
export {
  Scheduler,
  CancelHandle,
  TaskHandle,
  scheduler,
  TICK_INTERVAL,
  type ChunkedTaskSpec,
} from "./Scheduler";
