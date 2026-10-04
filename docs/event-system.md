# 事件系统使用指南

本文档介绍事件系统的使用方法。事件系统提供了统一的事件订阅/发布机制，支持鼠标事件、键盘事件、游戏事件以及自定义事件。

## 架构概述

事件系统采用分层设计：

```
EventEmitter (基础类)
    │
    ├── EventBus (全局事件总线)
    │
    ├── MouseEventManager (鼠标事件)
    │
    ├── KeyboardEventManager (键盘事件)
    │
    └── GameEventManager (游戏事件)
```

**核心设计原则**：
1. 只创建一次原生 JAPI 事件，由 Lua 引擎负责分发
2. 支持订阅/取消订阅模式
3. 支持优先级和一次性订阅
4. 可扩展支持自定义事件

## 快速开始

### 导入

```typescript
import { 
  // 全局事件总线
  eventBus,
  
  // 鼠标事件
  mouseEvents, 
  MouseButton,
  
  // 键盘事件
  keyboardEvents,
  KeyCode,
  
  // 游戏事件
  gameEvents
} from "./system/event";
```

### 初始化

```typescript
// 在游戏开始时初始化事件管理器
function initEventSystem() {
  // 初始化鼠标事件（必须调用）
  mouseEvents.initialize();
  
  // 键盘事件可选择性初始化常用按键
  keyboardEvents.initialize(true); // true = 注册常用按键
  
  // 游戏事件在首次订阅时自动注册
  gameEvents.initialize();
}
```

## 鼠标事件

### 订阅鼠标事件

```typescript
// 订阅左键按下
const subId = mouseEvents.onMouseDown((data) => {
  print(`鼠标按下: 屏幕(${data.screenX}, ${data.screenY})`);
  print(`地形坐标: (${data.terrainX}, ${data.terrainY})`);
  print(`是否在UI上: ${data.isOverUI}`);
}, MouseButton.LEFT);

// 订阅右键抬起
mouseEvents.onMouseUp((data) => {
  print(`右键抬起`);
}, MouseButton.RIGHT);

// 订阅鼠标移动
mouseEvents.onMouseMove((data) => {
  // 注意：移动事件触发频繁，谨慎使用
});

// 订阅滚轮
mouseEvents.onMouseWheel((data) => {
  if (data.wheelDelta && data.wheelDelta > 0) {
    print("向上滚动");
  } else {
    print("向下滚动");
  }
});

// 取消订阅
mouseEvents.off(subId);
```

### 鼠标事件数据

```typescript
interface MouseEventData {
  button: MouseButton | number;  // 鼠标按键
  screenX: number;               // 屏幕 X 坐标
  screenY: number;               // 屏幕 Y 坐标
  terrainX: number;              // 地形 X 坐标
  terrainY: number;              // 地形 Y 坐标
  wheelDelta?: number;           // 滚轮增量
  isOverUI: boolean;             // 是否在 UI 上
  type: MouseEventType;          // 事件类型
}
```

## 键盘事件

### 订阅键盘事件

```typescript
// 订阅空格键按下
keyboardEvents.onKeyDown((data) => {
  print(`空格键按下`);
}, KeyCode.SPACE);

// 订阅 ESC 键
keyboardEvents.onKeyDown((data) => {
  print("ESC 被按下");
}, KeyCode.ESCAPE);

// 订阅所有已注册按键
keyboardEvents.onKeyDown((data) => {
  print(`按键代码: ${data.keyCode}`);
});

// 同时订阅按下和抬起
const [downId, upId] = keyboardEvents.onKey((data) => {
  if (data.type === "key:down") {
    print("按下");
  } else {
    print("抬起");
  }
}, KeyCode.F1);
```

### 常用按键代码

