/**
 * UI布局像素管理器
 * 提供常用的UI布局和尺寸预设
 */

import { ScreenCoordinates } from "./ScreenCoordinates";
import { Frame } from "@eiriksgata/wc3ts/*";

export interface UIRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface WC3Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * 预设位置类型定义
 */
export type PresetPosition = 
  // 角落位置
  | 'TOP_LEFT' 
  | 'TOP_RIGHT' 
  | 'BOTTOM_LEFT' 
  | 'BOTTOM_RIGHT'
  // 边缘中心
  | 'TOP_CENTER' 
  | 'BOTTOM_CENTER' 
  | 'LEFT_CENTER' 
  | 'RIGHT_CENTER'
  // 屏幕中心
  | 'CENTER'
  // 常用UI位置
  | 'UI_TOP_LEFT' 
  | 'UI_TOP_RIGHT' 
  | 'UI_BOTTOM_LEFT' 
  | 'UI_BOTTOM_RIGHT';

export class UILayout {
  // 常用按钮尺寸（像素）
  public static readonly BUTTON_SIZES = {
    SMALL: { width: 80, height: 32 },
    MEDIUM: { width: 120, height: 40 },
    LARGE: { width: 160, height: 48 },
    EXTRA_LARGE: { width: 200, height: 56 }
  };

  // 常用面板尺寸（像素）
  public static readonly PANEL_SIZES = {
    SMALL: { width: 300, height: 200 },
    MEDIUM: { width: 500, height: 350 },
    LARGE: { width: 700, height: 500 },
    FULLSCREEN: { width: 1820, height: 980 }
  };

  // 间距预设（像素）
  public static readonly SPACING = {
    TINY: 4,
    SMALL: 8,
    MEDIUM: 16,
    LARGE: 24,
    EXTRA_LARGE: 32
  };

  /**
   * 将 Frame 设置到预设位置
   * @param frame 要设置的 Frame
   * @param preset 预设位置名称（如 'CENTER', 'TOP_LEFT' 等）
   * @param anchorPoint Frame 的锚点；不传时会根据 preset 自动选择（避免底边贴图被高度顶出屏幕）
   * @example
   * UILayout.setFramePosition(myFrame, 'CENTER');
   * UILayout.setFramePosition(myFrame, 'TOP_LEFT', FRAMEPOINT_TOPLEFT);
   */
  public static setFramePosition(
    frame: Frame,
    preset: PresetPosition,
    anchorPoint?: number
  ): void {
    const pixelPos = ScreenCoordinates.getPresetPosition(preset);
    const wc3Pos = ScreenCoordinates.pixelToWC3(
      pixelPos.x,
      pixelPos.y,
      ScreenCoordinates.ORIGIN_TOP_LEFT
    );
    const resolvedAnchor = UILayout.resolveAnchor(preset, anchorPoint);
    frame.setAbsPoint(resolvedAnchor, wc3Pos.x, wc3Pos.y);
  }

  /**
   * 设置 Frame 到指定预设位置，并可选设置尺寸
   * @param frame 要设置的 Frame
   * @param preset 预设位置名称（'CENTER', 'TOP_LEFT', 'BOTTOM_RIGHT', 'UI_TOP_LEFT' 等）
   * @param pixelWidth 可选的像素宽度
   * @param pixelHeight 可选的像素高度
   * @param anchorPoint Frame 的锚点，默认为 FRAMEPOINT_CENTER
   * @example
   * // 居中显示，设置尺寸
   * UILayout.setFrame(myFrame, 'CENTER', 910, 245);
   * 
   * // 左上角显示
   * UILayout.setFrame(myFrame, 'TOP_LEFT', 300, 200, FRAMEPOINT_TOPLEFT);
   * 
   * // 右下角显示（仅位置，不设置尺寸）
   * UILayout.setFrame(myFrame, 'BOTTOM_RIGHT');
   */
  public static setFrame(
    frame: Frame,
    preset: PresetPosition,
    pixelWidth?: number,
    pixelHeight?: number,
    anchorPoint?: number
  ): void {
    this.setFramePosition(frame, preset, anchorPoint);
    
    if (pixelWidth !== undefined && pixelHeight !== undefined) {
      this.setFrameSize(frame, pixelWidth, pixelHeight);
    }
  }

  /**
   * 将 Frame 放置在预设位置并自动保证贴图不越出屏幕（需要提供尺寸）
   * @param frame 要设置的 Frame
   * @param preset 预设位置
   * @param pixelWidth 像素宽度（必填，用于计算边界）
   * @param pixelHeight 像素高度（必填，用于计算边界）
   * @param anchorPoint 可选锚点，缺省时按 preset 自动选择
   * @example
   * UILayout.setFrameWithinScreen(myFrame, 'BOTTOM_RIGHT', 910, 245);
   */
  public static setFrameWithinScreen(
    frame: Frame,
    preset: PresetPosition,
    pixelWidth: number,
    pixelHeight: number,
    anchorPoint?: number
  ): void {
    const pixelPos = ScreenCoordinates.getPresetPosition(preset);
    const wc3Pos = ScreenCoordinates.pixelToWC3(
      pixelPos.x,
      pixelPos.y,
      ScreenCoordinates.ORIGIN_TOP_LEFT
    );

    const resolvedAnchor = UILayout.resolveAnchor(preset, anchorPoint);
    const anchorFactors = UILayout.resolveAnchorFactors(resolvedAnchor);
    const size = ScreenCoordinates.pixelSizeToWC3(pixelWidth, pixelHeight);

    const clampedX = Math.min(
      Math.max(wc3Pos.x, anchorFactors.x * size.width),
      ScreenCoordinates.WC3_SCREEN_WIDTH - (1 - anchorFactors.x) * size.width
    );

    const clampedY = Math.min(
      Math.max(wc3Pos.y, anchorFactors.y * size.height),
      ScreenCoordinates.WC3_SCREEN_HEIGHT - (1 - anchorFactors.y) * size.height
    );

    frame.setAbsPoint(resolvedAnchor, clampedX, clampedY);
    frame.setSize(size.width, size.height);
  }

