/** @noSelfInFile */

import { Panel } from "../system/ui/component/Panel";
import { Button } from "../system/ui/component/Button";
import { Text, TextColors } from "../system/ui/component/Text";

import { ModuleManager } from "../system/ModuleManager";
import { HotReloadHelper } from "../system/ui/UIComponent";
import { UIBackgrounds } from "src/constants/ui/preset";

/**
 * Panel 组件使用示例（支持热重载）
 * 展示如何创建和使用面板容器
 * 
 * 热重载设计要点：
 * 1. 使用 HotReloadHelper 自动管理UI组件
 * 2. 在 cleanup() 中调用 helper.cleanup() 即可销毁所有组件
 * 3. 使用 helper.register() 注册组件，无需手动管理数组
 */
class PanelExample {
  // ========================================
  // 使用 HotReloadHelper 自动管理组件
  // ========================================
  private ui = new HotReloadHelper("PanelExample");

  /**
   * 创建所有示例
   */
  public createExamples(): void {
    print("=== Panel Component Examples ===");

    // ==================== 示例 1: 基本面板创建 ====================
    this.example1_BasicPanel();

    // ==================== 示例 2: 带标题栏的面板 ====================
    this.example2_PanelWithTitle();

    // ==================== 示例 3: 可拖拽的面板 ====================
    this.example3_DraggablePanel();

    // ==================== 示例 4: 在面板中添加子组件 ====================
    this.example4_PanelWithChildren();

    // ==================== 示例 5: 使用预设创建面板 ====================
    this.example5_PanelPresets();

    // ==================== 示例 6: 完整配置的面板 ====================
    this.example6_FullyConfiguredPanel();

    print("=== Panel Examples Complete ===");
    print(`✓ Registered ${this.ui.getComponentCount()} components for hot reload`);
  }

  /**
     * 示例 1: 基本面板创建
     */
  private example1_BasicPanel(): void {
    print("\n--- Example 1: Basic Panel ---");

    // 创建一个简单的面板
    const panel = new Panel(
      100,   // x 位置
      100,   // y 位置
      300,   // 宽度
      200    // 高度
    );
    panel.create();

    // 设置背景和透明度
    panel
      .setBackground(UIBackgrounds.DIALOG)
      .setAlpha(200);

    this.ui.register(panel);  // 注册到热重载管理
    print("✓ 创建了基本面板");
  }

  /**
     * 示例 2: 带标题栏的面板
     */
  private example2_PanelWithTitle(): void {
    print("\n--- Example 2: Panel with Title ---");

    // 使用静态方法创建带标题的面板
    const panel = Panel.createWithTitle(
      "信息面板",  // 标题
      500,         // x
      100,         // y
      350,         // 宽度
      250          // 高度
    );

    // 自定义标题样式和关闭按钮
    panel
      .setTitleColor(TextColors.GOLD)
      .setShowCloseButton(true)
      .setCloseButtonSize(32)  // 设置关闭按钮大小为 32px（默认 26px）
      .setOnClose(() => {
        print("面板被关闭");
        panel.hide();
      });

    this.ui.register(panel);  // 注册到热重载管理
    print("✓ 创建了带标题栏的面板（关闭按钮: 32px）");
  }

  /**
     * 示例 3: 可拖拽的面板
     */
  private example3_DraggablePanel(): void {
    print("\n--- Example 3: Draggable Panel ---");

    // 创建可拖拽的面板（自动包含标题栏和关闭按钮）
    const panel = Panel.createDraggable(
      "可拖拽面板",
      100,
      400,
      400,
      300
    );

    // 设置拖拽回调
    panel
      .setOnDragStart(() => {
        print("开始拖拽面板");
        panel.setAlpha(180);  // 拖拽时降低透明度
      })
      .setOnDragEnd((x, y) => {
        print(`面板拖拽到: (${x}, ${y})`);
        panel.setAlpha(255);  // 恢复透明度
      })
      .setOnDragging((_x, _y) => {
        // 拖拽过程中的回调（可选）
        // print(`拖拽中: (${_x}, ${_y})`);
      });

    this.ui.register(panel);  // 注册到热重载管理
    print("✓ 创建了可拖拽面板");
    print("  提示: 拖动标题栏可以移动面板");
  }

