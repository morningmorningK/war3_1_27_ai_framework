/**
 * 聊天框 —— 自建面板 + 玩家聊天接线 + 消息分类出口。
 *
 * ## 分工
 *
 * - **本文件**：摆在哪、什么时候建、消息分几类各是什么颜色、面板收起/展开的状态
 * - `src/system/console.ts`：消息的**出口**（`Console.say/log/warn/error`，带队列节流）
 * - `src/system/ui/component/MessageList.ts`：消息的**渲染**（面板、上滑、可见窗口）
 * - `src/system/ui/chatChannel.ts`：频道枚举本身（`console.ts` 也要用，单独放避免成环）
 *
 * 后两个文件在本轮之前是**一次都没被调用过**的休眠代码，本文件是第一个调用方。
 *
 * ## 给别的系统用的出口
 *
 * `todo.md` 的「对接其他系统说明」要求系统消息统一走聊天框，所以对外只暴露三个
 * **语义化**入口（不要直接去调 `Console.say` 拼颜色）：
 *
 * ```ts
 * ChatBoxUI.system("锻造成功：+3 攻击");
 * ChatBoxUI.combat("造成 123 点伤害");
 * ChatBoxUI.warn("材料不足");
 * ```
 *
 * 前缀与配色集中在 `CHANNEL_STYLES` 一张表里，加新类别只改那张表。
 *
 * ## 与原生聊天区的关系
 *
 * 用户已确认原生聊天区不再可见，所以这里**不写任何隐藏原生的代码**，
 * 只把一个深色半透明面板摆在原生聊天区那块位置上（下面两个实测坐标就是这么来的）。
 * 玩家聊天由 `bindPlayerChat` 自己转发进面板，所以盖住原生不会丢消息。
 *
 * ⚠️ 面板底色是 `UIBackgrounds.BLACK_TRANSPARENT`（半透明），不是纯不透明。
 * 若哪天发现原生聊天文字透过面板还能看见，就得把底色换成不透明的图 ——
 * 但注意**不要**改成去 `DzFrameShow` 藏那个原生 frame：实测
 * `DzFrameGetChatMessage()` 返回的是个**无父级、0×0 的纯锚点帧**（九个锚点里只有
 * T/L/R/B 有效且全是相对锚点），它自己没东西可藏，藏了也不会有效果。
 *
 * ## 布局常量（两个实测、两个旋钮）
 *
 * | 值 | 出处 |
 * |---|---|
 * | `PANEL_X = 12` | **实测**：原生聊天区左边界 = `ConsoleUI.x + 0.00625`，× 1920 |
 * | `PANEL_BOTTOM_Y = 864` | **实测**：原生聊天区下边界 = `ConsoleUI.y + 0.2`，× 1080 从底部量起 |
 * | `PANEL_WIDTH = 480` | 旋钮。原生那个 frame 横跨近乎整个屏宽（右边界 = `ConsoleUI.x − 0.02`），但文字左对齐，面板没必要那么宽 |
 * | `PANEL_HEIGHT = 320` | 旋钮。让出筛选条那 34 像素后，消息区剩 286；每条按内容高 20~100（`MESSAGE_MAX_LINES = 5` 行是上限）⇒ **一屏几条不固定**，多出来的靠滚动看 |
 *
 * ## 面板上的三样零件
 *
 * | 零件 | 位置 | 建它的方法 |
 * |---|---|---|
 * | 筛选条（5 个单选按钮） | 面板内部**最顶端**一条 | `createFilterBar` |
 * | 滑块条（轨道 + 可拖把手） | 面板**右边缘** | `createScrollBar` |
 * | 滚轮命中框（透明） | 铺满整个面板 | `createWheelHitFrame` |
 *
 * 消息区的宽度和高度是按 `MessageListConfig.insetTop / insetRight` 让出来的，
 * **不改 `Panel` 本身** —— `MessageList` 自己会算，行数也自动跟着变少一行。
 *
 * ⚠️ **三样都必须设 `DzFrameSetPriority`**（见 `PRIORITY_*`）。自建浮层的层序**不靠创建顺序**，
 * 不设的话「谁压着谁」全看运气 —— 命中框压住筛选按钮就是「按钮建得出来、尺寸对、点不到」。
 *
 * ## 收起 / 展开：贴在面板右边缘的箭头
 *
 * 不在右上角那列按钮里，而是**一个贴在面板右边缘上的窄条**（`←` / `→`）。
 * 点一下整体向左平移出屏幕，再点一下平移回来。
 *
 * 几个关键取舍：
 *
 * 1. **面板上的每一根 chrome 都不是面板的子节点。** 面板要滑出屏幕，箭头得留在屏幕上
 *    接着能被点到，所以它们都是各自独立的 frame，滑动时由 `applySlide()` **一起搬** ——
 *    ⚠️ **往面板上加新零件时，必须把它挂进 `applySlide()`**，漏了的那个会在收起后
 *    孤零零留在屏幕左边（它的「家」坐标是正的，只有减 `slideOffset` 才会跟着走）。
 * 2. **收起位置 = 平移 `PANEL_X + PANEL_WIDTH` 像素**，正好把面板**整个推出左边缘**
 *    （收起后右边界落在 x = 0），同时箭头框正好落在 x = 0，屏幕最左一条。
 * 3. **平移走 `MessageList.setSlideOffset()`，不走 `setPosition()`。** 后者每次都会起一个
 *    10ms 的 Y 动画定时器，而这是 50Hz 逐帧调用的。理由详见那个方法的注释。
 * 4. **滑动过程中不隐藏面板**，只在滑到底那一刻才 `setVisible(false)` ——
 *    半路隐藏会变成「板没了但还在动」。
 * 5. **chrome 一律走 `setPositionUnclamped`。** 收起时算出来的 x 是负的，
 *    `pixelToWC3` 会把它们全按在 x = 0 上。为此给 `Button` 补了 `setPositionUnclamped`
 *    （`Panel` / `Text` 上一轮就有了）。
 */

import { Frame, FRAME_ALIGN_LEFT_TOP, FRAME_ALIGN_RIGHT_BOTTOM, MapPlayer } from "@eiriksgata/wc3ts/*";
import { Console } from "src/system/console";
import { gameEvents } from "src/system/event";
import { PlayerChatEventData } from "src/system/event/GameEvent";
import { ScreenCoordinates } from "src/system/ui/ScreenCoordinates";
import { FrameEventUtils } from "src/constants/frame/utils";
import { createLogger } from "src/utils/logger";
import { CameraControl } from "src/utils/CameraControl";
import { Button } from "./component/Button";
import { MessageList } from "./component/MessageList";
import { FontSizes } from "./component/Text";
import { ChatChannel } from "./chatChannel";

const log = createLogger("ChatBoxUI");

/** 频道枚举搬去了 `chatChannel.ts`（`console.ts` 也要用它，留在本文件会成环），
 *  这里转出去，历史调用点的 `from "./ChatBoxUI"` 不用改 */
export { ChatChannel };

// ---------------------------------------------------------------------------
// 布局（像素，基准 1920x1080，原点左上 —— 见 ScreenCoordinates 的约定）
// ---------------------------------------------------------------------------

const PANEL_X = 12;
const PANEL_BOTTOM_Y = 864;
const PANEL_WIDTH = 480;
const PANEL_HEIGHT = 320;

/** `MessageList` 要的是左上角 y，而我们手里的是底边，转换一次就够，不要在调用点算 */
const PANEL_Y = PANEL_BOTTOM_Y - PANEL_HEIGHT;

// ---------------------------------------------------------------------------
// 收起箭头（贴在面板右边缘的窄条）
// ---------------------------------------------------------------------------

const TAB_WIDTH = 28;
const TAB_HEIGHT = 56;

/** 展开时贴在面板**右边缘**：x ∈ [492, 520]，正好在面板外面（面板到 492 为止） */
const TAB_X = PANEL_X + PANEL_WIDTH;

/** 垂直居中于面板 */
const TAB_Y = PANEL_Y + (PANEL_HEIGHT - TAB_HEIGHT) / 2;

/**
 * 收起时面板整体向左平移的像素数。
 *
 * = 面板左边界 + 面板宽度 ⇒ 把面板**整个推出屏幕左边缘**（收起后右边界正好落在 x = 0），
 * 同时箭头框从 `TAB_X`(492) 挪到 `TAB_X - SLIDE_DISTANCE` = **0**，即屏幕最左边一条。
 */
const SLIDE_DISTANCE = PANEL_X + PANEL_WIDTH;

/**
 * 箭头字符。
 *
 * **用 `←` / `→`，不要换成 `◀` / `▶`**:后者在 Unicode 的 Geometric Shapes 区，
 * 中文字体不一定收，会渲染成豆腐块；`←`/`→` 属 GB2312 第一区，任何中文字体都带。
 * 万一实测还是方框，就把下面两行换成 ASCII 的 `<` / `>`（全仓只有这两处要改）。
 *
 * 方向语义 = **面板接下来往哪边动**：展开时显示 `←`（点了会向左收起），
 * 收起时显示 `→`（点了会向右展开）。
 */
