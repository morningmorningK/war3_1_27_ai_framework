/**
 * 异步调度器 —— 全地图唯一的「心跳」，帧分片 / 延迟回调 / 每 tick 任务都挂在它身上。
 *
 * ## 为什么不用 `FrameLoop.onFrame`（对本仓库 `todo.md:42` 的一处有意偏离）
 *
 * `todo.md:42` 写的是「消息入消息队列，由**帧循环**统一消费」。实现选的是
 * **一个共享的周期 `Timer`（20Hz）**，三条理由：
 *
 * 1. **`onFrame` 无法注销。** 它的底层 `DzFrameSetUpdateCallbackByCode` 是 Set 不是 Add，
 *    全局只有一个槽，引擎明说不能注销（`FrameLoop.ts:6-17`）。而 `todo.md:40` 同时要求
 *    「对象销毁时必须清理绑定的异步回调、计时器」—— 只有 `Timer` 做得到，`onFrame`
 *    结构上做不到，只能靠订阅者自己判存活，残留回调永远在跑。
 * 2. **`onFrame` 里禁止建 / 毁 frame 句柄**（`FrameLoop.ts:19-26`）。这个底座的下一个
 *    消费者（背包渲染、装备列表）必然要增删句柄。`BuffBarUI` 正是为此把「槽位增删重建」
 *    放在 0.1 秒的定时器里、每帧回调只刷文字。
 * 3. **不争槽、间隔稳定。** `onFrame` 已经被 `UnitBlood` / `BuffBarUI` /
 *    `CommandCardCooldownUI` 共用，且引擎注释明写「帧数间隔不稳定」；分片节拍和
 *    `defer` 到期时刻都需要可预测。
 *
 * 「消息延迟一拍才上屏」在本步是**无感**的：20Hz 意味着最多 50ms（平均 25ms），
 * 远低于人眼可感知的 ~100ms 阈值；而且原生聊天区被我们隐藏了，不存在「和原生比谁快」。
 *
 * 真正需要逐帧平滑的东西（技能冷却暗幕）继续走 `FrameLoop`，两条路互不干扰。
 *
 * ## 三种任务
 *
 * | 方法 | 语义 | 典型用途 |
 * |---|---|---|
 * | `onTick(cb)` | 每拍都调 | 消费消息队列 |
 * | `defer(delay, cb)` | `delay` 秒后调**一次** | 把「改 frame 树的动作」挪出同步回调 |
 * | `runChunked(spec)` | 分 `count` 条、每拍处理 `perTick` 条 | 大批量循环（背包渲染、词条结算） |
 *
 * 三者都接受可选的 `AsyncOwner`，对象销毁时一句 `owner.release()` 全部取消。
 *
 * ## 两条必须守的纪律（本仓库踩过）
 *
 * - **`catch` 里绝不写 `continue`**。tstl 把 `catch` 编成内嵌函数，`continue` 生成的
 *   `goto` 找不到 label，整个 `.lua` 加载失败 → 原生闪退（MSVCP140 那一族）。
 *   本文件的应对是：**循环体里不写 try/catch**，一律抽成独立方法（`runStep` / `invoke`）。
 * - **带洞的数组不能用 `.length` / `for...of` / `.filter`**。所以内部一律用
 *   `for (let i = 0; i < n; i++)` + 逐个判 `undefined`，并且**绝不给数组元素赋 `undefined`**
 *   （在 Lua 里等于删键）。取消用标记位，随后 `splice` 压实。
 */

import { Timer } from "@eiriksgata/wc3ts/*";
import { createLogger } from "src/utils/logger";
import { AsyncOwner, type Releasable } from "./AsyncOwner";
import { locks } from "./AsyncLock";

const log = createLogger("Async");

/**
 * 心跳周期（秒）。
 *
 * 20Hz。比 `BuffBarUI` 的 0.1s（10Hz）快一倍 —— 聊天上屏要在「玩家回车」的观感内，
 * 而分片任务的吞吐也要够。**这是全局唯一的调参旋钮**，改它等于改所有异步任务的节拍。
 */
