/**
 * UI v1.6（Hive Workshop，chopinski / Tasyen）—— **v3 变体**的坐标表。
 *
 * 数据逐条取自源实现
 * `dev_lib/w3x2lni/script/luav3/map/war3map.lua`（`mt:onCommandButtons` /
 * `mt:onInventoryButtons` / `mt:onInfoPanel` / `mt:onPortrait` / `onInit`），
 * **数值一律照抄，不做任何"美化"或对齐调整** —— 这样视觉上对不上时，
 * 可以确定是 API 语义差异而不是我改错了数字。
 *
 * 坐标空间：WC3 的屏幕归一化坐标，**x ∈ [0, 0.8]、y ∈ [0, 0.6]**（注意不是 0..1）。
 * 左下角是 (0,0)，y 增大向上。源实现里 `FRAMEPOINT_TOPLEFT` 配 `FRAMEPOINT_BOTTOMRIGHT`
 * 两个对角点来确定矩形。
 */

import { FourCC } from "src/utils/helper";

/** 矩形：[左上角 x, 左上角 y, 右下角 x, 右下角 y] */
export type Rect = [x1: number, y1: number, x2: number, y2: number];

/**
 * 「把它藏起来」用的缩放值。
 *
 * 源实现隐藏原生文本框的手段就是缩到极小 —— 不能用 0：
 * `DzFrameSetScale(f, 0)` 以及由它派生的字号 0 会让游戏闪退
 * （血条那边刚踩过，见 `UnitBlood` 的 `SCALE_MIN`）。
 */
export const HIDE_SCALE = 0.00001;

/** 「挪到屏幕外」的哨兵坐标，源实现里对不需要显示的命令卡按钮写 999.0 */
export const OFFSCREEN = 999.0;

// ---------------------------------------------------------------------------
// 命令卡（12 格）
// ---------------------------------------------------------------------------

/** 命令卡按钮的常规缩放。第 7 号（"+"）单独用了另一个值，见 COMMAND_BUTTON_SCALES */
export const COMMAND_BUTTON_SCALE = 0.8205;

/** 每个按钮的缩放；只有 7 号不同，其余都用 COMMAND_BUTTON_SCALE */
export const COMMAND_BUTTON_SCALES: number[] = [
  COMMAND_BUTTON_SCALE, // 0  Move
  COMMAND_BUTTON_SCALE, // 1  Stop
  COMMAND_BUTTON_SCALE, // 2  Hold
  COMMAND_BUTTON_SCALE, // 3  Attack
  COMMAND_BUTTON_SCALE, // 4  Patrol
  COMMAND_BUTTON_SCALE, // 5  D
  COMMAND_BUTTON_SCALE, // 6  F
  0.5923,               // 7  +（源实现里单独写的 0.5923）
  COMMAND_BUTTON_SCALE, // 8  Q
  COMMAND_BUTTON_SCALE, // 9  W
  COMMAND_BUTTON_SCALE, // 10 E
  COMMAND_BUTTON_SCALE, // 11 R
];

/**
 * 常规状态：前 5 个按钮（移动/停止/驻守/攻击/巡逻）挪到屏幕外，
 * 只留 7 个技能位排在底部一条线上。
 */
export const COMMAND_BUTTONS_NORMAL: Rect[] = [
  [OFFSCREEN, OFFSCREEN, OFFSCREEN, OFFSCREEN], // 0
  [OFFSCREEN, OFFSCREEN, OFFSCREEN, OFFSCREEN], // 1
  [OFFSCREEN, OFFSCREEN, OFFSCREEN, OFFSCREEN], // 2
  [OFFSCREEN, OFFSCREEN, OFFSCREEN, OFFSCREEN], // 3
  [OFFSCREEN, OFFSCREEN, OFFSCREEN, OFFSCREEN], // 4
  [0.286200, 0.0461300, 0.318200, 0.0141300],   // 5
  [0.324000, 0.0461300, 0.356000, 0.0141300],   // 6
  [0.360510, 0.0490700, 0.380910, 0.0286700],   // 7
  [0.135000, 0.0461300, 0.167000, 0.0141300],   // 8
  [0.173050, 0.0461300, 0.205050, 0.0141300],   // 9
  [0.210600, 0.0461300, 0.242600, 0.0141300],   // 10
  [0.248400, 0.0461300, 0.280400, 0.0141300],   // 11
];