const ARROW_COLLAPSE = "←";
const ARROW_EXPAND = "→";

const TAB_FONT_SIZE_PX = 14;
const TAB_COLOR = "FFFFFF";

// ---------------------------------------------------------------------------
// 筛选条（面板内部最顶端的一排单选按钮）
// ---------------------------------------------------------------------------

const FILTER_BAR_PAD_TOP = 6;
const FILTER_BUTTON_HEIGHT = 22;
const FILTER_BUTTON_GAP = 4;

/**
 * 按钮宽 = (面板内宽 − 左右各 7 的边距 − 4 个间隙) / 5。
 * 480 − 14 − 16 = 450，再 / 5 = 90，整除，不会在右边留一条参差的缝。
 */
const FILTER_BUTTON_WIDTH = 90;
const FILTER_BUTTON_PITCH = FILTER_BUTTON_WIDTH + FILTER_BUTTON_GAP;

/** 第一个按钮的 x：面板左边距 7 */
const FILTER_BUTTON_X0 = PANEL_X + 7;
const FILTER_BUTTON_Y = PANEL_Y + FILTER_BAR_PAD_TOP;

const FILTER_FONT_SIZE_PX = 13;
const FILTER_COLOR_ACTIVE = "00FF00";
const FILTER_COLOR_IDLE = "808080";

/**
 * 消息区顶部要让出的高度 = 上边距 + 按钮高 + 下边距。
 * 让完之后消息区剩 320 − 34 = 286 像素。
 */
const MESSAGE_INSET_TOP = FILTER_BAR_PAD_TOP + FILTER_BUTTON_HEIGHT + 6;

/**
 * **一条消息最多显示几行**（`MessageList` 拿它当折行的上限）。
 *
 * ## 高度是**按内容**给的，这个数只管截断
 *
 * 每条消息的 frame 高度 = `折出来的行数 × 20`（`MessageList.LINE_HEIGHT_PX`）：
 * 一句 10 个字的系统提示就占 20 像素，一条要折 4 行的战斗日志就占 80。
 * 所以**不再是「每条都占 60」** —— 这就是「按内容动态高度」的意思，
 * 一屏放几条也随之不固定（全是短消息能放十几条，全是长消息只放两三条）。
 *
 * 演变过程（前两档都建立在「每条等高」的旧模型上）：
 *
 * | 值 | 含义 | 谁提的 |
 * |---|---|---|
 * | 30 / 40 | 每条等高 30 / 40 | 初版 —— 长消息第二行被裁，报成「消息不换行」 |
 * | 60 | 每条等高 60 ＝ 3 行 | 用户：「消息最长定义成三行吧」 |
 * | **5 行** | **上限 5 行，短消息更矮** | 用户：「不限行数…所有消息都显示（最多 5 行）」 |
 *
 * ⚠️ 为什么**不能真的不限行数**：一条消息的 frame 是一个 `Text`，
 * 它必须拿到一个矩形（两个对角点，或一个点 + 尺寸）才会折行 ——
 * 只给一个点时永远是单行。高度得**事先**算准，算多少就画多少，
 * 超出的部分落在 frame 外面被引擎**无声裁掉**。所以「不限行数」在渲染上
 * 等价于「给一个够大的死高度」，一条上千字的公告就会把整块面板吃掉。
 * 上限 5 行（100 像素）是「看得全」和「别一条顶满屏」之间的折中。
 *
 * ## 折行是 `MessageList` 自己做的，不是引擎折的
 *
 * 引擎只在**空格**处折，中文整段没有空格 ⇒ 会被当成一个「词」整块推到第二行，
 * 第一行后半截直接白扔（用户报的「换行不彻底」）。所以 `MessageList.wrapMessage()`
 * 按宽度自己切、切到第 `MESSAGE_MAX_LINES` 行就在行尾补「…」。
 *
 * 想整体调疏密（一屏放几条），改的是 `MessageList.LINE_HEIGHT_PX`（一行多高），
 * 不是这个数 —— 这个数只决定长消息截在第几行。
 */
const MESSAGE_MAX_LINES = 5;

interface FilterTabSpec {
  label: string;
  /** `null` = 全部。其余就是 `ChatChannel` 的字符串值 */
  tag: string | null;
}

/** **顺序即左到右的排列顺序**，`filterButtons` 与它同序 */
const FILTER_TABS: FilterTabSpec[] = [
  { label: "全部", tag: null },
  { label: "玩家", tag: ChatChannel.PLAYER },
  { label: "系统", tag: ChatChannel.SYSTEM },
  { label: "战斗", tag: ChatChannel.COMBAT },
  { label: "警告", tag: ChatChannel.WARNING },
];

// ---------------------------------------------------------------------------
// 滑块条（面板右边缘）
// ---------------------------------------------------------------------------

const TRACK_WIDTH = 8;
/** 轨道离面板右边缘 4 像素 */
const TRACK_X = PANEL_X + PANEL_WIDTH - 4 - TRACK_WIDTH;
const TRACK_Y = PANEL_Y + MESSAGE_INSET_TOP;
const TRACK_HEIGHT = PANEL_HEIGHT - MESSAGE_INSET_TOP;

/** 把手再矮也得有这么大，否则「只剩 2 行可滚」时它细成一根线，点都点不中 */
const THUMB_MIN_HEIGHT = 24;

/**
 * 轨道 / 把手的贴图。
 *
 * ⚠️ **两张都不能再用面板自己那张** —— 一开始「滑块看不到」就是这个：
 *
 *   | 零件 | 原来用的 | 为什么看不见 |
 *   |---|---|---|
 *   | 轨道 | `BLACK_TRANSPARENT` | 面板底板**就是这张**，同色同透明度叠上去等于没画 |
 *   | 把手 | `SHUIMO_STYLE_PANEL_BACKGROUND` | 那是给 480x320 的大面板画的，压成 8 像素宽的一条几乎看不出边界 |
 *
 * **轨道用 `health.blp`**（纯红、64x16、**已在游戏里验证过能取到**，见
 * `gameui/layoutV3.ts` 的 `HEALTH_BAR_TEXTURE`）—— 这一半现在是好的，截图里
 * 面板右边那条红竖条就是它。
 *
 * ⚠️ **把手别再用 `ESC_MENU`** —— 那是个 `hint`，不是已验证的路径。实测
 * 换成 `ESC_MENU`（`UI\Widgets\EscMenu\Human\human-options-menu-background.blp`）之后
 * **轨道能看见、把手整条不见**，红竖条从头到尾一个颜色，说明那张贴图没取到（取不到时
 * `DzFrameSetTexture` 不会报错，只是什么都不画）。现在改用 `BLACK_TRANSPARENT`
 * （= `UI\Widgets\EscMenu\Human\editbox-background.blp`）—— **`Panel` 的底板就是这一张，
 * 面板本身在截图里画得出来**，是本仓唯一「肉眼验证过能取到」的深色贴图。
 * 红底压黑把手，两截对比也最强。
 *
 * 观感上确实很扎眼，不精致 —— 但那总比看不见强，配色以后有需要再调。
 * `Button` 没有暴露 `setAlpha`，所以调不出「暗轨道 + 亮把手」的常规效果，只能靠选色。
 *
 * ⚠️ **不要改回去用 `Texture\ui\bars\blue.blp`** —— 那个文件在工程里
 *（`maps/resource/Texture/ui/bars/blue.blp`），但 **`maps/table/imp.ini` 里登记的
 * 还是改名前的 `mana.blp`**（第 46 行），也就是说 `blue.blp` **根本没被打进地图**，
 * 引用它只会得到一张取不到的贴图。那个悬空条目是 `layoutV3.ts` 里「蓝条渲染成队伍色」
 * 那个悬案的头号嫌疑，但那是另一件事，没验证过就先不动构建配置。
 */
const TRACK_TEXTURE = "Texture\\ui\\bars\\health.blp";
const THUMB_TEXTURE_PRESET = "BLACK_TRANSPARENT";

/** 消息区右侧让出 = 轨道左边缘到面板右边缘的距离，再加 4 像素间隙 */
const MESSAGE_INSET_RIGHT = (PANEL_X + PANEL_WIDTH - TRACK_X) + 4;

