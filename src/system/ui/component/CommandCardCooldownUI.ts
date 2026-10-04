/**
 * 原生命令卡技能按钮上的**线性冷却暗幕** —— Buff 栏那套时钟搬到技能图标上。
 *
 * 复用 `IconTimeCurtain`（它只认「frame + 0~1 进度」，本来就不是为 Buff 写的），
 * 本文件只解决两件事：**暗幕 frame 摆在哪**、**进度从哪读**。
 *
 * ## 进度：引擎自己记着冷却，不用自己造冷却系统
 *
 * | 原生 | 定义 | 说明 |
 * |---|---|---|
 * | `KKCommandButtonGetAbilityId(btn)` | `KKAPI.j:713` | 按钮 → 绑定的技能 id；0 = 没绑 |
 * | `DzGetUnitAbilityCool(u, id)` | `KKAPI.j:452` | **剩余**冷却秒数 |
 * | `DzGetUnitAbilityMaxCool(u, id)` | `KKAPI.j:453` | **总**冷却秒数 |
 *
 * 三个都在 `KKAPI.cfg` 注册过；后两个直接收 `(unit, abilCode)`，
 * 不像 `EXGetAbilityState` 那条路要先取 ability 句柄 —— 而
 * `NativeUISystem.ts:178` 记过 1.27a 下对悬垂 ability 句柄调
 * `GetUnitAbilityLevel` 会卡死闪退，能绕开就绕开。
 *
 * ⚠️ **方向是 `progress = remain / total`，不是 `1 - remain / total`。**
 *
 * 这一条与 Buff 栏**故意相反**，不是抄漏了：Buff 的语义是「越接近到期越黑」
 * （`1 - elapsed/duration`），而冷却要的是**释放瞬间整块压黑、随恢复变亮**
 * （与原生的径向钟一致 —— 刚放完技能就该一眼看出「这个现在不能用」）。
 *
 * 2026-10-04 用过一阵 `1 - remain / total`，表现是「刚放完技能图标完全正常、
 * 一点冷却感都没有」，尤其长冷却（180 秒）技能要等半分钟才看得出来。
 *
 * ⚠️ `remain <= 0` / `total <= 0` 仍然要单独判成「进度 0」—— 现在不是为了防止算反，
 * 而是为了**除零**：不在冷却时 `DzGetUnitAbilityCool` 返回 0，恰好落在 `0 / 0` 上。
 *
 * ## 选中的单位：每帧问引擎，不订阅选中事件
 *
 * 用 `DzGetSelectedLeaderUnit()`（`KKAPI.cfg:1`）——它返回的正是**当前命令卡所对应的
 * 那个单位**，与「按钮上显示什么技能」天然同步，不会错位。
 *
 * 本仓库已经有先例：`NativeUISystem.updateSelectedUnitStatus()` 每 tick 都用它刷血蓝条，
 * 说明它在 1.27a + KKWE 下是可靠的。
 *
 * **因此这里不需要** `BuffBarUI` 那套 `onUnitSelected` / `onUnitDeselected` 接线，
 * 也**不需要** `resolveIdleTarget()` 的开局兜底（那套存在的原因恰恰是「开局不会有
 * 选中事件」）。少一条事件链 = 少一处悬垂 Actor 句柄的来源。
 *
 * ## 暗幕摆在哪：先试「挂成按钮的子节点」，不行再退回绝对坐标
 *
 * **路 A（首选）**：`DzCreateFrameByTagName` 直接以按钮为父。
 * 成了的话位置 / 缩放 / 商店翻转**全都自动跟随**，一行坐标表都不用抄。
 *
 * 之所以敢试：`NativeFrames.consoleParent()`（`:244-280`）实测记录过，拿原生
 * SimpleFrame（`ConsoleUI`）当 parent 会抛 `Call jass function crash.<unknown>`，
 * **但那是可被 pcall 捕获的 Lua 错误，不是硬崩**。命令卡按钮同为 FDF 系
 * SimpleFrame，很可能同样拒绝 —— 所以这条路**必须先探一次再决定**，而不是硬着头皮建。
 *
 * **路 B（兜底）**：挂 `gameUI()`（`DzGetGameUI()`）+ `layoutV3` 的
 * `COMMAND_BUTTONS_NORMAL` 绝对坐标。
 * 这条路**只认常规态**：商店态 12 格会重排到左上角，而 `IconTimeCurtain` 的锚点
 * 建好就不再改，跟不动 —— 所以商店态下**整组隐藏**，宁可没有也不画错位。
 *
 * ### ⚠️ 宿主是 `gameUI()`，**不是** `consoleParent()`
 *
 * 2026-10-04 实测踩到：挂在 `consoleParent()`（= `DzFrameGetLowerLevelFrame()`，
 * 也就是探针里的 `_ROOT_UI_FRAME`）下时，暗幕**建得出、探针树里读得到
 * （`a=220`、`rw=0.02816`）、`DzFrameIsVisible` 也说 `v=1`，画面上就是没有**。
 *
 * 本仓库所有**画得出来**的自建浮层都不在那个树上：
 *   - Buff 栏的 border / icon / 暗幕 → `DzGetGameUI()`（`BuffBarUI.ts:651-663`）
 *   - 血/蓝数值文本 → `gameUI()`，注释明写「**不吃 UI 底板的裁剪**」
 *     （`NativeUISystem.ts:465-467`）
 * 而挂在 `consoleParent()` 下的是**底板本身**（`uiFrame`、`shopSlotsFrame`），
 * 它们本来就该被命令卡盖住 —— 是背景那一层，不是浮层。
 *
 * 所以「浮层挂 gameUI()、底板挂 consoleParent()」是本仓库的分工，别混。
 *
 * 两条路都进不去就什么都不做，日志里说清楚是哪一步失败的。
 *
 * ## 冷却秒数：暗幕之外再画一个数字
 *
 * 光有暗幕，长冷却（180 秒那种）恢复得很慢，一眼看不出还剩多久；用户明确要求
 * 「把冷却时间也加上去」。数字 frame 与暗幕**同一个宿主、同一套矩形**，
 * 只是暗幕取满格、数字取原始 rect 居中。
 */

