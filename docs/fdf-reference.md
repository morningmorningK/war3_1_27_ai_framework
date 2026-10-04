# 魔兽争霸3 FDF 文件参考文档

本文档整理自魔兽争霸3原生FDF文件，用于开发自定义UI时参考。

## 目录

- [1. 基本语法规范](#1-基本语法规范)
- [2. Frame类型详解](#2-frame类型详解)
- [3. 模板继承机制](#3-模板继承机制)
- [4. 定位和布局系统](#4-定位和布局系统)
- [5. 常用属性参考](#5-常用属性参考)
- [6. 实用代码模板](#6-实用代码模板)
- [7. 开发注意事项](#7-开发注意事项)

---

## 1. 基本语法规范

### 1.1 文件结构

```fdf
// 单行注释
/* 多行注释 */

// Frame定义基本结构
Frame "FRAME_TYPE" "FrameName" {
    属性1 值1,
    属性2 值2,
    
    // 嵌套子Frame
    Frame "CHILD_TYPE" "ChildName" {
        ...
    }
}
```

### 1.2 语法规则

- 使用大括号 `{}` 包围Frame内容
- 属性之间用逗号 `,` 分隔（最后一个属性可以不加逗号）
- 字符串值用双引号 `""` 包围
- 数值可以带后缀 `f`（浮点数）或不带
- 支持 `//` 单行注释和 `/* */` 多行注释

### 1.3 文件包含

```fdf
IncludeFile "UI\FrameDef\UI\EscMenuTemplates.fdf",
```

### 1.4 TOC文件

TOC（Table of Contents）文件定义FDF加载顺序：

```plaintext
UI\FrameDef\GlobalStrings.fdf
UI\FrameDef\Glue\StandardTemplates.fdf
UI\FrameDef\UI\ConsoleUI.fdf
```

---

## 2. Frame类型详解

### 2.1 两种Frame系统

| 系统 | Frame类型 | 定位方式 | 特点 |
|------|-----------|----------|------|
| SimpleFrame | `SIMPLEFRAME`, `SIMPLEBUTTON`, `String`, `Texture` | `Anchor` | 性能好，功能简单 |
| ComplexFrame | `FRAME`, `TEXTBUTTON`, `GLUETEXTBUTTON`, `TEXT`, `BACKDROP` | `SetPoint` | 功能丰富，支持交互 |

### 2.2 BACKDROP（背景/边框）

用于创建带边框和背景的矩形区域，支持九宫格拉伸：

```fdf
Frame "BACKDROP" "MyBackdropTemplate" {
    // 平铺背景
    BackdropTileBackground,
    // 背景图片
    BackdropBackground  "UI\Widgets\HeavyBorderBackGround.blp",
    // 边角标志 UL=左上, UR=右上, BL=左下, BR=右下, T=上, L=左, B=下, R=右
    BackdropCornerFlags "UL|UR|BL|BR|T|L|B|R",
    // 边角尺寸
    BackdropCornerSize  0.015,
    // 边角文件
    BackdropCornerFile  "UI\Widgets\HeavyBorderCorners.blp",
    // 各边文件
    BackdropLeftFile    "UI\Widgets\HeavyBorderLeft.blp",
    BackdropRightFile   "UI\Widgets\HeavyBorderRight.blp",
    BackdropTopFile     "UI\Widgets\HeavyBorderTop.blp",
    BackdropBottomFile  "UI\Widgets\HeavyBorderBottom.blp",
    // 统一边框文件
    BackdropEdgeFile    "UI\Widgets\Glues\GlueScreen-Button1-BackdropBorder.blp",
    // 背景尺寸
    BackdropBackgroundSize  0.032,
    // 背景内边距
    BackdropBackgroundInsets 0.004 0.004 0.004 0.004,
    // 混合模式
    BackdropBlendAll,
}
```

### 2.3 GLUETEXTBUTTON（文字按钮）

带文字的交互按钮，支持多种状态：

```fdf
Frame "GLUETEXTBUTTON" "MyButtonTemplate" {
    Height 0.031,
    Width 0.179,
    // 控制样式
    ControlStyle "AUTOTRACK|HIGHLIGHTONMOUSEOVER",
    // 按下时文字偏移
    ButtonPushedTextOffset -0.002f -0.003f,
    
    // 正常状态背景
    ControlBackdrop "ButtonBackdropTemplate",
    Frame "BACKDROP" "ButtonBackdropTemplate" {
        BackdropBackground "UI\Widgets\Glues\GlueScreen-Button1-BackdropBackground.blp",
        BackdropBlendAll,
    }
    
    // 按下状态背景
    ControlPushedBackdrop "ButtonPushedBackdropTemplate",
    Frame "BACKDROP" "ButtonPushedBackdropTemplate" {
        BackdropBackground "UI\Widgets\Glues\GlueScreen-Button1-BackdropBackground-Pushed.blp",
    }
    
    // 禁用状态背景
    ControlDisabledBackdrop "ButtonDisabledBackdropTemplate",
    Frame "BACKDROP" "ButtonDisabledBackdropTemplate" {
        BackdropBackground "UI\Widgets\Glues\GlueScreen-Button1-BackdropBackground-Disabled.blp",
    }
    
    // 鼠标悬停高亮
    ControlMouseOverHighlight "ButtonMouseOverHighlightTemplate",
    Frame "HIGHLIGHT" "ButtonMouseOverHighlightTemplate" {
        HighlightType "FILETEXTURE",
        HighlightAlphaFile "UI\Widgets\BattleNet\bnet-button01-highlight-mouse.blp",
        HighlightAlphaMode "ADD",
    }
    
    // 按钮文字
    ButtonText "ButtonTextName",
    Frame "TEXT" "ButtonTextName" {
        FrameFont "MasterFont", 0.013, "",
        FontJustificationH JUSTIFYCENTER,
        FontJustificationV JUSTIFYMIDDLE,
        FontColor 0.99 0.827 0.0705 1.0,
        Text "按钮文字",
    }
}
```

### 2.4 SIMPLEBUTTON（简单按钮）

轻量级按钮，性能更好：

```fdf
Frame "SIMPLEBUTTON" "MySimpleButton" {
    DecorateFileNames,
    Width 0.085,
    Height 0.022,
    ButtonPushedTextOffset 0.001 -0.001,
    // 各状态纹理
    NormalTexture "ButtonNormalBackground",
    PushedTexture "ButtonPushedBackground",
    DisabledTexture "ButtonDisabledBackground",
    UseHighlight "ButtonHighlight",
    
    // 各状态文字
    NormalText "ButtonTextTemplate" "按钮文字",
    DisabledText "ButtonDisabledTextTemplate" "按钮文字",
    HighlightText "ButtonHighlightTextTemplate" "按钮文字",
}
```

### 2.5 TEXT（复杂文本）

用于ComplexFrame系统的文本：

```fdf
Frame "TEXT" "MyTextTemplate" {
    DecorateFileNames,
    // 字体设置：字体名, 大小, 修饰
    FrameFont "MasterFont", 0.013, "",
    // 水平对齐: JUSTIFYLEFT, JUSTIFYCENTER, JUSTIFYRIGHT
    FontJustificationH JUSTIFYCENTER,
    // 垂直对齐: JUSTIFYTOP, JUSTIFYMIDDLE, JUSTIFYBOTTOM
    FontJustificationV JUSTIFYMIDDLE,
    // 对齐偏移
    FontJustificationOffset 0.0 -0.001,
    // 字体标志
    FontFlags "FIXEDSIZE",
    // 颜色 (R G B A)，范围 0.0-1.0
    FontColor 0.99 0.827 0.0705 1.0,
    FontHighlightColor 1.0 1.0 1.0 1.0,
    FontDisabledColor 0.5 0.5 0.5 1.0,
    // 阴影颜色
    FontShadowColor 0.0 0.0 0.0 0.9,
    // 阴影偏移
    FontShadowOffset 0.001 -0.001,
    // 文本内容
    Text "显示的文字",
}
```

### 2.6 String（简单文本）

用于SimpleFrame系统的文本：

```fdf
String "MyStringTemplate" {
    Font "MasterFont", 0.01,
    Height 0.01640625,
    TextLength 8,
    FontJustificationH JUSTIFYRIGHT,
    FontColor 1.0 1.0 1.0,
    FontShadowColor 0.0 0.0 0.0 0.9,
    FontShadowOffset 0.002 -0.002,
}
```

### 2.7 HIGHLIGHT（高亮效果）

```fdf
Frame "HIGHLIGHT" "MyHighlightTemplate" {
    HighlightType "FILETEXTURE",
    HighlightAlphaFile "UI\Widgets\BattleNet\bnet-button01-highlight-mouse.blp",
    HighlightAlphaMode "ADD",  // 或 "BLEND"
}
```

### 2.8 CHECKBOX / GLUECHECKBOX（复选框）

```fdf
Frame "GLUECHECKBOX" "MyCheckBoxTemplate" {
    Width 0.024,
    Height 0.024,
    
    ControlBackdrop "CheckBoxBackdrop",
    Frame "BACKDROP" "CheckBoxBackdrop" {
        BackdropBlendAll,
        BackdropBackground  "CheckBoxBackground",
    }
    
    // 选中状态高亮
    CheckBoxCheckHighlight "CheckHighlightTemplate",
    Frame "HIGHLIGHT" "CheckHighlightTemplate" {
        HighlightType "FILETEXTURE",
        HighlightAlphaFile "CheckBoxCheckHighlight",
        HighlightAlphaMode "BLEND",
    }
}
```

### 2.9 SLIDER（滑块）

```fdf
Frame "SLIDER" "MySliderTemplate" {
    Height 0.012,
    Width 0.139,
    SliderLayoutHorizontal,  // 水平布局
    // SliderLayoutVertical,  // 垂直布局
    
    ControlBackdrop "SliderBackdropTemplate",
    Frame "BACKDROP" "SliderBackdropTemplate" {
        BackdropBackground "SliderBackground",
    }
    
    SliderThumbButtonFrame "ThumbButtonTemplate",
    Frame "BUTTON" "ThumbButtonTemplate" {
        Width 0.016,
        Height 0.016,
        ControlBackdrop "ThumbButtonBackdropTemplate",
        Frame "BACKDROP" "ThumbButtonBackdropTemplate" {
            BackdropBlendAll,
            BackdropBackground  "SliderThumbButton",
        }
    }
}
```

### 2.10 SCROLLBAR（滚动条）

```fdf
Frame "SCROLLBAR" "MyScrollBarTemplate" {
    Width 0.0165,
    SliderLayoutVertical,
    
    ControlBackdrop "ScrollBarBackdrop",
    Frame "BACKDROP" "ScrollBarBackdrop" {
        BackdropBackground "ScrollBarBackground",
    }
    
    // 增加按钮（向上）
    ScrollBarIncButtonFrame "ScrollBarIncButton",
    Frame "BUTTON" "ScrollBarIncButton" {
        Width 0.015,
        Height 0.015,
        ControlBackdrop "ScrollBarIncButtonBackdrop",
        Frame "BACKDROP" "ScrollBarIncButtonBackdrop" {
            BackdropBackground  "UI\Widgets\Glues\GlueScreen-Scrollbar-UpArrow.blp",
        }
    }
    
    // 减少按钮（向下）
    ScrollBarDecButtonFrame "ScrollBarDecButton",
    Frame "BUTTON" "ScrollBarDecButton" {
        Width 0.015,
        Height 0.015,
        ControlBackdrop "ScrollBarDecButtonBackdrop",
        Frame "BACKDROP" "ScrollBarDecButtonBackdrop" {
            BackdropBackground  "UI\Widgets\Glues\GlueScreen-Scrollbar-DownArrow.blp",
        }
    }
    
    // 滑块
    SliderThumbButtonFrame "ThumbButton",
    Frame "BUTTON" "ThumbButton" {
        Width 0.015,
        Height 0.02,
    }
}
```

### 2.11 LISTBOX（列表框）

```fdf
Frame "LISTBOX" "MyListBoxTemplate" {
    ListBoxBorder 0.01,
    
    ControlBackdrop "ListBoxBackdropTemplate",
    Frame "BACKDROP" "ListBoxBackdropTemplate" {
        BackdropBackground "ListBoxBackground",
    }
    
    ListBoxScrollBar "ListBoxScrollBarTemplate",
    Frame "SCROLLBAR" "ListBoxScrollBarTemplate" INHERITS WITHCHILDREN "StandardScrollBarTemplate" {
    }
}
```

### 2.12 EDITBOX（输入框）

```fdf
Frame "EDITBOX" "MyEditBoxTemplate" {
    Height 0.04,
    EditBorderSize 0.009,
    EditCursorColor 1.0 1.0 1.0,
    
    ControlBackdrop "EditBoxBackdrop",
    Frame "BACKDROP" "EditBoxBackdrop" {
        BackdropBackground "EditBoxBackground",
        BackdropEdgeFile "EditBoxBorder",
    }
}
```

### 2.13 POPUPMENU（下拉菜单）

```fdf
Frame "POPUPMENU" "MyPopupMenuTemplate" {
    Width 0.111875,
    Height 0.01875,
    PopupButtonInset 0.01,
    
    ControlBackdrop "PopupMenuBackdropTemplate",
    Frame "BACKDROP" "PopupMenuBackdropTemplate" {
        BackdropBackground "PopupMenuBackground",
    }
    
    PopupTitleFrame "PopupMenuTitle",
    Frame "TEXTBUTTON" "PopupMenuTitle" {
        // 标题按钮配置
    }
    
    PopupArrowFrame "PopupMenuArrow",
    Frame "BUTTON" "PopupMenuArrow" {
        // 箭头按钮配置
    }
    
    PopupMenuFrame "PopupMenuMenu",
    Frame "MENU" "PopupMenuMenu" {
        // 菜单内容配置
    }
}
```

### 2.14 MENU（菜单）

```fdf
Frame "MENU" "MyMenuTemplate" {
    Height 0.06,
    DecorateFileNames,
    FrameFont "MasterFont", 0.011, "",
    MenuTextHighlightColor 0.99 0.827 0.0705 1.0,
    MenuItemHeight 0.014,
    MenuBorder 0.009,
    
    ControlBackdrop "MenuBackdropTemplate",
    Frame "BACKDROP" "MenuBackdropTemplate" {
        BackdropBackground "MenuBackground",
    }
}
```

### 2.15 DIALOG（对话框）

```fdf
Frame "DIALOG" "MyDialogTemplate" {
    Width 0.60,
    Height 0.40,
    DecorateFileNames,
    FrameFont "MasterFont", 0.015, "",
    
    DialogBackdrop "DialogBackdropTemplate",
    Frame "BACKDROP" "DialogBackdropTemplate" {
        BackdropBackground "DialogBackground",
    }
}
```

### 2.16 SIMPLEFRAME（简单框架）

```fdf
Frame "SIMPLEFRAME" "MySimpleFrame" {
    DecorateFileNames,
    
    Texture {
        File "MyTexture",
        Width 0.256,
        Height 0.032,
        TexCoord 0, 1, 0, 0.125,  // 纹理坐标
        AlphaMode "ALPHAKEY",
        Anchor TOPLEFT, 0, 0,
    }
    
    String "MyText" INHERITS "MyTextTemplate" {
        Anchor TOPRIGHT, -0.26, -0.003,
        FontJustificationH JUSTIFYRIGHT,
    }
}
```

### 2.17 Texture（纹理）

```fdf
Texture "MyTextureTemplate" {
    Width 0.01640625,
    Height 0.01640625,
    File "GoldIcon",
    TexCoord 0.0, 0.6640625, 0.0, 0.171875,  // 左, 右, 上, 下
    AlphaMode "ALPHAKEY",  // 或 "ADD", "BLEND"
    Anchor TOPLEFT, 0.0, 0.0,
}
```

### 2.18 TEXTAREA（文本区域）

```fdf
Frame "TEXTAREA" "MyTextAreaTemplate" {
    TextAreaLineHeight 0.015,
    TextAreaLineGap 0.0,
    TextAreaInset 0.01,
    TextAreaMaxLines 32,
    
    TextAreaScrollBar "TextAreaScrollBarTemplate",
    Frame "SCROLLBAR" "TextAreaScrollBarTemplate" INHERITS WITHCHILDREN "StandardScrollBarTemplate" {
    }
    
    ControlBackdrop "TextAreaBackdropTemplate",
    Frame "BACKDROP" "TextAreaBackdropTemplate" {
        BackdropBackground "TextAreaBackground",
    }
}
```

### 2.19 SIMPLESTATUSBAR（简单状态条）

```fdf
Frame "SIMPLESTATUSBAR" "MyStatusBar" {
    SetPoint TOP, "ParentFrame", BOTTOM, 0.0, -0.0015,
    Height 0.015625,
}
```

---

## 3. 模板继承机制

### 3.1 INHERITS（只继承属性）

只继承父模板的属性，不继承子Frame：

```fdf
Frame "BACKDROP" "MyBackdrop" INHERITS "StandardButtonBackdropTemplate" {
    // 可以覆盖父模板的属性
    Width 0.2,
}
```

### 3.2 INHERITS WITHCHILDREN（继承包含子元素）

同时继承父模板的属性和所有子Frame：

```fdf
Frame "GLUETEXTBUTTON" "MyButton" INHERITS WITHCHILDREN "EscMenuButtonTemplate" {
    Width 0.15,
    // 子Frame也会被继承
}
```

### 3.3 模板组织模式

```fdf
// 1. 先定义基础模板
Frame "BACKDROP" "BaseButtonBackdrop" {
    BackdropTileBackground,
    BackdropBackground "ButtonBackground.blp",
    BackdropBlendAll,
}

// 2. 定义按钮模板，使用基础模板
Frame "GLUETEXTBUTTON" "BaseButtonTemplate" {
    Width 0.12,
    Height 0.03,
    
    ControlBackdrop "ButtonBackdrop",
    Frame "BACKDROP" "ButtonBackdrop" INHERITS "BaseButtonBackdrop" {
    }
}

// 3. 实际使用时继承按钮模板
Frame "GLUETEXTBUTTON" "ConfirmButton" INHERITS WITHCHILDREN "BaseButtonTemplate" {
    Width 0.15,
    SetPoint CENTER, "MyDialog", CENTER, 0, -0.05,
    
    ButtonText "ConfirmButtonText",
    Frame "TEXT" "ConfirmButtonText" {
        Text "确定",
    }
}
```

### 3.4 常用官方模板

| 模板名 | 用途 |
|--------|------|
| `EscMenuButtonTemplate` | ESC菜单风格按钮 |
| `StandardButtonTemplate` | 标准按钮风格 |
| `BattleNetButtonTemplate` | 战网风格按钮 |
| `StandardHeavyBackdropTemplate` | 重型边框背景 |
| `StandardLightBackdropTemplate` | 轻型边框背景 |
| `StandardScrollBarTemplate` | 标准滚动条 |
| `StandardListBoxTemplate` | 标准列表框 |
| `StandardEditBoxTemplate` | 标准输入框 |

---

## 4. 定位和布局系统

### 4.1 Anchor（SimpleFrame定位）

用于SimpleFrame系统，相对于父Frame定位：

```fdf
// 锚点类型, x偏移, y偏移
Anchor TOPLEFT, 0, 0,
Anchor TOP, 0, 0,
Anchor TOPRIGHT, -0.032, 0,
Anchor LEFT, 0, 0,
Anchor CENTER, 0, 0,
Anchor RIGHT, 0, 0,
Anchor BOTTOMLEFT, 0, 0,
Anchor BOTTOM, 0, 0,
Anchor BOTTOMRIGHT, 0, 0,
```

### 4.2 SetPoint（ComplexFrame定位）

用于ComplexFrame系统，可以相对于任意Frame定位：

```fdf
// SetPoint 自己的锚点, 相对Frame, 相对Frame的锚点, x偏移, y偏移
SetPoint TOPLEFT, "ParentFrame", TOPLEFT, 0.02, -0.015,
SetPoint BOTTOMRIGHT, "ParentFrame", BOTTOMRIGHT, 0.0, 0.001,
SetPoint TOP, "OtherFrame", BOTTOM, 0.0, -0.007,
SetPoint LEFT, "OtherFrame", RIGHT, 0.005, 0.0,
SetPoint CENTER, "ParentFrame", CENTER, 0.0, 0.0,
```

### 4.3 SetAllPoints

使Frame大小和位置与父Frame完全相同：

```fdf
SetAllPoints,
```

### 4.4 锚点常量

| 常量 | 位置 |
|------|------|
| `TOPLEFT` | 左上角 |
| `TOP` | 顶部中间 |
| `TOPRIGHT` | 右上角 |
| `LEFT` | 左边中间 |
| `CENTER` | 中心 |
| `RIGHT` | 右边中间 |
| `BOTTOMLEFT` | 左下角 |
| `BOTTOM` | 底部中间 |
| `BOTTOMRIGHT` | 右下角 |

### 4.5 坐标系统

- 魔兽3的UI坐标系统使用相对坐标
- 屏幕尺寸约为 **0.8 x 0.6**（4:3比例）
- 原点在**左下角**，X向右增加，Y向上增加
- 所有尺寸和位置值都是屏幕的比例值

---

## 5. 常用属性参考

### 5.1 尺寸属性

```fdf
Width 0.12,
Height 0.03,
```

### 5.2 控制样式

```fdf
ControlStyle "AUTOTRACK|HIGHLIGHTONMOUSEOVER|HIGHLIGHTONFOCUS",
```

| 标志 | 作用 |
|------|------|
| `AUTOTRACK` | 自动跟踪 |
| `HIGHLIGHTONMOUSEOVER` | 鼠标悬停高亮 |
| `HIGHLIGHTONFOCUS` | 聚焦时高亮 |

### 5.3 颜色格式

```fdf
// RGBA格式，范围 0.0-1.0
FontColor 0.99 0.827 0.0705 1.0,
FontShadowColor 0.0 0.0 0.0 0.9,
```

### 5.4 文本中的颜色代码

```fdf
"|Cfffed312金色文字|R"
"|Cff00ff00绿色文字|R"
"|Cffff0000红色文字|R"
"|CFFFFFFFF白色文字|R"
```

格式：`|Caarrggbb` 其中 aa=Alpha, rr=Red, gg=Green, bb=Blue

### 5.5 字体对齐

```fdf
// 水平对齐
FontJustificationH JUSTIFYLEFT,    // 左对齐
FontJustificationH JUSTIFYCENTER,  // 居中
FontJustificationH JUSTIFYRIGHT,   // 右对齐

// 垂直对齐
FontJustificationV JUSTIFYTOP,     // 顶部对齐
FontJustificationV JUSTIFYMIDDLE,  // 垂直居中
FontJustificationV JUSTIFYBOTTOM,  // 底部对齐
```

### 5.6 Alpha混合模式

```fdf
AlphaMode "ALPHAKEY",  // 透明键
AlphaMode "ADD",       // 加法混合
AlphaMode "BLEND",     // 混合
```

### 5.7 DecorateFileNames

启用后可以使用资源别名而非完整路径：

```fdf
DecorateFileNames,
BackdropBackground "EscMenuEditBoxBackground",  // 使用别名
```

### 5.8 UseActiveContext

使Frame响应游戏状态：

```fdf
UseActiveContext,
```

---

## 6. 实用代码模板

### 6.1 自定义按钮（带完整状态）

```fdf
// 按钮背景模板
Frame "BACKDROP" "CustomButtonBackdropTemplate" {
    BackdropTileBackground,
    BackdropBackground  "war3mapImported\\ButtonNormal.blp",
    BackdropCornerFlags "UL|UR|BL|BR|T|L|B|R",
    BackdropCornerSize  0.012,
    BackdropEdgeFile    "war3mapImported\\ButtonBorder.blp",
    BackdropBlendAll,
}

Frame "BACKDROP" "CustomButtonPushedBackdropTemplate" {
    BackdropTileBackground,
    BackdropBackground  "war3mapImported\\ButtonPushed.blp",
    BackdropBlendAll,
}

Frame "BACKDROP" "CustomButtonDisabledBackdropTemplate" {
    BackdropTileBackground,
    BackdropBackground  "war3mapImported\\ButtonDisabled.blp",
    BackdropBlendAll,
}

// 按钮模板
Frame "GLUETEXTBUTTON" "CustomButtonTemplate" {
    Width 0.12,
    Height 0.03,
    ControlStyle "AUTOTRACK|HIGHLIGHTONMOUSEOVER",
    ButtonPushedTextOffset 0.001 -0.001,
    
    ControlBackdrop "CustomButtonBackdrop",
    Frame "BACKDROP" "CustomButtonBackdrop" INHERITS "CustomButtonBackdropTemplate" {
    }
    
    ControlPushedBackdrop "CustomButtonPushedBackdrop",
    Frame "BACKDROP" "CustomButtonPushedBackdrop" INHERITS "CustomButtonPushedBackdropTemplate" {
    }
    
    ControlDisabledBackdrop "CustomButtonDisabledBackdrop",
    Frame "BACKDROP" "CustomButtonDisabledBackdrop" INHERITS "CustomButtonDisabledBackdropTemplate" {
    }
    
    ControlMouseOverHighlight "CustomButtonHighlight",
    Frame "HIGHLIGHT" "CustomButtonHighlight" {
        HighlightType "FILETEXTURE",
        HighlightAlphaFile "war3mapImported\\ButtonHighlight.blp",
        HighlightAlphaMode "ADD",
    }
    
    ButtonText "CustomButtonText",
    Frame "TEXT" "CustomButtonText" {
        DecorateFileNames,
        FrameFont "MasterFont", 0.011, "",
        FontJustificationH JUSTIFYCENTER,
        FontJustificationV JUSTIFYMIDDLE,
        FontColor 1.0 1.0 1.0 1.0,
        FontHighlightColor 1.0 0.9 0.0 1.0,
        FontDisabledColor 0.5 0.5 0.5 1.0,
        FontShadowColor 0.0 0.0 0.0 0.9,
        FontShadowOffset 0.001 -0.001,
    }
}
```

### 6.2 自定义面板

```fdf
Frame "FRAME" "CustomPanel" {
    Width 0.25,
    Height 0.15,
    
    // 面板背景
    Frame "BACKDROP" "CustomPanelBackdrop" {
        SetAllPoints,
        DecorateFileNames,
        BackdropTileBackground,
        BackdropBackground  "EscMenuEditBoxBackground",
        BackdropCornerFlags "UL|UR|BL|BR|T|L|B|R",
        BackdropCornerSize  0.0125,
        BackdropEdgeFile    "EscMenuEditBoxBorder",
        BackdropBlendAll,
    }
    
    // 面板标题
    Frame "TEXT" "CustomPanelTitle" {
        SetPoint TOP, "CustomPanel", TOP, 0.0, -0.02,
        Width 0.2,
        DecorateFileNames,
        FrameFont "MasterFont", 0.015, "",
        FontJustificationH JUSTIFYCENTER,
        FontColor 0.99 0.827 0.0705 1.0,
        FontShadowColor 0.0 0.0 0.0 0.9,
        FontShadowOffset 0.001 -0.001,
        Text "面板标题",
    }
    
    // 关闭按钮
    Frame "GLUETEXTBUTTON" "CustomPanelCloseButton" INHERITS WITHCHILDREN "EscMenuButtonTemplate" {
        Width 0.08,
        Height 0.025,
        SetPoint TOPRIGHT, "CustomPanel", TOPRIGHT, -0.01, -0.01,
        
        ButtonText "CustomPanelCloseButtonText",
        Frame "TEXT" "CustomPanelCloseButtonText" INHERITS "EscMenuButtonTextTemplate" {
            Text "关闭",
        }
    }
    
    // 确定按钮
    Frame "GLUETEXTBUTTON" "CustomPanelOKButton" INHERITS WITHCHILDREN "EscMenuButtonTemplate" {
        Width 0.1,
        Height 0.025,
        SetPoint BOTTOM, "CustomPanel", BOTTOM, 0.0, 0.02,
        
        ButtonText "CustomPanelOKButtonText",
        Frame "TEXT" "CustomPanelOKButtonText" INHERITS "EscMenuButtonTextTemplate" {
            Text "确定",
        }
    }
}
```

### 6.3 简单资源条

```fdf
Texture "ResourceIconTemplate" {
    Width 0.016,
    Height 0.016,
}

String "ResourceTextTemplate" {
    Font "MasterFont", 0.01,
    FontColor 1.0 1.0 1.0,
    FontShadowColor 0.0 0.0 0.0 0.9,
    FontShadowOffset 0.001 -0.001,
}

Frame "SIMPLEFRAME" "CustomResourceBar" {
    DecorateFileNames,
    Width 0.2,
    Height 0.025,
    
    // 金币图标
    Texture INHERITS "ResourceIconTemplate" {
        Anchor TOPLEFT, 0.0, -0.004,
        File "GoldIcon",
    }
    
    // 金币数量
    String "GoldText" INHERITS "ResourceTextTemplate" {
        Anchor TOPLEFT, 0.02, -0.004,
        TextLength 8,
    }
    
    // 木材图标
    Texture INHERITS "ResourceIconTemplate" {
        Anchor TOPLEFT, 0.08, -0.004,
        File "LumberIcon",
    }
    
    // 木材数量
    String "LumberText" INHERITS "ResourceTextTemplate" {
        Anchor TOPLEFT, 0.1, -0.004,
        TextLength 8,
    }
}
```

### 6.4 带滚动条的文本区域

```fdf
Frame "FRAME" "ScrollableTextPanel" {
    Width 0.3,
    Height 0.2,
    
    Frame "BACKDROP" "ScrollableTextPanelBackdrop" {
        SetAllPoints,
        BackdropBackground "war3mapImported\\PanelBackground.blp",
        BackdropBlendAll,
    }
    
    Frame "TEXTAREA" "ScrollableTextArea" INHERITS WITHCHILDREN "BattleNetTextAreaTemplate" {
        SetPoint TOPLEFT, "ScrollableTextPanel", TOPLEFT, 0.01, -0.01,
        SetPoint BOTTOMRIGHT, "ScrollableTextPanel", BOTTOMRIGHT, -0.01, 0.01,
        TextAreaLineHeight 0.012,
        TextAreaMaxLines 50,
    }
}
```

---

## 7. 开发注意事项

### 7.1 Frame名称唯一性

同一TOC中的Frame名称必须唯一，否则会导致冲突。建议使用前缀命名：

```fdf
Frame "GLUETEXTBUTTON" "MyMod_MainMenuButton" {
    // ...
}
```

### 7.2 加载顺序

模板必须在使用之前定义。在TOC文件中确保模板文件先于使用它的文件加载。

### 7.3 路径分隔符

FDF中使用**反斜杠** `\` 作为路径分隔符：

```fdf
BackdropBackground "UI\Widgets\MyBackground.blp",
BackdropBackground "war3mapImported\MyTexture.blp",
```

### 7.4 资源路径

- 使用 `war3mapImported\` 前缀引用地图内导入的资源
- 可以使用官方资源的完整路径

### 7.5 字体

使用预定义字体名：

```fdf
FrameFont "MasterFont", 0.012, "",
Font "MasterFont", 0.01,
```

### 7.6 调试技巧

1. 使用明显的背景颜色测试Frame位置和大小
2. 先确保Frame可见，再调整样式
3. 注意检查父Frame是否正确设置

### 7.7 性能建议

1. 优先使用SimpleFrame系统（`SIMPLEFRAME`, `SIMPLEBUTTON`）
2. 避免创建过多嵌套的Frame
3. 及时销毁不需要的Frame

---

## 8. 字符串列表（StringList）

用于定义本地化字符串：

```fdf
StringList {
    OK                  "确定",
    CANCEL              "取消",
    COLON_DAMAGE        "伤害：",
    KEY_MENU            "菜单 (|Cfffed312F10|R)",
    // 支持格式化
    PLAYER_DEFEATED     "%s被打败了。",
}
```

---

## 9. TypeScript 中使用 FDF

在本项目中使用 TypeScript 创建基于 FDF 模板的 Frame：

```typescript
import { Frame, Trigger } from "@eiriksgata/wc3ts";

// 加载 TOC 文件
BlzLoadTOCFile("war3mapImported\\MyFrameDef.toc");

// 假设 FDF 中定义了 "CustomButtonTemplate"
const button = BlzCreateFrame("CustomButtonTemplate", BlzGetOriginFrame(ORIGIN_FRAME_GAME_UI, 0), 0, 0);
BlzFrameSetAbsPoint(button, FRAMEPOINT_CENTER, 0.4, 0.3);
BlzFrameSetText(BlzFrameGetChild(button, 0), "点击我");

// 设置点击事件
const trigger = CreateTrigger();
BlzTriggerRegisterFrameEvent(trigger, button, FRAMEEVENT_CONTROL_CLICK);
TriggerAddAction(trigger, () => {
    print("按钮被点击了！");
});
```

### 9.1 常用 Frame API

```typescript
// 创建 Frame
BlzCreateFrame(name: string, owner: framehandle, priority: number, createContext: number): framehandle
BlzCreateSimpleFrame(name: string, owner: framehandle, createContext: number): framehandle
BlzCreateFrameByType(typeName: string, name: string, owner: framehandle, inherits: string, createContext: number): framehandle

// 定位
BlzFrameSetAbsPoint(frame: framehandle, point: framepointtype, x: number, y: number): void
BlzFrameSetPoint(frame: framehandle, point: framepointtype, relative: framehandle, relativePoint: framepointtype, x: number, y: number): void
BlzFrameSetAllPoints(frame: framehandle, relative: framehandle): void

// 尺寸
BlzFrameSetSize(frame: framehandle, width: number, height: number): void

// 可见性
BlzFrameSetVisible(frame: framehandle, visible: boolean): void

// 文本
BlzFrameSetText(frame: framehandle, text: string): void

// 事件
BlzTriggerRegisterFrameEvent(trigger: trigger, frame: framehandle, eventId: frameeventtype): event
```

---

## 参考资源

- 原生FDF文件位置：`mpq/UI/FrameDef/`
- 模板文件：`Glue/StandardTemplates.fdf`, `Glue/BattleNetTemplates.fdf`
- UI控件文件：`UI/` 目录下的各个fdf文件
