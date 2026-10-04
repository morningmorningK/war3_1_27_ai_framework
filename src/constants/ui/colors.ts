/**
 * UI颜色常量定义
 */

// 基础颜色
export const COLOR_WHITE = "#FFFFFF";
export const COLOR_BLACK = "#000000";
export const COLOR_RED = "#FF0000";
export const COLOR_GREEN = "#00FF00";
export const COLOR_BLUE = "#0000FF";
export const COLOR_YELLOW = "#FFFF00";
export const COLOR_CYAN = "#00FFFF";
export const COLOR_MAGENTA = "#FF00FF";

// 玩家颜色
export const PLAYER_COLOR_RED = "#FF0303";
export const PLAYER_COLOR_BLUE = "#0042FF";
export const PLAYER_COLOR_TEAL = "#1CE6B9";
export const PLAYER_COLOR_PURPLE = "#540081";
export const PLAYER_COLOR_YELLOW = "#FFFC01";
export const PLAYER_COLOR_ORANGE = "#FEBA0E";
export const PLAYER_COLOR_GREEN = "#20C000";
export const PLAYER_COLOR_PINK = "#E55BB0";
export const PLAYER_COLOR_GRAY = "#959697";
export const PLAYER_COLOR_LIGHT_BLUE = "#7EBFF1";
export const PLAYER_COLOR_DARK_GREEN = "#106246";
export const PLAYER_COLOR_BROWN = "#4E2A04";

// UI主题颜色
export const UI_COLOR_PRIMARY = "#1890FF";
export const UI_COLOR_SUCCESS = "#52C41A";
export const UI_COLOR_WARNING = "#FAAD14";
export const UI_COLOR_ERROR = "#FF4D4F";
export const UI_COLOR_INFO = "#1890FF";

// 透明度常量
export const ALPHA_TRANSPARENT = 0;
export const ALPHA_QUARTER = 64;
export const ALPHA_HALF = 128;
export const ALPHA_THREE_QUARTERS = 192;
export const ALPHA_OPAQUE = 255;

// 颜色工具函数
export class ColorUtils {
    /**
     * 将RGB值转换为十六进制颜色字符串
     */
    static rgbToHex(r: number, g: number, b: number): string {
        return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
    }

    /**
     * 将十六进制颜色转换为RGBA格式
     */
    static hexToRgba(hex: string, alpha: number = 255): { r: number, g: number, b: number, a: number } {
        // 移除#号
        const cleanHex = hex.replace("#", "");
        
        // 确保是6位十六进制
        if (cleanHex.length !== 6) {
            return { r: 0, g: 0, b: 0, a: alpha };
        }
        
        // 手动解析十六进制
        const r = parseInt(cleanHex.substring(0, 2), 16);
        const g = parseInt(cleanHex.substring(2, 4), 16);
        const b = parseInt(cleanHex.substring(4, 6), 16);
        
        return { r, g, b, a: alpha };
    }

    /**
     * 获取玩家颜色代码（用于文本着色）
     */
    static getPlayerColorCode(playerIndex: number): string {
        const colors = [
            "|cFFFF0303", // 红色
            "|cFF0042FF", // 蓝色
            "|cFF1CE6B9", // 青绿色
            "|cFF540081", // 紫色
            "|cFFFFFC01", // 黄色
            "|cFFFEBA0E", // 橙色
            "|cFF20C000", // 绿色
            "|cFFE55BB0", // 粉色
            "|cFF959697", // 灰色
            "|cFF7EBFF1", // 浅蓝色
            "|cFF106246", // 深绿色
            "|cFF4E2A04"  // 棕色
        ];
        return colors[playerIndex] || "|cFFFFFFFF"; // 默认白色
    }
}