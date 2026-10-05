/**
 * 属性面板（`todo.md` §2.1）—— 选中单位后按 C 呼出的三分页界面。
 *
 * ## 当前进度：阶段 E / Step 7（滚动把手）
 *
 * 已做：居中的背景板 + 标题栏、C 开关、ESC 关闭（走 `EscapeRouter`）、
 * **拖动整个面板**、**三个分页按钮 + 权威页状态**、**行槽虚拟化**、
 * **0.1s 实时刷新**、**经验两条（直读原生，语义已实测）**、
 * **三个页面的全部行（12 + 17 + 14 = 43 行）**、**选中跟随与自动显隐**、
 * **滚动轨道 + 可拖把手**（页面②17 行 / ③14 行现在能看全了）。
 * 未做：滚轮（Step 8 —— 现在只能拖把手，鼠标滚轮压在面板上仍会缩放镜头）。
 *
 * ## 两个「开着」：意图 vs 可见（决策 5）
 *
 * | 字段 | 含义 | 谁来改 |
 * |---|---|---|
 * | `panelOpen` | 用户意图「我想看面板」 | **只有 C 键 / ESC** |
 * | `isVisible()` | 实际上画没画（意图 ∧ 有活着的选中单位） | `reconcile()` |
 *
 * 所以取消选中时面板会隐掉、但 `panelOpen` 保持为真，**重新选中就自动重现**。
 * 一切**副作用**（拖动闸门、ESC 消费）都必须问 `isVisible()` —— 详见该方法的注释。
 *
 * ## 行槽虚拟化
 *
 * 内容区**固定建 `VISIBLE_ROWS`(12) 个槽**，不按「属性有几条」建 frame。
 * 渲染就是把第 `offset + i` 条属性写进第 `i` 个槽的 `setText`。这样切页、刷新、
 * 滚动全是一串属性操作，永远不增删 frame 树 —— 和上面那条「建一次」
 * 的纪律是同一件事的两面。行比槽少的页会把空槽收起来；行比槽多的页
 * （②17 行 / ③14 行）靠 `offset` 上下滚动（Step 7）。
 * **页面① 恰好 12 行收口**，所以它永远不出现滚动条。
 *
 * ## 滚动：`offset` 是唯一权威
 *
 * 和分页那套一样：权威状态只有 `offset` 一个字段（内容区顶部显示的是第几行），
 * 把手的位置/高度只是它的投影（`syncScrollBar`）。**拖把手改的是 `offset`**，
 * 反过来「按 offset 摆把手」—— 两个方向只有一条真相，不会互相打架。
 *
 * ⚠️ 把手**不是** `Button`，拖动也**不用** `Button.setDraggable`（见
 * `createScrollBar` 里那段：`Button` 一律走绝对坐标，面板一拖它就留在原地）。
 * 判定用 `isMouseOverThumb()` 算几何 —— 与面板自身的拖动同一条路数，
 * 见仓库记忆 `wc3-hover-flag-vs-geometry`。
 *
 * ## 数据源：有表走表，没表退回原生
 *
 * `Actor` 的属性表是**惰性**建的，只有 buff / 遗物给它挂来源时才有
 * （见 `resolveSheet`）。所以「没表」是常态而不是异常 —— 那种单位直接直读原生，
 * 面板照样有内容。**绝不因为面板看了它一眼就凭空建一张表。**
 *
 * ⚠️ 三个例外，全都**永远直读原生**，绝不走属性表：
 *   - **等级** —— 属性表里的 `LEVEL` 只在建表那一刻快照一次，之后升级也不会变
 *     （计划风险 #12），用 `getFinal(LEVEL)` 就是永久陈旧值。
 *   - **经验 / 升级还需** —— 英雄专有的运行时状态，和生命/魔法同类，
 *     不该被修正器加成（计划「已确认决策 2」）。`升级还需` 的公式见
 *     `xpToLevelText`，其语义是**实测**出来的，不要照文档猜。
 *
 * ## 分页：单一权威状态
 *
 * 权威状态只有 `activeTab` 一个字段。分页按钮**自己不存状态** ——
 * 绿/灰配色、三个内容区的显隐、标题文字，全是它的投影（`refreshTabVisuals` /
 * `applyVisibility`）。所以加第四页时不用去管「哪几个按钮该亮」。
 * 这套写法照抄 `ChatBoxUI` 的筛选条（`selectFilter` / `refreshFilterButtons`）。
 *
 * ⚠️ **切换只改属性，不建不毁 frame**（`setVisible` / `setText`），
 * 这样同步事件回调里切页也是安全的（见 `EscapeRouter` 文件头那条约束）。
 *
 * ## ⚠️ priority 不提供点击穿透
 *
 * `ChatBoxUI.ts:331-334` 记着一条**实测失败**的教训：它原来让「铺满整个面板的
 * 滚轮命中框」用 880、筛选按钮用 895，指望低层号不挡点击 —— **筛选按钮点不动**。
 * 唯一点得动的箭头，恰好是唯一不重叠的零件。
 *
 * 所以这里 `StatPanel_BodyHit`（内容区拦截框）的矩形**在几何上避开分页条**，
 * 而不是靠 `PRIORITY_BODY_HIT < PRIORITY_TAB`。层号只管画序。
 *
 * ## 为什么不用 `Panel` 组件
 *
 * `Panel` 把它的 frame 硬编码成 `"PanelBackdrop"` / `"PanelContent"` /
 * `"PanelTitleBar"` ……（`Panel.ts:192,225,238,259,268,288,303`），而它已经被
 * `MessageList`（聊天框内，必然创建）、`GachaPanel`、`Dialog` 用着了 ——
 * 再加一个就是第四份同名。
 *
 * 重名本身**创建时不报错**（`Button` 用 `"ButtonBackdrop_" + os.time()` 命名，
 * 秒级精度，聊天框一开局就撞了一堆，也没事），**销毁时才闪退**
 * （见 `src/system/ui/gameui/index.ts:13-15` 与仓库记忆
 * `wc3-dz-frame-priority-required`）。本面板既不需要 `Panel` 的关闭按钮
 * （C / ESC 即开关），也不需要它那套「移动时把所有子 frame 重算一遍」的做法
 * —— 见下。所以自建背景板，统一用 `StatPanel_` 前缀，把重名这件事从「运气」
 * 变成「不存在的」。
 *
 * ## 子 frame 一律用**相对锚点**，不用绝对锚点
 *
 * `Panel` 的子节点全是绝对锚点（`setAbsPoint`），所以它每移动一次都要
 * `updateFramePositions()` 把**每一个**子 frame 的位置重算一遍
 * （`Panel.ts:494-554`）—— 将来谁新加一个零件忘了加进那个名单，那个零件就会
 * 孤零零留在原地。`ChatBoxUI.applySlide` 的注释正好警告过这个坑。
 *
 * 这里反过来：背景板用绝对锚点定位，**其余所有子 frame 用 `setPoint` 相对锚定
 * 到背景板**。拖动的全部工作就是移动背景板，子节点自动跟随，不需要任何
 * 「一起搬」的名单。相对锚定到**自建**父 frame 在本仓有实证
 * （`UnitBlood.ts:329-412` 那一整套血条零件都是这么挂的）。
 *
 * ## 两条硬纪律
 *
 * 1. **建一次，之后只改 `setVisible` / 位置，永不 destroy/rebuild** —— 见上。
 * 2. **所有 frame 都要显式 `DzFrameSetPriority`** —— 自建浮层的层序不靠创建顺序，
 *    跨子树尤其如此。不设的话表现是「frame 建得出、尺寸对、就是看不见/点不到」。
 */

import { Frame, FRAME_ALIGN_LEFT_TOP, FRAME_ALIGN_RIGHT_BOTTOM } from "@eiriksgata/wc3ts/*";
import { ScreenCoordinates } from "../ScreenCoordinates";
import { EscapeRouter, EscapeHandler } from "../EscapeRouter";
import { FrameEventUtils } from "src/constants/frame/utils";
// ⚠️ 只允许这个方向：**大的拉小的**（与 `ChatBoxUI` → `CameraControl` 同向）。
// 反向（`CameraControl` 里 `import { StatPanelUI }`）会把整条 UI 链拉进它的加载链，
// 加深 Lua 5.3.6 那道 200 的 C-level 上限风险，见 `CameraControl.wheelBlocker` 上那段。
import { CameraControl } from "src/utils/CameraControl";
import { UIBackgrounds } from "src/constants/ui/preset";
import { createLogger } from "src/utils/logger";
import { gameEvents, keyboardEvents, KeyCode, mouseEvents, MouseButton } from "src/system/event";
import { Actor } from "src/system/actor";
// **类型 import**（不是运行时）—— 面板只把 `StatSheet` 当类型拿着用，
// 生成物里不会 require 它，少一条潜在 require 环。
import type { StatSheet } from "src/system/stat/StatSheet";
import type { ElementId } from "src/system/stat/types";
import {
  DEFAULT_CRIT_DMG,
  ELEMENTS,
  elemDamageStat,
  elemResistStat,
  StatId,
  StatType,
} from "src/system/stat/types";
import {
  UNIT_STATE_ATTACK_BONUS,
  UNIT_STATE_ATTACK_WHITE,
  UNIT_STATE_DEFEND_WHITE,
  UNIT_STATE_LIFE,
  UNIT_STATE_MANA,
  UNIT_STATE_MAX_LIFE,
  UNIT_STATE_MAX_MANA,
  UNIT_TYPE_DEAD,
  UNIT_TYPE_HERO,
} from "src/constants/game/units";

const log = createLogger("StatPanelUI");

// ---------------------------------------------------------------------------
// 几何（1920x1080 像素坐标，左上角原点）
// ---------------------------------------------------------------------------

const PANEL_WIDTH = 560;
const PANEL_HEIGHT = 420;

/** 初始位置：屏幕正中。拖动之后会被玩家改掉，所以存在字段里而不是常量 */
const INITIAL_X = (ScreenCoordinates.STANDARD_WIDTH - PANEL_WIDTH) / 2;
const INITIAL_Y = (ScreenCoordinates.STANDARD_HEIGHT - PANEL_HEIGHT) / 2;

/** 标题栏高度（像素）。分页条紧贴在它下面 */
const TITLE_HEIGHT = 34;

// —— 分页条 ——

/** 分页条顶边，紧贴标题栏下沿 */
const TAB_BAR_Y = TITLE_HEIGHT;

/** 分页按钮高度 */
const TAB_HEIGHT = 26;

/** 分页条左右留边 */
const TAB_MARGIN_X = 8;

/** 分页按钮之间的缝 */
const TAB_GAP = 4;

/**
 * 分页按钮宽度。
 *
 * 三个按钮**铺满整行**（而不是排成一小撮），是为了把「内容区拦截框要避开的
 * 那块面积」压到最小 —— 分页条没被按钮盖住的部分，点击会漏到世界里去。
 * 现在只剩左右各 8px 和按钮间 4px 的缝，可以忽略。
 */
const TAB_WIDTH =
  (PANEL_WIDTH - TAB_MARGIN_X * 2 - TAB_GAP * (3 - 1)) / 3;

/** 内容区顶边。= 标题栏 + 分页条 + 一道缝 */
const CONTENT_Y = TAB_BAR_Y + TAB_HEIGHT + 6;

/** 分页按钮字号 */
const TAB_FONT_SIZE_PX = 14;

/** 选中的分页文字颜色 */
const TAB_COLOR_ACTIVE = "00FF00";

/** 未选中的分页文字颜色 */
const TAB_COLOR_IDLE = "808080";

// ---------------------------------------------------------------------------
// 内容区行槽
// ---------------------------------------------------------------------------

/**
 * 内容区一次能显示几行。
 *
 * **这是虚拟化的核心**：不按「属性有几条」建 frame，而是固定建这么多槽，
 * 渲染时把第 `offset + i` 条塞进第 `i` 个槽（Step 7 的滚轮/把手就是改 `offset`）。
 * 槽的数量只跟**可视高度**有关，跟属性条数无关。
 *
 * 取值依据：内容区高 `PANEL_HEIGHT - CONTENT_Y = 354`，
 * 12 行 × 26 + 11 道缝 × 3 + 顶部 6 = 351，刚好放得下。
 */
const VISIBLE_ROWS = 12;

/** 单行高度（像素） */
const ROW_HEIGHT = 26;

/** 行间距（像素） */
const ROW_GAP = 3;

/** 第一行距内容区顶边的留白 */
const ROWS_TOP_PAD = 6;

/** 行标签的左留边 */
const ROW_LABEL_X = 14;

/** 行标签宽度。数值列从它右边开始 */
const ROW_LABEL_WIDTH = 140;

/** 数值列左边界 */
const ROW_VALUE_X = ROW_LABEL_X + ROW_LABEL_WIDTH;

// —— 滚动列（Step 7） ——
//
// 面板右边缘一条竖轨 + 一个可拖的把手。它占掉的那一条**从数值列的宽度里让出来**
// —— 靠**几何避让**，不是靠 priority：priority 只管画序，不提供点击穿透
// （文件头那条实测教训）。

/** 轨道宽度 */
const TRACK_WIDTH = 10;

/** 轨道离面板右边缘的距离 */
const TRACK_RIGHT_MARGIN = 8;

/** 轨道左边界 */
const TRACK_X = PANEL_WIDTH - TRACK_RIGHT_MARGIN - TRACK_WIDTH;

/** 数值列与轨道之间留的缝。数值列右边界不能压到轨道上（压上去就是文字盖住滑块） */
const ROW_TRACK_GAP = 6;

/**
 * 数值列宽度。
 *
 * ⚠️ 右边界的定义处**在这里、不在「离面板右边缘 14」** —— 滚动列一进来，
 * 「离右边缘多少」就不再是数值列的事了。写成相对 `TRACK_X` 算，
 * 将来改轨道宽度/留边，数值列自动跟着收，不会撞上。
 */
const ROW_VALUE_WIDTH = TRACK_X - ROW_TRACK_GAP - ROW_VALUE_X;

/** 轨道顶边（内容区坐标系）。与第一行对齐 */
const TRACK_TOP = ROWS_TOP_PAD;

/**
 * 轨道高度 = **一屏行占的高度**（`VISIBLE_ROWS` 行 + 它们之间的缝）。
 *
 * 用「行高之和」而不是「内容区高」，是为了让「把手铺满轨道」恰好等于
 * 「这一页不用滚」—— 两者的几何含义一致，看起来才不别扭。
 */
const TRACK_HEIGHT = VISIBLE_ROWS * ROW_HEIGHT + (VISIBLE_ROWS - 1) * ROW_GAP;

/** 把手再矮也得有这么大，否则行数很多时它细成一根线，点都点不中 */
const THUMB_MIN_HEIGHT = 24;

/**
 * 轨道贴图。`Texture\ui\bars\health.blp` **在磁盘上、也在 `imp.ini` 里**（第 46 行），
 * 实测画得出来。
 */
const TRACK_TEXTURE = "Texture\\ui\\bars\\health.blp";

/**
 * 把手贴图。**必须是一张「实心」的条状贴图**，光「打包进去了」还不够。
 *
 * ## ⚠️ 真正的原因：半透明贴图 = 看不见，不是「取不到」
 *
 * 和轨道 `TRACK_TEXTURE` **同一族、只是颜色不同** —— 血条那一族是本工程里
 * 唯一有实测背书的实心贴图：`CommandCardCooldownUI.ts:117-131` 记录，
 * `HEALTH_BAR_TEXTURE`（就是 `bars\health.blp`，与轨道同一个文件）
 * 「**此刻就正在屏幕上画着一条实心红条**，不透明度是已经被这个 1.27a 环境验证过的」。
 *
 * `blue.blp` 在磁盘上（2,059 B）且在 `imp.ini` 第 45 行登记，与血条是同尺寸同格式的
 * 兄弟文件，区别只在颜色 —— 压在红色轨道上分得清。
 *
 * ## ⚠️ 这里踩过两次
 *
 * 原来用的是 `UIBackgrounds.BLACK_TRANSPARENT`
 *（= `UI\Widgets\EscMenu\Human\editbox-background.blp`）。那个路径**两边都不满足**：
 * `maps/resource/` 下根本没有 `UI/Widgets/EscMenu/` 这个目录，`imp.ini` 里也没登记。
 * 它只能指望游戏自带 MPQ 恰好有这个文件。
 *
 * **取不到时 `DzFrameSetTexture` 不报错、也不画占位图，就是什么都不画。**
 * 表现极具迷惑性：轨道（同一段代码、同一个父节点、同一个 `anchorTo`，只差贴图）
 * 画得好好的，把手却整条不见；而命中判定、拖动、夹取、整行吸附**全部正常**
 *（探针实测 offset 0→4→0 一路正确），所以光看行为会误以为「是自己没点到」。
 * `ChatBoxUI` 里记着同一个坑（那边是 `ESC_MENU`）。
 *
 * 第一次换成了 `Texture\ui\panel_title_background.tga`（磁盘上有、`imp.ini` 第 104 行有，
 * 两条件都满足），**仍然看不见** —— 因为那是个 **32bpp TGA，带 alpha 通道**
 *（`od -An -tu1 -j16 -N1` 读出来位深就是 32）。「打得进地图」和「画得出像素」是两件事：
 * 前者查 `imp.ini`，后者要看贴图**本身是不是实心**。
 *
 * ⚠️ 别再用 BLP 调色板的平均 alpha 去判断实心程度：`health.blp` 量出来只有 23，
 * 可它此刻正画着一条实心红条 —— 那个均值是 256 个调色板槽里大量空槽（alpha=0）拉低的，
 * 测的不是「实际用到的颜色」。
 */