/**
 * 滚轮命中框的矩形 —— **只铺消息区，绝不能铺满整个面板**。
 *
 * ⚠️ 这正是用户报的「点上面的按钮没有反应」的原因。这块透明 `BUTTON` 原来盖的是
 * 整个面板，把筛选条的点击全吃掉了。它的 priority(880) 比筛选按钮(895)低，
 * 本该压不住 —— 但实测就是压住了，所以别再靠档位差，**直接把矩形让开**。
 *
 * 旁证：为什么同一排 chrome 里只有**收起箭头**点得动？因为箭头在
 * `TAB_X = 492`、面板右边缘**之外**，是唯一没被这块 frame 压住的零件。症状与它逐条吻合。
 *
 * 右侧同时让出 `MESSAGE_INSET_RIGHT`：滑块那一列不能被压住，否则把手拖不动。
 * 代价是「光标停在最右那 16 像素上滚滚轮」不翻页 —— 换把手拖得动，值。
 */
const HIT_X = PANEL_X;
const HIT_Y = PANEL_Y + MESSAGE_INSET_TOP;
const HIT_WIDTH = PANEL_WIDTH - MESSAGE_INSET_RIGHT;
const HIT_HEIGHT = PANEL_HEIGHT - MESSAGE_INSET_TOP;

/**
 * 滚轮一格翻几条。
 *
 * 单位是**条**不是行 —— 动态高度下每条占的高度都不一样，没法用行来数。
 * 3 条大致相当于旧模型里的 3 行，一格滚过去手感是连续的，不会看着像跳了一屏。
 */
const WHEEL_STEPS_PER_NOTCH = 3;

/**
 * `DzGetWheelDelta() > 0`（往上滚）是不是「看更早的消息」。
 *
 * ⚠️ **这个方向没有实测过** —— 滚反了就把它改成 `false`，别处一个字都不用动。
 */
const WHEEL_UP_MEANS_HISTORY = true;

// ---------------------------------------------------------------------------
// 层级（`DzFrameSetPriority`）
// ---------------------------------------------------------------------------

/**
 * ⚠️ **自建浮层的层序不靠创建顺序，靠 priority**（跨子树尤其如此 —— 见仓库记忆里
 * 「自建浮层必须设 DzFrameSetPriority」那条）。所以这里把五个数字一次定死，
 * 不依赖任何「后建的在上层」的假设：
 *
 * | 层 | 值 | 说明 |
 * |---|---|---|
 * | 透明的滚轮命中框 | 880 | **只铺消息区**（`HIT_*`），所以它本来就压不到别人 |
 * | 轨道 | 881 | 只在命中框之上一点，反正它也不需要点 |
 * | 把手 | 890 | 要被拖到 |
 * | 筛选按钮 | 895 | 要被点到 |
 * | 收起箭头 | 900 | 面板收到底时它正好落在屏幕最左边，不能被别的东西盖住 |
 *
 * ⚠️ **别再指望这组档位差来让点击穿透**。原来「命中框铺满整个面板、靠 880 < 895
 * 保证筛选按钮点得到」的设计**实测失败了** —— 筛选按钮点不动，而唯一点得动的箭头
 * 恰好是唯一不重叠的零件。现在改成让矩形不重叠（见 `HIT_*`），这组数字只负责
 * 命中框和 chrome 彼此之间的层序。
 */
const PRIORITY_WHEEL_HIT = 880;
const PRIORITY_TRACK = 881;
const PRIORITY_THUMB = 890;
const PRIORITY_FILTER = 895;
const PRIORITY_TAB = 900;

// ---------------------------------------------------------------------------
// 滑动动画
// ---------------------------------------------------------------------------

/** 每步间隔（秒）。50Hz —— 与 `DamageTexttag` 的池更新同频 */
const SLIDE_INTERVAL = 0.02;

/** 总时长（秒）。12 步 × 41 像素，0.24 秒滑完 492 像素 */
const SLIDE_DURATION = 0.24;

/** 总步数。492 / 12 = 41 **整除**，所以最后一帧会**精确**落在目标上，不会差几像素收不干净 */
const SLIDE_STEPS = Math.round(SLIDE_DURATION / SLIDE_INTERVAL);

// ---------------------------------------------------------------------------
// 字体
// ---------------------------------------------------------------------------

/**
 * **必须给字体**。不给的话 `Text` 会退回引擎默认字体，那个字号很大，宽 480 的
 * 面板一行只放得下十来个汉字 —— 实测 `[系统] 聊天框自检：这条走 log，应为绿色`
 * 被硬截成「这条走」。
 *
 * 路径与 `FpsDisplay` / `Button` 用的是同一支（能渲染中文，已在游戏里验证过）。
 */
const FONT_PATH = "resource\\Texture\\ui\\hpbar\\ZiTi.TTf";

/** 0.010 就是 `FontSizes.SMALL`，也是 `FpsDisplay` 用的那个已验证的字号 */
const FONT_SIZE = FontSizes.SMALL;

// ---------------------------------------------------------------------------
// 消息分类（配色抄 `todo.md` §0.1.2）
// ---------------------------------------------------------------------------

interface ChannelStyle {
  /** 前缀，拼在正文前面 */
  prefix: string;
  /** 十六进制颜色，**不含 `#`、不含 `|cff`** —— `Text` 组件自己会拼 `|cff` */
  color: string;
}

/**
 * 分类 → 样式。
 *
 * 这里**只有前缀和颜色**了 —— 原本还有一个 `duration`（停留秒数），消息改成
 * 「不消失、只按条数淘汰」之后它就成了假话，删掉了。现在留多久由
 * `MessageListConfig.perChannelLimit`（每类各 50 条）说了算。
 *
 * ⚠️ **加新类别要同时改 `ChatChannel` 和这张表**，少写一边 `push` 会静默丢弃
 * （下面有 `undefined` 兜底，不抛异常）。筛选条上的类别按钮也在这张表之后摆
 * （见 `createFilterBar`），加类别时三处都要动。
 */
const CHANNEL_STYLES: Record<ChatChannel, ChannelStyle> = {
  // 前缀不写死名字 —— 玩家消息的前缀是 `[玩家名]: `，在 onPlayerChat 里现拼
  [ChatChannel.PLAYER]: { prefix: "", color: "FFFFFF" },
  [ChatChannel.SYSTEM]: { prefix: "[系统] ", color: "FFFF00" },
  [ChatChannel.COMBAT]: { prefix: "[战斗] ", color: "808080" },
  [ChatChannel.WARNING]: { prefix: "[警告] ", color: "FF0000" },
};

export class ChatBoxUI {
  private static instance: ChatBoxUI | undefined;

  /**
   * 面板是否展开。默认展开 —— 与「刚建出来就看得见」的实际行为逐字一致。
   * 开关是面板右边缘那个箭头（下面 `toggleCollapsedAnimated`），不再放右上角按钮列。
   */
  private static panelVisible = true;

  /**
   * 箭头框。**静态**，因为滑动是静态方法在驱动（`applySlide` 每帧都要搬它）。
   * 面板建失败时它是 `null`，所有用到它的地方都判空。
   */
  private static tabButton: Button | null = null;

  /** 当前横向位移：0 = 展开到位，`SLIDE_DISTANCE` = 收起到底 */
  private static slideOffset = 0;

  /** 滑动定时器。`null` = 没在滑 */
  private static slideTimer: timer | null = null;

  /** 筛选条的 5 个按钮，与 `FILTER_TABS` 同序。面板建失败时是空数组 */
  private static filterButtons: Button[] = [];

  /** 当前筛选项。`null` = 全部。这是**权威状态**，按钮配色只是它的投影 */
  private static activeFilter: string | null = null;

  /** 滑块轨道。装饰用，不接事件（用 `Button` 只是为了白拿 `setPositionUnclamped` 那套） */
  private static trackButton: Button | null = null;

  /**
   * 滑块把手。**`setDraggable(true)` 之后它的 `onClick` 就永远不会触发了** ——
   * `Button.setupEventListeners` 把 onClick 拦在 `!this.isDraggable` 后面。
   * 这里只需要拖，正好；但别再指望给它挂点击。
   */
  private static thumbButton: Button | null = null;

  /** 消息区那块透明的滚轮命中框。**它只负责接滚轮 + 记进出，别的什么都不接** */
  private static wheelHitFrame: Frame | null = null;

  /** 光标当前在不在聊天面板上。由命中框的 `MOUSE_ENTER`/`MOUSE_LEAVE` 维护 */
  private static hoveringPanel = false;

  /** 帧级滚轮事件**响过至少一次**。一旦为真，全局那条兜底路就永久退休。见 `onGlobalMouseWheel` */
  private static frameWheelWorks = false;

  /** 全局滚轮兜底用的触发器。`null` = 还没建 */
  private static wheelTrigger: trigger | null = null;

  /**
   * `syncThumb` 的写去重缓存。
   *
   * 重排一秒能跑十几次（每条消息入队一次、每次滚动一次），但「够不够一屏」和
   * 「把手多高」这两件事几乎从不变化 —— 每次都写一遍就是白烧原生调用。
   * 同一个思路见 `MessageList.setItemShown`。
   *
   * ⚠️ **位置不在缓存里** —— `applySlide` 也会搬把手的 X，缓存会和它打架。
   */
  private static lastTrackShown: boolean | null = null;
  private static lastThumbShown: boolean | null = null;
  private static lastThumbHeight = -1;

