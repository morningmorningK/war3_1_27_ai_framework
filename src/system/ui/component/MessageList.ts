import { Frame, MapPlayer } from "@eiriksgata/wc3ts/*";
import { ScreenCoordinates } from "../ScreenCoordinates";

import { Panel } from "./Panel";
import { Text } from "./Text";
import { createLogger } from "src/utils/logger";

const log = createLogger("MessageList");

/**
 * 一行文字的高度（1080p 基准像素）。
 *
 * 这个数现在**直接就是**一条消息的高度的计量单位：折出 n 行，frame 就高
 * `n * 20`。所以它一变，屏幕上一屏能放几条也跟着变 —— 改它之前先想清楚。
 *
 * 它同时也决定了「一条消息最多几行」（见 `MessageListConfig.maxMessageLines`）。
 */
const LINE_HEIGHT_PX = 20;

/** 一个**全角**字符占的宽度（像素）。见 `isFullWidthAt()` */
const CHAR_FULL_PX = 25;
/** 一个**半角**字符占的宽度（像素）。见 `isFullWidthAt()` */
const CHAR_HALF_PX = 12;

/**
 * ⚠️ **这个文件里所有 `charCodeAt` / `length` / `substring` 打交道的都是 UTF-8 字节，
 * 不是字符。** 因为 tstl 把 `String.prototype.charCodeAt` 编成
 * `__TS__StringCharCodeAt` → `string.byte(text, i + 1)` —— 拿回来的是**一个字节**，
 * 不是 Unicode 码位。Lua 的字符串本来就只是字节串，没有「字符」这个概念。
 *
 * **这个坑实打实吃掉了一整轮排查**：`系`(U+7CFB) 的 UTF-8 是 `E7 B3 BB`，
 * `string.byte` 给的是 `231`。原先这里挂着一张「全角码位区间表」去判 `231`，
 * 一个区间都落不进去 —— **所有汉字都被当成半角**。两个后果：
 *
 * - `nextUnitEnd()` 从不在汉字之间断开，唯一能断的地方只剩空格 ——
 *   跟引擎自己的折行规则**一模一样**。所以现象是「折行代码明明在跑，断点却全在空格上」，
 *   连标记法（`^`）都帮不上忙：标记确实是我打的，只是我打的每个点都恰好是空格。
 * - `measureWidthPx()` 按字节数：一个汉字 3 字节，算成 36 像素。
 *
 * 所以下面全部改成**按字节走、按字符算**。
 */
const CONTINUATION_MIN = 0x80;
const CONTINUATION_MAX = 0xc0;

/**
 * 这个字节是 UTF-8 的**续字节**（`10xxxxxx`）吗。
 *
 * 续字节属于它前面那个字符，不能单独算一个字符 —— 从尾部删字符时要靠它找回字符起点，
 * 删错一位就把汉字劈成两半、渲染成乱码。
 */
function isContinuationByte(b: number): boolean {
  return b >= CONTINUATION_MIN && b < CONTINUATION_MAX;
}

/**
 * `text[i]` 处这个字符占**几个字节**（1~4）。
 *
 * 只看首字节的高位 —— 这是 UTF-8 自我描述的部分：
 * `0xxxxxxx`=1、`110xxxxx`=2、`1110xxxx`=3、`11110xxx`=4。
 * 续字节（本不该出现在字符开头）兜底当 1 字节：宁可少走一步，也不要抛异常。
 */
function charLenAt(text: string, i: number): number {
  const b = text.charCodeAt(i);
  if (b < 0xc0) {
    return 1;
  }
  if (b < 0xe0) {
    return 2;
  }
  if (b < 0xf0) {
    return 3;
  }
  return 4;
}

/**
 * `text[i]` 处是**全角**字符吗 —— 判据就是「首字节 `>= 0x80`」，即**多字节字符按全角算**。
 *
 * 汉字和全角标点（`：`、`，`、`「`）在这个面板里都是 3 字节，占一整个字宽；
 * ASCII 是单字节，占半个。正好一刀切，不需要再去维护码位区间表。
 *
 * 代价：两字节的字符（拉丁重音、`°` 之类）也会被当成全角，多估了约一倍宽度。
 * 这个面板是中文聊天框，那类字符极少，而且**估宽只是提前换行，估窄才会被裁**。
 */
function isFullWidthAt(text: string, i: number): boolean {
  return text.charCodeAt(i) >= 0x80;
}

/**
 * 从 `start` 起，**一个不可拆分的单元**到哪儿结束（返回结束下标，不含）。
 *
 * ## 什么叫「不可拆分」
 *
 * 折行的最小单位不是「字符」也不是「词」，而是「**换了行读着会别扭的最小片段**」：
 *
 * | 内容 | 单元 | 理由 |
 * |---|---|---|
 * | 一个全角字（汉字/`：`/`（`…） | 一个字 | 中文任意两字之间都能断 |
 * | 一串连续的半角非空格（`Console.say`、`#1`、`[15:35:11]`） | 整串 | 英文单词、代码、时间戳被拦腰砍断就没法读了 |
 * | 一个空格 | 一个空格 | 让它**留在上一行末尾**，而不是飘到下一行行首 |
 *
 * ## 为什么不能用「行内最后一个空格」来代替
 *
 * 这个函数的前身就是那么写的，结果是**中文比英文更惨**：中文整段没有空格，
 * 而消息开头的 `[15:35:11] 玩家消息 #1：这条应为白色（走 Console.say 直发）`
 * 里唯一靠后的空格在「玩家消息」后面 —— 行排到 443px 溢出时回溯到那个空格，
 * **整整 200px 的内容被整体推到下一行**。实测截图里每条消息都只剩
 * `[15:35:11] 玩家消息` + `#1：这条应为白色（走…` 两小截，用户的原话是
 * 「基本看不到任何消息了」。按单元贪心填充才是对的：中文逐字断，英文整词搬。
 *
 * ⚠️ 返回的下标是**字节下标**，而且永远落在字符边界上 —— 调用方拿它去
 * `substring()` 才不会切出半个汉字。
 */
function nextUnitEnd(text: string, start: number): number {
  // 全角字（多字节）：自己就是一个单元，跨过它的一整个 UTF-8 序列
  if (isFullWidthAt(text, start)) {
    return start + charLenAt(text, start);
  }
  // 空格：自己就是一个单元
  if (text.charAt(start) === " ") {
    return start + 1;
  }
  // 半角串：一路吃到下一个全角字或空格为止
  let end = start + 1;
  while (end < text.length) {
    if (isFullWidthAt(text, end) || text.charAt(end) === " ") {
      break;
    }
    end++;
  }
  return end;
}

