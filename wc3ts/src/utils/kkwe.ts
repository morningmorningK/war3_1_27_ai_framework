/* eslint-disable camelcase, @typescript-eslint/naming-convention, prefer-template, prefer-const, import/no-mutable-exports */

export function DzSetHeroTypeProperName(uid: number, name: string): void {
  EXSetUnitArrayString(uid, 61, 0, name);
  EXSetUnitInteger(uid, 61, 1);
}

/**
 * 设置单位类型名称
 * 设置单位类型ID${单位ID}的名称为${名称}
 * 修改单位类型的显示名称
 */
export function DzSetUnitTypeName(uid: number, name: string): void {
  EXSetUnitArrayString(uid, 10, 0, name);
  EXSetUnitInteger(uid, 10, 1);
}

/**
 * 判断单位攻击类型
 * 判断${单位}的第${索引}个攻击是否为${攻击类型}
 * 检查单位指定索引的攻击类型
 */
export function DzIsUnitAttackType(
  whichUnit: unit,
  index: number,
  attackType: attacktype
): boolean {
  return (
    ConvertAttackType(Math.floor(GetUnitState(whichUnit, ConvertUnitState(16 + 19 * index)))) ===
    attackType
  );
}

/**
 * 设置单位攻击类型
 * 设置${单位}的第${索引}个攻击类型为${攻击类型}
 * 修改单位指定索引的攻击类型
 */
export function DzSetUnitAttackType(whichUnit: unit, index: number, attackType: attacktype): void {
  SetUnitState(whichUnit, ConvertUnitState(16 + 19 * index), GetHandleId(attackType));
}

/**
 * 判断单位防御类型
 * 判断${单位}的防御类型是否为${防御类型}
 * 检查单位的防御类型
 */
export function DzIsUnitDefenseType(whichUnit: unit, defenseType: number): boolean {
  return Math.floor(GetUnitState(whichUnit, ConvertUnitState(0x50))) === defenseType;
}

/**
 * 设置单位防御类型
 * 设置${单位}的防御类型为${防御类型}
 * 修改单位的防御类型
 */
export function DzSetUnitDefenseType(whichUnit: unit, defenseType: number): void {
  SetUnitState(whichUnit, ConvertUnitState(0x50), defenseType);
}

// ============= KKWE 单位数据缓存函数 =============

/**
 * 设置单位数据缓存整数 - 简化版
 * 设置单位ID${单位ID}的数据ID${数据ID}值为${值}
 * 简化版的单位数据缓存设置函数，索引固定为0
 */
export function KKWESetUnitDataCacheInteger(uid: number, id: number, v: number): void {
  DzSetUnitDataCacheInteger(uid, id, 0, v);
}

/**
 * 单位UI添加升级IDs
 * 为单位ID${单位ID}在索引${索引}添加升级ID${值}
 * 向单位的升级列表添加新的升级ID
 */
export function KKWEUnitUIAddUpgradesIds(uid: number, id: number, v: number): void {
  DzUnitUIAddLevelArrayInteger(uid, 94, id, v);
}

/**
 * 单位UI添加建造IDs
 * 为单位ID${单位ID}在索引${索引}添加建造ID${值}
 * 向单位的建造列表添加新的建造ID
 */
export function KKWEUnitUIAddBuildsIds(uid: number, id: number, v: number): void {
  DzUnitUIAddLevelArrayInteger(uid, 100, id, v);
}

/**
 * 单位UI添加研究IDs
 * 为单位ID${单位ID}在索引${索引}添加研究ID${值}
 * 向单位的研究列表添加新的研究ID
 */
export function KKWEUnitUIAddResearchesIds(uid: number, id: number, v: number): void {
  DzUnitUIAddLevelArrayInteger(uid, 112, id, v);
}

/**
 * 单位UI添加训练IDs
 * 为单位ID${单位ID}在索引${索引}添加训练ID${值}
 * 向单位的训练列表添加新的训练ID
 */
export function KKWEUnitUIAddTrainsIds(uid: number, id: number, v: number): void {
  DzUnitUIAddLevelArrayInteger(uid, 106, id, v);
}

/**
 * 单位UI添加出售单位IDs
 * 为单位ID${单位ID}在索引${索引}添加出售单位ID${值}
 * 向单位的出售单位列表添加新的单位ID
 */
export function KKWEUnitUIAddSellsUnitIds(uid: number, id: number, v: number): void {
  DzUnitUIAddLevelArrayInteger(uid, 118, id, v);
}

/**
 * 单位UI添加出售物品IDs
 * 为单位ID${单位ID}在索引${索引}添加出售物品ID${值}
 * 向单位的出售物品列表添加新的物品ID
 */
export function KKWEUnitUIAddSellsItemIds(uid: number, id: number, v: number): void {
  DzUnitUIAddLevelArrayInteger(uid, 124, id, v);
}

/**
 * 单位UI添加制造物品IDs
 * 为单位ID${单位ID}在索引${索引}添加制造物品ID${值}
 * 向单位的制造物品列表添加新的物品ID
 */
export function KKWEUnitUIAddMakesItemIds(uid: number, id: number, v: number): void {
  DzUnitUIAddLevelArrayInteger(uid, 130, id, v);
}

/**
 * 单位UI添加需求单位代码
 * 为单位ID${单位ID}在索引${索引}添加需求单位代码${值}
 * 向单位的需求列表添加新的单位代码
 */
export function KKWEUnitUIAddRequiresUnitCode(uid: number, id: number, v: number): void {
  DzUnitUIAddLevelArrayInteger(uid, 166, id, v);
}

/**
 * 单位UI添加需求科技代码
 * 为单位ID${单位ID}在索引${索引}添加需求科技代码${值}
 * 向单位的需求列表添加新的科技代码
 */
export function KKWEUnitUIAddRequiresTechcode(uid: number, id: number, v: number): void {
  DzUnitUIAddLevelArrayInteger(uid, 166, id, v);
}

/**
 * 单位UI添加需求数量
 * 为单位ID${单位ID}在索引${索引}添加需求数量${值}
 * 向单位的需求数量列表添加新的数量值
 */
export function KKWEUnitUIAddRequiresAmounts(uid: number, id: number, v: number): void {
  DzUnitUIAddLevelArrayInteger(uid, 172, id, v);
}

// ============= 时间和日期处理函数 =============

/**
 * 判断是否为闰年
 * 判断年份${年份}是否为闰年
 * 根据闰年规则判断指定年份是否为闰年
 */
export function DzIsLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * 从时间戳获取时间日期字符串（内部实现）
 * 从时间戳${时间戳}获取时间日期字符串
 * 将UNIX时间戳转换为可读的日期时间字符串
 */
