# 项目构建脚本重构说明

## 📁 脚本结构

### 新增文件
- **`scripts/common.ts`** - 公共工具函数库

### 重构文件
- **`scripts/build.ts`** - 专注于生产构建
- **`scripts/dev.ts`** - 专注于开发模式
- **`package.json`** - 更新脚本配置

## 🔧 公共函数 (`scripts/common.ts`)

提取的公共函数包括：

```typescript
// 工具函数
export function ensureDirectoryExists(dir: string): void
export function copyDir(src: string, dest: string): void

// 核心构建函数
export function buildW3x(): void
export function injectLuaExecutionCall(): void
export function handleBootstrapLua(isDev: boolean): void
export function compileTypeScriptToLua(isWatch: boolean): void
```

## 🏗️ 构建脚本 (`scripts/build.ts`)

**专注于生产构建**，包含：
- 编译 TypeScript 到 Lua
- 注入 Lua 执行调用
- 处理 bootstrap.lua
- Lua 代码压缩（可选）
- 打包 w3x 文件

**使用方法：**
```bash
yarn build          # 生产构建
yarn build:dev      # 开发构建
yarn build:prod     # 生产构建（显式）
```

## 🔄 开发脚本 (`scripts/dev.ts`)

**专注于开发体验**，包含：
- 初始构建
- TSTL watch 模式
- 文件变化检测
- 自动重新编译和打包
- 优雅关闭处理

**使用方法：**
```bash
yarn dev            # 开发模式（watch）
```

## 📦 package.json 脚本更新

```json
{
  "scripts": {
    "watch": "tstl --watch",              // 纯 TSTL watch
    "dev": "ts-node scripts/dev.ts",      // 开发模式（推荐）
    "build": "ts-node scripts/build.ts",  // 生产构建
    "build:dev": "ts-node scripts/build.ts dev",   // 开发构建
    "build:prod": "ts-node scripts/build.ts prod", // 生产构建
    "test": "yarn build && ts-node scripts/test.ts", // 构建并测试
    "build:map": "w2l.exe obj maps dist/map.w3x",    // 仅打包地图
    "test:map": "YDWEConfig.exe -loadfile dist/map.w3x" // 仅测试地图
  }
}
```

## 🚀 优势

### 1. **职责分离**
- `build.ts` 专注构建逻辑
- `dev.ts` 专注开发体验
- `common.ts` 提供共享功能

### 2. **代码复用**
- 消除重复代码
- 统一核心功能实现
- 更易维护和更新

### 3. **清晰的接口**
- 每个脚本有明确的职责
- 统一的函数签名
- 一致的错误处理

### 4. **更好的开发体验**
- `yarn dev` - 完整的开发环境
- `yarn build` - 快速生产构建
- 各脚本独立，不互相干扰

## 🔀 工作流程

### 开发模式 (`yarn dev`)
```
1. 执行初始构建
   ├── 编译 TypeScript → Lua
   ├── 注入 Lua 执行调用
   ├── 处理 bootstrap.lua（开发模式）
   └── 打包 w3x 文件
2. 启动 TSTL watch 模式
3. 监听文件变化
4. 自动重新编译和打包
```

### 生产构建 (`yarn build`)
```
1. 编译 TypeScript → Lua
2. 注入 Lua 执行调用
3. 处理 bootstrap.lua（生产模式）
4. [可选] Lua 代码压缩
5. 打包 w3x 文件
```

### 单次开发构建 (`yarn build:dev`)
```
1. 编译 TypeScript → Lua（开发模式，多文件输出）
2. 注入 Lua 执行调用
3. 处理 bootstrap.lua（开发模式，注入 PROJECT_PATH）
4. 打包 w3x 文件
```

## 📋 迁移说明

从旧版本迁移：
1. 使用 `yarn dev` 替代 `yarn dev:old`
2. `yarn build` 现在默认是生产模式
3. 开发构建使用 `yarn build:dev`
4. 所有核心功能保持不变，只是组织结构更清晰