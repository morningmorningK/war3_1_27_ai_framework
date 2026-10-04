/**
 * 事件系统模块
 * 
 * 提供通用的事件订阅/发布机制，支持：
 * - EventEmitter: 通用事件发射器基类
 * - EventBus: 全局事件总线
 * - MouseEventManager: 鼠标事件管理
 * - KeyboardEventManager: 键盘事件管理
 * - GameEventManager: 游戏事件管理
 * 
 * @example
 * ```typescript
 * // 使用全局事件总线
 * import { eventBus } from "./system/event";
 * eventBus.on("custom:event", (data) => {
 *   print(`Received: ${data}`);
 * });
 * eventBus.emit("custom:event", { value: 42 });
 * 
 * // 使用鼠标事件管理器
 * import { mouseEvents, MouseButton } from "./system/event";
 * mouseEvents.initialize();
 * mouseEvents.onMouseDown((data) => {
 *   print(`Mouse down at ${data.screenX}, ${data.screenY}`);
 * }, MouseButton.LEFT);
 * 
 * // 使用键盘事件管理器
 * import { keyboardEvents, KeyCode } from "./system/event";
 * keyboardEvents.onKeyDown((data) => {
 *   print(`Key pressed: ${data.keyCode}`);
 * }, KeyCode.SPACE);
 * 
 * // 使用游戏事件管理器
 * import { gameEvents } from "./system/event";
 * gameEvents.onUnitDeath((data) => {
 *   print(`Unit died: ${GetUnitName(data.unit)}`);
 * });
 * ```
 */

// 基础类
export { EventEmitter, EventHandler, SubscribeOptions } from "./EventEmitter";
export { EventBus, eventBus } from "./EventBus";

// 鼠标事件
export { 
  MouseEventManager, 
  mouseEvents,
  MouseButton,
  MouseEventType,
  MouseEventData,
  MouseEventHandler,
} from "./MouseEvent";

// 键盘事件
export {
  KeyboardEventManager,
  keyboardEvents,
  KeyEventType,
  KeyEventData,
  KeyEventHandler,
  KeyCode,
} from "./KeyboardEvent";

// 游戏事件
export {
  GameEventManager,
  gameEvents,
  GameEventType,
  UnitEventData,
  UnitDeathEventData,
  UnitDamageEventData,
  UnitSummonedEventData,
  SpellEventData,
  PlayerChatEventData,
  GameEventHandler,
} from "./GameEvent";
