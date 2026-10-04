# 热更新故障排除指南

## 常见问题及解决方案

### 问题1: 模块路径映射错误

#### 症状
```
Error during hot reload of module TemplateUI: module 'src.system.examples.TemplateUi' not found
```

#### 原因
`ModuleManager.ts` 中的 `pathMappings` 配置的模块路径与实际文件路径不匹配。

#### 解决方案

1. **检查文件实际位置**
   ```
   src/examples/TemplateUi.ts  ✓ 实际位置
   ```

2. **更新 ModuleManager.ts 中的路径映射**
   ```typescript
   // src/system/ModuleManager.ts
   const pathMappings: { [key: string]: string } = {
     'TemplateUI': 'src.examples.TemplateUi',  // ✓ 正确
     // 'TemplateUI': 'src.system.examples.TemplateUi',  ✗ 错误
   };
   ```

3. **路径映射规则**
   - 模块名（注册名）→ 实际文件路径（用点号分隔）
   - 注意文件名大小写（TypeScript文件名 vs 注册的模块名）
   
   | 文件路径 | Lua模块路径 | 注册名 |
   |---------|------------|--------|
   | `src/examples/TemplateUi.ts` | `src.examples.TemplateUi` | `TemplateUI` |
   | `src/system/ui/UnitBlood.ts` | `src.system.ui.UnitBlood` | `UnitBlood` |
   | `src/utils/CameraControl.ts` | `src.utils.CameraControl` | `CameraControl` |

### 问题2: 模块名称大小写不匹配

#### 症状
模块注册成功但热更新找不到模块。

#### 解决方案

检查以下三处的命名一致性：

1. **文件名** (TemplateUi.ts)
   ```typescript
   // src/examples/TemplateUi.ts
   class TemplateUI {  // 类名可以不同
   ```

2. **模块注册名** (TemplateUI)
   ```typescript
   ModuleManager.getInstance().registerModule("TemplateUI", TemplateUI, {
   ```

3. **HotReload.ts 中的名称映射**
   ```typescript
   const nameMapping: { [key: string]: string } = {
     'TemplateUi': 'TemplateUI',  // 文件名 -> 注册名
   };
   ```

### 问题3: 热更新通知未生成

#### 症状
修改文件后没有看到热更新通知。

#### 原因
- 开发模式未启动
- 文件修改时间戳问题

#### 解决方案
```bash
# 重新启动开发模式
yarn dev
```

### 问题4: 模块未注册

#### 症状
```
Warning: Module TemplateUI not registered for hot reload
```

#### 解决方案

确保模块正确注册：

```typescript
// 在模块文件底部添加注册代码
ModuleManager.getInstance().registerModule("TemplateUI", TemplateUI, {
  initialize: () => {
    // 初始化逻辑
  },
  cleanup: () => {
    // 清理逻辑
  },
  onHotReload: () => {
    // 热重载逻辑
  },
  dependencies: []
});
```

## 热更新工作流程

```
1. 文件修改
   ↓
2. TypeScript编译
   ↓
3. 生成 hot-reload.json
   {
     "modules": ["src.examples.TemplateUi"]
   }
   ↓
4. HotReload.ts 读取通知
   ↓
5. 提取模块名
   "src.examples.TemplateUi" → "TemplateUi"
   ↓
6. 映射到注册名
   "TemplateUi" → "TemplateUI"
   ↓
7. ModuleManager 查找模块
   ↓
8. 获取模块路径
   "TemplateUI" → "src.examples.TemplateUi"
   ↓
9. 热重载模块
   - 清理旧模块
   - 清除缓存
   - 重新加载
   - 重新初始化
```

## 添加新模块的步骤

### 1. 创建模块文件
```typescript
// src/your-path/YourModule.ts
import { ModuleManager } from "../system/ModuleManager";

class YourModule {
  public initialize(): void {
    print("YourModule initialized");
  }

  public cleanup(): void {
    print("YourModule cleaned up");
  }

  public static onHotReload(): void {
    print("YourModule hot reloaded!");
  }
}

// 注册模块
ModuleManager.getInstance().registerModule("YourModule", YourModule, {
  initialize: () => {
    const instance = new YourModule();
    instance.initialize();
  },
  cleanup: () => {
    // 清理逻辑
  },
  onHotReload: () => YourModule.onHotReload(),
  dependencies: []
});

export { YourModule };
```

### 2. 更新 ModuleManager.ts
```typescript
const pathMappings: { [key: string]: string } = {
  'YourModule': 'src.your-path.YourModule',  // 添加映射
  // ... 其他映射
};
```

### 3. 更新 HotReload.ts
```typescript
const nameMapping: { [key: string]: string } = {
  'YourModule': 'YourModule',  // 如果文件名和注册名相同
  // ... 其他映射
};
```

### 4. 在 main.ts 中导入
```typescript
import { YourModule } from "./your-path/YourModule";

// 确保模块被加载
print("Loading modules:", typeof YourModule);
```

## 调试技巧

### 1. 启用详细日志
```typescript
// 在 HotReload.ts 中取消注释调试日志
print(`Attempting to read hot reload file: ${filePath}`);
print(`Hot reload file content length: ${content.length}`);
```

### 2. 检查模块注册状态
```typescript
// 在控制台执行
const manager = ModuleManager.getInstance();
print(`Registered modules: ${manager.getRegisteredModules().join(", ")}`);
```

### 3. 验证路径映射
```typescript
// 测试路径映射
const modulePath = getModulePathFromName("TemplateUI");
print(`Module path: ${modulePath}`);
```

## 最佳实践

1. **统一命名规范**
   - 文件名使用 PascalCase: `TemplateUi.ts`
   - 模块注册名使用 PascalCase: `TemplateUI`
   - 保持一致性

2. **集中管理路径映射**
   - 所有模块路径集中在 `ModuleManager.ts`
   - 使用注释标记文件实际位置

3. **模块化设计**
   - 每个模块独立，职责单一
   - 使用 `dependencies` 声明依赖关系

4. **清理资源**
   - 实现 `cleanup()` 方法
   - 热重载前清理旧实例

5. **测试热更新**
   - 修改文件后观察日志
   - 确认模块正确重载
   - 验证功能正常

## 相关文件

- `src/system/ModuleManager.ts` - 模块管理器
- `src/system/HotReload.ts` - 热更新系统
- `scripts/dev.ts` - 开发模式脚本
- `docs/hot-reload-design.md` - 热更新设计文档
