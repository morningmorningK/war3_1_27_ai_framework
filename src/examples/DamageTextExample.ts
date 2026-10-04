import { DamageTextManager, FloatDirection } from "src/system/ui/DamageTexttag";
import { Button } from "src/system/ui/component/Button";

import { Timer } from "@eiriksgata/wc3ts/*";
import { ModuleManager } from "src/system/ModuleManager";
import { HotReloadHelper } from "src/system/ui/UIComponent";

/**
 * 伤害文字使用示例（支持热重载）
 */
class DamageTextExample {
  private ui = new HotReloadHelper("DamageTextExample");
  private testTimer: Timer | null = null;

  /**
   * 创建示例按钮和测试
   */
  public createExamples(): void {
    print("=== Damage Text Examples ===");

    // 初始化伤害文字管理器
    DamageTextManager.getInstance(50); // 对象池大小 50

    // 示例 1: 快速显示伤害（默认配置）
    const button1 = new Button("快速伤害", 100, 100, 120, 40);
    button1.create();
    button1.setText("显示伤害");
    button1.setOnClick(() => {
      // 在地图中心位置显示
      const centerX = 0;
      const centerY = 0;
      DamageTextManager.showDamage(1234, centerX, centerY, 100);
      print("显示快速伤害: 1234");
    });
    this.ui.register(button1);

    // 示例 2: 向上漂浮
    const button2 = new Button("向上漂浮", 100, 160, 120, 40);
    button2.create();
    button2.setText("向上");
    button2.setOnClick(() => {
      const centerX = GetRandomReal(-500, 500);
      const centerY = GetRandomReal(-500, 500);
      DamageTextManager.show({
        damage: 999,
        worldX: centerX,
        worldY: centerY,
        height: 100,
        direction: FloatDirection.UP,
        speed: 100,
        duration: 2.0,
        scale: 1.0,
        fadeOut: true
      });
      print("向上漂浮: 999");
    });
    this.ui.register(button2);

    // 示例 3: 向右漂浮
    const button3 = new Button("向右漂浮", 100, 220, 120, 40);
    button3.create();
    button3.setText("向右");
    button3.setOnClick(() => {
      const centerX = GetRandomReal(-500, 500);
      const centerY = GetRandomReal(-500, 500);
      DamageTextManager.show({
        damage: 777,
        worldX: centerX,
        worldY: centerY,
        height: 100,
        direction: FloatDirection.RIGHT,
        speed: 120,
        duration: 1.5,
        scale: 0.9,
        fadeOut: true
      });
      print("向右漂浮: 777");
    });
    this.ui.register(button3);

    // 示例 4: 向左漂浮
    const button4 = new Button("向左漂浮", 100, 280, 120, 40);
    button4.create();
    button4.setText("向左");
    button4.setOnClick(() => {
      const centerX = GetRandomReal(-500, 500);
      const centerY = GetRandomReal(-500, 500);
      DamageTextManager.show({
        damage: 555,
        worldX: centerX,
        worldY: centerY,
        height: 100,
        direction: FloatDirection.LEFT,
        speed: 120,
        duration: 1.5,
        scale: 0.9,
        fadeOut: true
      });
      print("向左漂浮: 555");
    });
    this.ui.register(button4);

    // 示例 5: 大数字
    const button5 = new Button("大数字", 100, 340, 120, 40);
    button5.create();
    button5.setText("暴击");
    button5.setOnClick(() => {
      const centerX = GetRandomReal(-500, 500);
      const centerY = GetRandomReal(-500, 500);
      DamageTextManager.show({
        damage: 99999,
        worldX: centerX,
        worldY: centerY,
        height: 120,
        direction: FloatDirection.UP,
        speed: 60,
        duration: 2.0,
        scale: 1.2, // 更大的数字
        fadeOut: true
      });
      print("暴击伤害: 99999");
    });
    this.ui.register(button5);

    // 示例 6: 静态不移动
    const button6 = new Button("静态显示", 100, 400, 120, 40);
    button6.create();
    button6.setText("静态");
    button6.setOnClick(() => {
      const centerX = GetRandomReal(-500, 500);
      const centerY = GetRandomReal(-500, 500);
      DamageTextManager.show({
        damage: 333,
        worldX: centerX,
        worldY: centerY,
        height: 100,
        direction: FloatDirection.NONE,
        speed: 0,
        duration: 2.0,
        scale: 0.8,
        fadeOut: true
      });
      print("静态显示: 333");
    });
    this.ui.register(button6);

    // 示例 7: 连续伤害测试（压力测试）
    const button7 = new Button("连续伤害", 100, 460, 120, 40);
    button7.create();
    button7.setText("压力测试");
    button7.setOnClick(() => {
      print("开始连续伤害测试...");
      
      const centerX = 0;
      const centerY = 0;
      
      // 创建定时器，每 0.1 秒显示一次伤害
      let count = 0;
      this.testTimer = Timer.create();
      this.testTimer.start(0.1, true, () => {
        if (count >= 30) {
          // 显示 30 次后停止
          if (this.testTimer) {
            this.testTimer.destroy();
            this.testTimer = null;
          }
          print("连续伤害测试完成");
          return;
        }
        
        const damage = GetRandomInt(100, 999);
        const offsetX = GetRandomReal(-300, 300);
        const offsetY = GetRandomReal(-300, 300);
        
        DamageTextManager.show({
          damage,
          worldX: centerX + offsetX,
          worldY: centerY + offsetY,
          height: 100,
          direction: FloatDirection.UP,
          speed: 80,
          duration: 1.5,
          scale: 0.7,
          fadeOut: true
        });
        
        count++;
      });
    });
    this.ui.register(button7);

    // 示例 8: 清理所有伤害文字
    const button8 = new Button("清理全部", 100, 520, 120, 40);
    button8.create();
    button8.setText("清理");
    button8.setOnClick(() => {
      DamageTextManager.getInstance().clear();
      print("已清理所有伤害文字");
    });
    this.ui.register(button8);

    print("=== Damage Text Examples Created ===");
    print(`✓ Registered ${this.ui.getComponentCount()} components`);
  }

  /**
   * 清理函数
   */
  public cleanup(): void {
    print("DamageTextExample: Cleanup...");
    
    // 停止测试定时器
    if (this.testTimer) {
      this.testTimer.destroy();
      this.testTimer = null;
    }
    
    // 清理 UI 组件
    this.ui.cleanup();
    
    print("DamageTextExample: Cleanup complete");
  }

  /**
   * 初始化函数
   */
  public initialize(): void {
    print("DamageTextExample: Initializing...");
    this.createExamples();
    print("DamageTextExample initialized");
  }

  /**
   * 热重载处理函数
   */
  public static onHotReload(): void {
    print("DamageTextExample hot reloaded!");
  }
}

// ========================================
// 模块注册
// ========================================

let exampleInstance: DamageTextExample | null = null;

print(">>> DamageTextExample: Module file loaded, registering...");
const manager = ModuleManager.getInstance();

manager.registerModule(DamageTextExample, {
  initialize: () => {
    print(">>> DamageTextExample: Initialize callback called");
    if (!exampleInstance) {
      exampleInstance = new DamageTextExample();
    }
    exampleInstance.initialize();
  },
  cleanup: () => {
    print(">>> DamageTextExample: Cleanup callback called");
    if (exampleInstance) {
      exampleInstance.cleanup();
    }
  },
  onHotReload: () => {
    print(">>> DamageTextExample: onHotReload callback called");
    DamageTextExample.onHotReload();
  }
});

print(">>> DamageTextExample: Module registration completed");

export { DamageTextExample };
