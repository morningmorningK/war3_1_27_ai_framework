import { spawn, ChildProcess } from 'child_process';
import { buildW3x, compileTypeScriptToLua, injectLuaExecutionCall, handleBootstrapLua } from './common';

/**
 * 开发模式脚本
 * 使用 TSTL watch 模式监听文件变化并自动重新编译
 */

// 全局变量
let tstlWatchProcess: ChildProcess | null = null;
let isInitialBuildComplete = false;
let lastNotificationTime = 0; // 记录上次生成通知的时间

/**
 * 执行初始构建
 */
function performInitialBuild(): void {
  console.log(">>> Performing initial build...");
  
  try {
    // 1. 编译 TypeScript 到 Lua（一次性）初始编译
    console.log(">>> Initial TypeScript to Lua compilation...");
    compileTypeScriptToLua();
    
    // 2. 注入 Lua 执行调用
    injectLuaExecutionCall();
    
    // 3. 处理 bootstrap.lua（开发模式）
    handleBootstrapLua(true);
    
    // 4. 打包 w3x 文件
    buildW3x();
    
    // 5. 清理旧的热更新通知文件（避免初始构建触发热更新）
    const fs = require('fs');
    const path = require('path');
    const notificationPath = path.join("dist", "hot-reload.json");
    if (fs.existsSync(notificationPath)) {
      fs.unlinkSync(notificationPath);
      console.log(">>> Removed old hot reload notification file");
    }
    
    console.log(">>> Initial build completed");
    // 注意：isInitialBuildComplete 将在 TSTL watch 模式的第一次编译完成后设置为 true
  } catch (error) {
    console.error(">>> Error during initial build:", error);
    process.exit(1);
  }
}

/**
 * 启动 TSTL watch 模式
 */
function startTstlWatch(): void {
  console.log(">>> Starting TSTL watch mode...");
  
  // 启动 tstl --watch 进程
  tstlWatchProcess = spawn('tstl', ['--watch', '-p', 'tsconfig.json'], {
    stdio: ['inherit', 'pipe', 'pipe'],
    shell: true
  });

  if (tstlWatchProcess.stdout) {
    tstlWatchProcess.stdout.on('data', (data: Buffer) => {
      const output = data.toString();
      console.log(output);
      
      // 检测编译完成的信号
      if (output.includes('Compilation completed') || output.includes('Found 0 errors')) {
        if (isInitialBuildComplete) {
          console.log(">>> File changed, rebuilding...");
          handleFileChange();
        } else {
          // 这是 watch 模式启动后的第一次编译，不应该触发热更新
          console.log(">>> TSTL watch mode initial compilation completed, skipping hot reload");
          isInitialBuildComplete = true;
        }
      }
    });
  }

  if (tstlWatchProcess.stderr) {
    tstlWatchProcess.stderr.on('data', (data: Buffer) => {
      console.error(`TSTL Watch Error: ${data.toString()}`);
    });
  }

  tstlWatchProcess.on('close', (code: number) => {
    console.log(`>>> TSTL watch process exited with code ${code}`);
  });

  tstlWatchProcess.on('error', (error: Error) => {
    console.error(`>>> TSTL watch process error:`, error);
  });
}

/**
 * 处理文件变化事件
 */
function handleFileChange(): void {
  try {
    console.log(">>> Handling file change...");
    
    // 生成热更新通知文件
    generateHotReloadNotification();
    
    console.log(">>> File change handled, ready for next change...");
  } catch (error) {
    console.error(">>> Error handling file change:", error);
  }
}

/**
 * 模块信息接口
 */
interface ModuleInfo {
  name: string;  // 注册的模块名，如 "ReloadTemplate"
  path: string;  // require 路径，如 "src.examples.ReloadTemplateExample"
}

/**
 * 生成热更新通知文件
 */
function generateHotReloadNotification(): void {
  try {
    const fs = require('fs');
    const path = require('path');
    
    // 获取最近修改的 Lua 文件
    const distSrcPath = path.join("dist", "src");
    if (!fs.existsSync(distSrcPath)) {
      console.warn(">>> dist/src directory not found, skipping hot reload notification");
      return;
    }
    
    // 递归获取所有 Lua 文件并按修改时间排序
    const changedModules = getRecentlyChangedModules(distSrcPath);
    
    if (changedModules.length === 0) {
      console.log(">>> No recently changed modules detected");
      return;
    }
    
    // 更新上次通知时间
    lastNotificationTime = Date.now();
    
    // 生成热更新通知 - 新格式包含 name 和 path
    const hotReloadNotification = {
      timestamp: lastNotificationTime,
      action: "reload",
      modules: changedModules,
      processed: false
    };
    
    const notificationPath = path.join("dist", "hot-reload.json");
    fs.writeFileSync(notificationPath, JSON.stringify(hotReloadNotification, null, 2));
    
    const moduleNames = changedModules.map(m => m.name).join(", ");
    console.log(`>>> Generated hot reload notification for modules: ${moduleNames}`);
  } catch (error) {
    console.error(">>> Error generating hot reload notification:", error);
  }
}

/**
 * 从 Lua 文件内容中提取注册的模块名
 * 支持三种格式：
 * 1. 字符串字面量: registerModule("ModuleName", ...)
 * 2. 类名.name: registerModule(ClassName.name, ...) 会查找 ClassName.name = "ModuleName"
 * 3. 直接传类: registerModule(ClassName, ...) 会查找 ClassName.name = "ModuleName"
 */