/**
 * 整串的显示宽度（像素）。**按字符走，不是按字节** —— 这一点是这一轮的关键修正，
 * 详见文件上方 `charLenAt()` 那段注释。
 */
function measureWidthPx(text: string): number {
  let total = 0;
  let i = 0;
  while (i < text.length) {
    if (isFullWidthAt(text, i)) {
      total += CHAR_FULL_PX;
      i += charLenAt(text, i);
    } else {
      total += CHAR_HALF_PX;
      i++;
    }
  }
  return total;
}

/**
 * 折行的结果：折号之后的文本 + **占了几行**。
 *
 * 行数必须和文本一起返回 —— 调用方要拿它算 frame 高度（`行数 × LINE_HEIGHT_PX`）。
 * 拆成两个函数分别算的话，两处一旦对不上就是「frame 比文本矮」⇒ 最后一行被裁，
 * 又回到用户报的「消息不换行」。
 */
interface WrappedText {
  text: string;
  lines: number;
}

/**
 * 把一条消息按显示宽度折成最多 `maxLines` 行，行间插换行符 `\n`。
 *
 * ## 换行符用 `\n`（`|n` **也能用**，两个是等价的）
 *
 * 这一条是被实测纠正过的：早先这里写着「`|n` 是弹窗语法、frame 不认」，那是**错的**。
 * 用三字符探针（`甲\n乙` 和 `丙|n丁`）各发一条，两条都在中间断了行 —— 证明
 * **`\n` 和 `|n` 都被 frame 的文本渲染器接受**。所以之前「折行没生效」另有原因，
 * 不是换行符的锅。
 *
 * 现在用 `\n`，只是跟着仓库里其它在跑的多行文本走：`Tips.ts`、
 * `BuffDisplayRegistry.ts`、`TipsExample.ts` 用的都是它。
 *
 * ## 为什么非得自己折
 *
 * 引擎**自己会折行**（TEXT frame 拿到矩形就会折），但它是在**空格处**断的：
 * 中文整段没有空格，会被当成一个「词」整块挪到下一行 ——
 * `[15:19:30][战斗] 战斗日志 #1：这条应为灰色…` 实际只排到「战斗日志」就换行了，
 * 剩下的半行白白扔掉。这不叫折行，这叫浪费。所以自己按宽度切。
 *
 * 第二层原因：**行数必须和我们算的一致**。frame 高度是我们自己给的（行数 × 20），
 * 引擎若在旁边多折出一行就是被裁掉一行、没有任何提示。所以行数由本函数算准，
 * 调用方照着设高度。
 *
 * ## 宽度是**估**的，不是量的
 *
 * `CHAR_FULL_PX` / `CHAR_HALF_PX` 两个常数是从截图里数出来的（464 px 一行约排
 * 得下 19 个汉字 / 44 个西文字符），刻意**往宽里估**：估宽了只是提前换行、行尾留点空，
 * 估窄了引擎会再折一次 —— 那就又回到被裁的老路上了。宁可留白，不可溢出。
 *
 * ## 断点选择：按**单元**贪心填充
 *
 * 一行一行地往里塞 `nextUnitEnd()` 切出来的单元，塞不下就把**整个单元**挪到下一行。
 * 中文的单元是一个字，所以中文能排到行尾最后一个像素；英文的单元是一个词，
 * 所以英文不会被拦腰砍断。**两者用同一套规则，不需要「回溯到最后一个空格」那种特判**
 * —— 那种特判对中文是有害的，见 `nextUnitEnd()` 的注释。
 *
 * ⚠️ 折好的结果就是最终文本，**不保留原串** —— 面板尺寸变了不会重新折。
 * 聊天面板的尺寸是 `ChatBoxUI` 里的常量，不存在运行时改尺寸的情况。
 */
/**
 * ⚠️ **临时诊断标记，验完删掉（连着 `\n` 一起改回 `""`）。**
 *
 * 折行结果到底有没有送到 frame 上，这一轮的思路是：在**每个由我插入的换行处**
 * 打一个 `^`，让它自己说话：
 *
 * - 断点处有 `^` ⇒ 我的折行生效了，断点就是我切的
 * - 断点在空格上、且**没有** `^` ⇒ 我的折行结果没到 frame，这些断点是引擎自己折的
 *
 * 用 `^` 而不是更醒目的 `»`：**标记本身不能被字体吃掉**。非 ASCII 字符在 1.27a 的
 * 默认字体里不保证有字形，渲染成空白的话，「没有标记」和「标记没画出来」就分不清了。
 */
const WRAP_MARK = "^";

function wrapMessage(text: string, maxWidthPx: number, maxLines: number): WrappedText {
  const limit = Math.max(1, maxLines);
  const lines: string[] = [];
  let current = "";
  let currentWidth = 0;
  let index = 0;

  while (index < text.length) {
    const end = nextUnitEnd(text, index);
    const unit = text.substring(index, end);
    const width = measureWidthPx(unit);

    if (currentWidth + width > maxWidthPx && current.length > 0) {
      lines.push(current);
      if (lines.length >= limit) {
        // 行数已经排满：最后一行挤出「…」的位置，后面的内容全丢。
        return finishTruncated(lines, maxWidthPx);
      }
      // 整个单元挪到新的一行（`current.length > 0` 保证不会死循环）
      current = unit;
      currentWidth = width;
    } else {
      current += unit;
      currentWidth += width;
    }
    index = end;
  }

  lines.push(current);
  return { text: lines.join(WRAP_MARK + "\n"), lines: lines.length };
}

/**
 * 折满 `maxLines` 之后收尾：给最后一行补一个「…」。
 *
 * 最后一行可能是**正好排满**的，直接补就溢出去折成下一行、又被裁掉 ——
 * 所以先往回删字符腾出省略号的位置。
 *
 * ⚠️ 删的是**一整个 UTF-8 字符**，不是一字节。`…` 本身是多字节字符，按全角宽度算
 * （它实际多半是半角，多留十来像素只是让收尾更干净，不影响行数）。
 *
 * 行数不会因为补省略号而变（只是在最后一行内部删几个字符），所以 `lines` 原样返回。
 */