const THUMB_TEXTURE = "Texture\\ui\\bars\\blue.blp";

/**
 * 抓把手时，判定框比把手**四周各外扩**这么多像素。
 *
 * ⚠️ 把手画出来只有 `TRACK_WIDTH`（10px）宽，**命中框不能照抄这个宽度** ——
 * 实测「几乎点不中」。加垫之后命中框约 26px 宽，和一般滚动条的手感相当。
 *
 * 外扩是安全的：判宽了最多是「在把手旁边一点点也能拖」，
 * 不会误伤别的零件 —— 内容区右侧这一带本来就没有其它可点的东西
 *（行数值是 `TEXT`，不接收输入）。
 *
 * 竖向外扩同样重要：把手吸附在两端时，最后一行往往正好贴着轨道端头。
 */
const THUMB_HIT_PAD = 8;

/**
 * 光标离轨道左边界多远仍算「在滚动列上」（`isMouseOverScrollColumn`）。
 *
 * 用途是**几何分工**：这一条竖带不归面板拖动管。判宽了只是面板那一小条拖不动，
 * 判窄了会变成「按在把手边缘结果面板被拖走」。
 *
 * ⚠️ **必须 ≥ `THUMB_HIT_PAD`**，而且这里就用它本身，不写字面量 ——
 * 两个值一旦不一致，`TRACK_X - THUMB_HIT_PAD` 到 `TRACK_X - SCROLL_HIT_PAD`
 * 那一条窄带会**同时通过两个判定**：按下去面板和把手**一起拖走**。
 * 写成同一个常量，改一处就不可能改漏。
 */
const SCROLL_HIT_PAD = THUMB_HIT_PAD;

/** 滚轮一格滚几行。与聊天框的 `WHEEL_STEPS_PER_NOTCH` 同值，手感一致 */
const WHEEL_ROWS_PER_NOTCH = 3;

/**
 * `DzGetWheelDelta() > 0`（往上滚）是不是「看更靠前的行」。
 *
 * ⚠️ 与聊天框那条一样，**方向没有实测过** —— 滚反了就把它改成 `false`，
 * 别处一个字都不用动。
 */
const WHEEL_UP_SCROLLS_UP = true;

/** 行字号。比分页标签小一号 —— 12 行要挤得下 */
const ROW_FONT_SIZE_PX = 15;

/** 行标签颜色（暗一档，让数值跳出来） */
const ROW_LABEL_COLOR = "C8C8C8";

/** 行数值颜色 */
const ROW_VALUE_COLOR = "FFFFFF";

/**
 * 「这一项现在没有值」的显示。
 *
 * 用 `—` 而不是 `0`：`ATTACK_SPEED` / `HP_REGEN` / `MP_REGEN` 的原生 base
 * **从来没被快照过**（`StatSheet.snapshotBaseFromNative` 不设这三项），
 * 恒为 0。显示成 `0` 会被读成「每秒回复 0 点」，是错的。
 */
const DASH = "—";

/** 实时刷新间隔（秒）。与 `StatSystem` 的冲刷拍同频 */
const REFRESH_INTERVAL = 0.1;

// ---------------------------------------------------------------------------
// 层级（`DzFrameSetPriority`）
// ---------------------------------------------------------------------------

/**
 * 取 941~948 这一段：**高于现有全部自建 UI**（ChatBox 880~900、BuffBar 898/899、
 * RelicBar 900/901），**低于 Tips 的 1000** —— 让悬停提示仍然能浮在属性面板之上。
 *
 * 数字一次定死、不依赖「后建的在上层」这个假设。
 *
 * ⚠️ **这组数字只管「谁画在上面」，不管「谁收到点击」** —— 后者的权威教训见文件头。
 * 挡点击的零件要在**几何上**避开被挡的零件。
 */
const PRIORITY_BACKDROP = 941;
const PRIORITY_BODY_HIT = 942;
const PRIORITY_TITLEBAR = 943;
const PRIORITY_TAB = 944;
/**
 * 滚动轨道。**必须高于 `PRIORITY_BODY_HIT`** —— 拦截框铺满整个内容区，
 * 轨道层号比它低就会被它盖住（画不出来，但 `setVisible` 一切正常，
 * 表现是「轨道建了却看不见」，最难查的那种）。
 */
const PRIORITY_TRACK = 945;
/** 所有文字：标题、分页标签。**必须在各自底板之上**，否则会被底板盖住 */
const PRIORITY_TEXT = 946;
const PRIORITY_TITLE_HIT = 947;
/**
 * 滚动把手。**整块面板里最高的一档** —— 它是唯一会被拖动的零件，
 * 被行文字盖住的话就「拖不动了，因为看都看不见」。
 */
const PRIORITY_THUMB = 948;

// ---------------------------------------------------------------------------
// 字体
// ---------------------------------------------------------------------------

/**
 * **必须显式给字体**。不给的话会退回引擎默认字体，那个字号很大，
 * 宽 560 的面板一行放不下几个汉字（`ChatBoxUI.ts:359-369` 记过这个坑，
 * 同样的路径已在游戏里验证能渲染中文）。
 */
const FONT_PATH = "resource\\Texture\\ui\\hpbar\\ZiTi.TTf";

/** 字号（像素） */
const FONT_SIZE_PX = 16;

/** 标题颜色。**不带 `|cff` 前缀** —— 前缀由 `textColorTag()` 拼 */
const TITLE_COLOR = "FFD76A";

/**
 * 文本对齐的打包整数：水平 8=左 / 16=中 / 32=右，垂直 1=上 / 2=中 / 4=下，按位或。
 *
 * ⚠️ `Frame.setTextAlignment(vert, horz)` 的包装函数**把第二个参数丢掉了**
 * （`frame.ts:316` 只把第一个传下去），所以调用处要写
 * `.setTextAlignment(这里这个打包值, 0)`。
 */
const ALIGN_LEFT_MIDDLE = 8 + 2;
const ALIGN_CENTER_MIDDLE = 16 + 2;
/** 右中。属性数值靠右排，小数点对齐、一眼能比大小 */
const ALIGN_RIGHT_MIDDLE = 32 + 2;

/** 拖动轮询间隔（秒）。与 `Panel.startDrag` 同频 */
const DRAG_INTERVAL = 0.01;

// ---------------------------------------------------------------------------
// 三个分页
// ---------------------------------------------------------------------------

/**
 * 面板这一刻在给哪个单位渲染。**两个字段都是「已经验过有效」的**：
 * `unit` 句柄必然可读，`sheet` 为 `null` 表示这个单位没有属性表（正常情况，
 * 见 `resolveSheet`）。
 */
export interface TargetView {
  readonly unit: unit;
  /** 属性表。**没有就是 `null`**，所有取值都要走原生兜底 */
  readonly sheet: StatSheet | null;
}

/**
 * 内容区的一行。
 *
 * 每一行自带 `render`，而不是「一个属性 id 一个格式」。理由：取值路径不统一 ——
 * 有的行**必须永远直读原生**（等级，见下）、有的要走属性表、有的要把两个数拼起来
 * （生命是「当前 / 上限」）。硬套「一个 id 一个值」的表格反而要写一堆特例，
 * 不如让每行自己说清楚怎么算。加一行 = 往数组里加一条。
 */
export interface RowSpec {
  /** 左侧标签 */
  readonly label: string;
  /** 右侧数值。返回的字符串会**原样**送进 `setText` */
  readonly render: (view: TargetView) => string;
}

interface TabSpec {
  /** 分页标签。同时用作标题后缀 */
  readonly label: string;
  /**
   * 这一页的行。**顺序就是显示顺序**。
   *
   * 空数组 = 这一页还没做，内容区显示 `placeholder`。
   */
  readonly rows: RowSpec[];
  /** `rows` 为空时显示的那行字 */
  readonly placeholder: string;
}

// ---------------------------------------------------------------------------
// 取值路径
// ---------------------------------------------------------------------------

/**
 * 取一项属性的数。**有属性表就走它，没有就直读原生**。
 *
 * 「有表优先」是面板存在的意义 —— 只有走 `getFinal` 才吃得到 buff 与遗物的加成；
 * 「没表退回原生」是为了让**没挂过任何来源的普通单位**也能正常显示，
 * 而不是满屏破折号（这一点计划里写得很明白：没表的单位不该被顺手建一张表）。
 *
 * ⚠️ `LIFE` / `MANA` 是例外中的例外：`getFinal` 对这两项**本就直读原生**
 * （它们是引擎管的运行时状态，不属于 base + 修正器那套），所以两条路径同值。
 */
function pick(view: TargetView, stat: StatId, native: (u: unit) => number): number {
  const sheet = view.sheet;
  if (sheet !== null) {
    return sheet.getFinal(stat);
  }
  return native(view.unit);
}

/**
 * 纯 TS 侧属性（攻速 / 回复）：**引擎不认识，也没有原生读法**。
 *
 * 两条都显示 `—`：没有属性表固然没有值；**有表但值恰好是 0 也显示 `—`**，
 * 因为这三项的 base 从来没被快照过，0 不代表「每秒 0 次 / 0 点」。
 */
function tsOnlyText(view: TargetView, stat: StatId): string {
  const sheet = view.sheet;
  if (sheet === null) {
    return DASH;
  }
  const value = sheet.getFinal(stat);
  if (value === 0) {
    return DASH;
  }
  return value.toFixed(2);
}

/**
 * 「只活在属性表里」的属性能不能显示 —— 页面②③ 绝大部分走这条。
 *
 * ## ⚠️ 没表时**不是** `—`，是 `0`
 *
 * 这一点和上面 `tsOnlyText` 的处理**故意不同**，理由是两个「0」的含义不一样：
 *
 * | | 攻速 / 生命回复 / 魔法回复 | 暴击率 / 元素加成 / 穿透 / … |
 * |---|---|---|
 * | 引擎认识它吗 | 认识，单位本来就有攻速 | 完全不认识，是我们发明的 |
 * | base 快照了吗 | **没有**（`snapshotBaseFromNative` 跳过这三项） | 本来就没有原生 base |
 * | 所以 0 表示 | 「不知道」，真值可能是一秒两下 | 「确实是 0」 |
 * | 显示 | `—` | `+0.0%` / `0` |
 *
 * 而「没表 ⟹ 所有 TS 侧加成都是 0」是**结构上成立**的：属性表只在有 buff /
 * 遗物给它挂来源时才惰性建出来（见 `resolveSheet`），没表就是**一条来源都没有**。
 * 所以给没表的单位显示 `+0.0%` 是**报真值**，不是猜。
 *
 * （要是哪天这条不变式被破坏了 —— 比如有人给没表的单位挂来源却忘了建表 ——
 * 面板会显示一片 `+0.0%` 而实际有加成。到时该修的是挂载方，不是这里。）
 */
function sheetNumber(view: TargetView, stat: StatId): number {
  const sheet = view.sheet;
  if (sheet === null) {
    return 0;
  }
  return sheet.getFinal(stat);
}

/**
 * 百分比行：`+12.3%`。
 *
 * 用于**本身就是系数**的属性（0.123 表示 12.3%）：元素加成 / 抗性、暴击率、
 * 吸血、穿透、护盾强效、冷却缩减、韧性、擢升、免伤。
 * 这些的 base 恒为 0，加成走 `FLAT` 加百分点（见 `types.ts` 文件头约束 2）。
 */
function percentText(view: TargetView, stat: StatId): string {
  const v = sheetNumber(view, stat);
  // 负数是合法的（治疗加成可以被削成负收益），所以 `+` 只在非负时加
  return [v >= 0 ? "+" : "", (v * 100).toFixed(1), "%"].join("");
}

/** 平面数值行（元素精通这种「就是个数字」的） */
function flatText(view: TargetView, stat: StatId): string {
  return roundText(sheetNumber(view, stat));
}

/**
 * 暴击伤害 —— **唯一一个 base 非 0 的属性**，所以单独一行处理。
 *
 * `CRIT_DMG` 存的是「暴击打多少倍」里的**增量**：0.5 表示 ×1.5。
 * 直接显示 0.5 会被读成「暴击少打一半」，所以显示 `(1 + v)` 的总倍率。
 *
 * 没表时**不用 `—`**：这个 base 不是从原生快照来的，而是角色出厂值
 * `DEFAULT_CRIT_DMG`（`snapshotBaseFromNative` 直接把它铺进 base）。
 * 它对所有单位都成立，所以没表也能给出真值。
 */
function critDamageText(view: TargetView): string {
  const sheet = view.sheet;
  const v = sheet === null ? DEFAULT_CRIT_DMG : sheet.getFinal(StatType.CRIT_DMG);
  return ["x", (1 + v).toFixed(2)].join("");
}

/** 数值取整。`Math.round` 编译成 `math.floor(v + 0.5)`，返回 Lua **整数**，`tostring` 不会带 `.0` */
function roundText(value: number): string {
  return String(Math.round(value));
}

/** 英雄专有项（三围、等级）。非英雄显示 `—` —— `GetHeroStr` 对它们的行为无保证 */
function heroText(view: TargetView, stat: StatId, native: (u: unit) => number): string {
  if (!IsUnitType(view.unit, UNIT_TYPE_HERO)) {
    return DASH;
  }
  return roundText(pick(view, stat, native));
}

/** 当前值 / 上限 这种「一个框里两个数」的行 */
function overText(current: number, max: number): string {
  return [roundText(current), " / ", roundText(max)].join("");
}

/**
 * 英雄当前累计经验。非英雄显示 `—`。
 *
 * `GetHeroXP` 是**绝对累计**（跨级累加），不是「当前级内已攒了多少」——
 * 这一点是实测出来的：2 级英雄读数是 200，而 200 恰好是 2 级的入口地板。
 */
function heroXpText(u: unit): string {
  if (!IsUnitType(u, UNIT_TYPE_HERO)) {
    return DASH;
  }
  return roundText(GetHeroXP(u));
}

