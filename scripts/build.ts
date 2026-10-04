import * as fs from 'fs';
import { buildW3x, compileTypeScriptToLua, compileTypeScriptToLuaProd, injectLuaExecutionCall, handleBootstrapLua } from './common';

const luamin = require('luamin');

interface TsConfig {
  tstl: {
    luaBundle: string;
  };
}

interface Luamin {
  minify(code: string): string;
}

type BuildMode = 'dev' | 'prod';

function resolveBuildMode(): BuildMode {
  const modeArg = process.argv[2]?.toLowerCase();

  if (modeArg === 'dev') {
    return 'dev';
  }

  if (modeArg === 'build' || modeArg === 'prod' || modeArg === undefined) {
    return 'prod';
  }

  console.warn(`>>> Unknown build mode "${modeArg}", falling back to production mode`);
  return 'prod';
}

/**
 * 压缩 Lua 代码（生产模式）
 */
function minifyLua(): void {
  try {
    // 读取 tsconfig.prod.json 的配置
    const tsconfigContent: string = fs.readFileSync("tsconfig.prod.json", "utf-8");

    if (!tsconfigContent) {
      console.error("Failed to read tsconfig.prod.json");
      return;
    }

    const tsconfig: TsConfig = JSON.parse(tsconfigContent);
    const luaFile: string = `maps/map/${tsconfig.tstl.luaBundle}`;

    if (!fs.existsSync(luaFile)) {
      console.error(`Lua file not found: ${luaFile}`);
      return;
    }

    const rawContent: string = fs.readFileSync(luaFile, "utf-8");
    const minifiedContent: string = (luamin as Luamin).minify(rawContent);

    fs.writeFileSync(luaFile, minifiedContent);
    console.log(">>> Lua minification completed");
  } catch (error) {
    console.error("Error during Lua minification:", error);
    process.exit(1);
  }
}

function runDevBuild(): void {
  console.log('>>> Starting build process (development mode)');

  compileTypeScriptToLua();
  injectLuaExecutionCall();
  handleBootstrapLua(true);
  buildW3x();

  console.log('>>> Build process completed (development mode)');
}

function runProdBuild(): void {
  console.log('>>> Starting build process (production mode - bundled)');

  compileTypeScriptToLuaProd();
  injectLuaExecutionCall();
  handleBootstrapLua(false);
  minifyLua();
  buildW3x();

  console.log('>>> Build process completed (production mode)');
}

/**
 * 构建项目
 */
function main(): void {
  const mode = resolveBuildMode();

  try {
    if (mode === 'dev') {
      runDevBuild();
      return;
    }

    runProdBuild();
  } catch (error) {
    console.error(">>> Error during build process:", error);
    process.exit(1);
  }
}

// 执行构建
main();