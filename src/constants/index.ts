/**
 * 常量定义总入口文件
 * 统一导出所有常量模块
 */

// Frame相关常量
export * from './frame';

// 游戏相关常量  
export * from './game/units';

// UI相关常量
export * from './ui/colors';

// 创建命名空间导出，便于按模块使用
export * as FrameConstants from './frame';
export * as GameConstants from './game/units';
export * as UIConstants from './ui/colors';

/**
 * 使用示例：
 * 
 * // 方式1：直接导入使用
 * import { FRAMEEVENT_CONTROL_CLICK, FrameEventUtils } from '@/constants';
 * 
 * // 方式2：按命名空间导入
 * import { FrameConstants } from '@/constants';
 * const eventType = FrameConstants.FRAMEEVENT_CONTROL_CLICK;
 * 
 * // 方式3：从特定模块导入
 * import { FRAMEEVENT_CONTROL_CLICK } from '@/constants/frame';
 */