```typescript
const KeyCode = {
  ESCAPE: 0x1B,
  SPACE: 0x20,
  ENTER: 0x0D,
  TAB: 0x09,
  
  // 方向键
  LEFT: 0x25, UP: 0x26, RIGHT: 0x27, DOWN: 0x28,
  
  // 字母键 A-Z (0x41 - 0x5A)
  A: 0x41, B: 0x42, C: 0x43, /* ... */
  
  // 数字键 0-9 (0x30 - 0x39)
  KEY_0: 0x30, KEY_1: 0x31, /* ... */
  
  // 功能键 F1-F12 (0x70 - 0x7B)
  F1: 0x70, F2: 0x71, /* ... */
};
```

## 游戏事件

### 订阅游戏事件

```typescript
// 单位死亡
gameEvents.onUnitDeath((data) => {
  print(`${GetUnitName(data.unit)} 被 ${GetUnitName(data.killer)} 击杀`);
});

// 单位被攻击
gameEvents.onUnitAttacked((data) => {
  print(`${GetUnitName(data.unit)} 被攻击`);
});

// 技能释放（所有技能）
gameEvents.onSpellEffect((data) => {
  print(`技能 ${data.abilityId} 被释放`);
});

// 技能释放（指定技能）
const ABILITY_HEAL = FourCC('A000');
gameEvents.onSpellEffect((data) => {
  print("治疗技能被释放");
}, ABILITY_HEAL);

// 玩家聊天
gameEvents.onPlayerChat((data) => {
  print(`玩家 ${data.playerId}: ${data.message}`);
});
```

## 全局事件总线

用于跨模块/跨系统的事件通信。

### 自定义事件

```typescript
// 定义事件类型
interface QuestCompleteEvent {
  questId: string;
  playerId: number;
  rewards: number;
}

// 发布事件
eventBus.emit<QuestCompleteEvent>("quest:complete", {
  questId: "quest_001",
  playerId: 0,
  rewards: 1000,
});

// 订阅事件
eventBus.on<QuestCompleteEvent>("quest:complete", (data) => {
  print(`玩家 ${data.playerId} 完成了任务 ${data.questId}`);
  print(`获得奖励: ${data.rewards} 金币`);
});
```

### 订阅选项

```typescript
// 优先级（数值越大越先执行）
eventBus.on("event", handler, { priority: 100 });

// 只触发一次
eventBus.on("event", handler, { once: true });
// 或使用便捷方法
eventBus.once("event", handler);

// 标签（用于批量取消）
eventBus.on("event", handler, { tag: "ui-module" });
eventBus.offByTag("ui-module"); // 取消所有带此标签的订阅
```

## 创建自定义事件管理器

继承 `EventEmitter` 创建自己的事件管理器：

```typescript
import { EventEmitter, SubscribeOptions } from "./system/event";

// 自定义事件数据
interface DamageEventData {
  source: unit;
  target: unit;
  damage: number;
  damageType: string;
}

// 自定义事件管理器
class DamageEventManager extends EventEmitter {
  private static instance: DamageEventManager | undefined;
  
  private constructor() {
    super("DamageEventManager");
  }
  
  public static getInstance(): DamageEventManager {
    if (!DamageEventManager.instance) {
      DamageEventManager.instance = new DamageEventManager();
    }
    return DamageEventManager.instance;
  }
  
  // 便捷订阅方法
  public onDamage(
    handler: (data: DamageEventData) => void,
    options?: SubscribeOptions
  ): number {
    return this.on("damage", handler, options);
  }
  
  // 触发伤害事件（由伤害系统调用）
  public triggerDamage(data: DamageEventData): void {
    this.emit("damage", data);
  }
}

// 使用
const damageEvents = DamageEventManager.getInstance();
damageEvents.onDamage((data) => {
  print(`${GetUnitName(data.target)} 受到 ${data.damage} 点 ${data.damageType} 伤害`);
});
```

## 最佳实践

### 1. 及时取消订阅

```typescript
class MyComponent {
  private subscriptionIds: number[] = [];
  
  public init(): void {
    const id = mouseEvents.onMouseDown(this.handleClick.bind(this));
    this.subscriptionIds.push(id);
  }
  
  public destroy(): void {
    for (const id of this.subscriptionIds) {
      mouseEvents.off(id);
    }
    this.subscriptionIds = [];
  }
  
  private handleClick(data: MouseEventData): void {
    // ...
  }
}
```