  /**
   * 面板收到底时 chrome（筛选条 + 滑块）**已经藏起来**。
   * 缓存这个是为了让 `applyChromeVisibility` 能像 `syncThumb` 那样「只写变化了的那些」——
   * 滑动过程中它每帧都会被调到。
   */
  private static chromeHidden = false;

  private created = false;
  private bound = false;

  private constructor() {}

  public static getInstance(): ChatBoxUI {
    if (!ChatBoxUI.instance) {
      ChatBoxUI.instance = new ChatBoxUI();
    }
    return ChatBoxUI.instance;
  }

  /** 建面板。由 `main.ts` 的 `initialize()` 调一次。 */
  public create(): void {
    if (this.created) {
      log.warn("已创建过，重复调用被忽略");
      return;
    }
    this.created = true;

    Console.init(PANEL_X, PANEL_Y, PANEL_WIDTH, PANEL_HEIGHT, {
      fontPath: FONT_PATH,
      fontSize: FONT_SIZE,
      maxMessageLines: MESSAGE_MAX_LINES,
      insetTop: MESSAGE_INSET_TOP,
      insetRight: MESSAGE_INSET_RIGHT,
    });

    // ⚠️ **顺序有讲究**：命中框先建并给最低的 priority，滑块和筛选按钮给更高的。
    // 不过实际上层序由 `DzFrameSetPriority` 决定而不是创建顺序（见那组常量的注释），
    // 这里按「从下往上」写只是为了让读的人不费脑子。
    this.createWheelHitFrame();
    this.createScrollBar();
    this.createFilterBar();
    this.createTabButton();

    this.bindListCallbacks();

    ChatBoxUI.applySlide();
    ChatBoxUI.applyPanelVisibility();
    ChatBoxUI.syncThumb();

    // 「光标在面板上时这一格滚轮归聊天框」——**必须在这里登记**，判定体不搬去
    // `CameraControl`。理由见 `CameraControl.wheelBlocker` 字段上那段：直接
    // `import { ChatBoxUI }` 会把这个大 UI 模块拉进 `CameraControl` 的加载链，
    // 实测让崩点从 `ChatBoxUI.lua` 反向挪到 `CameraControl.lua`。
    // 方向反过来（ChatBoxUI → CameraControl）是安全的：`main.ts` 的
    // `PlayersConfig` 早就把 `CameraControl` 拉起来了，这里拿到的是已加载的表。
    CameraControl.setWheelBlocker(() => ChatBoxUI.isMouseOverPanel());

    // ⚠️ **拼接是有总预算的，而且不是「一行别太长」那么简单。**
    //
    // tstl 会把 `a + b + c` 和模板串里的每处 `${}` 都编成**左嵌套的 `..` 链**
    // （`((a .. b) .. c) .. d`）。运行时是 KKWE 的 **Lua 5.3.6**
    // （`dev_lib/KKWE/bin/scriptrunner.dll` 里内嵌的解析器，**不是 LuaJIT**），
    // 它有一道 `nCcalls > LUAI_MAXCCALLS(200)` 的解析期检查，报错是：
    //   `too many C levels (limit is 200) in function at line N near 'tostring'`
    // 超了就是**整个 `ChatBoxUI.lua` 加载失败** → `require('src.main')` 崩掉 →
    // 地图脚本一行都没跑（连本函数前面几条日志都没有），表现为原生闪退。
    //
    // **关键：`nCcalls` 在一份文件内是累积的**，所以判据是「整份文件的拼接总量」，
    // 不是「某一行有多长」。实测依据：把这 4 条日志压成 1 条之后，同一份文件的
    // 崩溃点从第 209 行退到了第 963 行 —— 位置随总量移动，就是累积的证据。
    //
    // 改法：长文本一律走数组 `join`（tstl 出 `table.concat`，元素是兄弟关系、
    // 不互相嵌套，加多少段都不会加深）。
    log.info(
      [
        `聊天框面板已建：(${PANEL_X}, ${PANEL_Y})`,
        ` ${PANEL_WIDTH}x${PANEL_HEIGHT}，消息区让位`,
        ` top=${MESSAGE_INSET_TOP} right=${MESSAGE_INSET_RIGHT}`,
        `，筛选条 ${FILTER_TABS.length} 个`,
        `，轨道 (${TRACK_X}, ${TRACK_Y}) ${TRACK_WIDTH}x${TRACK_HEIGHT}`,
        `，收起箭头 (${TAB_X}, ${TAB_Y}) ${TAB_WIDTH}x${TAB_HEIGHT}`,
      ].join("")
    );
  }

  /**
   * 把 `MessageList` 的重排回调接上 —— 每次可见窗口变化后同步滑块。
   *
   * 回调里**只改属性**（把手的位置、轨道/把手的可见性），一根 frame 都不建不毁，
   * 所以哪怕它是在 `DzFrameSetScriptByCode` 的同步派发里被调到的也安全。
   */
  private bindListCallbacks(): void {
    const list = Console.getMessageList();
    if (list === null || list === undefined) {
      return;
    }
    list.setOnLayoutChanged(() => ChatBoxUI.syncThumb());
  }

  /**
   * 建面板右边缘那个收起箭头。
   *
   * 结构照抄 `DisplayToggleUI` 的按钮（同一套 `createWithPreset` + `setSize` 覆盖预设尺寸），
   * 只是尺寸换成窄条，文案换成箭头。
   */
  private createTabButton(): void {
    const tab = Button.createWithPreset(
      ARROW_COLLAPSE,
      TAB_X,
      TAB_Y,
      "SMALL",
      ScreenCoordinates.ORIGIN_TOP_LEFT
    );
    // BUTTON_SIZES 里没有 28x56 这个尺寸，建完再改
    tab.setSize(TAB_WIDTH, TAB_HEIGHT);
    tab.setTexturePreset("SHUIMO_STYLE_PANEL_BACKGROUND");
    tab.setFont(FONT_PATH);
    tab.setFontSizePixels(TAB_FONT_SIZE_PX);
    tab.setTextColor(TAB_COLOR);
    tab.setOnClick(() => ChatBoxUI.toggleCollapsedAnimated());
    ChatBoxUI.liftButton(tab, PRIORITY_TAB);

    ChatBoxUI.tabButton = tab;
  }

  /**
   * 消息区那块**透明的滚轮命中框**。
   *
   * 有了它，命中判定就交给引擎 —— 不用自己去猜 `DzGetMouseX/Y` 是哪套坐标单位。
   * 回调里只有 `DzGetWheelDelta()`，没有别的参数（见 `FRAME_EVENTS.FRAMEEVENT_MOUSE_WHEEL`
   * 那套绑定：handler 是 `() => void`）。
   *
   * ⚠️ 全仓这是**第一次**用 `FRAMEEVENT_MOUSE_WHEEL`，它在 1.27a 上派不派发是未知数。
   * 这条帧级路是**主路**，但同一块 frame 上还挂了进出事件（判光标在不在面板上）
   * 和一个**全局滚轮触发器**做兜底 —— 两条路会自动切换，见 `onGlobalMouseWheel`。
   *
   * （另：`FRAMEEVENT_MOUSE_WHEEL` 原本在本仓被错标成 5，而 5 其实是 `MOUSE_DOWN`。
   * 已按 `Common.j` 的 `frameeventtype` 修正为 6，见 `constants/frame/events.ts` 文件头。）
   *
   * ⚠️ **矩形只铺消息区（`HIT_*`），不要改回整块面板** —— 铺满会把筛选条的点击
   * 全吃掉，用户报的「点上面的按钮没有反应」就是这个。详见 `HIT_*` 的说明。
   */
  private createWheelHitFrame(): void {
    const parent = Frame.fromHandle(DzGetGameUI());
    if (!parent) {
      log.error("拿不到 GameUI，滚轮命中框没建（滚轮翻页会不可用）");
      return;
    }

    const hit = Frame.createType("ChatBoxWheelHit", parent, 0, "BUTTON", "") || null;
    if (!hit) {
      log.error("滚轮命中框创建失败（滚轮翻页会不可用）");
      return;
    }

    // ⚠️ 只铺消息区。铺满整个面板会把筛选条的点击吃掉 —— 见 `HIT_*` 那组常量的说明，
    // 这是「点上面的按钮没反应」的实际原因，不是 priority 档位的问题
    ChatBoxUI.setFrameRect(hit, HIT_X, HIT_Y, HIT_WIDTH, HIT_HEIGHT, false);
    ChatBoxUI.setPriority(hit, PRIORITY_WHEEL_HIT);

    // 主路：帧级滚轮。可以完全不触发，触发一次 `frameWheelWorks` 就立起来
    FrameEventUtils.bindMouseWheelEvent(hit, () => ChatBoxUI.onMouseWheel());

    // 进出只用来给全局兜底判「光标在不在面板上」。进/出事件是按钮用熟的机制，
    // 不像帧级滚轮那样是未知数
    FrameEventUtils.bindEvents(hit, {
      onMouseEnter: () => {
        ChatBoxUI.hoveringPanel = true;
      },
      onMouseLeave: () => {
        ChatBoxUI.hoveringPanel = false;
      },
    });

    // 兜底路：全局滚轮触发器（`CameraControl` 用它做镜头缩放，是跑通的）
    if (ChatBoxUI.wheelTrigger === null) {
      const trig = CreateTrigger();
      DzTriggerRegisterMouseWheelEventByCode(trig, false, () =>
        ChatBoxUI.onGlobalMouseWheel()
      );
      ChatBoxUI.wheelTrigger = trig;
    }

    ChatBoxUI.wheelHitFrame = hit;
  }

