/**
 * 队列数据结构实现
 * 参考 demo/Queue.lua 的实现逻辑
 * 支持泛型，适用于 tstl 项目
 */
export class Queue<T> {
  private items: T[] = [];

  /**
   * 队列初始化
   * 对应 Lua: Queue:new(o)
   */
  constructor(initialItems?: T[]) {
    if (initialItems) {
      this.items = [...initialItems];
    }
  }

  /**
   * 入队 - 将元素添加到队列尾部
   * 对应 Lua: Queue:enqueue(element)
   */
  enqueue(element: T): void {
    this.items.push(element);
  }

  /**
   * 出队 - 返回队列头部元素，并从队列中移除
   * 对应 Lua: Queue:dequeue()
   */
  dequeue(): T | undefined {
    return this.items.shift();
  }

  /**
   * 获取队列长度
   * 对应 Lua: Queue:length()
   */
  length(): number {
    return this.items.length;
  }

  /**
   * 检查队列是否为空
   * 对应 Lua: Queue:isEmpty()
   */
  isEmpty(): boolean {
    return this.items.length === 0;
  }

  /**
   * 查看队列头部元素（不移除）
   */
  peek(): T | undefined {
    return this.items.length > 0 ? this.items[0] : undefined;
  }

  /**
   * 清空队列
   */
  clear(): void {
    this.items = [];
  }

  /**
   * 获取队列的所有元素（用于调试）
   */
  toArray(): T[] {
    return [...this.items];
  }
}

export default Queue;

