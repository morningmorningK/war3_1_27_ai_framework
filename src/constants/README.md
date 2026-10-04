# 常量管理规范

本项目采用模块化的常量管理方式，将不同类型的常量按功能分类组织。

## 目录结构

```
src/constants/
├── index.ts              # 统一导出入口
├── frame/                # Frame UI相关常量
│   ├── index.ts         # Frame模块导出入口
│   ├── events.ts        # Frame事件常量
│   ├── types.ts         # Frame类型定义
│   └── utils.ts         # Frame工具类
├── game/                 # 游戏逻辑相关常量
│   ├── units.ts         # 单位相关常量
│   ├── items.ts         # 物品相关常量（待添加）
│   ├── abilities.ts     # 技能相关常量（待添加）
│   └── players.ts       # 玩家相关常量（待添加）
├── ui/                   # UI界面相关常量
│   ├── colors.ts        # 颜色常量
│   ├── positions.ts     # 位置常量（待添加）
│   └── sizes.ts         # 尺寸常量（待添加）
└── system/               # 系统相关常量（待添加）
    ├── timers.ts        # 计时器常量
    └── events.ts        # 系统事件常量
```

## 使用方式

### 1. 直接从总入口导入（推荐）

```typescript
import { 
  FRAMEEVENT_CONTROL_CLICK, 
  FrameEventUtils,
  COLOR_WHITE,
  UNIT_PEASANT 
} from '@/constants';

// 使用Frame事件工具类
FrameEventUtils.bindClickEvent(frame, () => {
  print('按钮被点击');
});
```

### 2. 按命名空间导入

```typescript
import { FrameConstants, UIConstants } from '@/constants';

// 使用命名空间
const eventType = FrameConstants.FRAMEEVENT_CONTROL_CLICK;
const color = UIConstants.COLOR_WHITE;
```

### 3. 从特定模块导入

```typescript
import { FRAMEEVENT_CONTROL_CLICK, FrameEventUtils } from '@/constants/frame';
import { COLOR_WHITE, ColorUtils } from '@/constants/ui/colors';
import { UNIT_PEASANT, HERO_PALADIN } from '@/constants/game/units';
```

## 添加新常量的规范

### 1. 确定常量类型和归属
- **Frame相关**: 放在 `constants/frame/` 目录下
- **游戏逻辑相关**: 放在 `constants/game/` 目录下
- **UI界面相关**: 放在 `constants/ui/` 目录下
- **系统相关**: 放在 `constants/system/` 目录下

### 2. 常量命名规范
- 使用 `UPPER_SNAKE_CASE` 命名
- 添加有意义的注释
- 相关常量要分组

```typescript
/**
 * Frame事件常量
 */
export const FRAMEEVENT_CONTROL_CLICK = 1;
export const FRAMEEVENT_MOUSE_ENTER = 2;

/**
 * 玩家颜色常量
 */
export const PLAYER_COLOR_RED = "#FF0303";
export const PLAYER_COLOR_BLUE = "#0042FF";
```

### 3. 添加工具类
为复杂的常量组提供工具类：

```typescript
export class ColorUtils {
  static rgbToHex(r: number, g: number, b: number): string {
    // 实现代码
  }
}
```

### 4. 更新导出文件
在对应的 `index.ts` 文件中添加导出：

```typescript
// constants/frame/index.ts
export * from './events';
export * from './types';
export * from './utils';
```

```typescript
// constants/index.ts
export * from './frame';
export * from './game/units';
```

## 迁移指南

### 从旧的config/Frame.ts迁移到新结构

**旧的导入方式：**
```typescript
import { FRAMEEVENT_CONTROL_CLICK, FrameEventUtils } from '../../config/Frame';
```

**新的导入方式：**
```typescript
import { FRAMEEVENT_CONTROL_CLICK, FrameEventUtils } from '../../constants/frame';
// 或者
import { FRAMEEVENT_CONTROL_CLICK, FrameEventUtils } from '../../constants';
```

## 优势

1. **模块化管理**: 常量按功能分类，易于查找和维护
2. **类型安全**: 使用TypeScript类型定义，提供更好的开发体验
3. **统一导入**: 支持多种导入方式，灵活使用
4. **易于扩展**: 新常量可以轻松添加到对应模块
5. **工具类支持**: 为常量提供相关的工具函数

## 注意事项

1. 所有常量都应该有明确的类型定义
2. 复杂的常量组应该提供工具类
3. 保持目录结构的一致性
4. 及时更新导出文件
5. 添加必要的文档注释