  /**
   * 面板右边缘的滑块：一条轨道 + 一个可拖的把手。
   *
   * 仓库里**没有任何现成的滚动条组件**，FDF 里也没有模板，所以是拿 `Button` 拼的。
   * 把手的拖动复用 `Button.setDraggable`（0.01 秒轮询 + 全局左键抬起订阅），
   * 但要注意它**只给绝对像素坐标、且完全不做边界钳制** —— 夹取在 `onThumbDragged` 里自己做。
   */
  private createScrollBar(): void {
    const track = Button.createWithPreset("", TRACK_X, TRACK_Y, "SMALL", ScreenCoordinates.ORIGIN_TOP_LEFT);
    track.setSize(TRACK_WIDTH, TRACK_HEIGHT);
    track.setTexture(TRACK_TEXTURE);
    ChatBoxUI.liftButton(track, PRIORITY_TRACK);

    // ⚠️ **把手认轨道当爹**（第 6 个参数是 parent，不传就挂在 `DzGetGameUI()` 下）。
    // 这是属性面板那次定位换来的结论，两处构造完全同形：轨道和把手**同父节点**、
    // 同为「先建轨道、后建把手」—— 结果**轨道把手整个盖住**（面板那边藏掉轨道后
    // 把手立刻出现，见 `StatPanelUI.createScrollBar` 的说明）。
    //
    // 子节点永远画在父节点之上，是结构性的，与 priority 语义无关 —— 那边试过
    // 改 priority 数字，方向、是否生效几条假设互相矛盾，赌错就是一轮返工。
    //
    // 位置不受影响：把手自己走 `setAbsPoint`（绝对屏幕坐标），父子关系只改画序；
    // 而且 `syncThumb` 里 `thumbVisible` 本来就蕴含 `trackVisible`，藏轨道时
    // 把手本来就该一起藏，没有行为变化。
    const trackChrome = track.getBackdropFrame();
    const thumb = Button.createWithPreset(
      "",
      TRACK_X,
      TRACK_Y,
      "SMALL",
      ScreenCoordinates.ORIGIN_TOP_LEFT,
      trackChrome === null ? undefined : trackChrome
    );
    thumb.setSize(TRACK_WIDTH, THUMB_MIN_HEIGHT);
    thumb.setTexturePreset(THUMB_TEXTURE_PRESET);
    ChatBoxUI.liftButton(thumb, PRIORITY_THUMB);

    // ⚠️ 设了 draggable，这个把手的 onClick 就永远不会触发了
    //（`Button.setupEventListeners` 把 onClick 拦在 `!isDraggable` 后面）。这里不需要点击。
    thumb.setDraggable(true);
    thumb.setOnDragging((_x: number, y: number) => ChatBoxUI.onThumbDragged(y));
    // 松手那一下再同步一次 —— 拖动过程中最后一次 `onDragging` 之后可能还有半格没落位
    thumb.setOnDragEnd(() => ChatBoxUI.syncThumb());

    ChatBoxUI.trackButton = track;
    ChatBoxUI.thumbButton = thumb;
  }

  /**
   * 面板内部最顶端那排筛选按钮。**单选**，选中绿、未选中灰，与右上角那列开关同一套视觉。
   *
   * 按钮自己不存状态 —— 权威状态是 `ChatBoxUI.activeFilter`，按钮配色只是它的投影
   * （`refreshFilterButtons`）。这样加类别时不用管「哪几个按钮该亮」。
   */
  private createFilterBar(): void {
    for (let i = 0; i < FILTER_TABS.length; i++) {
      const spec = FILTER_TABS[i];
      if (spec === undefined) {
        continue;
      }

      const button = Button.createWithPreset(
        spec.label,
        FILTER_BUTTON_X0 + i * FILTER_BUTTON_PITCH,
        FILTER_BUTTON_Y,
        "SMALL",
        ScreenCoordinates.ORIGIN_TOP_LEFT
      );
      // BUTTON_SIZES 里没有 90x22 这个尺寸，建完再改（同 DisplayToggleUI）
      button.setSize(FILTER_BUTTON_WIDTH, FILTER_BUTTON_HEIGHT);
      button.setTexturePreset("SHUIMO_STYLE_PANEL_BACKGROUND");
      button.setFont(FONT_PATH);
      button.setFontSizePixels(FILTER_FONT_SIZE_PX);
      button.setOnClick(() => ChatBoxUI.selectFilter(spec.tag));
      ChatBoxUI.liftButton(button, PRIORITY_FILTER);

      ChatBoxUI.filterButtons.push(button);
    }

    ChatBoxUI.refreshFilterButtons();
  }

  // ------------------------------------------------------------------
  // 层级 / 几何小工具
  // ------------------------------------------------------------------

  /**
   * 给一根原生 frame 定层。
   *
   * ⚠️ **自建浮层的层序不靠创建顺序**（跨子树尤其如此），不设的话是谁在上面全看运气 ——
   * 表现可能是「frame 建得出、尺寸对、就是点不到」。见 `PRIORITY_*` 那组常量。
   */
  private static setPriority(frame: Frame | null, priority: number): void {
    if (frame === null) {
      return;
    }
    try {
      DzFrameSetPriority(frame.handle, priority);
    } catch (e) {
      log.error(`设置层级失败：${e}`);
    }
  }

  /**
   * 把一个 `Button` 连同它内部那两根子 frame 一起抬层。
   *
   * `backdropFrame` 是外壳、`buttonFrame` 才是真正收事件的那根（它是 backdrop 的子节点、
   * `setAllPoints` 铺满）。只抬前者的话，事件可能仍然被压在下面。
   */
  private static liftButton(button: Button, priority: number): void {
    ChatBoxUI.setPriority(button.getBackdropFrame(), priority);
    ChatBoxUI.setPriority(button.getButtonFrame(), priority);
  }

  /**
   * 给一根原生 frame 按**像素矩形**定位（左上角 + 右下角两个绝对锚点）。
   * 和 `Button` / `Panel` 内部用的是同一套算法，只是这里直接操作裸 frame。
   */
  private static setFrameRect(
    frame: Frame,
    x: number,
    y: number,
    width: number,
    height: number,
    unclamped: boolean
  ): void {
    const pos = unclamped
      ? ScreenCoordinates.pixelToWC3Unclamped(x, y, ScreenCoordinates.ORIGIN_TOP_LEFT)
      : ScreenCoordinates.pixelToWC3(x, y, ScreenCoordinates.ORIGIN_TOP_LEFT);
    const size = ScreenCoordinates.pixelSizeToWC3(width, height);

    frame
      .setAbsPoint(FRAME_ALIGN_LEFT_TOP, pos.x, pos.y)
      .setAbsPoint(FRAME_ALIGN_RIGHT_BOTTOM, pos.x + size.width, pos.y - size.height);
  }

  // ------------------------------------------------------------------
  // 筛选
  // ------------------------------------------------------------------

  /** 当前筛选项（`null` = 全部）。给外部读状态用 */
  public static getActiveFilter(): string | null {
    return ChatBoxUI.activeFilter;
  }

  /**
   * 切换筛选。**滚动位置会被 `MessageList.setFilterTag` 归零** —— 换了个类别还停在
   * 原来那个历史位置上是没道理的。
   */
  private static selectFilter(tag: string | null): void {
    if (ChatBoxUI.activeFilter === tag) {
      return;
    }
    ChatBoxUI.activeFilter = tag;

    const list = Console.getMessageList();
    if (list !== null && list !== undefined) {
      try {
        list.setFilterTag(tag);
      } catch (e) {
        log.error(`切换聊天筛选失败：${e}`);
      }
    }

    ChatBoxUI.refreshFilterButtons();
  }

