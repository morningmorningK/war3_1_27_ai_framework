/**
 * Frame相关类型定义
 */

/**
 * Frame事件处理器函数类型
 */
export type FrameEventHandler = () => void;

/**
 * Frame事件处理器参数类型（带参数版本）
 */
export type FrameEventHandlerWithParams = (...args: any[]) => void;

/**
 * Frame事件配置接口
 */
export interface FrameEventConfig {
    onClick?: FrameEventHandler;
    onMouseEnter?: FrameEventHandler;
    onMouseLeave?: FrameEventHandler;
    onMouseUp?: FrameEventHandler;
    onMouseWheel?: FrameEventHandler;
    onCheckboxChecked?: FrameEventHandler;
    onTextChanged?: FrameEventHandler;
}

/**
 * Frame位置配置接口
 */
export interface FramePosition {
    x: number;
    y: number;
}

/**
 * Frame尺寸配置接口
 */
export interface FrameSize {
    width: number;
    height: number;
}

/**
 * Frame布局配置接口
 */
export interface FrameLayout extends FramePosition, FrameSize {
    anchor?: any; // Frame对齐方式
}