/**
 * 距离升级还差多少经验。
 *
 * ## ⚠️ `DzGetUnitNeededXP` 的语义是**实测出来的**，不要再照文档猜
 *
 * 官方文档只有一句「获取单位 X 的 L 级升级所需经验」（`call.txt:186-195`），
 * 而它在「每级增量 / 累计阈值」以及「参数是当前级 / 目标级」之间是**歧义的**。
 * 这个函数是 `native`（`BlizzardAPI.j:45`），Jass 侧没有实现可读。
 *
 * 2026-10-05 用 `src/test/XPNeededProbe.ts` 做了受控实验（造一个临时同类型
 * 英雄、逐点喂经验测出真实的升级阈值）。结论：
 *
 * - `needed(u, 1..8) = 200 | 500 | 900 | 1400 | 2000 | 2700 | 3500 | 4400`
 *   —— 这是魔兽标准英雄经验表的**累计阈值**，不是每级增量。
 * - 2 级英雄的 `GetHeroXP` 恰好是 `200`，即 `needed(u, 1)`
 *   —— 说明 **`needed(u, L)` 的参数是「当前等级」，返回的是「离开 L 级
 *   （也就是升到 L+1 级）所需的累计经验总量」**。
 * - 决定性验证：一个 2 级 / 200 经验的英雄，喂到**累计 500 点**时升到 3 级，
 *   而 `needed(u, 2)` 正是 `500`。
 *
 * 所以「还差多少」= `needed(u, 当前等级) - GetHeroXP(u)`，
 * **参数用当前等级、被减数用累计值** —— 两个候选公式（增量语义 / 目标等级
 * 语义）都不对，别照着它们写。
 *
 * ## 满级怎么办：`needed` 不会返回 0，它是**饱和**的
 *
 * ⚠️ 这是第二轮探针（打印到 12 级）才发现的事，第一轮只打到 8 级看不出来：
 *
 *    `needed(u, 1..12) = 200 | 500 | 900 | 1400 | 2000 | 2700 | 3500 | 4400
 *                        | 5400 | 5400 | 5400 | 5400`
 *
 * 表在最后一项 `5400`（升到 10 级所需的累计值）就**卡住不再变**了，
 * 而不是越过末级返回 0。所以「`needed` 返回 0」**不是**可用的满级判据 ——
 * 拿它当判据的写法永远不会触发，满级英雄会一路走到下面的减法，
 * 算出 `5400 - 5400 = 0` 然后**显示 `0`**，看起来像个真实读数。
 *
 * 唯一可靠的满级信号是 **`remain <= 0`**：英雄停在最高级时 `GetHeroXP`
 * 必然 ≥ 该级的累计阈值，而**非满级英雄不可能停在那里** —— 到了阈值引擎
 * 立刻把他顶升级。所以差值非正 = 已是最高级，显示 `—`（「还需」为「无」），
 * 不显示 `0`。
 *
 * 至于非英雄：`needed(u, 1)` 实测就是 **0**，所以那条 `IsUnitType` 守卫
 * **必须自己写** —— 光看返回值区分不出「非英雄」和「数据缺失」。
 * 下面 `total <= 0` 那条是给「单位类型压根没有经验表」留的防御分支，
 * 对英雄正常情况下永远不会走到（因为表是饱和的，最差也是 5400）。
 */
function xpToLevelText(u: unit): string {
  if (!IsUnitType(u, UNIT_TYPE_HERO)) {
    return DASH;
  }
  const total = DzGetUnitNeededXP(u, GetHeroLevel(u));
  if (total <= 0) {
    return DASH;
  }
  const remain = total - GetHeroXP(u);
  if (remain <= 0) {
    return DASH;
  }
  return roundText(remain);
}

// ---------------------------------------------------------------------------
// 分页内容
// ---------------------------------------------------------------------------

/**
 * 页面① 基础属性。**正好 12 行，恰好填满内容区**。
 *
 * 「攻击速度」「生命回复」「魔法回复」被放进页面③ —— 它们是同一类东西
 * （纯 TS 侧、引擎不认识的属性，0 时显示 `—`），摆在一起才讲得通。
 * Step 4 刚加完经验两条时这里是 13 行、末尾那一行会被挤出可视区；
 * 把攻速挪走之后正好收口，不需要等 Step 7 的滚动条。
 *
 * 也就是说**页面① 永远不该溢出** —— 它要是又超过 12 行，要么往页面②③挪，
 * 要么就是真的该等滚动条了。
 */
/**
 * ⚠️ **导出只给 `src/test/StatPanelTestExample.ts` 用** —— 自测拿这张表去跑
 * 真实的 `render` 函数，而不是另外抄一份公式（抄的那份会漂移）。
 * 生产代码只在下面 `TABS` 里引用它。
 */
export const BASIC_ROWS: RowSpec[] = [
  {
    // ⚠️ **等级永远直读原生**，不走 `getFinal(LEVEL)` ——
    // 属性表里的 `LEVEL` 只在建表那一刻快照一次，之后升级也不会变，
    // 用它显示就是永久陈旧值（计划风险 #12）。
    label: "等级",
    render: (v) => (IsUnitType(v.unit, UNIT_TYPE_HERO) ? roundText(GetUnitLevel(v.unit)) : DASH),
  },
  {
    // 经验两条都**直读原生**（N 路径）—— 经验是英雄专有的运行时状态，
    // 和生命/魔法同类，不该被属性表的修正器加成（见计划「已确认决策 2」）。
    label: "经验",
    render: (v) => heroXpText(v.unit),
  },
  {
    label: "升级还需",
    render: (v) => xpToLevelText(v.unit),
  },
  {
    label: "生命",
    render: (v) =>
      overText(
        pick(v, StatType.LIFE, (u) => GetUnitState(u, UNIT_STATE_LIFE)),
        pick(v, StatType.MAX_LIFE, (u) => GetUnitState(u, UNIT_STATE_MAX_LIFE))
      ),
  },
  {
    label: "魔法",
    render: (v) =>
      overText(
        pick(v, StatType.MANA, (u) => GetUnitState(u, UNIT_STATE_MANA)),
        pick(v, StatType.MAX_MANA, (u) => GetUnitState(u, UNIT_STATE_MAX_MANA))
      ),
  },
  {
    label: "力量",
    render: (v) => heroText(v, StatType.STRENGTH, (u) => GetHeroStr(u, false)),
  },
  {
    label: "敏捷",
    render: (v) => heroText(v, StatType.AGILITY, (u) => GetHeroAgi(u, false)),
  },
  {
    label: "智力",
    render: (v) => heroText(v, StatType.INTELLIGENCE, (u) => GetHeroInt(u, false)),
  },
  {
    label: "基础攻击",
    render: (v) => roundText(pick(v, StatType.BASE_ATTACK, (u) => GetUnitState(u, UNIT_STATE_ATTACK_WHITE))),
  },
  {
    label: "附加攻击",
    render: (v) => roundText(pick(v, StatType.BONUS_ATTACK, (u) => GetUnitState(u, UNIT_STATE_ATTACK_BONUS))),
  },
  {
    label: "护甲",
    render: (v) => roundText(pick(v, StatType.ARMOR, (u) => GetUnitState(u, UNIT_STATE_DEFEND_WHITE))),
  },
  {
    label: "移动速度",
    render: (v) => roundText(pick(v, StatType.MOVE_SPEED, (u) => GetUnitMoveSpeed(u))),
  },
];

// ---------------------------------------------------------------------------
// 元素属性（页面②）
// ---------------------------------------------------------------------------

/**
 * 元素显示名。**物理也在这张表里** —— 它在 `ELEMENTS` 里本来就是一个成员
 * （排 0，见 `types.ts`：「面板上『物理伤害加成』和七元素是并列的一行」）。
 *
 * 非物理的后面统一缀「元素」，读起来才不成句 —— 「火伤害加成」不如
 * 「火元素伤害加成」，「物理元素抗性」则是错的，所以物理单独留「物理」。
 */
const ELEMENT_LABELS: Record<ElementId, string> = {
  physical: "物理",
  fire: "火元素",
  water: "水元素",
  thunder: "雷元素",
  ice: "冰元素",
  wind: "风元素",
  rock: "岩元素",
  grass: "草元素",
};

/**
 * 按 `ELEMENTS` 生成 8 行。**不手抄一份元素名顺序** —— 那份表一改就漂移。
 *
 * `statOf` 决定取的是「伤害加成块」还是「抗性块」（两块同下标，见 `types.ts`
 * 的 `elemDamageStat` / `elemResistStat`）。
 */
function elementRows(statOf: (e: ElementId) => StatId, suffix: string): RowSpec[] {
  const rows: RowSpec[] = [];
  for (let i = 0; i < ELEMENTS.length; i++) {
    const e = ELEMENTS[i];
    if (e === undefined) {
      continue;
    }
    const stat = statOf(e);
    const label = [ELEMENT_LABELS[e], suffix].join("");
    rows.push({ label, render: (v) => percentText(v, stat) });
  }
  return rows;
}

/**
 * 页面② 元素属性，17 行 = 物理+七元素加成(8) + 元素精通(1) + 物理+七元素抗性(8)。
 *
 * 17 行 > 12 个槽，**底部 5 行溢出**，等 Step 7 的滚动条。这是预期的。
 */
export const ELEMENT_ROWS: RowSpec[] = [
  ...elementRows(elemDamageStat, "伤害加成"),
  {
    // 元素精通是「就是个数字」的量（不是 0~1 的系数），所以不走 `percentText`
    label: "元素精通",
    render: (v) => flatText(v, StatType.ELEMENTAL_MASTERY),
  },
  ...elementRows(elemResistStat, "抗性"),
];

// ---------------------------------------------------------------------------
// 高级属性（页面③）
// ---------------------------------------------------------------------------

/**
 * 页面③ 高级属性，14 行。
 *
 * 打头三项是**纯 TS 侧、引擎不认识**的属性，所以用 `tsOnlyText`（0 显示 `—`，
 * 因为它们的原生 base 从来没被快照过）；其余都是系数类，走 `percentText`。
 *
 * 14 行 > 12 个槽，底部 2 行溢出，同样等 Step 7。
 */
export const ADVANCED_ROWS: RowSpec[] = [
  { label: "攻击速度", render: (v) => tsOnlyText(v, StatType.ATTACK_SPEED) },
  { label: "生命回复", render: (v) => tsOnlyText(v, StatType.HP_REGEN) },
  { label: "魔法回复", render: (v) => tsOnlyText(v, StatType.MP_REGEN) },
  { label: "暴击率", render: (v) => percentText(v, StatType.CRIT_RATE) },
  // 唯一 base 非 0 的属性，单独渲染成总倍率 —— 理由见 `critDamageText`
  { label: "暴击伤害", render: (v) => critDamageText(v) },
  { label: "吸血", render: (v) => percentText(v, StatType.LIFESTEAL) },
  { label: "治疗加成", render: (v) => percentText(v, StatType.HEAL_BONUS) },
  { label: "护甲穿透", render: (v) => percentText(v, StatType.ARMOR_PEN) },
  { label: "元素穿透", render: (v) => percentText(v, StatType.ELEMENTAL_PEN) },
  { label: "护盾强效", render: (v) => percentText(v, StatType.SHIELD_STRENGTH) },
  { label: "冷却缩减", render: (v) => percentText(v, StatType.COOLDOWN_REDUCTION) },
  { label: "韧性", render: (v) => percentText(v, StatType.TENACITY) },
  { label: "伤害擢升", render: (v) => percentText(v, StatType.DAMAGE_AMPLIFY) },
  { label: "免伤", render: (v) => percentText(v, StatType.DAMAGE_REDUCTION) },
];

/**
 * 三页的行全在这里，**只给自测用**（`StatPanelTestExample` 按标签查一行）。
 *
 * 自测要跨页找行 —— 比如「攻击速度」现在在页面③，只查 `BASIC_ROWS` 会查不到。
 * 用 `push` 拍平而不是 `...` 展开三次，避免生成物里出现意外的深嵌套。
 */
export const ALL_ROWS: RowSpec[] = (() => {
  const all: RowSpec[] = [];
  for (let i = 0; i < BASIC_ROWS.length; i++) {
    const r = BASIC_ROWS[i];
    if (r !== undefined) all.push(r);
  }
  for (let i = 0; i < ELEMENT_ROWS.length; i++) {
    const r = ELEMENT_ROWS[i];
    if (r !== undefined) all.push(r);
  }
  for (let i = 0; i < ADVANCED_ROWS.length; i++) {
    const r = ADVANCED_ROWS[i];
    if (r !== undefined) all.push(r);
  }
  return all;
})();

/**
 * 分页表。**顺序就是显示顺序，下标就是 `activeTab` 的取值**。
 *
 * 加第四页时只要往这里加一条 —— 布局是按 `TABS.length` 算出来的，
 * 内容区容器、行槽、按钮、文字都是按这张表建/刷的，没有别处要同步改。
 *
 * `placeholder` 只在 `rows` 为空时才会被建出来（见 `createPages`），
 * 现在三页都有行，所以它只是给「将来新开的空页」留的占位。
 */
const TABS: TabSpec[] = [
  { label: "基础属性", rows: BASIC_ROWS, placeholder: "" },
  { label: "元素属性", rows: ELEMENT_ROWS, placeholder: "" },
  { label: "高级属性", rows: ADVANCED_ROWS, placeholder: "" },
];

// ---------------------------------------------------------------------------
// 小工具
// ---------------------------------------------------------------------------

/** 像素宽 → WC3 归一化宽度 */
function pxW(px: number): number {
  return (px / ScreenCoordinates.STANDARD_WIDTH) * ScreenCoordinates.WC3_SCREEN_WIDTH;
}

/** 像素高 → WC3 归一化高度 */
function pxH(px: number): number {
  return (px / ScreenCoordinates.STANDARD_HEIGHT) * ScreenCoordinates.WC3_SCREEN_HEIGHT;
}

/** 像素字号 → WC3 字体高度。与 `Text.setFontSizePixels` 同一套换算 */
function pixelFontSize(px: number): number {
  return pxH(px);
}

/** 拼颜色前缀。别用 `DzFrameSetTextColor`（编码未知、全仓零调用） */
function textColorTag(hex: string): string {
  return "|cff" + hex;
}

/**
 * 把 `frame` 按**像素矩形相对锚定**到 `parent`。
 *
 * 两个角都锚在 `parent` 的左上角，偏移量直接由像素算出 —— 这样只有一套换算，
 * 不会出现「左上按左边缘算、右下按右边缘算」那种对不上的情况。
 */
function anchorTo(
  frame: Frame,
  parent: Frame,
  x: number,
  y: number,
  width: number,
  height: number
): void {
  frame
    .setPoint(FRAME_ALIGN_LEFT_TOP, parent, FRAME_ALIGN_LEFT_TOP, pxW(x), -pxH(y))
    .setPoint(FRAME_ALIGN_RIGHT_BOTTOM, parent, FRAME_ALIGN_LEFT_TOP, pxW(x + width), -pxH(y + height));
}

/**
 * 把手在**轨道本地坐标**里的纵向偏移（轨道顶边 = 0）。
 *
 * ⚠️ 把手是**轨道的子节点**（理由见 `createScrollBar`），所以锚点基准从
 * 「内容区左上角」换成了「轨道左上角」—— 而轨道自己就落在 `CONTENT_Y + TRACK_TOP`。
 *
 * `thumbTop` 全程仍按**内容区坐标**记：`isMouseOverThumb` 与 `updateThumbDrag`
 * 都拿它直接跟鼠标的屏幕坐标比。换算只发生在锚定这一下，不要在别处减。
 */
function thumbLocalY(thumbTop: number): number {
  return thumbTop - TRACK_TOP;
}

/** 给根 frame 按**像素矩形绝对定位**（相对屏幕） */
function setScreenRect(frame: Frame, x: number, y: number, width: number, height: number): void {
  const pos = ScreenCoordinates.pixelToWC3(x, y, ScreenCoordinates.ORIGIN_TOP_LEFT);

  frame
    .setAbsPoint(FRAME_ALIGN_LEFT_TOP, pos.x, pos.y)
    .setAbsPoint(FRAME_ALIGN_RIGHT_BOTTOM, pos.x + pxW(width), pos.y - pxH(height));
}

/**
 * 有 frame 就设可见性。
 *
 * 存在的意义是让 `applyVisibility()` 里那十几个 `setVisible` 能排成一张表：
 * 分页那几个 frame 是循环建进数组的，可能因为建失败而缺席（数组比 `TABS` 短），
 * 所以取出来是 `Frame | undefined`。这个函数把「有没有」和「要显示吗」合成一步。
 */
function setVisibleIf(frame: Frame | null | undefined, visible: boolean): void {
  if (frame === null || frame === undefined) {
    return;
  }
  frame.setVisible(visible);
}

/** 显式定层。失败只记日志 —— 层序不对顶多是「看不见」，不该让整个 `create()` 断掉 */
function setPriority(frame: Frame | null, priority: number): void {
  if (frame === null) {
    return;
  }
  try {
    DzFrameSetPriority(frame.handle, priority);
  } catch (e) {
    log.error(`设置层级失败：${e}`);
  }
}

/** 鼠标当前横坐标（1920x1080 像素坐标）。与 `Panel.getMousePixelX` 同一套换算 */
function getMousePixelX(): number {
  return (DzGetMouseXRelative() / DzGetWindowWidth()) * ScreenCoordinates.STANDARD_WIDTH;
}

/** 鼠标当前纵坐标（1920x1080 像素坐标） */
function getMousePixelY(): number {
  return (DzGetMouseYRelative() / DzGetWindowHeight()) * ScreenCoordinates.STANDARD_HEIGHT;
}

