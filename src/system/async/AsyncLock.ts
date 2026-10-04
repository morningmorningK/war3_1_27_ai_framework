/**
 * 状态锁 —— 防「异步任务还没跑完，玩家又点了一次」。
 *
 * `todo.md:30` 的场景：玩家连续多次点击锻造 / 回收按钮，上锁防止重复触发，
 * 任务完成后解锁。本仓库此前只有零散的手写布尔（`skills/movement.ts` 的 `ended`、
 * `Button.ts` 的 `isDragging`），没有通用件；而那些布尔各自为政、且**都不能按对象区分**。
 *
 * ## 为什么是「钥匙 + 多把锁」而不是一个全局布尔
 *
 * 一把全局布尔的问题是**误伤**：A 玩家在锻造、B 玩家想回收，两者毫不相干却会被
 * 同一把锁挡住。key 用命名空间字符串（`craft:p1`、`recycle:hero5`），谁挡谁一目了然。
 *
 * ## 为什么必须有超时
 *
 * 锁是跨 tick 持有的 —— 分片任务要跑好几拍。如果某条路径忘了解锁（或者任务中途
 * 因为对象失效被静默中止），这把锁就**永久**锁死了，玩家表现为「按钮再也不响应」，
 * 而且没有任何报错。所以每把锁都带一个默认 10 秒的兜底超时，由 `Scheduler` 每 tick
 * 驱动 `sweep()` 回收。超时释放属于异常情况，会通过 `onTimeout` 报出来。
 *
 * ## 拿不到锁时的反馈**不在这里**
 *
 * 这个类刻意**不依赖聊天系统**（否则 `chat → async → chat` 成环）。调用方拿到
 * `undefined` 之后自己决定怎么提示：
 *
 * ```ts
 * const lock = locks.tryAcquire(`craft:${playerId}`, `p${playerId}`, 10, "锻造");
 * if (lock === undefined) {
 *   chatWarn("正在处理中，请稍候");
 *   return;
 * }
 * ```
 */

import { createLogger } from "src/utils/logger";
import type { Releasable } from "./AsyncOwner";

const log = createLogger("Async");

/** 兜底超时（秒）。超时说明有路径忘了解锁，属于 bug 的兜底，不是正常流程 */
export const DEFAULT_LOCK_TIMEOUT = 10;

interface LockEntry {
  /** 持锁者标签。**只用于诊断**（谁锁的），不参与身份判定 —— 身份看 `token` */
  readonly owner: string;
  /** 加锁目的，写进超时告警里 */
  readonly reason: string;
  /** 到期时刻（调度器累加的秒数） */
  readonly expiresAt: number;
  /** 本次加锁时指定的超时秒数，只用于告警文案 */
  readonly timeoutSeconds: number;
  /** 本次持有的唯一标识。防止「超时被回收后又被人拿到，前一个任务收尾时误释放」 */
  readonly token: number;
}

/**
 * 一次持锁。**释放幂等**，可以放心在 `done` / `fail` / `cancel` 三条路上都调。
 */
export class LockHandle implements Releasable {
  private registry: AsyncLock | undefined;
  private readonly key: string;
  private readonly token: number;

  public constructor(registry: AsyncLock, key: string, token: number) {
    this.registry = registry;
    this.key = key;
    this.token = token;
  }

  public release(): void {
    const registry = this.registry;
    if (registry === undefined) return;
    this.registry = undefined;
    registry.releaseHandle(this.key, this.token);
  }

  public get isReleased(): boolean {
    return this.registry === undefined;
  }

  public get lockKey(): string {
    return this.key;
  }
}

export class AsyncLock {
  private static instance: AsyncLock | undefined;

  /** key → 当前持有者 */
  private readonly held = new Map<string, LockEntry>();

  /** 单调递增的持有标识 */
  private nextToken = 1;

  /** 最近一次 `sweep()` 传入的时刻。`tryAcquire` 用它算到期时刻，免得每个调用点都要传时钟 */
  private now = 0;

  private timeoutReporter: ((message: string) => void) | undefined;

  private constructor() {}

  public static getInstance(): AsyncLock {
    if (!AsyncLock.instance) {
      AsyncLock.instance = new AsyncLock();
    }
    return AsyncLock.instance;
  }