function finishTruncated(lines: string[], maxWidthPx: number): WrappedText {
  const ellipsis = "…";
  let last = lines[lines.length - 1];
  while (last.length > 0 && measureWidthPx(last) + CHAR_FULL_PX > maxWidthPx) {
    // 从尾部找回这个字符的起点：先跳过续字节（`10xxxxxx`），再退掉首字节。
    // 只退一个字节会切在汉字中间，渲染成乱码
    let cut = last.length - 1;
    while (cut > 0 && isContinuationByte(last.charCodeAt(cut))) {
      cut--;
    }
    last = last.substring(0, cut);
  }
  lines[lines.length - 1] = last + ellipsis;
  return { text: lines.join(WRAP_MARK + "\n"), lines: lines.length };
}

/**
 * 消息项配置
 */
export interface MessageItemConfig {
  /** 消息文本 */
  text: string;
  /** 文本颜色（十六进制，不含#） */
  color?: string;
  /** 消息高度（像素） */
  height?: number;
  /** 频道标签。`MessageList` 只把它当**不透明字符串**用，不认识它的具体取值 */
  tag?: string;
}

/**
 * 消息项 —— 封装单条消息。
 *
 * ## 保留模型
 *
 * 消息**不会自己消失**。这里原本有一整套「到点淡出」机制（`duration` / `elapsedTime` /
 * `fadeStartTime` / `fadeTimer` / `update` / `startFadeOut`，约 80 行，每条消息还各起一个
 * 10ms 的定时器），现在整段删掉了 —— 队列改成「按 `tag` 各自留 N 条，超出丢最早的」，
 * 由 `MessageList.evictOldestOfTag()` 负责，不需要每条消息自己盯时钟。
 *
 * ## 位置上「谁改了什么」
 *
 * 一条消息的 X、Y 有**三个**来源，改的时候别互相踩：
 *
 * | 来源 | 改什么 | 什么时候 |
 * |---|---|---|
 * | `layoutTo()` | X 与 Y（Y 可以交给动画插值） | 每次重排 |
 * | `slideTo()` | 只改 X | 面板收起 / 展开的横向平移 |
 * | `animateStep()` | 只改 Y | 新消息插入时的上滑动画 |
 */
class MessageItem {
  public textComponent: Text;
  /** 频道标签。筛选就是拿它比字符串 */
  public tag: string | undefined;
  /**
   * 当前可见性缓存。**和 `textComponent.getVisible()` 不同** —— 那个是「上次写进去的值」，
   * 这个是「我们以为的当前值」，用来避免重复写。见 `MessageList.setItemShown`。
   */
  public shown: boolean = false;
  /**
   * 这条消息在本客户端**是否有资格显示** —— 只由 `targetPlayer` 决定，构造时算一次就够。
   * 它和「筛选」「滚动窗口」是两回事，那两者每次重排都在变。
   */
  public playerVisible: boolean;
  public targetY: number;
  public currentY: number;
  public targetPlayer: MapPlayer | undefined;
  /**
   * 这条消息**自己**需要的高度（像素）= 折出来的行数 × `LINE_HEIGHT_PX`。
   *
   * 每条都可能不一样（短消息 20、长消息 100），所以不能再像以前那样拿
   * `MessageList` 上一个公共常量去排版 —— 重排必须一条条累加它。
   * 构造时算一次就定了：宽度由面板决定、内容由 `wrapMessage` 定死，之后不会变。
   */
  public itemHeight: number;
  /** 上次写进 `Text` 的尺寸，避免每次都调 `setSize` */
  private width: number;
  private height: number;

  constructor(
    text: string,
    x: number,
    y: number,
    width: number,
    height: number,
    color: string = "FFFFFF",
    origin: string,
    parent: Frame,
    targetPlayer?: MapPlayer,
    fontPath?: string,
    fontSize?: number,
    tag?: string
  ) {
    this.targetY = y;
    this.currentY = y;
    this.targetPlayer = targetPlayer;
    this.tag = tag;
    this.width = width;
    this.height = height;
    this.itemHeight = height;

    // 创建Text组件（使用与MessageList相同的origin）
    // 所有客户端都创建，但通过可见性控制显示
    this.textComponent = new Text(text, x, y, width, height, origin);
    this.textComponent.setColor(color);
    // 字体必须在 create() **之前**设 —— `Text.setFont` 只是记字段，
    // `create()` 才拿它去调原生的 `setFont`。放后面设等于白设。
    if (fontPath !== undefined && fontPath !== "") {
      this.textComponent.setFont(fontPath, fontSize);
    }
    this.textComponent.create(parent);

    // 根据目标玩家设置可见性（在UI层面做区分，避免不同步）
    this.playerVisible = this.computePlayerVisible();
    this.shown = this.playerVisible;
    this.textComponent.setVisible(this.playerVisible);
  }

  /**
   * 是否应该在本客户端显示（目标玩家过滤）
   * 所有客户端都执行，但只有符合条件的客户端才显示
   */
  private computePlayerVisible(): boolean {
    if (this.targetPlayer) {
      // 如果指定了目标玩家，只有当该玩家是本地玩家时才显示
      return this.targetPlayer === MapPlayer.fromLocal();
    }
    // 如果没有指定目标玩家，所有玩家都能看到
    return true;
  }

  /**
   * 按重排的结果落位。**三条路各自判重**，值没变就不碰原生的 frame ——
   * 重排每次遍历全部消息（上限 5 类 × 50 条 = 250 条），每次都白写一遍不值得。
   *
   * @param animate Y 变化时是否走插值动画。**刚由隐藏变可见的那条要传 `false`** ——
   *        它的旧 `currentY` 是上一次可见时的位置（可能差十几行），插值会从屏幕外滑进来。
   * @returns 这条消息是否需要动画推进（调用方据此决定要不要起动画定时器）
   */
  public layoutTo(
    x: number,
    y: number,
    width: number,
    height: number,
    animate: boolean
  ): boolean {
    if (this.width !== width || this.height !== height) {
      this.width = width;
      this.height = height;
      this.textComponent.setSize(width, height);
    }

    if (this.targetY === y && this.currentY === y) {
      // Y 没动，只可能 X 因为面板平移变了
      this.slideTo(x);
      return false;
    }

    if (!animate) {
      this.placeAt(x, y);
      return false;
    }

    this.targetY = y;
    this.slideTo(x);
    return true;
  }

  /** 瞬时落位：X、Y 一起写，并把「当前值」与「目标值」对齐 */
  public placeAt(x: number, y: number): void {
    this.currentY = y;
    this.targetY = y;
    // 走 Unclamped 那条：面板收起时 X 是负的，钳制版会把这些消息全按在 x = 0 上
    this.textComponent.setPositionUnclamped(x, y);
  }

