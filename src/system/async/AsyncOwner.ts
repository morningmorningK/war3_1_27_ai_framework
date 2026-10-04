/**
 * 异步回调的「归属令牌」—— 对象销毁时一次性取消自己名下所有异步任务。
 *
 * `todo.md:40` 的原文要求：**对象销毁时，必须清理绑定的异步回调、计时器**，
 * 防止内存泄漏、回调执行在已销毁对象上。本仓库此前没有这个机制，后果是实打实的：
 * `BuffSystem`（`:25-35`）和 `damage.ts`（`:106-112`）建的周期定时器**根本没有
 * destroy 路径**，一旦那个对象不该再刷了，回调照样每 tick 跑。
 *
 * ## 用法
 *
 * ```ts
 * class Foo {
 *   private owner = new AsyncOwner();
 *
 *   public bar(): void {
 *     scheduler.defer(0.5, () => this.baz(), this.owner);   // 挂在这个 owner 名下
 *   }
 *
 *   public destroy(): void {
 *     this.owner.release();   // 上面那个 defer 一并取消，不必逐个记句柄
 *   }
 * }
 * ```
 *
 * ## 为什么是「对象」而不是「字符串 key」
 *
 * 字符串 key（`"unit:12"`）需要调用方保证全局唯一，拼错了就是一个**不会报错**的
 * 串号 —— 两个对象无意中同名，销毁其一会把另一个的回调也取消掉。对象身份由语言
 * 保证唯一，且编译期就能查出「这里少传了个 owner」。
 */
export class AsyncOwner {
  /** `undefined` = 已释放。用 undefined 而不是空数组，这样「释放后误用」能被 assert 抓到 */
  private cancels: Array<() => void> | undefined = [];

  /**
   * 登记一个取消函数。**由调度器在创建任务时调用**，业务代码不用直接碰它。
   *
   * 已经 `release()` 过的 owner 再收到登记，会**立刻**执行取消 —— 这是为了堵住
   * 「对象已销毁，但某个延迟路径这才想起来建任务」的窗口期：不这么做的话，
   * 那个任务会带着一个死对象的回调活到天荒地老。
   */
  public track(cancel: () => void): void {
    const list = this.cancels;
    if (list === undefined) {
      cancel();
      return;
    }
    list.push(cancel);
  }

  /**
   * 取消该 owner 名下的**全部**异步任务，并永久作废这个 owner。
   *
   * 幂等；单个取消失败不影响其余的（`catch` 里**没有** `continue` ——
   * 见 `FrameLoop.ts` 记的那个 tstl 代码生成坑）。
   */
  public release(): void {
    const list = this.cancels;
    if (list === undefined) return;
    this.cancels = undefined;

    const n = list.length;
    for (let i = 0; i < n; i++) {
      const cancel = list[i];
      if (cancel === undefined) continue;
      try {
        cancel();
      } catch (e) {
        // 取消本身失败不该阻断其余的取消：这个 owner 已经在销毁路径上了，
        // 抛出去只会让调用方的 destroy() 半途而废
        print(`[Async][WARN] 取消一个异步任务时抛出异常，已忽略：${e}`);
      }
    }
  }

  /** 是否已经释放过（释放后不可复用，需要重新 `new`） */
  public get isReleased(): boolean {
    return this.cancels === undefined;
  }
}

/**
 * 「能被释放的东西」的最小接口。
 *
 * `Scheduler.runChunked` 的 `lock` 字段用它做类型（而不是直接依赖 `AsyncLock`），
 * 这样调度器不必知道锁是怎么实现的，也避免了 `Scheduler` ↔ `AsyncLock` 的循环导入。
 */
export interface Releasable {
  release(): void;
}