  /**
   * 尝试加锁。**成功返回句柄，失败返回 `undefined`** ——
   * 用返回值而不是抛异常，因为「没抢到」是正常业务流，不是错误。
   *
   * @param key            锁名，建议带命名空间（`craft:p1`）
   * @param owner          持锁者标签，仅用于诊断
   * @param timeoutSeconds 兜底超时，默认 10 秒
   * @param reason         加锁目的（如「锻造」），会写进超时告警
   */
  public tryAcquire(
    key: string,
    owner: string = "-",
    timeoutSeconds: number = DEFAULT_LOCK_TIMEOUT,
    reason: string = ""
  ): LockHandle | undefined {
    if (this.held.has(key)) return undefined;

    const token = this.nextToken;
    this.nextToken = token + 1;
    this.held.set(key, {
      owner,
      reason,
      expiresAt: this.now + timeoutSeconds,
      timeoutSeconds,
      token,
    });
    return new LockHandle(this, key, token);
  }

  /** 这把锁现在被占着没有。**仅用于 UI 置灰之类的展示**，判断能否执行请用 `tryAcquire` */
  public isBusy(key: string): boolean {
    return this.held.has(key);
  }

  /**
   * 强制解锁（不管是谁持有的）。慎用 —— 正常路径应该让 `LockHandle.release()` 走。
   * 用于「玩家退出游戏」这类整个命名空间作废的场景，配合 `releaseByOwner`。
   */
  public release(key: string): void {
    this.held.delete(key);
  }

  /** 释放某个所有者名下的全部锁，返回释放了几把（玩家退出时收尾用） */
  public releaseByOwner(owner: string): number {
    const keys = this.keysOfOwner(owner);
    const n = keys.length;
    for (let i = 0; i < n; i++) {
      const key = keys[i];
      if (key === undefined) continue;
      this.held.delete(key);
    }
    return n;
  }

  /**
   * 每 tick 由 `Scheduler` 驱动：回收已超时的锁。
   *
   * 超时是**异常**（正常路径都该主动释放），所以一定会留下痕迹：日志一直写，
   * 另外如果装了 `timeoutReporter` 再往那个出口报一份（现在是接到聊天框的警告频道）。
   *
   * @returns 被超时回收的 key 列表（空数组 = 一切正常）
   */
  public sweep(now: number): string[] {
    this.now = now;
    const expired = this.expiredKeys(now);
    const n = expired.length;
    if (n === 0) return expired;

    for (let i = 0; i < n; i++) {
      const key = expired[i];
      if (key === undefined) continue;
      const entry = this.held.get(key);
      this.held.delete(key);
      if (entry === undefined) continue;

      const message =
        `状态锁「${key}」超过 ${entry.timeoutSeconds} 秒未释放` +
        `（持有者 ${entry.owner}${entry.reason === "" ? "" : "，" + entry.reason}），已强制回收`;
      log.warn(message);
      if (this.timeoutReporter !== undefined) {
        this.timeoutReporter(message);
      }
    }
    return expired;
  }

  /** 超时告警的出口。不设置的话超时**静默**回收（只写日志） */
  public setTimeoutReporter(report: ((message: string) => void) | undefined): void {
    this.timeoutReporter = report;
  }

  /** 当前持有的锁数量（诊断用） */
  public get size(): number {
    return this.held.size;
  }

  /** 全部清空（热重载 / 对局结束） */
  public clear(): void {
    this.held.clear();
  }

  // ------------------------------------------------------------------
  // 内部
  // ------------------------------------------------------------------

  /**
   * `LockHandle.release()` 的实际落点。
   *
   * **必须校验 token**：锁可能已经超时被回收、又被另一个任务拿走了，此时前一个任务
   * 收尾时那句 `release()` 若不校验就会把**别人的**锁解掉 —— 表现为「防重复点击
   * 偶发失效」，极难复现也极难定位。
   */
  public releaseHandle(key: string, token: number): void {
    const entry = this.held.get(key);
    if (entry === undefined) return;
    if (entry.token !== token) return;
    this.held.delete(key);
  }

  private expiredKeys(now: number): string[] {
    const result: string[] = [];
    this.held.forEach((entry, key) => {
      if (entry.expiresAt <= now) {
        result.push(key);
      }
    });
    return result;
  }

  private keysOfOwner(owner: string): string[] {
    const result: string[] = [];
    this.held.forEach((entry, key) => {
      if (entry.owner === owner) {
        result.push(key);
      }
    });
    return result;
  }
}

/** 全局单例。异步任务用它上锁 */
export const locks = AsyncLock.getInstance();