  /**
   * 只改 X —— 面板收起 / 展开的横向平移专用。
   * 判重之后才写：滑动是 50Hz 的，静止时（面板没在滑）不该产生任何原生调用。
   */
  public slideTo(x: number): void {
    if (this.textComponent.getPixelX() === x) {
      return;
    }
    this.textComponent.setPositionUnclamped(x, this.textComponent.getPixelY());
  }

  /** 上滑动画推进一帧（只插值 Y；X 归 `slideTo` / `placeAt` 管） */
  public animateStep(progress: number): void {
    if (this.currentY === this.targetY) {
      return;
    }
    // 缓动函数：easeOutCubic
    const eased = 1 - Math.pow(1 - progress, 3);
    const y = this.currentY + (this.targetY - this.currentY) * eased;
    this.textComponent.setPositionUnclamped(this.textComponent.getPixelX(), y);
  }

  /** 动画收尾：精确落到目标上，不留半像素 */
  public finishAnimation(): void {
    if (this.currentY === this.targetY) {
      return;
    }
    this.currentY = this.targetY;
    this.textComponent.setPositionUnclamped(this.textComponent.getPixelX(), this.targetY);
  }

  /**
   * 销毁消息项
   */
  public destroy(): void {
    if (this.textComponent !== null) {
      this.textComponent.destroy();
    }
  }
}

/**
 * 消息列表配置
 */
export interface MessageListConfig {
  x: number;
  y: number;
  width: number;
  maxHeight?: number;
  /**
   * 一条消息**最多**显示几行（默认 5）。超过就折到第 5 行、末尾补「…」。
   *
   * ⚠️ 这是**上限，不是定高**。frame 高度是**按内容**给的
   * （`折出来的行数 × LINE_HEIGHT_PX`）：一条 12 字的消息就占 20 像素，
   * 而不是白占一整格 —— 这就是「按内容动态高度」的全部意思。
   *
   * 改这个数只影响**长消息截在第几行**，不会让短消息变高。
   * 想整体调疏密，改 `LINE_HEIGHT_PX`（但那是全局的，一屏条数也一起变）。
   *
   * 折行本身是**自己做的**（`wrapMessage()`），不交给引擎 —— 原因见那个函数。
   */
  maxMessageLines?: number;
  messageSpacing?: number;
  /**
   * **每个 `tag` 各自**最多留多少条（默认 50）。
   *
   * 注意是**按 tag** 淘汰，不是全局 FIFO —— 所以「全部」视图里最多能堆
   * `类别数 × 这个值`（当前 5 类 ⇒ 250 条）。这是「消息不消失 + 队列长度固定」
   * 这个选择的必然开销：每条消息是一个 `Text`（1~3 个原生 frame），
   * 常驻帧数因此在 500 上下。**这个上限必须真的是个上限**，不能退化成无界数组。
   */
  perChannelLimit?: number;
  /**
   * 消息区顶部留白（像素）—— 给面板内部的筛选条让位。
   * 消息区高度少了这么多，能显示的行数也就少一行左右，`getScrollInfo().rows` 会跟着变。
   */
  insetTop?: number;
  /** 消息区右侧留白（像素）—— 给右边缘的滑块条让位 */
  insetRight?: number;
  slideAnimationDuration?: number;
  fadeAnimationDuration?: number;
  backgroundColor?: string;
  origin?: string;
  /**
   * 字体路径。**不填会用引擎默认字体 —— 那个字号很大，宽 480 的面板一行只放得下
   * 十来个汉字，长消息会被硬生生截断**（实测：`[系统] 聊天框自检：这条走 log，应为绿色`
   * 只显示到「这条走」）。所以聊天框一定要显式给字体。
   */
  fontPath?: string;
  /** 字体大小（WC3 坐标系）。配 `fontPath` 一起用，单给没用 */
  fontSize?: number;
}

/**
 * 消息列表组件 —— 带历史的聊天记录面板。
 *
 * ## 保留模型：消息不消失，按条数淘汰
 *
 * 每条消息进来时带一个**不透明的字符串 `tag`**（频道），超出 `perChannelLimit` 就丢掉
 * **该 tag 里最早的**一条。没有时长、没有淡出 —— 想回看多久以前的都行，直到被挤掉。
 *
 * ## 可见窗口：从最新一条往回**按高度**填，填到放不下为止
 *
 * ```
 * filtered  = messages.filter(通过 tag 筛选 且 本地玩家可见)
 * offset    = clamp(scrollOffset, 0, maxOffset)      // 单位是「条」
 * end       = filtered.length - offset               // 窗口的最新一条是 end - 1
 * 从 end-1 往回摞，累计 (条高 + 间距) 直到超过消息区高度 → 得到窗口 [start, end)
 * ```
 *
 * `scrollOffset = 0` 就是贴着底部看最新。**新消息进来时窗口不会跳** ——
 * 见 `relayout()` 里那段 `lastFilteredCount` 记账。
 *
 * ### 高度是**按内容**给的，所以窗口不再是「固定几条」
 *
 * 每条消息占多高由它自己折出来的行数定（`wrapMessage()` → `行数 × LINE_HEIGHT_PX`），
 * 短消息 20 像素、长消息最多 100。所以「一屏几条」不是个定数 —— 全是短消息能放十好几条，
 * 全是长消息就只放得下两三条。这也是**刻意**的：短消息不该白占一整格。
 *
 * 代价是空出来的那点余量**没法利用**：摞到下一条放不下就停，不去把它裁一半塞进来
 * （`Text` 的 frame 不被面板裁剪，画到筛选条上更难看）。
 *
 * ## 和其它文件的分工
 *
 * 本文件是**通用组件**，不该认识 `ChatChannel`。筛选条（长什么样、有几个类别）和滑块条
 * （拖拽把手）都是 `ChatBoxUI` 的零件，这里只出数据和 API：
 *
 * ```ts
 * list.setFilterTag(ChatChannel.SYSTEM);   // null = 全部
 * list.scrollBy(+1);                       // 正数 = 往前翻历史
 * const info = list.getScrollInfo();       // 滑块拿它算把手的高度和位置
 * list.setOnLayoutChanged(() => sync());   // 每次重排后回调，让滑块跟上
 * ```
 *
 * ⚠️ **不能反过来 import `ChatBoxUI`** —— 那会构成
 * `ChatBoxUI → console → MessageList → ChatBoxUI` 的循环依赖。
 *
 * 坐标说明：
 * - 默认使用 TOP_LEFT 坐标系（左上角为原点）
 * - x, y 参数表示 Panel 的左上角位置（像素坐标）
 * - 消息从底部向上排列，新消息添加在底部
 *
 * @example
 * ```typescript
 * const messageList = new MessageList(100, 780, 400, 300); // y = 1080 - 300 = 780
 * messageList.create();
 * messageList.addMessage("玩家加入了游戏", "00FF00", undefined, "SYSTEM");
 * ```
 */