import {
  Frame,
  Timer,
  FRAME_ALIGN_LEFT_TOP,
  FRAME_ALIGN_RIGHT_BOTTOM,
} from "@eiriksgata/wc3ts/*";
import { createLogger } from "src/utils/logger";
import { onFrame } from "../FrameLoop";
import {
  COMMAND_BUTTONS_NORMAL,
  HEALTH_BAR_TEXTURE,
  OFFSCREEN,
  SHOP_ABILITY_IDS,
  type Rect,
} from "../gameui/layoutV3";
import {
  commandBarButton,
  gameUI,
  isValidFrame,
} from "../gameui/NativeFrames";
import { IconTimeCurtain, type CurtainGeometry } from "./IconTimeCurtain";

const log = createLogger("CommandCardCD");

/** 与 `layoutV3` 的按钮表同一套下标 */
const SLOT_COUNT = 12;

/**
 * 暗幕不透明度 0~255。**与 Buff 栏保持一致**（`BuffBarUI.ts` 的 `CURTAIN_ALPHA`），
 * 同一个视觉语言别两处各调各的。
 */
const CURTAIN_ALPHA = 220;

/**
 * 暗幕贴图。**必须是「不透明」的图，否则乘黑之后等于没有。**
 *
 * `IconTimeCurtain` 是靠 `顶点色 × 贴图 = 黑` 来得到黑影的（见它的文件头），
 * 乘算**只改 RGB、不动 alpha** —— 所以贴图本身有多透，暗幕就有多透。
 *
 * 一开始这里用的是 `UIBackgrounds.BLACK_TRANSPARENT`，但那张图的注释自己就写着
 * **「黑色半透明」**（`preset.ts`），是 editbox 的半透明填充，不是实心块。
 * 乘黑之后在深色的技能图标上几乎看不出来 —— 这正是「frame 建出来了、尺寸也对、
 * `p` 也在正常增长，画面上却什么都没有」的一个原因。
 *
 * 换成的这张是血条的填充图：它**此刻就正在屏幕上画着一条实心红条**
 * （`NativeUISystem` 的 HP 条），不透明度是已经被这个 1.27a 环境验证过的。
 * 乘黑之后就是一块实心黑，正好是暗幕要的东西。
 */
const CURTAIN_TEXTURE = HEALTH_BAR_TEXTURE;

/**
 * 暗幕相对按钮矩形的内缩，**按比例而不是绝对坐标**。
 *
 * 用比例的理由：路 A 拿到的是按钮**自身坐标系**里的宽高，路 B 拿到的是屏幕归一化
 * 坐标，两者的量纲完全不同（0.032 量级 vs 0.032 量级 —— 数值相近纯属巧合，
 * 但按钮被 `setScale(0.8205)` 缩过，绝不该拿绝对数去凑）。比例对两种空间都成立。
 *
 * 内缩是为了不压住按钮的边框美术。**这是整个文件唯一的调参旋钮**，进游戏只改这一个数。
 */
const CURTAIN_INSET_RATIO = 0.06;

/**
 * 用来探测「能不能以按钮为父」的槽位。
 * 取 5 是因为常规态下它**必定可见**（0..4 被 `applyCommandButtons` 挪到屏幕外 999），
 * 拿一个屏幕外的按钮去探测可能得到假阴性。
 */
const PROBE_SLOT = 5;

