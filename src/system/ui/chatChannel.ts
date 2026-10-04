/**
 * 聊天频道标签。
 *
 * ## 为什么单独一个文件
 *
 * 为了**避开循环依赖**。消息出口 `src/system/console.ts` 也要用它 —— `log` / `warn` /
 * `error` 必须给消息打上默认频道，否则筛选一开，没标签的消息会整批从画面上消失。
 * 而 `ChatBoxUI` 已经 import 了 `console`，枚举再留在 `ChatBoxUI.ts` 里就成环了：
 * `ChatBoxUI → console → ChatBoxUI`。
 *
 * ## 它在下游是什么
 *
 * 值就是字符串。`MessageList` 拿它当**不透明 tag** 比字符串（`setFilterTag`），
 * 完全不认识这个类型 —— 通用组件不该知道聊天频道的存在。
 */
export enum ChatChannel {
  /** 玩家公屏消息 */
  PLAYER = "PLAYER",
  /** 系统提示：全局公告、装备获取、锻造结果等 */
  SYSTEM = "SYSTEM",
  /** 战斗日志：伤害、元素反应等 */
  COMBAT = "COMBAT",
  /** 警告与报错：材料不足、回收失败、异步任务异常等 */
  WARNING = "WARNING",
}
