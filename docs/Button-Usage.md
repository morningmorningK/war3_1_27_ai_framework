# Button 组件使用文档

## 概述

`Button` 类是一个三层结构的按钮组件，完全参考魔兽争霸3的Frame UI系统设计。

## 三层结构

```
Button (三层结构)
├── backdropFrame (背景框架) - 显示纹理、边框
├── textFrame (文本框架) - 显示按钮文字
└── buttonFrame (按钮框架) - 接收交互事件
```

### 结构特点

1. **背景框架 (Backdrop)**
   - 负责显示按钮的背景纹理
   - 使用 `setAbsPoint` 设置绝对坐标
   - 支持自定义纹理路径

2. **文本框架 (Text)**
   - 显示按钮的文字内容
   - 支持WC3颜色代码 (`|cffRRGGBB文本|r`)
   - 可设置文本对齐方式

3. **按钮框架 (Button)**
   - 接收鼠标点击、悬停、离开事件
   - 通过 `FrameEventUtils` 绑定事件
   - 覆盖整个按钮区域

## 基本用法

### 1. 在屏幕中心创建按钮（推荐）

```typescript
import { Button, ButtonTextures } from "src/system/ui/component/Buttom";

// 使用createCentered在屏幕中心创建按钮
const centerButton = Button.createCentered("中心按钮", "LARGE");

// 设置背景和事件
centerButton
  .setTexturePreset("DIALOG_BACKGROUND")
  .setOnClick(() => {
    print("点击了中心按钮!");
  });

// 显示按钮
centerButton.create();
```

### 2. 使用预设位置创建

```typescript
// 在屏幕预设位置创建按钮
// 位置: 'CENTER', 'TOP_LEFT', 'TOP_RIGHT', 'BOTTOM_LEFT', 'BOTTOM_RIGHT',
//       'TOP_CENTER', 'BOTTOM_CENTER', 'LEFT_CENTER', 'RIGHT_CENTER',
//       'UI_TOP_LEFT', 'UI_TOP_RIGHT', 'UI_BOTTOM_LEFT', 'UI_BOTTOM_RIGHT'

const topLeftBtn = Button.createAtPresetPosition("左上角", "UI_TOP_LEFT", "MEDIUM", true);
topLeftBtn.create();
```

### 3. 使用像素坐标创建

```typescript
// 指定像素坐标 (label, x, y, width, height)
const button = new Button("自定义位置", 400, 300, 120, 40);
button.create();
```

## 背景纹理设置

### 预设纹理

```typescript
import { ButtonTextures } from "src/system/ui/component/Buttom";

// 使用预设纹理
button.setTexturePreset("HUMAN_BORDER");       // 人族边框
button.setTexturePreset("HUMAN_BACKGROUND");   // 人族背景
button.setTexturePreset("ORC_BACKGROUND");     // 兽族背景
button.setTexturePreset("NIGHTELF_BACKGROUND"); // 暗夜精灵背景
button.setTexturePreset("UNDEAD_BACKGROUND");  // 不死族背景
button.setTexturePreset("BLACK_TRANSPARENT");  // 黑色半透明
button.setTexturePreset("TOOLTIP_BACKGROUND"); // 工具提示背景
button.setTexturePreset("DIALOG_BACKGROUND");  // 对话框背景
button.setTexturePreset("QUEST_BACKGROUND");   // 任务背景
button.setTexturePreset("TRANSPARENT");        // 透明（无背景）
```

### 自定义背景

```typescript
// 设置自定义背景图片
button.setBackground("UI\\Widgets\\Console\\Human\\CommandButton\\human-activestop-down.blp");

// 或者使用通用方法
button.setTexture("path/to/custom/texture.blp");

// 隐藏背景
button.hideBackdrop();

// 设置背景透明度 (0-255)
button.setBackdropAlpha(200);
```

## 事件设置

```typescript
const button = Button.createCentered("测试按钮");

button
  .setOnClick(() => {
    print("按钮被点击!");
  })
  .setOnHover(() => {
    print("鼠标进入");
  })
  .setOnLeave(() => {
    print("鼠标离开");
  });

button.create();
```

## 样式定制

```typescript
const button = Button.createCentered("自定义样式");

button
  .setTextColor("FF0000") // 红色文字
  .setTexturePreset("DIALOG_BACKGROUND")
  .setTextAlignment(50) // 居中对齐
  .addHoverEffect(200, 255); // 悬停时透明度200，正常时255

button.create();
```