/**
 * 按钮宽高的合理上限。超过它说明 `DzFrameGetWidth` 给的不是我们以为的量纲
 * （比如像素而非归一化坐标），此时路 A 的几何不可信，整条路降级。
 */
const MAX_PLAUSIBLE_BUTTON_SIZE = 0.5;

/**
 * 进度量化档数。见 `refreshPerFrame` 里那段注释 —— 存在的唯一目的是让
 * `IconTimeCurtain` 的去重真的生效，免得每帧重设绝对锚点。
 *
 * 200 档：30 秒的冷却每档 0.15 秒，肉眼看是连续的一条边。
 */
const PROGRESS_STEPS = 200;

/**
 * 暗幕的**跨父节点层序**（`DzFrameSetPriority`）。
 *
 * **不是可选项。** 暗幕挂在 `gameUI()` 下，命令卡按钮是原生的、由引擎自己摆，
 * 两边的层序不是创建顺序能决定的。不给优先级的话 frame 会正常建出来、尺寸也对，
 * 但**被按钮整个盖住，画面上什么都没有**。
 *
 * 2026-10-04：日志里 `建成=7/12`、`p=0.10→0.50` 全都正常，唯独看不见 ——
 * 探针树里能看到暗幕帧（`a=220`、`rw=0.02816`）确实存在，`DzFrameIsVisible`
 * 也返回 1。取号照 Buff 栏那一片来。
 *
 * 取 896：落在本仓库自建浮层的取号带里（Buff 栏 898/899、RelicBar 900/901、
 * Tips 1000），比这几家都低，万一重叠了让它们先显示。
 */
const CURTAIN_PRIORITY = 896;

/**
 * 冷却秒数文本的层序。比暗幕高一档 —— 数字要压在暗幕**上面**才读得出来。
 */
const TEXT_PRIORITY = 897;

/**
 * `DzFrameSetTextAlignment` 的「水平居中」档位。
 *
 * 18 抄自 `BuffBarUI.ts:75`（那边的时间数字就是这么居中的，已验证）。
 * 这个原生的编码表 KKWE 没给，所以只抄已验证的值，不自己凑。
 */
const TEXT_ALIGN_CENTER = 18;

/**
 * 每秒那条 `[CommandCardCD] 诊断 …` 日志的开关。
 *
 * **当前 `false`**（2026-10-04）：每秒刷一行、一行上百字符，把有用的日志全淹了；
 * 而且实测那一局全程「单位无效 单位=无」，本来也读不出信息。
 *
 * 诊断本身**没有删**（`startDiagnostics()` 整段还在），只是不再挂上去 ——
 * 「放了技能却没有暗幕」这个现象还没在**选中单位**的情况下确认过，
 * 哪天要重查，把这里改回 `true` 即可，不必重写。
 *
 * 同款写法见 `main.ts` 的 `ENABLE_NATIVE_UI_PROBE`、
 * `NativeUISystem` 的 `ENABLE_CLIPBOARD_DIAGNOSTICS`。
 */
const ENABLE_COMMAND_CARD_DIAGNOSTICS = false;

/**
 * 由屏幕归一化矩形 + 内缩比例算出暗幕几何（**绝对模式**）。
 *
 * `COMMAND_BUTTONS_NORMAL` 里的坐标是以**屏幕左下角**为原点的绝对归一化坐标
 * （给 `clearAndSetRect` 用的那一套），所以直接当绝对坐标喂给 `IconTimeCurtain`
 * 的 `absolute` 模式即可 —— 不要拿它当「相对父节点的偏移」用，那是两种不同的东西。
 */
function rectGeometry(rect: Rect, ratio: number): CurtainGeometry {
  const w = rect[2] - rect[0];
  const h = rect[1] - rect[3];
  const ix = w * ratio;
  const iy = h * ratio;
  return {
    width: w - ix * 2,
    height: h - iy * 2,
    offsetX: rect[0] + ix,
    // rect[1] 是矩形的**上边**；absolute 模式下 offsetY 就是顶边的 y
    offsetY: rect[1] - iy,
    absolute: true,
  };
}

/** 由按钮自身坐标系的宽高 + 内缩比例算出暗幕几何（锚点就是父节点的左上角） */
function buttonGeometry(w: number, h: number, ratio: number): CurtainGeometry {
  const ix = w * ratio;
  const iy = h * ratio;
  return {
    width: w - ix * 2,
    height: h - iy * 2,
    offsetX: ix,
    // 从父节点左上角往下让 iy：向上为正，故取负
    offsetY: -iy,
  };
}

export class CommandCardCooldownUI {
  private static instance: CommandCardCooldownUI | undefined;