export function DzGetTimeDateFromTimestamp(timestamp: number): string {
  const totalSeconds = timestamp + 28800; // 北京时间偏移
  const secondsInDay = 86400;
  const remainingSeconds = totalSeconds % secondsInDay;
  let year = 1970;
  const totalDays = Math.floor((totalSeconds + 86399) / secondsInDay);
  let num = 0;
  let month = 0;
  let days = 0;

  // 计算年份
  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (DzIsLeapYear(year)) {
      num += 366;
    } else {
      num += 365;
    }
    if (num > totalDays) {
      break;
    }
    days = num;
    year += 1;
  }

  // 计算月份和日期
  month = 1;
  num = 0;
  days = totalDays - days;

  const monthDays = DzIsLeapYear(year)
    ? [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    : [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

  for (let i = 0; i < 12; i++) {
    if (num + monthDays[i] >= days) {
      break;
    }
    num += monthDays[i];
    month += 1;
  }

  const day = days - num || 1;
  const hour = Math.floor(remainingSeconds / 3600);
  const minute = Math.floor((remainingSeconds % 3600) / 60);
  const second = remainingSeconds % 60;

  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

// 创建一个简单的缓存对象
const timestampCache = new Map<number, { year: number; month: number; day: number; str: string }>();

/**
 * 从时间戳获取时间日期字符串（缓存版）
 * 从时间戳${时间戳}获取时间日期字符串
 * 带缓存的时间戳转换函数，提高性能
 */
export function KKAPIGetTimeDateFromTimestamp(timestamp: number): string {
  timestamp = Math.max(timestamp, 0);
  const cached = timestampCache.get(timestamp);
  if (cached) {
    return cached.str;
  }
  const str = DzGetTimeDateFromTimestamp(timestamp);
  const parts = str.split(" ")[0].split("-");
  timestampCache.set(timestamp, {
    year: parseInt(parts[0], 10),
    month: parseInt(parts[1], 10),
    day: parseInt(parts[2], 10),
    str,
  });
  return str;
}

/**
 * 从时间戳获取年份
 * 从时间戳${时间戳}获取年份
 * 从UNIX时间戳中提取年份信息
 */
export function KKAPIGetTimestampYear(timestamp: number): number {
  timestamp = Math.max(timestamp, 0);
  // 这里可以实现缓存逻辑，但为了简化，直接解析
  const date = new Date(timestamp * 1000);
  return date.getFullYear();
}

/**
 * 从时间戳获取月份
 * 从时间戳${时间戳}获取月份
 * 从UNIX时间戳中提取月份信息
 */
export function KKAPIGetTimestampMonth(timestamp: number): number {
  timestamp = Math.max(timestamp, 0);
  const date = new Date(timestamp * 1000);
  return date.getMonth() + 1; // JavaScript月份从0开始，需要+1
}

/**
 * 从时间戳获取日期
 * 从时间戳${时间戳}获取日期
 * 从UNIX时间戳中提取日期信息
 */
export function KKAPIGetTimestampDay(timestamp: number): number {
  timestamp = Math.max(timestamp, 0);
  const date = new Date(timestamp * 1000);
  return date.getDate();
}

// ============= 转换函数 =============

/**
 * 整数转技能ID
 * 将整数${整数}转换为技能ID
 * 简单的类型转换函数
 */
export function KKConvertInt2AbilId(i: number): number {
  return i;
}

/**
 * 技能ID转整数
 * 将技能ID${技能ID}转换为整数
 * 简单的类型转换函数
 */
export function KKConvertAbilId2Int(i: number): number {
  return i;
}

/**
 * 整数转颜色
 * 将整数${整数}转换为颜色
 * 简单的类型转换函数
 */
export function KKConvertInt2Color(i: number): number {
  return i;
}

/**
 * 颜色转整数
 * 将颜色${颜色}转换为整数
 * 简单的类型转换函数
 */
export function KKConvertColor2Int(i: number): number {
  return i;
}

// ============= 防御类型常量 =============

/**
 * 防御类型：小型
 */
export const DEFENSE_TYPE_SMALL = 0;

/**
 * 防御类型：中型
 */
export const DEFENSE_TYPE_MEDIUM = 1;

/**
 * 防御类型：大型
 */
export const DEFENSE_TYPE_LARGE = 2;

/**
 * 防御类型：要塞
 */
export const DEFENSE_TYPE_FORT = 3;

/**
 * 防御类型：普通
 */
export const DEFENSE_TYPE_NORMAL = 4;

/**
 * 防御类型：英雄
 */
export const DEFENSE_TYPE_HERO = 5;

/**
 * 防御类型：神圣
 */
export const DEFENSE_TYPE_DIVINE = 6;

/**
 * 防御类型：无
 */
export const DEFENSE_TYPE_NONE = 7;

// ============= DzAPI 请求封装（对应 kkwe/DzAPI.j） =============
/* eslint-disable @typescript-eslint/naming-convention */

/**
 * 保存服务器数值
 * 保存${玩家}的服务器数值${键名}为${数值}
 * 本质调用 RequestExtraBooleanData(4, ...)
 */
export function DzAPI_Map_SaveServerValue(
  whichPlayer: player,
  key: string,
  value: string
): boolean {
  return RequestExtraBooleanData(4, whichPlayer, key, value, false, 0, 0, 0);
}

/**
 * 读取服务器数值
 * 读取${玩家}的服务器数值${键名}
 */
export function DzAPI_Map_GetServerValue(whichPlayer: player, key: string): string {
  return RequestExtraStringData(5, whichPlayer, key, null as any, false, 0, 0, 0);
}

/**
 * 获取游戏开始时间
 * 返回服务器记录的游戏开始时间戳
 */
export function DzAPI_Map_GetGameStartTime(): number {
  return RequestExtraIntegerData(11, null as any, null as any, null as any, false, 0, 0, 0);
}

/**
 * 是否为RPG天梯
 * 判断当前是否为RPG天梯模式
 */
export function DzAPI_Map_IsRPGLadder(): boolean {
  return RequestExtraBooleanData(12, null as any, null as any, null as any, false, 0, 0, 0);
}

/**
 * 获取匹配类型
 * 返回当前匹配模式类型
 */
export function DzAPI_Map_GetMatchType(): number {
  return RequestExtraIntegerData(13, null as any, null as any, null as any, false, 0, 0, 0);
}

/**
 * 设置统计数据
 * 统计-提交地图数据
 */
export function DzAPI_Map_Stat_SetStat(whichPlayer: player, key: string, value: string): void {
  RequestExtraIntegerData(7, whichPlayer, key, value, false, 0, 0, 0);
}

/**
 * 设置天梯统计
 * 天梯-统计数据
 */
export function DzAPI_Map_Ladder_SetStat(whichPlayer: player, key: string, value: string): void {
  RequestExtraIntegerData(8, whichPlayer, key, value, false, 0, 0, 0);
}

/**
 * 设置玩家天梯统计
 * 天梯-统计玩家数据
 */
export function DzAPI_Map_Ladder_SetPlayerStat(
  whichPlayer: player,
  key: string,
  value: string
): void {
  RequestExtraIntegerData(9, whichPlayer, key, value, false, 0, 0, 0);
}

/**
 * 获取服务器数值错误码
 * 读取加载服务器存档时的错误码
 */
export function DzAPI_Map_GetServerValueErrorCode(whichPlayer: player): number {
  return RequestExtraIntegerData(6, whichPlayer, null as any, null as any, false, 0, 0, 0);
}

/**
 * 获取天梯等级
 * 提供给地图的接口，用于取天梯等级
 */
export function DzAPI_Map_GetLadderLevel(whichPlayer: player): number {
  return RequestExtraIntegerData(14, whichPlayer, null as any, null as any, false, 0, 0, 0);
}

/**
 * 玩家身份类型
 * dataType=92 的通用身份判断封装
 */
export function KKApiPlayerIdentityType(whichPlayer: player, id: number): boolean {
  return RequestExtraBooleanData(92, whichPlayer, null as any, null as any, false, id, 0, 0);
}

/**
 * 是否为红钻VIP
 */
export function DzAPI_Map_IsRedVIP(whichPlayer: player): boolean {
  return KKApiPlayerIdentityType(whichPlayer, 4);
}

/**
 * 是否为蓝钻VIP
 */
export function DzAPI_Map_IsBlueVIP(whichPlayer: player): boolean {
  return KKApiPlayerIdentityType(whichPlayer, 3);
}

/**
 * 获取天梯排名
 */
export function DzAPI_Map_GetLadderRank(whichPlayer: player): number {
  return RequestExtraIntegerData(17, whichPlayer, null as any, null as any, false, 0, 0, 0);
}

/**
 * 获取地图等级排名
 */
export function DzAPI_Map_GetMapLevelRank(whichPlayer: player): number {
  return RequestExtraIntegerData(18, whichPlayer, null as any, null as any, false, 0, 0, 0);
}

/**
 * 获取公会职责
 * Member=10 Admin=20 Leader=30
 */
export function DzAPI_Map_GetGuildRole(whichPlayer: player): number {
  return RequestExtraIntegerData(20, whichPlayer, null as any, null as any, false, 0, 0, 0);
}

/**
 * 是否为RPG大厅
 */
export function DzAPI_Map_IsRPGLobby(): boolean {
  return RequestExtraBooleanData(10, null as any, null as any, null as any, false, 0, 0, 0);
}

/**
 * 任务完成
 * 用作完成某个任务，发奖励
 */
export function DzAPI_Map_MissionComplete(whichPlayer: player, key: string, value: string): void {
  RequestExtraIntegerData(1, whichPlayer, key, value, false, 0, 0, 0);
}

/**
 * 获取活动数据
 * 提供给地图的接口，用作取服务器上的活动数据
 */
export function DzAPI_Map_GetActivityData(): string {
  return RequestExtraStringData(2, null as any, null as any, null as any, false, 0, 0, 0);
}

/**
 * 获取地图配置
 * 根据 key 读取地图配置
 */
export function DzAPI_Map_GetMapConfig(key: string): string {
  return RequestExtraStringData(21, null as any, key, null as any, false, 0, 0, 0);
}

/**
 * 保存公共存档
 */
export function DzAPI_Map_SavePublicArchive(
  whichPlayer: player,
  key: string,
  value: string
): boolean {
  return RequestExtraBooleanData(31, whichPlayer, key, value, false, 0, 0, 0);
}

/**
 * 获取公共存档
 */
export function DzAPI_Map_GetPublicArchive(whichPlayer: player, key: string): string {
  return RequestExtraStringData(32, whichPlayer, key, null as any, false, 0, 0, 0);
}

/**
 * 使用消耗品
 */
export function DzAPI_Map_UseConsumablesItem(whichPlayer: player, key: string): void {
  RequestExtraIntegerData(33, whichPlayer, key, null as any, false, 0, 0, 0);
}

/**
 * ORPG触发器
 * 触发boss击杀等事件
 */
export function DzAPI_Map_OrpgTrigger(whichPlayer: player, key: string): void {
  RequestExtraIntegerData(28, whichPlayer, key, null as any, false, 0, 0, 0);
}

/**
 * 获取服务器掉落数据
 */
export function DzAPI_Map_GetServerArchiveDrop(whichPlayer: player, key: string): string {
  return RequestExtraStringData(27, whichPlayer, key, null as any, false, 0, 0, 0);
}

/**
 * 获取服务器装备数据
 */
export function DzAPI_Map_GetServerArchiveEquip(whichPlayer: player, key: string): number {
  return RequestExtraIntegerData(26, whichPlayer, key, null as any, false, 0, 0, 0);
}

/**
 * 获取平台VIP等级
 */
export function DzAPI_Map_GetPlatformVIP(whichPlayer: player): number {
  return RequestExtraIntegerData(30, whichPlayer, null as any, null as any, false, 0, 0, 0);
}

/**
 * 是否为平台VIP
 */
export function DzAPI_Map_IsPlatformVIP(whichPlayer: player): boolean {
  return DzAPI_Map_GetPlatformVIP(whichPlayer) > 0;
}

/**
 * 读取本地全局字符串存档
 */
export function DzAPI_Map_Global_GetStoreString(key: string): string {
  return RequestExtraStringData(36, GetLocalPlayer(), key, null as any, false, 0, 0, 0);
}

/**
 * 保存本地全局字符串存档
 */
export function DzAPI_Map_Global_StoreString(key: string, value: string): void {
  RequestExtraBooleanData(37, GetLocalPlayer(), key, value, false, 0, 0, 0);
}

/**
 * 地图全局消息同步注册
 * 等价于 DzAPI_Map_Global_ChangeMsg
 */
export function DzAPI_Map_Global_ChangeMsg(trig: trigger): void {
  DzTriggerRegisterSyncData(trig, "DZGAU", true);
}

/**
 * 获取服务器存档
 */
export function DzAPI_Map_ServerArchive(whichPlayer: player, key: string): string {
  return RequestExtraStringData(38, whichPlayer, key, null as any, false, 0, 0, 0);
}

/**
 * 保存服务器存档
 */
export function DzAPI_Map_SaveServerArchive(whichPlayer: player, key: string, value: string): void {
  RequestExtraBooleanData(39, whichPlayer, key, value, false, 0, 0, 0);
}

/**
 * 是否为RPG快速匹配
 */
export function DzAPI_Map_IsRPGQuickMatch(): boolean {
  return RequestExtraBooleanData(40, null as any, null as any, null as any, false, 0, 0, 0);
}

/**
 * 获取商城道具数量
 */
export function DzAPI_Map_GetMallItemCount(whichPlayer: player, key: string): number {
  return RequestExtraIntegerData(41, whichPlayer, key, null as any, false, 0, 0, 0);
}

/**
 * 消耗商城道具
 */
export function DzAPI_Map_ConsumeMallItem(
  whichPlayer: player,
  key: string,
  count: number
): boolean {
  return RequestExtraBooleanData(42, whichPlayer, key, null as any, false, count, 0, 0);
}

/**
 * 启用/禁用平台设置
 */
export function DzAPI_Map_EnablePlatformSettings(
  whichPlayer: player,
  option: number,
  enable: boolean
): boolean {
  return RequestExtraBooleanData(43, whichPlayer, null as any, null as any, enable, option, 0, 0);
}

/**
 * 获取读取服务器存档是否成功
 */
export function GetPlayerServerValueSuccess(whichPlayer: player): boolean {
  return DzAPI_Map_GetServerValueErrorCode(whichPlayer) === 0;
}

/**
 * 判断单位能否在指定位置放置（基于 location）
 */
export function KKUnitCanPlaceAroundLoc(obj: widget, loc: location): boolean {
  return DzUnitCanPlaceAround(obj, GetLocationX(loc), GetLocationY(loc));
}

/**
 * 判断单位能否在指定坐标放置
 */
export function kkUnitCanPlaceAroundItem(obj: widget, x: number, y: number): boolean {
  return DzUnitCanPlaceAround(obj, x, y);
}

/**
 * 判断单位能否在指定 location 放置（同 KKUnitCanPlaceAroundLoc）
 */
export function KKUnitCanPlaceAroundLocItem(obj: widget, loc: location): boolean {
  return DzUnitCanPlaceAround(obj, GetLocationX(loc), GetLocationY(loc));
}

/**
 * 判断指定位置是否可放置单位（带碰撞体积和类型）
 */
export function KKPositionCanPlaceAroundLoc(
  loc: location,
  collision_size: number,
  collision_type: number
): boolean {
  return DzPositionCanPlaceAround(
    GetLocationX(loc),
    GetLocationY(loc),
    collision_size,
    collision_type
  );
}

// ============= KKWE 新增 JASS 封装（对应 KKAPI/DzAPI/BlizzardAPI function） =============

/** KKWE DzUnitSetMoveType 使用的移动类型字符串 */
export const KK_MOVE_TYPE_NONE = "none";
export const KK_MOVE_TYPE_FOOT = "foot";
export const KK_MOVE_TYPE_HORSE = "horse";
export const KK_MOVE_TYPE_FLY = "fly";
export const KK_MOVE_TYPE_HOVER = "hover";
export const KK_MOVE_TYPE_FLOAT = "float";
export const KK_MOVE_TYPE_AMPH = "amph";
export const KK_MOVE_TYPE_UNBUILD = "unbuild";

/** 最后创建的特效组（DzEffectGroupCreateBJ 系列会写入） */
export let bj_lastCreatedDzEffectGroup: dzeffectgroup;

/**
 * 转化 - 字符串转目标允许
 * 转换 ${字符串} 为目标允许
 * 例如“ground,friend,vuln,invu”
 */
export function KKConvertStr2Targs(s: string): number {
  return DzConvertStr2Targs(s);
}

/**
 * 特效组 - 创建空的特效组
 * 创建空的特效组
 * 会创建特效组,需要排泄,可以用最后创建的特效组
 */
export function DzEffectGroupCreateBJ(): dzeffectgroup {
  bj_lastCreatedDzEffectGroup = DzEffectGroupCreate();
  return bj_lastCreatedDzEffectGroup;
}

/**
 * 特效组 - 选取范围内的特效
 * 选取 X:${x} Y:${y} 范围:${range} 内的特效
 * 会创建特效组,需要排泄,可以用最后创建的特效组
 */
export function DzEffectGroupCreateEnumRangeBJ(x: number, y: number, range: number): dzeffectgroup {
  bj_lastCreatedDzEffectGroup = DzEffectGroupCreate();
  DzEffectGroupEnumRange(bj_lastCreatedDzEffectGroup, x, y, range, false, false);
  return bj_lastCreatedDzEffectGroup;
}

/**
 * 特效组 - 选取区域内的特效
 * 选取 ${rect} 内的特效到新建特效组
 * 会创建特效组,需要排泄,可以用最后创建的特效组
 */
export function DzEffectGroupCreateEnumRectBJ(whichRect: rect): dzeffectgroup {
  bj_lastCreatedDzEffectGroup = DzEffectGroupCreate();
  DzEffectGroupEnumRect(bj_lastCreatedDzEffectGroup, whichRect, false, false);
  return bj_lastCreatedDzEffectGroup;
}

/**
 * 特效组 - 添加
 * 添加 ${特效} 到 ${特效组} 允许重复 ${flag}
 */
export function DzEffectGroupAddBJ(
  whichEffect: effect,
  whichEffectGroup: dzeffectgroup,
  allowDuplicate: boolean
): number {
  return DzEffectGroupAdd(whichEffectGroup, whichEffect, allowDuplicate);
}

/**
 * 特效组 - 添加范围内的特效
 * 选取 X:${x} Y:${y} 范围:${range} 内的特效添加到 ${特效组} (清空${clear} 允许重复${duplicate})
 */
export function DzEffectGroupEnumRangeBJ(
  x: number,
  y: number,
  range: number,
  whichEffectGroup: dzeffectgroup,
  clear: boolean,
  allowDuplicate: boolean
): number {
  return DzEffectGroupEnumRange(whichEffectGroup, x, y, range, clear, allowDuplicate);
}

/**
 * 特效组 - 添加区域内的特效
 * 选取 ${rect} 内的特效添加到 ${特效组} (清空${clear} 允许重复${duplicate})
 */
export function DzEffectGroupEnumRectBJ(
  whichRect: rect,
  whichEffectGroup: dzeffectgroup,
  clear: boolean,
  allowDuplicate: boolean
): number {
  return DzEffectGroupEnumRect(whichEffectGroup, whichRect, clear, allowDuplicate);
}

/**
 * 特效 - 延迟立即删除(不播放死亡动画)
 * 在 ${duration} 秒延迟后, 立即删除 ${特效}
 * 不会播放死亡动画且时间到会立即删除特效
 */
export function DzRemoveEffectTimedBJ(time: number, whichEffect: effect): boolean {
  return DzRemoveEffectTimed(whichEffect, time);
}

/**
 * 特效 - 延迟删除
 * 在 ${duration} 秒延迟后, 删除 ${特效}
 * 时间到后会播放死亡动画并在平衡性常数时间后删除特效
 */
export function DzDieEffectTimedBJ(time: number, whichEffect: effect): boolean {
  return DzDieEffectTimed(whichEffect, time);
}

/**
 * 特效组 - 获取 特效组 的整数地址
 * 获取 ${特效组} 的整数地址
 * 可以把一个特效组转成整数，方便存入缓存或Hash表。
 */
export function DzGetEffectGroupIdBJ(g: dzeffectgroup): number {
  return GetHandleId(g);
}

/**
 * 服务器存储整数（区分大小写）
 * 服务器存储整数（区分大小写） 玩家 ${player} 名称 ${key} 值 ${value}
 * 这是经过封装的接口，实际Key会在原Key前面加”I”，与普通存档共用KEY
 */
export function DzAPI_Map_StoreIntegerEX(whichPlayer: player, key: string, value: number): void {
  key = "I" + key;
  RequestExtraBooleanData(39, whichPlayer, key, I2S(value), false, 0, 0, 0);
}

/**
 * 获取服务器存储的整数（区分大小写）
 * 获取服务器存储的整数（区分大小写） 玩家 ${player} 名称 ${key}
 * 这是经过封装的接口，实际Key会在原Key前面加”I”，用于开发者平台设置的防刷分存档，与普通存档共用KEY
 */
export function DzAPI_Map_GetStoredIntegerEX(whichPlayer: player, key: string): number {
  let value: number;
  key = "I" + key;
  value = S2I(RequestExtraStringData(38, whichPlayer, key, null as any, false, 0, 0, 0));
  return value;
}

/**
 * 保存整数变量至服务器
 * 服务器存档:存储 ${whichPlayer} 数据,名称： ${key} ,值: ${value} 最大长度63位
 * 这是经过封装的接口，实际Key会在原Key前面加”I,（如您的key是AA，实际key为IAA。【IAA用于开发者平台填写，在编辑器上获取和读都填写AA就可以了】）”
 */
export function DzAPI_Map_StoreInteger(whichPlayer: player, key: string, value: number): void {
  key = "I" + key;
  DzAPI_Map_SaveServerValue(whichPlayer, key, I2S(value));
}

/**
 * 读取服务器上的整数变量
 * 获取 ${whichPlayer} 数据名称: ${key} 里存储的整数.
 * 这是经过封装的接口，实际Key会在原Key前面加”I”
 */
export function DzAPI_Map_GetStoredInteger(whichPlayer: player, key: string): number {
  let value: number;
  key = "I" + key;
  value = S2I(DzAPI_Map_GetServerValue(whichPlayer, key));
  return value;
}

/**
 * 玩家在地图自定义排行榜上的排名
 * 获取玩家 ${whichPlayer} 自定义排行榜KEY(开发者平台填写)： ${key} 的排名，【请注意100名以外的玩家获取的值为0！】
 * 【100名以外的玩家排名为0】该功能适用于开发者平台-服务器存档-自定义排行榜
 */
export function DzAPI_Map_CommentTotalCount1(whichPlayer: player, id: number): number {
  return RequestExtraIntegerData(52, whichPlayer, null as any, null as any, false, id, 0, 0);
}

/**
 * 保存实数变量至服务器
 * 服务器存档:存储 ${whichPlayer} 数据,名称： ${key} ,值: ${value} 最大长度63位
 * 这是经过封装的接口，实际Key会在原Key前面加”R,（如您的key是AA，实际key为RAA。【RAA用于开发者平台填写，在编辑器上获取和读都填写AA就可以了】”
 */
export function DzAPI_Map_StoreReal(whichPlayer: player, key: string, value: number): void {
  key = "R" + key;
  DzAPI_Map_SaveServerValue(whichPlayer, key, R2S(value));
}

/**
 * 读取服务器上的实数变量
 * 获取 ${whichPlayer} 数据名称: ${key} 里存储的实数
 * 这是经过封装的接口，实际Key会在原Key前面加”R”
 */
export function DzAPI_Map_GetStoredReal(whichPlayer: player, key: string): number {
  let value: number;
  key = "R" + key;
  value = S2R(DzAPI_Map_GetServerValue(whichPlayer, key));
  return value;
}

/**
 * 保存布尔值变量至服务器
 * 服务器存档:存储 ${whichPlayer} 数据,名称: ${key} ,值: ${value} 最大长度63位
 * 这是经过封装的接口，实际Key会在原Key前面加”B，（如您的key是AA，实际key为BAA。【BAA用于开发者平台填写，在编辑器上获取和读都填写AA就可以了】）”
 */
export function DzAPI_Map_StoreBoolean(whichPlayer: player, key: string, value: boolean): void {
  key = "B" + key;
  if (value) {
    DzAPI_Map_SaveServerValue(whichPlayer, key, "1");
  } else {
    DzAPI_Map_SaveServerValue(whichPlayer, key, "0");
  }
}

/**
 * 读取服务器上的布尔变量
 * 获取 ${whichPlayer} 数据名称: ${key} 里存储的布尔值
 * 这是经过封装的接口，实际Key会在原Key前面加”B”
 */
export function DzAPI_Map_GetStoredBoolean(whichPlayer: player, key: string): boolean {
  let value: boolean;
  key = "B" + key;
  key = DzAPI_Map_GetServerValue(whichPlayer, key);
  if (key === "1") {
    value = true;
  } else {
    value = false;
  }
  return value;
}

/**
 * 保存字符串变量至服务器
 * 服务器存档:存储 ${whichPlayer} 数据,名称: ${key} ,值: ${value} 最大长度63位
 * 这是经过封装的接口，实际Key会在原Key前面加”S,（如您的key是AA，实际key为SAA。【SAA用于开发者平台填写，在编辑器上获取和读都填写AA就可以了】”
 */
export function DzAPI_Map_StoreString(whichPlayer: player, key: string, value: string): void {
  key = "S" + key;
  DzAPI_Map_SaveServerValue(whichPlayer, key, value);
}

/**
 * 读取服务器上的字符串变量
 * 获取 ${whichPlayer} 数据名称: ${key} 里存储的字符串
 * 这是经过封装的接口，实际Key会在原Key前面加”S”
 */
export function DzAPI_Map_GetStoredString(whichPlayer: player, key: string): string {
  return DzAPI_Map_GetServerValue(whichPlayer, "S" + key);
}

/**
 * 服务器存储字符串（区分大小写）
 * 服务器存储字符串（区分大小写） 玩家 ${player} 名称 ${key} 值 ${value}
 * 这是经过封装的接口，实际Key会在原Key前面加”S”，与普通存档共用KEY
 */
export function DzAPI_Map_StoreStringEX(whichPlayer: player, key: string, value: string): void {
  key = "S" + key;
  RequestExtraBooleanData(39, whichPlayer, key, value, false, 0, 0, 0);
}

/**
 * 获取服务器存储的字符串（区分大小写）
 * 获取服务器存储的字符串（区分大小写） 玩家 ${player} 名称 ${key}
 * 这是经过封装的接口，实际Key会在原Key前面加”S”，用于开发者平台设置的防刷分存档，与普通存档共用KEY
 */
export function DzAPI_Map_GetStoredStringEX(whichPlayer: player, key: string): string {
  return RequestExtraStringData(38, whichPlayer, "S" + key, null as any, false, 0, 0, 0);
}

/**
 * 读取服务器存储的单位类型
 * 获取 ${whichPlayer} 数据名称: ${key} 里存储的单位类型
 * 这是经过封装的接口，实际Key会在原Key前面加”I”
 */
export function DzAPI_Map_GetStoredUnitType(whichPlayer: player, key: string): number {
  let value: number;
  key = "I" + key;
  value = S2I(DzAPI_Map_GetServerValue(whichPlayer, key));
  return value;
}

/**
 * 读取服务器存储的技能类型
 * 获取 ${whichPlayer} 数据名称: ${key} 里存储的技能类型
 * 这是经过封装的接口，实际Key会在原Key前面加”I”
 */
export function DzAPI_Map_GetStoredAbilityId(whichPlayer: player, key: string): number {
  let value: number;
  key = "I" + key;
  value = S2I(DzAPI_Map_GetServerValue(whichPlayer, key));
  return value;
}

/**
 * 清理服务器数据
 * 服务器数据：清理 ${whichPlayer} 数据,名称： ${key}
 * 清理封装的接口记得在前面加对应的B、I、R、S
 */
export function DzAPI_Map_FlushStoredMission(whichPlayer: player, key: string): void {
  DzAPI_Map_SaveServerValue(whichPlayer, key, null as any);
}

/**
 * 天梯提交整数数据
 * 提交 ${whichPlayer} 天梯项目: ${key} 的值为: ${value}
 */
export function DzAPI_Map_Ladder_SubmitIntegerData(
  whichPlayer: player,
  key: string,
  value: number
): void {
  DzAPI_Map_Ladder_SetStat(whichPlayer, key, I2S(value));
}

/**
 * 天梯提交单位类型数据
 * 提高 ${whichPlayer} 天梯项目: ${key} 的值为: ${value}
 */
export function DzAPI_Map_Stat_SubmitUnitIdData(
  whichPlayer: player,
  key: string,
  value: number
): void {
  if (value === 0) {
    //call DzAPI_Map_Ladder_SetStat(whichPlayer,key,"0")
  } else {
    DzAPI_Map_Ladder_SetStat(whichPlayer, key, I2S(value));
  }
}

/** DzAPI_Map_Stat_SubmitUnitData */
export function DzAPI_Map_Stat_SubmitUnitData(whichPlayer: player, key: string, value: unit): void {
  DzAPI_Map_Stat_SubmitUnitIdData(whichPlayer, key, GetUnitTypeId(value));
}

/**
 * 天梯提交技能数据
 * 提交 ${whichPlayer} 天梯项目: ${key} 的值为: ${value}
 */
export function DzAPI_Map_Ladder_SubmitAblityIdData(
  whichPlayer: player,
  key: string,
  value: number
): void {
  if (value === 0) {
    //call DzAPI_Map_Ladder_SetStat(whichPlayer,key,"0")
  } else {
    DzAPI_Map_Ladder_SetStat(whichPlayer, key, I2S(value));
  }
}

/**
 * 天梯提交物品数据
 * 提交 ${whichPlayer} 天梯项目: ${key} 的值为: ${value}
 */
export function DzAPI_Map_Ladder_SubmitItemIdData(
  whichPlayer: player,
  key: string,
  value: number
): void {
  let S: string;
  if (value === 0) {
    S = "0";
  } else {
    S = I2S(value);
    DzAPI_Map_Ladder_SetStat(whichPlayer, key, S);
  }
  //call DzAPI_Map_Ladder_SetStat(whichPlayer,key,S)
}

/** DzAPI_Map_Ladder_SubmitItemData */
export function DzAPI_Map_Ladder_SubmitItemData(
  whichPlayer: player,
  key: string,
  value: item
): void {
  DzAPI_Map_Ladder_SubmitItemIdData(whichPlayer, key, GetItemTypeId(value));
}

/**
 * 天梯提交布尔值数据
 * 提交 ${whichPlayer} 天梯项目: ${key} 的目的 ${value}
 */
export function DzAPI_Map_Ladder_SubmitBooleanData(
  whichPlayer: player,
  key: string,
  value: boolean
): void {
  if (value) {
    DzAPI_Map_Ladder_SetStat(whichPlayer, key, "1");
  } else {
    DzAPI_Map_Ladder_SetStat(whichPlayer, key, "0");
  }
}

/**
 * 天梯提交获得称号
 * 提交 ${whichPlayer} 获得称号: ${key}
 */
export function DzAPI_Map_Ladder_SubmitTitle(whichPlayer: player, value: string): void {
  DzAPI_Map_Ladder_SetStat(whichPlayer, value, "1");
}

/**
 * 天梯提交玩家排名
 * 设置 ${whichPlayer} 的游戏排名为: ${value}
 */
export function DzAPI_Map_Ladder_SubmitPlayerRank(whichPlayer: player, value: number): void {
  DzAPI_Map_Ladder_SetPlayerStat(whichPlayer, "RankIndex", I2S(value));
}

/**
 * 天梯设置玩家额外分
 * 设置 ${whichPlayer} 的额外分为 ${value}
 * 最多30分
 */
export function DzAPI_Map_Ladder_SubmitPlayerExtraExp(whichPlayer: player, value: number): void {
  DzAPI_Map_Ladder_SetStat(whichPlayer, "ExtraExp", I2S(value));
}

/**
 * 玩家累计游戏局数
 * 获取 ${whichPlayer} 游戏局数
 * 获取玩家中游戏局数
 */
export function DzAPI_Map_PlayedGames(whichPlayer: player): number {
  return RequestExtraIntegerData(45, whichPlayer, null as any, null as any, false, 0, 0, 0);
}

/**
 * 评论次数【废弃】
 * 获取 ${whichPlayer} 评论次数
 * 获取玩家的评论次数，该功能已失效，始终返回1
 */
export function DzAPI_Map_CommentCount(whichPlayer: player): number {
  return RequestExtraIntegerData(46, whichPlayer, null as any, null as any, false, 0, 0, 0);
}

/**
 * 玩家好友数量【废弃】
 * 获取 ${whichPlayer} 好友数量
 * 该功能废弃
 */
export function DzAPI_Map_FriendCount(whichPlayer: player): number {
  return RequestExtraIntegerData(47, whichPlayer, null as any, null as any, false, 0, 0, 0);
}

/**
 * 玩家是否平台认证的鉴赏家[废弃]
 *  ${whichPlayer} 是鉴赏家
 * 评论里的鉴赏家
 */
export function DzAPI_Map_IsConnoisseur(whichPlayer: player): boolean {
  return RequestExtraBooleanData(48, whichPlayer, null as any, null as any, false, 0, 0, 0);
}

/**
 * 玩家是否当前地图作者
 *  ${whichPlayer} 是本图作者
 * 判断指定玩家是否为本地图的作者。
 */
export function DzAPI_Map_IsAuthor(whichPlayer: player): boolean {
  return RequestExtraBooleanData(50, whichPlayer, null as any, null as any, false, 0, 0, 0);
}

/**
 * 地图评论次数
 * 该图总评论次数
 * 获取该图总评论次数
 */
export function DzAPI_Map_CommentTotalCount(): number {
  return RequestExtraIntegerData(51, null as any, null as any, null as any, false, 0, 0, 0);
}

/**
 * 是否回流/收藏过地图的用户
 *  ${whichPlayer}  ${label}
 * 超过7天未玩地图的用户再次登录被称为地图回流用户，地图回流BUFF会存在7天，7天后消失。平台回流用户的BUFF存在15天，15天后消失。建议设置奖励，鼓励玩家回来玩地图！
 */
export function DzAPI_Map_Returns(whichPlayer: player, label: number): boolean {
  return RequestExtraBooleanData(53, whichPlayer, null as any, null as any, false, label, 0, 0);
}

/**
 * 玩家签到天数
 *  ${whichPlayer}  ${label}
 * 获取玩家在指定地图的地图签到数据。
 */
export function DzAPI_Map_ContinuousCount(whichPlayer: player, id: number): number {
  return RequestExtraIntegerData(54, whichPlayer, null as any, null as any, false, id, 0, 0);
}

/**
 * 玩家是否为真实玩家
 *  ${whichPlayer} 是否为真实玩家
 * 当作者开启匹配模式的虚拟电脑玩家(AI)补位功能后，可通过此接口判定是否真实玩家。
 */
export function DzAPI_Map_IsPlayer(whichPlayer: player): boolean {
  return RequestExtraBooleanData(55, whichPlayer, null as any, null as any, false, 0, 0, 0);
}

/**
 * 玩家累计游戏时长
 *  ${whichPlayer} 累计游戏时长
 * 获取玩家在当前地图的累计游戏时长
 */
export function DzAPI_Map_MapsTotalPlayed(whichPlayer: player): number {
  return RequestExtraIntegerData(56, whichPlayer, null as any, null as any, false, 0, 0, 0);
}

/**
 * 玩家在指定地图的地图等级
 *  ${whichPlayer} 在地图: ${mapId} 的地图等级
 * 获取玩家在指定地图的地图等级。
 */
export function DzAPI_Map_MapsLevel(whichPlayer: player, mapId: number): number {
  return RequestExtraIntegerData(57, whichPlayer, null as any, null as any, false, mapId, 0, 0);
}

/**
 * 玩家在指定地图累计消耗平台金币【已废弃】
 *  ${whichPlayer} 在地图： ${mapId} 的平台金币消耗
 * 获取玩家在指定地图的累计消耗平台金币数量。
 */
export function DzAPI_Map_MapsConsumeGold(whichPlayer: player, mapId: number): number {
  return RequestExtraIntegerData(58, whichPlayer, null as any, null as any, false, mapId, 0, 0);
}

/**
 * 玩家在指定地图的平台木材消耗【已废弃】
 *  ${whichPlayer} 地图： ${mapId} 的平台木材消耗
 */
export function DzAPI_Map_MapsConsumeLumber(whichPlayer: player, mapId: number): number {
  return RequestExtraIntegerData(59, whichPlayer, null as any, null as any, false, mapId, 0, 0);
}

/**
 * 玩家在指定地图累计消费金额区间（1~199）
 *  ${whichPlayer} 在地图 ${地图id} 消费在（1~199）区间
 * 检测消费是否在（1~199）区间
 */
export function DzAPI_Map_MapsConsumeLv1(whichPlayer: player, mapId: number): boolean {
  return RequestExtraBooleanData(60, whichPlayer, null as any, null as any, false, mapId, 0, 0);
}

/**
 * 玩家在指定地图累计消费金额区间（200~499）
 *  ${whichPlayer} 在地图 ${地图id} 消费在（200~499）区间
 * 检测消费是否在（200~499）区间
 */
export function DzAPI_Map_MapsConsumeLv2(whichPlayer: player, mapId: number): boolean {
  return RequestExtraBooleanData(61, whichPlayer, null as any, null as any, false, mapId, 0, 0);
}

/**
 * 玩家在指定地图累计消费金额区间（500~999）
 *  ${whichPlayer} 在地图 ${地图id} 消费在（500~999）区间
 * 检测消费是否在（500~999）区间
 */
export function DzAPI_Map_MapsConsumeLv3(whichPlayer: player, mapId: number): boolean {
  return RequestExtraBooleanData(62, whichPlayer, null as any, null as any, false, mapId, 0, 0);
}

/**
 * 玩家在指定地图累计消费金额区间（1000+）
 *  ${whichPlayer} 在地图 ${地图id} 消费在（1000+）区间
 * 检测消费是否在（1000+）区间
 */
export function DzAPI_Map_MapsConsumeLv4(whichPlayer: player, mapId: number): boolean {
  return RequestExtraBooleanData(63, whichPlayer, null as any, null as any, false, mapId, 0, 0);
}

/**
 * 玩家是否装备指定平台装饰
 *  ${whichPlayer} 装备了 ${skinType} 的 ${id} 道具
 * 检查玩家是否装备着指定平台装饰（仅限平台和地图的合作装饰）。
 */
export function DzAPI_Map_IsPlayerUsingSkin(
  whichPlayer: player,
  skinType: number,
  id: number
): boolean {
  return RequestExtraBooleanData(64, whichPlayer, null as any, null as any, false, skinType, id, 0);
}

/**
 * 玩家在地图社区上的互动数据
 *  ${whichPlayer}  ${whichData}
 * “获取玩家在当前地图的社区内的行为统计数据及身份数据。
 */
export function DzAPI_Map_GetForumData(whichPlayer: player, whichData: number): number {
  return RequestExtraIntegerData(65, whichPlayer, null as any, null as any, false, whichData, 0, 0);
}

/**
 * 玩家标记
 *  ${whichPlayer} 是 ${label}
 * 获取玩家在当前地图上的身份标记（当前是否回流用户、是否收藏地图）。
 */
export function DzAPI_Map_PlayerFlags(whichPlayer: player, label: number): boolean {
  return RequestExtraBooleanData(53, whichPlayer, null as any, null as any, false, label, 0, 0);
}

/**
 * 玩家抽取指定地图宝箱次数
 * 获取 ${whichPlayer} 第 ${n} 个地图宝箱的累计抽取次数
 * 第二个参数为0代表第一个宝箱也为默认宝箱，为1代表第二个宝箱
 */
export function DzAPI_Map_GetLotteryUsedCountEx(whichPlayer: player, index: number): number {
  return RequestExtraIntegerData(68, whichPlayer, null as any, null as any, false, index, 0, 0);
}

/**
 * 玩家抽取地图宝箱总次数
 *  ${whichPlayer} 玩家抽取地图宝箱总次数
 */
export function DzAPI_Map_GetLotteryUsedCount(whichPlayer: player): number {
  return (
    DzAPI_Map_GetLotteryUsedCountEx(whichPlayer, 0) +
    DzAPI_Map_GetLotteryUsedCountEx(whichPlayer, 1) +
    DzAPI_Map_GetLotteryUsedCountEx(whichPlayer, 2)
  );
}

/**
 * 打开地图商城道具购买界面
 *  ${whichPlayer} 打开地图商城道具 ${道具key} 购买界面
 * 打开游戏内置商城的道具购买页面，用于作者在地图内开发引导消费场景。购买成功后可通过玩家获得平台道具事件实现在游戏内立即生效。
 */
export function DzAPI_Map_OpenMall(whichPlayer: player, whichkey: string): boolean {
  return RequestExtraBooleanData(66, whichPlayer, whichkey, null as any, false, 0, 0, 0);
}

/**
 * 上报本局游戏玩家数据
 * 上报本局游戏： ${whichPlayer} 项目： ${key} 数据： ${value}
 * 上报本局游戏的玩家数据，比如战斗力、杀敌数等。
 */
export function DzAPI_Map_GameResult_CommitData(
  whichPlayer: player,
  key: string,
  value: string
): void {
  RequestExtraIntegerData(69, whichPlayer, key, value, false, 0, 0, 0);
}

/**
 * 上报本局游戏玩家称号
 * 上报本局游戏： ${whichPlayer} 称号： ${key}
 * 上报本局游戏玩家所获得的称号，请注意**称号Key**不能和[上报本局游戏玩家数据]的**数据项Key**重复。
 */
export function DzAPI_Map_GameResult_CommitTitle(whichPlayer: player, value: string): void {
  DzAPI_Map_GameResult_CommitData(whichPlayer, value, "1");
}

/**
 * 上报本局游戏玩家排名
 * 上报本局游戏 ${whichPlayer} 的排名为： ${value}
 * 对于乱斗模式的地图，上报每一名玩家的名次。
 */
export function DzAPI_Map_GameResult_CommitPlayerRank(whichPlayer: player, value: number): void {
  DzAPI_Map_GameResult_CommitData(whichPlayer, "RankIndex", I2S(value));
}

/**
 * 上报本局游戏模式
 * 上报本局游戏模式： ${模式名}
 * 上报本局游戏所选择的地图模式名称。
 */
export function DzAPI_Map_GameResult_CommitGameMode(value: string): void {
  DzAPI_Map_GameResult_CommitData(GetLocalPlayer(), "InnerGameMode", value);
}

/**
 * 上报本局游戏结果
 * 上报本局游戏结果： ${whichPlayer}  ${value}
 * 上报本局游戏玩家游戏结果（胜负），提交后会立即结束游戏。
 */
export function DzAPI_Map_GameResult_CommitGameResult(whichPlayer: player, value: number): void {
  DzAPI_Map_GameResult_CommitData(whichPlayer, "GameResult", I2S(value));
}

/**
 * 上报本局游戏结果（不结束游戏）
 * 上报本局游戏结果： ${whichPlayer}  ${value} [不结束游戏]
 * 上报本局游戏玩家游戏结果（胜负），提交后不会立即结束游戏，适用于游戏正常结束后还有奖励关的地图。
 */
export function DzAPI_Map_GameResult_CommitGameResultNoEnd(
  whichPlayer: player,
  value: number
): void {
  DzAPI_Map_GameResult_CommitData(whichPlayer, "GameResultNoEnd", I2S(value));
}

/**
 * 玩家本局游戏距上一局游戏的时间差
 *  ${whichPlayer} 本局游戏距上一局游戏的时间差
 * 返查询该玩家上次玩游戏时间至本次玩游戏时间的差值，可以利用此接口实现离线收益之类的功能。
 */
export function DzAPI_Map_GetSinceLastPlayedSeconds(whichPlayer: player): number {
  return RequestExtraIntegerData(70, whichPlayer, null as any, null as any, false, 0, 0, 0);
}

/**
 * 使用U币快速购买地图商城道具
 * 向 ${whichPlayer} 弹出商品 ${key} 的购买窗口，购买数量 ${数量} 窗口持续时间 ${时间} 秒
 * 弹出提示框询问玩家是否使用U币直接购买指定道具，作者需已在商城上架对应商品（商品信息中的**道具和数量**与接口所请求的参数一致）。如果前一次购买的提示框未关闭的情况下再次调用此接口，后续请求无效。购买成功后可通过[玩家获得平台道具事件]实现在游戏内立即生效。
 */
export function DzAPI_Map_QuickBuy(
  whichPlayer: player,
  key: string,
  count: number,
  seconds: number
): boolean {
  return RequestExtraBooleanData(72, whichPlayer, key, null as any, false, count, seconds, 0);
}

/**
 * 关闭U币快速购买界面
 * 关闭 ${whichPlayer} U币快速购买窗口
 * 关闭最后一次打开的U币快速购买窗口，结合打开U币快速购买窗口使用。
 */
export function DzAPI_Map_CancelQuickBuy(whichPlayer: player): boolean {
  return RequestExtraBooleanData(73, whichPlayer, null as any, null as any, false, 0, 0, 0);
}

/**
 * 本局游戏是否处于平台自测服
 * 本局游戏是否处于平台自测服
 * 获取当前游戏局所处的平台环境。
 */
export function DzAPI_Map_IsMapTest(): boolean {
  return RequestExtraBooleanData(74, null as any, null as any, null as any, false, 0, 0, 0);
}

/**
 * 玩家地图商城道具是否读取成功
 *  ${whichPlayer} 地图商城道具是否读取成功
 * 判断本局游戏中玩家的商城道具是否正确加载。
 */
export function DzAPI_Map_PlayerLoadedItems(whichPlayer: player): boolean {
  return RequestExtraBooleanData(77, whichPlayer, null as any, null as any, false, 0, 0, 0);
}

/**
 * 自定义排行榜上榜人数
 * 获取自定义排行榜 ${key} 的上榜人数
 * key为开发者平台所配置的自定义排行榜key值,值为1~9
 */
export function DzAPI_Map_CustomRankCount(id: number): number {
  return RequestExtraIntegerData(78, null as any, null as any, null as any, false, id, 0, 0);
}

/**
 * 自定义排行榜上的玩家昵称
 * 获取自定义排行榜 ${key} 的排名第 ${ranking} 的玩家昵称
 * key为开发者平台所配置的自定义排行榜key值,值为1~9
 */
export function DzAPI_Map_CustomRankPlayerName(id: number, ranking: number): string {
  return RequestExtraStringData(79, null as any, null as any, null as any, false, id, ranking, 0);
}

/**
 * 自定义排行榜上的玩家数值
 * 获取自定义排行榜 ${key} 排名第 ${ranking} 的数值
 * key为开发者平台所配置的自定义排行榜key值,值为1~9
 */
export function DzAPI_Map_CustomRankValue(id: number, ranking: number): number {
  return RequestExtraIntegerData(80, null as any, null as any, null as any, false, id, ranking, 0);
}

/**
 * 玩家在KK对战平台的完整昵称
 *  ${whichPlayer} 在KK对战平台的完整昵称
 * 获取玩家的KK平台完整昵称“基础昵称#编号”
 */
export function DzAPI_Map_GetPlayerUserName(whichPlayer: player): string {
  return RequestExtraStringData(81, whichPlayer, null as any, null as any, false, 0, 0, 0);
}

/**
 * 获取服务器存档限制余额
 * 获取 ${whichPlayer} 存档 ${key} 上限余额
 * 获取服务器存档当天上限余额，需要在开发者平台对指定KEY设置每天上限，获取的值为余额。如存档A上限为100，当天使用了80，返回20
 */
export function KKApiGetServerValueLimitLeft(whichPlayer: player, key: string): number {
  return RequestExtraIntegerData(82, whichPlayer, key, null as any, false, 0, 0, 0);
}

/**
 * 【随机只读存档】生成随机数
 * 设置 ${whichPlayer} 对随机只读存档 ${key} 的组 ${groupkey} 生成随机数
 * 生成一个服务器随机数并关联组ID，可以在开发者平台对组ID进行防刷分管理，同组ID下各个Key共享CD和次数。
 */
export function KKApiRequestBackendLogic(
  whichPlayer: player,
  key: string,
  groupkey: string
): boolean {
  return RequestExtraBooleanData(83, whichPlayer, key, groupkey, false, 0, 0, 0);
}

/**
 * 【随机只读存档】判断随机数是否存在
 *  ${whichPlayer} 随机只读存档 ${key} 是否存在
 * 判断指定KEY生成的随机数是否存在，存在返回true
 */
export function KKApiCheckBackendLogicExists(whichPlayer: player, key: string): boolean {
  return RequestExtraBooleanData(84, whichPlayer, key, null as any, false, 0, 0, 0);
}

/**
 * 【随机只读存档】读取随机数的值
 * 获取 ${whichPlayer} 随机只读存档 ${key} 的值
 * 读取指定KEY生成的服务器随机数的值，返回整数。
 */
export function KKApiGetBackendLogicIntResult(whichPlayer: player, key: string): number {
  return RequestExtraIntegerData(85, whichPlayer, key, null as any, false, 0, 0, 0);
}

/**
 * 【随机只读存档】读取随机数的值
 * 获取 ${whichPlayer} 随机只读存档 ${key} 的值
 * 读取指定KEY生成的服务器随机数的值
 */
export function KKApiGetBackendLogicStrResult(whichPlayer: player, key: string): string {
  return RequestExtraStringData(86, whichPlayer, key, null as any, false, 0, 0, 0);
}

/**
 * 【随机只读存档】读取随机数的生成时间
 * 获取 ${whichPlayer} 随机只读存档 ${key} 的生成时间
 * 读取指定KEY生成的服务器随机数生成的时间戳，返回整数。
 */
export function KKApiGetBackendLogicUpdateTime(whichPlayer: player, key: string): number {
  return RequestExtraIntegerData(87, whichPlayer, key, null as any, false, 0, 0, 0);
}

/**
 * 【随机只读存档】读取随机数的组ID
 * 获取 ${whichPlayer} 随机只读存档 ${key} 的组ID
 * 读取指定KEY生成的服务器随机数生成的组ID，返回整数
 */
export function KKApiGetBackendLogicGroup(whichPlayer: player, key: string): string {
  return RequestExtraStringData(88, whichPlayer, key, null as any, false, 0, 0, 0);
}

/**
 * 【随机只读存档】删除随机数
 * 删除 ${whichPlayer} 随机只读存档 ${key} 的随机数
 * 删除指定KEY生成的服务器生成的随机数
 */
export function KKApiRemoveBackendLogicResult(whichPlayer: player, key: string): boolean {
  return RequestExtraBooleanData(89, whichPlayer, key, null as any, false, 0, 0, 0);
}

/**
 * 【随机只读存档】剩余次数
 *  ${whichPlayer} 随机只读存档的组 ${groupkey} 今日的剩余次数
 */
export function KKApiRandomSaveGameCount(whichPlayer: player, groupkey: string): number {
  return RequestExtraIntegerData(101, whichPlayer, groupkey, null as any, false, 0, 0, 0);
}

/** KKApiTriggerRegisterBackendLogicUpdata */
export function KKApiTriggerRegisterBackendLogicUpdata(trig: trigger): void {
  DzTriggerRegisterSyncData(trig, "DZBLU", true);
}

/** KKApiTriggerRegisterBackendLogicDelete */
export function KKApiTriggerRegisterBackendLogicDelete(trig: trigger): void {
  DzTriggerRegisterSyncData(trig, "DZBLD", true);
}

/**
 * 获取变动的随机存档
 * 获取变动的随机存档
 * 用在注册随机存档更新和删除事件之后
 */
export function KKApiGetSyncBackendLogic(): string {
  return DzGetTriggerSyncData();
}

/**
 * 是否在平台正常游戏中
 * 是否在平台正常游戏中
 * 主要试用于平台运行中区分正常游戏和观战模式，返回true代表是正常游戏模式，反之为观战模式
 */
export function KKApiIsGameMode(): boolean {
  return RequestExtraBooleanData(90, null as any, null as any, null as any, false, 0, 0, 0);
}

/**
 * 初始化平台键位显示设置
 * 设置 ${whichPlayer} 的第 ${n} 套方案的键位： ${key} 设置描述： ${描述}
 * 初始化键位设置会显示在平台改键界面上，最多2套方案。
 */
export function KKApiInitializeGameKey(
  whichPlayer: player,
  setIndex: number,
  k: string,
  data: string
): boolean {
  return RequestExtraBooleanData(
    91,
    whichPlayer,
    '[{"name":"' + data + '","key":"' + k + '"}]',
    null as any,
    false,
    setIndex,
    0,
    0
  );
}

/**
 * 获取玩家的平台ID
 *  ${whichPlayer} 平台ID
 * 返回的是一个32位的字符串
 */
export function KKApiPlayerGUID(whichPlayer: player): string {
  return RequestExtraStringData(93, whichPlayer, null as any, null as any, false, 0, 0, 0);
}

/**
 * 玩家地图任务状态
 *  ${whichPlayer} 地图任务： ${setIndex} 在 ${taskstat} 状态
 */
export function KKApiIsTaskInProgress(
  whichPlayer: player,
  setIndex: number,
  taskstat: number
): boolean {
  return (
    RequestExtraIntegerData(94, whichPlayer, null as any, null as any, false, setIndex, 0, 0) ===
    taskstat
  );
}

/**
 * 玩家地图任务当前进度
 *  ${whichPlayer} 地图任务： ${setIndex} 的当前进度
 */
export function KKApiQueryTaskCurrentProgress(whichPlayer: player, setIndex: number): number {
  return RequestExtraIntegerData(95, whichPlayer, null as any, null as any, false, setIndex, 0, 0);
}

/**
 * 玩家地图任务总进度
 *  ${whichPlayer} 地图任务： ${setIndex} 总进度
 */
export function KKApiQueryTaskTotalProgress(whichPlayer: player, setIndex: number): number {
  return RequestExtraIntegerData(96, whichPlayer, null as any, null as any, false, setIndex, 0, 0);
}

/**
 * 玩家平台该地图成就是否完成
 *  ${whichPlayer} 平台该地图成就： ${key} 已经完成
 * 完成返回true
 */
export function KKApiIsAchievementCompleted(whichPlayer: player, id: string): boolean {
  return RequestExtraBooleanData(98, whichPlayer, id, null as any, false, 0, 0, 0);
}

/**
 * 玩家平台该地图成就点数
 *  ${whichPlayer} 平台该地图成就点数
 */
export function KKApiAchievementPoints(whichPlayer: player): number {
  return RequestExtraIntegerData(99, whichPlayer, null as any, null as any, false, 0, 0, 0);
}

/**
 * 判定测试大厅游戏时长区间
 *  ${whichPlayer} 在测试大厅的游戏时长是否在区间（ ${minHours} 到 ${maxHours} ）小时
 * 判断测试大厅游戏时长是否满足该区间 ，0表示不限制，单位为小时
 */
export function KKApiPlayedTime(whichPlayer: player, minHours: number, maxHours: number): boolean {
  return RequestExtraBooleanData(
    100,
    whichPlayer,
    null as any,
    null as any,
    false,
    minHours,
    maxHours,
    0
  );
}

/**
 * 【批量存档】开始保存
 *  ${whichPlayer} 开始批量保存存档
 * 对添加批量保存存档条目进行保存。
 */
export function KKApiBeginBatchSaveArchive(whichPlayer: player): boolean {
  return RequestExtraBooleanData(102, whichPlayer, null as any, null as any, false, 0, 0, 0);
}

/**
 * 【批量存档】添加条目
 * 设置 ${whichPlayer} 批量存档添加条目 ${key} ，数据： ${value} ， ${caseInsensitive} 区分大小写
 * 对添加批量保存存档条目进行保存。
 */
export function KKApiAddBatchSaveArchive(
  whichPlayer: player,
  key: string,
  value: string,
  caseInsensitive: boolean
): boolean {
  return RequestExtraBooleanData(103, whichPlayer, key, value, caseInsensitive, 0, 0, 0);
}

/**
 * 【批量存档】结束保存
 * 设置 ${whichPlayer}  ${abandon} 结束批量保存存档
 * 结束批量保存存档。
 */
export function KKApiEndBatchSaveArchive(whichPlayer: player, abandon: boolean): boolean {
  return RequestExtraBooleanData(104, whichPlayer, null as any, null as any, abandon, 0, 0, 0);
}

/**
 * 【批量存档】添加条目-整数
 * 设置 ${whichPlayer} 批量存档添加条目 ${key} ，数据： ${value}
 * 对添加批量保存存档条目进行保存。KEY不区分大小写
 */
export function KKApiAddBatchSaveArchiveInteger(
  whichPlayer: player,
  key: string,
  value: number
): void {
  key = "I" + key;
  KKApiAddBatchSaveArchive(whichPlayer, key, I2S(value), false);
}

/**
 * 【批量存档】添加条目-实数
 * 设置 ${whichPlayer} 批量存档添加条目 ${key} ，数据： ${value}
 * 对添加批量保存存档条目进行保存。KEY不区分大小写
 */
export function KKApiAddBatchSaveArchiveReal(
  whichPlayer: player,
  key: string,
  value: number
): void {
  key = "R" + key;
  KKApiAddBatchSaveArchive(whichPlayer, key, R2S(value), false);
}

/**
 * 【批量存档】添加条目-布尔值
 * 设置 ${whichPlayer} 批量存档添加条目 ${key} ，数据： ${value}
 * 对添加批量保存存档条目进行保存。KEY不区分大小写
 */
export function KKApiAddBatchSaveArchiveBoolean(
  whichPlayer: player,
  key: string,
  value: boolean
): void {
  key = "B" + key;
  if (value) {
    KKApiAddBatchSaveArchive(whichPlayer, key, "1", false);
  } else {
    KKApiAddBatchSaveArchive(whichPlayer, key, "0", false);
  }
}

/**
 * 【批量存档】添加条目-字符串
 * 设置 ${whichPlayer} 批量存档添加条目 ${key} ，数据： ${value}
 * 对添加批量保存存档条目进行保存。KEY不区分大小写
 */
export function KKApiAddBatchSaveArchiveString(
  whichPlayer: player,
  key: string,
  value: string
): void {
  key = "S" + key;
  KKApiAddBatchSaveArchive(whichPlayer, key, value, false);
}

/** KKApiTriggerRegisterLadderSurrender */
export function KKApiTriggerRegisterLadderSurrender(trig: trigger): void {
  DzTriggerRegisterSyncData(trig, "DZSR", true);
}

/**
 * 获取天梯投降的队伍ID
 * 获取天梯投降的队伍ID
 * 用于天梯投降事件动作里
 */
export function KKApiGetLadderSurrenderTeamId(): number {
  return S2I(DzGetTriggerSyncData());
}

/**
 * 玩家在公会的等级
 * 获取 ${whichPlayer} 公会等级
 * 获取玩家公会等级
 */
export function KKApiGetGuildLevel(whichPlayer: player): number {
  return RequestExtraIntegerData(106, whichPlayer, null as any, null as any, false, 0, 0, 0);
}

/**
 * 宠物探险次数
 *  ${whichPlayer} 宠物探险次数
 * 获取平台宠物探险次数
 */
export function KKApiMapExplorationNum(whichPlayer: player): number {
  return RequestExtraIntegerData(107, whichPlayer, null as any, null as any, false, 0, 0, 0);
}

/**
 * 宠物探险时间
 *  ${whichPlayer} 宠物探险时间
 * 获取平台宠物探险时间
 */
export function KKApiMapExplorationTime(whichPlayer: player): number {
  return RequestExtraIntegerData(108, whichPlayer, null as any, null as any, false, 0, 0, 0);
}

/**
 * 测试大厅预约人数
 * 测试大厅预约人数
 */
export function KKApiMapOrderNum(): number {
  return RequestExtraIntegerData(109, null as any, null as any, null as any, false, 0, 0, 0);
}

/**
 * 发送云脚本数据
 * 发送云脚本数据 ${玩家}  ${事件}  ${数据}
 * 发送云脚本数据
 */
export function KKApiMlScriptEvent(
  whichPlayer: player,
  eventName: string,
  payload: string
): boolean {
  return RequestExtraBooleanData(1009, whichPlayer, eventName, payload, false, 0, 0, 0);
}

/**
 * 事件响应 - 商城道具最后变动的数量
 *  ${whichPlayer} 商城道具： ${key} 最后更新的数量
 * 获取的是当次玩家商城背包新增或消耗的数量，如果是时效型道具获取的是剩余时间，可以用于【玩家获取商城道具事件】、【玩家消耗使用商城道具事件】和【玩家删除商城道具事件】后。
 */
export function KKApiGetMallItemUpdateCount(whichPlayer: player, key: string): number {
  return RequestExtraIntegerData(110, whichPlayer, key, null as any, false, 0, 0, 0);
}

/**
 * 获取地图版本号[new]
 * 获取地图版本号
 */
export function KKApiGetMapVersion(): string {
  return RequestExtraStringData(111, null as any, null as any, null as any, false, 0, 0, 0);
}

/**
 * 获取赛事模式[new]
 * 获取赛事模式
 */
export function KKApiGetCompetitionGameMode(): string {
  return RequestExtraStringData(112, null as any, null as any, null as any, false, 0, 0, 0);
}

/**
 * 获取玩家当天总游戏局数[new]
 * 获取 ${whichPlayer} 当天总游戏局数
 * 为当天玩家玩该地图的有效局数，10分钟算一局，每天05:00刷新
 */
export function KKApiDayRounds(whichPlayer: player): number {
  return RequestExtraIntegerData(113, whichPlayer, null as any, null as any, false, 0, 0, 0);
}

/**
 * 获取玩家在指定地图会员等级[new]
 * 获取 ${whichPlayer} 在地图 ${mapId} 的会员等级
 */
export function KKApiConsumeLevel(whichPlayer: player, mapId: number): number {
  return RequestExtraIntegerData(115, whichPlayer, null as any, null as any, false, mapId, 0, 0);
}

/**
 * 判断玩家当前地图在游戏大厅置顶状态[new]
 *  ${whichPlayer} 当前地图在游戏大厅置顶状态
 * 玩家在游戏大厅首页置顶该地图后返回true
 */
export function KKApiIsPinned(whichPlayer: player): boolean {
  return RequestExtraBooleanData(117, whichPlayer, null as any, null as any, false, 0, 0, 0);
}

/**
 * 仅只读存档[new]
 * 只读存档: 读取玩家 ${player} 名称 ${key} 的数据
 * 只能读取只读存档，不可读取可写存档
 */
export function DzAPI_Map_SystemArchive(whichPlayer: player, key: string): string {
  return RequestExtraStringData(35, whichPlayer, key, null as any, false, 0, 0, 0);
}

/**
 * 获取玩家赏金助力榜排名
 * 获取 ${whichPlayer} 赏金助力榜排名
 * 0=未上榜，1=第一名，依此类推
 */
export function KKApiBountyRank(whichPlayer: player): number {
  return RequestExtraIntegerData(120, whichPlayer, null as any, null as any, false, 0, 0, 0);
}

/**
 * 获取玩家赏金助力值
 * 获取 ${whichPlayer} 赏金助力值
 * 获取玩家赏金助力值
 */
export function KKApiBountyValue(whichPlayer: player): number {
  return RequestExtraIntegerData(121, whichPlayer, null as any, null as any, false, 0, 0, 0);
}

/** DzK2I */
export function DzK2I(i: number): number {
  return i;
}

/** DzI2K */
export function DzI2K(i: number): number {
  return i;
}

/** DzTriggerRegisterMallItemSyncData */
export function DzTriggerRegisterMallItemSyncData(trig: trigger): void {
  DzTriggerRegisterSyncData(trig, "DZMIA", true);
}

/** DzTriggerRegisterMallItemConsumeEvent */
export function DzTriggerRegisterMallItemConsumeEvent(trig: trigger): void {
  DzTriggerRegisterSyncData(trig, "DZMIC", true);
}

/** DzTriggerRegisterMallItemRemoveEvent */
export function DzTriggerRegisterMallItemRemoveEvent(trig: trigger): void {
  DzTriggerRegisterSyncData(trig, "DZMID", true);
}

/**
 * 事件响应 - 触发的商城道具事件的玩家
 * 触发的商城道具事件的玩家
 * 可以用于【玩家获取商城道具事件】、【玩家消耗使用商城道具事件】和【玩家删除商城道具事件】后。
 */
export function DzGetTriggerMallItemPlayer(): player {
  return DzGetTriggerSyncPlayer();
}

/**
 * 事件响应 - 触发的商城道具（实时）
 * 触发的商城道具
 * 可以用于【玩家获取商城道具事件】、【玩家消耗使用商城道具事件】和【玩家删除商城道具事件】后。
 */
export function DzGetTriggerMallItem(): string {
  return DzGetTriggerSyncData();
}

/* eslint-enable camelcase, @typescript-eslint/naming-convention */