/**
 * 把一行文字写进槽里，**内容没变就不调 `setText`**。
 *
 * 0.1s 一拍 × 12 行 × 2 列，绝大多数是静止的（护甲、三围这些一拍都不动一次）。
 * 每拍无脑重设一遍虽然不出错，但 `setText` 会让引擎重排那行文字，
 * 白烧的。缓存存在 `cache[slot]`，比较的是**带颜色前缀的最终串**。
 *
 * ⚠️ Step 7 起**标签也用这条路径**（滚动之后同一个槽会显示不同的行，
 * 标签跟着换）。在滚动之前标签是建的时候写死一次的，不走缓存。
 */
function setCachedText(
  frame: Frame | undefined,
  cache: string[],
  slot: number,
  color: string,
  raw: string
): void {
  if (frame === undefined) {
    return;
  }
  const text = [textColorTag(color), raw, "|r"].join("");
  if (cache[slot] === text) {
    return;
  }
  cache[slot] = text;
  frame.setText(text);
}

/**
 * 拿这个单位的属性表。**没有就返回 `null`，绝不顺手建一张**。
 *
 * ## 为什么「没表」是常态而不是异常
 *
 * `Actor` 的属性表是**惰性**建的，只有 `BuffManager` / `RelicSystem` 给它挂
 * 来源时才会真的建起来（`BuffManager.ts:70`、`RelicSystem.ts:282`）。
 * 一个既没 buff 也没遗物的普通单位**本来就没有表** —— 那就该走原生兜底，
 * 而不是因为面板看了它一眼就凭空建一张 43 项 × 3 个数组的表。
 *
 * ## 两道守卫都不能省
 *
 * - `Actor.getById` 只从 `allActors` 里取。`detach()` 死亡时会把条目删掉，
 *   所以**已 detach 的 Actor 根本取不到** —— 这是防「在死句柄上重建表」
 *   （计划风险 #17）的结构性防线。
 * - 再比一次 `allActors[id] === actor` 是防「取到的和表里现在存着的不是同一个」
 *   这种更隐蔽的情况（句柄 ID 会被引擎回收复用）。
 *
 * ⚠️ **必须先问 `hasStatSheet()`**：`actor.statSheet` 的 getter 是惰性建表的，
 * 直接取就等于建了。
 */
function resolveSheet(u: unit): StatSheet | null {
  const id = GetHandleId(u);
  const actor = Actor.getById(id);
  if (actor === undefined) {
    return null;
  }
  if (Actor.allActors[id] !== actor) {
    return null;
  }
  if (!actor.hasStatSheet()) {
    return null;
  }
  return actor.statSheet;
}

export class StatPanelUI {
  private static instance: StatPanelUI | undefined;

  /**
   * 选中 / 死亡事件**只订阅一次**。
   *
   * `gameEvents` 那套是本仓自己的事件表，没有「解绑」接口（`BuffBarUI` 也是
   * 同一个写法），所以 `create()` 万一被调第二次，再订一遍就会每拍对两次账。
   * 用静态标记挡住 —— 本类本来就是单例，这个守卫只是给「热重载 / 重复 create」
   * 兜底。
   */
  private static selectionBound = false;

  private backdrop: Frame | null = null;
  private titleBar: Frame | null = null;
  private title: Frame | null = null;
  private titleHit: Frame | null = null;
  private bodyHit: Frame | null = null;

  // —— 分页 ——
  //
  // 三个数组**与 `TABS` 同序、等长**，用 `push` 逐个填 ——
  // 绝不按下标写、留空洞：带洞数组的 `.length` 在 Lua 里是 0（项目铁律
  // `wc3-tstl-sparse-array-length`），那种错会静默到连诊断日志都跟着撒谎。

  /** 分页按钮的点击框（不贴图，只管收点击） */
  private readonly tabHits: Frame[] = [];
  /** 分页标签文字 */
  private readonly tabTexts: Frame[] = [];
  /** 三个内容区容器。**同时只有一个可见** */
  private readonly pageFrames: Frame[] = [];

  // —— 行槽 ——
  //
  // 三个二维数组，**第一维与 `TABS` 同序**，第二维固定 `VISIBLE_ROWS` 长。
  // 内层同样只用 `push` 填 —— 理由同上（带洞数组在 Lua 里 `.length` 是 0）。

  /** 每页每槽的标签 frame（只在建的时候写一次文字，之后不碰） */
  private readonly rowLabels: (Frame | undefined)[][] = [];
  /** 每页每槽的数值 frame */
  private readonly rowValues: (Frame | undefined)[][] = [];
  /**
   * 每页每槽**上一次送进 `setText` 的字符串**。
   *
   * 用途是「没变就不 `setText`」—— 0.1s 拍 × 12 行，多数行是静止的，
   * 每拍重设一遍纯属白烧。初值 `""`，而任何一行渲染出来至少是 `—`，
   * 所以初值永远不会误判成「没变」。
   */
  private readonly lastRowText: string[][] = [];
  /**
   * 每页每槽**上一次写进标签的字符串**。理由同上。
   *
   * ⚠️ Step 7 之前标签是建的时候写死一次的、不参与刷新。滚动进来之后
   * 第 `i` 个槽会随 `offset` 显示不同的行，标签必须跟着换 —— 所以它
   * 和数值一样走 `setCachedText` 的缓存路径（各留一份缓存，因为颜色不同）。
   */
  private readonly lastRowLabel: string[][] = [];

  /**
   * 当前分页下标。**这是分页的唯一权威状态** —— 按钮配色、内容区显隐、
   * 标题文字都是它的投影。
   */
  private activeTab = 0;

  // —— 滚动列（Step 7） ——

  /** 轨道。可见性跟着「这一页能不能滚」，见 `syncScrollBar` */
  private trackFrame: Frame | null = null;

  /**
   * 把手。**不是 `Button`、也不用 `setDraggable`** —— 理由见 `createScrollBar`。
   * 它的位置和高度全由 `syncScrollBar` 按 `offset` 摆。
   */
  private thumbFrame: Frame | null = null;

  /**
   * 内容区顶部那一行**在整页里的行号**。`0` = 从第一行开始。
   *
   * **这是滚动的唯一权威状态** —— 把手的位置只是它的投影，就像分页的
   * `activeTab` 与按钮配色那样。**切页时归零**（`selectTab`）。
   */
  private offset = 0;

  /** 把手高度（像素）。由 `syncScrollBar` 算，拖动时要拿它换算位置 */
  private thumbHeight = THUMB_MIN_HEIGHT;

  /** 把手顶边**在内容区坐标系里的 y**。同上，拖动判定要用 */
  private thumbTop = TRACK_TOP;

  /**
   * 这一页能不能滚（行数 > 一屏）。
   *
   * 存成字段是给 `isMouseOverThumb()` 用的 —— 它要在按下那一刻回答
   * 「光标在不在把手上」，而「把手此刻显示没显示」正是这个。
   * **不靠 `enter/leave` 维护**（见仓库记忆 `wc3-hover-flag-vs-geometry`），
   * 这个字段由 `syncScrollBar` 每次渲染时算出来，不含时间维度。
   */
  private scrollable = false;

  /** 全局滚轮触发器（兜底路）。只为「帧级那条路不派发」时接手，见 `bindWheel` */
  private wheelTrigger: trigger | null = null;

  /**
   * 帧级滚轮事件**响过至少一次**。一旦为真，全局那条兜底路永久退休。
   *
   * 与 `ChatBoxUI.frameWheelWorks` 同一套自愈做法，理由也在那边写着：
   * `FRAMEEVENT_MOUSE_WHEEL` 在本仓从没用过，1.27a 上派不派发是未知数；
   * 而全局触发器**确定能用**（`CameraControl` 就是拿它做镜头缩放的）。
   */
  private frameWheelWorks = false;

  /** 此刻在拖把手 */
  private thumbDragging = false;
  /** 按下时「光标 Y − 把手顶边 Y」。拖动中保持不变，否则把手会跳到光标下 */
  private thumbGrabOffset = 0;
  private thumbDragTimer: timer | null = null;
  private thumbMouseUpId = -1;

  // —— 实时刷新 ——

  /**
   * 面板当前目标单位。`undefined` = 现在没有选中任何可显示的单位，
   * 这时所有行渲染成 `—`（Step 6 会在此基础上加「自动关闭 / 重现」）。
   */
  private targetUnit: unit | undefined = undefined;
  /** 目标的属性表。`null` = 这个单位没有表，取值退回原生 */
  private targetSheet: StatSheet | null = null;
  /** 0.1s 刷新拍 */
  private refreshTimer: timer | null = null;

  private created = false;

  /**
   * 用户意图：面板「开着」吗。**C 键切换它，取消选中不动它。**
   *
   * 与**实际可见**是两件事 —— 没选中（或选中的单位死了）时即使 `panelOpen`
   * 为真也不可见，并会在重新选中时自动重现（决策 5）。
   * 所以「屏幕上有没有东西」一律问 `isVisible()`，不要直接读这个字段。
   */
  private panelOpen = false;

  // —— 位置 ——
  private panelX = INITIAL_X;
  private panelY = INITIAL_Y;

  // —— 拖动 ——
  private dragging = false;
  private dragOffsetX = 0;
  private dragOffsetY = 0;
  private dragTimer: timer | null = null;
  private dragMouseUpId = -1;

  private constructor() {}

  public static getInstance(): StatPanelUI {
    if (!StatPanelUI.instance) {
      StatPanelUI.instance = new StatPanelUI();
    }
    return StatPanelUI.instance;
  }

  /**
   * 用户是否把面板「开着」。
   *
   * ⚠️ **不是「屏幕上有没有东西」** —— Step 6 起没选中单位时开着也不可见。
   * 名字刻意不叫 `isVisible`，免得将来被当成可见性查询用。
   */
  public isOpen(): boolean {
    return this.panelOpen;
  }

  public create(): void {
    if (this.created) {
      log.warn("已创建过，重复调用被忽略");
      return;
    }
    this.created = true;

    const parent = Frame.fromHandle(DzGetGameUI());
    if (!parent) {
      log.error("拿不到 GameUI，属性面板没建（按 C 不会有反应）");
      return;
    }

    this.createBackdrop(parent);
    if (this.backdrop === null) {
      return;
    }
    this.createTitleBar();

    // ⚠️ 这两步**必须整块成功**，所以它们返回布尔值，失败就到此为止。
    //
    // 理由是所有「按页」的数组（`pageFrames` / `tabHits` / `tabTexts` /
    // 行槽的二维表）都**只按下标使用**，而下标含义是「`TABS` 的第几页」。
    // 中间某一页建失败却只 `continue` 的话，后面的页会整体前移 ——
    // 于是第 2 页的行画进第 1 页的容器、分页按钮的点击落到隔壁页的标签上，
    // 而且**全程一声不吭**。宁可整块不建，也不要一屏错位的零件。
    if (!this.createPages()) {
      log.error("内容区容器没建全，面板整体放弃（按 C 不会显示行）");
      return;
    }
    if (!this.createRowSlots()) {
      log.error("行槽没建全，面板整体放弃（按 C 不会显示属性行）");
      return;
    }
    if (!this.createTabBar()) {
      log.error("分页按钮没建全，面板整体放弃（按 C 不会显示分页）");
      return;
    }

    // ⚠️ **必须在 createTabBar 之后**：拦截框要在几何上避开分页条，
    // 而分页条的矩形是按 `TABS.length` 算的 —— 让唯一的定义处先跑。
    this.createBodyHit();
    // 滚动列也是拦截框的兄弟，且**画在它上面**（`PRIORITY_TRACK`/`PRIORITY_THUMB`
    // 都高于 `PRIORITY_BODY_HIT`）—— 所以同样得在拦截框之后建。
    this.createScrollBar();
    this.refreshTabVisuals();

    // 开局是关着的
    this.applyVisibility();

    this.bindKeys();
    this.bindDrag();
    this.bindScrollDrag();
    this.bindWheel();
    this.bindRefresh();

    log.info(`created at (${this.panelX}, ${this.panelY}) size ${PANEL_WIDTH}x${PANEL_HEIGHT}`);
  }

  // ------------------------------------------------------------------
  // 建 frame（只在 create() 里跑一次）
  // ------------------------------------------------------------------

  /** 背景板。C / ESC 开关的是它（的可见性），拖动移动的也是它 */
  private createBackdrop(parent: Frame): void {
    const backdrop = Frame.createType("StatPanel_Backdrop", parent, 0, "BACKDROP", "");
    if (!backdrop) {
      log.error("背景板创建失败（按 C 不会有反应）");
      return;
    }

    setScreenRect(backdrop, this.panelX, this.panelY, PANEL_WIDTH, PANEL_HEIGHT);
    // `SHUIMO_STYLE_PANEL_BACKGROUND` 就是 `Panel` 用的那张，是本仓
    // 「肉眼验证过能取到」的深色面板贴图（`ChatBoxUI.ts:246-264` 有对比记录）。
    backdrop.setTexture(UIBackgrounds.SHUIMO_STYLE_PANEL_BACKGROUND, 0, true);
    backdrop.setAlpha(245);
    setPriority(backdrop, PRIORITY_BACKDROP);

    this.backdrop = backdrop;
  }

  /**
   * 标题栏 = 底板 + 标题文字 + 拖动命中框。三样都相对锚定到背景板。
   *
   * 底板用 `BLACK_TRANSPARENT`（= `editbox-background.blp`，`Panel.createTitleBar`
   * 用的也是它，`Panel.ts:230`）叠 alpha 200。
   *
   * ⚠️ **它铺在深色水墨面板上其实几乎看不见** —— 曾经为此换成过
   * `SHUIMO_STYLE_PANEL_TITLE_BACKGROUND`（那张白色笔触），但那个样子不好看，
   * 已按用户要求改回这一版。
   *
   * 因此**把手的可见性不能指望这块底板**：能拖的范围由 `isMouseOverPanel()` 算几何
   * 决定（整个面板减去分页条那条），跟画成什么样无关。
   * 将来若还是觉得找不到把手，改这里或加个悬停高亮都行。
   */
  private createTitleBar(): void {
    const backdrop = this.backdrop;
    if (backdrop === null) {
      return;
    }

    const bar = Frame.createType("StatPanel_TitleBar", backdrop, 0, "BACKDROP", "");
    if (!bar) {
      log.error("标题栏创建失败（面板将无法拖动）");
      return;
    }
    anchorTo(bar, backdrop, 0, 0, PANEL_WIDTH, TITLE_HEIGHT);
    bar.setTexture(UIBackgrounds.BLACK_TRANSPARENT, 0, true);
    bar.setAlpha(200);
    setPriority(bar, PRIORITY_TITLEBAR);
    this.titleBar = bar;

    const title = Frame.createType("StatPanel_Title", bar, 0, "TEXT", "");
    if (title) {
      anchorTo(title, bar, 12, 4, PANEL_WIDTH - 24, TITLE_HEIGHT - 8);

      // ⚠️ `Frame.setTextAlignment(vert, horz)` 的包装函数**把第二个参数丢了**
      //（`frame.ts:316` 只把 `vert` 传下去），所以那个参数实际是**打包后的一个整数**。
      // 别写成 `.setTextAlignment(LEFT, MIDDLE)` —— 那样传的是 LEFT，对齐是错的。
      title.setTextAlignment(ALIGN_LEFT_MIDDLE, 0);
      title.setFont(FONT_PATH, pixelFontSize(FONT_SIZE_PX), 0);
      title.setText(textColorTag(TITLE_COLOR) + "属性面板|r");
      setPriority(title, PRIORITY_TEXT);
      this.title = title;
    } else {
      log.error("标题文字创建失败");
    }

    // 命中框：铺满标题栏。`setAllPoints` 是相对锚定，跟着 bar 走。
    //
    // ⚠️ **它不参与「能不能拖」的判定** —— 那个由 `isMouseOverPanel()` 算几何
    // （见那里的说明）。它在这里的唯一职责是**吃掉落在标题栏上的点击**，
    // 让那一下不穿到世界去（否则拖完松手可能顺手对地面下了移动命令）。
    // 这是 frame 命中测试自带的机制，不需要绑任何事件 —— `ChatBoxUI` 的
    // `ChatBoxWheelHit` 同样是一张不贴图、只负责挡点击的 BUTTON。
    const hit = Frame.createType("StatPanel_TitleHit", bar, 0, "BUTTON", "");
    if (hit) {
      hit.setAllPoints(bar);
      setPriority(hit, PRIORITY_TITLE_HIT);
      this.titleHit = hit;
    } else {
      log.error("标题栏命中框创建失败（拖标题栏会顺手点到世界）");
    }
  }

