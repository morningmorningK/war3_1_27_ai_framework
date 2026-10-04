# Panel 组件使用指南

## 快速开始

### 1. 基本面板
```typescript
import { Panel } from "../system/ui/component/Panel";

// 创建基本面板
const panel = new Panel(100, 100, 400, 300);
panel.create();
```

### 2. 带标题的面板
```typescript
// 方式 1: 使用静态方法
const panel = Panel.createWithTitle(
  "标题文本",
  100,    // x
  100,    // y
  400,    // width
  300     // height
);

// 方式 2: 手动配置
const panel = new Panel(100, 100, 400, 300);
panel.create();
panel
  .setTitle("标题文本")
  .setShowTitleBar(true);
```

### 3. 可拖拽的面板
```typescript
// 创建可拖拽面板（自动包含标题栏和关闭按钮）
const panel = Panel.createDraggable(
  "可拖拽面板",
  100, 100, 400, 300
);

// 设置拖拽回调
panel
  .setOnDragStart(() => {
    console.log("开始拖拽");
  })
  .setOnDragEnd((x, y) => {
    console.log(`拖拽结束: ${x}, ${y}`);
  });
```

### 4. 居中显示的面板
```typescript
import { PanelSizes } from "../system/ui/component/Panel";

// 在屏幕中心创建面板
const panel = Panel.createCentered("MEDIUM");

// 可用的尺寸预设:
// "SMALL"      - 200x150
// "MEDIUM"     - 400x300
// "LARGE"      - 600x450
// "WIDE"       - 800x200
// "TALL"       - 300x500
// "FULLSCREEN" - 1920x1080
```

## 在面板中添加子组件

```typescript
import { Button } from "../system/ui/component/Button";
import { Text } from "../system/ui/component/Text";

// 创建面板
const panel = Panel.createWithTitle("控制面板", 100, 100, 400, 300);

// 获取内容区域的位置和大小
const contentPos = panel.getContentPosition();
const contentSize = panel.getContentSize();

// 在面板中添加文本
const text = new Text(
  "这是面板内的文本",
  contentPos.x + 20,
  contentPos.y + 20,
  contentSize.width - 40,
  30
);
text.create(panel.getContentFrame()!);  // 使用面板的内容框架作为父级

// 在面板中添加按钮
const button = new Button(
  "按钮",
  contentPos.x + 50,
  contentPos.y + 80,
  150,
  40
);
button.create(panel.getContentFrame()!);
button.setOnClick(() => {
  console.log("按钮被点击");
});
```

## 面板样式配置

### 背景纹理
```typescript
import { PanelBackgrounds } from "../system/ui/component/Panel";

panel.setBackground(PanelBackgrounds.DIALOG);

// 可用的背景预设:
// NONE                 - 无背景（透明）
// BLACK_TRANSPARENT    - 黑色半透明
// TOOLTIP              - 工具提示背景
// DIALOG               - 对话框背景
// QUEST                - 任务背景
// HUMAN_BORDER         - 人族边框
// HUMAN_BACKGROUND     - 人族背景
// ORC_BACKGROUND       - 兽族背景
// NIGHTELF_BACKGROUND  - 暗夜精灵背景
// UNDEAD_BACKGROUND    - 不死族背景
// ESC_MENU             - ESC菜单背景
```

### 透明度
```typescript
panel.setAlpha(200);  // 0-255，255 为完全不透明
```

### 标题样式
```typescript
import { TextColors } from "../system/ui/component/Text";

panel
  .setTitle("新标题")
  .setTitleColor(TextColors.GOLD)
  .setTitleBarHeight(35);
```

## 完整配置示例

```typescript
const panel = new Panel(100, 100, 500, 400);
panel.create();

// 使用 configure 一次性配置多个属性
panel.configure({
  title: "设置面板",
  titleColor: "FFD700",           // 金色
  showTitleBar: true,
  showCloseButton: true,
  background: PanelBackgrounds.DIALOG,
  alpha: 230,
  draggable: true,
  visible: true,
  enabled: true,
  onClose: () => {
    console.log("面板关闭");
    panel.hide();
  }
});
```

## 常用方法

### 显示/隐藏
```typescript
panel.show();          // 显示
panel.hide();          // 隐藏
panel.toggle();        // 切换显示状态
panel.setVisible(true); // 设置可见性
```

### 位置和大小
```typescript
panel.setPosition(200, 150);      // 设置位置
panel.setSize(600, 400);          // 设置大小
const pos = panel.getPosition();  // 获取位置
const size = panel.getSize();     // 获取大小
```

### 启用/禁用
```typescript
panel.setEnabled(true);           // 启用
panel.setEnabled(false);          // 禁用（半透明显示）
```

### 关闭按钮
```typescript
panel
  .setShowCloseButton(true)
  .setOnClose(() => {
    console.log("面板被关闭");
    panel.hide();
  });
```

### 销毁面板
```typescript
panel.destroy();  // 完全销毁面板，释放资源
```

## 获取框架引用

```typescript
// 获取背景框架
const backdrop = panel.getBackdropFrame();

// 获取内容区域框架（用于添加子组件）
const content = panel.getContentFrame();

// 获取标题栏框架
const titleBar = panel.getTitleBarFrame();
```

## 实用技巧

### 1. 创建模态对话框
```typescript
const dialog = Panel.createCentered("MEDIUM");
dialog.configure({
  title: "确认",
  showTitleBar: true,
  showCloseButton: true,
  background: PanelBackgrounds.DIALOG,
  alpha: 250
});

// 添加确认和取消按钮...
```

### 2. 创建可折叠面板
```typescript
let isExpanded = true;
const panel = Panel.createWithTitle("面板", 100, 100, 300, 400);

const toggleButton = new Button("折叠", 120, 50, 80, 30);
toggleButton.setOnClick(() => {
  if (isExpanded) {
    panel.setSize(300, 40);  // 只显示标题栏
    toggleButton.setText("展开");
  } else {
    panel.setSize(300, 400); // 完整显示
    toggleButton.setText("折叠");
  }
  isExpanded = !isExpanded;
});
```

### 3. 创建通知面板
```typescript
function showNotification(message: string, duration: number = 3): void {
  const panel = Panel.createWithPreset(
    (1920 - 300) / 2,  // 居中X
    50,                 // 顶部
    "SMALL"
  );
  
  const text = new Text(
    message,
    panel.getContentPosition().x,
    panel.getContentPosition().y,
    300,
    150
  );
  text.create(panel.getContentFrame()!);
  text.center();

  // 自动关闭
  const timer = CreateTimer();
  TimerStart(timer, duration, false, () => {
    panel.destroy();
    DestroyTimer(timer);
  });
}
```

## 注意事项

1. **子组件定位**: 添加子组件时使用 `getContentPosition()` 和 `getContentSize()` 获取内容区域信息
2. **拖拽区域**: 只有标题栏区域可以拖拽，需要先设置 `showTitleBar(true)`
3. **父级框架**: 添加子组件时传入 `panel.getContentFrame()` 作为父级
4. **资源释放**: 不再使用面板时调用 `destroy()` 释放资源
5. **标题栏高度**: 默认标题栏高度为 30 像素，可通过 `setTitleBarHeight()` 调整
