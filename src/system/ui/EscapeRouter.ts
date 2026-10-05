/**
 * ESC 退出的**单点注册与派发**。
 *
 * ## 为什么要有这个东西
 *
 * ESC 是「关闭当前界面」的通用热键，而 1.27a 只有**全局**键盘触发
 * （`DzTriggerRegisterKeyEventByCode`，没有 frame 级按键 API）——
 * 意味着每多一个 UI 各自注册一次 ESC，就多一个全局触发器。
 *
 * 后果不是性能，是**行为不可预测**：
 *
 *   - 谁先注册谁先跑由一个 `Set` 的插入顺序决定，玩家按一下 ESC 可能同时关掉两个界面；
 *   - 没有任何一处知道「当前最上层的是谁」，所以做不出「关掉最上面那个」这个
 *     唯一符合直觉的语义；
 *   - 想做「ESC 优先级」时，得去改每一个组件的注册顺序。
 *
 * 所以这里是**唯一**注册 ESC 的地方。各 UI 把自己登记成一个 `EscapeHandler`，
 * 按「后被打开的在上」的顺序压栈；按下 ESC 时**从栈顶往下问，第一个返回 `true`
 * 的吃掉这次按键**，后面的不再收到。
 *
 * ## 用法
 *
 * ```ts
 * const handler: EscapeHandler = () => {
 *   if (!this.isOpen) return false;   // 没开着就别消费，让下面一层去关
 *   this.close();
 *   return true;
 * };
 * EscapeRouter.getInstance().push(handler);
 * // UI 销毁时（如果有那么一天）
 * EscapeRouter.getInstance().remove(handler);
 * ```
 *
 * ## 约束
 *
 * - **聊天时整体短路**。`DzIsChatBoxOpen()` 为真直接返回，不然玩家在聊天框里
 *   按 ESC 取消输入会顺手把界面关掉。这条已在 Step 0 实测确认：聊天框打开时
 *   按键触发器**照样触发**，所以这道门控是必需的，不是防御性代码。
 * - 回调在**原生事件派发内部同步执行**，里面只能改 frame 的属性
 *   （`setVisible` / `setText` …），**不能增删 frame 树** —— 那会让游戏闪退。
 *   真要重建界面，用 `scheduler.defer(0, ...)` 挪出去。
 * - 消费与否**靠返回值**，不靠异常：抛异常的那个 handler 会被当作「没消费」
 *   并记一条错误，栈继续往下走 —— 一个界面出问题不该让 ESC 整体失效。
 */

import { createLogger } from "src/utils/logger";
import { keyboardEvents, KeyCode } from "src/system/event";

const log = createLogger("EscapeRouter");

/**
 * 一个界面对 ESC 的处理。
 *
 * @returns `true` = 这次 ESC 由我处理了，不要再往下传；`false` = 我这边没开着，继续。
 */
export type EscapeHandler = () => boolean;

export class EscapeRouter {
  private static instance: EscapeRouter | undefined;

  /**
   * 登记表。**顺序即层级**：数组末尾是最后登记的，也就是最上层。
   *
   * 用数组而不是 `Set` —— 需要按下标从后往前遍历，而 `Set` 在 tstl 下的迭代
   * 顺序不值得依赖（且 Lua 里带洞数组的 `.length` 是 0，见项目铁律）。
   */
  private readonly handlers: EscapeHandler[] = [];

  /** ESC 触发器是否已注册。只注册一次，重复 `push` 不会重复注册 */
  private bound = false;

  private constructor() {}

  public static getInstance(): EscapeRouter {
    if (!EscapeRouter.instance) {
      EscapeRouter.instance = new EscapeRouter();
    }
    return EscapeRouter.instance;
  }

  /**
   * 登记一个可被 ESC 关闭的界面。**最后登记的在最上层**。
   *
   * 重复登记同一个函数会被忽略 —— 界面通常是单例，`create()` 可能被多次调用。
   */
  public push(handler: EscapeHandler): void {
    if (this.handlers.indexOf(handler) >= 0) {
      return;
    }
    this.handlers.push(handler);
    this.ensureBound();
  }

  /**
   * 把界面移到栈顶。已打开的界面再次被打开时调用 ——
   * 「最近打开的那个先被关掉」才是符合直觉的顺序。
   */
  public bringToTop(handler: EscapeHandler): void {
    const i = this.handlers.indexOf(handler);
    if (i < 0) {
      this.push(handler);
      return;
    }
    this.handlers.splice(i, 1);
    this.handlers.push(handler);
  }

  /** 注销。界面永久销毁时用；只是关掉可见性的话**不要**注销 */
  public remove(handler: EscapeHandler): void {
    const i = this.handlers.indexOf(handler);
    if (i >= 0) {
      this.handlers.splice(i, 1);
    }
  }

  /** 当前登记数量，给自测断言用 */
  public size(): number {
    return this.handlers.length;
  }

  /** 只注册一次 ESC。`onKeyDown` 会自己 `registerKey`，不需要预注册 */
  private ensureBound(): void {
    if (this.bound) {
      return;
    }
    this.bound = true;
    keyboardEvents.initialize();
    keyboardEvents.onKeyDown(() => this.dispatch(), KeyCode.ESCAPE);
  }

  /**
   * 派发一次 ESC：从栈顶往下问，第一个消费掉的赢。
   *
   * 循环体里**没有 try/catch** —— 容错在 `tryHandle` 里做。tstl 把 `catch` 编成
   * 内嵌函数，而 Lua 的 `goto` 不跨函数找 label：在 `catch` 里写 `continue`
   * 会生成一个找不到 label 的 `goto`，让**整个 `.lua` 加载失败**，
   * 表现为原生闪退（项目铁律，见 `wc3-tstl-continue-in-catch`）。
   */
  private dispatch(): void {
    if (isChatBoxOpen()) {
      return;
    }

    for (let i = this.handlers.length - 1; i >= 0; i--) {
      const handler = this.handlers[i];
      if (handler === undefined) {
        continue;
      }
      if (tryHandle(handler)) {
        return;
      }
    }
  }
}

/**
 * 调一个 handler，把异常挡在这里。
 *
 * 单独抽成函数而不是在循环里包 try —— 见 `dispatch()` 的说明。
 * 抛异常的 handler 按「没消费」处理，栈继续往下走。
 */
function tryHandle(handler: EscapeHandler): boolean {
  try {
    return handler();
  } catch (e) {
    log.error(`ESC handler 抛出异常，已按未消费处理：${e}`);
    return false;
  }
}

/**
 * 聊天框是否打开。
 *
 * **实测确认过**（阶段 E / Step 0）：聊天框打开时按键触发器照样触发，
 * 此时 `DzIsChatBoxOpen()` 返回真 —— 所以这道门控是真的在起作用。
 *
 * 万一这个 API 在某个运行时缺席，按「没开聊天」处理：宁可让 ESC 多关一次界面，
 * 也不要因为一个诊断性的调用把整个 ESC 链路打断。
 */
function isChatBoxOpen(): boolean {
  try {
    return DzIsChatBoxOpen();
  } catch (e) {
    return false;
  }
}
