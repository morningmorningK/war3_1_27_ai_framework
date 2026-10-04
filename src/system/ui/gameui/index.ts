/**
 * UI v1.6 移植（阶段 3 核心骨架）的入口。
 *
 * 用法（`src/main.ts` 的 `initialize()` 里）：
 *
 * ```ts
 * NativeUISystem.getInstance().create();
 * ```
 *
 * 与 `src/system/ui/component/` 下那几个组件一致，**走自身单例、不经 ModuleManager** ——
 * `main.ts` 的 UI 组件都是这个模式，不在这里破例。
 *
 * 热重载：`onHotReload()` 不自动注册（那需要 ModuleManager）。当前热重载对这套 UI
 * 是不安全的 —— 重建会重复创建同名 frame，而 japi 明确说销毁重复创建的 frame 会闪退。
 * 所以这里**故意**只提供一个显式调用口，需要时手动 destroy + create。
 */

export { NativeUISystem } from "./NativeUISystem";
export {
  FRAMEPOINT_BOTTOMRIGHT,
  FRAMEPOINT_TOPLEFT,
  clearFrameCache,
  frameByName,
  isValidFrame,
} from "./NativeFrames";
export * from "./layoutV3";

import { NativeUISystem } from "./NativeUISystem";
import { createLogger } from "src/utils/logger";

const log = createLogger("GameUI");

/**
 * 热重载入口。**没有**接自动热重载（见文件头说明），
 * 留在这里是为了将来要接的时候有个明确的落点。
 */
export function onHotReload(): void {
  log.warn("NativeUISystem 热重载未启用：重复创建同名 frame 有闪退风险");
}