export const TICK_INTERVAL = 0.05;

/** 延迟回调任务 */
interface DeferredJob {
  readonly cb: () => void;
  readonly dueAt: number;
  cancelled: boolean;
}

/** 每 tick 任务 */
interface TickJob {
  readonly cb: () => void;
  dead: boolean;
}

/** 一次可取消的登记（`defer` / `onTick` 的返回物） */
export class CancelHandle {
  private cancelFn: (() => void) | undefined;

  public constructor(cancelFn: () => void) {
    this.cancelFn = cancelFn;
  }

  /** 幂等 */
  public cancel(): void {
    const fn = this.cancelFn;
    if (fn === undefined) return;
    this.cancelFn = undefined;
    fn();
  }

  public get isCancelled(): boolean {
    return this.cancelFn === undefined;
  }
}

/**
 * 分片任务的描述。
 *
 * ⚠️ **刻意不接受数组参数**，只要 `count` + `step(index)`。理由是本仓库的
 * 稀疏数组陷阱：按下标写、中间留 `undefined` 的数组，编译到 Lua 之后 `.length` 会是
 * **0**，`for...of` / `.filter` 静默全废（`wc3-tstl-sparse-array-length`）。
 * 让调用方自己按下标读数据，从根子上没有「框架替我遍历」这回事，也就没有踩中的机会。
 */
export interface ChunkedTaskSpec {
  /** 条目总数 */
  count: number;
  /** 每拍处理多少条。建议按「一拍内的工作量」估，不是越大越好 */
  perTick: number;
  /** 处理第 `index` 条（0 起）。**抛异常 = 整个任务失败** */
  step: (index: number) => void;
  /** 全部处理完毕。与 `fail` 互斥 */
  done?: () => void;
  /** 任一步抛异常。**接手后任务立即中止**，`done` 不会再被调用 */
  fail?: (error: unknown) => void;
  /**
   * 每拍开始前问一次「还该继续吗」。返回 `false` 则**静默中止** ——
   * 既不调 `done` 也不调 `fail`（目标对象已经没了，这不是错误，只是没意义了）。
   *
   * 这是 `todo.md:31` 那条「回调触发前校验目标对象是否有效」的落点：
   * 传 `() => actor.isAlive()` 之类。
   */
  alive?: () => boolean;
  /**
   * 这个任务持有的状态锁。**调度器保证 `done` / `fail` / 取消三条路径都会释放它** ——
   * 这正是把 `lock` 交给调度器、而不是让调用方自己 `release()` 的原因：
   * 「忘了解锁」是这类代码最常见的 bug，不该靠人记得。
   */
  lock?: Releasable;
}

/** 分片任务的句柄 */
export class TaskHandle {
  private cancelFn: (() => void) | undefined;

  public constructor(cancelFn: () => void) {
    this.cancelFn = cancelFn;
  }

  /** 取消。**不触发 `done`**，但照样释放锁 */
  public cancel(): void {
    const fn = this.cancelFn;
    if (fn === undefined) return;
    this.cancelFn = undefined;
    fn();
  }

  public get isCancelled(): boolean {
    return this.cancelFn === undefined;
  }
}

/** 正在跑的分片任务 */
interface ChunkedJob {
  readonly spec: ChunkedTaskSpec;
  index: number;
  cancelled: boolean;
  /** `done` / `fail` / 取消都收敛到它，保证只跑一次 */
  finalized: boolean;
}

export class Scheduler {
  private static instance: Scheduler | undefined;

  private timer: Timer | null = null;
  private running = false;

  /** 从 `start()` 起累加的秒数。`defer` 的到期时刻、状态锁的超时都以它为时钟 */
  private elapsed = 0;

  private deferred: DeferredJob[] = [];
  private tickJobs: TickJob[] = [];
  private chunked: ChunkedJob[] = [];