  /** 按 `activeFilter` 刷新按钮配色。**只改颜色**，不建不毁 frame */
  private static refreshFilterButtons(): void {
    for (let i = 0; i < FILTER_TABS.length; i++) {
      const spec = FILTER_TABS[i];
      const button = ChatBoxUI.filterButtons[i];
      if (spec === undefined || button === undefined) {
        continue;
      }
      const active = ChatBoxUI.activeFilter === spec.tag;
      try {
        button.setTextColor(active ? FILTER_COLOR_ACTIVE : FILTER_COLOR_IDLE);
      } catch (e) {
        log.error(`刷新筛选按钮配色失败：${e}`);
      }
    }
  }

  // ------------------------------------------------------------------
  // 滚动
  // ------------------------------------------------------------------

  /**
   * 滚轮。「一格 = `WHEEL_STEPS_PER_NOTCH` 条」直接跳，**不做补间** ——
   * 滚轮要的是即时反馈。
   *
   * ⚠️ 这个回调是在 `DzFrameSetScriptByCode(..., sync=true)` 的**事件派发内部**同步执行的，
   * 所以它只能改属性。往下走是 `MessageList.scrollBy → relayout`，那里只调 `setVisible` /
   * `setPositionUnclamped`，**一根 frame 都不建不毁**，安全。
   */
  private static onMouseWheel(): void {
    // 走到这里就说明**帧级滚轮事件确实会派发** —— 全局那条兜底路可以退休了
    ChatBoxUI.frameWheelWorks = true;
    ChatBoxUI.scrollChat();
  }

  /** 真正翻页。帧级和全局两条路最后都汇到这里，翻页逻辑只有一份 */
  private static scrollChat(): void {
    const list = Console.getMessageList();
    if (list === null || list === undefined) {
      return;
    }

    const delta = DzGetWheelDelta();
    if (delta === 0) {
      return;
    }

    const forward = delta > 0 === WHEEL_UP_MEANS_HISTORY;
    try {
      list.scrollBy(forward ? WHEEL_STEPS_PER_NOTCH : -WHEEL_STEPS_PER_NOTCH);
    } catch (e) {
      log.error(`滚轮翻页失败：${e}`);
    }
  }

  /**
   * 全局滚轮兜底。
   *
   * `DzTriggerRegisterMouseWheelEventByCode` **是本仓已经跑通的路** ——
   * `CameraControl.initMouseControl()` 就是用它做镜头缩放的，所以这条一定响。
   * 缺点也来自这里：它是**全局**的，光标在哪都触发，得自己判「在不在聊天面板上」。
   *
   * 判定用的是帧级的 `MOUSE_ENTER` / `MOUSE_LEAVE`（`hoveringPanel`）。为什么不直接算矩形：
   * 那要先搞清 `DzGetMouseX/Y` 是哪套坐标单位（`Button.getMousePixelX` 用的是
   * `DzGetMouseXRelative` + `DzGetWindowWidth/Height`，是另一套），而进/出事件
   * **是已经被按钮用熟的机制**，不用赌。
   *
   * ## 为什么两条路都留着（自动切换，不是双保险）
   *
   * 帧级 `FRAMEEVENT_MOUSE_WHEEL` 在本仓**从没用过**，它在 KKWE 1.27a 上到底派不派发
   * 是未知数；而全局那条**确定能用**。所以这里做**自愈**：
   *
   * - 帧级一旦响过一次（`frameWheelWorks`）→ 全局这条路**永久闭嘴**，不会有双重翻页
   * - 帧级要是压根不响 → 全局这条路接手，滚轮依然能用
   *
   * 代价只有一个：万一帧级是能用的，**有生以来第一次**滚动会翻两份
   *（同一次滚动被两个 handler 各处理一遍），之后就自动正常了。
   * 用「一次多翻 3 行」换掉「可能要再启动一次魔兽才能确定」，很划算。
   */
  private static onGlobalMouseWheel(): void {
    if (ChatBoxUI.frameWheelWorks) {
      return; // 帧级那条路活着，别插嘴
    }
    if (!ChatBoxUI.hoveringPanel) {
      return; // 光标不在聊天面板上 —— 这一格滚轮不归我们管
    }
    if (ChatBoxUI.slideOffset >= SLIDE_DISTANCE) {
      return; // 面板已经收起来了。`MOUSE_LEAVE` 不保证会补发，这里再兜一道
    }
    ChatBoxUI.scrollChat();
  }

  /**
   * 拖动把手。
   *
   * ⚠️ 回调**给的是鼠标的绝对像素 Y，不是增量**，而且 `Button.updateDragPosition`
   * 在调它之前**已经先把把手挪到 `鼠标Y − 抓取偏移` 的位置了**（且完全没有边界钳制）。
   * 所以这里不能「按增量挪把手」，只能反过来：**把把手当前所落的位置解读成滚动比例**，
   * 写进 `MessageList`，剩下的（夹到轨道内、把把手摆回去）由 `syncThumb()` 完成 ——
   * 两个方向只有一条真相，也就不会互相打架。
   *
   * 注意 `syncThumb` **不跳过拖动中**：它把把手摆回夹过的位置正是这里要的效果。
   * 下一帧 `updateDragPosition` 又会按 `dragOffsetY`（拖拽开始时定下的、与把手当前位置无关）
   * 重新算一次原始位置，所以不会有累积误差。
   */
  private static onThumbDragged(_mouseY: number): void {
    const list = Console.getMessageList();
    const thumb = ChatBoxUI.thumbButton;
    if (list === null || list === undefined || thumb === null) {
      return;
    }

    try {
      const info = list.getScrollInfo();
      if (info.maxOffset <= 0) {
        return;
      }

      const span = TRACK_HEIGHT - thumb.getSize().height;
      if (span <= 0) {
        return;
      }

      let ratio = (thumb.getPosition().y - TRACK_Y) / span;
      if (ratio < 0) {
        ratio = 0;
      } else if (ratio > 1) {
        ratio = 1;
      }

      // 顶部 = 最早（offset 最大），底部 = 最新（offset = 0）
      list.setScrollOffset(Math.round((1 - ratio) * info.maxOffset));
    } catch (e) {
      log.error(`拖动滑块失败：${e}`);
    }
  }

  /**
   * 按 `MessageList` 当前的滚动状态重画滑块。
   *
   * 由 `MessageList` 的**重排回调**驱动（`bindListCallbacks`），所以新消息进来、淘汰、
   * 筛选切换、滚轮、拖动 —— 全都会走到这里，不需要各处手动调。
   *
   * ⚠️ 全程**只改属性**，不建不毁 frame。这个回调可能落在事件派发内部。
   */
  private static syncThumb(): void {
    const list = Console.getMessageList();
    const track = ChatBoxUI.trackButton;
    const thumb = ChatBoxUI.thumbButton;
    if (list === null || list === undefined || track === null || thumb === null) {
      return;
    }

    try {
      const info = list.getScrollInfo();

      // ⚠️ **轨道常显，只管把手。** 这里原来是「不够一屏（`maxOffset = 0`）就整条藏掉」，
      // 写着「一根拉不动的滑块比没有滑块更让人困惑」—— 实测正好相反：用户点进「战斗」
      // 只剩 5 条消息，轨道和把手双双消失，报告成「**看不见滑块**」，看起来像功能没做。
      // 轨道是「这里能滚」的唯一视觉信号，它不该跟着内容长度走。
      // 把手仍然只在真能滚时出现；不满一屏时它按比例算出来就是整条轨道那么高
      // （下面的 clamp 已经兜住），所以「常显的轨道 + 铺满的把手」看着也是对的。
      // 面板收到底时两个都藏（`chromeHidden`）。
      const trackVisible = !ChatBoxUI.chromeHidden && info.total > 0;
      const thumbVisible = trackVisible && info.maxOffset > 0;
      // 重排一秒能跑十几次，可见性和把手高度却几乎从不变化 —— 判一下再写，
      // 省掉的是一堆原生调用（同一套思路见 `MessageList.setItemShown`）
      if (ChatBoxUI.lastTrackShown !== trackVisible) {
        ChatBoxUI.lastTrackShown = trackVisible;
        track.setVisible(trackVisible);
      }
      if (ChatBoxUI.lastThumbShown !== thumbVisible) {
        ChatBoxUI.lastThumbShown = thumbVisible;
        thumb.setVisible(thumbVisible);
      }
      if (!trackVisible) {
        return;
      }

      // 把手高度 = 一屏条数占全部条数的比例，再兜一个最小可点高度。
      // ⚠️ 动态高度之后这只是**近似**：`visible / total` 是「条数比」，
      // 而轨道代表的是「高度比」，短消息和长消息混在一起时两者对不上。
      // 不影响能用（位置那一半仍是精确的），不值得为它去算总高度。
      let thumbHeight = Math.floor((TRACK_HEIGHT * info.visible) / info.total);
      if (thumbHeight < THUMB_MIN_HEIGHT) {
        thumbHeight = THUMB_MIN_HEIGHT;
      } else if (thumbHeight > TRACK_HEIGHT) {
        thumbHeight = TRACK_HEIGHT;
      }
      if (ChatBoxUI.lastThumbHeight !== thumbHeight) {
        ChatBoxUI.lastThumbHeight = thumbHeight;
        thumb.setSize(TRACK_WIDTH, thumbHeight);
      }

      const span = TRACK_HEIGHT - thumbHeight;
      const ratio = info.maxOffset > 0 ? 1 - info.offset / info.maxOffset : 0;
      thumb.setPositionUnclamped(TRACK_X - ChatBoxUI.slideOffset, TRACK_Y + Math.round(span * ratio));
    } catch (e) {
      log.error(`同步滑块失败：${e}`);
    }
  }