  private created = false;
  /** 实际走通的是哪条路。`"none"` = 两条都没成，每帧直接 return */
  private parentMode: "button" | "absolute" | "none" = "none";
  /**
   * 下标与 `layoutV3` 的按钮表对齐；`undefined` = 该格没建（屏幕外 / 建失败）。
   *
   * ⚠️ **`curtains` 是「带洞的数组」，绝不能用 `.length` / `for...of` / `.filter` 遍历它。**
   *
   * 它编译成 Lua 表之后，`undefined` 就是 `nil` —— 赋 nil 等于**把这个键删掉**，
   * 于是表变成「下标 5..11 有值、0..4 完全不存在」。而 Lua 的 `#t` 遇到首元素就是
   * nil 时返回 **0**，`ipairs` 也在第一个 nil 处停下。
   *
   * 2026-10-04 实测踩到：`while i < #self.curtains` 一次都没进循环，
   * 12 个暗幕建出来了却永远不刷进度，表现就是「放了技能没有冷却时钟」，
   * 而且日志里 `建成=0/12` 还是**假**的（那也是 `.filter().length` 数出来的）。
   *
   * 所以本文件**一律按固定的 `SLOT_COUNT` 下标遍历**，逐个判 `undefined`。
   */
  private curtains: Array<IconTimeCurtain | undefined> = [];

  /**
   * 冷却秒数文本，下标与 `curtains` 严格对齐。**同样是带洞的数组**，
   * 遍历纪律见上面（固定按下标 + 逐个判 `undefined`）。
   */
  private texts: Array<Frame | undefined> = [];

  /**
   * 每格最近一次写进数字 frame 的**秒数**（不是字符串），用来去重。
   *
   * 存数值而不是字符串有两个理由：比对数字不分配，而且字符串**只在真的变了
   * 才拼** —— `\`${n}\`` 每帧拼一次就是每帧一次分配（见 `setSeconds`）。
   * `-1` 是「收起」的哨兵值，合法秒数恒 >= 1。
   */
  private lastSeconds: number[] = [];

  // --- 临时诊断（定位「放了技能却没有暗幕」用，问题解决后整段删掉）---
  /**
   * 建成时记下的、探测格的按钮自身宽高，用来判断路 A 的几何可不可信。
   * 建的时候写一次，不是热路径。
   */
  private diagProbeWH = "";

  private constructor() {}

  public static getInstance(): CommandCardCooldownUI {
    if (!CommandCardCooldownUI.instance) {
      CommandCardCooldownUI.instance = new CommandCardCooldownUI();
    }
    return CommandCardCooldownUI.instance;
  }

  public create(): void {
    if (this.created) return;
    if (!isValidFrame(gameUI())) {
      log.error("DzGetGameUI 拿不到，命令卡冷却暗幕不建");
      return;
    }

    this.hideNativeSweeps();

    // 先探测路 A 能不能走通（见文件头）。**探一次就定全局**，不逐格去 try ——
    // 12 格分别试探除了多抛 11 次异常没有任何信息增益。
    if (this.probeButtonParenting()) {
      this.parentMode = "button";
      this.buildUnderButtons();
    } else {
      log.warn("以按钮为父建 frame 走不通，退回 gameUI() + 绝对坐标（只认常规态）");
      this.parentMode = "absolute";
      this.buildUnderRoot();
    }

    this.created = true;
    // ⚠️ 不能用 `.filter().length` 数 —— 见 `curtains` 字段的注释，带洞的数组在 Lua 里
    // 长度就是 0，数出来会骗人。老老实实按下标数
    let built = 0;
    let textBuilt = 0;
    for (let i = 0; i < SLOT_COUNT; i++) {
      if (this.curtains[i] !== undefined) built++;
      if (this.texts[i] !== undefined) textBuilt++;
    }
    log.info(
      `暗幕建好了：模式=${this.parentMode} 暗幕=${built}/${SLOT_COUNT} 数字=${textBuilt}/${SLOT_COUNT}` +
        (this.diagProbeWH === "" ? "" : ` 探测格宽高=${this.diagProbeWH}`)
    );

    onFrame(() => {
      this.refreshPerFrame();
    });

    if (ENABLE_COMMAND_CARD_DIAGNOSTICS) {
      this.startDiagnostics();
    }
  }

