import { ModuleManager } from "../system/ModuleManager";

import { mouseEvents, MouseButton, MouseEventData } from "../system/event";

/**
 * 鼠标事件测试模块
 * 
 * 热重载设计要点：
 * 1. 需要在热重载时销毁的资源（如UI组件）应保存为类的成员变量
 * 2. 在 cleanup() 中销毁所有需要清理的资源
 * 3. 在 initialize() 中重新创建资源
 */
class MouseEventTest {
  /** 保存订阅 ID，用于清理 */
  private subscriptionIds: number[] = [];

  public run() {
    // 初始化鼠标事件系统

    
    // 测试鼠标左键按下事件
    const leftDownId = mouseEvents.onMouseDown((data: MouseEventData) => {
      print(`[鼠标左键按下] 屏幕: (${data.screenX}, ${data.screenY})`);
      print(`  地形坐标: (${math.floor(data.terrainX)}, ${math.floor(data.terrainY)})`);
      print(`  是否在UI上: ${data.isOverUI}`);
    }, MouseButton.LEFT);
    this.subscriptionIds.push(leftDownId);
    
    // 测试鼠标右键按下事件
    const rightDownId = mouseEvents.onMouseDown((data: MouseEventData) => {
      print(`[鼠标右键按下] 屏幕: (${data.screenX}, ${data.screenY})`);
    }, MouseButton.RIGHT);
    this.subscriptionIds.push(rightDownId);
    
    // 测试鼠标右键松开事件
    const rightUpId = mouseEvents.onMouseUp((data: MouseEventData) => {
      print(`[鼠标右键松开] 屏幕: (${data.screenX}, ${data.screenY})`);
    }, MouseButton.RIGHT);
    this.subscriptionIds.push(rightUpId);
    
    // 测试鼠标左键松开事件
    const leftUpId = mouseEvents.onMouseUp((data: MouseEventData) => {
      print(`[鼠标左键松开] 屏幕: (${data.screenX}, ${data.screenY})`);
    }, MouseButton.LEFT);
    this.subscriptionIds.push(leftUpId);
    
    // 测试鼠标移动事件（注意：移动事件触发频繁，这里添加节流）
    // let lastMoveTime = 0;
    // const moveId = mouseEvents.onMouseMove((data: MouseEventData) => {
    //   const now = os.clock();
    //   // 每 0.5 秒最多输出一次
    //   if (now - lastMoveTime > 0.5) {
    //     print(`[鼠标移动] 屏幕: (${data.screenX}, ${data.screenY})`);
    //     lastMoveTime = now;
    //   }
    // });
    // this.subscriptionIds.push(moveId);
    
    // 测试鼠标滚轮事件
    const wheelId = mouseEvents.onMouseWheel((data: MouseEventData) => {
      const direction = data.wheelDelta && data.wheelDelta > 0 ? "向上" : "向下";
      print(`[鼠标滚轮] ${direction}滚动, delta: ${data.wheelDelta}`);
    });
    this.subscriptionIds.push(wheelId);
    
    print("=== 鼠标事件测试已启动 ===");
    print("- 左键按下/松开: 显示坐标信息");
    print("- 右键按下: 显示屏幕坐标");
    print("- 鼠标移动: 每0.5秒显示一次");
    print("- 滚轮: 显示滚动方向");
  }

  /**
   * 清理函数 - 热重载时调用
   * 在这里销毁所有需要清理的资源
   */
  public cleanup(): void {
    print("MouseEventTest: Cleanup called, destroying resources...");
    
    // 取消所有订阅
    for (const id of this.subscriptionIds) {
      mouseEvents.off(id);
    }
    this.subscriptionIds = [];

    print("MouseEventTest: All subscriptions cleaned up");
  }

  /**
   * 初始化函数
   */
  public initialize(): void {
    print("MouseEventTest: Initializing...");
    this.run();
    print("MouseEventTest initialized");
  }

  /**
   * 热重载处理函数
   */
  public static onHotReload(): void {
    print("MouseEventTest hot reloaded!");
  }
}

// ========================================
// 模块注册 - 关键：保持实例在热重载之间存活
// ========================================

// 全局实例 - 在模块级别保存，热重载时会被重用
let mouseTestInstance: MouseEventTest | null = null;

print(">>> MouseEventTest: Module file loaded, about to register...");
const manager = ModuleManager.getInstance();
print(`>>> MouseEventTest: Got ModuleManager instance`);

// 只需传递类，ModuleManager 会自动从 ClassName.name 获取模块名
manager.registerModule(MouseEventTest, {
  // 不再需要 modulePath！dev.ts 会自动从 Lua 文件中提取模块名
  initialize: () => {
    print(">>> MouseEventTest: Initialize callback called");
    if (!mouseTestInstance) {
      mouseTestInstance = new MouseEventTest();
    }
    mouseTestInstance.initialize();
  },
  cleanup: () => {
    print(">>> MouseEventTest: Cleanup callback called");
    if (mouseTestInstance) {
      mouseTestInstance.cleanup();
    }
  },
  onHotReload: () => {
    print(">>> MouseEventTest: onHotReload callback called");
    MouseEventTest.onHotReload();
  }
});
print(">>> MouseEventTest: Module registration completed");

export { MouseEventTest };