/**
 * 应用程序配置接口
 */
export interface AppConfig {
  /** 是否启用调试模式 */
  debug: boolean;
  /** 是否启用控制台 */
  console: boolean;
  /** 运行时配置 */
  runtime: RuntimeConfig;
  /** 地图配置 */
  map: MapConfig;
}

/**
 * 运行时配置
 */
export interface RuntimeConfig {
  /** 调试器端口 */
  debuggerPort: number;
  /** 是否启用睡眠模式 */
  sleep: boolean;
  /** 是否捕获崩溃 */
  catchCrash: boolean;
}

/**
 * 地图配置
 */
export interface MapConfig {
  /** 地图名称 */
  name: string;
  /** 地图版本 */
  version: string;
  /** 地图描述 */
  description: string;
}