  /**
   * **临时**：每秒把「本地选中单位 + 每格读到的技能 id / 剩余 / 总时长 / 进度」打一遍。
   *
   * 存在的唯一理由是「放了技能却没有暗幕」这个现象有好几种完全不同的成因
   * （两条建 frame 的路都没通 / 路 B 被命令卡挡住 / 按钮读不到技能 id /
   * `DzGetUnitAbilityMaxCool` 返回 0 / 几何尺寸算成 0），
   * 光看画面分不出来，把原始值打出来一眼就能定。
   *
   * **问题定位后请整段删掉**（连同 `diagProbeWH` 字段）。
   *
   * ⚠️ **所有原始值都在这里现读，不在每帧路径上存字符串。**
   *
   * 2026-10-04 的第一版是每帧把 `r=…/… p=…` 拼好存进 `diagLast[]`，再由这里打印 ——
   * 那等于**每帧**做 24 次 `toFixed`（编译成 `string.format`，是这一整条路径里最贵的
   * 操作），而结果每秒才被读一次。用户一问「是不是很费性能」就把它删了。
   *
   * 现读还有个额外好处：诊断**独立于**每帧那条路径。之前两者共用同一个坏数组，
   * 于是「建成=0/12」跟着一起撒谎（见 `curtains` 字段注释），把排查方向带跑了。
   */
  private startDiagnostics(): void {
    const t = Timer.create();
    t.start(1.0, true, () => {
      if (!this.created) return;
      const u = DzGetSelectedLeaderUnit();
      const uValid = u !== undefined && GetUnitTypeId(u) !== 0;
      const uTxt =
        u === undefined
          ? "无"
          : uValid
            ? `id=${GetUnitTypeId(u)}`
            : `句柄已失效(${u})`;
      const idle = !uValid;
      const shop = !idle && this.parentMode === "absolute" && this.isShopSelected(u);

      let line = "";
      for (let i = 0; i < SLOT_COUNT; i++) {
        const curtain = this.curtains[i];
        if (curtain === undefined) continue;
        // `v=` 是**引擎自己**认为这个 frame 显示着没有（`DzFrameIsVisible`）。
        // 这一位是用来把「压根没显示」和「显示着但看不见」分开的：
        //   v=1 还什么都看不到 → 层序或父节点被裁掉
        //   v=0（而 p 明明 > 0）→ 显示调用根本没生效，往那个方向查
        // `t=` 是同一个读数，只是换成**数字 frame** —— 两个 frame 除了类型
        // （BACKDROP / TEXT）之外宿主、矩形、层序全一样，所以：
        //   t=1 而 v=1 却都看不见 → 整个宿主有问题
        //   t=1 看得见、v=1 看不见 → 问题出在 BACKDROP 这一路（贴图 / 顶点色）
        const text = this.texts[i];
        const tv =
          text === undefined ? "-" : DzFrameIsVisible(text.handle) ? 1 : 0;

        const btn = commandBarButton(i);
        let desc: string;
        if (!isValidFrame(btn)) {
          desc = "无按钮句柄";
        } else {
          const abilityId = KKCommandButtonGetAbilityId(btn);
          if (abilityId === 0) {
            desc = "无技能";
          } else if (u === undefined || GetUnitTypeId(u) === 0) {
            // 单位无效时**不去读冷却**：句柄悬垂，读了没有意义还可能不安全
            desc = `id=${abilityId}`;
          } else {
            const remain = DzGetUnitAbilityCool(u, abilityId);
            const total = DzGetUnitAbilityMaxCool(u, abilityId);
            desc = `id=${abilityId} r=${remain.toFixed(2)}/${total.toFixed(2)}`;
          }
        }
        line += ` [${i}:${desc} v=${curtain.isShown() ? 1 : 0} t=${tv}]`;
      }
      // 按钮的父节点句柄 —— 用来确认命令卡到底在哪棵子树里。
      // 本轮换宿主就是因为「探针树显示暗幕挂在 _ROOT_UI_FRAME 下」这条线索。
      const probeBtn = commandBarButton(PROBE_SLOT);
      const btnParent = isValidFrame(probeBtn) ? DzFrameGetParent(probeBtn) : 0;
      // 「单位无效 / 商店态收起」是 `refreshPerFrame` 两个提前返回的原因，
      // 它们不会出现在每格的 `desc` 里，所以在抬头单独报一下
      const skip = idle ? " 单位无效" : shop ? " 商店态收起" : "";
      log.info(
        `诊断 模式=${this.parentMode}${skip} 单位=${uTxt} 按钮父=${btnParent}${line}`
      );
    });
  }

  // -------------------------------------------------------------------------
  // 建 frame
  // -------------------------------------------------------------------------