  /** 防重入：回调里再触发 tick 的可能路径都堵死 */
  private ticking = false;

  private constructor() {}

  public static getInstance(): Scheduler {
    if (!Scheduler.instance) {
      Scheduler.instance = new Scheduler();
    }
    return Scheduler.instance;
  }

  /** 起心跳。**幂等**，重复调用什么也不做（`main.ts` 里可能被调多次） */
  public start(): void {
    if (this.running) return;
    this.running = true;
    this.elapsed = 0;

    const timer = Timer.create();
    this.timer = timer;
    timer.start(TICK_INTERVAL, true, () => {
      this.tick();
    });

    log.info(`异步调度器已启动，心跳 ${TICK_INTERVAL}s`);
  }

  /**
   * 停心跳并清空全部任务。
   *
   * 清空时**分片任务会走 finalize**（因此锁会被释放），只是不触发 `done` ——
   * 热重载时对象马上要重建，这时候再调它们的 `done` 只会碰到半死的对象。
   */
  public stop(): void {
    const timer = this.timer;
    this.timer = null;
    this.running = false;

    if (timer !== null) {
      timer.destroy();
    }

    const n = this.chunked.length;
    for (let i = 0; i < n; i++) {
      const job = this.chunked[i];
      if (job === undefined) continue;
      this.finalizeChunked(job, false);
    }

    this.chunked = [];
    this.deferred = [];
    this.tickJobs = [];
  }

  public isRunning(): boolean {
    return this.running;
  }

  /** 从 `start()` 起累加的秒数 */
  public get elapsedSeconds(): number {
    return this.elapsed;
  }

  // ------------------------------------------------------------------
  // 对外：三种任务
  // ------------------------------------------------------------------

  /**
   * 每拍调一次 `cb`。用于「消费队列」这种常态工作。
   *
   * ⚠️ 空闲时**务必在第一行做 O(1) 的空判断**（例如 `if (queue.isEmpty()) return;`）——
   * 它每 50ms 都会被执行一次，常年累月。
   */
  public onTick(cb: () => void, owner?: AsyncOwner): CancelHandle {
    // ⚠️ 不能写成简写属性 `{ cb, ... }`：类方法里 tstl 会把函数类型的参数当成带 `this`
    // 的，报 "Unable to convert function with no 'this' parameter to function 'cb' with 'this'"。
    // 包一层箭头函数是 tstl 自己给的修法（模块级作用域没这个问题，所以 `FrameLoop.ts:50`
    // 的简写是能过的）。注册只发生在组件 create 时，这点闭包开销可以忽略。
    const job: TickJob = { cb: () => cb(), dead: false };
    this.tickJobs.push(job);

    const handle = new CancelHandle(() => {
      job.dead = true;
    });
    if (owner !== undefined) owner.track(() => handle.cancel());
    return handle;
  }

  /**
   * `delaySeconds` 秒后调一次 `cb`。
   *
   * **不创建原生 Timer** —— 条目挂在调度器自己的心跳上。理由是 `todo.md:39` 那条
   * 「不要嵌套大量临时定时器」：仓库里现在到处是手写的
   * `Timer.create().start(delay, false, cb)`（`Tips.ts:362`、`UnitBloodToggleUI.ts:195`、
   * `HeroUnitSkill.ts:61`……），每个都是一个独立的引擎定时器句柄，且大半没有销毁路径。
   *
   * `delaySeconds <= 0` 等价于「下一拍」。
   */
  public defer(delaySeconds: number, cb: () => void, owner?: AsyncOwner): CancelHandle {
    const delay = delaySeconds > 0 ? delaySeconds : 0;
    const job: DeferredJob = {
      // 包箭头函数的原因与 `onTick` 里那条注释相同（tstl 的 `this` 转换限制）
      cb: () => cb(),
      dueAt: this.elapsed + delay,
      cancelled: false,
    };
    this.deferred.push(job);

    const handle = new CancelHandle(() => {
      job.cancelled = true;
    });
    if (owner !== undefined) owner.track(() => handle.cancel());
    return handle;
  }