export class MessageList {
  private static instance: MessageList | null = null;

  private panel: Panel;
  private messages: MessageItem[] = [];
  /** 一条消息最多折几行（上限，不是定高）。见 `MessageListConfig.maxMessageLines` */
  private maxMessageLines: number;
  private messageSpacing: number;
  private perChannelLimit: number;
  private insetTop: number;
  private insetRight: number;
  private slideAnimationDuration: number;
  private fadeAnimationDuration: number;
  private pixelX: number;
  private pixelY: number;
  private pixelWidth: number;
  private pixelHeight: number;
  private origin: string;
  /** 见 `MessageListConfig.fontPath` 的注释 —— 不给会出现长消息被截断 */
  private fontPath: string;
  private fontSize: number | undefined;

  /** 当前筛选项。`null` = 全部 */
  private filterTag: string | null = null;

  /** 从最新一条**往回退几条**。0 = 贴在底部看最新 */
  private scrollOffset: number = 0;

  /**
   * 上一次重排时过滤后的条数。用来做「新消息进来时窗口不跳」的记账，
   * 详见 `relayout()`。
   */
  private lastFilteredCount: number = 0;

  // 最近一次重排的结果，`getScrollInfo()` 直接读它们 —— 滑块拖拽是 100Hz 调用的，
  // 那条路上不该再去碰原生的 `getContentSize` / 过滤整个数组
  private lastVisible: number = 0;
  private lastMaxOffset: number = 0;
  private lastTotal: number = 0;

  /** 每次重排后的回调。`ChatBoxUI` 用它同步滑块把手 */
  private onLayoutChanged: (() => void) | null = null;

  // 动画相关
  private animationTimer: timer | null = null;
  private isAnimating: boolean = false;
  private animationProgress: number = 0;

  // 是否已创建
  private isCreated: boolean = false;

  constructor(
    x: number,
    y: number,
    width: number,
    height: number,
    config?: Partial<MessageListConfig>
  ) {
    this.pixelX = x;
    this.pixelY = y;
    this.pixelWidth = width;
    this.pixelHeight = height;
    this.origin = config?.origin || ScreenCoordinates.ORIGIN_TOP_LEFT;

    this.maxMessageLines = config?.maxMessageLines || 5;
    this.messageSpacing = config?.messageSpacing || 5;
    this.perChannelLimit = config?.perChannelLimit || 50;
    this.insetTop = config?.insetTop || 0;
    this.insetRight = config?.insetRight || 0;
    this.slideAnimationDuration = config?.slideAnimationDuration || 0.2;
    this.fadeAnimationDuration = config?.fadeAnimationDuration || 0.3;
    this.fontPath = config?.fontPath || "";
    this.fontSize = config?.fontSize;

    // 创建Panel容器
    this.panel = new Panel(x, y, width, height, this.origin);
    if (config?.backgroundColor) {
      this.panel.setBackground(config.backgroundColor);
    }
  }

  // ==================== 静态工厂方法 ====================

  /**
   * 获取MessageList单例
   * 如果不存在则创建新实例
   */
  public static getInstance(
    x?: number,
    y?: number,
    width?: number,
    height?: number,
    config?: Partial<MessageListConfig>
  ): MessageList {
    if (!MessageList.instance) {
      // 使用默认值或传入的参数
      const defaultX = x ?? 300;
      const defaultY = y ?? 200;
      const defaultWidth = width ?? 400;
      const defaultHeight = height ?? 300;
      MessageList.instance = new MessageList(defaultX, defaultY, defaultWidth, defaultHeight, config);
    }
    return MessageList.instance;
  }

  /**
   * 创建并获取单例（便捷方法）
   * 如果单例不存在则创建，如果未调用create则自动调用
   */
  public static createInstance(
    x: number,
    y: number,
    width: number,
    height: number,
    config?: Partial<MessageListConfig>,
    parent?: Frame
  ): MessageList {
    const instance = MessageList.getInstance(x, y, width, height, config);
    if (!instance.isCreated) {
      instance.create(parent);
    }
    return instance;
  }

  /**
   * 创建组件
   */
  public create(parent?: Frame): void {
    if (this.isCreated) {
      log.info("already created");
      return;
    }

    this.panel.create(parent);
    this.isCreated = true;

    // ⚠️ 这里原本有一个 0.1 秒的 `updateTimer`，唯一作用是给每条消息推进
    // `elapsedTime` 好让它到点淡出。保留模型改成「不消失、只按条数淘汰」之后，
    // 它就没有存在意义了 —— 现在一切都是事件驱动（`addMessage` / 滚动 / 筛选）。
  }

  // ==================== 消息 ====================

  /**
   * 添加消息
   *
   * 注意：所有客户端都会执行相同的代码（创建消息、添加到列表等），
   * 但在UI显示层面会根据目标玩家做区分，避免不同步掉线。
   *
   * ⚠️ 这个方法会**增删 frame**（建新消息、淘汰旧消息），所以**只能在定时器或主流程里调**，
   * 不要在 `DzFrameSetScriptByCode` 的回调（`sync` 派发）里调 —— 那里面动帧树会闪退。
   *
   * @param text 消息文本
   * @param color 文本颜色（十六进制，不含#，可选）
   * @param player 目标玩家（可选，如果指定则只有该玩家能看到，其他玩家看不到）
   * @param tag 频道标签（可选）。筛选按它比字符串；同一个 tag 的条数超过
   *            `perChannelLimit` 时，淘汰的是**该 tag 里最早**的那条
   */
  public addMessage(text: string, color?: string, player?: MapPlayer, tag?: string): void {
    const contentFrame = this.panel.getContentFrame();
    if (!contentFrame) {
      // Content frame not available - skip adding message
      return;
    }

    const area = this.computeArea();

    // 先按消息区的实际宽度自己折行，再交给 `MessageItem` —— 详见 `wrapMessage()`：
    // 引擎只在空格处折，「战斗日志」这种无空格长串会被整块推到第二行，白扔半行。
    const wrapped = wrapMessage(text, area.width, this.maxMessageLines);

    // **高度由内容定**：折了 n 行就给 n 行的高度。短消息不白占格子，长消息不裁。
    // 这个值算一次就定死了 —— 宽度来自面板常量、内容来自 `wrapMessage`，之后都不变。
    const itemHeight = wrapped.lines * LINE_HEIGHT_PX;

    // 新消息先落在消息区最底下，随后的重排会把它（以及其它可见消息）挪到位；
    // 已经有可见消息在屏幕上时，这批位移会走 `startPositionAnimation` 的上滑插值。
    const newMessage = new MessageItem(
      wrapped.text,
      area.x,
      area.bottom - itemHeight,
      area.width,
      itemHeight,
      color || "FFFFFF",
      this.origin,
      contentFrame,
      player,
      this.fontPath,
      this.fontSize,
      tag
    );

    this.messages.push(newMessage);
    this.evictOldestOfTag(tag);
    this.relayout(true, true);
  }

