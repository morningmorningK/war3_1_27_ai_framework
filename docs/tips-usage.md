# Tips 组件使用文档

## 概述

Tips 组件是一个单例模式的悬浮提示框，用于显示鼠标悬停提示、技能说明、物品介绍等。它具有以下特性：

- **单例模式**：全局只创建一个实例，避免重复创建 Frame，提高性能
- **智能定位**：根据屏幕边界自动调整显示位置
- **动画效果**：支持淡入淡出、滑动等动画
- **延迟显示**：避免鼠标快速划过时频繁闪烁
- **可复用**：修改内容后立即复用，无需销毁重建

## 基本用法

### 1. 获取 Tips 实例

```typescript
import { Tips, TipsConfig, TipsPosition, TipsAnimation } from "src/system/ui/component/Tips";

// 获取单例
const tips = Tips.getInstance();
```

### 2. 显示简单文本提示

```typescript
// 最简单的用法
tips.show({
  text: "这是一个提示文本"
}, undefined, mouseX, mouseY);
```

### 3. 显示技能提示

```typescript
tips.show({
  text: "火焰之球\n\n对目标造成 150 点火焰伤害\n\n冷却时间: 10 秒\n魔法消耗: 100",
  textColor: "FFD700", // 金色
  icon: "ReplaceableTextures\\CommandButtons\\BTNFireBolt.blp",
  width: 350,
  position: TipsPosition.AUTO,
  animation: TipsAnimation.FADE,
  delayShow: 0.5 // 悬停 0.5 秒后显示
}, undefined, mouseX, mouseY);
```

### 4. 显示物品提示

```typescript
tips.show({
  text: "+10 力量\n+5 护甲\n\n主动技能：无敌\n使英雄无敌 5 秒",
  textColor: "00FF00", // 绿色
  icon: "ReplaceableTextures\\CommandButtons\\BTNHelmOfValor.blp",
  background: "UI\\Widgets\\ToolTips\\Human\\tooltip-background-item.blp",
  width: 300,
  maxHeight: 200,
  position: TipsPosition.RIGHT,
  animation: TipsAnimation.FADE
}, undefined, mouseX, mouseY);
```

### 5. 隐藏提示

```typescript
tips.hide();
```

## 配置选项

### TipsConfig 接口

```typescript
interface TipsConfig {
  /** 提示文本（支持换行符 \n） */
  text: string;
  
  /** 文本颜色（十六进制，不含 #），默认: "FFFFFF" */
  textColor?: string;
  
  /** 背景纹理路径，默认: 标准提示框背景 */
  background?: string;
  
  /** 图标路径（可选） */
  icon?: string;
  
  /** 宽度（像素），默认: 300 */
  width?: number;
  
  /** 最大高度（像素），默认: 400 */
  maxHeight?: number;
  
  /** 显示位置偏好，默认: AUTO */
  position?: TipsPosition;
  
  /** 动画类型，默认: FADE */
  animation?: TipsAnimation;
  
  /** 延迟显示时间（秒），默认: 0.3 */
  delayShow?: number;
  
  /** 延迟隐藏时间（秒），默认: 0.1 */
  delayHide?: number;
  
  /** 距离目标的偏移距离（像素），默认: 10 */
  offset?: number;
}
```

### TipsPosition 枚举

```typescript
enum TipsPosition {
  /** 自动检测（根据屏幕边界） */
  AUTO = "auto",
  /** 右侧 */
  RIGHT = "right",
  /** 左侧 */
  LEFT = "left",
  /** 上方 */
  TOP = "top",
  /** 下方 */
  BOTTOM = "bottom",
}
```

### TipsAnimation 枚举

```typescript
enum TipsAnimation {
  /** 无动画 */
  NONE = "none",
  /** 淡入淡出 */
  FADE = "fade",
  /** 从右侧滑入 */
  SLIDE_RIGHT = "slideRight",
  /** 从左侧滑入 */
  SLIDE_LEFT = "slideLeft",
  /** 从上方滑入 */
  SLIDE_TOP = "slideTop",
  /** 从下方滑入 */
  SLIDE_BOTTOM = "slideBottom",
}
```

## 实际应用场景

### 场景 1：Button 组件悬停提示

```typescript
import { Button } from "src/system/ui/component/Button";
import { Tips } from "src/system/ui/component/Tips";

const button = Button.createCentered("技能按钮");
const tips = Tips.getInstance();

button.setOnHover(() => {
  tips.show({
    text: "雷霆一击\n\n召唤闪电攻击敌人\n伤害: 200\n冷却: 8秒",
    textColor: "00FFFF",
    icon: "ReplaceableTextures\\CommandButtons\\BTNLightningBolt.blp",
    position: TipsPosition.RIGHT,
    delayShow: 0.3
  }, button.getFrame());
});

button.setOnLeave(() => {
  tips.hide();
});
```

### 场景 2：自定义 UI 组件提示