  /**
   * 分片执行 `spec.count` 条，每拍 `spec.perTick` 条。
   *
   * 返回的句柄可以 `cancel()`；`done` / `fail` / 取消三条路径都会释放 `spec.lock`。
   */
  public runChunked(spec: ChunkedTaskSpec, owner?: AsyncOwner): TaskHandle {
    const job: ChunkedJob = {
      spec,
      index: 0,
      cancelled: false,
      finalized: false,
    };

    if (spec.count <= 0) {
      // 空任务：立刻收尾，别占着锁等下一拍，也别让调用方以为「还在跑」
      job.finalized = true;
      this.releaseLock(spec);
      this.invokeDone(spec);
      return new TaskHandle(() => {});
    }

    this.chunked.push(job);

    const handle = new TaskHandle(() => {
      if (job.finalized) return;
      job.cancelled = true;
      // 立刻 finalize 而不是等下一拍：锁要马上还回去，
      // 「取消之后按钮还是点不动」是很刺眼的 bug
      this.finalizeChunked(job, false);
    });
    if (owner !== undefined) owner.track(() => handle.cancel());
    return handle;
  }

  // ------------------------------------------------------------------
  // 心跳
  // ------------------------------------------------------------------

  private tick(): void {
    if (!this.running || this.ticking) return;
    this.ticking = true;

    this.elapsed += TICK_INTERVAL;

    // 状态锁的兜底超时回收。放在最前面：先还掉不该再占着的锁，
    // 后面这一拍里想抢同一把锁的任务就能立刻拿到
    this.sweepLocks();

    this.runDeferred();
    this.runChunkedJobs();
    this.runTickJobs();

    this.ticking = false;
  }

  private sweepLocks(): void {
    // 日志与告警都在 AsyncLock.sweep 里出（它才知道这把锁加锁时的超时值），
    // 这里只管推进时钟
    locks.sweep(this.elapsed);
  }

  private runDeferred(): void {
    const list = this.deferred;
    const n = list.length;
    if (n === 0) return;

    let write = 0;
    let changed = false;

    for (let read = 0; read < n; read++) {
      const job = list[read];
      if (job === undefined || job.cancelled) {
        changed = true;
        continue;
      }
      if (job.dueAt > this.elapsed) {
        if (write !== read) list[write] = job;
        write++;
        continue;
      }
      changed = true;
      this.invoke(job.cb, "defer 回调");
    }

    // 本拍新追加的（下标 >= n）。它们至少要等下一拍才可能到期
    const total = list.length;
    for (let read = n; read < total; read++) {
      const job = list[read];
      if (job === undefined) continue;
      list[write] = job;
      write++;
    }

    if (changed || write !== total) {
      list.splice(write);
    }
  }

  private runTickJobs(): void {
    const list = this.tickJobs;
    const n = list.length;
    if (n === 0) return;

    let write = 0;
    let changed = false;

    for (let read = 0; read < n; read++) {
      const job = list[read];
      if (job === undefined || job.dead) {
        changed = true;
        continue;
      }
      if (write !== read) list[write] = job;
      write++;
      this.invoke(job.cb, "onTick 回调");
    }

    const total = list.length;
    for (let read = n; read < total; read++) {
      const job = list[read];
      if (job === undefined) continue;
      list[write] = job;
      write++;
    }

    if (changed || write !== total) {
      list.splice(write);
    }
  }

  private runChunkedJobs(): void {
    const list = this.chunked;
    const n = list.length;
    if (n === 0) return;

    const keep: ChunkedJob[] = [];
    for (let read = 0; read < n; read++) {
      const job = list[read];
      if (job === undefined) continue;
      if (job.cancelled) {
        // 取消的句柄已经自己 finalize 过了，这里只负责把它从表里摘掉
        this.finalizeChunked(job, false);
        continue;
      }
      if (this.stepChunked(job)) {
        keep.push(job);
      }
    }

    const total = list.length;
    for (let read = n; read < total; read++) {
      const job = list[read];
      if (job !== undefined) keep.push(job);
    }

    this.chunked = keep;
  }