  /**
   * 光标是不是停在聊天面板上（筛选条 / 消息区 / 滑块那一列都算）。
   *
   * 给 `CameraControl` 用：光标在面板上时滚轮归面板翻消息，镜头别跟着动 ——
   * 用户报的「在这个面板上滚鼠标滑轮的时候，视野也在变动」。
   *
   * ## 为什么用 `DzGetMouseFocus()` 往上走祖先链，而不是自己算矩形
   *
   * 这是**语义**判定：引擎直接告诉我们光标压在哪根 frame 上，不涉及任何坐标换算。
   * 备选方案 `DzGetMouseXRelative() / DzGetWindowWidth()`（`Button.getMousePixelX`
   * 那套换算）要先赌坐标原点和 Y 轴方向 —— 赌错了会变成「在屏幕中间滚滚轮就翻聊天记录」，
   * 那比现在的问题更难受。
   *
   * ## 失败方向是安全的
   *
   * 任何一步取不到（`DzGetMouseFocus` 给 0、面板还没建、祖先链断了）都返回 `false`，
   * 也就是**维持现状**（镜头照旧缩放）。不会把别的地方弄坏 ——
   * 这一点是选它而不选「干脆让镜头别管所有 UI」的决定性理由。
   */
  public static isMouseOverPanel(): boolean {
    const list = Console.getMessageList();
    if (list === null || list === undefined) {
      return false;
    }

    let handle = 0;
    try {
      handle = DzGetMouseFocus();
    } catch (e) {
      return false;
    }
    if (handle === 0) {
      return false;
    }

    const own = ChatBoxUI.ownFrameHandles(list);
    if (own.length === 0) {
      return false;
    }

    // 从光标底下那根 frame 往上走。**深度上限是防呆** ——
    // 万一父指针成环（或引擎给了个怪 handle），不要在这里死循环把游戏卡住
    let depth = 0;
    while (handle !== 0 && depth < 32) {
      for (let i = 0; i < own.length; i++) {
        if (own[i] === handle) {
          return true;
        }
      }
      try {
        handle = DzFrameGetParent(handle);
      } catch (e) {
        return false;
      }
      depth++;
    }
    return false;
  }

  /**
   * 属于聊天面板的那些原生 frame handle。
   *
   * 分两类，缺一不可：
   *
   * 1. **面板内容帧** —— 消息那堆 `Text` 的父级。从任意一条消息往上走都会撞到它
   * 2. **面板上的自建 chrome**（筛选条 / 滑块 / 命中框 / 箭头）—— 它们挂在 GameUI
   *    下面，**不是**面板的子级，所以只能逐个列进来
   *
   * 每次调用现算。滚轮一秒也就响几次，不值得为它维护一份会过期的缓存。
   */
  private static ownFrameHandles(list: MessageList): number[] {
    const handles: number[] = [];

    const content = list.getContentFrameHandle();
    if (content !== 0) {
      handles.push(content);
    }

    const hit = ChatBoxUI.wheelHitFrame;
    if (hit !== null) {
      handles.push(hit.handle);
    }

    ChatBoxUI.collectButtonHandles(handles, ChatBoxUI.tabButton);
    ChatBoxUI.collectButtonHandles(handles, ChatBoxUI.trackButton);
    ChatBoxUI.collectButtonHandles(handles, ChatBoxUI.thumbButton);
    for (let i = 0; i < ChatBoxUI.filterButtons.length; i++) {
      ChatBoxUI.collectButtonHandles(handles, ChatBoxUI.filterButtons[i]);
    }

    return handles;
  }

  /** 收一个 `Button` 的三根原生帧（外壳 / 收事件的那根 / 文字） */
  private static collectButtonHandles(out: number[], button: Button | null | undefined): void {
    if (button === null || button === undefined) {
      return;
    }
    const frames = [
      button.getBackdropFrame(),
      button.getButtonFrame(),
      button.getTextFrame(),
    ];
    for (let i = 0; i < frames.length; i++) {
      const frame = frames[i];
      if (frame !== null && frame !== undefined) {
        out.push(frame.handle);
      }
    }
  }

  /**
   * 把玩家的聊天接进面板。
   *
   * 订阅 `gameEvents.onPlayerChat`（它内部会为所有玩家注册
   * `TriggerRegisterPlayerChatEvent`，**前缀传空串**即匹配全部频道消息）。
   *
   * ⚠️ 这里**不区分公屏 / 队伍** —— todo.md §0.1.1 要的队伍消息涉及「同队才可见」，
   * 需要按 `GetPlayerTeam` / `IsPlayerAlly` 过滤，属后续步骤。本步先让所有玩家消息
   * 都进面板。
   */
  public bindPlayerChat(): void {
    if (this.bound) {
      log.warn("已订阅过玩家聊天，重复调用被忽略");
      return;
    }
    this.bound = true;

    gameEvents.onPlayerChat((data: PlayerChatEventData) =>
      ChatBoxUI.onPlayerChat(data)
    );

    log.info("玩家聊天已接线");
  }

  // ------------------------------------------------------------------
  // 面板收起 / 展开（横向平移）
  // ------------------------------------------------------------------

  public static isPanelVisible(): boolean {
    return ChatBoxUI.panelVisible;
  }

  /**
   * **立即**展开 / 收起，不做滑动动画。
   *
   * 走动画的是点箭头那条路（`toggleCollapsedAnimated`）。留这个入口是给程序化调用
   * （别的系统想强制收起面板），也留了个不做动画就不出错的后路。
   */
  public static setPanelVisible(value: boolean): void {
    if (ChatBoxUI.panelVisible === value) {
      return;
    }
    ChatBoxUI.panelVisible = value;
    // 先掐掉进行中的滑动，免得「拖到一半的动画」和「瞬移」两条路径互相打架
    ChatBoxUI.stopSlide();
    ChatBoxUI.slideOffset = ChatBoxUI.targetOffset();
    ChatBoxUI.refreshArrow();
    ChatBoxUI.applySlide();
    ChatBoxUI.applyPanelVisibility();
  }

  private static applyPanelVisibility(): void {
    const list = Console.getMessageList();
    if (list === null || list === undefined) {
      // 面板还没建（`create()` 之前就点了箭头，或建失败）—— 只记状态，不报错
      return;
    }
    try {
      list.setVisible(ChatBoxUI.panelVisible);
    } catch (e) {
      log.error(`切换聊天面板可见性失败：${e}`);
    }
  }

  /** 点箭头：翻转状态并滑动过去。**滑动中途再点一次会直接掉头**，不会等这次滑完 */
  private static toggleCollapsedAnimated(): void {
    ChatBoxUI.panelVisible = !ChatBoxUI.panelVisible;
    ChatBoxUI.refreshArrow();
    ChatBoxUI.startSlide();
  }

  /** 目标位移：展开 = 0，收起 = `SLIDE_DISTANCE` */
  private static targetOffset(): number {
    return ChatBoxUI.panelVisible ? 0 : SLIDE_DISTANCE;
  }

  private static refreshArrow(): void {
    const tab = ChatBoxUI.tabButton;
    if (tab === null) {
      return;
    }
    try {
      tab.setText(ChatBoxUI.panelVisible ? ARROW_COLLAPSE : ARROW_EXPAND);
    } catch (e) {
      log.error(`刷新收起箭头失败：${e}`);
    }
  }

  /**
   * 开始滑向当前目标。
   *
   * 每帧都**重新读一遍** `targetOffset()` 而不是把目标写死在闭包里 ——
   * 这样滑动途中再点一次箭头会立刻掉头，不用等这一趟滑完再滑回来。
   */
  private static startSlide(): void {
    const target = ChatBoxUI.targetOffset();
    if (ChatBoxUI.slideOffset === target) {
      ChatBoxUI.applySlide();
      return;
    }
    if (ChatBoxUI.slideTimer !== null) {
      return; // 已经在滑了，定时器那边下一帧就会看到新目标
    }

    ChatBoxUI.slideTimer = CreateTimer();
    TimerStart(ChatBoxUI.slideTimer, SLIDE_INTERVAL, true, () => {
      const goal = ChatBoxUI.targetOffset();
      const step = SLIDE_DISTANCE / SLIDE_STEPS;

      // 夹到 `goal` 上而不是直接加 —— 掉头之后当前位置多半不在步长的整数倍上，
      // 不夹的话会在目标附近来回抖，永远不相等、定时器停不下来
      let next = ChatBoxUI.slideOffset;
      if (goal > next) {
        next = Math.min(next + step, goal);
      } else if (goal < next) {
        next = Math.max(next - step, goal);
      }

      ChatBoxUI.slideOffset = next;
      ChatBoxUI.applySlide();

      if (next === goal) {
        ChatBoxUI.stopSlide();
        // 滑到底才隐藏 —— 半路隐藏会变成「板没了、箭头还在动」
        ChatBoxUI.applyPanelVisibility();
      }
    });
  }