  /**
   * 三个内容区容器。全是**透明**的 BACKDROP（贴图给 `NONE` = 空串），
   * 只当「一块可以被整体显隐的区域」用。
   *
   * 属性行槽也挂在它们底下（`createRowSlots`）—— 所以「切页只改容器可见性」
   * 这一条就自动成立，不用逐个去碰里面的行。
   *
   * 只有 `rows` 还是空的那几页才建一行占位文案；有真内容的页不建。
   *
   * 返回 `false` 表示**没建全**，调用方必须整体放弃（理由见调用处）。
   */
  private createPages(): boolean {
    const backdrop = this.backdrop;
    if (backdrop === null) {
      return false;
    }

    for (let i = 0; i < TABS.length; i++) {
      const spec = TABS[i];
      if (spec === undefined) {
        // `TABS` 里有洞 —— 数组本身坏了，不是「这一页没建出来」
        log.error(`分页表第 ${i} 条是空的，面板整体放弃`);
        return false;
      }

      // ⚠️ 类型必须是 `"FRAME"` 且**绝不能调 `setTexture`** —— 这是本仓纯容器的
      // 唯一正确写法（`Panel.ts:288` 的 `PanelContent` 就是这个形状）。
      //
      // 曾经写成 `"BACKDROP"` + `setTexture(UIBackgrounds.NONE)`：`NONE` 是空串，
      // 而 BACKDROP 拿到空贴图不会「什么都不画」，而是渲染成 WC3 的**缺贴图占位**
      // —— 一整块亮绿，正好铺满内容区。玩家看到的就是这个，而且它还会盖住
      // 底下的滚动轨道。容器不需要贴图，就用不会画东西的 `"FRAME"`。
      const page = Frame.createType("StatPanel_Page" + i, backdrop, 0, "FRAME", "");
      if (!page) {
        log.error(`内容区容器 ${i} 创建失败，面板整体放弃（否则后面的页会整体前移）`);
        return false;
      }
      anchorTo(page, backdrop, 0, CONTENT_Y, PANEL_WIDTH, PANEL_HEIGHT - CONTENT_Y);
      setPriority(page, PRIORITY_BODY_HIT);
      this.pageFrames.push(page);

      if (spec.rows.length > 0) {
        continue;
      }

      const note = Frame.createType("StatPanel_PageNote" + i, page, 0, "TEXT", "");
      if (note) {
        anchorTo(note, page, 14, 8, PANEL_WIDTH - 28, 24);
        note.setTextAlignment(ALIGN_LEFT_MIDDLE, 0);
        note.setFont(FONT_PATH, pixelFontSize(TAB_FONT_SIZE_PX), 0);
        note.setText(textColorTag(TAB_COLOR_IDLE) + spec.placeholder + "|r");
        setPriority(note, PRIORITY_TEXT);
      }
    }

    return true;
  }

  /**
   * 每页固定 `VISIBLE_ROWS` 个行槽（标签 + 数值一对），**一次建够，之后再不增删**。
   *
   * ## 为什么要「建够槽」而不是「按行建」
   *
   * 页面②③将来有十几二十行，可视区只放得下 12 行。按行建 frame 就得在切页时
   * 增删 frame 树 —— 那既会撞上「重名 frame 销毁 → 闪退」这条铁律，
   * 切页本身也会变得不安全（`selectTab` 是在原生点击派发里同步跑的）。
   * 固定槽位则把切页彻底变成属性操作：只 `setText` / `setVisible`。
   *
   * `rows` 比槽少时多出来的槽在渲染时会被收起来（见 `renderActivePage`）。
   *
   * ⚠️ 标签文字**不在这里写**，和数值一样由 `renderActivePage` 每拍填 ——
   * Step 7 起第 `i` 个槽会随 `offset` 显示不同的行，标签必须跟着换。
   *
   * ## ⚠️ 建失败就整页放弃，绝不把 `undefined` 塞进数组
   *
   * 这里的数组是**按下标一对一**用的（第 `slot` 个槽就是第 `slot` 行的位置）。
   * 而 tstl 把 `push` 编成 `arr[#arr + 1] = v` —— **赋 `nil` 不会让数组变长**，
   * 于是「第 3 个槽建失败」会让第 4 个槽的 frame 落到下标 3 上，
   * 之后所有行的数值全错位，而且**一点报错都没有**（见仓库记忆
   * `wc3-tstl-sparse-array-length`）。
   *
   * 所以每建一个都检查：任何一个建不出来，**立刻整体放弃**（数组不入库），
   * 让 `renderActivePage` 因为取不到数组而整体跳过。宁可这一页空白，
   * 也不要一屏错位的数字。
   *
   * 返回 `false` 表示**没建全**，调用方必须整体放弃。
   */
  private createRowSlots(): boolean {
    for (let page = 0; page < TABS.length; page++) {
      const spec = TABS[page];
      const container = this.pageFrames[page];
      if (spec === undefined || container === undefined) {
        log.error(`行槽第 ${page} 页没有容器，面板整体放弃`);
        return false;
      }

      const labels: Frame[] = [];
      const values: Frame[] = [];
      const labelCache: string[] = [];
      const valueCache: string[] = [];

      for (let slot = 0; slot < VISIBLE_ROWS; slot++) {
        const y = ROWS_TOP_PAD + slot * (ROW_HEIGHT + ROW_GAP);
        const key = "StatPanel_R" + page + "_" + slot;

        const label = Frame.createType(key + "_L", container, 0, "TEXT", "");
        if (!label) {
          log.error(`行槽 ${page}/${slot} 的标签建失败，面板整体放弃（免得整列错位）`);
          return false;
        }
        anchorTo(label, container, ROW_LABEL_X, y, ROW_LABEL_WIDTH, ROW_HEIGHT);
        label.setTextAlignment(ALIGN_LEFT_MIDDLE, 0);
        label.setFont(FONT_PATH, pixelFontSize(ROW_FONT_SIZE_PX), 0);
        // ⚠️ **不在这里写标签文字**。Step 7 起标签要跟着 `offset` 换
        //（同一个槽会显示不同的行），所以它和数值一样归 `renderActivePage` 管。
        // 开局面板是关着的，第一帧渲染时自然填上 —— 不必在这里先填一遍。
        setPriority(label, PRIORITY_TEXT);

        const value = Frame.createType(key + "_V", container, 0, "TEXT", "");
        if (!value) {
          log.error(`行槽 ${page}/${slot} 的数值框建失败，面板整体放弃（免得整列错位）`);
          return false;
        }
        anchorTo(value, container, ROW_VALUE_X, y, ROW_VALUE_WIDTH, ROW_HEIGHT);
        value.setTextAlignment(ALIGN_RIGHT_MIDDLE, 0);
        value.setFont(FONT_PATH, pixelFontSize(ROW_FONT_SIZE_PX), 0);
        setPriority(value, PRIORITY_TEXT);

        labels.push(label);
        values.push(value);
        // 缓存初值 `""` —— 任何一行渲染出来至少是 `—`，不会误判成「没变」
        labelCache.push("");
        valueCache.push("");
      }

      this.rowLabels.push(labels);
      this.rowValues.push(values);
      this.lastRowLabel.push(labelCache);
      this.lastRowText.push(valueCache);
    }

    return true;
  }

  /**
   * 三个分页按钮：不贴图的 BUTTON（收点击）+ 一行标签文字。
   *
   * **按钮不带视觉底板** —— 选中与否全靠文字颜色（绿 `00FF00` / 灰 `808080`）。
   * 面板本身就是深色水墨底，再叠一层深色底板等于没叠（标题栏就吃过这个亏）。
   *
   * 三个按钮**铺满整行**，理由见 `TAB_WIDTH` 的说明。
   *
   * 返回 `false` 表示**没建全**，调用方必须整体放弃（理由见调用处）——
   * `tabHits` / `tabTexts` 都是按 `TABS` 下标用的，中间漏一个就会整体前移。
   */
  private createTabBar(): boolean {
    const backdrop = this.backdrop;
    if (backdrop === null) {
      return false;
    }

    for (let i = 0; i < TABS.length; i++) {
      const spec = TABS[i];
      if (spec === undefined) {
        log.error(`分页表第 ${i} 条是空的，面板整体放弃`);
        return false;
      }

      const x = TAB_MARGIN_X + i * (TAB_WIDTH + TAB_GAP);

      // 点击框。**不贴图** —— 它的职责是「收点击 + 挡掉漏向世界的点击」，
      // `ChatBoxUI` 的 `ChatBoxWheelHit` 是同样的用法。
      const hit = Frame.createType("StatPanel_Tab" + i, backdrop, 0, "BUTTON", "");
      if (!hit) {
        log.error(`分页按钮 ${i} 创建失败，面板整体放弃（否则点到的和显示的不是同一页）`);
        return false;
      }
      anchorTo(hit, backdrop, x, TAB_BAR_Y, TAB_WIDTH, TAB_HEIGHT);
      setPriority(hit, PRIORITY_TAB);
      this.tabHits.push(hit);

      // 点击处理照抄 `ChatBoxUI.createFilterBar` 的写法：回调里**只改状态**，
      // 视觉全部交给 `refreshTabVisuals` / `applyVisibility` 这对投影函数。
      const index = i;
      FrameEventUtils.bindEvents(hit, {
        onClick: () => this.selectTab(index),
      });

      // 标签文字。锚在**背景板**上而不是按钮上 —— 这样将来想挪按钮矩形
      // （比如加个图标）时，文字位置不受牵连。
      const text = Frame.createType("StatPanel_TabText" + i, backdrop, 0, "TEXT", "");
      if (!text) {
        log.error(`分页标签 ${i} 创建失败，面板整体放弃（否则按钮和文字会错位）`);
        return false;
      }
      anchorTo(text, backdrop, x, TAB_BAR_Y, TAB_WIDTH, TAB_HEIGHT);
      // 居中：打包整数 16 = 水平居中，2 = 垂直居中（`Frame.setTextAlignment`
      // 的第二个参数会被丢掉，只吃这一个打包值）
      text.setTextAlignment(ALIGN_CENTER_MIDDLE, 0);
      text.setFont(FONT_PATH, pixelFontSize(TAB_FONT_SIZE_PX), 0);
      setPriority(text, PRIORITY_TEXT);
      this.tabTexts.push(text);
    }

    return true;
  }

  /**
   * 内容区的点击拦截框：一张不贴图的 BUTTON，铺住分页条以下的所有区域。
   *
   * ## 为什么必须要有它
   *
   * 实测过：按住面板主体拖动时，**魔兽自带的框选矩形会跟着画出来** ——
   * 那一下左键穿到世界里去了。原因是内容区只有一张 BACKDROP，
   * 而 **BACKDROP 不挡点击**（BACKDROP 帧默认不参与鼠标命中）。
   *
   * 挡点击要靠 **BUTTON**：`ChatBoxUI` 的 `ChatBoxWheelHit` 就是这么干的
   * （不贴图、`setAllPoints` 铺满，只管吃点击）。这里照抄。
   *
   * ⚠️ **它不影响拖动能不能开始** —— 拖动判定走的是 `isMouseOverPanel()` 算几何，
   * 而鼠标按下是全局触发器、不经过 frame 命中。它只负责让那一下**别漏到世界里**。
   *
   * ## ⚠️ 它必须从 `CONTENT_Y` 起，不能从 `TITLE_HEIGHT` 起
   *
   * 曾经它是从标题栏下沿一直铺到底的，那正好盖住分页条。**分页按钮会点不动**，
   * 而且**提高分页的 priority 也救不回来** —— priority 只管画序，不提供点击穿透，
   * 这是 `ChatBoxUI.ts:331-334` 用一次实测失败换来的结论。
   *
   * 所以这里靠**几何避让**：分页条那一横条（`TAB_BAR_Y` 起、`TAB_HEIGHT` 高）
   * 整块让出来，拦截框从 `CONTENT_Y` 往下才开始。
   */
  private createBodyHit(): void {
    const backdrop = this.backdrop;
    if (backdrop === null) {
      return;
    }

    const hit = Frame.createType("StatPanel_BodyHit", backdrop, 0, "BUTTON", "");
    if (!hit) {
      log.error("内容区拦截框创建失败（拖面板会顺手框选到世界里的单位）");
      return;
    }

    anchorTo(hit, backdrop, 0, CONTENT_Y, PANEL_WIDTH, PANEL_HEIGHT - CONTENT_Y);
    setPriority(hit, PRIORITY_BODY_HIT);
    this.bodyHit = hit;
  }

  /**
   * 内容区右侧的滚动条：一条轨道 + 一个可拖的把手。
   *
   * ## ⚠️ 这里**故意不用 `Button`**（与 `ChatBoxUI.createScrollBar` 不同）
   *
   * `Button.create()` 里那两根 frame 走的是 `setAbsPoint` —— **绝对屏幕坐标**，
   * 跟父 frame 没关系（`Button.ts:302-304`）。`ChatBoxUI` 能给它的 chrome 用
   * 这套，是因为那边本来就有一个 `applySlide()` 每帧把所有 chrome 一起搬，
   * 文件头还专门警告「往面板上加新零件必须挂进 `applySlide()`」。
   *
   * 本面板是**整块拖走**的（拖背景板，子节点靠相对锚点自动跟随，见文件头
   * 「子 frame 一律用相对锚点」）。插两个绝对定位的零件进来，它们会在面板被
   * 拖走之后**留在原地** —— 而且是时有时无的那种坏（不拖面板就一切正常）。
   *
   * 所以轨道和把手都用**裸 `Frame` + `anchorTo`（相对锚定）**，拖动判定自己做
   * （`isMouseOverThumb` + `bindScrollDrag`），和面板自身的拖动同一套路数。
   * 代价只是不到二十行，换掉的是「一起搬」名单这个长期的坑。
   *
   * ## 别的取舍
   *
   * - **两个都不接点击**：挡点击是 `StatPanel_BodyHit` 的事（它铺满内容区，
   *   把滚动列也盖在里面）。这里的拖动判定走全局鼠标触发器，**不经过 frame
   *   命中判定**，所以把手不需要是一根 `BUTTON`。
   * - 位置和高度全由 `syncScrollBar` 按 `offset` 摆，这里只给初值。
   */
  private createScrollBar(): void {
    const backdrop = this.backdrop;
    if (backdrop === null) {
      return;
    }

    const track = Frame.createType("StatPanel_Track", backdrop, 0, "BACKDROP", "");
    if (!track) {
      log.error("滚动轨道创建失败（内容超出一屏时看不到滚动条）");
      return;
    }
    anchorTo(track, backdrop, TRACK_X, CONTENT_Y + TRACK_TOP, TRACK_WIDTH, TRACK_HEIGHT);
    track.setTexture(TRACK_TEXTURE, 0, true);
    setPriority(track, PRIORITY_TRACK);

    // ⚠️ 把手的父节点是**轨道**，不是 `backdrop` —— 这是刻意的，别改回去。
    //
    // 两者同挂在 `backdrop` 下（同一个父节点的兄弟）时，实测**轨道把把手整个盖住**：
    // 把手 243 高、轨道 345 高、同 x 同宽完全重叠，于是屏幕上只看得见那条红轨道，
    // 把手再怎么改贴图都「画不出来」。为定位这条，一度把轨道整条藏掉 ——
    // 那一刻把手**立刻正常显示**，说明它一直渲染得好好的，纯粹是被盖住。
    //
    // 为什么不用 `setPriority` 解决：同父节点的层序规则在本工程里说不清 ——
    // 记录（记忆 `wc3-dz-frame-priority-required`）说同父节点由**创建顺序**决定、
    // 优先级只管跨子树；但把手明明建在轨道之后，却仍被盖住。方向、是否生效、
    // 是否被反复重锚打乱，几条假设互相矛盾，赌错一条就是一轮返工。
    //
    // **子节点永远画在父节点之上** —— 这条是结构性的，与优先级语义、创建顺序、
    // 重锚次数全都无关。所以让把手认轨道当爹，一劳永逸。
    //
    // 副作用：轨道隐藏时把手（作为子节点）也跟着隐藏。这正是我们要的 ——
    // 「不能滚」和「面板关着」两种情况下轨道本来就该收起来，把手同理。
    const thumb = Frame.createType("StatPanel_Thumb", track, 0, "BACKDROP", "");
    if (!thumb) {
      log.error("滚动把手创建失败（内容超出一屏时拖不动）");
      return;
    }
    anchorTo(thumb, track, 0, thumbLocalY(TRACK_TOP), TRACK_WIDTH, THUMB_MIN_HEIGHT);
    thumb.setTexture(THUMB_TEXTURE, 0, true);
    setPriority(thumb, PRIORITY_THUMB);

    // 开局是关着的，而且默认页（基础页）恰好一屏 —— 两个都还不该显示。
    // 真正的可见性由 `syncScrollBar` 按当页行数决定。
    track.setVisible(false);
    thumb.setVisible(false);

    this.trackFrame = track;
    this.thumbFrame = thumb;
    this.thumbTop = TRACK_TOP;
  }