  /**
   * 居中显示 Frame，并可选设置尺寸（setFrame 的便捷方法）
   * @param frame 要居中的 Frame
   * @param pixelWidth 可选的像素宽度
   * @param pixelHeight 可选的像素高度
   * @example
   * UILayout.centerFrame(myFrame, 910, 245);
   */
  public static centerFrame(
    frame: Frame,
    pixelWidth?: number,
    pixelHeight?: number
  ): void {
    this.setFrame(frame, 'CENTER', pixelWidth, pixelHeight, 4);
  }

  /**
   * 设置 Frame 的尺寸（从像素转换）
   * @param frame 要设置的 Frame
   * @param pixelWidth 像素宽度
   * @param pixelHeight 像素高度
   * @example
   * UILayout.setFrameSize(myFrame, 910, 245);
   */
  public static setFrameSize(
    frame: Frame,
    pixelWidth: number,
    pixelHeight: number
  ): void {
    const size = ScreenCoordinates.pixelSizeToWC3(pixelWidth, pixelHeight);
    frame.setSize(size.width, size.height);
  }

  /**
   * 设置 Frame 的矩形区域（位置 + 尺寸）
   * @param frame 要设置的 Frame
   * @param pixelRect 像素矩形 {x, y, width, height}
   * @param anchorPoint Frame 的锚点，默认为 FRAMEPOINT_TOPLEFT
   * @example
   * UILayout.setFrameRect(myFrame, { x: 100, y: 100, width: 300, height: 200 });
   */
  public static setFrameRect(
    frame: Frame,
    pixelRect: UIRect,
    anchorPoint: number = 0  // FRAMEPOINT_TOPLEFT = 0
  ): void {
    const wc3Pos = ScreenCoordinates.pixelToWC3(
      pixelRect.x,
      pixelRect.y,
      ScreenCoordinates.ORIGIN_TOP_LEFT
    );
    frame.setAbsPoint(anchorPoint, wc3Pos.x, wc3Pos.y);
    this.setFrameSize(frame, pixelRect.width, pixelRect.height);
  }

  /**
   * 根据预设位置推断合适的锚点，避免底部/顶部因尺寸被裁切
   * @param preset 预设位置
   * @param anchorPoint 用户传入的锚点，若提供则直接使用
   */
  private static resolveAnchor(preset: PresetPosition, anchorPoint?: number): number {
    if (anchorPoint !== undefined) {
      return anchorPoint;
    }

    switch (preset) {
      case 'TOP_LEFT':
      case 'UI_TOP_LEFT':
        return 0; // FRAMEPOINT_TOPLEFT
      case 'TOP_CENTER':
        return 1; // FRAMEPOINT_TOP
      case 'TOP_RIGHT':
      case 'UI_TOP_RIGHT':
        return 2; // FRAMEPOINT_TOPRIGHT
      case 'LEFT_CENTER':
        return 3; // FRAMEPOINT_LEFT
      case 'CENTER':
        return 4; // FRAMEPOINT_CENTER
      case 'RIGHT_CENTER':
        return 5; // FRAMEPOINT_RIGHT
      case 'BOTTOM_LEFT':
      case 'UI_BOTTOM_LEFT':
        return 6; // FRAMEPOINT_BOTTOMLEFT
      case 'BOTTOM_CENTER':
        return 7; // FRAMEPOINT_BOTTOM
      case 'BOTTOM_RIGHT':
      case 'UI_BOTTOM_RIGHT':
        return 8; // FRAMEPOINT_BOTTOMRIGHT
      default:
        return 4; // 安全兜底 CENTER
    }
  }

  /**
   * 将锚点编号转换为相对位置系数（0=左/下, 1=右/上）
   */
  private static resolveAnchorFactors(anchorPoint: number): { x: number; y: number } {
    switch (anchorPoint) {
      case 0: return { x: 0,   y: 1 };   // TOPLEFT
      case 1: return { x: 0.5, y: 1 };   // TOP
      case 2: return { x: 1,   y: 1 };   // TOPRIGHT
      case 3: return { x: 0,   y: 0.5 }; // LEFT
      case 4: return { x: 0.5, y: 0.5 }; // CENTER
      case 5: return { x: 1,   y: 0.5 }; // RIGHT
      case 6: return { x: 0,   y: 0 };   // BOTTOMLEFT
      case 7: return { x: 0.5, y: 0 };   // BOTTOM
      case 8: return { x: 1,   y: 0 };   // BOTTOMRIGHT
      default: return { x: 0.5, y: 0.5 };
    }
  }
  
}