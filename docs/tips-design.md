# Tips 组件设计文档

## 设计目标

创建一个高性能、可复用的悬浮提示组件，满足以下需求：

1. **单例模式** - 全局只创建一个实例，避免频繁创建/销毁 Frame
2. **智能定位** - 根据屏幕边界自动调整显示位置
3. **动画效果** - 淡入淡出动画，提升用户体验
4. **延迟显示** - 避免鼠标快速划过时频繁闪烁
5. **内容复用** - 修改文本/图标后立即复用，无需重建 Frame

## 核心特性

### 1. 单例模式 (Singleton Pattern)

```typescript
export class Tips {
  private static instance: Tips | null = null;
  
  private constructor() {
    // 私有构造函数，防止外部实例化
  }
  
  public static getInstance(): Tips {
    if (!Tips.instance) {
      Tips.instance = new Tips();
      Tips.instance.create();
    }
    return Tips.instance;
  }
}
```

**优势**：
- 整个游戏生命周期只创建一次 Frame
- 避免内存泄漏和 Frame 句柄耗尽
- 全局统一管理，避免多个 Tips 同时显示

### 2. Frame 结构

```
backdropFrame (BACKDROP)           - 背景容器
├── iconFrame (BACKDROP)           - 可选图标
└── textFrame (TEXT)               - 文本内容
```

**设计考虑**：
- 背景使用 BACKDROP 类型，支持自定义纹理
- 图标使用 BACKDROP，可设置任意贴图
- 文本使用 TEXT 类型，支持富文本和换行

### 3. 智能定位算法

```typescript
private detectBestPosition(
  pixelX: number,
  pixelY: number,
  tipsWidth: number,
  tipsHeight: number,
  offset: number
): TipsPosition {
  // 计算四个方向的可用空间
  const spaceRight = screenWidth - pixelX - offset;
  const spaceLeft = pixelX - offset;
  const spaceTop = pixelY - offset;
  const spaceBottom = screenHeight - pixelY - offset;

  // 优先级：右 → 左 → 下 → 上
  if (spaceRight >= tipsWidth) return TipsPosition.RIGHT;
  if (spaceLeft >= tipsWidth) return TipsPosition.LEFT;
  if (spaceBottom >= tipsHeight) return TipsPosition.BOTTOM;
  if (spaceTop >= tipsHeight) return TipsPosition.TOP;

  // 选择空间最大的方向
  return maxSpaceDirection;
}
```

**特点**：
- 自动检测屏幕边界
- 优先右侧显示（最符合用户习惯）
- 确保不超出屏幕范围

### 4. 动画系统

```typescript
private playAnimation(animation: TipsAnimation, isShowing: boolean): void {
  const interval = 1.0 / ANIMATION_FPS; // 30 FPS
  const totalSteps = ANIMATION_DURATION * ANIMATION_FPS; // 0.15秒 * 30帧
  
  TimerStart(timer, interval, true, () => {
    progress += 1 / totalSteps;
    
    // 缓动函数：easeOutCubic
    const eased = 1 - Math.pow(1 - progress, 3);
    const alpha = currentAlpha + (targetAlpha - currentAlpha) * eased;
    
    this.setAlpha(Math.floor(alpha));
  });
}
```

**缓动函数选择**：
- `easeOutCubic`: 快速开始，缓慢结束
- 视觉效果更自然流畅
- 避免突兀的显示/隐藏

### 5. 延迟机制

```typescript
public show(config: TipsConfig, ...): void {
  // 取消之前的定时器
  this.cancelTimers();
  
  const delayShow = config.delayShow ?? 0.3; // 默认0.3秒
  
  if (delayShow > 0) {
    this.showTimer = CreateTimer();
    TimerStart(this.showTimer, delayShow, false, () => {
      this.doShow(config, ...);
    });
  }
}
```

**好处**：
- 避免鼠标快速划过时提示闪烁
- 提升用户体验，减少视觉干扰
- 可根据场景自定义延迟时间

## 使用场景

### 场景 1：技能提示

