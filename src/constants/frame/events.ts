/**
 * Frame事件常量定义
 * 用于Frame UI事件处理
 */

// ============================================
// 键盘按键常量 (用于 registerPlayerKeyEvent)
// ============================================

/**
 * 功能键 F1-F12
 */
export const KEY_F1 = 0x70;
export const KEY_F2 = 0x71;
export const KEY_F3 = 0x72;
export const KEY_F4 = 0x73;
export const KEY_F5 = 0x74;
export const KEY_F6 = 0x75;
export const KEY_F7 = 0x76;
export const KEY_F8 = 0x77;
export const KEY_F9 = 0x78;
export const KEY_F10 = 0x79;
export const KEY_F11 = 0x7A;
export const KEY_F12 = 0x7B;

/**
 * 数字键 0-9 (主键盘区)
 */
export const KEY_0 = 0x30;
export const KEY_1 = 0x31;
export const KEY_2 = 0x32;
export const KEY_3 = 0x33;
export const KEY_4 = 0x34;
export const KEY_5 = 0x35;
export const KEY_6 = 0x36;
export const KEY_7 = 0x37;
export const KEY_8 = 0x38;
export const KEY_9 = 0x39;

/**
 * 小键盘数字键 0-9
 */
export const KEY_NUMPAD0 = 0x60;
export const KEY_NUMPAD1 = 0x61;
export const KEY_NUMPAD2 = 0x62;
export const KEY_NUMPAD3 = 0x63;
export const KEY_NUMPAD4 = 0x64;
export const KEY_NUMPAD5 = 0x65;
export const KEY_NUMPAD6 = 0x66;
export const KEY_NUMPAD7 = 0x67;
export const KEY_NUMPAD8 = 0x68;
export const KEY_NUMPAD9 = 0x69;

/**
 * 字母键 A-Z
 */
export const KEY_A = 0x41;
export const KEY_B = 0x42;
export const KEY_C = 0x43;
export const KEY_D = 0x44;
export const KEY_E = 0x45;
export const KEY_F = 0x46;
export const KEY_G = 0x47;
export const KEY_H = 0x48;
export const KEY_I = 0x49;
export const KEY_J = 0x4A;
export const KEY_K = 0x4B;
export const KEY_L = 0x4C;
export const KEY_M = 0x4D;
export const KEY_N = 0x4E;
export const KEY_O = 0x4F;
export const KEY_P = 0x50;
export const KEY_Q = 0x51;
export const KEY_R = 0x52;
export const KEY_S = 0x53;
export const KEY_T = 0x54;
export const KEY_U = 0x55;
export const KEY_V = 0x56;
export const KEY_W = 0x57;
export const KEY_X = 0x58;
export const KEY_Y = 0x59;
export const KEY_Z = 0x5A;

/**
 * 方向键
 */
export const KEY_LEFT = 0x25;
export const KEY_UP = 0x26;
export const KEY_RIGHT = 0x27;
export const KEY_DOWN = 0x28;

/**
 * 控制键
 */
export const KEY_ESCAPE = 0x1B;
export const KEY_ENTER = 0x0D;
export const KEY_SPACE = 0x20;
export const KEY_TAB = 0x09;
export const KEY_BACKSPACE = 0x08;
export const KEY_DELETE = 0x2E;
export const KEY_INSERT = 0x2D;
export const KEY_HOME = 0x24;
export const KEY_END = 0x23;
export const KEY_PAGEUP = 0x21;
export const KEY_PAGEDOWN = 0x22;

/**
 * 修饰键
 */
export const KEY_SHIFT = 0x10;
export const KEY_CTRL = 0x11;
export const KEY_ALT = 0x12;
export const KEY_CAPSLOCK = 0x14;

/**
 * 小键盘运算符
 */
export const KEY_NUMPAD_MULTIPLY = 0x6A;
export const KEY_NUMPAD_ADD = 0x6B;
export const KEY_NUMPAD_SUBTRACT = 0x6D;
export const KEY_NUMPAD_DECIMAL = 0x6E;
export const KEY_NUMPAD_DIVIDE = 0x6F;

/**
 * 按键元状态 (用于 metaKey 参数)
 */
export const META_KEY_NONE = 0;
export const META_KEY_SHIFT = 1;
export const META_KEY_CTRL = 2;
export const META_KEY_ALT = 4;
export const META_KEY_SHIFT_CTRL = 3;
export const META_KEY_SHIFT_ALT = 5;
export const META_KEY_CTRL_ALT = 6;
export const META_KEY_SHIFT_CTRL_ALT = 7;

// ============================================
// Frame事件常量
// ============================================

/**
 * 当控件（如按钮）被点击时触发
 */
export const FRAMEEVENT_CONTROL_CLICK = 1;

/**
 * 当鼠标光标移入框架区域时触发
 */
export const FRAMEEVENT_MOUSE_ENTER = 2;

/**
 * 当鼠标光标移出框架区域时触发
 */
export const FRAMEEVENT_MOUSE_LEAVE = 3;

/**
 * 当鼠标按钮在框架上松开时触发
 */
export const FRAMEEVENT_MOUSE_UP = 4;

/**
 * 当在框架上滚动鼠标滚轮时触发
 */
export const FRAMEEVENT_MOUSE_WHEEL = 5;

/**
 * 当复选框被勾选时触发（适用于复选框控件）
 */
export const FRAMEEVENT_CHECKBOX_CHECKED = 6;

/**
 * 当编辑框内的文本发生变化时触发
 */
export const FRAMEEVENT_EDITBOX_TEXT_CHANGED = 7;

/**
 * Frame事件类型枚举
 */
export enum FrameEventType {
    CONTROL_CLICK = FRAMEEVENT_CONTROL_CLICK,
    MOUSE_ENTER = FRAMEEVENT_MOUSE_ENTER,
    MOUSE_LEAVE = FRAMEEVENT_MOUSE_LEAVE,
    MOUSE_UP = FRAMEEVENT_MOUSE_UP,
    MOUSE_WHEEL = FRAMEEVENT_MOUSE_WHEEL,
    CHECKBOX_CHECKED = FRAMEEVENT_CHECKBOX_CHECKED,
    EDITBOX_TEXT_CHANGED = FRAMEEVENT_EDITBOX_TEXT_CHANGED
}