  /**
   * 按 tag 淘汰：同一个 tag 的条数超过上限时，丢掉**该 tag 里最早的**那几条。
   *
   * 不是全局 FIFO —— 「全部」筛选下五类消息各自独立计数，某一类刷屏不会把别的类别挤掉。
   * `tag` 为 `undefined` 的消息不参与淘汰（没有类别可归，也就没有上限可言）。
   */
  private evictOldestOfTag(tag: string | undefined): void {
    if (tag === undefined) {
      return;
    }

    let count = 0;
    for (const message of this.messages) {
      if (message.tag === tag) {
        count++;
      }
    }

    while (count > this.perChannelLimit) {
      const index = this.indexOfEarliestWithTag(tag);
      if (index === -1) {
        return;
      }
      this.messages[index].destroy();
      this.messages.splice(index, 1);
      count--;
    }
  }

  /** 最早的（下标最小的）同 tag 消息。找不到返回 -1 */
  private indexOfEarliestWithTag(tag: string): number {
    for (let i = 0; i < this.messages.length; i++) {
      if (this.messages[i].tag === tag) {
        return i;
      }
    }
    return -1;
  }

  /**
   * 移除消息
   */
  private removeMessage(message: MessageItem): void {
    const index = this.messages.indexOf(message);
    if (index === -1) return;

    // 销毁消息
    message.destroy();

    // 从列表中移除
    this.messages.splice(index, 1);

    this.relayout(true, true);
  }

  /**
   * 清空所有消息
   */
  public clear(): void {
    for (const message of this.messages) {
      message.destroy();
    }
    this.messages = [];
    this.scrollOffset = 0;
    this.lastFilteredCount = 0;
    this.stopPositionAnimation();
    this.relayout(false, false);
  }

  // ==================== 筛选 / 滚动 ====================

  /**
   * 设置频道筛选。`null` = 全部。
   *
   * 切类别时**滚动位置归零** —— 换了个类别还停在原来那个历史位置上是没道理的，
   * 而且不同类别的 `maxOffset` 差得远，不归零就得立刻重新夹一次。
   */
  public setFilterTag(tag: string | null): void {
    if (this.filterTag === tag) {
      return;
    }
    this.filterTag = tag;
    this.scrollOffset = 0;
    this.stopPositionAnimation();
    this.relayout(false, true);
  }

  /** 当前筛选项，`null` 表示全部 */
  public getFilterTag(): string | null {
    return this.filterTag;
  }

  /**
   * 直接跳到「从最新一条往回退 `offset` 条」。0 = 最新。
   *
   * 单位是**条**不是行 —— 动态高度下每条占的高度都不一样，「退几行」没有意义。
   *
   * **瞬时落位，不做动画** —— 这个入口是给拖动滑块用的，加 0.2 秒插值就变成拖不动了。
   * 新消息插入时那次上滑动画走的是另一条路（`relayout(true, ...)`）。
   */
  public setScrollOffset(offset: number): void {
    this.scrollOffset = offset;
    this.stopPositionAnimation();
    // anchor = false：这是**用户主动**滚动，不能让 `lastFilteredCount` 那套记账
    // 把刚滚到的位置又按「新消息条数」推走。
    // 夹取（offset 不能超过 maxOffset）和滑块同步都在 relayout 里完成 —— 不必在这重复一遍
    this.relayout(false, false);
  }

  /** 相对滚动。**正数 = 往前翻历史**，负数 = 往最新的方向回去 */
  public scrollBy(delta: number): void {
    this.setScrollOffset(this.scrollOffset + delta);
  }

  /**
   * 滑块要的那几个数，全部来自**最近一次重排**的缓存 —— 拖拽回调是 100Hz 的，
   * 不该在这条路上再去过滤整个数组、碰原生 frame。
   *
   * 单位是**条**，不是行：改了动态高度之后每条占的高度都不一样，「一屏几行」不再是个
   * 有意义的数，能说的只有「一屏几条」。
   *
   * - `offset` / `maxOffset`：把手的相对位置就是 `offset / maxOffset`
   * - `visible`：当前一屏放得下几条（**这个数是随窗口变的**），用来算把手高度
   *   （`visible / total`）。它只是个近似 —— 每条高度不等，比例不可能精确
   * - `total`：过滤后条数
   */
  public getScrollInfo(): { offset: number; maxOffset: number; visible: number; total: number } {
    return {
      offset: this.scrollOffset,
      maxOffset: this.lastMaxOffset,
      visible: this.lastVisible,
      total: this.lastTotal,
    };
  }

  /**
   * ⚠️ **临时诊断口，验完就删。**
   *
   * 「显示长度不对」这一轮所有推断都卡在两个数上：`area.width` 到底算出来是多少，
   * 以及我估的字符宽度和引擎实际的差多少。截图是裁剪的，量不出来；`print` 只进控制台，
   * 落不了盘。那就让面板自己把数报出来，比再猜一轮便宜。
   *
   * 刻意用字母缩写而不是全称 —— 这条消息本身也要被 `wrapMessage()` 折，
   * 超过一行就不好读了。配套的标尺消息在 `ChatBoxTestExample` 里。
   */
  public getDebugInfo(): string {
    const area = this.computeArea();
    const info = this.getScrollInfo();
    return `w=${area.width} h=${area.height} ml=${this.maxMessageLines} v=${info.visible}/${info.total}`;
  }

  /**
   * 面板**内容帧**的原生 handle（`0` = 面板还没建出来）。
   *
   * 消息那堆 `Text` 都是它的子级，所以「从光标底下的 frame 往上走」一定会在它这里
   * 撞上 —— `ChatBoxUI.isMouseOverPanel()` 拿它当祖先链的终点，判滚轮该归谁。
   * 只读 handle，不暴露 `Frame` 本身：外面没有理由去改这根帧。
   */
  public getContentFrameHandle(): number {
    if (!this.isCreated) {
      return 0;
    }
    try {
      const frame = this.panel.getContentFrame();
      return frame === null ? 0 : frame.handle;
    } catch (e) {
      return 0;
    }
  }

