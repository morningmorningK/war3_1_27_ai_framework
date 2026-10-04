/**
 * 屏幕坐标系统转换工具
 * 将常规的像素坐标转换为魔兽争霸3的相对坐标
 */

export class ScreenCoordinates {
  // 魔兽争霸3的屏幕坐标范围
  public static readonly WC3_SCREEN_WIDTH = 0.8;
  public static readonly WC3_SCREEN_HEIGHT = 0.6;
  
  // 标准屏幕分辨率基准（可以根据需要调整）
  public static readonly STANDARD_WIDTH = 1920;
  public static readonly STANDARD_HEIGHT = 1080;
  
  // 坐标原点类型
  public static readonly ORIGIN_TOP_LEFT = 'TOP_LEFT';
  public static readonly ORIGIN_BOTTOM_LEFT = 'BOTTOM_LEFT';
  public static readonly ORIGIN_CENTER = 'CENTER';

  /**
   * 将像素坐标转换为WC3相对坐标
   * @param pixelX 像素X坐标
   * @param pixelY 像素Y坐标
   * @param origin 坐标原点类型，默认为左上角
   * @returns WC3相对坐标 {x, y}
   */
  public static pixelToWC3(
    pixelX: number, 
    pixelY: number, 
    origin: string = ScreenCoordinates.ORIGIN_TOP_LEFT
  ): { x: number; y: number } {
    let wc3X: number;
    let wc3Y: number;

    switch (origin) {
      case ScreenCoordinates.ORIGIN_TOP_LEFT:
        // 左上角为原点 (0,0)，向右向下为正
        wc3X = (pixelX / ScreenCoordinates.STANDARD_WIDTH) * ScreenCoordinates.WC3_SCREEN_WIDTH;
        wc3Y = ScreenCoordinates.WC3_SCREEN_HEIGHT - (pixelY / ScreenCoordinates.STANDARD_HEIGHT) * ScreenCoordinates.WC3_SCREEN_HEIGHT;
        break;
        
      case ScreenCoordinates.ORIGIN_BOTTOM_LEFT:
        // 左下角为原点 (0,0)，向右向上为正（WC3原生）
        wc3X = (pixelX / ScreenCoordinates.STANDARD_WIDTH) * ScreenCoordinates.WC3_SCREEN_WIDTH;
        wc3Y = (pixelY / ScreenCoordinates.STANDARD_HEIGHT) * ScreenCoordinates.WC3_SCREEN_HEIGHT;
        break;
        
      case ScreenCoordinates.ORIGIN_CENTER:
        // 屏幕中心为原点 (0,0)
        const centerX = ScreenCoordinates.STANDARD_WIDTH / 2;
        const centerY = ScreenCoordinates.STANDARD_HEIGHT / 2;
        wc3X = ((pixelX + centerX) / ScreenCoordinates.STANDARD_WIDTH) * ScreenCoordinates.WC3_SCREEN_WIDTH;
        wc3Y = ScreenCoordinates.WC3_SCREEN_HEIGHT - ((pixelY + centerY) / ScreenCoordinates.STANDARD_HEIGHT) * ScreenCoordinates.WC3_SCREEN_HEIGHT;
        break;
        
      default:
        throw new Error(`Unsupported origin type: ${origin}`);
    }

    return {
      x: Math.max(0, Math.min(ScreenCoordinates.WC3_SCREEN_WIDTH, wc3X)),
      y: Math.max(0, Math.min(ScreenCoordinates.WC3_SCREEN_HEIGHT, wc3Y))
    };
  }