## 链式配置

```typescript
const button = Button.createCentered("配置按钮");

button.configure({
  text: "新文本",
  textColor: "00FF00", // 绿色
  texture: ButtonTextures.HUMAN_BACKGROUND,
  onClick: () => print("点击!"),
  onHover: () => print("悬停!"),
  enabled: true,
  visible: true
});

button.create();
```

## 拖拽功能

Button 组件支持拖拽功能，用户可以按住按钮并拖动到新位置。

### 基本用法

```typescript
const button = Button.createCentered("可拖拽按钮");
button.setDraggable(true);
button.create();
```

### 便捷方法（推荐）

```typescript
const button = Button.createCentered("拖拽按钮");

button.enableDrag({
  onDragStart: () => {
    Console.log("开始拖拽");
  },
  onDragging: (x, y) => {
    Console.log("拖拽中: " + x + ", " + y);
  },
  onDragEnd: (x, y) => {
    Console.log("拖拽结束: " + x + ", " + y);
  }
});

button.create();
```

### 拖拽回调

```typescript
const button = Button.createCentered("高级拖拽");

// 分别设置各个回调
button
  .setDraggable(true)
  .setOnDragStart(() => {
    // 拖拽开始时的逻辑
    button.setTextColor("FF0000"); // 拖拽时变红
  })
  .setOnDragging((x, y) => {
    // 拖拽过程中每帧调用
    // x, y 是当前按钮的像素坐标
  })
  .setOnDragEnd((x, y) => {
    // 拖拽结束时的逻辑
    button.setTextColor("FFFFFF"); // 恢复白色
    Console.log("按钮最终位置: " + x + ", " + y);
  });

button.create();
```

### 禁用拖拽

```typescript
// 禁用拖拽
button.disableDrag();

// 或者
button.setDraggable(false);
```

### 注意事项

1. 启用拖拽后，点击按钮会开始拖拽而不是触发 `onClick`
2. 拖拽结束通过检测鼠标左键松开实现
3. 拖拽过程中按钮会实时跟随鼠标移动
4. 可以同时设置 `onDragEnd` 来保存按钮的最终位置

## 完整示例

```typescript
import { Button, ButtonTextures } from "src/system/ui/component/Buttom";
import { Console } from "src/system/console";

export class ButtonExample {
  private testButton: Button | null = null;
  private centerButton: Button | null = null;

  public initialize(): void {
    // 方法1: 像素坐标创建
    this.testButton = new Button("测试按钮", 400, 300, 100, 36);
    this.testButton
      .setTextColor("FFCC00")
      .setTexturePreset("HUMAN_BACKGROUND")
      .setOnClick(() => Console.log("测试按钮被点击!"))
      .addHoverEffect();
    this.testButton.create();

    // 方法2: 屏幕中心创建（推荐）
    this.centerButton = Button.createCentered("屏幕中心按钮", "LARGE");
    this.centerButton
      .setTextColor("00FF00")
      .setBackground(ButtonTextures.DIALOG_BACKGROUND)
      .setOnClick(() => Console.log("中心按钮被点击!"));
    this.centerButton.create();
  }

  public cleanup(): void {
    this.testButton?.destroy();
    this.centerButton?.destroy();
  }
}
```

## API 参考

### 构造函数

```typescript
constructor(
  label: string,           // 按钮文本
  x: number,              // X坐标(像素)
  y: number,              // Y坐标(像素)
  width: number = 120,    // 宽度(像素)
  height: number = 40,    // 高度(像素)
  origin: string = ScreenCoordinates.ORIGIN_TOP_LEFT
)
```

### 静态方法

- `createWithPreset(label, x, y, sizePreset, origin)` - 使用预设尺寸创建
- `createAtPresetPosition(label, positionPreset, sizePreset, centered)` - 使用预设位置创建
- `createCentered(label, sizePreset)` - 在屏幕中心创建（便捷方法）

### 主要方法

#### 创建和销毁
- `create(parent?: Frame)` - 创建并显示按钮
- `destroy()` - 销毁按钮及所有子框架

#### 事件设置
- `setOnClick(callback)` - 设置点击事件
- `setOnHover(callback)` - 设置鼠标进入事件
- `setOnLeave(callback)` - 设置鼠标离开事件
- `click()` - 手动触发点击