  /**
   * 试建一个 frame 在命令卡按钮下面，建得出、且量到的宽高可信，才算路 A 通。
   *
   * 这里**不调 `IconTimeCurtain.create`**，而是直接探 `Frame.createType` ——
   * 因为 `IconTimeCurtain.create` 在 `createType` 失败时返回的是个**哑对象**
   * （见它的注释：调用方每帧都会摸它，保持「永远可调用」比判空更不容易漏），
   * 从外面分不出「建成了」和「静默失败」。探测要的是明确的是/否。
   */
  private probeButtonParenting(): boolean {
    const btn = commandBarButton(PROBE_SLOT);
    if (!isValidFrame(btn)) {
      log.warn(`探测失败：commandBarButton(${PROBE_SLOT}) 拿不到句柄`);
      return false;
    }
    const parent = Frame.fromHandle(btn);
    if (parent === undefined) {
      log.warn("探测失败：Frame.fromHandle(按钮) 返回 undefined");
      return false;
    }

    const w = DzFrameGetWidth(btn);
    const h = DzFrameGetHeight(btn);
    if (!(w > 0) || !(h > 0) || w > MAX_PLAUSIBLE_BUTTON_SIZE || h > MAX_PLAUSIBLE_BUTTON_SIZE) {
      log.warn(`探测失败：按钮宽高不可信 w=${w} h=${h}`);
      return false;
    }
    this.diagProbeWH = `${w}x${h}`;

    let probe: Frame | undefined;
    try {
      probe = Frame.createType("CommandCardCurtainProbe", parent, 0, "BACKDROP", "");
    } catch (e) {
      // 引擎拒绝拿原生 SimpleFrame 当父节点时抛的就是这里。
      // ⚠️ catch 里**不要写 `continue`** —— tstl 把 catch 编成内嵌函数，
      // goto 不跨函数找 label，会让整个 .lua 加载失败（已知坑，仓库里踩过）。
      log.warn(`探测失败：以按钮为父建 frame 抛异常（预期内，路 B 兜底）：${e}`);
      return false;
    }
    if (probe === undefined) {
      log.warn("探测失败：createType 返回 undefined");
      return false;
    }
    probe.destroy();
    return true;
  }

  /** 路 A：每格挂成自己按钮的子节点，几何取按钮自身坐标系的宽高 */
  private buildUnderButtons(): void {
    for (let i = 0; i < SLOT_COUNT; i++) {
      this.curtains[i] = this.createUnderButton(i);
    }
  }

  /** 单格的路 A 建法；失败返回 undefined（**不在 catch 里 continue**，所以提成函数） */
  private createUnderButton(slot: number): IconTimeCurtain | undefined {
    const btn = commandBarButton(slot);
    if (!isValidFrame(btn)) return undefined;
    const parent = Frame.fromHandle(btn);
    if (parent === undefined) return undefined;

    const w = DzFrameGetWidth(btn);
    const h = DzFrameGetHeight(btn);
    if (!(w > 0) || !(h > 0) || w > MAX_PLAUSIBLE_BUTTON_SIZE || h > MAX_PLAUSIBLE_BUTTON_SIZE) {
      return undefined;
    }

    return IconTimeCurtain.create(
      `CommandCardCurtain_${slot}`,
      parent,
      buttonGeometry(w, h, CURTAIN_INSET_RATIO),
      CURTAIN_TEXTURE,
      CURTAIN_ALPHA
    );
  }

  /**
   * 路 B：挂 `gameUI()`，位置抄 `COMMAND_BUTTONS_NORMAL`。
   *
   * 宿主是 `gameUI()` 而不是 `consoleParent()` —— 理由见文件头「宿主」那一节，
   * 一句话：本仓库画得出来的浮层全在 `gameUI()` 上，`consoleParent()` 是底板那一层。
   *
   * 常规态下 0..4 号按钮被挪到屏幕外（`OFFSCREEN`），那几格的暗幕**根本不建** ——
   * 建了也永远不该显示，白占句柄。
   */
  private buildUnderRoot(): void {
    const host = gameUI();
    if (!isValidFrame(host)) {
      log.error("gameUI() 拿不到，命令卡冷却暗幕整组不建");
      this.parentMode = "none";
      return;
    }
    const parent = Frame.fromHandle(host);
    if (parent === undefined) {
      log.error("Frame.fromHandle(gameUI) 返回 undefined，整组不建");
      this.parentMode = "none";
      return;
    }

    // ⚠️ **两趟**：先把 12 个暗幕建完，再建 12 个数字。
    //
    // 同父节点里「后建的画在上面」——一趟建出来的话，只会保证**同一格内**数字在
    // 暗幕上面；两趟则保证**整排**的数字都在所有暗幕之上，不依赖同格内的相对顺序。
    // 数字被暗幕盖住过一次（`DzFrameSetPriority` 只差 1 档时靠不住），所以这里
    // 不省这两行。
    for (let i = 0; i < SLOT_COUNT; i++) {
      const rect = COMMAND_BUTTONS_NORMAL[i];
      if (rect === undefined || rect[0] >= OFFSCREEN) {
        this.curtains[i] = undefined;
        continue;
      }
      const curtain = IconTimeCurtain.create(
        `CommandCardCurtain_${i}`,
        parent,
        rectGeometry(rect, CURTAIN_INSET_RATIO),
        CURTAIN_TEXTURE,
        CURTAIN_ALPHA
      );
      // 不给优先级就会被命令卡按钮盖住（见 CURTAIN_PRIORITY 的注释）
      curtain.setPriority(CURTAIN_PRIORITY);
      this.curtains[i] = curtain;
    }

    for (let i = 0; i < SLOT_COUNT; i++) {
      const rect = COMMAND_BUTTONS_NORMAL[i];
      if (rect === undefined || rect[0] >= OFFSCREEN) {
        this.texts[i] = undefined;
        continue;
      }
      this.texts[i] = this.createTextForSlot(i, parent, rect);
    }
  }

