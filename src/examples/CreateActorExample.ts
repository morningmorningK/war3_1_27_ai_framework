import { Players, Unit } from "@eiriksgata/wc3ts/*";
import { ModuleManager } from "../system/ModuleManager";
import { FourCC } from "src/utils/helper";

/**
 * 热更新模板
 * 
 * 热重载设计要点：
 * 1. 需要在热重载时销毁的资源（如UI组件）应保存为类的成员变量
 * 2. 在 cleanup() 中销毁所有需要清理的资源
 * 3. 在 initialize() 中重新创建资源
 */
class CreateActorExample {

  // ========================================
  // 需要在热重载时保留/销毁的成员变量
  // ========================================
  private actorList: Unit[] = [];


  /**
   * 创建测试按钮
   */
  public TestButton() {
    // 创建10个圣骑士单位
    for (let i = 0; i < 5; i++) {
      const x = -2000 + i * 200; // 水平排列，间隔200
      const y = 0;
      const paladin = Unit.create(
        Players[0],
        FourCC('Hpal'), // 圣骑士单位ID
        x,
        y,
        270 // 面向角度
      );

      if (paladin) {
        this.actorList.push(paladin);
        print(`Created Paladin ${i + 1} at (${x}, ${y})`);
      }
    }


  }

  /**
   * 清理函数 - 热重载时调用
   * 在这里销毁所有需要清理的资源
   */
  public cleanup(): void {
    // 销毁所有创建的单位
    for (const actor of this.actorList) {
      actor.destroy();
    }
    this.actorList = [];
  }

  /**
   * 初始化函数
   */
  public initialize(): void {
    this.TestButton();
  }

  /**
   * 热重载处理函数
   */
  public static onHotReload(): void {
    print("CreateActorExample hot reloaded!");
  }
}

// ========================================
// 模块注册 - 关键：保持实例在热重载之间存活
// ========================================

// 全局实例 - 在模块级别保存，热重载时会被重用
let reloadInstance: CreateActorExample | null = null;

print(">>> CreateActorExample: Module file loaded, about to register...");
const manager = ModuleManager.getInstance();
print(`>>> CreateActorExample: Got ModuleManager instance`);

// 只需传递类，ModuleManager 会自动从 ClassName.name 获取模块名
manager.registerModule(CreateActorExample, {
  initialize: () => {
    print(">>> CreateActorExample: Initialize callback called");
    if (!reloadInstance) {
      reloadInstance = new CreateActorExample();
    }
    reloadInstance.initialize();
  },
  cleanup: () => {
    print(">>> CreateActorExample: Cleanup callback called");
    if (reloadInstance) {
      reloadInstance.cleanup();
    }
  },
  onHotReload: () => {
    print(">>> CreateActorExample: onHotReload callback called");
    CreateActorExample.onHotReload();
  }
});
print(">>> CreateActorExample: Module registration completed");

export { CreateActorExample };