/** 商店状态：12 格 3×4 网格全部显示在左上方 */
export const COMMAND_BUTTONS_SHOP: Rect[] = [
  [0.333500, 0.213950, 0.366760, 0.180700], // 0
  [0.370500, 0.213950, 0.403760, 0.180700], // 1
  [0.407400, 0.213650, 0.440660, 0.180400], // 2
  [0.444400, 0.213650, 0.477660, 0.180400], // 3
  [0.333500, 0.175250, 0.366760, 0.142000], // 4
  [0.370500, 0.175250, 0.403760, 0.142000], // 5
  [0.407400, 0.175250, 0.440660, 0.142000], // 6
  [0.444400, 0.175250, 0.477660, 0.142000], // 7
  [0.333500, 0.136850, 0.366760, 0.103600], // 8
  [0.370500, 0.136850, 0.403760, 0.103600], // 9
  [0.407400, 0.136850, 0.440660, 0.103600], // 10
  [0.444400, 0.136850, 0.477660, 0.103600], // 11
];

// ---------------------------------------------------------------------------
// 物品栏（6 格）
// ---------------------------------------------------------------------------

export const INVENTORY_BUTTON_RECTS: Rect[] = [
  [0.443500, 0.0461300, 0.475500, 0.0141300], // 0
  [0.481100, 0.0461300, 0.513100, 0.0141300], // 1
  [0.518700, 0.0461300, 0.550700, 0.0141300], // 2
  [0.556500, 0.0461300, 0.588500, 0.0141300], // 3
  [0.594300, 0.0461300, 0.626300, 0.0141300], // 4
  [0.632100, 0.0461300, 0.664100, 0.0141300], // 5
];

/** 物品栏按钮的尺寸（源实现除了两个对角点，还额外写了一次 SetSize） */
export const INVENTORY_BUTTON_SIZE: [width: number, height: number] = [0.032, 0.032];

// ---------------------------------------------------------------------------
// 信息面板（buff 条 / 三围 / 经验条 / 攻防块）
// ---------------------------------------------------------------------------

export const BUFF_BAR_RECT: Rect = [0.359120, 0.115000, 0.482620, 0.100000];

export const HERO_MAIN_STAT_RECT: Rect = [0.422900, 0.0284300, 0.439600, 0.0117300];
export const HERO_STRENGTH_VALUE_RECT: Rect = [0.466810, 0.0867600, 0.541350, 0.0736400];
export const HERO_AGILITY_VALUE_RECT: Rect = [0.541900, 0.0867600, 0.610880, 0.0736400];
export const HERO_INTELLECT_VALUE_RECT: Rect = [0.611490, 0.0867600, 0.667120, 0.0736400];

/**
 * 三条进度条共用的位置：计时生命（SimpleProgressIndicator）、
 * 英雄经验（SimpleHeroLevelBar）、建造进度（SimpleBuildTimeIndicator）。
 */
export const PROGRESS_BAR_RECT: Rect = [0.133280, 0.0105000, 0.667280, 0.000500000];

export const ATTACK_BACKDROP_RECT: Rect = [0.136230, 0.0951800, 0.160340, 0.0710700];
export const ATTACK_VALUE_RECT: Rect = [0.160340, 0.0867600, 0.247120, 0.0736400];
export const ARMOR_BACKDROP_RECT: Rect = [0.247020, 0.0951800, 0.271130, 0.0710700];
export const ARMOR_VALUE_RECT: Rect = [0.271990, 0.0867600, 0.358770, 0.0736400];

/** 攻/防图标块的尺寸（同样是源实现额外写的那次 SetSize） */
export const INFO_ICON_BACKDROP_SIZE: [width: number, height: number] = [0.018, 0.018];

// ---------------------------------------------------------------------------
// 头像 / 控制台
// ---------------------------------------------------------------------------

export const PORTRAIT_RECT: Rect = [0.370500, 0.0977600, 0.429450, 0.0284500];

/** ConsoleUI 只设了左上角一个点（源实现没给右下角） */
export const CONSOLE_UI_TOPLEFT: [x: number, y: number] = [0.0, 0.633];

/** 鼠标悬停提示框，只设右下角一个点 */
export const UBERTOOLTIP_BOTTOMRIGHT: [x: number, y: number] = [0.8, 0.165];

// ---------------------------------------------------------------------------
// 自建 frame
// ---------------------------------------------------------------------------

/** 主底板，贴 UI.blp */
export const UI_BACKDROP_RECT: Rect = [0.132400, 0.0991800, 0.667380, 0.00000];

/** 商店 12 格底图，贴 12Slot.blp */
export const SHOP_SLOTS_RECT: Rect = [0.330600, 0.216500, 0.478600, 0.100700];

export const HEALTH_BAR_RECT: Rect = [0.134950, 0.0678600, 0.359120, 0.0486800];
export const MANA_BAR_RECT: Rect = [0.440380, 0.0678600, 0.664550, 0.0486800];

