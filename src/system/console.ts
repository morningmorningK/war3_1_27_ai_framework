import { MapPlayer, Players } from "@eiriksgata/wc3ts/*";
import { MessageList } from "./ui/component/MessageList";
import { Queue } from "../utils/queue";

/**
 * 消息项接口
 */
interface ConsoleMessage {
  text: string;
  duration: number;
  color: string;
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
    Console.messageList.addMessage(message.text, message.duration, message.color, message.player);
   
  }

  /**
   * 记录日志消息（只存入队列，不立即显示）
   * 
   * @param message 消息文本
   * @param duration 显示时长（秒，默认5秒）
   * @param player 目标玩家（可选，如果不指定则显示给所有玩家）
   */
  public static log(message: string, duration: number = 5, player?: MapPlayer): void {
    Console.messageQueue.enqueue({
      text: message,
      duration: duration,
      color: "00FF00",
      player: player
    });
  }

  /**
   * 记录错误消息（只存入队列，不立即显示）
   * 
   * @param message 消息文本
   * @param duration 显示时长（秒，默认5秒）
   * @param player 目标玩家（可选，如果不指定则显示给所有玩家）
   */
  public static error(message: string, duration: number = 5, player?: MapPlayer): void {

    Console.messageQueue.enqueue({
      text: message,
      duration: duration,
      color: "FF0000",
      player: player
    });
  }

  /**
   * 记录警告消息（只存入队列，不立即显示）
   * 
   * @param message 消息文本
   * @param duration 显示时长（秒，默认5秒）
   * @param player 目标玩家（可选，如果不指定则显示给所有玩家）
   */
  public static warn(message: string, duration: number = 5, player?: MapPlayer): void {
    Console.messageQueue.enqueue({
      text: message,
      duration: duration,
      color: "FFFF00",
      player: player
    });
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