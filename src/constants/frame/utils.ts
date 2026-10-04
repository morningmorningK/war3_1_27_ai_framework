import { 
    FRAMEEVENT_CONTROL_CLICK, 
    FRAMEEVENT_MOUSE_ENTER, 
    FRAMEEVENT_MOUSE_LEAVE,
    FRAMEEVENT_MOUSE_UP,
    FRAMEEVENT_MOUSE_WHEEL,
    FRAMEEVENT_CHECKBOX_CHECKED,
    FRAMEEVENT_EDITBOX_TEXT_CHANGED
} from './events';
import { FrameEventHandler, FrameEventConfig } from './types';

/**
 * Frame事件工具类
 * 提供便捷的事件绑定方法
 */
export class FrameEventUtils {
    /**
     * 为Frame绑定点击事件
     * @param frame 目标Frame
     * @param handler 事件处理函数
     */
    static bindClickEvent(frame: any, handler: FrameEventHandler): void {
        DzFrameSetScriptByCode(frame.handle, FRAMEEVENT_CONTROL_CLICK, handler, true);
    }

    /**
     * 为Frame绑定鼠标进入事件
     * @param frame 目标Frame
     * @param handler 事件处理函数
     */
    static bindMouseEnterEvent(frame: any, handler: FrameEventHandler): void {
        DzFrameSetScriptByCode(frame.handle, FRAMEEVENT_MOUSE_ENTER, handler, true);
    }

    /**
     * 为Frame绑定鼠标离开事件
     * @param frame 目标Frame
     * @param handler 事件处理函数
     */
    static bindMouseLeaveEvent(frame: any, handler: FrameEventHandler): void {
        DzFrameSetScriptByCode(frame.handle, FRAMEEVENT_MOUSE_LEAVE, handler, true);
    }

    /**
     * 为Frame绑定鼠标松开事件
     * @param frame 目标Frame
     * @param handler 事件处理函数
     */
    static bindMouseUpEvent(frame: any, handler: FrameEventHandler): void {
        DzFrameSetScriptByCode(frame.handle, FRAMEEVENT_MOUSE_UP, handler, true);
    }

    /**
     * 为Frame绑定鼠标滚轮事件
     * @param frame 目标Frame
     * @param handler 事件处理函数
     */
    static bindMouseWheelEvent(frame: any, handler: FrameEventHandler): void {
        DzFrameSetScriptByCode(frame.handle, FRAMEEVENT_MOUSE_WHEEL, handler, true);
    }

    /**
     * 为Frame绑定复选框勾选事件
     * @param frame 目标Frame
     * @param handler 事件处理函数
     */
    static bindCheckboxCheckedEvent(frame: any, handler: FrameEventHandler): void {
        DzFrameSetScriptByCode(frame.handle, FRAMEEVENT_CHECKBOX_CHECKED, handler, true);
    }

    /**
     * 为Frame绑定文本变化事件
     * @param frame 目标Frame
     * @param handler 事件处理函数
     */
    static bindTextChangedEvent(frame: any, handler: FrameEventHandler): void {
        DzFrameSetScriptByCode(frame.handle, FRAMEEVENT_EDITBOX_TEXT_CHANGED, handler, true);
    }

    /**
     * 为Frame绑定多个事件
     * @param frame 目标Frame
     * @param events 事件配置对象
     */
    static bindEvents(frame: any, events: FrameEventConfig): void {
        if (events.onClick) {
            this.bindClickEvent(frame, events.onClick);
        }
        if (events.onMouseEnter) {
            this.bindMouseEnterEvent(frame, events.onMouseEnter);
        }
        if (events.onMouseLeave) {
            this.bindMouseLeaveEvent(frame, events.onMouseLeave);
        }
        if (events.onMouseUp) {
            this.bindMouseUpEvent(frame, events.onMouseUp);
        }
        if (events.onMouseWheel) {
            this.bindMouseWheelEvent(frame, events.onMouseWheel);
        }
        if (events.onCheckboxChecked) {
            this.bindCheckboxCheckedEvent(frame, events.onCheckboxChecked);
        }
        if (events.onTextChanged) {
            this.bindTextChangedEvent(frame, events.onTextChanged);
        }
    }

    /**
     * 移除Frame的所有事件绑定
     * @param frame 目标Frame
     */
    static unbindAllEvents(frame: any): void {
        // 清除所有事件绑定
        const events = [
            FRAMEEVENT_CONTROL_CLICK,
            FRAMEEVENT_MOUSE_ENTER,
            FRAMEEVENT_MOUSE_LEAVE,
            FRAMEEVENT_MOUSE_UP,
            FRAMEEVENT_MOUSE_WHEEL,
            FRAMEEVENT_CHECKBOX_CHECKED,
            FRAMEEVENT_EDITBOX_TEXT_CHANGED
        ];
        
        const emptyHandler = () => {};
        events.forEach(eventType => {
            DzFrameSetScriptByCode(frame.handle, eventType, emptyHandler, true);
        });
    }
}