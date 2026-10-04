# FDF 按钮模板使用指南

本指南介绍如何使用FDF按钮模板系统来创建标准化的UI按钮。

## 📁 文件结构

```
maps/
└── resource/
    └── fdf/
        └── EricButtom.fdf      # FDF按钮模板定义

src/
├── system/ui/
│   └── FDFButton.ts            # 按钮创建工具类
└── examples/
    └── FDFButtonExample.ts     # 使用示例
```

## 🎨 可用的按钮模板

### 1. **StandardButtonTemplate** - 标准按钮
- **尺寸**: 0.100 x 0.036
- **特点**: 包含背景、边框、文本、热键显示
- **适用场景**: 通用按钮、菜单选项

### 2. **LargeButtonTemplate** - 大型按钮
- **尺寸**: 0.150 x 0.048
- **特点**: 更大的文本、更醒目的外观
- **适用场景**: 主菜单、重要操作

### 3. **SmallButtonTemplate** - 小型按钮
- **尺寸**: 0.070 x 0.024
- **特点**: 紧凑设计、节省空间
- **适用场景**: 对话框、工具栏

### 4. **IconButtonTemplate** - 图标按钮
- **尺寸**: 0.036 x 0.036（正方形）
- **特点**: 显示图标、无文本
- **适用场景**: 技能栏、物品栏

### 5. **ScriptButtonTemplate** - 脚本按钮
- **特点**: 轻量级、基础背景
- **适用场景**: 动态创建的简单按钮

## 🚀 快速开始

### 方式1: 使用FDFButtonBuilder工具类（推荐）

```typescript
import { FDFButtonBuilder } from '../system/ui/FDFButton';
import { FRAME_ALIGN_CENTER } from '@eiriksgata/wc3ts/*';

// 创建标准按钮
const button = FDFButtonBuilder.createButton(
    "MyButton",                    // 唯一标识符
    {
        text: "点击我",            // 按钮文本
        x: 0.4,                    // X坐标
        y: 0.5,                    // Y坐标
        anchor: FRAME_ALIGN_CENTER, // 对齐方式
        tooltip: "这是提示文本"    // 提示信息
    },
    {
        onClick: () => {
            print("按钮被点击了!");
        },
        onMouseEnter: () => {
            print("鼠标进入");
        },
        onMouseLeave: () => {
            print("鼠标离开");
        }
    }
);
```

### 方式2: 直接使用Frame创建

```typescript
import { Frame, FRAME_ALIGN_CENTER } from '@eiriksgata/wc3ts/*';

const parent = Frame.fromHandle(DzGetGameUI())!;

// 创建标准按钮
const button = Frame.createType(
    "GLUETEXTBUTTON",
    parent,
    0,
    "StandardButtonTemplate",
    "MyButton"
);

button?.setAbsPoint(FRAME_ALIGN_CENTER, 0.4, 0.5);
button?.setText("点击我");
```

## 📖 详细使用示例

### 示例1: 创建不同类型的按钮

```typescript
// 1. 标准按钮
const standardBtn = FDFButtonBuilder.createButton("StandardBtn", {
    text: "标准按钮",
    x: 0.4, y: 0.5
});

// 2. 大型按钮
const largeBtn = FDFButtonBuilder.createLargeButton("LargeBtn", {
    text: "大型按钮",
    x: 0.4, y: 0.4,
    hotkey: "Q"  // 显示热键
});

// 3. 小型按钮
const smallBtn = FDFButtonBuilder.createSmallButton("SmallBtn", {
    text: "小型",
    x: 0.4, y: 0.3
});

// 4. 图标按钮
const iconBtn = FDFButtonBuilder.createIconButton("IconBtn", {
    x: 0.5, y: 0.5,
    icon: "ReplaceableTextures\\CommandButtons\\BTNHeroArchMage.blp"
});
```

### 示例2: 按钮组管理

```typescript
import { ButtonGroup } from '../system/ui/FDFButton';

const buttonGroup = new ButtonGroup();

// 创建多个按钮并添加到组
for (let i = 0; i < 5; i++) {
    const button = FDFButtonBuilder.createButton(
        `Button${i}`,
        {
            text: `按钮 ${i + 1}`,
            x: 0.3 + (i * 0.12),
            y: 0.5
        }
    );
    buttonGroup.addButton(`btn${i}`, button);
}

// 批量操作
buttonGroup.showAll();      // 显示所有按钮
buttonGroup.hideAll();      // 隐藏所有按钮
buttonGroup.enableAll();    // 启用所有按钮
buttonGroup.disableAll();   // 禁用所有按钮
buttonGroup.destroyAll();   // 销毁所有按钮
```

### 示例3: 技能栏UI