/** 血/蓝数值文本。与条形框几乎重合，源实现里差了 0.00002 */
export const HP_TEXT_RECT: Rect = [0.134950, 0.0678800, 0.359120, 0.0487000];
export const MP_TEXT_RECT: Rect = [0.440880, 0.0678800, 0.665050, 0.0487000];

export const GOLD_TEXT_RECT: Rect = [0.377110, 0.0266100, 0.423110, 0.0132600];
export const GOLD_ICON_RECT: Rect = [0.359900, 0.0284300, 0.376600, 0.0117300];

// ---------------------------------------------------------------------------
// 阶段 4（复选框）预留 —— 现在不用，先把坐标留在这里
// ---------------------------------------------------------------------------

export const HERO_CHECK_RECT: Rect = [-0.131300, 0.600240, -0.117260, 0.586200];
export const CHECK_BL_RECT: Rect = [0.122370, 0.0100000, 0.132370, 0.00000];
export const CHECK_BR_RECT: Rect = [0.667350, 0.0100000, 0.677350, 0.00000];
export const MENU_CHECK_RECT: Rect = [0.918800, 0.601640, 0.932840, 0.587600];

// ---------------------------------------------------------------------------
// 资源路径
// ---------------------------------------------------------------------------

/** 主底板贴图。已在 maps/table/imp.ini 注册 */
export const UI_TEXTURE = "UI.blp";
/** 商店 12 格底图 */
export const SHOP_SLOTS_TEXTURE = "12Slot.blp";

/**
 * 血条/蓝条贴图。
 *
 * 源实现用的是 `ReplaceableTextures\TeamColor\TeamColor00` / `TeamColor01`
 * （红 / 蓝），在 Reforged 上能出正确颜色。**1.27a 上不行** —— `ReplaceableTextures\`
 * 这个命名空间是「可替换贴图」，引擎会按**本地玩家队伍色**整体替换掉具体文件，
 * 所以两条请求了不同的文件却渲染成同一种颜色（实测两条都是绿的，与本地玩家队伍色一致）。
 *
 * 因此改成自带两张**纯色** BLP（非 ReplaceableTextures 命名空间，不受队伍色替换影响）：
 * 血条 rgb(255,20,20)、蓝条 rgb(40,90,255)，64x16。
 * 源图由 `scripts/convert-blp.ts` 生成并已登记进 `maps/table/imp.ini`。
 *
 * ⚠️ **蓝条的文件名从 `mana.blp` 改成 `blue.blp`**（2026-10-04 下午）。
 *
 * 症状：两条 frame 的创建/摆位/贴图代码一模一样，血条渲染出的是自带红图，
 * 蓝条却渲染成**队伍色绿**（截图逐像素量过：两条条的 y 区间和宽度完全相同，
 * 都在各自 RECT 上 —— 所以绿色的确是**我们自己的 mana frame**，不是原生条盖上去的），
 * 且从 `dist/map.wx3` 里解出来的 `mana.blp` 与工程内源文件**字节一致、解码就是蓝色**。
 * 也就是说：文件在包里、内容对、Lua 里的路径对，唯独引擎没取到它。
 *
 * 血条在同一个目录、同样的头、同样的格式下能取到，**唯一差别就是文件名**。
 * 最可能的原因是 MPQ 名字哈希冲突/旧构建留下的同名条目：游戏按名字查表时拿到的
 * 是另一条（空/失效）block，于是回退成队伍色贴图。改名等于换一个全新的哈希位置，
 * 是**一个变量**的最小验证。若改名后仍为绿，则说明是别的东西在改这个 frame。
 */
export const HEALTH_BAR_TEXTURE = "Texture\\ui\\bars\\health.blp";
export const MANA_BAR_TEXTURE = "Texture\\ui\\bars\\blue.blp";

// ---------------------------------------------------------------------------
// 行为参数
// ---------------------------------------------------------------------------

/** 资源（金币）刷新周期，源实现在 1142 行用 0.2s 的计时器 */
export const RESOURCE_UPDATE_PERIOD = 0.2;

/** 血/蓝条刷新周期，源实现在 1041 行用 0.05s 的计时器 */
export const STATUS_UPDATE_PERIOD = 0.05;

/**
 * 判断"这是不是一个商店单位"，用到的技能四字母 ID。
 * 对应源实现里的 `FourCC('Aneu') / FourCC('Ane2') / FourCC('Apit')`
 * （选单位 / 选英雄 / 购买物品）。
 */
export const SHOP_ABILITY_IDS: number[] = [
  FourCC("Aneu"),
  FourCC("Ane2"),
  FourCC("Apit"),
];
