/**
 * 本地时钟 —— 给聊天消息打时间戳。
 *
 * ## 为什么要自己算，不用 `os.date`
 *
 * 全仓没有一处用过 `os.date`（`HotReload.ts` 只用过 `os.time()`，`Tips.ts` 只用过
 * `os.clock()`），而 WC3 的 Lua 运行时是**裁剪过的** —— 没有验证过的库函数不要赌。
 * `os.time()` 走的是 `mktime`，返回秒级时间戳，取模 86400 拿到的是**本地时区**当天的秒数，
 * 拿它做纯算术就能拼出 `HH:MM:SS`，不需要任何格式化函数。
 *
 * ## 打戳的时机
 *
 * 由调用方决定 —— 聊天框是在 `Console.say()` **入队那一刻**打的，不是渲染那一刻。
 * 队列是每 0.1 秒放行一条的，渲染时打戳会让越挤的消息时间越偏后。
 */

/** 两位补零。`os.date("%S")` 不可用，只能自己来 */
function pad2(value: number): string {
  return value < 10 ? "0" + value : "" + value;
}

/**
 * 当前本地时间，格式 `HH:MM:SS`。
 *
 * **取不到就返回空串**（`os` 表缺失或 `os.time` 被裁剪掉），调用方直接不拼前缀即可 ——
 * 时间戳打不出来是小事，把聊天框整个带崩是大事。
 *
 * ⚠️ 函数体里**不能出现 `break` / `continue`** —— tstl 会把 `catch` 块编译成一个内嵌函数，
 * 而从 `try` 里跳到外面的 label 跨不了函数边界，整个 `.lua` 会加载失败（表现为原生闪退）。
 * 此处本来也没有循环，改的时候注意别加。
 */
export function formatClock(): string {
  try {
    const secondsOfDay = ((os.time() % 86400) + 86400) % 86400;
    const hours = Math.floor(secondsOfDay / 3600);
    const minutes = Math.floor((secondsOfDay % 3600) / 60);
    const seconds = secondsOfDay % 60;
    return pad2(hours) + ":" + pad2(minutes) + ":" + pad2(seconds);
  } catch (e) {
    return "";
  }
}