  /** 设置重排回调（每次可见窗口变化后调用）。用来同步面板右边缘的滑块把手 */
  public setOnLayoutChanged(callback: () => void): void {
    this.onLayoutChanged = callback;
  }

  private notifyLayoutChanged(): void {
    if (this.onLayoutChanged === null) {
      return;
    }
    try {
      this.onLayoutChanged();
    } catch (e) {
      // 回调方（滑块）出错不该把消息管线带崩
      log.error(`重排回调执行失败：${e}`);
    }
  }

  // ==================== 布局 ====================

  /**
   * 消息区的几何：一块矩形的左右上下四条边。
   *
   * 动态高度之后这里**不再算「能放几行」** —— 每条消息占多高由它自己的内容定，
   * 总高度得靠 `relayout()` 一条条累加才知道。这里只给出「装东西的那个盒子」。
   *
   * ⚠️ Y 轴朝下（`ORIGIN_TOP_LEFT`）：`bottom` 比 `top` **大**。
   */
  private computeArea(): {
    x: number;
    width: number;
    top: number;
    bottom: number;
    height: number;
  } {
    const contentPos = this.panel.getContentPosition();
    const contentSize = this.panel.getContentSize();

    const x = contentPos.x;
    const top = contentPos.y + this.insetTop;
    // 宽度下限用 `LINE_HEIGHT_PX` 而不是旧的 `messageHeight` —— 那个字段没了。
    // 它只是个兜底（面板被缩到 0 宽时不至于算出负数），正常路径走不到。
    const width = Math.max(LINE_HEIGHT_PX, contentSize.width - this.insetRight);
    // 高度下限用「一行 + 一个间距」：再挤也得放得下一条单行消息，否则整个面板空着。
    const height = Math.max(LINE_HEIGHT_PX, contentSize.height - this.insetTop);
    const bottom = top + height;

    return { x: x, width: width, top: top, bottom: bottom, height: height };
  }

  /**
   * 重排：算出谁该显示、显示在哪一行，然后落位。
   *
   * @param animate 新消息插入等「内容变化」传 `true`（走 0.2 秒上滑动画）；
   *                滚动 / 筛选传 `false`（瞬时落位，拖滑块要 1:1 跟手）
   * @param anchor  是否做「新消息进来时窗口不跳」的记账。**用户主动滚动时传 `false`**，
   *                否则刚滚到的位置会被新消息的条数又推走
   */
  private relayout(animate: boolean, anchor: boolean): void {
    if (!this.isCreated) {
      return;
    }

    const area = this.computeArea();

    // 过滤后的数组。顺序与 `this.messages` 一致（filter 保序），
    // 所以下面一遍扫描时可以用一个自增下标对齐。
    const filtered: MessageItem[] = [];
    for (const message of this.messages) {
      if (this.matchesFilter(message)) {
        filtered.push(message);
      }
    }
    const total = filtered.length;

    // ---- 滚动位置记账 ----
    // 尾部新增 k 条，就把「往回退的条数」也推 k 条 —— 窗口里显示的内容纹丝不动。
    // 淘汰时 delta 为负，自动抵消。贴着底部（offset = 0）时不用记账：那里恒等于最新。
    if (anchor && this.scrollOffset > 0) {
      this.scrollOffset += total - this.lastFilteredCount;
    }
    this.lastFilteredCount = total;

    // ---- maxOffset：滚到顶时看得到最早那几条 ----
    // offset 的单位是**条**。滚到最大时窗口是 `[0, end)`（从最早那条开始），
    // 所以取「`[0, end)` 全部放得下」的那个最大 end，反推 offset = total - end。
    // 每条高度不等，所以这里得**真的累加**，不能再拿 `总数 - 一屏条数` 估。
    let maxOffset = 0;
    let usedUp = 0;
    for (let i = 0; i < total; i++) {
      usedUp += (i > 0 ? this.messageSpacing : 0) + filtered[i].itemHeight;
      if (usedUp > area.height) {
        break;
      }
      maxOffset = total - 1 - i;
    }

    if (this.scrollOffset > maxOffset) {
      this.scrollOffset = maxOffset;
    }
    if (this.scrollOffset < 0) {
      this.scrollOffset = 0;
    }

    // 窗口是 `[start, end)`，`end` 是「最新一条的下一个」。
    // offset = 0 时 end = total，窗口贴着尾巴。
    const end = total - this.scrollOffset;

    // ---- 从最新一条往回填，累加到放不下为止 ----
    // `targetYs[k]` = 窗口里**距底第 k 条**的顶边 Y（k = 0 是最底下那条）。
    // 底对齐：最新一条贴着消息区底边，往上一条条摞。
    const targetYs: number[] = [];
    let filled = 0;
    for (let k = 0; k < end; k++) {
      const item = filtered[end - 1 - k];
      // 第一条不需要和谁拉开间距；之后每条都先让出一个 `messageSpacing`
      const gap = k > 0 ? this.messageSpacing : 0;
      if (filled + gap + item.itemHeight > area.height) {
        // 这条放不下了 —— 抬高它就是画到筛选条/面板外面去，宁可空着
        break;
      }
      filled += gap + item.itemHeight;
      targetYs.push(area.bottom - filled);
    }

    const start = end - targetYs.length;

    this.lastVisible = targetYs.length;
    this.lastMaxOffset = maxOffset;
    this.lastTotal = total;

    // ---- 落位 ----
    let filteredIndex = 0;
    let needAnimation = false;

    for (const message of this.messages) {
      if (!this.matchesFilter(message)) {
        this.setItemShown(message, false);
        continue;
      }

      const index = filteredIndex;
      filteredIndex++;

      if (index < start || index >= end) {
        this.setItemShown(message, false);
        continue;
      }

      const targetY = targetYs[end - 1 - index];

      // **只有刚刚由隐藏变可见的那条才不插值** —— 它的 currentY 还停在上一次可见时的
      // 位置上（可能隔着好几条），插值会从屏幕外滑进来。
      const wasShown = message.shown;
      if (message.layoutTo(area.x, targetY, area.width, message.itemHeight, animate && wasShown)) {
        needAnimation = true;
      }
      // 先落位再设可见 —— 反过来的话会有一帧停在旧坐标上
      this.setItemShown(message, true);
    }

    if (animate && needAnimation) {
      this.startPositionAnimation();
    }

    this.notifyLayoutChanged();
  }