#### 外观设置
- `setText(text)` - 设置文本
- `setTextColor(hexColor)` - 设置文本颜色 (如 "FF0000")
- `setTextAlignment(alignment)` - 设置文本对齐
- `setTexture(texturePath)` - 设置背景纹理路径
- `setTexturePreset(preset)` - 使用预设纹理
- `setBackground(path)` - 设置自定义背景图片
- `setBackdropAlpha(alpha)` - 设置背景透明度
- `hideBackdrop()` - 隐藏背景
- `setTooltip(tooltip)` - 设置工具提示

#### 位置和大小
- `setPosition(x, y)` - 设置位置
- `setSize(width, height)` - 设置大小
- `getPosition()` - 获取位置
- `getSize()` - 获取大小

#### 状态控制
- `setEnabled(enabled)` - 启用/禁用
- `setVisible(visible)` - 显示/隐藏
- `getEnabled()` - 获取启用状态
- `getVisible()` - 获取可见状态

#### 特效
- `addHoverEffect(hoverAlpha, normalAlpha)` - 添加悬停透明度效果

#### 拖拽功能
- `setDraggable(draggable)` - 启用/禁用拖拽
- `getDraggable()` - 获取是否可拖拽
- `getIsDragging()` - 获取是否正在拖拽
- `setOnDragStart(callback)` - 设置拖拽开始回调
- `setOnDragEnd(callback)` - 设置拖拽结束回调（参数为最终坐标）
- `setOnDragging(callback)` - 设置拖拽过程中回调（参数为当前坐标）
- `enableDrag(config?)` - 启用拖拽并配置回调（便捷方法）
- `disableDrag()` - 禁用拖拽

#### 高级配置
- `configure(config)` - 批量配置按钮属性

#### 获取框架
- `getBackdropFrame()` - 获取背景框架
- `getTextFrame()` - 获取文本框架
- `getButtonFrame()` - 获取按钮框架

## 预设纹理路径参考

```typescript
export const ButtonTextures = {
  HUMAN_BORDER: "UI\\Widgets\\Console\\Human\\CommandButton\\human-multipleselection-border.blp",
  HUMAN_BACKGROUND: "UI\\Widgets\\Console\\Human\\human-transport-slot.blp",
  ORC_BACKGROUND: "UI\\Widgets\\Console\\Orc\\orc-transport-slot.blp",
  NIGHTELF_BACKGROUND: "UI\\Widgets\\Console\\NightElf\\nightelf-transport-slot.blp",
  UNDEAD_BACKGROUND: "UI\\Widgets\\Console\\Undead\\undead-transport-slot.blp",
  BLACK_TRANSPARENT: "UI\\Widgets\\EscMenu\\Human\\editbox-background.blp",
  TOOLTIP_BACKGROUND: "UI\\Widgets\\ToolTips\\Human\\human-tooltip-background.blp",
  DIALOG_BACKGROUND: "UI\\Widgets\\Glues\\GlueScreen-DialogBackground.blp",
  QUEST_BACKGROUND: "UI\\Widgets\\Quests\\QuestMainBackdrop.blp",
  TRANSPARENT: "",
};
```

## 坐标系统说明

### 像素坐标
- 标准屏幕尺寸: 1920 x 1080 像素
- 原点 (0, 0) 位于左上角
- X 轴向右增加，Y 轴向下增加

### WC3坐标
- 屏幕尺寸: 0.8 x 0.6
- 原点 (0.0, 0.0) 位于左下角
- X 轴向右增加，Y 轴向上增加

### 预设位置
- `CENTER`: (960, 540) - 屏幕中心
- `TOP_LEFT`: (0, 0) - 左上角
- `TOP_RIGHT`: (1820, 0) - 右上角
- `BOTTOM_LEFT`: (0, 1080) - 左下角
- `BOTTOM_RIGHT`: (1820, 1080) - 右下角
- `UI_TOP_LEFT`: (50, 50) - UI安全区左上角
- 等...

## 注意事项

1. 必须调用 `create()` 方法才能显示按钮
2. 使用 `createCentered()` 或 `createAtPresetPosition()` 时，按钮会自动居中对齐到指定位置
3. 销毁时会自动清理所有三层框架
4. 文本颜色使用十六进制格式 (如 "FF0000" 表示红色，不含 #)
5. 纹理路径使用WC3资源路径格式 (双反斜杠)