  /**
   * 建一格的冷却秒数文本。
   *
   * **不调 `setFont`** —— `NativeUISystem.createText` 也没调，而屏幕上那条
   * 「1100 / 1100」就是它建的（默认字体、默认字号），是本文件能拿到的最硬的
   * 「这套写法画得出来」的证据。自带字体路径需要额外确认资源存在，不值得为
   * 两位数引入一个变量。
   *
   * 矩形用**原始 rect**（不内缩）：数字居中靠的是 frame 撑满整格，
   * 内缩会让它偏。暗幕才需要内缩（别压住按钮边框美术）。
   */
  private createTextForSlot(
    slot: number,
    parent: Frame,
    rect: Rect
  ): Frame | undefined {
    const text = Frame.createType(`CommandCardText_${slot}`, parent, 0, "TEXT", "");
    if (text === undefined) {
      log.warn(`建 ${slot} 号格的冷却数字失败，这一格只留暗幕`);
      return undefined;
    }
    // 不链式调用：`setTextAlignment` / `setText` 的返回类型在这套 d.ts 里没保证是
    // `Frame`（`BuffBarUI` 那边也是分开写的），链上去一旦不返回 Frame 就编译不过。
    text.setAbsPoint(FRAME_ALIGN_LEFT_TOP, rect[0], rect[1]);
    text.setAbsPoint(FRAME_ALIGN_RIGHT_BOTTOM, rect[2], rect[3]);
    text.setTextAlignment(TEXT_ALIGN_CENTER, 0);
    text.setText("");
    text.setAlpha(255);
    // 数字要压在暗幕上面（见 TEXT_PRIORITY）
    DzFrameSetPriority(text.handle, TEXT_PRIORITY);
    text.setVisible(false);
    return text;
  }

  /**
   * 把引擎自带的**径向扇形扫描**关掉（用户已确认：只留线性暗幕）。
   *
   * 与建暗幕**分开隔离**：这是本文件唯一「动原生控件」的操作，万一它在某个
   * 1.27a 版本上不认，也不该连带把暗幕一起拖垮。
   *
   * 只在建的时候做一次 —— 指示器句柄是稳定的，不必每帧调。
   */
  private hideNativeSweeps(): void {
    for (let i = 0; i < SLOT_COUNT; i++) {
      const btn = commandBarButton(i);
      if (!isValidFrame(btn)) continue;
      try {
        const cd = DzFrameGetCommandBarButtonCooldownIndicator(btn);
        if (isValidFrame(cd)) DzFrameShow(cd, false);
      } catch (e) {
        log.warn(`隐藏 ${i} 号按钮的冷却指示器失败，跳过：${e}`);
      }
    }
  }

  // -------------------------------------------------------------------------
  // 每帧
  // -------------------------------------------------------------------------