### 2. 使用标签管理订阅

```typescript
// 注册时使用标签
mouseEvents.onMouseDown(handler1, MouseButton.LEFT, { tag: "ui-panel" });
mouseEvents.onMouseUp(handler2, MouseButton.LEFT, { tag: "ui-panel" });
keyboardEvents.onKeyDown(handler3, KeyCode.ESCAPE, { tag: "ui-panel" });

// 关闭面板时一次性取消所有相关订阅
mouseEvents.offByTag("ui-panel");
keyboardEvents.offByTag("ui-panel");
```

### 3. 避免频繁订阅/取消

```typescript
// 不好的做法 ❌
function update() {
  const id = mouseEvents.onMouseMove((data) => { /* ... */ });
  // 某些处理
  mouseEvents.off(id);
}

// 好的做法 ✓
let mouseMoveId: number | undefined;

function enableMouseTracking() {
  if (mouseMoveId !== undefined) return;
  mouseMoveId = mouseEvents.onMouseMove((data) => { /* ... */ });
}

function disableMouseTracking() {
  if (mouseMoveId !== undefined) {
    mouseEvents.off(mouseMoveId);
    mouseMoveId = undefined;
  }
}
```

### 4. 使用优先级控制执行顺序

```typescript
// UI 层优先处理（高优先级）
mouseEvents.onMouseDown((data) => {
  if (data.isOverUI) {
    // 处理 UI 点击
    // 可以通过某种方式阻止后续处理
  }
}, undefined, { priority: 100 });

// 游戏逻辑处理（低优先级）
mouseEvents.onMouseDown((data) => {
  // 处理游戏世界点击
}, undefined, { priority: 0 });
```

## API 参考

### EventEmitter

| 方法 | 描述 |
|------|------|
| `on(eventName, handler, options?)` | 订阅事件 |
| `once(eventName, handler, priority?)` | 订阅一次性事件 |
| `off(subscriptionId)` | 取消订阅 |
| `offAll(eventName)` | 取消指定事件的所有订阅 |
| `offByTag(tag)` | 取消指定标签的所有订阅 |
| `emit(eventName, data?)` | 发射事件 |
| `hasSubscribers(eventName)` | 检查是否有订阅者 |
| `getSubscriberCount(eventName?)` | 获取订阅者数量 |
| `clear()` | 清除所有订阅 |
| `destroy()` | 销毁发射器 |

### MouseEventManager

| 方法 | 描述 |
|------|------|
| `initialize()` | 初始化原生事件 |
| `onMouseDown(handler, button?, options?)` | 订阅鼠标按下 |
| `onMouseUp(handler, button?, options?)` | 订阅鼠标抬起 |
| `onMouseMove(handler, options?)` | 订阅鼠标移动 |
| `onMouseWheel(handler, options?)` | 订阅滚轮 |
| `getMousePosition()` | 获取当前鼠标位置 |
| `isMouseOverUI()` | 检查鼠标是否在 UI 上 |

### KeyboardEventManager

| 方法 | 描述 |
|------|------|
| `initialize(registerCommonKeys?)` | 初始化 |
| `registerKey(keyCode, isDown?)` | 注册按键事件 |
| `onKeyDown(handler, keyCode?, options?)` | 订阅按键按下 |
| `onKeyUp(handler, keyCode?, options?)` | 订阅按键抬起 |
| `onKey(handler, keyCode, options?)` | 订阅按下和抬起 |

### GameEventManager

| 方法 | 描述 |
|------|------|
| `onUnitDeath(handler, options?)` | 订阅单位死亡 |
| `onUnitAttacked(handler, options?)` | 订阅单位被攻击 |
| `onSpellEffect(handler, abilityId?, options?)` | 订阅技能释放 |
| `onPlayerChat(handler, options?)` | 订阅玩家聊天 |