  // ------------------------------------------------------------------
  // 分页
  // ------------------------------------------------------------------

  /**
   * 切页。**只改 `activeTab` 这一个字段**，然后把两个投影函数跑一遍。
   *
   * 重复点当前页直接返回 —— 免得白刷一遍文字。
   *
   * 这个函数会在**原生点击事件的派发内部同步执行**，所以里面只能改 frame 属性
   * （`setText` / `setVisible`），**不能增删 frame 树**。当前实现满足这条。
   */
  private selectTab(next: number): void {
    if (next < 0 || next >= TABS.length) {
      return;
    }
    if (this.activeTab === next) {
      return;
    }
    this.activeTab = next;
    // 滚动归零。**必须在这里**：`offset` 是按页的行号，上一页的它对新的一页
    // 毫无意义（从 17 行的元素页切到 12 行的基础页，留着的 offset 就是越界的）。
    this.offset = 0;
    this.refreshTabVisuals();
    this.applyVisibility();

    // 立刻重画一次。不这么做的话新的一页要空着等下一拍（最多 0.1s）才填字，
    // 点起来像卡了一下。步骤全是属性操作，符合上面那段约束。
    this.resolveTarget();
    this.renderActivePage();
  }

  /**
   * 把 `activeTab` 投成「文字颜色 + 标题文字」。
   *
   * **不碰可见性** —— 那是 `applyVisibility` 的事。分成两个函数是因为切页和开关面板
   * 都要刷可见性，但只有切页要刷文字颜色。
   */
  private refreshTabVisuals(): void {
    for (let i = 0; i < TABS.length; i++) {
      const spec = TABS[i];
      if (spec === undefined) {
        continue;
      }
      const text = this.tabTexts[i];
      if (text !== undefined) {
        const color = i === this.activeTab ? TAB_COLOR_ACTIVE : TAB_COLOR_IDLE;
        text.setText(textColorTag(color) + spec.label + "|r");
      }
    }

    const active = TABS[this.activeTab];
    if (active !== undefined && this.title !== null) {
      this.title.setText(textColorTag(TITLE_COLOR) + "属性面板 · " + active.label + "|r");
    }
  }

  // ------------------------------------------------------------------
  // 实时刷新
  // ------------------------------------------------------------------

  /**
   * 0.1s 一拍。
   *
   * ⚠️ **不用 `onFrame`**：那是每帧（60fps）跑，而这一整套读取 + 取整 + 拼串
   * 只为显示，每秒问 10 次和问 60 次在人眼看来没区别，代价却是 6 倍。
   */
  private bindRefresh(): void {
    this.refreshTimer = CreateTimer();
    TimerStart(this.refreshTimer, REFRESH_INTERVAL, true, () => this.refresh());
  }

  /**
   * 一拍。**面板关着就什么都不做** —— 连目标都不解析。
   *
   * 关着时不刷是安全的，而且现在更安全了：选中 / 取消选中 / 死亡三个事件
   * 都会直接调 `reconcile()`（见 `bindSelection`），目标不会被放旧。
   * 定时器只负责**面板开着**时的持续刷新（挨打掉血、挂 buff 改数值）。
   */
  private refresh(): void {
    if (!this.panelOpen) {
      return;
    }
    this.reconcile();
  }

  /**
   * 对账 —— **目标与可见性的唯一更新路径**。
   *
   * 定时器每拍调一次，选中 / 取消选中 / 单位死亡三个事件也各调一次。
   * **没有第二套状态**：三种触发走的是同一个函数，事件在这里只起
   * 「不用等下一拍」的作用，不参与决定「该显示谁」。
   *
   * 这一点是刻意的 —— 计划风险 #16 说得很清楚：选中 / 取消选中的**事件顺序
   * 不保证**，靠事件本身推目标会读到中间态。所以事件进来之后**什么都不算**，
   * 只是立刻再问引擎一遍「现在选的是谁」。顺序再乱，答案也都是引擎的当前真值。
   */
  private reconcile(): void {
    // 关着时什么都不做。**这不是省事，是必要的**：三个事件在面板没开的时候
    // 照样会响（玩家每选一次单位都响），不挡的话每次都要重算 12 行字符串、
    // 写进一组不可见的 frame。挡掉之后「打开时数据是新的」由 `toggle()` 负责
    // —— 它在 `applyVisibility()` 之前先对了一次账。
    if (!this.panelOpen) {
      return;
    }

    const hadTarget = this.targetUnit !== undefined;
    this.resolveTarget();
    // 只在「有没有目标」真的翻转时才动可见性 —— 这个函数每 0.1s 跑一次，
    // 没必要每拍对十几个 frame 重放一遍 `setVisible`。
    if (hadTarget !== (this.targetUnit !== undefined)) {
      this.applyVisibility();
    }
    this.renderActivePage();
  }

  /**
   * 重新解析「现在该显示哪个单位」。**每次都重算，不缓存**。
   *
   * 三道无效判定，缺一不可：
   *   `undefined`            —— 什么都没选（点地面取消选中）
   *   `GetUnitTypeId === 0`  —— 句柄已经指不到活着的单位了。
   *     （`u == null` 和 `GetHandleId(u) === 0` **都查不出**「已被移除的单位」，
   *      见 `NativeUISystem.ts:176` 那次访问违例。这里沿用
   *      `CommandCardCooldownUI.ts:365` 已经在用的判据。）
   *   **已死亡**              —— 见下。
   *
   * ## 为什么死亡要单独判
   *
   * `GetUnitTypeId` 对**尸体**照样返回非 0 的 —— 单位死了不等于句柄失效。
   * 不判这一条的话，英雄阵亡后面板会继续挂着一具尸体的属性（而且此时
   * `RelicSystem.bindDeathCleanup` 已经把 Actor `detach()` 掉了，
   * 页面②③ 的系数类会齐刷刷掉回 `+0.0%` —— 显示的是「一个没有任何加成的
   * 死单位」，比空白更难解释）。
   *
   * 判据照抄仓里已有的那套（`movement.ts:16` / `flyheight.ts:17` /
   * `damage.ts:16`，还有 `Actor.isHandleAlive`）：**血量 ≤ 0.405 或挂了
   * `UNIT_TYPE_DEAD`**。0.405 是魔兽「尸体的血」的那个魔数。
   *
   * ⚠️ 注意 `UNIT_TYPE_DEAD` 在本仓有**两个同名东西**：`wc3ts` 那个是函数
   * （要写 `UNIT_TYPE_DEAD()`），`src/constants/game/units` 这个是常量
   * （不能加括号）。这里从后者 import。
   */
  private resolveTarget(): void {
    const u = DzGetSelectedLeaderUnit();

    if (u === undefined || GetUnitTypeId(u) === 0) {
      this.targetUnit = undefined;
      this.targetSheet = null;
      return;
    }

    if (IsUnitType(u, UNIT_TYPE_DEAD) || GetWidgetLife(u) <= 0.405) {
      this.targetUnit = undefined;
      this.targetSheet = null;
      return;
    }

    this.targetUnit = u;
    this.targetSheet = resolveSheet(u);
  }

  /**
   * 把当前页的行渲染进槽里。
   *
   * 第 `i` 个槽显示的是**第 `offset + i` 行** —— 这就是滚动的全部实现：
   * 换的是「哪一行」，不是「挪 frame」。
   *
   * 三种情况都要处理：
   *   - 没有目标 → 每行都是 `—`（**标签照常显示**，读者要能看出这是哪一项）
   *   - 行数少于槽数 → 多出来的槽**收起来**（`setVisible(false)`）
   *   - 槽被收起来过、这一页又要用它 → **必须显式设回可见**，否则会一直空着
   *
   * 最后把滚动条同步一次（`syncScrollBar`）—— 放在这里而不是各调用处，
   * 是因为**每次渲染都是「这一页现在几行、offset 现在在哪」的权威时刻**。
   */
  private renderActivePage(): void {
    const page = this.activeTab;
    const spec = TABS[page];
    const labels = this.rowLabels[page];
    const values = this.rowValues[page];
    const labelCache = this.lastRowLabel[page];
    const valueCache = this.lastRowText[page];
    if (
      spec === undefined ||
      labels === undefined ||
      values === undefined ||
      labelCache === undefined ||
      valueCache === undefined
    ) {
      return;
    }

    // 先夹一次 `offset`。切页路径已经归零了，但行数也可能因为别的原因变
    //（将来某页的行表被改短），夹取是幂等的、不花钱。
    this.clampOffset(spec.rows.length);

    const u = this.targetUnit;
    const view: TargetView | null = u === undefined ? null : { unit: u, sheet: this.targetSheet };

    for (let slot = 0; slot < VISIBLE_ROWS; slot++) {
      const row = spec.rows[this.offset + slot];
      const label = labels[slot];
      const value = values[slot];

      if (row === undefined) {
        // 这一页没有这么多行 —— 空槽收起来，免得留下没有标签的空白
        setVisibleIf(label, false);
        setVisibleIf(value, false);
        continue;
      }

      setVisibleIf(label, true);
      setVisibleIf(value, true);
      // ⚠️ 标签**每拍都要过一遍**（滚动之后它跟着换）。靠缓存挡掉没变的那些，
      // 所以不滚的时候它和「写死一次」的开销是一样的。
      setCachedText(label, labelCache, slot, ROW_LABEL_COLOR, row.label);

      if (value === undefined || view === null) {
        // 没有可显示的目标：标签照常，数值写成 `—`
        setCachedText(value, valueCache, slot, ROW_VALUE_COLOR, DASH);
        continue;
      }

      setCachedText(value, valueCache, slot, ROW_VALUE_COLOR, row.render(view));
    }

    this.syncScrollBar();
  }

  /** 当前页一共几行。`TABS` 里没有这一页时返回 `0` */
  private activeRowCount(): number {
    const spec = TABS[this.activeTab];
    return spec === undefined ? 0 : spec.rows.length;
  }

  /**
   * 把 `offset` 夹进 `[0, max(0, 行数 − VISIBLE_ROWS)]`。
   *
   * `max` 那个 `0` 兜底是给「行数还没一屏」的页（基础页恰好 12 行）用的 ——
   * 不兜的话上界会是负数，`offset` 会被夹成负数，行表从头就是错位的。
   */
  private clampOffset(rowCount: number): void {
    let max = rowCount - VISIBLE_ROWS;
    if (max < 0) {
      max = 0;
    }
    if (this.offset < 0) {
      this.offset = 0;
    } else if (this.offset > max) {
      this.offset = max;
    }
  }

  /**
   * 按 `offset` 和当页行数，重画滚动条（可见性 + 把手高度 + 把手位置）。
   *
   * **这是把手状态的唯一出口** —— 拖动的方向反过来：拖动改 `offset`，
   * 然后（通过 `renderActivePage`）走到这里把把手摆到 `offset` 对应的位置。
   * 两个方向不各写一套换算，就不会出现「把手和内容对不上」。
   *
   * 全程**只改属性**（`setVisible` / `setPoint`），不建不毁 frame ——
   * 它可能落在拖动定时器里，也可能落在原生点击派发里。
   *
   * ## ⚠️ 与 `ChatBoxUI` 的策略**故意不同**：那边轨道常显，这边一屏就不显示
   *
   * 聊天框的轨道常显是踩出来的（一条会消失的轨道被用户报成「看不见滑块」），
   * 因为**聊天条数是动态的** —— 现在只有 5 条，随时可能来第 30 条。
   * 面板这边是**静态页**：基础页永远恰好 12 行，元素页永远 17 行。
   * 在基础页画一条永远拖不动的轨道，只会让人以为「这页本该能滚」。
   */
  private syncScrollBar(): void {
    const backdrop = this.backdrop;
    const track = this.trackFrame;
    const thumb = this.thumbFrame;
    if (backdrop === null || track === null || thumb === null) {
      return;
    }

    const rowCount = this.activeRowCount();
    this.scrollable = rowCount > VISIBLE_ROWS;
    if (!this.scrollable) {
      // 不能滚的页上 `offset` 必然是 0（`clampOffset` 保证），把手也收起来
      setVisibleIf(track, false);
      setVisibleIf(thumb, false);
      return;
    }

    // 把手高度 = 一屏行数占全部行数的比例，再兜一个最小可点高度。
    // ⚠️ 与聊天框不同，这里每一行的高度是**均匀的**，所以这个比例是精确的，
    // 不像聊天框那样只是近似（那边消息高度不一）。
    let height = Math.floor((TRACK_HEIGHT * VISIBLE_ROWS) / rowCount);
    if (height < THUMB_MIN_HEIGHT) {
      height = THUMB_MIN_HEIGHT;
    } else if (height > TRACK_HEIGHT) {
      height = TRACK_HEIGHT;
    }

    const maxOffset = rowCount - VISIBLE_ROWS;
    const span = TRACK_HEIGHT - height;
    let top = TRACK_TOP;
    if (span > 0 && maxOffset > 0) {
      top = TRACK_TOP + Math.round((span * this.offset) / maxOffset);
    }

    // ⚠️ **拖动过程中不摆把手**，位置归 `updateThumbDrag` 管（像素级跟手）。
    //
    // 这里会把把手吸附到 `offset` 对应的整行位置上，而拖动中每一拍都会
    // `renderActivePage` → 回到这里 —— 若照摆，用户手在动、把手却只在
    // 阈值处一格一格跳，实测被读成「拖了没反应」。所以拖动时让位。
    //
    // `endThumbDrag` 收尾时会再调一次本函数（那时 `thumbDragging` 已是
    // `false`），把手就在那一刻吸附归位。
    //
    // 缓存一下，免得 0.1s 拍每次都对两处锚点重放一遍（多数拍什么都没变）。
    if (!this.thumbDragging) {
      if (this.thumbHeight !== height) {
        this.thumbHeight = height;
        anchorTo(thumb, track, 0, thumbLocalY(this.thumbTop), TRACK_WIDTH, height);
      }
      if (this.thumbTop !== top) {
        this.thumbTop = top;
        anchorTo(thumb, track, 0, thumbLocalY(top), TRACK_WIDTH, this.thumbHeight);
      }
    }

    // ⚠️ **这里也要问一句 `isVisible()`**。`renderActivePage` 可能跑在
    // `applyVisibility()` **之后** —— `reconcile()` 里就是这样：目标没了，
    // `applyVisibility` 先把所有零件收起来，紧接着这一拍又走到这里。
    // 父 frame 隐着时它们本来也画不出来（不是可见性 bug），但让「面板关着、
    // 滚动条却是 visible」这个状态存在，等于给 `isMouseOverThumb` 埋一个反例。
    const shown = this.isVisible();
    setVisibleIf(track, shown);
    setVisibleIf(thumb, shown);
  }

  // ------------------------------------------------------------------
  // 键盘
  // ------------------------------------------------------------------

  private bindKeys(): void {
    this.bindSelection();

    // 总开关。`initialize()` 是个置位标记（`registerKey` 并不检查它），
    // 真正让按键生效的是下面 `onKeyDown` 里的自动 `registerKey`。
    keyboardEvents.initialize();

    // C 是**本面板专属**热键，直接注册。
    // ⚠️ 全局触发器在聊天框打开时**照样触发**（Step 0 实测：打 `ccc` 时
    // 每一击都触发、且 `DzIsChatBoxOpen()` 为真），所以这道门控是必需的。
    keyboardEvents.onKeyDown(() => this.handleToggleKey(), KeyCode.C);

    // ESC 不在这里注册 —— 它是**所有界面共用**的退出键，统一交给
    // `EscapeRouter` 单点注册、按「后打开的在上」派发。见该文件头。
    EscapeRouter.getInstance().push(this.escapeHandler);
  }

