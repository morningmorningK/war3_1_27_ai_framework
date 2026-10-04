/**
 * 全局事件总线
 * 提供全局单例的事件发布/订阅机制
 * 用于跨模块、跨系统的事件通信
 */

import { EventEmitter, EventHandler, SubscribeOptions } from "./EventEmitter";

/**
 * 全局事件总线
 * 单例模式，用于全局事件通信
 */
export class EventBus {
  private static instance: EventBus | undefined;
  
  private emitter: EventEmitter;
  
  private constructor() {
    this.emitter = new EventEmitter("GlobalEventBus");
  }
  
  /**
   * 获取事件总线实例
   */
  public static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }
  
  /**
   * 订阅事件
   * @param eventName 事件名称
   * @param handler 事件处理器
   * @param options 订阅选项
   * @returns 订阅 ID
   */
  public on<T = any>(
    eventName: string,
    handler: EventHandler<T>,
    options?: SubscribeOptions
  ): number {
    return this.emitter.on(eventName, handler, options);
  }
  
  /**
   * 订阅一次性事件
   * @param eventName 事件名称
   * @param handler 事件处理器
   * @param priority 优先级
   * @returns 订阅 ID
   */
  public once<T = any>(
    eventName: string,
    handler: EventHandler<T>,
    priority?: number
  ): number {
    return this.emitter.once(eventName, handler, priority);
  }
  
  /**
   * 取消订阅
   * @param subscriptionId 订阅 ID
   * @returns 是否成功取消
   */
  public off(subscriptionId: number): boolean {
    return this.emitter.off(subscriptionId);
  }
  
  /**
   * 取消指定事件的所有订阅
   * @param eventName 事件名称
   */
  public offAll(eventName: string): void {
    this.emitter.offAll(eventName);
  }
  
  /**
   * 取消指定标签的所有订阅
   * @param tag 标签
   * @returns 取消的订阅数量
   */
  public offByTag(tag: string): number {
    return this.emitter.offByTag(tag);
  }
  
  /**
   * 发射事件
   * @param eventName 事件名称
   * @param data 事件数据
   */
  public emit<T = any>(eventName: string, data?: T): void {
    this.emitter.emit(eventName, data);
  }
  
  /**
   * 检查是否有订阅者
   * @param eventName 事件名称
   */
  public hasSubscribers(eventName: string): boolean {
    return this.emitter.hasSubscribers(eventName);
  }
  
  /**
   * 获取订阅者数量
   * @param eventName 事件名称（可选）
   */
  public getSubscriberCount(eventName?: string): number {
    return this.emitter.getSubscriberCount(eventName);
  }
  
  /**
   * 获取所有已注册的事件名称
   */
  public getEventNames(): string[] {
    return this.emitter.getEventNames();
  }
  
  /**
   * 清除所有订阅
   */
  public clear(): void {
    this.emitter.clear();
  }
}

/**
 * 快捷访问全局事件总线
 */
export const eventBus = EventBus.getInstance();
