/**
 * 异步底座的自测播种 —— **只用来验证底座，验证完可整段删掉**。
 *
 * 每一条都打印可核对的事实（tick 数、实际耗时秒数、锁的得失），不是「跑完没报错
 * 就算过」：这个仓库吃过「日志全绿但画面上什么都没有」的亏，所以自测一律以
 * **能对上的数字**为凭据。
 *
 * 由 `main.ts` 的调试入口 `main()` 调用（只在 debug 模式跑）。
 */

import { createLogger } from "src/utils/logger";
import { AsyncOwner } from "src/system/async/AsyncOwner";
import { locks } from "src/system/async/AsyncLock";
import { scheduler, TICK_INTERVAL } from "src/system/async/Scheduler";

const log = createLogger("AsyncTest");

/** 分片任务的总条数与每拍条数。10 拍 ≈ 0.5 秒 */
const CHUNK_COUNT = 200;
const CHUNK_PER_TICK = 20;

export function asyncSelfTest(): void {
  log.info(`=== 异步底座自测开始（心跳 ${TICK_INTERVAL}s）===`);
  testChunked();
  testDefer();
  testLock();
  testLockTimeout();
  testOwnerRelease();
}

/** 1. 分片任务：200 条分 10 拍跑完，中途不卡 */
function testChunked(): void {
  const startedAt = scheduler.elapsedSeconds;
  let processed = 0;
  let halfwayLogged = false;

  scheduler.runChunked({
    count: CHUNK_COUNT,
    perTick: CHUNK_PER_TICK,
    step: (i) => {
      processed++;
      if (!halfwayLogged && i + 1 === CHUNK_COUNT / 2) {
        halfwayLogged = true;
        log.info(
          `[分片] 跑到一半：第 ${i + 1}/${CHUNK_COUNT} 条，` +
            `用时 ${(scheduler.elapsedSeconds - startedAt).toFixed(2)}s`
        );
      }
    },
    done: () => {
      const cost = scheduler.elapsedSeconds - startedAt;
      log.info(
        `[分片] 完成：处理 ${processed}/${CHUNK_COUNT} 条，` +
          `用时 ${cost.toFixed(2)}s（预期约 ${((CHUNK_COUNT / CHUNK_PER_TICK) * TICK_INTERVAL).toFixed(2)}s）`
      );
    },
    fail: (e) => log.error(`[分片] 意外失败：${e}`),
  });
}

/** 2. 延迟回调：挂在心跳上，不建原生 Timer */
function testDefer(): void {
  const startedAt = scheduler.elapsedSeconds;
  log.info("[延迟] 已登记 0.50s 的回调");

  scheduler.defer(0.5, () => {
    const cost = scheduler.elapsedSeconds - startedAt;
    log.info(`[延迟] 触发，实际等待 ${cost.toFixed(2)}s（预期 ≈0.50s）`);
  });

  scheduler.defer(0, () => log.info("[延迟] defer(0) 在下一拍触发"));
}

/** 3. 状态锁：拿得到 / 拿不到 / 释放后又能拿到 */
function testLock(): void {
  const key = "selftest:lock";
  const first = locks.tryAcquire(key, "自测", 10, "第一把");
  log.info(`[锁] 第一次加锁：${first !== undefined ? "成功" : "失败"}`);

  const second = locks.tryAcquire(key, "自测", 10, "第二把");
  log.info(`[锁] 重复加锁：${second === undefined ? "被挡住（预期）" : "居然成功了（不对）"}`);

  if (first !== undefined) first.release();
  const third = locks.tryAcquire(key, "自测", 10, "第三把");
  log.info(`[锁] 释放后重新加锁：${third !== undefined ? "成功（预期）" : "失败（不对）"}`);
  if (third !== undefined) third.release();

  // 同一个句柄重复 release 必须无害（三条收尾路径都会调它）
  if (first !== undefined) first.release();
  log.info("[锁] 重复 release 未抛异常（预期）");
}

/**
 * 4. 超时兜底：拿一把锁**故意不释放**，0.3 秒后应被回收并留下告警。
 *
 * 这条是「防重复点击偶发失效」和「按钮再也不响应」两类 bug 的兜底，
 * 必须亲眼看到它生效。
 */
function testLockTimeout(): void {
  const key = "selftest:timeout";
  const handle = locks.tryAcquire(key, "自测-故意不解锁", 0.3, "超时演练");
  log.info(`[锁超时] 已加锁且不释放（${handle !== undefined ? "加锁成功" : "加锁失败"}）`);

  scheduler.defer(1.0, () => {
    const busy = locks.isBusy(key);
    log.info(`[锁超时] 1 秒后复查：「${key}」${busy ? "仍被占着（不对，超时没生效）" : "已被回收（预期）"}`);
  });
}

/** 5. owner 清理：对象销毁时，名下未触发的 defer 一并取消 */
function testOwnerRelease(): void {
  const owner = new AsyncOwner();

  scheduler.defer(0.8, () => log.error("[owner] 这条不该出现 —— owner 已释放，回调仍跑了"), owner);

  scheduler.defer(0.2, () => {
    log.info("[owner] 释放 owner");
    owner.release();
  }, owner);

  scheduler.defer(1.2, () => {
    log.info(`[owner] 复查：owner.isReleased=${owner.isReleased}（预期 true）`);
  });
}