  /**
     * 示例 4: 在面板中添加子组件
     */
  private example4_PanelWithChildren(): void {
    print("\n--- Example 4: Panel with Children ---");

    // 创建面板
    const panel = Panel.createWithTitle(
      "控制面板",
      600,
      400,
      400,
      350
    );

    panel
      .setShowCloseButton(true)
      .setBackground(UIBackgrounds.QUEST)
      .setAlpha(220);

    // 获取内容区域的位置和大小
    const contentPos = panel.getContentPosition();
    const contentSize = panel.getContentSize();

    print(`内容区域: (${contentPos.x}, ${contentPos.y}), ${contentSize.width}x${contentSize.height}`);

    // 在面板内容区域添加文本
    const title = new Text(
      "欢迎使用控制面板",
      contentPos.x + 20,
      contentPos.y + 20,
      contentSize.width - 40,
      30
    );
    title.create(panel.getContentFrame()!);
    title
      .setColor(TextColors.GOLD)
      .center()
      .setFontSizePixels(16);

    // 添加描述文本
    const description = new Text(
      "这是一个包含多个子组件的面板示例",
      contentPos.x + 20,
      contentPos.y + 60,
      contentSize.width - 40,
      20
    );
    description.create(panel.getContentFrame()!);
    description
      .setColor(TextColors.WHITE)
      .setFontSizePixels(12);

    // 在面板中添加按钮
    const button1 = new Button(
      "选项 1",
      contentPos.x + 50,
      contentPos.y + 100,
      150,
      40
    );
    button1.create(panel.getContentFrame()!);
    button1.setOnClick(() => {
      print("点击了选项 1");
      description.setText("你选择了选项 1");
    });

    const button2 = new Button(
      "选项 2",
      contentPos.x + 50,
      contentPos.y + 160,
      150,
      40
    );
    button2.create(panel.getContentFrame()!);
    button2.setOnClick(() => {
      print("点击了选项 2");
      description.setText("你选择了选项 2");
    });

    const button3 = new Button(
      "关闭面板",
      contentPos.x + 50,
      contentPos.y + 220,
      150,
      40
    );
    button3.create(panel.getContentFrame()!);
    button3
      .setTextColor(TextColors.RED)
      .setOnClick(() => {
        panel.hide();
        print("面板已隐藏");
      });

    this.ui.register(panel);  // 注册到热重载管理
    print("✓ 创建了包含子组件的面板");
  }

  /**
     * 示例 5: 使用预设创建面板
     */
  private example5_PanelPresets(): void {
    print("\n--- Example 5: Panel Presets ---");

    // 使用尺寸预设创建面板
    const smallPanel = Panel.createWithPreset(
      1100,
      100,
      "SMALL"  // 小面板预设
    );
    smallPanel
      .setBackground(UIBackgrounds.BLACK_TRANSPARENT)
      .setAlpha(200);

    // 创建居中的大面板
    const centerPanel = Panel.createCentered("LARGE");
    centerPanel
      .setBackground(UIBackgrounds.ESC_MENU)
      .setAlpha(230)
      .hide();  // 先隐藏

    // 创建显示按钮
    const showButton = new Button("显示大面板", 1100, 250, 150, 40);
    showButton.create();
    showButton.setOnClick(() => {
      centerPanel.toggle();  // 切换显示/隐藏
      print(centerPanel.getVisible() ? "显示大面板" : "隐藏大面板");
    });

    this.ui.register(smallPanel);  // 注册到热重载管理
    this.ui.register(centerPanel);
    this.ui.register(showButton);

    print("✓ 创建了预设尺寸的面板");
    print("  SMALL: 200x150");
    print("  MEDIUM: 400x300");
    print("  LARGE: 600x450");
    print("  WIDE: 800x200");
    print("  TALL: 300x500");
  }