  private static stopSlide(): void {
    if (ChatBoxUI.slideTimer === null) {
      return;
    }
    PauseTimer(ChatBoxUI.slideTimer);
    DestroyTimer(ChatBoxUI.slideTimer);
    ChatBoxUI.slideTimer = null;
  }

  /**
   * 把当前位移落到画面上。
   *
   * **面板上的每一件零件都要在这里搬一遍**：消息面板 + 每条消息（`list.setSlideOffset`）、
   * 收起箭头、5 个筛选按钮、滑块轨道、滑块把手、滚轮命中框。
   * 往面板上加新零件时**必须**回到这里补一行 —— 漏掉的那个不会跟着滑走，
   * 面板收起后它会孤零零地留在屏幕左边。
   */
  private static applySlide(): void {
    const offset = ChatBoxUI.slideOffset;

    const list = Console.getMessageList();
    if (list !== null && list !== undefined) {
      try {
        // 只要没完全收到底，面板就必须看得见。
        // 正常滑动用不到这一句（滑动全程都不隐藏），但 `setPanelVisible(false)`
        // 那条瞬移路径会把它藏起来，之后再点箭头就「滑回来但隐身」了。
        if (!list.getVisible() && offset < SLIDE_DISTANCE) {
          list.setVisible(true);
        }
        list.setSlideOffset(offset);
      } catch (e) {
        log.error(`平移聊天面板失败：${e}`);
      }
    }

    // 面板右边缘那一排 chrome。**一个都不能漏** —— 漏掉的那个会在面板收起后
    // 孤零零地留在屏幕左边（它的「家」坐标是正的，只有靠这里减 offset 才会跟着走）
    //
    // 收起箭头：展开时 offset = 0 ⇒ 停在 492；收起时 ⇒ 停在 0（屏幕最左一条）
    ChatBoxUI.moveChrome(ChatBoxUI.tabButton, TAB_X, TAB_Y);

    // 筛选条
    for (let i = 0; i < ChatBoxUI.filterButtons.length; i++) {
      ChatBoxUI.moveChrome(
        ChatBoxUI.filterButtons[i],
        FILTER_BUTTON_X0 + i * FILTER_BUTTON_PITCH,
        FILTER_BUTTON_Y
      );
    }

    // 滑块轨道。把手只搬 X —— 它的 Y 归 `syncThumb()` 管，这里碰了会打架
    ChatBoxUI.moveChrome(ChatBoxUI.trackButton, TRACK_X, TRACK_Y);
    ChatBoxUI.moveThumbX();

    // 滚轮命中框。矩形与 `createWheelHitFrame` 里那次必须**完全一致**（共用 HIT_*）
    const hit = ChatBoxUI.wheelHitFrame;
    if (hit !== null) {
      try {
        ChatBoxUI.setFrameRect(hit, HIT_X - offset, HIT_Y, HIT_WIDTH, HIT_HEIGHT, true);
      } catch (e) {
        log.error(`平移滚轮命中框失败：${e}`);
      }
    }

    // 收到底就把 chrome 藏掉。**放在最后** —— 它要读的是这一帧刚写好的 slideOffset
    ChatBoxUI.applyChromeVisibility();
  }

  /**
   * 把一个面板零件搬到 `x - slideOffset`。走 **Unclamped** —— 收起时算出来的 x 是负的，
   * 钳制版会把它们全按在 x = 0 上（「面板走了，按钮留在屏幕左边」）。
   */
  private static moveChrome(button: Button | null, x: number, y: number): void {
    if (button === null) {
      return;
    }
    try {
      button.setPositionUnclamped(x - ChatBoxUI.slideOffset, y);
    } catch (e) {
      log.error(`平移聊天面板零件失败：${e}`);
    }
  }

  /**
   * 面板收到底时把 chrome **藏掉**（用户明确要求：收起后「把上面的这些文字直接隐藏掉」）。
   *
   * ## 为什么不能只靠 `applySlide` 把它们推出去
   *
   * 平移是对的，理论上负坐标也确实在屏幕外 —— 但那是**移动**，任何一个零件没跟着走
   * 就会在屏幕左边留下一排孤零零的文字（实测截图就是这样：收起后筛选条的文字还在）。
   * 隐藏是**确定**的：看不看得见不再取决于「有没有漏搬一帧」。
   *
   * 剩下唯一还需要自己动的就是箭头 —— 它是收起后**唯一该留着**的零件（再点一下展开），
   * 所以不进这个列表。
   */
  private static applyChromeVisibility(): void {
    const hidden = ChatBoxUI.slideOffset >= SLIDE_DISTANCE;
    if (ChatBoxUI.chromeHidden === hidden) {
      return;
    }
    ChatBoxUI.chromeHidden = hidden;

    const visible = !hidden;
    for (let i = 0; i < ChatBoxUI.filterButtons.length; i++) {
      const button = ChatBoxUI.filterButtons[i];
      if (button === undefined) {
        continue;
      }
      try {
        // `Button.setVisible` 会连它内部的 `textComponent` 一起设 ——
        // 只藏底板的话文字还会留在屏幕上，那正是要藏的东西
        button.setVisible(visible);
      } catch (e) {
        log.error(`切换筛选按钮可见性失败：${e}`);
      }
    }

    // 滑块的可见性归 `syncThumb()` 统一管（它还要看 `total`），
    // 这里只是把它叫醒 —— `trackVisible` 里含了 `chromeHidden`，它会自己算对
    ChatBoxUI.syncThumb();
  }

  /** 只搬把手的 X。Y 是 `syncThumb()` 的地盘，这里一碰它就会和鼠标抢位置 */
  private static moveThumbX(): void {
    const thumb = ChatBoxUI.thumbButton;
    if (thumb === null) {
      return;
    }
    try {
      thumb.setPositionUnclamped(TRACK_X - ChatBoxUI.slideOffset, thumb.getPosition().y);
    } catch (e) {
      log.error(`平移滑块把手失败：${e}`);
    }
  }

  // ------------------------------------------------------------------
  // 对外的消息出口
  // ------------------------------------------------------------------

  /** 系统提示（黄） */
  public static system(text: string): void {
    ChatBoxUI.push(ChatChannel.SYSTEM, text);
  }

  /** 战斗日志（灰） */
  public static combat(text: string): void {
    ChatBoxUI.push(ChatChannel.COMBAT, text);
  }

  /** 警告 / 报错（红） */
  public static warn(text: string): void {
    ChatBoxUI.push(ChatChannel.WARNING, text);
  }

  // ------------------------------------------------------------------
  // 内部
  // ------------------------------------------------------------------

  private static push(channel: ChatChannel, text: string): void {
    const style = CHANNEL_STYLES[channel];
    if (style === undefined) {
      // 加了 ChatChannel 却忘了往 CHANNEL_STYLES 里补 —— 静默丢弃而不是抛异常，
      // 因为聊天框推不出消息不该把调用方（可能是异步任务）带崩
      log.warn(`频道 ${channel} 没有配样式，消息被丢弃：${text}`);
      return;
    }
    // 第三个参数是频道 —— 它随消息一路透传到 `MessageList`，筛选和按类淘汰都按它分组
    Console.say(style.prefix + text, style.color, channel);
  }

  private static onPlayerChat(data: PlayerChatEventData): void {
    const text = data.message;
    // 屏蔽空消息（todo.md §0.1.3）。全是空格也算空 —— 只判 `=== ""` 挡不住。
    if (text.trim() === "") {
      return;
    }

    // 名字取不到时退回「玩家N」。`fromHandle` 在句柄无效时返回 undefined，
    // 而这是玩家自己敲的字，正常不会走到那条路，但兜一下免得后面读 `.name` 炸掉。
    const player = MapPlayer.fromHandle(data.player);
    const name = player !== undefined ? player.name : `玩家${data.playerId + 1}`;

    // 样式与经典魔兽一致：`名字: 内容`。名字单独上色属后续步骤（要用玩家颜色，
    // 那样得把一条消息拆成两段文本，而当前 `MessageList` 一条消息只对应一个 `Text`）。
    const style = CHANNEL_STYLES[ChatChannel.PLAYER];
    Console.say(`[${name}]: ${text}`, style.color, ChatChannel.PLAYER);
  }
}