  /**
   * 推进一拍。
   *
   * @returns 任务是否还在跑（`false` = 已收尾，调用方应从表里摘掉）
   */
  private stepChunked(job: ChunkedJob): boolean {
    if (job.finalized) return false;

    if (job.spec.alive !== undefined && !this.isAlive(job.spec)) {
      // 目标没了：静默中止。不调 done（没做完）、也不调 fail（不是错误）
      this.finalizeChunked(job, false);
      return false;
    }

    const count = job.spec.count;
    const perTick = job.spec.perTick > 0 ? job.spec.perTick : 1;
    const end = job.index + perTick > count ? count : job.index + perTick;

    for (let i = job.index; i < end; i++) {
      if (!this.runStep(job, i)) {
        this.finalizeChunked(job, false);
        return false;
      }
    }

    job.index = end;
    if (job.index >= count) {
      this.finalizeChunked(job, true);
      return false;
    }
    return true;
  }

  /**
   * 跑一条。
   *
   * **单独一个方法**是刻意的：tstl 把 `catch` 编成内嵌函数，循环体里直接写 try/catch
   * 容易踩那个 `goto` 的代码生成坑（见 `FrameLoop.ts` 与 `main.ts` 的注释）。
   * 抽出来之后，`stepChunked` 的循环体里只有普通语句。
   *
   * @returns 是否成功（`false` = 已调过 `fail`）
   */
  private runStep(job: ChunkedJob, index: number): boolean {
    try {
      job.spec.step(index);
      return true;
    } catch (e) {
      log.error(`分片任务第 ${index} 条抛出异常，任务中止：${e}`);
      this.invokeFail(job.spec, e);
      return false;
    }
  }

  private isAlive(spec: ChunkedTaskSpec): boolean {
    const alive = spec.alive;
    if (alive === undefined) return true;
    try {
      return alive();
    } catch (e) {
      // 「存活检查」自己抛异常，按「不存活」处理 —— 保守方向是别碰那个对象
      log.error(`分片任务的 alive 检查抛出异常，按失效处理：${e}`);
      return false;
    }
  }

  /** `done` / `fail` / 取消的唯一收口。`finalized` 保证只跑一次 */
  private finalizeChunked(job: ChunkedJob, callDone: boolean): void {
    if (job.finalized) return;
    job.finalized = true;

    this.releaseLock(job.spec);
    if (callDone) {
      this.invokeDone(job.spec);
    }
  }

  private releaseLock(spec: ChunkedTaskSpec): void {
    const lock = spec.lock;
    if (lock === undefined) return;
    try {
      lock.release();
    } catch (e) {
      // 释放失败不能把 done 也吞掉 —— 业务那边还等着收尾
      log.error(`释放状态锁时抛出异常，已忽略：${e}`);
    }
  }

  private invokeDone(spec: ChunkedTaskSpec): void {
    const done = spec.done;
    if (done === undefined) return;
    this.invoke(done, "runChunked 的 done 回调");
  }

  private invokeFail(spec: ChunkedTaskSpec, error: unknown): void {
    const fail = spec.fail;
    if (fail === undefined) return;
    try {
      fail(error);
    } catch (e) {
      log.error(`runChunked 的 fail 回调自己抛出异常，已忽略：${e}`);
    }
  }

  /**
   * 跑一个业务回调，把异常挡在这里。
   *
   * 一个任务抛异常不该让同一拍里其它任务也不跑（`FrameLoop.invoke` 同一个思路）。
   */
  private invoke(cb: () => void, what: string): void {
    try {
      cb();
    } catch (e) {
      log.error(`${what}抛出异常，已隔离：${e}`);
    }
  }
}

/** 全局单例 */
export const scheduler = Scheduler.getInstance();