```typescript
const tips = Tips.getInstance();

skillButton.setOnHover(() => {
  tips.show({
    text: "火焰之球\n\n伤害: 150\n冷却: 10秒\n魔法: 100",
    textColor: "FFD700",
    icon: "ReplaceableTextures\\CommandButtons\\BTNFireBolt.blp",
    position: TipsPosition.AUTO,
    animation: TipsAnimation.FADE,
    delayShow: 0.5
  }, skillButton.getFrame());
});

skillButton.setOnLeave(() => {
  tips.hide();
});
```

### 场景 2：物品说明

```typescript
inventorySlot.setOnHover(() => {
  tips.show({
    text: "+10 力量\n+5 护甲\n\n主动：无敌 5秒",
    textColor: "A335EE", // 紫色（史诗品质）
    icon: item.icon,
    width: 300,
    position: TipsPosition.RIGHT
  }, inventorySlot.getFrame());
});
```

### 场景 3：UI 元素帮助

```typescript
helpButton.setOnHover(() => {
  tips.show({
    text: "点击查看详细帮助\n\n快捷键: F1",
    textColor: "00FFFF",
    width: 250,
    delayShow: 0.3
  }, helpButton.getFrame());
});
```

## 性能优化

### 1. Frame 复用

- 全局单例，只创建一次
- 修改内容时直接更新 Frame 属性
- 避免频繁的 create/destroy

### 2. 定时器管理

```typescript
private cancelTimers(): void {
  if (this.showTimer) DestroyTimer(this.showTimer);
  if (this.hideTimer) DestroyTimer(this.hideTimer);
  if (this.animationTimer) DestroyTimer(this.animationTimer);
}
```

- 切换提示时自动取消旧定时器
- 避免定时器泄漏

### 3. 最小化重绘

- 只在内容变化时更新
- 使用透明度控制显示/隐藏，不频繁修改位置

## 扩展方向

### 1. 滑动动画

实现真正的位置偏移动画：

```typescript
case TipsAnimation.SLIDE_RIGHT:
  // 从右侧滑入，同时改变透明度和位置
  const offsetX = (1 - eased) * 20; // 20像素偏移
  this.backdropFrame.setPosition(finalX + offsetX, finalY);
  break;
```

### 2. 富文本支持

支持更复杂的格式：

```typescript
{
  text: [
    { text: "火焰之球", color: "FFD700", size: 14 },
    { text: "\n\n伤害: ", color: "FFFFFF", size: 12 },
    { text: "150", color: "FF0000", size: 12 },
    // ...
  ]
}
```

### 3. 自适应高度

根据文本行数自动计算高度：

```typescript
private calculateHeight(text: string): number {
  const lines = text.split('\n').length;
  const lineHeight = 20; // 每行高度
  return Math.min(lines * lineHeight + padding, maxHeight);
}
```

### 4. 鼠标跟随

Tips 跟随鼠标实时移动：

```typescript
public enableMouseFollow(): void {
  TimerStart(CreateTimer(), 0.03, true, () => {
    const mouseX = GetMouseX();
    const mouseY = GetMouseY();
    this.updatePosition(mouseX, mouseY);
  });
}
```

## API 参考

### TipsConfig 接口

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| text | string | (必需) | 提示文本，支持 \n 换行 |
| textColor | string | "FFFFFF" | 十六进制颜色，不含 # |
| background | string | 标准提示框背景 | 背景纹理路径 |
| icon | string | undefined | 图标路径 |
| width | number | 300 | 宽度（像素） |
| maxHeight | number | 400 | 最大高度（像素） |
| position | TipsPosition | AUTO | 显示位置 |
| animation | TipsAnimation | FADE | 动画类型 |
| delayShow | number | 0.3 | 延迟显示时间（秒） |
| delayHide | number | 0.1 | 延迟隐藏时间（秒） |
| offset | number | 10 | 距离目标的偏移（像素） |

### 方法

- `getInstance()` - 获取单例
- `show(config, targetFrame?, pixelX?, pixelY?)` - 显示提示
- `hide()` - 隐藏提示
- `getIsVisible()` - 检查是否可见
- `destroy()` - 销毁（通常不需要）

## 总结

Tips 组件采用单例模式 + Frame 复用的设计，实现了高性能的悬浮提示功能。通过智能定位、动画效果和延迟机制，提供了良好的用户体验。组件设计遵循单一职责原则，接口简洁易用，适合在各种 UI 场景中使用。