```typescript
class SkillBar {
    private skillButtons: ButtonGroup = new ButtonGroup();

    createSkillBar() {
        const skills = [
            { icon: "BTNHeroArchMage.blp", hotkey: "Q", name: "火球术" },
            { icon: "BTNHeroPaladin.blp", hotkey: "W", name: "圣光" },
            { icon: "BTNHeroMountainKing.blp", hotkey: "E", name: "雷霆一击" },
            { icon: "BTNHeroBloodElfPrince.blp", hotkey: "R", name: "凤凰" }
        ];

        skills.forEach((skill, index) => {
            const button = FDFButtonBuilder.createIconButton(
                `Skill${index}`,
                {
                    x: 0.3 + (index * 0.04),
                    y: 0.2,
                    icon: `ReplaceableTextures\\CommandButtons\\${skill.icon}`,
                    hotkey: skill.hotkey,
                    tooltip: skill.name
                },
                {
                    onClick: () => this.useSkill(index)
                }
            );

            this.skillButtons.addButton(`skill${index}`, button);
        });
    }

    useSkill(index: number) {
        print(`使用技能 ${index + 1}`);
    }
}
```

### 示例4: 动态菜单系统

```typescript
class MenuSystem {
    private menuButtons: ButtonGroup = new ButtonGroup();

    createMainMenu() {
        const menuItems = [
            { text: "开始游戏", action: () => this.startGame() },
            { text: "载入存档", action: () => this.loadGame() },
            { text: "选项", action: () => this.showOptions() },
            { text: "退出", action: () => this.exitGame() }
        ];

        menuItems.forEach((item, index) => {
            const button = FDFButtonBuilder.createLargeButton(
                `Menu${index}`,
                {
                    text: item.text,
                    x: 0.4,
                    y: 0.5 - (index * 0.06),
                    anchor: FRAME_ALIGN_CENTER
                },
                {
                    onClick: item.action,
                    onMouseEnter: () => {
                        // 高亮效果
                        print(`鼠标悬停在: ${item.text}`);
                    }
                }
            );

            this.menuButtons.addButton(`menu${index}`, button);
        });
    }

    clearMenu() {
        this.menuButtons.destroyAll();
    }

    private startGame() { print("开始游戏"); }
    private loadGame() { print("载入游戏"); }
    private showOptions() { print("显示选项"); }
    private exitGame() { print("退出游戏"); }
}
```

## 🎯 ButtonConfig 配置参数

| 参数 | 类型 | 说明 | 默认值 |
|------|------|------|--------|
| `text` | string | 按钮文本 | - |
| `x` | number | X坐标（0-1） | - |
| `y` | number | Y坐标（0-1） | - |
| `width` | number | 按钮宽度 | 模板默认值 |
| `height` | number | 按钮高度 | 模板默认值 |
| `parent` | Frame | 父框架 | DzGetGameUI() |
| `anchor` | any | 对齐方式 | FRAME_ALIGN_CENTER |
| `icon` | string | 图标路径 | - |
| `hotkey` | string | 热键文本 | - |
| `tooltip` | string | 提示文本 | - |
| `visible` | boolean | 是否可见 | true |
| `enabled` | boolean | 是否启用 | true |

## 🎨 FDF模板结构说明

每个按钮模板包含以下层级：

```
StandardButtonTemplate (主框架)
├── ButtonBackdrop (背景层)
│   └── 背景纹理
├── ButtonBorder (边框层)
│   └── 边框纹理
├── ButtonText (文本层)
│   └── 按钮文字
└── ButtonHotkey (热键层)
    └── 热键文字
```

## 🔧 链式调用API

FDFButtonBuilder支持链式调用：

```typescript
const button = FDFButtonBuilder
    .createButton("MyButton", { x: 0.4, y: 0.5 })
    .setText("新文本")
    .setPosition(0.5, 0.5)
    .setSize(0.12, 0.04)
    .setEnabled(true)
    .setVisible(true)
    .bindEvents({
        onClick: () => print("clicked"),
        onMouseEnter: () => print("enter")
    });
```

## 📝 注意事项

1. **唯一标识符**: 每个按钮需要一个唯一的名称标识符
2. **坐标系统**: 使用0-1的相对坐标系统
3. **资源路径**: 图标路径需要是有效的WC3资源路径
4. **内存管理**: 不再使用的按钮应该调用`destroy()`释放资源
5. **FDF加载**: 确保EricButtom.fdf文件被正确加载到地图中

## 🌟 最佳实践

1. **使用ButtonGroup管理**: 对于多个相关按钮，使用ButtonGroup统一管理
2. **事件处理**: 合理使用onClick、onMouseEnter、onMouseLeave事件
3. **提示文本**: 为所有按钮添加tooltip，提升用户体验
4. **热键显示**: 对于有热键的按钮，显示热键提示
5. **状态管理**: 根据游戏状态动态启用/禁用按钮

## 🔍 故障排除

### 问题1: 按钮不显示
- 检查FDF文件是否正确加载
- 确认坐标范围在0-1之间
- 验证按钮的visible属性为true

### 问题2: 按钮事件不触发
- 确认按钮的enabled属性为true
- 检查事件绑定代码是否正确
- 验证FrameEventUtils是否正确导入

### 问题3: 图标不显示
- 确认图标路径正确
- 检查资源文件是否存在于地图中
- 验证使用的是IconButtonTemplate

## 📚 相关资源

- [WC3 Frame系统文档](链接)
- [FDF文件格式说明](链接)
- [魔兽UI设计指南](链接)
