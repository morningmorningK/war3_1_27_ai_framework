# Tips 组件与多 Frame 组件集成指南

## 问题背景

当使用 Tips 组件时，很多 UI 组件（如 Button、Panel）内部由多个 Frame 构成：

```typescript
// Button 组件内部结构
class Button {
  private backdropFrame: Frame | null = null;  // 背景 Frame
  private textComponent: Text | null = null;   // 文本组件
  private buttonFrame: Frame | null = null;    // 按钮 Frame（事件层）
}
```

## 解决方案

### 方案 1：使用组件提供的位置和尺寸信息（推荐）

Button 等组件提供了 `getComponentInfo()` 方法，返回组件的完整信息：

```typescript
interface ComponentInfo {
  frame: Frame | null;    // 主 Frame（用于定位参考）
  x: number;              // 像素 X 坐标
  y: number;              // 像素 Y 坐标  
  width: number;          // 像素宽度
  height: number;         // 像素高度
}
```

#### 使用示例

```typescript
import { Tips, TipsPosition, TipsAnimation } from "../system/ui/component/Tips";
import { Button } from "../system/ui/component/Button";

const tips = Tips.getInstance();
const button = new Button("技能按钮", 200, 200, 100, 100);
button.create();
button.setBackground("ReplaceableTextures\\CommandButtons\\BTNFireBolt.blp");

button.setOnHover(() => {
  // 获取组件完整信息
  const info = button.getComponentInfo();
  
  // 传递给 Tips，自动智能定位
  tips.show({
    text: "火球术\n\n造成 150 点伤害",
    textColor: "FFD700",
    icon: "ReplaceableTextures\\CommandButtons\\BTNFireBolt.blp",
    width: 250,
    position: TipsPosition.AUTO,  // 自动选择最佳位置
    animation: TipsAnimation.SLIDE_RIGHT,
    delayShow: 0.3
  }, undefined, info.x, info.y, info.width, info.height);
});

button.setOnLeave(() => {
  tips.hide();
});
```

### 方案 2：直接传递像素坐标

如果不需要自动智能定位，也可以直接传递像素坐标：

```typescript
const button = new Button("按钮", 200, 200, 100, 40);
button.create();

button.setOnHover(() => {
  // 直接使用 getPosition() 和 getSize()
  const pos = button.getPosition();
  const size = button.getSize();
  
  tips.show({
    text: "提示内容",
    textColor: "FFFFFF",
    width: 200,
    position: TipsPosition.RIGHT  // 手动指定右侧
  }, undefined, pos.x, pos.y, size.width, size.height);
});
```

### 方案 3：简化写法（仅位置）

如果只需要基本定位，不需要智能选择：

```typescript
button.setOnHover(() => {
  const pos = button.getPosition();
  
  // 只传坐标，使用默认组件尺寸 (100x40)
  tips.show({
    text: "简单提示",
    textColor: "FFFFFF",
    width: 200,
    position: TipsPosition.RIGHT
  }, undefined, pos.x, pos.y);
});
```

## Button 组件提供的辅助方法

```typescript
class Button {
  /**
   * 获取主 Frame（优先返回 backdrop，其次 button）
   * 用于 Tips 等组件的相对定位
   */
  public getMainFrame(): Frame | null;

  /**
   * 获取组件信息，用于 Tips 显示
   * @returns 包含 frame、位置、尺寸的对象
   */
  public getComponentInfo(): ComponentInfo;

  /**
   * 获取位置
   */
  public getPosition(): { x: number; y: number };

  /**
   * 获取尺寸
   */
  public getSize(): { width: number; height: number };
}
```

## Tips 智能定位逻辑

当使用 `TipsPosition.AUTO` 时，Tips 会根据组件在屏幕中的位置自动选择最佳显示方向：

| 组件位置 | 优先方向 | 说明 |
|---------|---------|------|
| 右上角 | 左侧/下方 | 避免超出屏幕右边界和上边界 |
| 右下角 | 左侧/上方 | 避免超出屏幕右边界和下边界 |
| 左上角 | 右侧/下方 | 避免超出屏幕左边界和上边界 |
| 左下角 | 右侧/上方 | 避免超出屏幕左边界和下边界 |
| 右侧 | 左侧 | 靠近右边缘时显示在左侧 |
| 左侧 | 右侧 | 靠近左边缘时显示在右侧 |
| 顶部 | 下方 | 靠近顶部时显示在下方 |
| 底部 | 上方 | 靠近底部时显示在上方 |
| 中心 | 右侧 | 默认优先右侧显示 |

## 完整示例

```typescript
export function runTipsWithButtonIntegration(): void {
  const tips = Tips.getInstance();

  // 在屏幕四角创建按钮，测试智能定位
  const positions = [
    { name: "左上", x: 50, y: 50 },
    { name: "右上", x: 1800, y: 50 },
    { name: "左下", x: 50, y: 1000 },
    { name: "右下", x: 1800, y: 1000 },
  ];

  positions.forEach(pos => {
    const btn = new Button(`${pos.name}按钮`, pos.x, pos.y, 80, 80);
    btn.create();
    btn.setText(pos.name);
    
    btn.setOnHover(() => {
      const info = btn.getComponentInfo();
      tips.show({
        text: `这是${pos.name}的提示\n\nTips 会自动选择\n最佳显示位置`,
        textColor: "FFFFFF",
        width: 200,
        position: TipsPosition.AUTO,  // 自动智能定位
        animation: TipsAnimation.FADE,
        delayShow: 0.2
      }, undefined, info.x, info.y, info.width, info.height);
    });

    btn.setOnLeave(() => {
      tips.hide();
    });
  });
}
```

## 注意事项

1. **targetFrame 参数的限制**：由于 WC3 API 限制，无法直接从 Frame 获取精确的屏幕坐标，因此推荐使用像素坐标方式
2. **坐标系统**：所有坐标使用标准像素坐标（1920x1080），Tips 会自动转换为 WC3 坐标系（0.8x0.6）
3. **智能定位**：使用 `TipsPosition.AUTO` 让 Tips 自动选择最佳显示位置
4. **组件尺寸**：传递准确的组件尺寸可以让智能定位更精确

## 最佳实践

1. ✅ **使用 `getComponentInfo()`** - 一行代码获取所有需要的信息
2. ✅ **使用 `TipsPosition.AUTO`** - 让 Tips 自动处理边界情况
3. ✅ **设置合适的延迟** - `delayShow: 0.2~0.5` 避免误触发
4. ✅ **添加动画** - `animation: TipsAnimation.SLIDE_RIGHT` 提升体验
5. ❌ **不要使用 targetFrame** - API 限制，不建议使用