  /** 这条消息是否通过「玩家可见 + 频道筛选」两道关 */
  private matchesFilter(message: MessageItem): boolean {
    if (!message.playerVisible) {
      return false;
    }
    if (this.filterTag !== null && message.tag !== this.filterTag) {
      return false;
    }
    return true;
  }

  /** 可见性**只在真的变了的时候**才写进 frame */
  private setItemShown(message: MessageItem, visible: boolean): void {
    if (message.shown === visible) {
      return;
    }
    message.shown = visible;
    message.textComponent.setVisible(visible);
  }

  // ==================== 动画 ====================

  /**
   * 开始位置动画（新消息插入时的上滑）
   */
  private startPositionAnimation(): void {
    if (this.isAnimating) return;

    this.isAnimating = true;
    this.animationProgress = 0;
    const interval = 0.01; // 10ms
    const totalSteps = Math.ceil(this.slideAnimationDuration / interval);

    if (this.animationTimer) {
      PauseTimer(this.animationTimer);
      DestroyTimer(this.animationTimer);
    }

    this.animationTimer = CreateTimer();
    TimerStart(this.animationTimer, interval, true, () => {
      this.animationProgress += 1 / totalSteps;

      if (this.animationProgress >= 1.0) {
        this.animationProgress = 1.0;
        this.finishPositionAnimation();
        this.isAnimating = false;
        if (this.animationTimer) {
          PauseTimer(this.animationTimer);
          DestroyTimer(this.animationTimer);
          this.animationTimer = null;
        }
        return;
      }

      // 只有当前可见的消息需要推进（不可见的那些 currentY 已经对齐了目标）
      for (const message of this.messages) {
        if (message.shown) {
          message.animateStep(this.animationProgress);
        }
      }
    });
  }

  /**
   * 完成位置动画：精确落到目标上，不留半像素
   */
  private finishPositionAnimation(): void {
    for (const message of this.messages) {
      if (message.shown) {
        message.finishAnimation();
      }
    }
  }

  /** 掐掉进行中的上滑动画。拖动滑块时用 —— 动画和「1:1 跟手」是互斥的 */
  private stopPositionAnimation(): void {
    if (this.animationTimer) {
      PauseTimer(this.animationTimer);
      DestroyTimer(this.animationTimer);
      this.animationTimer = null;
    }
    this.isAnimating = false;
  }

  // ==================== 位置 / 尺寸 / 可见性 ====================

  /**
   * 设置位置
   */
  public setPosition(x: number, y: number): MessageList {
    this.pixelX = x;
    this.pixelY = y;
    this.panel.setPosition(x, y);
    this.relayout(true, true);
    return this;
  }

  /**
   * 整块横向平移 —— 聊天面板的「收起 / 展开」用它，不动 Y。
   *
   * `offsetX` 是**相对**的：0 = 停在 `setPosition()` 给的那个位置，
   * 正数 = 整体向左挪。`this.pixelX`（这个「家」的位置）**不会被改写**，
   * 所以来回滑动不会越滑越偏。
   *
   * ⚠️ **不能只挪 `panel`**。消息的 `Text` 是用**绝对屏幕坐标**（`setAbsPoint`）
   * 锚定的，父节点移动**不会**带着它们走，必须逐个搬 X。
   *
   * ⚠️ 这里**故意不走 `relayout()`** —— 那条路末尾会调 `startPositionAnimation()`
   * 或者重排全部 250 条，而收起动画是 50Hz 逐帧调用的。
   * 而且此刻要改的只有 X，Y 一点没动。
   *
   * ⚠️ 全程走 **Unclamped** 那条：`pixelToWC3` 会把坐标钳进屏幕内，
   * 而这里的 `offsetX` 最大能到 `面板左边界 + 宽度`，算出来是**负的** ——
   * 一钳就全停在 x = 0，面板画面上纹丝不动，只有「看不见」是真的。
   */
  public setSlideOffset(offsetX: number): MessageList {
    this.panel.setPositionUnclamped(this.pixelX - offsetX, this.pixelY);

    // contentPosition 是从 panel.pixelX 推出来的，所以它已经含了偏移量
    const messageX = this.panel.getContentPosition().x;
    for (const message of this.messages) {
      // 不可见的那些不用搬 —— 等它真的变可见时，`layoutTo` 会按当时的 `area.x` 落位
      if (message.shown) {
        message.slideTo(messageX);
      }
    }
    return this;
  }

  /**
   * 获取位置
   */
  public getPosition(): { x: number; y: number } {
    return { x: this.pixelX, y: this.pixelY };
  }

  /**
   * 设置大小
   */
  public setSize(width: number, height: number): MessageList {
    this.pixelWidth = width;
    this.pixelHeight = height;
    this.panel.setSize(width, height);
    this.relayout(true, true);
    return this;
  }

  /**
   * 获取大小
   */
  public getSize(): { width: number; height: number } {
    return { width: this.pixelWidth, height: this.pixelHeight };
  }

  /**
   * 设置可见性
   */
  public setVisible(visible: boolean): MessageList {
    this.panel.setVisible(visible);
    // ⚠️ `Panel.setVisible` **只管它自己那张 backdrop**，碰都不碰 `contentFrame`，
    // 而消息全都挂在 `contentFrame` 下 —— 不跟着一起藏的话，收起面板会变成
    // 「底板没了、字还浮在屏幕上」。
    const contentFrame = this.panel.getContentFrame();
    if (contentFrame) {
      contentFrame.setVisible(visible);
    }
    return this;
  }

  /**
   * 获取可见性
   */
  public getVisible(): boolean {
    return this.panel.getVisible();
  }

  /**
   * 显示
   */
  public show(): MessageList {
    return this.setVisible(true);
  }

  /**
   * 隐藏
   */
  public hide(): MessageList {
    return this.setVisible(false);
  }

  /**
   * 获取消息数量（**全部**，不受筛选影响）
   */
  public getMessageCount(): number {
    return this.messages.length;
  }

  /**
   * 销毁组件
   */
  public destroy(): void {
    this.stopPositionAnimation();

    // 清理所有消息（这会销毁每个消息的 Text 组件）
    this.clear();

    // 销毁Panel
    if (this.panel !== null) {
      this.panel.destroy();
    }

    this.isCreated = false;
  }

  /**
   * 重置单例（用于重新创建）
   */
  public static resetInstance(): void {
    if (MessageList.instance) {
      MessageList.instance.destroy();
      MessageList.instance = null;
    }
  }
}
