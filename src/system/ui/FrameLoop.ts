/**
 * 「每帧」回调的统一入口。
 *
 * ## 为什么需要这一层
 *
 * KKWE 的 `DzFrameSetUpdateCallbackByCode(cb)` 是 **Set 不是 Add** —— 全局只有
 * **一个**回调槽，后注册的会**静默顶掉**先注册的：不报错、不崩溃，只是前一个不动了。
 * 仓库里第一个用户是 `UnitBlood`（世界坐标血条每帧跟着镜头走，`UnitBlood.ts:473`），
 * 它为此专门写了「只能注册一次、重复调用告警」的守卫。
 *
 * Buff 栏现在也要每帧刷新。**如果再直接调一次那个 native，血条会当场停止移动** ——
 * 所以「每帧」需求一律走这里：`onFrame()` 把回调收进列表，native 只被真正调用一次。
 *
 * ## 官方给这个回调定的规矩（`bzapi/action.txt:757-760`）
 *
 * 「注意，这个事件只会异步执行！帧数间隔不稳定，执行间隔也不同！
 *   这个事件不能注销，请勿重复注册！」
 *
 * 由此推出三条纪律：
 *
 * 1. 回调里只做**界面属性**操作（setText / setSize / show / hide / 读数据）。
 * 2. **不要**在这里 create / destroy frame 句柄 —— 建句柄、毁句柄属于同步逻辑，
 *    放到事件或定时器里去。Buff 栏就是这么分的：每帧只刷文字，槽位的**增删重建**
 *    仍然留在 0.1 秒的同步定时器里（见 `BuffBarUI.refreshPerFrame` 的注释）。
 * 3. 只增不减，没有 `off()` —— 因为 native 那头根本注销不掉。订阅者要自己判
 *    「我还活着吗」（`BuffBarUI` 就是判 `created`）。
 */

import { createLogger } from "src/utils/logger";

const log = createLogger("FrameLoop");

type FrameCallback = () => void;

/** 一个订阅者。`reportedError` 见 `invoke()` —— 异常只报一次，不然会每帧刷屏 */
interface FrameSubscriber {
  callback: FrameCallback;
  reportedError: boolean;
}

const subscribers: FrameSubscriber[] = [];
let registered = false;

/**
 * 把回调挂到每帧绘制上。**第一个订阅者**才触发 native 注册，之后只往列表里追加。
 *
 * 执行顺序 = 订阅顺序（先订阅的先跑）。
 */
export function onFrame(callback: FrameCallback): void {
  subscribers.push({ callback, reportedError: false });
  if (registered) return;

  registered = true;
  DzFrameSetUpdateCallbackByCode(() => {
    for (const s of subscribers) {
      invoke(s);
    }
  });
  log.info("每帧回调已注册");
}

export function isFrameLoopRunning(): boolean {
  return registered;
}

/**
 * 单个订阅者的隔离执行：一个订阅者抛异常，不能让后面的一起陪葬。
 *
 * 单独抽成函数、不把 try/catch 写在上面那个 for 里，是因为 tstl 有个已知的
 * 代码生成坑：`catch` 会被编成一个嵌套函数，函数里再出现 `continue` 时生成的
 * `goto` 找不到标签，整个 `.lua` 加载失败（表现是原生闪退）。这里没有 `continue`，
 * 但少一个坑少一分风险。
 *
 * 异常**只报一次**：帧回调是每帧都跑的，每次都报会把日志刷爆，反而盖住真正的原因。
 */
function invoke(subscriber: FrameSubscriber): void {
  try {
    subscriber.callback();
  } catch (e) {
    if (subscriber.reportedError) return;
    subscriber.reportedError = true;
    log.error(`每帧回调抛出异常（后续不再重复报同一处）：${e}`);
  }
}
