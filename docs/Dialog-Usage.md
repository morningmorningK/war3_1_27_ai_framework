# Dialog 组件使用指南

Dialog 组件提供了一个功能强大的模态对话框系统，支持多按钮、自定义样式和灵活的交互逻辑。

## 目录
- [快速开始](#快速开始)
- [基本用法](#基本用法)
- [创建方法](#创建方法)
- [按钮管理](#按钮管理)
- [样式配置](#样式配置)
- [常见场景](#常见场景)
- [API 参考](#api-参考)

---

## 快速开始

### 最简单的用法

```typescript
import { Dialog } from "./system/ui/component/Dialog";

// 创建对话框
const dialog = new Dialog("提示", 500, 300);
dialog.create();

// 添加按钮
dialog.addButton({
  text: "确定",
  onClick: () => {
    print("点击了确定");
    dialog.hide();
  }
});

// 显示对话框
dialog.show();
```

### 确认对话框（最常用）

```typescript
// 使用静态工厂方法快速创建
const confirmDialog = Dialog.createConfirm(
  "确认操作",
  "你确定要继续吗？",
  () => {
    print("用户点击了"是"");
    // 执行确认操作
  },
  () => {
    print("用户点击了"否"");
    // 取消操作
  }
);

confirmDialog.show();
```

### 选择对话框

```typescript
const options = ["战士", "法师", "刺客", "牧师"];

const choiceDialog = Dialog.createChoice(
  "选择职业",
  options,
  (index) => {
    print("选择了: " + options[index]);
    // 根据选择执行相应逻辑
  }
);

choiceDialog.show();
```

---

## 基本用法

### 1. 创建对话框

```typescript
import { Dialog } from "./system/ui/component/Dialog";

// 方式 1: 构造函数创建
const dialog = new Dialog("对话框标题", 600, 400);
dialog.create();

// 方式 2: 创建居中对话框
const centeredDialog = Dialog.createCentered("标题", 500, 350);

// 方式 3: 静态工厂方法（推荐用于特定场景）
const confirmDialog = Dialog.createConfirm("确认", "确定吗？", onYes, onNo);
const choiceDialog = Dialog.createChoice("选择", ["A", "B", "C"], onChoice);
```

### 2. 添加按钮

```typescript
// 基本按钮
dialog.addButton({
  text: "确定",
  onClick: () => {
    print("点击了确定");
    dialog.hide();
  }
});

// 带颜色的按钮
dialog.addButton({
  text: "取消",
  onClick: () => dialog.hide(),
  color: TextColors.RED
});

// 多个按钮
dialog.addButton({ text: "选项1", onClick: () => print("1") });
dialog.addButton({ text: "选项2", onClick: () => print("2") });
dialog.addButton({ text: "选项3", onClick: () => print("3") });
```

### 3. 显示和隐藏

```typescript
// 显示对话框
dialog.show();

// 隐藏对话框（不销毁，可以再次显示）
dialog.hide();

// 销毁对话框（释放所有资源）
dialog.destroy();

// 检查可见性
if (dialog.isVisible()) {
  print("对话框当前可见");
}
```

---

## 创建方法

### Dialog 构造函数

```typescript
const dialog = new Dialog(title: string, width: number, height: number);
dialog.create(); // 必须调用 create() 才能创建 UI
```

### 静态工厂方法

#### 1. `Dialog.createCentered()`
创建居中显示的对话框

```typescript
const dialog = Dialog.createCentered("标题", 500, 300);
// 自动居中，自动调用 create()
```

#### 2. `Dialog.createConfirm()`
创建是/否确认对话框

```typescript
const confirmDialog = Dialog.createConfirm(
  title: string,        // 标题
  message: string,      // 提示消息（可选）
  onYes: () => void,   // 点击"是"的回调
  onNo?: () => void    // 点击"否"的回调（可选）
);
```

示例：
```typescript
Dialog.createConfirm(
  "删除确认",
  "确定要删除这个单位吗？",
  () => {
    // 执行删除
    RemoveUnit(targetUnit);
    print("单位已删除");
  },
  () => {
    print("取消删除");
  }
);
```

#### 3. `Dialog.createChoice()`
创建多选项对话框

```typescript
const choiceDialog = Dialog.createChoice(
  title: string,           // 标题
  options: string[],       // 选项数组
  onChoice: (index: number) => void  // 选择回调
);
```

示例：
```typescript
const heroes = ["剑圣", "大法师", "恶魔猎手", "先知"];

Dialog.createChoice(
  "选择英雄",
  heroes,
  (index) => {
    const heroName = heroes[index];
    print("选择了: " + heroName);
    CreateUnit(player, heroIds[index], x, y, facing);
  }
);
```

---

## 按钮管理

### 添加按钮

```typescript
interface DialogButtonConfig {
  text: string;                    // 按钮文字
  onClick: () => void;            // 点击回调
  color?: string;                 // 文字颜色（可选）
}

const button = dialog.addButton({
  text: "确定",
  onClick: () => print("点击"),
  color: TextColors.GREEN
});
```

### 移除按钮

```typescript
// 移除指定索引的按钮
dialog.removeButton(0); // 移除第一个按钮

// 移除所有按钮
dialog.clearButtons();
```

### 获取按钮列表

```typescript
const buttons = dialog.getButtons();
print("当前有 " + buttons.length + " 个按钮");
```

### 动态按钮示例

```typescript
const dialog = new Dialog("动态菜单", 500, 400);
dialog.create();

let itemCount = 0;

// 添加"添加项目"按钮
dialog.addButton({
  text: "添加项目",
  onClick: () => {
    itemCount++;
    dialog.addButton({
      text: "项目 " + itemCount,
      onClick: () => print("点击了项目 " + itemCount)
    });
  },
  color: TextColors.GREEN
});

// 添加"移除最后项目"按钮
dialog.addButton({
  text: "移除最后项目",
  onClick: () => {
    const buttons = dialog.getButtons();
    if (buttons.length > 2) {
      dialog.removeButton(buttons.length - 1);
    }
  },
  color: TextColors.RED
});
```

---

## 样式配置

### 使用 `configure()` 方法

```typescript
interface DialogConfig {
  titleColor?: string;      // 标题颜色
  background?: string;      // 背景图片路径
  alpha?: number;          // 透明度 (0-255)
  buttonStartY?: number;   // 第一个按钮的 Y 偏移
  buttonSpacing?: number;  // 按钮间距
  buttonHeight?: number;   // 按钮高度
  buttonWidthRatio?: number; // 按钮宽度比例 (0-1)
}

dialog.configure({
  titleColor: TextColors.GOLD,
  background: "UI\\Widgets\\Glues\\GlueScreen-DialogBackground.blp",
  alpha: 240,
  buttonStartY: 60,
  buttonSpacing: 70,
  buttonHeight: 55,
  buttonWidthRatio: 0.7
});
```

### 完整样式示例

```typescript
const styledDialog = new Dialog("自定义对话框", 500, 400);
styledDialog.create();

styledDialog.configure({
  titleColor: TextColors.CYAN,           // 青色标题
  background: "UI\\Widgets\\Console\\Human\\Human-ScrollBarBackground.blp",
  alpha: 250,                            // 几乎不透明
  buttonStartY: 70,                      // 第一个按钮更靠下
  buttonSpacing: 65,                     // 按钮间距更大
  buttonHeight: 60,                      // 更高的按钮
  buttonWidthRatio: 0.8                  // 更宽的按钮
});

styledDialog.addButton({
  text: "选项 1",
  onClick: () => print("选项 1"),
  color: TextColors.WHITE
});

styledDialog.addButton({
  text: "选项 2",
  onClick: () => print("选项 2"),
  color: TextColors.WHITE
});
```

---

## 常见场景

### 1. 游戏菜单

```typescript
const menuDialog = Dialog.createCentered("游戏菜单", 450, 450);

menuDialog.configure({
  titleColor: TextColors.GOLD,
  alpha: 240,
  buttonSpacing: 65
});

menuDialog.addButton({
  text: "继续游戏",
  onClick: () => {
    menuDialog.hide();
    ResumeTimer(GetExpiredTimer());
  },
  color: TextColors.GREEN
});

menuDialog.addButton({
  text: "保存游戏",
  onClick: () => {
    SaveGame("save.w3g");
    print("游戏已保存");
  },
  color: TextColors.CYAN
});

menuDialog.addButton({
  text: "设置",
  onClick: () => {
    // 打开设置对话框
    openSettingsDialog();
  },
  color: TextColors.WHITE
});

menuDialog.addButton({
  text: "退出游戏",
  onClick: () => {
    Dialog.createConfirm(
      "退出确认",
      "确定要退出游戏吗？",
      () => {
        EndGame(true);
      }
    ).show();
  },
  color: TextColors.RED
});
```

### 2. 难度选择

```typescript
const difficultyDialog = Dialog.createCentered("选择难度", 500, 350);

difficultyDialog.addButton({
  text: "简单",
  onClick: () => {
    setDifficulty("easy");
    difficultyDialog.hide();
  },
  color: TextColors.GREEN
});

difficultyDialog.addButton({
  text: "普通",
  onClick: () => {
    setDifficulty("normal");
    difficultyDialog.hide();
  },
  color: TextColors.YELLOW
});

difficultyDialog.addButton({
  text: "困难",
  onClick: () => {
    setDifficulty("hard");
    difficultyDialog.hide();
  },
  color: TextColors.ORANGE
});

difficultyDialog.addButton({
  text: "地狱",
  onClick: () => {
    setDifficulty("hell");
    difficultyDialog.hide();
  },
  color: TextColors.RED
});
```

### 3. 成就系统

```typescript
function showAchievement(name: string, description: string): void {
  const achievementDialog = Dialog.createCentered("成就解锁", 550, 280);
  
  achievementDialog.configure({
    titleColor: TextColors.GOLD,
    buttonStartY: 80
  });

  // 这里可以添加成就图标和描述
  // (需要扩展 Dialog 支持自定义内容)

  achievementDialog.addButton({
    text: "确定",
    onClick: () => achievementDialog.destroy(),
    color: TextColors.GREEN
  });

  achievementDialog.show();

  // 3 秒后自动关闭
  TimerStart(CreateTimer(), 3.0, false, () => {
    achievementDialog.destroy();
  });
}
```

### 4. 商店系统

```typescript
const shopDialog = Dialog.createCentered("商店", 500, 450);

const items = [
  { name: "生命药水", cost: 50 },
  { name: "魔法药水", cost: 50 },
  { name: "传送卷轴", cost: 100 },
  { name: "强化石", cost: 200 }
];

items.forEach((item, index) => {
  shopDialog.addButton({
    text: item.name + " (" + item.cost + " 金币)",
    onClick: () => {
      if (GetPlayerGold(player) >= item.cost) {
        AdjustPlayerGold(player, -item.cost);
        CreateItem(itemIds[index], x, y);
        print("购买了: " + item.name);
      } else {
        print("金币不足");
      }
    },
    color: TextColors.YELLOW
  });
});

shopDialog.addButton({
  text: "离开",
  onClick: () => shopDialog.hide(),
  color: TextColors.RED
});
```

### 5. 任务对话

```typescript
function showQuestDialog(questName: string, description: string): void {
  const questDialog = Dialog.createCentered("任务", 600, 400);
  
  questDialog.configure({
    titleColor: TextColors.CYAN
  });

  // TODO: 添加任务描述显示
  // (需要扩展 Dialog 支持多行文本内容)

  questDialog.addButton({
    text: "接受",
    onClick: () => {
      acceptQuest(questName);
      print("接受了任务: " + questName);
      questDialog.destroy();
    },
    color: TextColors.GREEN
  });

  questDialog.addButton({
    text: "拒绝",
    onClick: () => {
      print("拒绝了任务");
      questDialog.destroy();
    },
    color: TextColors.RED
  });

  questDialog.show();
}
```

---

## API 参考

### 构造函数

```typescript
new Dialog(title: string, width: number, height: number)
```

### 静态方法

| 方法 | 说明 |
|------|------|
| `Dialog.createCentered(title, width, height)` | 创建居中对话框 |
| `Dialog.createConfirm(title, message, onYes, onNo?)` | 创建确认对话框 |
| `Dialog.createChoice(title, options, onChoice)` | 创建选择对话框 |

### 实例方法

#### 生命周期

| 方法 | 说明 |
|------|------|
| `create()` | 创建对话框（必须调用） |
| `destroy()` | 销毁对话框并释放所有资源 |

#### 显示控制

| 方法 | 说明 |
|------|------|
| `show()` | 显示对话框 |
| `hide()` | 隐藏对话框 |
| `isVisible()` | 检查对话框是否可见 |

#### 按钮管理

| 方法 | 说明 |
|------|------|
| `addButton(config: DialogButtonConfig)` | 添加按钮 |
| `removeButton(index: number)` | 移除指定索引的按钮 |
| `clearButtons()` | 移除所有按钮 |
| `getButtons()` | 获取按钮数组 |

#### 样式配置

| 方法 | 说明 |
|------|------|
| `configure(config: DialogConfig)` | 配置对话框样式 |
| `setPosition(x: number, y: number)` | 设置对话框位置 |
| `setTitle(title: string)` | 设置标题文字 |

#### 获取组件

| 方法 | 说明 |
|------|------|
| `getPanel()` | 获取内部 Panel 组件 |
| `getButtons()` | 获取所有按钮组件 |

### 配置接口

#### DialogButtonConfig

```typescript
interface DialogButtonConfig {
  text: string;          // 按钮文字（必需）
  onClick: () => void;  // 点击回调（必需）
  color?: string;       // 文字颜色（可选）
}
```

#### DialogConfig

```typescript
interface DialogConfig {
  titleColor?: string;      // 标题颜色
  background?: string;      // 背景图片路径
  alpha?: number;          // 透明度 (0-255)
  buttonStartY?: number;   // 第一个按钮 Y 偏移
  buttonSpacing?: number;  // 按钮间距
  buttonHeight?: number;   // 按钮高度
  buttonWidthRatio?: number; // 按钮宽度比例 (0-1)
}
```

---

## 最佳实践

### 1. 使用工厂方法

对于常见场景，优先使用静态工厂方法：

```typescript
// ✓ 推荐
const dialog = Dialog.createConfirm("确认", "继续吗？", onYes);

// ✗ 不推荐
const dialog = new Dialog("确认", 500, 300);
dialog.create();
dialog.addButton({ text: "是", onClick: onYes });
dialog.addButton({ text: "否", onClick: () => dialog.hide() });
```

### 2. 记得调用 create()

使用构造函数创建时，必须调用 `create()`：

```typescript
const dialog = new Dialog("标题", 500, 300);
dialog.create(); // ← 必需！
```

### 3. 及时销毁

不再使用的对话框应该销毁：

```typescript
dialog.addButton({
  text: "确定",
  onClick: () => {
    // 处理完后销毁
    dialog.destroy();
  }
});
```

### 4. 使用颜色常量

使用 `TextColors` 常量而不是硬编码颜色：

```typescript
import { TextColors } from "./system/ui/component/Text";

dialog.addButton({
  text: "确定",
  color: TextColors.GREEN  // ✓ 推荐
});
```

### 5. 回调中处理状态

在按钮回调中执行游戏逻辑：

```typescript
dialog.addButton({
  text: "购买",
  onClick: () => {
    if (canPurchase()) {
      executePurchase();
      dialog.hide();
    } else {
      showErrorMessage("金币不足");
    }
  }
});
```

---

## 常见问题

### Q: 对话框没有显示？
A: 确保调用了 `create()` 和 `show()`：
```typescript
const dialog = new Dialog("标题", 500, 300);
dialog.create();  // ← 必需
dialog.show();    // ← 必需
```

### Q: 如何设置对话框位置？
A: 使用 `setPosition()` 方法：
```typescript
dialog.setPosition(0.4, 0.3); // 屏幕坐标 (0-1)
```

### Q: 如何更改按钮颜色？
A: 在 `addButton` 时指定 `color`：
```typescript
dialog.addButton({
  text: "确定",
  color: TextColors.GREEN
});
```

### Q: 如何动态更新标题？
A: 使用 `setTitle()` 方法：
```typescript
dialog.setTitle("新标题");
```

### Q: 如何在对话框中添加自定义内容？
A: 使用 `getPanel()` 获取内部 Panel，然后添加子组件：
```typescript
const panel = dialog.getPanel();
// 向 panel 添加自定义组件
// (需要扩展 Panel 的子组件管理功能)
```

---

## 参考链接

- [Panel 组件使用指南](./panel-usage.md)
- [Button 组件使用指南](./Button-Usage.md)
- [Text 组件使用指南](./Text-Usage.md)

---

**提示**: Dialog 组件是基于 Panel 和 Button 构建的高级组件。如需更复杂的自定义，可以直接使用 Panel 和 Button 组合实现。