```typescript
// 假设你有一个自定义的技能栏组件
class SkillBar {
  private skills: { frame: Frame; info: SkillInfo }[] = [];
  private tips = Tips.getInstance();

  public addSkill(skillFrame: Frame, skillInfo: SkillInfo): void {
    this.skills.push({ frame: skillFrame, info: skillInfo });

    // 注册鼠标事件
    DzFrameSetScriptByCode(skillFrame.handle, 2, () => { // MOUSE_ENTER
      this.showSkillTips(skillInfo);
    }, false);

    DzFrameSetScriptByCode(skillFrame.handle, 3, () => { // MOUSE_LEAVE
      this.tips.hide();
    }, false);
  }

  private showSkillTips(skillInfo: SkillInfo): void {
    this.tips.show({
      text: `${skillInfo.name}\n\n${skillInfo.description}\n\n冷却: ${skillInfo.cooldown}秒\n魔法: ${skillInfo.manaCost}`,
      textColor: "FFD700",
      icon: skillInfo.icon,
      width: 320,
      position: TipsPosition.AUTO,
      animation: TipsAnimation.FADE,
      delayShow: 0.4
    }, undefined, mouseX, mouseY);
  }
}
```

### 场景 3：物品背包提示

```typescript
class InventorySlot {
  private frame: Frame;
  private tips = Tips.getInstance();

  constructor(frame: Frame) {
    this.frame = frame;
    this.setupEvents();
  }

  private setupEvents(): void {
    DzFrameSetScriptByCode(this.frame.handle, 2, () => {
      const item = this.getItemInSlot();
      if (item) {
        this.showItemTips(item);
      }
    }, false);

    DzFrameSetScriptByCode(this.frame.handle, 3, () => {
      this.tips.hide();
    }, false);
  }

  private showItemTips(item: ItemData): void {
    let text = item.name + "\n\n";
    
    // 添加属性
    if (item.strength > 0) text += `+${item.strength} 力量\n`;
    if (item.agility > 0) text += `+${item.agility} 敏捷\n`;
    if (item.intelligence > 0) text += `+${item.intelligence} 智力\n`;
    
    // 添加说明
    if (item.description) {
      text += "\n" + item.description;
    }

    this.tips.show({
      text,
      textColor: this.getItemColorByRarity(item.rarity),
      icon: item.icon,
      width: 300,
      position: TipsPosition.AUTO,
      animation: TipsAnimation.FADE
    }, this.frame);
  }

  private getItemColorByRarity(rarity: string): string {
    switch (rarity) {
      case "legendary": return "FF8000"; // 橙色
      case "epic": return "A335EE"; // 紫色
      case "rare": return "0070DD"; // 蓝色
      case "uncommon": return "1EFF00"; // 绿色
      default: return "FFFFFF"; // 白色
    }
  }
}
```

## 性能优化建议

### 1. 单例复用

```typescript
// ✅ 推荐：复用单例
const tips = Tips.getInstance();
tips.show({ text: "提示1" });
// ... 稍后
tips.show({ text: "提示2" }); // 自动复用，无需重建 Frame

// ❌ 不推荐：重复创建
// Tips 已经是单例，不会重复创建，但避免频繁调用 getInstance()
```

### 2. 合理设置延迟

```typescript
// ✅ 推荐：设置合理的延迟，避免鼠标快速划过时闪烁
tips.show({
  text: "提示",
  delayShow: 0.3, // 悬停 0.3 秒后显示
  delayHide: 0.1  // 移开后 0.1 秒隐藏
});

// ❌ 不推荐：无延迟，可能导致闪烁
tips.show({ text: "提示", delayShow: 0 });
```

### 3. 避免频繁更新

```typescript
// ✅ 推荐：只在内容变化时更新
let currentItemId = -1;
function onMouseEnter(itemId: number) {
  if (currentItemId !== itemId) {
    currentItemId = itemId;
    tips.show({ text: getItemText(itemId) });
  }
}

// ❌ 不推荐：每次鼠标移动都更新
function onMouseMove() {
  tips.show({ text: "..." }); // 性能浪费
}
```

## 注意事项

1. **坐标系统**：`show()` 方法接受像素坐标（1920x1080），内部会自动转换为 WC3 坐标
2. **自动定位**：使用 `TipsPosition.AUTO` 时，会自动检测屏幕边界，优先右侧显示
3. **文本格式**：支持 WC3 颜色代码（`|cffRRGGBB文本|r`）和换行符（`\n`）
4. **动画限制**：当前版本只实现了淡入淡出动画，滑动动画待后续完善
5. **单例生命周期**：Tips 单例会在整个游戏过程中存在，通常不需要手动销毁

## 后续扩展建议

1. **完善滑动动画**：实现真正的位置偏移动画
2. **富文本支持**：支持更复杂的文本格式（如表格、列表）
3. **多行文本自适应高度**：根据文本内容自动计算高度
4. **鼠标跟随模式**：Tips 跟随鼠标移动
5. **自定义样式**：支持更多自定义背景、边框样式
