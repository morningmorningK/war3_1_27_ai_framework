import { MapPlayer, Players } from "@eiriksgata/wc3ts/*";
import { MessageList } from "./ui/component/MessageList";
import { ChatChannel } from "./ui/chatChannel";
import { Queue } from "../utils/queue";
import { formatClock } from "../utils/gameClock";

/**
 * 消息项接口
 */
interface ConsoleMessage {
  text: string;
  color: string;
  /** 频道标签，透传给 `MessageList` 做筛选与按类淘汰。见 `ChatChannel` */
  channel?: string;
  player?: MapPlayer;
}

/**
 * 控制台类
 * 使用队列存储消息，通过定时器每0.1秒处理一条消息
 * 
 * 多玩家支持说明：
 * - UI是本地客户端的，每个玩家看到的UI是独立的
 * - init()方法应该在每个玩家的客户端都调用，但只有本地玩家会创建UI
 * - log/error/warn方法：
 *   - 如果不指定player，消息会显示给所有玩家（每个玩家在自己的客户端看到）
 *   - 如果指定了player，只有当该player是本地玩家时才会显示
 */
export class Console {
  private static messageQueue: Queue<ConsoleMessage> = new Queue<ConsoleMessage>();
  private static messageList: MessageList | null = null;
  private static processTimer: timer | null = null;
  private static isInitialized: boolean = false;

  /**
   * 获取MessageList单例
   */
  public static getMessageList(): MessageList | null {
    return Console.messageList;
  }

  /**
   * 初始化Console（创建MessageList并调用create，启动消息处理定时器）
   * 应该在游戏初始化时调用一次
   * 
   * 注意：这个方法应该在每个玩家的客户端都调用，但只有本地玩家会实际创建UI
   * 
   * @param x X坐标（像素，默认300）
   * @param y Y坐标（像素，默认200）
   * @param width 宽度（像素，默认400）
   * @param height 高度（像素，默认300）
   * @param config 可选配置
   */
  public static init(
    x: number = 300,
    y: number = 200,
    width: number = 400,
    height: number = 300,
    config?: Partial<import("./ui/component/MessageList").MessageListConfig>
  ): void {
    if (Console.isInitialized) {
      return;
    }

    // 只有本地玩家才创建UI（避免不同步）
    // 注意：UI操作必须在本地玩家检查块内，否则会导致不同步掉线
    // 在魔兽争霸3中，每个客户端都有独立的静态变量，所以可以直接检查
    // 创建MessageList（只在本地玩家客户端）
    Console.messageList = MessageList.createInstance(x, y, width, height, config);

    // 启动消息处理定时器（每0.1秒处理一条消息，只在本地玩家客户端）
    Console.processTimer = CreateTimer();
    TimerStart(Console.processTimer, 0.1, true, () => {
      Console.processNextMessage();
    });

    Console.isInitialized = true;
  }

  /**
   * 处理下一条消息（从队列中取出并显示）
   * 只在本地玩家客户端执行
   */
  private static processNextMessage(): void {
    // 检查UI是否已创建且队列不为空
    if (!Console.messageList || Console.messageQueue.isEmpty()) {
      return;
    }

    const message = Console.messageQueue.dequeue();
    if (!message) {
      return;
    }

    // 传递player参数给addMessage，如果指定了player则只有该玩家能看到
    Console.messageList.addMessage(message.text, message.color, message.player, message.channel);

  }

  /**
   * 入队一条**任意颜色 + 任意频道**的消息（所有入口的公共实现）。
   *
   * `log` / `warn` / `error` 三个方法的颜色和频道是写死的（绿/黄/红 + 系统/警告），
   * 但 `todo.md` §0.1.2 的配色表里还有「玩家消息=白色」「战斗日志=灰色」，
   * 写死的三个入口覆盖不到，所以补这个通用入口 —— 那三个旧方法现在只是它的三个特例。
   *
   * 走队列而不是直接 `messageList.addMessage`，是为了保住 `Console.init` 里那个
   * 每 0.1 秒消费一条的节流：`todo.md` §0.2.6 明确要求「聊天消息推送作为异步事件，
   * 消息入消息队列，由帧循环统一消费输出」，顺带也是对刷屏的第一道缓冲。
   *
   * ## 时间戳打在这里，不在渲染那里
   *
   * `[HH:MM:SS]` 是在**入队这一刻**拼上去的，不是 `MessageList` 画的时候。
   * 队列每 0.1 秒才放行一条，一堆积压的消息如果按渲染时刻打戳，时间会越偏越后 ——
   * 消息说的是「什么时候发生的事」，那当然得按发生的时刻算。
   *
   * @param message 消息文本
   * @param color 十六进制颜色，**不含 `#`、不含 `|cff` 前缀**（`Text` 组件自己会拼 `|cff`）
   * @param channel 频道标签（可选）。筛选与按类淘汰都按它分组；不给的消息在任何筛选下都看不见
   * @param player 目标玩家（可选，如果不指定则显示给所有玩家）
   */
  public static say(
    message: string,
    color: string = "FFFFFF",
    channel?: string,
    player?: MapPlayer
  ): void {
    Console.messageQueue.enqueue({
      text: Console.stamp(message),
      color: color,
      channel: channel,
      player: player
    });
  }

  /** 拼 `[HH:MM:SS] ` 前缀。时钟取不到时原样返回（见 `formatClock`） */
  private static stamp(message: string): string {
    const clock = formatClock();
    if (clock === "") {
      return message;
    }
    return `[${clock}] ${message}`;
  }

  /**
   * 记录日志消息（只存入队列，不立即显示）
   *
   * @param message 消息文本
   * @param player 目标玩家（可选，如果不指定则显示给所有玩家）
   */
  public static log(message: string, player?: MapPlayer): void {
    Console.say(message, "00FF00", ChatChannel.SYSTEM, player);
  }

  /**
   * 记录错误消息（只存入队列，不立即显示）
   *
   * @param message 消息文本
   * @param player 目标玩家（可选，如果不指定则显示给所有玩家）
   */
  public static error(message: string, player?: MapPlayer): void {
    Console.say(message, "FF0000", ChatChannel.WARNING, player);
  }

  /**
   * 记录警告消息（只存入队列，不立即显示）
   *
   * @param message 消息文本
   * @param player 目标玩家（可选，如果不指定则显示给所有玩家）
   */
  public static warn(message: string, player?: MapPlayer): void {
    Console.say(message, "FFFF00", ChatChannel.WARNING, player);
  }

  /**
   * 获取队列中待处理的消息数量
   */
  public static getQueueLength(): number {
    return Console.messageQueue.length();
  }

  /**
   * 清空消息队列
   */
  public static clearQueue(): void {
    Console.messageQueue.clear();
  }

  /**
   * 销毁Console（停止定时器并清理资源）
   */
  public static destroy(): void {
    if (Console.processTimer) {
      PauseTimer(Console.processTimer);
      DestroyTimer(Console.processTimer);
      Console.processTimer = null;
    }

    Console.messageQueue.clear();
    Console.messageList = null;
    Console.isInitialized = false;
  }
}