  /**
   * ESC 回调。**箭头函数字段**而不是类方法 —— 需要一根稳定的引用，
   * `EscapeRouter.push/remove` 靠它做同一性判断（`create()` 可能被调多次）。
   */
  private escapeHandler: EscapeHandler = () => {
    // ⚠️ 判的是 `isVisible()` 而**不是** `panelOpen`：取消选中后面板虽然已经
    // 隐了、但 `panelOpen` 还是 true（那是在等重新选中重现）。此时消费 ESC
    // 会变成一个「看不见但吃掉按键」的开关 —— 玩家按 ESC 想开菜单却什么也没发生。
    // 这时正确做法是什么都不消费，`panelOpen` 那个待命状态用 C 键清。
    if (!this.isVisible()) {
      return false;
    }
    this.close();
    return true;
  };

  private handleToggleKey(): void {
    if (isChatBoxOpen()) {
      return;
    }
    this.toggle();
  }

  // ------------------------------------------------------------------
  // 选中跟随
  // ------------------------------------------------------------------

  /**
   * 订阅选中 / 取消选中 / 死亡，**立刻**对一次账。
   *
   * ## 这三个事件只负责「快」，不负责「对」
   *
   * 正确性全在 `reconcile()` 里 —— 它每次都重新问引擎「现在选的是谁」，
   * 事件回调里**一个参数都不看**（`onUnitSelected` 给的 `data.Actor` 我们也不接）。
   * 这样处理是因为计划风险 #16：选中 / 取消选中的事件顺序**不保证**，
   * 拿事件载荷去推目标会读到中间态；而「事件到了就再问引擎一遍」对任何顺序都成立。
   *
   * 所以就算哪天引擎**不**发这几个事件了，面板也只是慢半拍（等下一拍），不会错。
   * 反过来说，没有它们的话「选中 → 面板出现」会最多晚 0.1s，手感上是能感觉到的。
   *
   * ⚠️ 选中 / 取消选中会**发给所有玩家**，必须按 `GetTriggerPlayer()` 过滤，
   * 否则别人选个单位就把你的面板换掉了（`BuffBarUI.ts:343-350` 同一套过滤）。
   * 死亡事件没有这个维度（单位死亡不区分玩家视角），所以不过滤。
   */
  private bindSelection(): void {
    if (StatPanelUI.selectionBound) {
      return;
    }
    StatPanelUI.selectionBound = true;

    gameEvents.onUnitSelected(() => {
      if (GetTriggerPlayer() !== GetLocalPlayer()) {
        return;
      }
      StatPanelUI.getInstance().reconcile();
    });

    gameEvents.onUnitDeselected(() => {
      if (GetTriggerPlayer() !== GetLocalPlayer()) {
        return;
      }
      StatPanelUI.getInstance().reconcile();
    });

    // 目标阵亡 → `resolveTarget` 里的存活判定把它清掉 → 面板隐藏。
    // 订阅在这里的意义是**立刻**收敛，不用等下一拍：`RelicSystem` 的死亡清理
    // 会把 Actor `detach()` 掉，那之后属性表读出来是空的，中间那 0.1s
    // 面板会显示「一个没有任何加成的死单位」。
    gameEvents.onUnitDeath(() => {
      StatPanelUI.getInstance().reconcile();
    });
  }

  // ------------------------------------------------------------------
  // 拖动
  // ------------------------------------------------------------------

  /**
   * 接线：按下开始拖。抬起结束拖在 `startDrag` 里一次性订阅（见那里的说明）。
   *
   * ⚠️ 拖动期间用 **0.01s 轮询鼠标位置**，而不是订阅鼠标移动事件 ——
   * 与 `Panel.startDrag`（`Panel.ts:708-711`）和 `Button` 的拖拽同一套做法。
   * 鼠标移动事件在 1.27a 上是有的（`DzTriggerRegisterMouseMoveEventByCode`），
   * 但轮询这条在本仓已经跑通了两个组件，没必要为省这点开销换一条没验证的路。
   */
  private bindDrag(): void {
    // 全局左键按下。**只有光标在面板上、且不在分页条和滚动列上**才开始拖 ——
    // 否则面板一打开，玩家在别处点选单位就会把面板拖走。
    //
    // ⚠️ 鼠标按下是**全局触发器**（`DzTriggerRegisterMouseEventByCode`，
    // `MouseEvent.ts:131`），不经过 frame 的命中判定，所以这里必须自己判位置 ——
    // 分页按钮的点击**挡不住这个全局回调**，只能在这里主动排掉。
    // 滚动把手同理：它也要用左键按下起拖，两个「开始拖」必须靠几何分工。
    mouseEvents.onMouseDown(() => {
      // 判 `isVisible()`：面板隐着的时候（没选中单位）那个矩形还在原处，
      // 用它当拖动闸门会让玩家在屏幕中间随便一按就把「面板」拖走了。
      if (
        this.isVisible() &&
        !this.dragging &&
        this.isMouseOverPanel() &&
        !this.isMouseOverTabBar() &&
        !this.isMouseOverScrollColumn()
      ) {
        this.startDrag();
      }
    }, MouseButton.LEFT);
  }

  /**
   * 光标此刻是不是压在分页条那一横条上（**整条**，不只是三个按钮）。
   *
   * 拖动判定要靠它把分页条排除掉：点击分页按钮时，`CONTROL_CLICK` 会正常派发，
   * 但**全局鼠标按下照样会触发**，会顺带把面板拖起来。
   */
  private isMouseOverTabBar(): boolean {
    const y = getMousePixelY();
    return y >= this.panelY + TAB_BAR_Y && y <= this.panelY + TAB_BAR_Y + TAB_HEIGHT;
  }

  /**
   * 光标此刻是不是压在**内容区右侧那条滚动列**上（整条，不只是轨道本身）。
   *
   * 和分页条同一个用途：把「按下要起拖」的两种零件**在几何上分工**。
   * 判宽一点（`SCROLL_HIT_PAD`）是有意的 —— 判宽了只是那一条竖带拖不动面板，
   * 判窄了会变成「按在把手边缘，结果面板被拖走了」，那个更难解释。
   *
   * ⚠️ **它不代表「能拖把手」** —— 那一问是 `isMouseOverThumb()` 的事，
   * 它还要看这一页到底能不能滚。这里只回答「这一条竖带不归面板拖动管」。
   */
  private isMouseOverScrollColumn(): boolean {
    const x = getMousePixelX();
    if (x < this.panelX + TRACK_X - SCROLL_HIT_PAD) {
      return false;
    }
    // 竖向也上扩 `THUMB_HIT_PAD`：把手的命中框比轨道顶边还高
    //（`TRACK_TOP` 是 6，垫是 8），不扩的话那 2px 会落在
    // 「滚动列之外、把手之内」——按下就是面板和把手**一起拖**。
    const y = getMousePixelY();
    return y >= this.panelY + CONTENT_Y - THUMB_HIT_PAD && y <= this.panelY + PANEL_HEIGHT;
  }

  /**
   * 光标此刻是不是压在**把手上**（按下那一刻现算，不存标志）。
   *
   * 用绝对像素比矩形，和面板自身的拖动判定同一套路数 —— 仓库记忆
   * `wc3-hover-flag-vs-geometry` 记着「靠 enter/leave 维护布尔标志」的两条必坏路径
   *（frame 在光标底下显形 / 移动时不触发 enter），这里一条都沾不上。
   *
   * `thumbTop` / `thumbHeight` 是 `syncScrollBar` 每次算出来的，所以这个判定
   * 和「把手画在哪」永远一致，不会有换算基准的偏差。
   */
  private isMouseOverThumb(): boolean {
    if (!this.scrollable) {
      return false;
    }

    // ⚠️ 命中框比把手**四周各外扩 `THUMB_HIT_PAD`**，不是照抄把手的矩形。
    // 把手本身只有 10px 宽，照抄的结果是实测「几乎点不中」。
    const x = getMousePixelX();
    if (
      x < this.panelX + TRACK_X - THUMB_HIT_PAD ||
      x > this.panelX + TRACK_X + TRACK_WIDTH + THUMB_HIT_PAD
    ) {
      return false;
    }

    const y = getMousePixelY();
    const top = this.panelY + CONTENT_Y + this.thumbTop - THUMB_HIT_PAD;
    return y >= top && y <= top + this.thumbHeight + THUMB_HIT_PAD * 2;
  }

  /**
   * 光标此刻是不是压在面板上。**算几何，不靠 enter/leave 事件**。
   *
   * ## 为什么不能用「进/出事件维护一个布尔标志」
   *
   * 这是踩出来的。原来的写法是命中框的 `onMouseEnter` 置 `true`、
   * `onMouseLeave` 置 `false`，按下时读那个标志 —— 结果是**有时候拖得动、
   * 有时候拖不动**，因为那个标志会停在错误的值上，有两条必坏的路径：
   *
   * 1. **frame 在光标底下「出现」时不会触发 enter。** 面板是 `setVisible(true)`
   *    变出来的，如果按 C 的那一刻光标已经停在把手那条带上，就没有任何
   *    「鼠标进入」的动作，WC3 也就不重做命中判定 —— 标志恒为 `false`，
   *    怎么点都拖不动。把鼠标移出去再移回来才恢复。
   * 2. **拖动中 frame 在光标底下移动，同样会搅乱这对事件。** 面板每 0.01s
   *    挪一次位置，命中判定跟着变，标志可能停在错误的值上；而下一次 enter
   *    要等鼠标真的动一下才补得回来。
   *
   * 几何判定没有这两个问题：它在按下的那一瞬间读当前真值，不存任何状态。
   *
   * 用 `getMousePixelX/Y()`（和 `setPanelPixelPos` 同一个坐标空间）算，是为了让
   * 「判定在不在面板上」和「面板往哪挪」两件事**天然一致**，不会有换算基准的偏差。
   *
   * ⚠️ **把手是整个面板（除去分页条和滚动列），不只标题栏**。两个原因：
   *
   * - 标题栏底板是 `BLACK_TRANSPARENT` 叠在深色面板上，**肉眼几乎看不见**，
   *   只把把手限在那一条带子上等于让玩家瞎抓；
   * - 实测中只给标题栏时，瞄准偏差经常差几个像素就落在带子外面，
   *   手感是「有时候拖得动、有时候拖不动」。
   *
   * ⚠️ **这个矩形是「粗筛」，两个会被排掉的东西在调用处**
   *（`bindDrag`）：分页条（`isMouseOverTabBar`）和滚动列
   *（`isMouseOverScrollColumn`）。它们各自都用左键按下起拖，
   * 而全局鼠标回调**挡不住**，只能这样在几何上分工。
   * 将来再出现「可点又和拖动打架」的零件，照着同一套加一条。
   */
  private isMouseOverPanel(): boolean {
    const x = getMousePixelX();
    const y = getMousePixelY();
    return (
      x >= this.panelX &&
      x <= this.panelX + PANEL_WIDTH &&
      y >= this.panelY &&
      y <= this.panelY + PANEL_HEIGHT
    );
  }

  private startDrag(): void {
    this.dragging = true;

    // 记下「鼠标相对面板左上角」的偏移，拖动时保持它不变 —— 否则松手瞬间面板会跳到光标下
    this.dragOffsetX = getMousePixelX() - this.panelX;
    this.dragOffsetY = getMousePixelY() - this.panelY;

    this.dragTimer = CreateTimer();
    TimerStart(this.dragTimer, DRAG_INTERVAL, true, () => this.updateDrag());

    // `once: true` —— 抬起一次就自动退订，不用自己 off
    this.dragMouseUpId = mouseEvents.onMouseUp(() => this.endDrag(), MouseButton.LEFT, {
      once: true,
    });
  }

  private updateDrag(): void {
    if (!this.dragging) {
      return;
    }
    this.setPanelPixelPos(getMousePixelX() - this.dragOffsetX, getMousePixelY() - this.dragOffsetY);
  }

  private endDrag(): void {
    if (!this.dragging) {
      return;
    }
    this.dragging = false;

    if (this.dragTimer !== null) {
      PauseTimer(this.dragTimer);
      DestroyTimer(this.dragTimer);
      this.dragTimer = null;
    }

    if (this.dragMouseUpId >= 0) {
      mouseEvents.off(this.dragMouseUpId);
      this.dragMouseUpId = -1;
    }
  }

  // ------------------------------------------------------------------
  // 滚动把手的拖动
  // ------------------------------------------------------------------

  /**
   * 接线：按下滚动列起拖。
   *
   * 和面板自身那条（`bindDrag`）是**两个独立的全局左键订阅**，靠几何分工：
   * 那条已经用 `isMouseOverScrollColumn()` 把滚动列排掉了，所以两者不会同时起。
   *
   * ⚠️ **抓取区是整条滚动列，不是把手本身**（`startThumbDrag` 的入参决定
   * 抓的是哪一段）。这是实测改出来的：把手画出来只有 10px 宽、又和轨道同色系，
   * 玩家根本分不清「深色那截才是把手」，按在绿色轨道上就以为「点不中、拖不动」。
   * 按在哪里都能拖之后，「哪一截是把手」就不再是使用门槛。
   *
   * ⚠️ **一条判断都没有省**：
   *   - `isVisible()`       挡掉「面板隐着但矩形还在原处」；
   *   - `scrollable`        挡掉「基础页只有 12 行、根本没有把手」。
   *
   * ⚠️ 后一条**必须显式写在这里**，不能指望 `isMouseOverScrollColumn()` ——
   * 那个函数同样被 `bindDrag` 用来排除面板拖动，它一旦把不可滚的页判成
   * 「不在滚动列上」，按在那条竖带上就会**变成拖面板**。两个调用方要的
   * 语义不同，所以这条闸门归调用方各自把。
   *
   * 少了任何一个，都是「按在屏幕中间某个看不见的东西上，内容居然滚了」。
   */
  private bindScrollDrag(): void {
    mouseEvents.onMouseDown(() => {
      if (!this.isVisible() || this.thumbDragging || !this.scrollable) {
        return;
      }
      if (!this.isMouseOverScrollColumn()) {
        return;
      }
      this.startThumbDrag(this.isMouseOverThumb());
    }, MouseButton.LEFT);
  }

  /**
   * 滚轮翻页。**两条路，自动切换**，做法照抄 `ChatBoxUI`（那里已跑通）。
   *
   * ## 主路：帧级 `FRAMEEVENT_MOUSE_WHEEL`
   *
   * 绑在**内容区拦截框**（`bodyHit`）上，让引擎负责判定「光标在不在面板上」。
   * 这是首选：判定交给引擎，不用自己去猜 `DzGetMouseX/Y` 是哪套坐标单位。
   *
   * ## 兜底路：全局 `DzTriggerRegisterMouseWheelEventByCode`
   *
   * `FRAMEEVENT_MOUSE_WHEEL` 在本仓**从没用过**，1.27a 上派不派发是未知数
   * （`ChatBoxUI` 的注释里就把它标成「未知数」）。全局那条**确定能用** ——
   * `CameraControl.initMouseControl()` 就是拿它做镜头缩放的。
   *
   * 所以这里做**自愈**而不是双保险：帧级一旦响过一次，全局立刻闭嘴 ——
   * 否则同一次滚动会被两个 handler 各处理一遍，一格变两格。
   * 代价只有「有生以来第一次滚动多翻 3 行」，与 `ChatBoxUI` 付出的是同一笔。
   *
   * ⚠️ 兜底路的判定用**纯几何**（`isMouseOverPanel`），不像聊天框那样用
   * `enter`/`leave` 维护的布尔标志 —— 那个会停在错的值上（记忆
   * `wc3-hover-flag-vs-geometry`），而本面板的矩形判定已经经受过拖动验收。
   */
  private bindWheel(): void {
    const hit = this.bodyHit;
    if (hit !== null) {
      FrameEventUtils.bindMouseWheelEvent(hit, () => {
        // 走到这里就说明帧级事件**确实会派发**，全局那条可以退休了
        this.frameWheelWorks = true;
        this.scrollByWheel();
      });
    }

    if (this.wheelTrigger === null) {
      const trig = CreateTrigger();
      DzTriggerRegisterMouseWheelEventByCode(trig, false, () => this.onGlobalWheel());
      this.wheelTrigger = trig;
    }

    // 镜头放行：光标压在面板上时，这一格滚轮归面板，镜头别跟着缩放。
    // ⚠️ 用 `addWheelBlocker`（追加）而**不是** `setWheelBlocker` —— 后者是
    // 单槽，`ChatBoxUI` 已经占着，覆盖掉就会变成「在聊天框上滚，镜头又动了」。
    CameraControl.addWheelBlocker(() => this.isVisible() && this.isMouseOverPanel());
  }