  /**
   * 将WC3相对坐标转换为像素坐标
   * @param wc3X WC3 X坐标
   * @param wc3Y WC3 Y坐标
   * @param origin 坐标原点类型
   * @returns 像素坐标 {x, y}
   */
  public static wc3ToPixel(
    wc3X: number, 
    wc3Y: number, 
    origin: string = ScreenCoordinates.ORIGIN_TOP_LEFT
  ): { x: number; y: number } {
    let pixelX: number;
    let pixelY: number;

    switch (origin) {
      case ScreenCoordinates.ORIGIN_TOP_LEFT:
        pixelX = (wc3X / ScreenCoordinates.WC3_SCREEN_WIDTH) * ScreenCoordinates.STANDARD_WIDTH;
        pixelY = (1 - wc3Y / ScreenCoordinates.WC3_SCREEN_HEIGHT) * ScreenCoordinates.STANDARD_HEIGHT;
        break;
        
      case ScreenCoordinates.ORIGIN_BOTTOM_LEFT:
        pixelX = (wc3X / ScreenCoordinates.WC3_SCREEN_WIDTH) * ScreenCoordinates.STANDARD_WIDTH;
        pixelY = (wc3Y / ScreenCoordinates.WC3_SCREEN_HEIGHT) * ScreenCoordinates.STANDARD_HEIGHT;
        break;
        
      case ScreenCoordinates.ORIGIN_CENTER:
        const centerX = ScreenCoordinates.STANDARD_WIDTH / 2;
        const centerY = ScreenCoordinates.STANDARD_HEIGHT / 2;
        pixelX = (wc3X / ScreenCoordinates.WC3_SCREEN_WIDTH) * ScreenCoordinates.STANDARD_WIDTH - centerX;
        pixelY = (1 - wc3Y / ScreenCoordinates.WC3_SCREEN_HEIGHT) * ScreenCoordinates.STANDARD_HEIGHT - centerY;
        break;
        
      default:
        throw new Error(`Unsupported origin type: ${origin}`);
    }

    return { x: Math.round(pixelX), y: Math.round(pixelY) };
  }

  /**
   * 获取屏幕区域的预设位置
   */
  public static getPresetPosition(preset: string): { x: number; y: number } {
    const positions = {
      // 角落位置
      'TOP_LEFT': { x: 0, y: 0 },
      'TOP_RIGHT': { x: 1820, y: 0 },
      'BOTTOM_LEFT': { x: 0, y: 1080 },
      'BOTTOM_RIGHT': { x: 1820, y: 1080 },
      
      // 边缘中心
      'TOP_CENTER': { x: 960, y: 0 },
      'BOTTOM_CENTER': { x: 960, y: 1080 },
      'LEFT_CENTER': { x: 0, y: 540 },
      'RIGHT_CENTER': { x: 1820, y: 540 },
      
      // 屏幕中心
      'CENTER': { x: 960, y: 540 },
      
      // 常用UI位置
      'UI_TOP_LEFT': { x: 50, y: 50 },
      'UI_TOP_RIGHT': { x: 1770, y: 50 },
      'UI_BOTTOM_LEFT': { x: 50, y: 950 },
      'UI_BOTTOM_RIGHT': { x: 1770, y: 950 },
    };

    if (!(preset in positions)) {
      throw new Error(`Unknown preset position: ${preset}`);
    }

    return (positions as any)[preset];
  }

  /**
   * 计算两点之间的距离（像素）
   */
  public static distance(x1: number, y1: number, x2: number, y2: number): number {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
  }

  /**
   * 检查点是否在矩形区域内
   */
  public static isInRect(
    pointX: number, 
    pointY: number, 
    rectX: number, 
    rectY: number, 
    rectWidth: number, 
    rectHeight: number
  ): boolean {
    return pointX >= rectX && 
           pointX <= rectX + rectWidth && 
           pointY >= rectY && 
           pointY <= rectY + rectHeight;
  }

  /**
   * 将像素尺寸转换为 WC3 尺寸
   * @param pixelWidth 像素宽度
   * @param pixelHeight 像素高度
   * @returns WC3 尺寸 {width, height}
   */
  public static pixelSizeToWC3(pixelWidth: number, pixelHeight: number): { width: number; height: number } {
    return {
      width: (pixelWidth / ScreenCoordinates.STANDARD_WIDTH) * ScreenCoordinates.WC3_SCREEN_WIDTH,
      height: (pixelHeight / ScreenCoordinates.STANDARD_HEIGHT) * ScreenCoordinates.WC3_SCREEN_HEIGHT
    };
  }

  /**
   * 将 WC3 尺寸转换为像素尺寸
   * @param wc3Width WC3 宽度
   * @param wc3Height WC3 高度
   * @returns 像素尺寸 {width, height}
   */
  public static wc3SizeToPixel(wc3Width: number, wc3Height: number): { width: number; height: number } {
    return {
      width: Math.round((wc3Width / ScreenCoordinates.WC3_SCREEN_WIDTH) * ScreenCoordinates.STANDARD_WIDTH),
      height: Math.round((wc3Height / ScreenCoordinates.WC3_SCREEN_HEIGHT) * ScreenCoordinates.STANDARD_HEIGHT)
    };
  }
}