  /**
     * 示例 6: 完整配置的面板
     */
  private example6_FullyConfiguredPanel(): void {
    print("\n--- Example 6: Fully Configured Panel ---");

    const panel = new Panel(1200, 400, 450, 400);
    panel.create();

    // 使用 configure 方法一次性配置多个属性
    panel.configure({
      title: "游戏设置",
      titleColor: TextColors.CYAN,
      showTitleBar: true,
      showCloseButton: true,
      closeButtonSize: 28,  // 自定义关闭按钮大小
      background: UIBackgrounds.DIALOG,
      alpha: 240,
      draggable: true,
      visible: true,
      enabled: true,
      onClose: () => {
        print("设置面板已关闭");
        panel.hide();
      }
    });

    // 添加设置项
    const contentPos = panel.getContentPosition();
    const contentSize = panel.getContentSize();

    // 音量设置
    const volumeLabel = new Text(
      "音量: 100%",
      contentPos.x + 30,
      contentPos.y + 30,
      contentSize.width - 60,
      25
    );
    volumeLabel.create(panel.getContentFrame()!);
    volumeLabel
      .setColor(TextColors.WHITE)
      .setFontSizePixels(14);

    // 分辨率设置
    const resolutionLabel = new Text(
      "分辨率: 1920x1080",
      contentPos.x + 30,
      contentPos.y + 80,
      contentSize.width - 60,
      25
    );
    resolutionLabel.create(panel.getContentFrame()!);
    resolutionLabel
      .setColor(TextColors.WHITE)
      .setFontSizePixels(14);

    // 保存按钮
    const saveButton = new Button(
      "保存设置",
      contentPos.x + 100,
      contentPos.y + contentSize.height - 60,
      120,
      40
    );
    saveButton.create(panel.getContentFrame()!);
    saveButton
      .setTextColor(TextColors.GREEN)
      .centerText()
      .setOnClick(() => {
        print("设置已保存");
      });

    // 重置按钮
    const resetButton = new Button(
      "重置",
      contentPos.x + 240,
      contentPos.y + contentSize.height - 60,
      120,
      40
    );
    resetButton.create(panel.getContentFrame()!);
    resetButton
      .setTextColor(TextColors.ORANGE)
      .centerText()
      .setOnClick(() => {
        volumeLabel.setText("音量: 100%");
        resolutionLabel.setText("分辨率: 1920x1080");
        print("设置已重置");
      });

    this.ui.register(panel);  // 注册到热重载管理
    print("✓ 创建了完整配置的面板");
  }

  /**
   * 清理函数 - 热重载时调用
   * 只需要一行代码即可清理所有UI组件
   */
  public cleanup(): void {
    print("PanelExample: Cleanup called...");

    // 一行代码销毁所有已注册的组件！
    this.ui.cleanup();

    print("PanelExample: All resources cleaned up");
  }

  /**
   * 初始化函数
   */
  public initialize(): void {
    print("PanelExample: Initializing...");
    this.createExamples();
    print("PanelExample initialized");
  }

  /**
   * 热重载处理函数
   */
  public static onHotReload(): void {
    print("PanelExample hot reloaded!");
  }
}

// ========================================
// 模块注册 - 关键：保持实例在热重载之间存活
// ========================================

// 全局实例 - 在模块级别保存，热重载时会被重用
let panelInstance: PanelExample | null = null;

print(">>> PanelExample: Module file loaded, about to register...");
const manager = ModuleManager.getInstance();
print(">>> PanelExample: Got ModuleManager instance");

// 只需传递类，ModuleManager 会自动从 ClassName.name 获取模块名
manager.registerModule(PanelExample, {
  initialize: () => {
    print(">>> PanelExample: Initialize callback called");
    if (!panelInstance) {
      panelInstance = new PanelExample();
    }
    panelInstance.initialize();
  },
  cleanup: () => {
    print(">>> PanelExample: Cleanup callback called");
    if (panelInstance) {
      panelInstance.cleanup();
    }
  },
  onHotReload: () => {
    print(">>> PanelExample: onHotReload callback called");
    PanelExample.onHotReload();
  }
});
print(">>> PanelExample: Module registration completed");

export { PanelExample };

/**
 * 快速开始示例 - 最简单的用法（独立导出函数）
 */
export function quickStartPanel(): void {
  print("\n=== Quick Start: Simple Panel ===");

  // 方式 1: 最简单的面板
  const simplePanel = new Panel(100, 100, 300, 200);
  simplePanel.create();

  // 方式 2: 带标题的面板
  const _titlePanel = Panel.createWithTitle("我的面板", 500, 100, 300, 200);

  // 方式 3: 可拖拽的面板
  const _dragPanel = Panel.createDraggable("可拖拽", 100, 400, 300, 200);

  // 方式 4: 居中显示的面板
  const _centerPanel = Panel.createCentered("MEDIUM");

  print("✓ 快速开始示例完成");
}