  /** 全局兜底。帧级那条路一旦证明能跑，这里就永久闭嘴 */
  private onGlobalWheel(): void {
    if (this.frameWheelWorks) {
      return;
    }
    this.scrollByWheel();
  }

  /**
   * 真正翻页。帧级和全局两条路最后都汇到这里，逻辑只有一份。
   *
   * ⚠️ 帧级那条是在 `DzFrameSetScriptByCode(..., sync=true)` 的**事件派发内部**
   * 同步执行的，所以这里只能改属性 —— 往下走是 `renderActivePage`，
   * 它只调 `setText` / `setVisible` / `anchorTo`，**一根 frame 都不建不毁**，安全。
   * 拖动那套要建 Timer，所以不能从滚轮走。
   */
  private scrollByWheel(): void {
    if (!this.isVisible() || !this.scrollable) {
      return;
    }
    if (!this.isMouseOverPanel()) {
      return;
    }

    const delta = DzGetWheelDelta();
    if (delta === 0) {
      return;
    }

    const up = delta > 0 === WHEEL_UP_SCROLLS_UP;
    this.offset += up ? -WHEEL_ROWS_PER_NOTCH : WHEEL_ROWS_PER_NOTCH;
    // 夹取在 `renderActivePage` 里做（它第一件事就是 `clampOffset`），
    // 不在这里重复一遍，免得两处上界算法要一起改。
    this.renderActivePage();
  }

  /**
   * 起拖。记下「光标相对把手顶边」的偏移并 0.01s 轮询 ——
   * 与面板自身的拖动（`startDrag`）和 `Button` 的拖拽同一套做法。
   *
   * `grabbedOnThumb` 决定光标是怎么落到把手上的：
   *   - `true`  —— 本来就按在把手上，保留「抓的是把手的哪一段」，把手不跳；
   *   - `false` —— 按在轨道上，把光标当把手心，把手**跳过来**再跟手
   *                 （一般滚动条都是这个手感，也是这一版修「抓不住」的落点）。
   *
   * `once: true` 让抬起订阅**拖完一次自动退订**，不用自己 off。
   */
  private startThumbDrag(grabbedOnThumb: boolean): void {
    this.thumbDragging = true;
    this.thumbGrabOffset = grabbedOnThumb
      ? getMousePixelY() - (this.panelY + CONTENT_Y + this.thumbTop)
      : this.thumbHeight / 2;

    this.thumbDragTimer = CreateTimer();
    TimerStart(this.thumbDragTimer, DRAG_INTERVAL, true, () => this.updateThumbDrag());

    this.thumbMouseUpId = mouseEvents.onMouseUp(() => this.endThumbDrag(), MouseButton.LEFT, {
      once: true,
    });
  }

  /**
   * 拖动中的一拍：**把把手的绝对位置换算成 `offset`**，然后重画内容。
   *
   * ## ⚠️ 与 `ChatBoxUI.onThumbDragged` 的差别：这里不需要「反向解读」
   *
   * 那边之所以要拿 `thumb.getPosition()` 反推比例，是因为 `Button.updateDragPosition`
   * **在回调之前已经先按鼠标把把手挪过去了**（用的是原始鼠标坐标、无钳制），
   * 于是只能把「把手现在落在哪」当作输入。
   *
   * 这里没有那层：本函数只读鼠标，把手的坐标由它自己写。
   * 所以直接正向算就好 —— 鼠标 → 夹取 → 位置/`offset`。
   * 一条真相，不会出现两边互相打架。
   *
   * ## 把手跟手，内容整行滚
   *
   * 这两件事现在**是分开的**：
   *   - 把手的**位置**像素级跟手（下面第 1 步直接写 `top`）；
   *   - **内容**只能整行滚（`offset` 是整数，一屏行数固定，不存在半行）。
   *
   * ⚠️ 早先两者都按整行吸附，是把手的坐标**只有 `syncScrollBar` 一个写者**
   * 时的自然结果，但实测被读成「拖了没反应」：高级页 14 行 / 12 槽，
   * `maxOffset` 只有 2，把手全程只在 3 个位置之间跳 —— 手都移动好几十像素了，
   * 把手还停在原地，判定却要跨过挺大一段才翻一格，手感像死的。
   *
   * 现在拖动期间 `syncScrollBar` **不碰把手**（见那里的注释），
   * 松手时 `endThumbDrag` 再叫它吸附归位。所以写者有两个，但被
   * `thumbDragging` 严格分成「拖动中」与「非拖动中」，同一时刻只有一个在写。
   */
  private updateThumbDrag(): void {
    if (!this.thumbDragging) {
      return;
    }

    const rowCount = this.activeRowCount();
    const maxOffset = rowCount - VISIBLE_ROWS;
    if (maxOffset <= 0) {
      return;
    }
    const span = TRACK_HEIGHT - this.thumbHeight;
    if (span <= 0) {
      return;
    }

    const track = this.trackFrame;
    const thumb = this.thumbFrame;
    if (track === null || thumb === null) {
      return;
    }

    // 光标 → 把手顶边（内容区坐标系），两端夹取
    let top = getMousePixelY() - this.thumbGrabOffset - (this.panelY + CONTENT_Y);
    if (top < TRACK_TOP) {
      top = TRACK_TOP;
    } else if (top > TRACK_TOP + span) {
      top = TRACK_TOP + span;
    }

    // 第 1 步：把手**像素级跟手**。
    // `syncScrollBar` 在 `thumbDragging` 期间不摆把手，所以这里写下去的位置
    // 不会被随后的 `renderActivePage` 覆盖掉。
    if (top !== this.thumbTop) {
      this.thumbTop = top;
      anchorTo(thumb, track, 0, thumbLocalY(top), TRACK_WIDTH, this.thumbHeight);
    }

    // 第 2 步：内容仍按**整行**滚。位置连续、内容离散，两者各按各的走。
    const offset = Math.round(((top - TRACK_TOP) / span) * maxOffset);
    if (offset === this.offset) {
      return;
    }

    this.offset = offset;
    // 立刻重画可见行。全是属性操作，在定时器回调里跑是安全的。
    this.renderActivePage();
  }

  /** 松手。定时器与订阅都要收干净，否则它们会一直空转 */
  private endThumbDrag(): void {
    if (!this.thumbDragging) {
      return;
    }
    this.thumbDragging = false;

    if (this.thumbDragTimer !== null) {
      PauseTimer(this.thumbDragTimer);
      DestroyTimer(this.thumbDragTimer);
      this.thumbDragTimer = null;
    }

    if (this.thumbMouseUpId >= 0) {
      mouseEvents.off(this.thumbMouseUpId);
      this.thumbMouseUpId = -1;
    }

    // 收尾那一吸附：拖动期间把手是像素级跟手的，落点可能停在两格之间。
    // 这里 `thumbDragging` 已经归 `false`，所以 `syncScrollBar` 会正常摆把手，
    // 把它对到 `offset` 对应的整行位置上 —— 也就是「松手吸附」。
    this.syncScrollBar();
  }

  /**
   * 挪动面板。**只动背景板** —— 标题栏/标题/命中框都是它的子节点、相对锚定，
   * 会自动跟着走。这就是不用列「一起搬」名单的原因。
   *
   * 坐标**夹取**在屏幕内，而且纵向留的是一整个标题栏的高度：
   * 这样无论怎么拖，标题栏（唯一的拖动把手）都不会被推出屏幕，
   * 不会出现「面板拖丢了、再也抓不回来」的状态。
   */
  private setPanelPixelPos(x: number, y: number): void {
    const backdrop = this.backdrop;
    if (backdrop === null) {
      return;
    }

    const maxX = ScreenCoordinates.STANDARD_WIDTH - PANEL_WIDTH;
    const maxY = ScreenCoordinates.STANDARD_HEIGHT - TITLE_HEIGHT;

    this.panelX = Math.max(0, Math.min(x, maxX));
    this.panelY = Math.max(0, Math.min(y, maxY));

    setScreenRect(backdrop, this.panelX, this.panelY, PANEL_WIDTH, PANEL_HEIGHT);
  }

  // ------------------------------------------------------------------
  // 开关
  // ------------------------------------------------------------------

  public toggle(): void {
    this.panelOpen = !this.panelOpen;

    // 打开时先对一次账。**顺序不能反**：`reconcile()` 内部只在「有没有目标」
    // 翻转时才动可见性，而这里翻的是 `panelOpen`，它看不到 —— 所以对完账
    // 必须**无条件**再 `applyVisibility()` 一次（幂等，重复调没有代价）。
    if (this.panelOpen) {
      this.reconcile();
    }
    this.applyVisibility();
  }

  public close(): void {
    if (!this.panelOpen) {
      return;
    }
    this.panelOpen = false;
    this.applyVisibility();

    // 关掉时如果正在拖，把定时器和订阅收干净，免得它们对着一个不可见的面板空转。
    // 手的拖动也要收 —— 它拖的是行槽文字，面板都关了就更没理由继续。
    this.endDrag();
    this.endThumbDrag();
  }

  /**
   * 面板此刻**是不是真的画在屏幕上**。
   *
   * ⚠️ 和 `panelOpen` 是两件事，Step 6 起分开了：
   *
   * | 字段 | 含义 |
   * |---|---|
   * | `panelOpen` | **用户意图** —— 「我想看面板」。C 键切换，取消选中时**不动它** |
   * | `isVisible()` | 「现在有东西可显示」—— 意图 ∧ 有活着的选中单位 |
   *
   * 这正是决策 5「取消选中 → 自动关闭但**记住已打开状态**，重新选中时自动重现」。
   * 所以下面这些**副作用**都必须问 `isVisible()` 而不是 `panelOpen`：
   * 拖动闸门（别对一块看不见的面板起拖）、ESC 消费（别在什么都没画的时候
   * 把系统的 ESC 吃掉 —— 那会变成一个「看不见但在生效」的开关）。
   */
  private isVisible(): boolean {
    return this.panelOpen && this.targetUnit !== undefined;
  }

  /**
   * 把「用户意图 + 有没有目标」推成实际的可见性。**只改 `setVisible`，不建不毁 frame**。
   *
   * 隐藏是父子独立的：父 frame 不可见时子 frame 也会看不见，但这里仍然显式设一遍
   * —— 免得将来有人只把某个零件挪出背景板，行为就悄悄变了。
   */
  private applyVisibility(): void {
    const visible = this.isVisible();
    setVisibleIf(this.backdrop, visible);
    setVisibleIf(this.titleBar, visible);
    setVisibleIf(this.title, visible);
    setVisibleIf(this.titleHit, visible);
    setVisibleIf(this.bodyHit, visible);

    // 分页条：三个按钮和三个标签**一起**显隐，它们永远同进同出
    // （标签锚在背景板上，显隐与按钮无关，所以必须各设一遍）。
    //
    // ⚠️ 内容区**只有当前页可见** —— 这是「切换只改可见性」的落地点。
    // 三个页面各是一整棵子树（`pageFrames[i]` 下面挂着它的行槽），
    // 所以这里只要设容器就行，不用逐个去碰里面的行。
    for (let i = 0; i < TABS.length; i++) {
      setVisibleIf(this.tabHits[i], visible);
      setVisibleIf(this.tabTexts[i], visible);
      setVisibleIf(this.pageFrames[i], visible && i === this.activeTab);
    }

    // 滚动条：**「面板可见」∧「这一页能滚」**。
    //
    // 前一半只有这里说了算 —— `syncScrollBar` 只管后半句（它压根不知道面板
    // 开关着），而它又只在面板开着时才跑（`reconcile` 第一行就返回）。
    // 所以面板一关，那两个零件的可见性就没人管了，必须在这里落一次。
    //
    // ⚠️ `scrollable` 可能是**上一页**留下的：`selectTab` 是「先
    // `applyVisibility` 再 `renderActivePage`」，这里读到的是旧值。无所谓 ——
    // 紧接着的渲染就会算出新值并改回去，中间没有画过任何一帧。
    setVisibleIf(this.trackFrame, visible && this.scrollable);
    setVisibleIf(this.thumbFrame, visible && this.scrollable);
  }

  /**
   * 逐个子节点销毁并清空数组。
   *
   * ⚠️ 分页的按钮/标签、三个内容区，全部是**成组**的，逐个写 `if (x !== null)`
   * 只会让 `destroy()` 越写越长。这里用 `.length` 遍历是安全的 —— 这些数组
   * 全程只用 `push` 填，不存在空洞（记忆 `wc3-tstl-sparse-array-length`：
   * 有洞的数组在 Lua 里 `.length` 是 0，那样会一条都不销毁、还看不出来）。
   */
  private destroyArray(frames: Frame[]): void {
    for (let i = 0; i < frames.length; i++) {
      const frame = frames[i];
      if (frame !== undefined) {
        frame.destroy();
      }
    }
    frames.length = 0;
  }

  /** 同上，给行槽那种二维表用 */
  private destroyFrameGrid(grid: (Frame | undefined)[][]): void {
    for (let i = 0; i < grid.length; i++) {
      const row = grid[i];
      if (row === undefined) {
        continue;
      }
      for (let j = 0; j < row.length; j++) {
        const frame = row[j];
        if (frame !== undefined) {
          frame.destroy();
        }
      }
    }
    grid.length = 0;
  }

  /**
   * 销毁。**正常开局不会走到** —— 面板是「建一次 + 改属性」的，
   * 关掉可见性和销毁是两件事。留着是为了将来万一要重建时有个收口的入口。
   */
  public destroy(): void {
    this.endDrag();
    this.endThumbDrag();
    EscapeRouter.getInstance().remove(this.escapeHandler);

    // 刷新拍停掉 —— 留着它会对着已销毁的 frame 每 0.1s 摸一次
    if (this.refreshTimer !== null) {
      PauseTimer(this.refreshTimer);
      DestroyTimer(this.refreshTimer);
      this.refreshTimer = null;
    }
    this.targetUnit = undefined;
    this.targetSheet = null;

    // 全局滚轮触发器也退掉。**留着它比漏建更糟** —— 回调会对着已经销毁的
    // frame 走 `renderActivePage`，而那时 `rowLabels` 已经清空了。
    if (this.wheelTrigger !== null) {
      DestroyTrigger(this.wheelTrigger);
      this.wheelTrigger = null;
    }
    this.frameWheelWorks = false;

    // 子 → 父 顺序销毁（同 `Panel.destroy`）。
    // 行槽挂在内容区容器底下，所以**必须先于** `pageFrames`。
    this.destroyFrameGrid(this.rowValues);
    this.destroyFrameGrid(this.rowLabels);
    this.lastRowText.length = 0;
    this.lastRowLabel.length = 0;
    this.destroyArray(this.pageFrames);
    this.destroyArray(this.tabTexts);
    this.destroyArray(this.tabHits);
    // 滚动条在背景板**之前**销毁（它是背景板的子节点）
    if (this.thumbFrame !== null) {
      this.thumbFrame.destroy();
      this.thumbFrame = null;
    }
    if (this.trackFrame !== null) {
      this.trackFrame.destroy();
      this.trackFrame = null;
    }
    if (this.bodyHit !== null) {
      this.bodyHit.destroy();
      this.bodyHit = null;
    }
    if (this.titleHit !== null) {
      this.titleHit.destroy();
      this.titleHit = null;
    }
    if (this.title !== null) {
      this.title.destroy();
      this.title = null;
    }
    if (this.titleBar !== null) {
      this.titleBar.destroy();
      this.titleBar = null;
    }
    if (this.backdrop !== null) {
      this.backdrop.destroy();
      this.backdrop = null;
    }

    this.panelOpen = false;
    this.activeTab = 0;
    this.offset = 0;
    this.scrollable = false;
    this.thumbHeight = THUMB_MIN_HEIGHT;
    this.thumbTop = TRACK_TOP;
    this.created = false;
  }
}

/**
 * 聊天框是否打开。与 `EscapeRouter` 里那份是同一条判据（那边管 ESC、这边管 C），
 * 各自留一份是为了不让 C 键依赖 ESC 路由模块。
 */
function isChatBoxOpen(): boolean {
  try {
    return DzIsChatBoxOpen();
  } catch (e) {
    return false;
  }
}