  /**
   * 挂在 `FrameLoop` 的**异步**回调上。
   *
   * ⚠️ **只调 `setProgress`，不 create / destroy 任何句柄** —— 纪律见 `FrameLoop`
   * 的注释（句柄增删必须留在同步上下文）。
   *
   * `IconTimeCurtain.setProgress` 内部对「值没变」做了去重，所以每帧无脑调到底
   * 并不会产生 12 次 native 调用，绝大多数帧是零成本。
   */
  private refreshPerFrame(): void {
    if (!this.created || this.parentMode === "none") return;

    const u = DzGetSelectedLeaderUnit();
    // 空选 / 已死：全部收起。`GetUnitTypeId` 对悬垂句柄不安全，先挡一道
    // （写法照抄 `BuffBarUI.resolveIdleTarget` 的守卫）
    if (u === undefined || GetUnitTypeId(u) === 0) {
      this.setAllProgress(0);
      return;
    }

    // 路 B 的坐标表是常规态专用的，商店态下 12 格会重排到左上角，
    // 而暗幕锚点建好就不再改 —— 跟不动，索性整组收起，宁可没有也不画错位。
    if (this.parentMode === "absolute" && this.isShopSelected(u)) {
      this.setAllProgress(0);
      return;
    }

    // ⚠️ 固定按 SLOT_COUNT 遍历，不用 `this.curtains.length` —— 见 `curtains` 字段注释
    for (let i = 0; i < SLOT_COUNT; i++) {
      const curtain = this.curtains[i];
      if (curtain === undefined) continue;

      const btn = commandBarButton(i);
      if (!isValidFrame(btn)) {
        this.clearSlot(i);
        continue;
      }

      // 0 = 这格没绑技能（空位 / 被动 / 非技能命令），没有冷却可言
      const abilityId = KKCommandButtonGetAbilityId(btn);
      if (abilityId === 0) {
        this.clearSlot(i);
        continue;
      }

      const remain = DzGetUnitAbilityCool(u, abilityId);
      const total = DzGetUnitAbilityMaxCool(u, abilityId);
      // 见文件头：不在冷却时 `remain` 是 0，而 `total` 多半也是 0 —— 不特判会撞上
      // `0 / 0`（NaN 喂进 setProgress 会把尺寸算成 NaN，frame 直接不画）。
      if (!(remain > 0) || !(total > 0)) {
        this.clearSlot(i);
        continue;
      }
      // 方向（与 Buff 栏相反，理由见文件头）：进度 0 = 全亮、1 = 全暗。
      // 释放瞬间 remain == total → p = 1 → 整块压黑；随冷却恢复 remain 递减
      // → p 递减 → 暗幕从**下边**往上退走（`IconTimeCurtain` 锚的是顶边，
      // 高度缩、顶边不动）。
      //
      // **量化到 PROGRESS_STEPS 档**再喂进去：`remain/total` 是个几乎每帧都在变的
      // 浮点数，不量化的话 `setProgress` 内部那层「值没变就返回」的去重等于形同
      // 虚设，7 个格子每帧都要写一次尺寸。量化后只有真的跨档了才动 frame。
      // （2026-10-04 之前这里更要紧：那时每档还要 clearAllPoints + 两个绝对点，
      // 现在进度只走 `setSize`，代价小多了，但去重仍然值得留。）
      const quantized =
        Math.round((remain / total) * PROGRESS_STEPS) / PROGRESS_STEPS;
      curtain.setProgress(quantized);
      // 秒数**向上取整**：剩 0.3 秒时显示 1 —— 显示 0 会让人以为「已经好了」，
      // 而这 0.3 秒里技能其实放不出来。这也是魔兽原生的做法。
      this.setSeconds(i, Math.ceil(remain));
    }
  }

  /** 这一格没有冷却：收起暗幕、清掉数字 */
  private clearSlot(slot: number): void {
    const curtain = this.curtains[slot];
    if (curtain !== undefined) curtain.setProgress(0);
    this.setSeconds(slot, -1);
  }

  /**
   * 写这一格的冷却秒数，`-1` = 收起。
   *
   * 去重（值没变就不碰 frame）照抄 `BuffBarUI.refreshSlotTexts` 那条理由：
   * 反复写同样的文本会让引擎白重排一遍字形，而这里是每帧回调。
   *
   * ⚠️ **参数是数字，字符串在去重之后才拼。** 这跟上面删掉的那 24 次 `toFixed`
   * 是同一类浪费：`\`${n}\`` 看着无害，但它每帧、每格都分配一个新字符串，
   * 而实际内容一秒才变一次。
   */
  private setSeconds(slot: number, seconds: number): void {
    const text = this.texts[slot];
    if (text === undefined) return;
    if (this.lastSeconds[slot] === seconds) return;
    this.lastSeconds[slot] = seconds;
    if (seconds <= 0) {
      text.setVisible(false);
      return;
    }
    text.setText(`${seconds}`);
    text.setVisible(true);
  }

  /**
   * 整排收起（空选 / 商店态）。只在 `progress <= 0` 时会顺带清掉数字 ——
   * 目前唯一的调用方传的都是 0，写成条件只是免得以后有人传个正数进来时
   * 出现「暗幕压着但数字没了」的半截状态。
   */
  private setAllProgress(progress: number): void {
    // ⚠️ 不用 `for...of`（编译成 ipairs，撞上第一个 nil 就停）—— 见 `curtains` 字段注释
    for (let i = 0; i < SLOT_COUNT; i++) {
      const curtain = this.curtains[i];
      if (curtain !== undefined) curtain.setProgress(progress);
      if (progress <= 0) this.setSeconds(i, -1);
    }
  }

  /**
   * 商店单位判据 —— 与 `NativeUISystem.isShopUnit`（`:763-777`）同一套：
   * 拥有「选单位 / 选英雄 / 购买物品」任一技能，且不是敌人。
   *
   * 那边是 private，这边只能用同一份 `SHOP_ABILITY_IDS` 重写一遍。
   * 只用来决定「暗幕收不收」，判错的代价是少显示 / 多隐藏，不会画错位置。
   */
  private isShopSelected(u: unit): boolean {
    if (IsUnitEnemy(u, GetLocalPlayer())) return false;
    for (const abilityId of SHOP_ABILITY_IDS) {
      if (GetUnitAbilityLevel(u, abilityId) > 0) return true;
    }
    return false;
  }
}