function extractModuleNameFromLua(luaFilePath: string): string | null {
  const fs = require('fs');
  
  try {
    const content = fs.readFileSync(luaFilePath, 'utf-8');
  
    // 方式1: 匹配直接传类 registerModule(ClassName, {...})
    // 格式: registerModule(\n    ClassName,\n    {
    const classMatch = content.match(/registerModule\s*\(\s*(\w+)\s*,\s*\{/i);
    if (classMatch && classMatch[1]) {
      const className = classMatch[1];
      // 查找 ClassName.name = "ModuleName"
      const nameDefMatch = content.match(new RegExp(`${className}\\.name\\s*=\\s*["']([^"']+)["']`));
      if (nameDefMatch && nameDefMatch[1]) {
        return nameDefMatch[1];
      }
    }
    
  } catch (error) {
    console.warn(`>>> Warning: Failed to read lua file ${luaFilePath}: ${error}`);
  }
  
  return null;
}

/**
 * 获取最近修改的模块列表（排除初始构建时的文件）
 * 返回模块名和对应的 require 路径
 */
function getRecentlyChangedModules(distSrcPath: string): ModuleInfo[] {
  const fs = require('fs');
  const pathModule = require('path');
  
  const modules: ModuleInfo[] = [];
  const moduleNames = new Set<string>();  // 用于去重
  const now = Date.now();
  
  // 使用更短的阈值，并且排除初始构建时的文件
  const recentThreshold = 2000; // 2秒内的文件认为是最近修改的
  const excludeThreshold = lastNotificationTime || (now - 10000); // 排除上次通知之前的文件
  
  function scanDirectory(dir: string, basePath: string = ""): void {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = pathModule.join(dir, entry.name);
      const relativePath = basePath ? `${basePath}.${entry.name}` : entry.name;
      
      if (entry.isDirectory()) {
        scanDirectory(fullPath, relativePath);
      } else if (entry.name.endsWith('.lua')) {
        const stats = fs.statSync(fullPath);
        const fileModTime = stats.mtime.getTime();
        const timeDiff = now - fileModTime;
        
        // 只包含最近修改的文件，并且排除初始构建时的文件
        if (timeDiff <= recentThreshold && fileModTime > excludeThreshold) {
          // 从 Lua 文件内容中提取模块名
          const moduleName = extractModuleNameFromLua(fullPath);
          
          if (moduleName && !moduleNames.has(moduleName)) {
            // 计算 require 路径：src.examples.ReloadTemplateExample
            const requirePath = `src.${relativePath.replace(/\.lua$/, '')}`;
            
            modules.push({
              name: moduleName,
              path: requirePath
            });
            moduleNames.add(moduleName);
            console.log(`>>> Extracted module: ${moduleName} -> ${requirePath}`);
          }
        }
      }
    }
  }
  
  scanDirectory(distSrcPath);
  return modules;
}

/**
 * 清理资源
 */
function cleanup(): void {
  console.log(">>> Cleaning up...");
  
  if (tstlWatchProcess) {
    tstlWatchProcess.kill('SIGTERM');
    tstlWatchProcess = null;
  }
  
  // 清理热更新通知文件
  cleanupHotReloadFile();
}

/**
 * 设置信号处理
 */
function setupSignalHandlers(): void {
  process.on('SIGINT', () => {
    console.log(">>> Received SIGINT, shutting down gracefully...");
    cleanup();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log(">>> Received SIGTERM, shutting down gracefully...");
    cleanup();
    process.exit(0);
  });
}

/**
 * 清理热更新通知文件
 */
function cleanupHotReloadFile(): void {
  const fs = require('fs');
  const path = require('path');
  const notificationPath = path.join("dist", "hot-reload.json");
  
  if (fs.existsSync(notificationPath)) {
    try {
      fs.unlinkSync(notificationPath);
      console.log(">>> Removed existing hot-reload.json file");
    } catch (error) {
      console.warn(`>>> Warning: Failed to remove hot-reload.json: ${error}`);
    }
  }
}

/**
 * 清理 prod 模式生成的 main.lua（避免与 dev 模式冲突）
 */
function cleanupProdMainLua(): void {
  const fs = require('fs');
  const path = require('path');
  const mainLuaPath = path.join("maps", "map", "main.lua");
  
  if (fs.existsSync(mainLuaPath)) {
    try {
      fs.unlinkSync(mainLuaPath);
      console.log(">>> Removed prod main.lua to avoid conflicts with dev mode");
    } catch (error) {
      console.warn(`>>> Warning: Failed to remove main.lua: ${error}`);
    }
  }
}

/**
 * 主函数
 */
function main(): void {
  console.log(">>> Starting development mode with watch...");
  
  // 设置信号处理
  setupSignalHandlers();
  
  // 0. 清理旧的热更新通知文件
  cleanupHotReloadFile();
  
  // 0.5 清理 prod 模式生成的 main.lua
  cleanupProdMainLua();
  
  // 1. 执行初始构建
  performInitialBuild();
  
  // 2. 启动 watch 模式
  startTstlWatch();
  
  console.log(">>> Development server started. Watching for changes...");
  console.log(">>> Press Ctrl+C to stop");
}

// 执行主函数
main();