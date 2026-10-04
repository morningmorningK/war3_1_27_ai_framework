# 热更新系统使用指南

## 🎯 系统概述

热更新系统已成功实现，支持在游戏运行时自动重新加载修改的 TypeScript/Lua 模块，无需重启游戏即可看到代码修改效果。

## 🏗️ 系统架构

### 外部监听器 (`scripts/dev.ts`)
- 使用 `tstl --watch` 监听 TypeScript 文件变化
- 自动编译变更的文件到 `dist/src/` 目录
- 分析最近修改的文件（5秒内）
- 生成热更新通知文件 `dist/hot-reload.json`

### 游戏内管理器 (`src/system/HotReload.ts`)
- 每 0.5 秒轮询检查热更新通知文件
- 解析 JSON 通知内容
- 清除模块缓存并重新加载指定模块
- 调用模块的热更新钩子函数

### 通知文件格式 (`dist/hot-reload.json`)
```json
{
  "timestamp": 1760405976703,
  "action": "reload", 
  "modules": [
    "src.utils.helper",
    "src.system.actor"
  ],
  "processed": false
}
```

## 🚀 使用方法

### 1. 启动开发模式
```bash
yarn dev
```

### 2. 修改代码
修改任何 `src/` 目录下的 TypeScript 文件，系统会：
1. 自动检测文件变化
2. 编译到 Lua
3. 生成热更新通知
4. 游戏内自动重新加载相关模块

### 3. 查看效果
- 代码修改会立即在游戏中生效
- 控制台会显示热更新日志
- 无需重启游戏或重新加载地图

## 📋 模块热更新支持

### 自动支持
所有模块在热更新时会：
1. 清除旧的模块缓存
2. 重新 `require` 模块
3. 如果模块导出了 `initialize()` 函数，会自动调用
4. 如果模块导出了 `onHotReload()` 函数，会自动调用

### 推荐方式：自注册模块（无需手动添加路径映射）

在模块中注册时提供 `modulePath`，热重载系统会自动识别：

```typescript
// 示例：src/examples/MyModule.ts
import { ModuleManager } from "../system/ModuleManager";

class MyModule {
  private resources: any[] = [];

  public initialize(): void {
    print("MyModule initialized");
    // 创建资源...
  }

  public cleanup(): void {
    // 销毁所有资源
    for (const res of this.resources) {
      res.destroy();
    }
    this.resources = [];
  }

  public static onHotReload(): void {
    print("MyModule hot reloaded!");
  }
}

// 模块实例
let instance: MyModule | null = null;

// 注册模块 - 关键：指定 modulePath
ModuleManager.getInstance().registerModule("MyModule", MyModule, {
  // ⭐ 关键：指定模块路径，格式为 "src.目录.文件名"（不含.ts）
  modulePath: "src.examples.MyModule",
  initialize: () => {
    if (!instance) {
      instance = new MyModule();
    }
    instance.initialize();
  },
  cleanup: () => {
    if (instance) {
      instance.cleanup();
    }
  },
  onHotReload: () => {
    MyModule.onHotReload();
  },
  dependencies: []
});

export { MyModule };
```

### modulePath 格式说明

| 文件路径 | modulePath |
|---------|------------|
| `src/examples/TemplateUi.ts` | `"src.examples.TemplateUi"` |
| `src/system/ui/UnitBlood.ts` | `"src.system.ui.UnitBlood"` |
| `src/utils/CameraControl.ts` | `"src.utils.CameraControl"` |

**规则**：将文件路径中的 `/` 替换为 `.`，去掉 `.ts` 后缀。

### 旧方式：手动添加路径映射（不推荐）

如果不提供 `modulePath`，需要在 `ModuleManager.ts` 的 `pathMappings` 中手动添加：

```typescript
// ModuleManager.ts 中的 getModulePathFromName 方法
const pathMappings: { [key: string]: string } = {
  'TemplateUI': 'src.examples.TemplateUi',
  'MyModule': 'src.examples.MyModule',  // 需要手动添加
  // ...
};
```

## 🔧 配置选项

### 热更新管理器配置
```typescript
// 在 main.ts 中配置
const hotReload = HotReload.getInstance();

// 修改检查间隔（默认 0.5 秒）
hotReload.setCheckInterval(1.0);

// 启用/禁用热更新
hotReload.setEnabled(false);

// 手动停止热更新
hotReload.stop();
```

### 开发环境检测
```typescript
// 只在开发环境启用热更新
if (isDevelopmentMode()) {
  HotReload.getInstance().start();
}
```

## 📊 监控和调试

### 控制台日志
```
Hot reload system started
Processing hot reload for 2 modules...
  ✓ Reloaded: src.utils.helper
  ✓ Reloaded: src.system.actor
Hot reload completed: 2 succeeded, 0 failed
```

### 文件变化检测
```
>>> File changed, rebuilding...
>>> Generated hot reload notification for modules: src.utils.helper
>>> File change handled, ready for next change...
```

## ⚠️ 注意事项

### 限制和约束
1. **状态保持**：热更新会清除模块缓存，可能丢失模块内的静态状态
2. **循环依赖**：复杂的模块依赖关系可能导致热更新失败
3. **事件监听器**：需要手动清理和重新注册事件监听器
4. **单例模式**：单例对象可能需要特殊处理

### 最佳实践
1. **设计无状态模块**：尽量减少模块内的全局状态
2. **实现热更新钩子**：为关键模块添加 `onHotReload()` 函数
3. **错误处理**：热更新失败不应影响游戏运行
4. **测试验证**：修改代码后验证功能是否正常

### 故障排除
1. **热更新未触发**：检查 `dist/hot-reload.json` 文件是否生成
2. **模块加载失败**：查看控制台错误信息
3. **状态丢失**：实现状态保存和恢复逻辑
4. **性能问题**：调整检查间隔或禁用热更新

## 🎯 开发工作流

### 典型开发流程
1. 启动开发模式：`yarn dev`
2. 进入游戏测试环境
3. 修改代码保存
4. 立即在游戏中看到效果
5. 继续迭代开发

### 调试技巧
- 使用 `print()` 函数输出调试信息
- 在 `onHotReload()` 中添加状态检查
- 监控控制台的热更新日志
- 必要时手动重启热更新系统

## 🔮 未来改进

- 智能依赖分析，只重载必要的模块
- 状态持久化机制
- 热更新历史记录和回滚
- 图形化热更新状态监控
- 更精确的错误报告和恢复机制