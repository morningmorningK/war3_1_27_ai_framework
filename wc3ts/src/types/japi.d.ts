/** @noSelfInFile **/
/// <reference path="base.d.ts" />

/**
 * 获取活动数据
 * 获取活动数据
 * 获取当前活动的相关数据信息
 */
declare function DzAPI_Map_GetActivityData(): string;

/**
 * 获取游戏开始时间
 * 获取游戏开始时间
 * 返回游戏开始的时间戳
 */
declare function DzAPI_Map_GetGameStartTime(): number;

/**
 * 获取公会名称
 * 获取${玩家}的公会名称
 * 返回指定玩家所在公会的名称
 */
declare function DzAPI_Map_GetGuildName(whichPlayer: player): string;

/**
 * 获取公会职位
 * 获取${玩家}的公会职位
 * 返回指定玩家在公会中的职位等级
 */
declare function DzAPI_Map_GetGuildRole(whichPlayer: player): number;

/**
 * 获取天梯等级
 * 获取${玩家}的天梯等级
 * 返回指定玩家的天梯等级
 */
declare function DzAPI_Map_GetLadderLevel(whichPlayer: player): number;

/**
 * 获取天梯排名
 * 获取${玩家}的天梯排名
 * 返回指定玩家的天梯排名
 */
declare function DzAPI_Map_GetLadderRank(whichPlayer: player): number;

/**
 * 获取地图配置
 * 获取地图配置${键名}
 * 根据键名获取地图的配置信息
 */
declare function DzAPI_Map_GetMapConfig(key: string): string;

/**
 * 获取地图等级
 * 获取${玩家}的地图等级
 * 返回指定玩家在当前地图的等级
 */
declare function DzAPI_Map_GetMapLevel(whichPlayer: player): number;

/**
 * 获取地图等级排名
 * 获取${玩家}的地图等级排名
 * 返回指定玩家在当前地图的等级排名
 */
declare function DzAPI_Map_GetMapLevelRank(whichPlayer: player): number;

/**
 * 获取匹配类型
 * 获取当前匹配类型
 * 返回当前游戏的匹配类型
 */
declare function DzAPI_Map_GetMatchType(): number;

/**
 * 获取平台VIP等级
 * 获取${玩家}的平台VIP等级
 * 返回指定玩家的平台VIP等级
 */
declare function DzAPI_Map_GetPlatformVIP(whichPlayer: player): number;

/**
 * 获取公共存档
 * 获取${玩家}的公共存档${键名}
 * 获取指定玩家的公共存档数据
 */
declare function DzAPI_Map_GetPublicArchive(whichPlayer: player, key: string): string;

/**
 * 获取服务器存档掉落
 * 获取${玩家}的服务器存档掉落${键名}
 * 获取指定玩家的服务器存档掉落数据
 */
declare function DzAPI_Map_GetServerArchiveDrop(whichPlayer: player, key: string): string;

/**
 * 获取服务器存档装备
 * 获取${玩家}的服务器存档装备${键名}
 * 获取指定玩家的服务器存档装备数据
 */
declare function DzAPI_Map_GetServerArchiveEquip(whichPlayer: player, key: string): number;

/**
 * 获取服务器数值
 * 获取${玩家}的服务器数值${键名}
 * 获取指定玩家的服务器存储数值
 */
declare function DzAPI_Map_GetServerValue(whichPlayer: player, key: string): string;

/**
 * 获取服务器数值错误码
 * 获取${玩家}的服务器数值错误码
 * 获取指定玩家的服务器数值操作错误码
 */
declare function DzAPI_Map_GetServerValueErrorCode(whichPlayer: player): number;

/**
 * 获取用户ID
 * 获取用户ID
 * 获取玩家的唯一用户标识
 */
/**
 * 获取用户ID
 * 获取指定玩家的唯一用户标识
 */
declare function DzAPI_Map_GetUserID(whichPlayer: player): string;

/**
 * 检查商城物品
 * 检查${玩家}是否拥有商城物品${键名}
 * 检查指定玩家是否拥有指定的商城物品
 */
declare function DzAPI_Map_HasMallItem(whichPlayer: player, key: string): boolean;

/**
 * 是否为蓝钻VIP
 * 检查${玩家}是否为蓝钻VIP
 * 检查指定玩家是否为蓝钻VIP用户
 */
declare function DzAPI_Map_IsBlueVIP(whichPlayer: player): boolean;

/**
 * 是否为RPG天梯
 * 检查当前是否为RPG天梯模式
 * 检查当前游戏模式是否为RPG天梯
 */
declare function DzAPI_Map_IsRPGLadder(): boolean;

/**
 * 是否为RPG大厅
 * 检查当前是否为RPG大厅模式
 * 检查当前游戏模式是否为RPG大厅
 */
declare function DzAPI_Map_IsRPGLobby(): boolean;

/**
 * 是否为红钻VIP
 * 检查${玩家}是否为红钻VIP
 * 检查指定玩家是否为红钻VIP用户
 */
declare function DzAPI_Map_IsRedVIP(whichPlayer: player): boolean;

/**
 * 设置天梯玩家统计
 * 设置${玩家}的天梯统计${键名}为${数值}
 * 设置指定玩家的天梯统计数据
 */
declare function DzAPI_Map_Ladder_SetPlayerStat(
  whichPlayer: player,
  key: string,
  value: string
): void;

/**
 * 设置天梯统计
 * 设置${玩家}的天梯统计${键名}为${数值}
 * 设置指定玩家的天梯统计信息
 */
declare function DzAPI_Map_Ladder_SetStat(whichPlayer: player, key: string, value: string): void;

/**
 * 任务完成
 * ${玩家}完成任务${键名}数值${数值}
 * 标记指定玩家完成某个任务
 */
declare function DzAPI_Map_MissionComplete(whichPlayer: player, key: string, value: string): void;

/**
 * ORPG触发器
 * 触发${玩家}的ORPG事件${键名}
 * 触发指定玩家的ORPG相关事件
 */
declare function DzAPI_Map_OrpgTrigger(whichPlayer: player, key: string): void;

/**
 * 保存公共存档
 * 保存${玩家}的公共存档${键名}为${数值}
 * 保存指定玩家的公共存档数据，返回是否成功
 */
declare function DzAPI_Map_SavePublicArchive(
  whichPlayer: player,
  key: string,
  value: string
): boolean;

/**
 * 保存服务器数值
 * 保存${玩家}的服务器数值${键名}为${数值}
 * 保存指定玩家的服务器数值，返回是否成功
 */
declare function DzAPI_Map_SaveServerValue(
  whichPlayer: player,
  key: string,
  value: string
): boolean;

/**
 * 设置统计数据
 * 设置${玩家}的统计${键名}为${数值}
 * 设置指定玩家的统计数据
 */
declare function DzAPI_Map_Stat_SetStat(whichPlayer: player, key: string, value: string): void;

/**
 * 统计数据
 * 统计数据操作
 * 执行统计数据相关操作
 */
/**
 * 统计数据
 * 提交统计事件：事件键${eventKey}，类型${eventType}，值${value}
 */
declare function DzAPI_Map_Statistics(
  whichPlayer: player,
  eventKey: string,
  eventType: string,
  value: number
): void;

/**
 * 使用消耗品
 * ${玩家}使用消耗品${键名}
 * 玩家使用指定的消耗品物品
 */
declare function DzAPI_Map_UseConsumablesItem(whichPlayer: player, key: string): void;

/**
 * 点击
 * 点击${frame}
 *
 */
declare function DzClickFrame(frame: framehandle): void;

/**
 * 新建Frame
 * 新建Frame名字:${frame}父节点:${parent}ID:${Id}
 * 名字为fdf文件中的名字，ID默认填0。重复创建同名Frame会导致游戏退出时显示崩溃消息，如需避免可以使用Tag创建
 */
declare function DzCreateFrame(frame: string, parent: framehandle, id: number): framehandle;

/**
 * 新建Frame[Tag]
 * 创建类型:${type}名字:${frame}父节点:${parent}模版:${template}ID:${Id}
 * 此处名字可以自定义，类型和模版填写fdf文件中的内容。通过此函数创建的Frame无法获取到子Frame。
 */
declare function DzCreateFrameByTagName(
  frameType: string,
  name: string,
  parent: framehandle,
  template: string,
  id: number
): framehandle;
declare function DzCreateSimpleFrame(frame: string, parent: framehandle, id: number): framehandle;

/**
 * 销毁
 * 销毁${frame}
 * 销毁一个被重复创建过的Frame会导致游戏崩溃，重复创建同名Frame请使用Tag创建
 */
declare function DzDestroyFrame(frame: framehandle): void;

/**
 * 设置可破坏物位置[BZAPI]
 * 设置${可破坏物}的坐标为(${x},${y})
 *
 */
declare function DzDestructablePosition(d: destructable, x: number, y: number): void;

/**
 * 原生-使用宽屏模式
 * 设置宽屏模式:${bool}
 *
 */
declare function DzEnableWideScreen(enable: boolean): void;

/**
 * 异步执行函数
 * 异步执行函数${funcName}
 *
 */
declare function DzExecuteFunc(funcName: string): void;

/**
 * 限制鼠标移动
 * 限制鼠标在${frame}内:${enable}
 *
 */
declare function DzFrameCageMouse(frame: framehandle, enable: boolean): void;

/**
 * 清空所有锚点
 * 清空${frame}的全部锚点
 *
 */
declare function DzFrameClearAllPoints(frame: framehandle): void;

/**
 * 原生-修改游戏渲染黑边范围
 * 修改游戏渲染黑边:上方高度:${upperHeight}下方高度:${bottomHeight}
 *
 */
declare function DzFrameEditBlackBorders(upperHeight: number, bottomHeight: number): void;

/**
 * 获取子Frame
 * 获取名字为${name}的子FrameID:${Id}
 * ID默认填0，同名时优先获取最后被创建的。非Simple类的Frame类型都用此函数来获取子Frame。
 */
declare function DzFrameFindByName(name: string, id: number): framehandle;

/**
 * 获取Frame的透明度(0-255)
 * 获取${Frame}的透明度
 *
 */
declare function DzFrameGetAlpha(frame: framehandle): number;

/**
 * 原生-玩家聊天信息框
 * 玩家聊天信息框
 *
 */
declare function DzFrameGetChatMessage(): framehandle;

/**
 * 原生-技能按钮
 * 技能按钮:(${row},${calumn})
 * 参考物编中的技能按钮(x,y)坐标
 */
declare function DzFrameGetCommandBarButton(row: number, column: number): framehandle;

/**
 * 控件是否启用
 * ${frame}是否启用
 *
 */
declare function DzFrameGetEnable(frame: framehandle): boolean;

/**
 * 获取Frame的高度[NEW]
 * 获取${frame}的高度
 *
 */
declare function DzFrameGetHeight(frame: framehandle): number;

/**
 * 原生-英雄按钮
 * 英雄按钮:${buttnoid}
 * 左侧的英雄头像，参数表示第N+1个英雄，索引从0开始
 */
declare function DzFrameGetHeroBarButton(buttonId: number): framehandle;

/**
 * 原生-英雄血条
 * 英雄血条:${buttnoid}
 * 左侧的英雄头像下的血条，参数表示第N+1个英雄，索引从0开始
 */
declare function DzFrameGetHeroHPBar(buttonId: number): framehandle;

/**
 * 原生-英雄蓝条
 * 英雄蓝条:${buttnoid}
 * 左侧的英雄头像下的蓝条，参数表示第N+1个英雄，索引从0开始
 */
declare function DzFrameGetHeroManaBar(buttonId: number): framehandle;

/**
 * 原生-物品栏按钮
 * 物品栏按钮:${buttnoid}
 * 索引从0开始
 */
declare function DzFrameGetItemBarButton(buttonId: number): framehandle;

/**
 * 原生-小地图
 * 小地图
 *
 */
declare function DzFrameGetMinimap(): framehandle;

/**
 * 原生-小地图按钮
 * 小地图按钮:${buttnoid}
 * 小地图右侧竖排按钮，索引从0开始
 */
declare function DzFrameGetMinimapButton(buttonId: number): framehandle;

/**
 * 获取Frame的名称[NEW]
 * 获取${frame}的名称
 *
 */
declare function DzFrameGetName(frame: framehandle): string;

/**
 * 获取Frame的Parent[NEW]
 * 获取${frame}的Parent
 *
 */
declare function DzFrameGetParent(frame: framehandle): framehandle;

/**
 * 原生-单位大头像
 * 单位大头像
 * 小地图右侧的大头像
 */
declare function DzFrameGetPortrait(): framehandle;

/**
 * 获取Frame内的文字
 * 获取${buttnoid}的文字
 * （支持EditBox,TextFrame,TextArea,SimpleFontString）
 */
declare function DzFrameGetText(frame: framehandle): string;

/**
 * 获取Frame的字数限制
 * 获取${frame}的字数限制
 * （支持EditBox）
 */
declare function DzFrameGetTextSizeLimit(frame: framehandle): number;

/**
 * 原生-鼠标提示
 * 鼠标提示
 * 鼠标移动到物品或技能按钮上显示的提示窗，初始位于技能栏上方
 */
declare function DzFrameGetTooltip(): framehandle;

/**
 * 原生-上方消息框
 * 上方消息框
 * 高维修费用等消息
 */
declare function DzFrameGetTopMessage(): framehandle;

/**
 * 原生-系统消息框
 * 系统消息框
 * 包含显示消息给玩家及显示Debug消息等，
 */
declare function DzFrameGetUnitMessage(): framehandle;

/**
 * 原生-界面按钮
 * 界面按钮:${buttnoid}
 * 左上的菜单等按钮，索引从0开始
 */
declare function DzFrameGetUpperButtonBarButton(buttonId: number): framehandle;

/**
 * 获取当前值
 * 获取${frame}当前值
 * （支持Slider、SimpleStatusBar、StatusBar）
 */
declare function DzFrameGetValue(frame: framehandle): number;

/**
 * 原生-隐藏界面元素
 * 隐藏所有界面UI
 * 不再在地图初始化时调用则会残留小地图和时钟模型
 */
declare function DzFrameHideInterface(): void;

/**
 * 设置绝对位置
 * 设置${frame}的${Point}锚点在(${x},${y})
 *
 */
declare function DzFrameSetAbsolutePoint(
  frame: framehandle,
  point: number,
  x: number,
  y: number
): void;

/**
 * 移动所有锚点到Frame
 * 移动${frame}的所有锚点到${frame}上
 *
 */
declare function DzFrameSetAllPoints(frame: framehandle, relativeFrame: framehandle): boolean;

/**
 * 设置透明度(0-255)
 * 设置${frame}的透明度为${alpha}
 *
 */
declare function DzFrameSetAlpha(frame: framehandle, alpha: number): void;

/**
 * 设置动画
 * 设置${frame}播放序号${alpha}的动画自动播放:${autocast}
 *
 */
declare function DzFrameSetAnimate(frame: framehandle, animId: number, autocast: boolean): void;

/**
 * 设置动画进度
 * 设置${frame}的动画进度为:${offset}
 * 自动播放为false是可用
 */
declare function DzFrameSetAnimateOffset(frame: framehandle, offset: number): void;

/**
 * 启用/禁用
 * 设置${frame}启用:${bottomHeight}
 *
 */
declare function DzFrameSetEnable(name: framehandle, enable: boolean): void;

/**
 * 设置焦点
 * 设置${frame}获取焦点${enable}
 *
 */
declare function DzFrameSetFocus(frame: framehandle, enable: boolean): boolean;

/**
 * 设置字体[NEW]
 * 设置${frame}的字体为${font},大小${height},flag${flag}
 * 支持EditBox、SimpleFontString、SimpleMessageFrame以及非SimpleFrame类型的例如TEXT，flag作用未知
 */
declare function DzFrameSetFont(
  frame: framehandle,
  fileName: string,
  height: number,
  flag: number
): void;

/**
 * 设置最大/最小值
 * 设置${frame}的最小值为${Min}最大值为${Max}
 * （支持Slider、SimpleStatusBar、StatusBar）
 */
declare function DzFrameSetMinMaxValue(
  frame: framehandle,
  minValue: number,
  maxValue: number
): void;

/**
 * 设置模型
 * 设置${frame}的模型文件为${modelFile}ModelType:${modelType}Flag:${flag}
 *
 */
declare function DzFrameSetModel(
  frame: framehandle,
  modelFile: string,
  modelType: number,
  flag: number
): void;

/**
 * 设置父窗口[NEW]
 * 设置${frame}的父窗口为${frame2}
 *
 */
declare function DzFrameSetParent(frame: framehandle, parent: framehandle): void;

/**
 * 设置相对位置
 * 设置${frame}的${Point}锚点(跟随Frame-->${relativeFrame}的${relativePoint}锚点)偏移(${x},${y})
 *
 */
declare function DzFrameSetPoint(
  frame: framehandle,
  point: number,
  relativeFrame: framehandle,
  relativePoint: number,
  x: number,
  y: number
): void;

/**
 * 设置优先级[NEW]
 * 设置${frame}优先级:${int}
 *
 */
declare function DzFrameSetPriority(frame: framehandle, priority: number): void;

/**
 * 设置缩放
 * 设置${frame}的缩放${scale}
 *
 */
declare function DzFrameSetScale(frame: framehandle, scale: number): void;

/**
 * 注册UI事件回调(funcname)
 * 注册${frame}的${事件类型}事件运行:${funcname}是否同步:${sync}
 *
 */
declare function DzFrameSetScript(
  frame: framehandle,
  eventId: number,
  func: string,
  sync: boolean
): void;

/**
 * 注册UI事件回调(funchandle)
 * 注册${frame}的${事件类型}事件运行:${codehandle}是否同步:${sync}
 * 运行触发器时需要打开同步
 */
declare function DzFrameSetScriptByCode(
  frame: framehandle,
  eventId: number,
  funcHandle: () => void,
  sync: boolean
): void;

/**
 * 设置大小
 * 设置${frame}（宽${w}高${h}）
 *
 */
declare function DzFrameSetSize(frame: framehandle, w: number, h: number): void;

/**
 * 设置步进值
 * 设置${frame}的步进值为${step}
 * （支持Slider）
 */
declare function DzFrameSetStepValue(frame: framehandle, step: number): void;

/**
 * 设置文本
 * 设置${frame}的文本为${string}
 * (支持EditBox,TextFrame,TextArea,SimpleFontString、GlueEditBoxWar3、SlashChatBox、TimerTextFrame、TextButtonFrame、GlueTextButton)
 */
declare function DzFrameSetText(frame: framehandle, text: string): void;

/**
 * 设置对齐方式[NEW]
 * 设置${frame}的对齐方式为${align}
 * 支持TextFrame、SimpleFontString、SimpleMessageFrame
 */
declare function DzFrameSetTextAlignment(frame: framehandle, align: number): void;

/**
 * 设置文本颜色
 * 设置${frame}的文本颜色为${color}
 * 修改Frame的文本显示颜色
 */
declare function DzFrameSetTextColor(frame: framehandle, color: number): void;

/**
 * 设置字数限制
 * 设置${frame}的字数限制为${size}
 *
 */
declare function DzFrameSetTextSizeLimit(frame: framehandle, size: number): void;

/**
 * 设置贴图
 * 设置${frame}的贴图为:${texture}是否平铺${flag}
 * （支持Backdrop、SimpleStatusBar）
 */
declare function DzFrameSetTexture(frame: framehandle, texture: string, flag: number): void;

/**
 * 设置提示
 * 设置${frame}的提示Frame为${tooltip}
 * 设置tooltip
 */
declare function DzFrameSetTooltip(frame: framehandle, tooltip: framehandle): void;
declare function DzFrameSetUpdateCallback(func: string): void;
declare function DzFrameSetUpdateCallbackByCode(funcHandle: () => void): void;

/**
 * 设置当前值
 * 设置${frame}的当前值为${value}
 * （支持Slider、SimpleStatusBar、StatusBar）
 */
declare function DzFrameSetValue(frame: framehandle, value: number): void;

/**
 * 设置颜色
 * 设置${frame}颜色${color}
 *
 */
declare function DzFrameSetVertexColor(frame: framehandle, color: number): void;

/**
 * 显示/隐藏
 * 设置${frame}显示:${bottomHeight}
 *
 */
declare function DzFrameShow(frame: framehandle, enable: boolean): void;
/** 获取客户端高度（像素） */
declare function DzGetClientHeight(): number;
/** 获取客户端宽度（像素） */
declare function DzGetClientWidth(): number;

/**
 * 取RGBA色值
 * 红色:${Red}绿色:${Green}蓝色:${Blue}透明度:${Alpha}
 * 返回一个整数，用于设置Frame颜色
 */
declare function DzGetColor(r: number, g: number, b: number, a: number): number;
/**
 * 获取世界坐标转屏幕坐标后的X
 * 配合 DzConvertWorldPosition 异步转换，返回最近一次转换后的屏幕X
 */
declare function DzGetConvertWorldPositionX(): number;
/**
 * 获取世界坐标转屏幕坐标后的Y
 * 配合 DzConvertWorldPosition 异步转换，返回最近一次转换后的屏幕Y
 */
declare function DzGetConvertWorldPositionY(): number;

/**
 * 原生-游戏UI
 * 游戏UI
 * 一般用作创建自定义UI的父节点
 */
declare function DzGetGameUI(): framehandle;

/**
 * 获取客户端语言[NEW]
 * 获取客户端语言
 * 对不同语言客户端返回不同
 */
declare function DzGetLocale(): string;

/**
 * 鼠标所在的Frame控件指针
 * 不是所有类型的Frame都能响应鼠标，能响应的有BUTTON，TEXT等
 */
declare function DzGetMouseFocus(): framehandle;

/**
 * 获取鼠标在游戏内的坐标X
 */
declare function DzGetMouseTerrainX(): number;

/**
 * 获取鼠标在游戏内的坐标Y
 *
 */
declare function DzGetMouseTerrainY(): number;

/**
 * 获取鼠标在游戏内的坐标Z
 *
 */
declare function DzGetMouseTerrainZ(): number;

/**
 * 获取鼠标在屏幕的坐标X
 *
 */
declare function DzGetMouseX(): number;

/**
 * 获取鼠标游戏窗口坐标X
 *
 */
declare function DzGetMouseXRelative(): number;

/**
 * 获取鼠标在屏幕的坐标Y
 *
 */
declare function DzGetMouseY(): number;

/**
 * 获取鼠标游戏窗口坐标Y
 *
 */
declare function DzGetMouseYRelative(): number;

/**
 * 事件响应-获取触发的按键
 * 获取触发的按键
 * 响应[硬件]-按键事件
 */
declare function DzGetTriggerKey(): number;

/**
 * 事件响应-获取触发硬件事件的玩家
 * 获取触发硬件事件的玩家
 * 响应[硬件]-按键事件滚轮事件窗口大小变化事件
 */
declare function DzGetTriggerKeyPlayer(): player;

/**
 * 事件响应-获取同步的数据
 * 获取同步的数据
 * 响应[同步]-同步消息事件
 */
declare function DzGetTriggerSyncData(): string;

/**
 * 事件响应-获取同步数据的玩家
 * 获取同步数据的玩家
 * 响应[同步]-同步消息事件
 */
declare function DzGetTriggerSyncPlayer(): player;

/**
 * 事件响应-触发的Frame
 * 触发的Frame
 *
 */
declare function DzGetTriggerUIEventFrame(): framehandle;

/**
 * 事件响应-获取触发ui的玩家
 * 获取触发ui的玩家
 *
 */
declare function DzGetTriggerUIEventPlayer(): player;

/**
 * 获取升级所需经验[NEW]
 * 获取单位${unit}的${level}级升级所需经验
 *
 */
declare function DzGetUnitNeededXP(whichUnit: unit, level: number): number;

/**
 * 获取鼠标指向的单位
 * 鼠标指向的单位
 *
 */
declare function DzGetUnitUnderMouse(): unit;

/**
 * 事件响应-获取滚轮变化值
 * 获取滚轮变化值
 * 响应[硬件]-鼠标滚轮事件，正负区分上下
 */
declare function DzGetWheelDelta(): number;

/**
 * 获取魔兽窗口高度
 *
 */
declare function DzGetWindowHeight(): number;

/**
 * 获取war3窗口宽度
 * 获取魔兽窗口宽度
 *
 */
declare function DzGetWindowWidth(): number;

/**
 * 获取魔兽窗口X坐标
 *
 */
declare function DzGetWindowX(): number;

/**
 * 获取魔兽窗口Y坐标
 *
 */
declare function DzGetWindowY(): number;

/**
 * 判断按键是否按下
 * 判断${按键}是否按下
 *
 */
declare function DzIsKeyDown(iKey: number): boolean;

/**
 * 鼠标是否在游戏内
 *
 */
declare function DzIsMouseOverUI(): boolean;

/**
 * 判断游戏窗口是否处于活动状态
 *
 */
declare function DzIsWindowActive(): boolean;

/**
 * 加载Toc文件列表
 * 加载-->${fileName.toc}
 * 载入自己的fdf列表文件
 */
declare function DzLoadToc(fileName: string): void;
declare function DzOriginalUIAutoResetPoint(enable: boolean): void;

/**
 * 原生-修改屏幕比例(FOV)
 * 修改屏幕比例(FOV):${val}
 *
 */
declare function DzSetCustomFovFix(value: number): void;

/**
 * 设置内存数值
 * 设置内存数据${地址}=${数值}
 *
 */
declare function DzSetMemory(address: number, value: number): void;

/**
 * 设置鼠标的坐标
 * 设置鼠标的坐标为(${x},${y})
 *
 */
declare function DzSetMousePos(x: number, y: number): void;

/**
 * 替换单位类型[BZAPI]
 * 替换${单位}的单位类型为:${type}
 * 不会替换大头像中的模型
 */
declare function DzSetUnitID(whichUnit: unit, id: number): void;

/**
 * 替换单位模型[BZAPI]
 * 替换${单位}的模型:${path}
 * 不会替换大头像中的模型
 */
declare function DzSetUnitModel(whichUnit: unit, path: string): void;

/**
 * 设置单位位置-本地调用[BZAPI]
 * 设置${单位}的坐标为(${x},${y})
 *
 */
declare function DzSetUnitPosition(whichUnit: unit, x: number, y: number): void;

/**
 * 替换单位贴图[BZAPI]
 * 替换${单位}的贴图:${path}TexId:${texId})
 * 只能替换模型中有ReplaceableIDx贴图的模型，ID为索引。不会替换大头像中的模型
 */
declare function DzSetUnitTexture(whichUnit: unit, path: string, texId: number): void;

/**
 * 原生-设置小地图背景贴图
 * 修改小地图背景贴图为${bottomHeight}
 *
 */
declare function DzSetWar3MapMap(map: string): void;

/**
 * 获取子SimpleFontString
 * 获取名字为${name}的子SimpleFontStringID:${Id}
 * ID默认填0，同名时优先获取最后被创建的。SimpleFontString为fdf中的Frame类型。
 */
declare function DzSimpleFontStringFindByName(name: string, id: number): framehandle;

/**
 * 获取子SimpleFrame
 * 获取名字为${name}的子SimpleFrameID:${Id}
 * ID默认填0，同名时优先获取最后被创建的。SimpleFrame为fdf中的Frame类型。
 */
declare function DzSimpleFrameFindByName(name: string, id: number): framehandle;

/**
 * 获取子SimpleTexture
 * 获取名字为${name}的子SimpleTextureID:${Id}
 * ID默认填0，同名时优先获取最后被创建的。SimpleTexture为fdf中的Frame类型。
 */
declare function DzSimpleTextureFindByName(name: string, id: number): framehandle;

/**
 * 同步游戏数据
 * 同步标签：${prefix}发送数据：${data}
 *
 */
declare function DzSyncData(prefix: string, data: string): void;

/**
 * 立即同步游戏数据
 * 立即同步标签${prefix}的数据${data}
 */
declare function DzSyncDataImmediately(prefix: string, data: string): void;
declare function DzTriggerRegisterKeyEvent(
  trig: trigger,
  key: number,
  status: number,
  sync: boolean,
  func: string
): void;
declare function DzTriggerRegisterKeyEventByCode(
  trig: trigger,
  key: number,
  status: number,
  sync: boolean,
  funcHandle: () => void
): void;
declare function DzTriggerRegisterMouseEvent(
  trig: trigger,
  btn: number,
  status: number,
  sync: boolean,
  func: string
): void;
declare function DzTriggerRegisterMouseEventByCode(
  trig: trigger,
  btn: number,
  status: number,
  sync: boolean,
  funcHandle: () => void
): void;
declare function DzTriggerRegisterMouseMoveEvent(trig: trigger, sync: boolean, func: string): void;
declare function DzTriggerRegisterMouseMoveEventByCode(
  trig: trigger,
  sync: boolean,
  funcHandle: () => void
): void;
declare function DzTriggerRegisterMouseWheelEvent(trig: trigger, sync: boolean, func: string): void;
declare function DzTriggerRegisterMouseWheelEventByCode(
  trig: trigger,
  sync: boolean,
  funcHandle: () => void
): void;

/**
 * 数据同步
 * 标签为${prefix}的数据被同步|来自平台:${server}
 * 来自平台的参数填false
 */
declare function DzTriggerRegisterSyncData(trig: trigger, prefix: string, server: boolean): void;
declare function DzTriggerRegisterWindowResizeEvent(
  trig: trigger,
  sync: boolean,
  func: string
): void;
declare function DzTriggerRegisterWindowResizeEventByCode(
  trig: trigger,
  sync: boolean,
  funcHandle: () => void
): void;
declare function EXDisplayChat(p: player, chat_recipient: number, message: string): void;

/**
 * 重置变换[JAPI][New!]
 * 重置${特效}
 * 清空所有的旋转和缩放，重置为初始状态。
 */
declare function EXEffectMatReset(e: effect): void;

/**
 * 绕X轴旋转[JAPI][New!]
 * ${特效}绕X轴旋转${度}度
 * 多次调用，效果会叠加，不想叠加需要先重置为初始状态。
 */
declare function EXEffectMatRotateX(e: effect, angle: number): void;

/**
 * 绕Y轴旋转[JAPI][New!]
 * ${特效}绕Y轴旋转${度}度
 * 多次调用，效果会叠加，不想叠加需要先重置为初始状态。
 */
declare function EXEffectMatRotateY(e: effect, angle: number): void;

/**
 * 绕Z轴旋转[JAPI][New!]
 * ${特效}绕Z轴旋转${度}度
 * 多次调用，效果会叠加，不想叠加需要先重置为初始状态。
 */
declare function EXEffectMatRotateZ(e: effect, angle: number): void;

/**
 * 缩放[JAPI][New!]
 * 设置${特效}的X轴缩放[${缩放}]，Y轴缩放[${缩放}]，Z轴缩放[${缩放}]。
 * 多次调用，效果会叠加，不想叠加需要先重置为初始状态。设置为2,2,2时相当于大小变为2倍。设置为负数时，就是镜像翻转。
 */
declare function EXEffectMatScale(e: effect, x: number, y: number, z: number): void;
declare function EXExecuteScript(script: string): string;
declare function EXGetAbilityDataInteger(abil: ability, level: number, data_type: number): number;
declare function EXGetAbilityDataReal(abil: ability, level: number, data_type: number): number;
declare function EXGetAbilityDataString(abil: ability, level: number, data_type: number): string;
declare function EXGetAbilityId(abil: ability): number;
declare function EXGetAbilityState(abil: ability, state_type: number): number;
/**
 * 获取技能字符串属性[JAPI]
 * 读取技能的字符串字段：键${key}
 */
declare function EXGetAbilityString(abil: ability, key: string): string;
declare function EXGetBuffDataString(buffcode: number, data_type: number): string;

/**
 * 大小[JAPI][New!]
 * ${特效}的大小
 *
 */
declare function EXGetEffectSize(e: effect): number;

/**
 * X轴坐标[JAPI][New!]
 * ${特效}的X轴坐标
 *
 */
declare function EXGetEffectX(e: effect): number;

/**
 * Y轴坐标[JAPI][New!]
 * ${特效}的Y轴坐标
 *
 */
declare function EXGetEffectY(e: effect): number;

/**
 * 高度[JAPI][New!]
 * ${特效}的高度
 *
 */
declare function EXGetEffectZ(e: effect): number;
declare function EXGetEventDamageData(edd_type: number): number;
declare function EXGetItemDataString(itemcode: number, data_type: number): string;
declare function EXGetUnitAbility(u: unit, abilcode: number): ability;
declare function EXGetUnitAbilityByIndex(u: unit, index: number): ability;
/** 获取单位数组型字符串数据[JAPI] */
declare function EXGetUnitArrayString(uid: number, id: number, n: number): string;
/** 获取单位整型数据[JAPI] */
declare function EXGetUnitInteger(uid: number, id: number, n: number): number;
/** 获取单位实数数据[JAPI] */
declare function EXGetUnitReal(uid: number, id: number, n: number): number;
/** 获取单位字符串数据[JAPI] */
declare function EXGetUnitString(uid: number, id: number, n: number): string;
declare function EXPauseUnit(u: unit, flag: boolean): void;
declare function EXSetAbilityAEmeDataA(abil: ability, unitid: number): boolean;
declare function EXSetAbilityDataInteger(
  abil: ability,
  level: number,
  data_type: number,
  value: number
): boolean;
declare function EXSetAbilityDataReal(
  abil: ability,
  level: number,
  data_type: number,
  value: number
): boolean;
declare function EXSetAbilityDataString(
  abil: ability,
  level: number,
  data_type: number,
  value: string
): boolean;
declare function EXSetAbilityState(abil: ability, state_type: number, value: number): boolean;
/**
 * 设置技能字符串属性[JAPI]
 * 写入技能的字符串字段：键${key}，值${value}
 */
declare function EXSetAbilityString(abil: ability, key: string, value: string): boolean;
declare function EXSetBuffDataString(buffcode: number, data_type: number, value: string): boolean;

/**
 * 设置大小[JAPI][New!]
 * 设置${特效}的大小为${大小}
 *
 */
declare function EXSetEffectSize(e: effect, size: number): void;

/**
 * 设置动画速度[JAPI][New!]
 * 设置${特效}的动画速度为${动画速度}
 *
 */
declare function EXSetEffectSpeed(e: effect, speed: number): void;

/**
 * 移动到坐标[JAPI][New!]
 * 移动${特效}到（${X},${Y}）
 *
 */
declare function EXSetEffectXY(e: effect, x: number, y: number): void;

/**
 * 设置高度[JAPI][New!]
 * 设置${特效}的高度为${高度}
 *
 */
declare function EXSetEffectZ(e: effect, z: number): void;
declare function EXSetEventDamage(amount: number): boolean;
declare function EXSetItemDataString(itemcode: number, data_type: number, value: string): boolean;
/**
 * 设置单位数组型字符串数据[JAPI]
 * 为单位类型UID写入字符串数组字段：索引${n}，字段ID${id}，值${name}
 * 返回是否写入成功
 */
declare function EXSetUnitArrayString(uid: number, id: number, n: number, name: string): boolean;

/**
 * 设置单位的碰撞类型[JAPI][New!]
 * ${启用/禁用}${单位}对${碰撞}的碰撞
 *
 */
declare function EXSetUnitCollisionType(enable: boolean, u: unit, t: number): void;

/**
 * 设置单位面向角度[JAPI][New!]
 * 设置${单位}的面向角度为${Angle}度
 * 立即转身
 */
declare function EXSetUnitFacing(u: unit, angle: number): void;
/**
 * 设置单位整型数据[JAPI]
 * 为单位类型UID写入整数字段：字段ID${id}，索引${n}
 * 返回是否写入成功
 */
declare function EXSetUnitInteger(uid: number, id: number, n: number): boolean;

/**
 * 设置单位的移动类型[JAPI][New!]
 * 设置${单位}的移动类型为${Value}
 *
 */
declare function EXSetUnitMoveType(u: unit, t: number): void;

/**
 * 伤害值
 * 单位所受伤害
 * 响应'受到伤害'单位事件,指代单位所受伤害.
 */
declare function GetEventDamage(): number;

/**
 * 属性[R]
 * ${单位}的${Property}
 *
 */
declare function GetUnitState(whichUnit: unit, whichUnitState: unitstate): number;
declare function RequestExtraBooleanData(
  dataType: number,
  whichPlayer: player,
  param1: string,
  param2: string,
  param3: boolean,
  param4: number,
  param5: number,
  param6: number
): boolean;
declare function RequestExtraIntegerData(
  dataType: number,
  whichPlayer: player,
  param1: string,
  param2: string,
  param3: boolean,
  param4: number,
  param5: number,
  param6: number
): number;
declare function RequestExtraRealData(
  dataType: number,
  whichPlayer: player,
  param1: string,
  param2: string,
  param3: boolean,
  param4: number,
  param5: number,
  param6: number
): number;
declare function RequestExtraStringData(
  dataType: number,
  whichPlayer: player,
  param1: string,
  param2: string,
  param3: boolean,
  param4: number,
  param5: number,
  param6: number
): string;

/**
 * 设置单位属性[R]
 * 设置${单位}的${属性}为${Value}
 *
 */
declare function SetUnitState(whichUnit: unit, whichUnitState: unitstate, newVal: number): void;

// ============= KKAPI 扩展函数 =============

/**
 * 获取当前选中的主要单位
 * 获取当前选中的主要单位
 * 返回玩家当前选中的主要单位，通常是选中单位组中的第一个单位
 */
declare function DzGetSelectedLeaderUnit(): unit;

/**
 * 判断聊天框是否打开
 * 判断聊天框是否打开
 * 检测玩家是否正在使用聊天框输入文字
 */
declare function DzIsChatBoxOpen(): boolean;

/**
 * 设置单位预选UI可见性
 * 设置${单位}预选UI显示:${可见性}
 * 控制单位的预选择界面是否可见
 */
declare function DzSetUnitPreselectUIVisible(whichUnit: unit, visible: boolean): void;

/**
 * 设置特效动画
 * 设置${特效}播放动画序号${序号}标志${标志}
 * 控制特效播放指定索引的动画
 */
declare function DzSetEffectAnimation(whichEffect: effect, index: number, flag: number): void;

/**
 * 设置特效位置
 * 设置${特效}位置到(${X},${Y},${Z})
 * 移动特效到指定的三维坐标
 */
declare function DzSetEffectPos(whichEffect: effect, x: number, y: number, z: number): void;

/**
 * 设置特效顶点颜色
 * 设置${特效}颜色${颜色}
 * 修改特效的整体颜色
 */
declare function DzSetEffectVertexColor(whichEffect: effect, color: number): void;

/**
 * 设置特效透明度
 * 设置${特效}透明度${透明度}
 * 修改特效的透明度，范围0-255
 */
declare function DzSetEffectVertexAlpha(whichEffect: effect, alpha: number): void;

/**
 * 设置特效模型
 * 设置${特效}模型为${模型路径}
 * 更换特效使用的模型文件
 */
declare function DzSetEffectModel(whichEffect: effect, model: string): void;

/**
 * 设置特效队伍颜色
 * 设置${特效}队伍颜色为玩家${玩家ID}的颜色
 * 将特效颜色设置为指定玩家的队伍颜色
 */
declare function DzSetEffectTeamColor(whichHandle: effect, playerId: number): void;

/**
 * 设置Frame剪切
 * 设置${Frame}剪切${启用}
 * 控制Frame是否启用剪切功能，超出范围的部分会被裁剪
 */
declare function DzFrameSetClip(whichframe: framehandle, enable: boolean): void;

/**
 * 改变窗口大小
 * 改变窗口大小为宽度${宽度}高度${高度}
 * 修改游戏窗口的尺寸，返回是否成功
 */
declare function DzChangeWindowSize(width: number, height: number): boolean;

/**
 * 播放特效动画
 * 播放${特效}动画${动画名}连接点${连接点}
 * 播放特效的指定动画，可指定连接点
 */
declare function DzPlayEffectAnimation(whichEffect: effect, anim: string, link: string): void;

/**
 * 绑定特效
 * 绑定${特效}到${父对象}的${连接点}
 * 将特效绑定到指定对象的连接点上
 */
declare function DzBindEffect(parent: widget, attachPoint: string, whichEffect: effect): void;

/**
 * 解绑特效
 * 解绑${特效}
 * 解除特效与对象的绑定关系
 */
declare function DzUnbindEffect(whichEffect: effect): void;

/**
 * 设置控件精灵缩放
 * 设置${控件}精灵缩放${缩放值}
 * 修改控件精灵的缩放比例
 */
declare function DzSetWidgetSpriteScale(whichUnit: widget, scale: number): void;

/**
 * 设置特效缩放
 * 设置${特效}缩放${缩放值}
 * 修改特效的整体缩放比例
 */
declare function DzSetEffectScale(whichHandle: effect, scale: number): void;

/**
 * 获取特效顶点颜色
 * 获取${特效}的顶点颜色
 * 返回特效当前的顶点颜色值
 */
declare function DzGetEffectVertexColor(whichEffect: effect): number;

/**
 * 获取特效透明度
 * 获取${特效}的透明度
 * 返回特效当前的透明度值
 */
declare function DzGetEffectVertexAlpha(whichEffect: effect): number;

/**
 * 获取物品技能
 * 获取${物品}的第${索引}个技能
 * 返回物品指定索引位置的技能
 */
declare function DzGetItemAbility(whichEffect: item, index: number): ability;

/**
 * 获取Frame子控件数量
 * 获取${Frame}的子控件数量
 * 返回指定Frame包含的子控件数量
 */
declare function DzFrameGetChildrenCount(whichframe: framehandle): number;

/**
 * 获取Frame子控件
 * 获取${Frame}的第${索引}个子控件
 * 返回指定Frame的第几个子控件
 */
declare function DzFrameGetChild(whichframe: framehandle, index: number): framehandle;

/**
 * 解锁BLP尺寸限制
 * 解锁BLP尺寸限制${启用}
 * 移除BLP贴图文件的尺寸限制
 */
declare function DzUnlockBlpSizeLimit(enable: boolean): void;

/**
 * 获取活跃的商店单位
 * 获取${商店}对${玩家}的活跃状态
 * 返回对指定玩家活跃的商店单位
 */
declare function DzGetActivePatron(store: unit, p: player): unit;

/**
 * 获取本地选中单位数量
 * 获取本地选中单位数量
 * 返回当前选中的单位数量
 */
declare function DzGetLocalSelectUnitCount(): number;

/**
 * 切换FPS显示
 * 切换FPS显示${显示}
 * 控制是否显示帧率信息
 */
declare function DzToggleFPS(show: boolean): void;

/**
 * 获取FPS
 * 获取当前FPS
 * 返回当前的帧率值
 */
declare function DzGetFPS(): number;

/**
 * 世界坐标转小地图X坐标
 * 世界坐标(${X},${Y})转小地图X坐标
 * 将世界坐标转换为小地图上的X坐标
 */
declare function DzFrameWorldToMinimapPosX(x: number, y: number): number;

/**
 * 世界坐标转小地图Y坐标
 * 世界坐标(${X},${Y})转小地图Y坐标
 * 将世界坐标转换为小地图上的Y坐标
 */
declare function DzFrameWorldToMinimapPosY(x: number, y: number): number;

/**
 * 设置控件小地图图标
 * 设置${单位}小地图图标为${路径}
 * 更改单位在小地图上显示的图标
 */
declare function DzWidgetSetMinimapIcon(whichunit: unit, path: string): void;

/**
 * 设置控件小地图图标启用
 * 设置${单位}小地图图标启用${启用}
 * 控制单位在小地图上的图标是否显示
 */
declare function DzWidgetSetMinimapIconEnable(whichunit: unit, enable: boolean): void;

/**
 * 简单消息Frame添加消息
 * 向${Frame}添加消息${文本}颜色${颜色}持续时间${持续时间}永久${永久}
 * 向简单消息Frame添加一条消息
 */
declare function DzSimpleMessageFrameAddMessage(
  whichframe: framehandle,
  text: string,
  color: number,
  duration: number,
  permanent: boolean
): void;

/**
 * 清空简单消息Frame
 * 清空${Frame}的所有消息
 * 清除简单消息Frame中的所有消息
 */
declare function DzSimpleMessageFrameClear(whichframe: framehandle): void;

/**
 * 转换屏幕坐标到世界坐标X
 * 屏幕坐标(${X},${Y})转世界X坐标
 * 将屏幕坐标转换为世界坐标的X分量
 */
declare function DzConvertScreenPositionX(x: number, y: number): number;

/**
 * 转换屏幕坐标到世界坐标Y
 * 屏幕坐标(${X},${Y})转世界Y坐标
 * 将屏幕坐标转换为世界坐标的Y分量
 */
declare function DzConvertScreenPositionY(x: number, y: number): number;

/**
 * 注册建筑选位置事件
 * 注册建筑选位置事件${函数}
 * 监听玩家选择建筑位置的本地事件
 */
declare function DzRegisterOnBuildLocal(func: () => void): void;

/**
 * 获取建筑选择命令ID
 * 获取建筑选择命令ID
 * 返回当前建筑选择的命令ID，等于0时是结束事件
 */
declare function DzGetOnBuildOrderId(): number;

/**
 * 获取建筑选择命令类型
 * 获取建筑选择命令类型
 * 返回当前建筑选择的命令类型
 */
declare function DzGetOnBuildOrderType(): number;

/**
 * 获取建筑选择执行者
 * 获取建筑选择执行者
 * 返回执行建筑选择的控件对象
 */
declare function DzGetOnBuildAgent(): widget;

/**
 * 注册技能选目标事件
 * 注册技能选目标事件${函数}
 * 监听玩家选择技能目标的本地事件
 */
declare function DzRegisterOnTargetLocal(func: () => void): void;

/**
 * 获取技能选择技能ID
 * 获取技能选择技能ID
 * 返回当前技能选择的技能ID，等于0时是结束事件
 */
declare function DzGetOnTargetAbilId(): number;

/**
 * 获取技能选择命令ID
 * 获取技能选择命令ID
 * 返回当前技能选择的命令ID
 */
declare function DzGetOnTargetOrderId(): number;

/**
 * 获取技能选择命令类型
 * 获取技能选择命令类型
 * 返回当前技能选择的命令类型
 */
declare function DzGetOnTargetOrderType(): number;

/**
 * 获取技能选择执行者
 * 获取技能选择执行者
 * 返回执行技能选择的控件对象
 */
declare function DzGetOnTargetAgent(): widget;

/**
 * 获取技能选择即时目标
 * 获取技能选择即时目标
 * 返回技能选择的即时目标控件
 */
declare function DzGetOnTargetInstantTarget(): widget;

/**
 * 打开QQ群链接
 * 打开QQ群链接${URL}
 * 在浏览器中打开指定的QQ群链接，返回是否成功
 */
declare function DzOpenQQGroupUrl(url: string): boolean;

/**
 * 启用Frame剪切矩形
 * 启用Frame剪切矩形${启用}
 * 控制Frame的剪切矩形功能
 */
declare function DzFrameEnableClipRect(enable: boolean): void;

/**
 * 设置单位头像
 * 设置${单位}头像为${模型文件}
 * 更改单位在UI中显示的头像模型
 */
declare function DzSetUnitPortrait(whichUnit: unit, modelFile: string): void;

/**
 * 设置单位描述
 * 设置${单位}描述为${描述}
 * 更改单位的描述文本
 */
declare function DzSetUnitDescription(whichUnit: unit, value: string): void;

/**
 * 设置单位投射物弧度
 * 设置${单位}投射物弧度为${弧度}
 * 修改单位投射物的飞行弧度
 */
declare function DzSetUnitMissileArc(whichUnit: unit, arc: number): void;

/**
 * 设置单位投射物模型
 * 设置${单位}投射物模型为${模型文件}
 * 更改单位投射物使用的模型
 */
declare function DzSetUnitMissileModel(whichUnit: unit, modelFile: string): void;

/**
 * 设置单位投射物追踪
 * 设置${单位}投射物追踪${启用}
 * 控制单位投射物是否具有追踪能力
 */
declare function DzSetUnitMissileHoming(whichUnit: unit, enable: boolean): void;

/**
 * 设置单位投射物速度
 * 设置${单位}投射物速度为${速度}
 * 修改单位投射物的飞行速度
 */
declare function DzSetUnitMissileSpeed(whichUnit: unit, speed: number): void;

/**
 * 设置特效可见性
 * 设置${特效}可见性${启用}
 * 控制特效是否可见
 */
declare function DzSetEffectVisible(whichHandle: effect, enable: boolean): void;

/**
 * 复活单位
 * 复活${单位}给${玩家}生命${生命值}魔法${魔法值}位置(${X},${Y})
 * 复活指定单位并设置其属性和位置
 */
declare function DzReviveUnit(
  whichUnit: unit,
  whichPlayer: player,
  hp: number,
  mp: number,
  x: number,
  y: number
): void;

/**
 * 获取攻击技能
 * 获取${单位}的攻击技能
 * 返回单位的攻击技能对象
 */
declare function DzGetAttackAbility(whichUnit: unit): ability;

/**
 * 攻击技能结束冷却
 * 结束${技能}的冷却时间
 * 立即结束攻击技能的冷却时间
 */
declare function DzAttackAbilityEndCooldown(whichHandle: ability): void;

// ============= 其他实用函数 =============

/**
 * 解锁JASS字节码限制
 * 解锁JASS字节码限制${启用}
 * 移除JASS代码的字节码执行限制
 */
declare function DzUnlockOpCodeLimit(enable: boolean): void;

/**
 * 设置剪切板内容
 * 设置剪切板内容为${内容}
 * 将文本内容设置到系统剪切板，返回是否成功
 */
declare function DzSetClipboard(content: string): boolean;

/**
 * 移除玩家科技等级
 * 移除${玩家}的${科技ID}科技${等级}级
 * 减少玩家指定科技的等级
 */
declare function DzRemovePlayerTechResearched(
  whichPlayer: player,
  techid: number,
  removelevels: number
): void;

/**
 * 查找单位技能
 * 查找${单位}的技能${技能代码}
 * 返回单位的指定技能对象
 */
declare function DzUnitFindAbility(whichUnit: unit, abilcode: number): ability;

/**
 * 修改技能数据-字符串
 * 修改${技能}的${键}数据为${值}
 * 修改技能的字符串类型数据
 */
declare function DzAbilitySetStringData(whichAbility: ability, key: string, value: string): void;

/**
 * 启用/禁用技能
 * 设置${技能}启用${启用}隐藏UI${隐藏UI}
 * 控制技能的启用状态和UI显示
 */
declare function DzAbilitySetEnable(whichAbility: ability, enable: boolean, hideUI: boolean): void;

/**
 * 设置单位移动类型
 * 设置${单位}移动类型为${移动类型}
 * 修改单位的移动类型(如步行、飞行等)
 */
declare function DzUnitSetMoveType(whichUnit: unit, moveType: string): void;

/**
 * 获取控件宽度
 * 获取${Frame}的宽度
 * 返回Frame控件的宽度值
 */
declare function DzFrameGetWidth(frame: framehandle): number;

/**
 * 按索引设置Frame动画
 * 设置${Frame}动画索引${索引}标志${标志}
 * 通过索引设置Frame的动画
 */
declare function DzFrameSetAnimateByIndex(frame: framehandle, index: number, flag: number): void;

/**
 * 设置单位数据缓存整数
 * 设置单位ID${单位ID}数据ID${数据ID}索引${索引}值${值}
 * 修改单位数据缓存中的整数值
 */
declare function DzSetUnitDataCacheInteger(uid: number, id: number, index: number, v: number): void;

/**
 * 获取同步触发前缀
 * 获取同步触发前缀
 * 响应同步数据事件时获取触发的前缀
 */
declare function DzGetTriggerSyncPrefix(): string;

/**
 * 同步缓冲区数据
 * 同步缓冲区数据前缀${prefix}数据${data}长度${dataLen}
 * 同步指定长度的缓冲区数据
 */
declare function DzSyncBuffer(prefix: string, data: string, dataLen: number): void;

/**
 * Frame是否可见
 * 检查${frame}是否可见
 * 返回Frame当前的可见状态
 */
declare function DzFrameIsVisible(frame: framehandle): boolean;

/**
 * 显示/隐藏SimpleFrame
 * 设置${frame}显示${enable}
 * 控制SimpleFrame的显示或隐藏
 */
declare function DzSimpleFrameShow(frame: framehandle, enable: boolean): void;

/**
 * 追加文字
 * 向${frame}追加文字${text}
 * 向Frame追加文本内容（支持TextArea）
 */
declare function DzFrameAddText(frame: framehandle, text: string): void;

/**
 * 沉默单位-禁用技能
 * 设置${unit}沉默状态${disable}
 * 禁用或启用单位的技能使用
 */
declare function DzUnitSilence(whichUnit: unit, disable: boolean): void;

/**
 * 禁用攻击
 * 设置${unit}禁用攻击${disable}
 * 禁用或启用单位的攻击能力
 */
declare function DzUnitDisableAttack(whichUnit: unit, disable: boolean): void;

/**
 * 禁用道具
 * 设置${unit}禁用道具${disable}
 * 禁用或启用单位的道具使用
 */
declare function DzUnitDisableInventory(whichUnit: unit, disable: boolean): void;

/**
 * 刷新小地图
 * 刷新小地图显示
 * 强制刷新小地图的显示内容
 */
declare function DzUpdateMinimap(): void;

/**
 * 修改单位透明度
 * 设置${unit}透明度${alpha}强制更新${forceUpdate}
 * 修改单位的透明度值
 */
declare function DzUnitChangeAlpha(whichUnit: unit, alpha: number, forceUpdate: boolean): void;

/**
 * 设置单位是否可选中
 * 设置${unit}可选中状态${state}
 * 控制单位是否可以被玩家选中
 */
declare function DzUnitSetCanSelect(whichUnit: unit, state: boolean): void;

/**
 * 设置单位是否可作为目标
 * 设置${unit}可作为目标${state}
 * 控制单位是否可以被设置为技能或攻击目标
 */
declare function DzUnitSetTargetable(whichUnit: unit, state: boolean): void;

/**
 * 保存内存数据
 * 保存内存缓存${cache}
 * 将数据保存到内存缓存中
 */
declare function DzSaveMemoryCache(cache: string): void;

/**
 * 读取内存数据
 * 读取内存缓存
 * 从内存缓存中读取数据
 */
declare function DzGetMemoryCache(): string;

/**
 * 设置加速倍率
 * 设置游戏速度倍率${ratio}
 * 修改游戏的运行速度倍率
 */
declare function DzSetSpeed(ratio: number): void;

/**
 * 转换世界坐标为屏幕坐标-异步
 * 转换世界坐标(${x},${y},${z})为屏幕坐标回调${callback}
 * 异步转换世界坐标为屏幕坐标，结果通过回调函数获取
 */
declare function DzConvertWorldPosition(
  x: number,
  y: number,
  z: number,
  callback: () => void
): boolean;

/**
 * 创建命令按钮
 * 创建命令按钮父节点${parent}图标${icon}名称${name}描述${desc}
 * 创建一个新的命令按钮控件
 */
declare function DzCreateCommandButton(
  parent: framehandle,
  icon: string,
  name: string,
  desc: string
): framehandle;

/**
 * 触发器注册鼠标事件-简化版
 * 注册${trigger}的鼠标事件状态${status}按钮${btn}
 * 简化版本的鼠标事件注册函数
 */
declare function DzTriggerRegisterMouseEventTrg(trg: trigger, status: number, btn: number): void;

/**
 * 触发器注册按键事件-简化版
 * 注册${trigger}的按键事件状态${status}按键${btn}
 * 简化版本的按键事件注册函数
 */
declare function DzTriggerRegisterKeyEventTrg(trg: trigger, status: number, btn: number): void;

/**
 * 触发器注册鼠标移动事件-简化版
 * 注册${trigger}的鼠标移动事件
 * 简化版本的鼠标移动事件注册函数
 */
declare function DzTriggerRegisterMouseMoveEventTrg(trg: trigger): void;

/**
 * 触发器注册鼠标滚轮事件-简化版
 * 注册${trigger}的鼠标滚轮事件
 * 简化版本的鼠标滚轮事件注册函数
 */
declare function DzTriggerRegisterMouseWheelEventTrg(trg: trigger): void;

/**
 * 触发器注册窗口大小变化事件-简化版
 * 注册${trigger}的窗口大小变化事件
 * 简化版本的窗口大小变化事件注册函数
 */
declare function DzTriggerRegisterWindowResizeEventTrg(trg: trigger): void;

/**
 * 浮点数转整数
 * 将浮点数${i}转换为整数
 * Frame专用的浮点数到整数转换函数
 */
declare function DzF2I(i: number): number;

/**
 * 整数转浮点数
 * 将整数${i}转换为浮点数
 * Frame专用的整数到浮点数转换函数
 */
declare function DzI2F(i: number): number;

// ============= KKAPI 补充函数声明 =============

/**
 * 写入日志
 * 写入日志消息${msg}
 * 向游戏日志文件写入调试信息
 */
declare function DzWriteLog(msg: string): void;

// ============= TextTag 相关函数 =============

/**
 * 获取文字标签字体
 * 获取文字标签字体
 * 返回文字标签当前使用的字体文件名
 */
declare function DzTextTagGetFont(): string;

/**
 * 设置文字标签字体
 * 设置文字标签字体为${fileName}
 * 修改文字标签使用的字体文件
 */
declare function DzTextTagSetFont(fileName: string): void;

/**
 * 设置文字标签起始透明度
 * 设置${t}的起始透明度为${alpha}
 * 修改文字标签的起始透明度值
 */
declare function DzTextTagSetStartAlpha(t: texttag, alpha: number): void;

/**
 * 获取文字标签阴影颜色
 * 获取${t}的阴影颜色
 * 返回文字标签的阴影颜色值
 */
declare function DzTextTagGetShadowColor(t: texttag): number;

/**
 * 设置文字标签阴影颜色
 * 设置${t}的阴影颜色为${color}
 * 修改文字标签的阴影颜色
 */
declare function DzTextTagSetShadowColor(t: texttag, color: number): void;

// ============= Group 相关函数 =============

/**
 * 获取单位组数量
 * 获取${g}的单位数量
 * 返回单位组中包含的单位数量
 */
declare function DzGroupGetCount(g: group): number;

/**
 * 获取单位组中的单位
 * 获取${g}中索引为${index}的单位
 * 返回单位组中指定索引位置的单位
 */
declare function DzGroupGetUnitAt(g: group, index: number): unit;

// ============= Unit 相关函数 =============

/**
 * 创建幻象单位
 * 为${p}创建幻象单位ID${unitId}位置(${x},${y})朝向${face}
 * 创建一个幻象单位
 */
declare function DzUnitCreateIllusion(
  p: player,
  unitId: number,
  x: number,
  y: number,
  face: number
): unit;

/**
 * 从单位创建幻象
 * 从${u}创建幻象
 * 基于现有单位创建一个幻象副本
 */
declare function DzUnitCreateIllusionFromUnit(u: unit): unit;

// ============= String 字符串操作函数 =============

/**
 * 字符串包含检查
 * 检查${s}是否包含${whichString}区分大小写${caseSensitive}
 * 检查字符串是否包含指定子字符串
 */
declare function DzStringContains(s: string, whichString: string, caseSensitive: boolean): boolean;

/**
 * 查找字符串
 * 在${s}中从位置${off}查找${whichString}区分大小写${caseSensitive}
 * 在字符串中查找子字符串的位置
 */
declare function DzStringFind(
  s: string,
  whichString: string,
  off: number,
  caseSensitive: boolean
): number;

/**
 * 查找首个匹配字符
 * 在${s}中从位置${off}查找首个${whichString}中的字符区分大小写${caseSensitive}
 * 查找字符串中首个匹配指定字符集的位置
 */
declare function DzStringFindFirstOf(
  s: string,
  whichString: string,
  off: number,
  caseSensitive: boolean
): number;

/**
 * 查找首个不匹配字符
 * 在${s}中从位置${off}查找首个不在${whichString}中的字符区分大小写${caseSensitive}
 * 查找字符串中首个不匹配指定字符集的位置
 */
declare function DzStringFindFirstNotOf(
  s: string,
  whichString: string,
  off: number,
  caseSensitive: boolean
): number;

/**
 * 查找最后匹配字符
 * 在${s}中从位置${off}查找最后一个${whichString}中的字符区分大小写${caseSensitive}
 * 查找字符串中最后一个匹配指定字符集的位置
 */
declare function DzStringFindLastOf(
  s: string,
  whichString: string,
  off: number,
  caseSensitive: boolean
): number;

/**
 * 查找最后不匹配字符
 * 在${s}中从位置${off}查找最后一个不在${whichString}中的字符区分大小写${caseSensitive}
 * 查找字符串中最后一个不匹配指定字符集的位置
 */
declare function DzStringFindLastNotOf(
  s: string,
  whichString: string,
  off: number,
  caseSensitive: boolean
): number;

/**
 * 去除左侧空白
 * 去除${s}左侧的空白字符
 * 移除字符串左侧的空白字符
 */
declare function DzStringTrimLeft(s: string): string;

/**
 * 去除右侧空白
 * 去除${s}右侧的空白字符
 * 移除字符串右侧的空白字符
 */
declare function DzStringTrimRight(s: string): string;

/**
 * 去除两侧空白
 * 去除${s}两侧的空白字符
 * 移除字符串两侧的空白字符
 */
declare function DzStringTrim(s: string): string;

/**
 * 反转字符串
 * 反转字符串${s}
 * 将字符串中的字符顺序反转
 */
declare function DzStringReverse(s: string): string;

/**
 * 替换字符串
 * 在${s}中将${whichString}替换为${replaceWith}区分大小写${caseSensitive}
 * 替换字符串中的指定子字符串
 */
declare function DzStringReplace(
  s: string,
  whichString: string,
  replaceWith: string,
  caseSensitive: boolean
): string;

/**
 * 插入字符串
 * 在${s}的位置${whichPosition}插入${whichString}
 * 在字符串的指定位置插入新字符串
 */
declare function DzStringInsert(s: string, whichPosition: number, whichString: string): string;

// ============= Bit 位运算函数 =============

/**
 * 获取位值
 * 获取${i}的第${byteIndex}位
 * 获取整数指定位的值
 */
declare function DzBitGet(i: number, byteIndex: number): number;

/**
 * 设置位值
 * 设置${i}的第${byteIndex}位为${byteValue}
 * 设置整数指定位的值
 */
declare function DzBitSet(i: number, byteIndex: number, byteValue: number): number;

/**
 * 获取字节值
 * 获取${i}的第${byteIndex}字节
 * 获取整数指定字节的值
 */
declare function DzBitGetByte(i: number, byteIndex: number): number;

/**
 * 设置字节值
 * 设置${i}的第${byteIndex}字节为${byteValue}
 * 设置整数指定字节的值
 */
declare function DzBitSetByte(i: number, byteIndex: number, byteValue: number): number;

/**
 * 位取反
 * 对${i}进行位取反
 * 对整数的所有位进行取反操作
 */
declare function DzBitNot(i: number): number;

/**
 * 位与运算
 * ${a}与${b}进行位与运算
 * 对两个整数进行位与运算
 */
declare function DzBitAnd(a: number, b: number): number;

/**
 * 位或运算
 * ${a}与${b}进行位或运算
 * 对两个整数进行位或运算
 */
declare function DzBitOr(a: number, b: number): number;

/**
 * 位异或运算
 * ${a}与${b}进行位异或运算
 * 对两个整数进行位异或运算
 */
declare function DzBitXor(a: number, b: number): number;

/**
 * 左移位
 * 将${i}左移${bitsToShift}位
 * 将整数的位向左移动指定位数
 */
declare function DzBitShiftLeft(i: number, bitsToShift: number): number;

/**
 * 右移位
 * 将${i}右移${bitsToShift}位
 * 将整数的位向右移动指定位数
 */
declare function DzBitShiftRight(i: number, bitsToShift: number): number;

/**
 * 位转整数
 * 将位${b1},${b2},${b3},${b4}转换为整数
 * 将四个位值组合成一个整数
 */
declare function DzBitToInt(b1: number, b2: number, b3: number, b4: number): number;

/**
 * 关闭Excel文件
 * 关闭Excel文件${docHandle}
 * 关闭Excel文件句柄，返回是否成功
 */
declare function DzXlsxClose(docHandle: number): boolean;

/**
 * 获取Excel工作表行数
 * 获取Excel文件${docHandle}工作表${sheetName}的行数
 * 返回Excel工作表的行数
 */
declare function DzXlsxWorksheetGetRowCount(docHandle: number, sheetName: string): number;

/**
 * 获取Excel工作表列数
 * 获取Excel文件${docHandle}工作表${sheetName}的列数
 * 返回Excel工作表的列数
 */
declare function DzXlsxWorksheetGetColumnCount(docHandle: number, sheetName: string): number;

/**
 * 获取Excel单元格类型
 * 获取Excel文件${docHandle}工作表${sheetName}单元格(${row},${column})的类型
 * 返回Excel单元格的数据类型
 */
declare function DzXlsxWorksheetGetCellType(
  docHandle: number,
  sheetName: string,
  row: number,
  column: number
): number;

/**
 * 获取Excel单元格字符串
 * 获取Excel文件${docHandle}工作表${sheetName}单元格(${row},${column})的字符串值
 * 返回Excel单元格的字符串值
 */
declare function DzXlsxWorksheetGetCellString(
  docHandle: number,
  sheetName: string,
  row: number,
  column: number
): string;

/**
 * 获取Excel单元格整数
 * 获取Excel文件${docHandle}工作表${sheetName}单元格(${row},${column})的整数值
 * 返回Excel单元格的整数值
 */
declare function DzXlsxWorksheetGetCellInteger(
  docHandle: number,
  sheetName: string,
  row: number,
  column: number
): number;

/**
 * 获取Excel单元格布尔值
 * 获取Excel文件${docHandle}工作表${sheetName}单元格(${row},${column})的布尔值
 * 返回Excel单元格的布尔值
 */
declare function DzXlsxWorksheetGetCellBoolean(
  docHandle: number,
  sheetName: string,
  row: number,
  column: number
): boolean;

/**
 * 获取Excel单元格浮点数
 * 获取Excel文件${docHandle}工作表${sheetName}单元格(${row},${column})的浮点数值
 * 返回Excel单元格的浮点数值
 */
declare function DzXlsxWorksheetGetCellFloat(
  docHandle: number,
  sheetName: string,
  row: number,
  column: number
): number;

// ============= 单位技能美术与投射物扩展函数（KKPRE） =============

/**
 * 设置单位技能图标
 * 设置单位${u}的技能${abil_id}图标为${art_path}
 */
declare function DzSetUnitAbilityArt(u: unit, abil_id: number, art_path: string): boolean;

/**
 * 获取单位技能图标
 * 获取单位${u}的技能${abil_id}图标路径
 */
declare function DzGetUnitAbilityArt(u: unit, abil_id: number): string;

/**
 * 设置单位技能标题
 * 设置单位${u}的技能${abil_id}标题为${tip}
 */
declare function DzSetUnitAbilityTip(u: unit, abil_id: number, tip: string): boolean;

/**
 * 获取单位技能标题
 * 获取单位${u}的技能${abil_id}标题
 */
declare function DzGetUnitAbilityTip(u: unit, abil_id: number): string;

/**
 * 设置单位技能详细说明
 * 设置单位${u}的技能${abil_id}详细说明为${ubertip}
 */
declare function DzSetUnitAbilityUberTip(u: unit, abil_id: number, ubertip: string): boolean;

/**
 * 获取单位技能详细说明
 * 获取单位${u}的技能${abil_id}详细说明
 */
declare function DzGetUnitAbilityUberTip(u: unit, abil_id: number): string;

/**
 * 刷新单位技能
 * 刷新单位${u}的技能${abil_id}以应用修改
 */
declare function DzSetUnitAbilityUpdate(u: unit, abil_id: number): boolean;

/**
 * 设置单位技能命令ID
 * 设置单位${u}的技能${abil_id}命令ID为${order_id}
 */
declare function DzSetUnitAbilityOrderId(u: unit, abil_id: number, order_id: number): boolean;

/**
 * 获取单位技能命令ID
 * 获取单位${u}的技能${abil_id}命令ID
 */
declare function DzGetUnitAbilityOrderId(u: unit, abil_id: number): number;

/**
 * 设置单位技能法术书列表
 * 设置单位${u}的技能${abil_id}法术书列表为${abil_list}，是否保存冷却${save_cooldown}
 */
declare function DzSetUnitAbilitySpellBookList(
  u: unit,
  abil_id: number,
  abil_list: string,
  save_cooldown: boolean
): boolean;

/**
 * 获取单位技能法术书列表
 * 获取单位${u}的技能${abil_id}法术书列表
 */
declare function DzGetUnitAbilitySpellBookList(u: unit, abil_id: number): string;

/**
 * 设置单位技能投射物模型
 * 设置单位${u}的技能${abil_id}投射物模型为${missile_art}
 */
declare function DzSetUnitAbilityMissileArt(u: unit, abil_id: number, missile_art: string): boolean;

/**
 * 获取单位技能投射物模型
 * 获取单位${u}的技能${abil_id}投射物模型路径
 */
declare function DzGetUnitAbilityMissileArt(u: unit, abil_id: number): string;

/**
 * 设置单位技能投射物速度
 * 设置单位${u}的技能${abil_id}投射物速度为${missile_speed}
 */
declare function DzSetUnitAbilityMissileSpeed(
  u: unit,
  abil_id: number,
  missile_speed: number
): boolean;

/**
 * 获取单位技能投射物速度
 * 获取单位${u}的技能${abil_id}投射物速度
 */
declare function DzGetUnitAbilityMissileSpeed(u: unit, abil_id: number): number;

/**
 * 设置单位技能投射物弧度
 * 设置单位${u}的技能${abil_id}投射物弧度为${missile_arc}
 */
declare function DzSetUnitAbilityMissileArc(u: unit, abil_id: number, missile_arc: number): boolean;

/**
 * 获取单位技能投射物弧度
 * 获取单位${u}的技能${abil_id}投射物弧度
 */
declare function DzGetUnitAbilityMissileArc(u: unit, abil_id: number): number;

/**
 * 设置单位技能投射物是否追踪
 * 设置单位${u}的技能${abil_id}投射物追踪为${missile_homing}
 */
declare function DzSetUnitAbilityMissileHoming(
  u: unit,
  abil_id: number,
  missile_homing: boolean
): boolean;

/**
 * 获取单位技能投射物是否追踪
 * 获取单位${u}的技能${abil_id}投射物追踪状态
 */
declare function DzGetUnitAbilityMissileHoming(u: unit, abil_id: number): boolean;

/**
 * 设置单位技能投射物数量
 * 设置单位${u}的技能${abil_id}投射物数量为${missile_count}
 */
declare function DzSetUnitAbilityMissileCount(
  u: unit,
  abil_id: number,
  missile_count: number
): boolean;

/**
 * 获取单位技能投射物数量
 * 获取单位${u}的技能${abil_id}投射物数量
 */
declare function DzGetUnitAbilityMissileCount(u: unit, abil_id: number): number;

/**
 * 设置单位技能投射物伤害
 * 设置单位${u}的技能${abil_id}投射物伤害${damage}最大伤害${max_damage}攻击类型${atktp}伤害类型${dmgtp}
 */
declare function DzSetUnitAbilityMissileDamage(
  u: unit,
  abil_id: number,
  damage: number,
  max_damage: number,
  atktp: attacktype,
  dmgtp: damagetype
): boolean;

/**
 * 获取单位技能投射物伤害
 * 获取单位${u}的技能${abil_id}投射物伤害
 */
declare function DzGetUnitAbilityMissileDamage(u: unit, abil_id: number): number;

/**
 * 获取单位技能投射物最大伤害
 * 获取单位${u}的技能${abil_id}投射物最大伤害
 */
declare function DzGetUnitAbilityMissileMaxDamage(u: unit, abil_id: number): number;

// ============= 物品扩展函数 =============

/**
 * 获取物品顶点颜色
 * 获取${Item}的顶点颜色
 * 返回物品的顶点颜色值
 */
declare function DzItemGetVertexColor(Item: item): number;

/**
 * 设置物品大小
 * 设置${Item}大小为${size}
 * 修改物品的显示大小
 */
declare function DzItemSetSize(Item: item, size: number): void;

/**
 * 获取物品大小
 * 获取${Item}的大小
 * 返回物品的当前大小
 */
declare function DzItemGetSize(Item: item): number;

/**
 * 物品矩阵X轴旋转
 * 物品${Item}矩阵X轴旋转${x}
 * 围绕X轴旋转物品
 */
declare function DzItemMatRotateX(Item: item, x: number): void;

/**
 * 物品矩阵Y轴旋转
 * 物品${Item}矩阵Y轴旋转${y}
 * 围绕Y轴旋转物品
 */
declare function DzItemMatRotateY(Item: item, y: number): void;

/**
 * 物品矩阵Z轴旋转
 * 物品${Item}矩阵Z轴旋转${z}
 * 围绕Z轴旋转物品
 */
declare function DzItemMatRotateZ(Item: item, z: number): void;

/**
 * 物品矩阵缩放
 * 物品${Item}矩阵缩放(${x},${y},${z})
 * 在各个轴向上缩放物品
 */
declare function DzItemMatScale(Item: item, x: number, y: number, z: number): void;

/**
 * 重置物品矩阵
 * 重置${Item}的矩阵
 * 将物品的变换矩阵重置为初始状态
 */
declare function DzItemMatReset(Item: item): void;

/**
 * 获取最后选中的物品
 * 获取最后选中的物品
 * 返回玩家最后选中的物品
 */
declare function DzGetLastSelectedItem(): item;

/**
 * 设置粒子系统大小
 * 设置${Widget}粒子系统大小${scale}
 * 修改控件粒子系统的缩放大小
 */
declare function DzSetPariticle2Size(Widget: agent, scale: number): void;

/**
 * 设置单位碰撞大小
 * 设置${Unit}碰撞大小为${size}
 * 修改单位的碰撞体积大小
 */
declare function DzSetUnitCollisionSize(Unit: unit, size: number): void;

/**
 * 获取单位碰撞大小
 * 获取${Unit}的碰撞大小
 * 返回单位的碰撞体积大小
 */
declare function DzGetUnitCollisionSize(Unit: unit): number;

/**
 * 设置控件纹理
 * 设置${Handle}纹理${TexturePath}替换ID${ReplaceId}
 * 修改控件使用的纹理文件
 */
declare function DzSetWidgetTexture(Handle: agent, TexturePath: string, ReplaceId: number): void;

/**
 * 设置单位选择缩放
 * 设置${Unit}选择缩放${scale}
 * 修改单位选择时的缩放比例
 */
declare function DzSetUnitSelectScale(Unit: unit, scale: number): void;

/**
 * 设置单位命中忽略
 * 设置${Unit}命中忽略${ignore}
 * 控制单位是否忽略命中检测
 */
declare function DzSetUnitHitIgnore(Unit: unit, ignore: boolean): void;

/**
 * 特效绑定特效
 * 特效${Handle}在${AttachName}位置绑定特效${eff}
 * 将一个特效绑定到另一个对象的指定挂接点
 */
declare function DzEffectBindEffect(Handle: agent, AttachName: string, eff: effect): void;
// ============= KKPRE 新增函数声明 =============

/**
 * 发送键盘事件给玩家
 * 向${p}发送按键码${key_code}的键盘事件，${is_down}表示按下或抬起
 * 模拟键盘事件发送到指定玩家
 */
declare function DzSendKeyboard(p: player, keyCode: number, isDown: number): void;

/**
 * 强制UI响应键盘事件
 * 强制UI响应${p}的按键码${key_code}事件，${is_down}表示按下或抬起
 * 强制游戏UI处理键盘事件
 */
declare function DzForceUiKeyboard(p: player, keyCode: number, isDown: number): void;

/**
 * 禁用窗口键盘事件
 * 禁用${p}的按键码${key_code}的窗口键盘事件
 * 禁止窗口处理特定按键
 */
declare function DzDisableWindowKeyboard(p: player, keyCode: number): void;

/**
 * 禁用游戏UI键盘事件
 * 禁用${p}的按键码${key_code}的游戏UI键盘事件
 * 禁止游戏UI处理特定按键
 */
declare function DzDisableGameUIKeyboard(p: player, keyCode: number): void;

/**
 * 判断位置是否可以放置物体
 * 判断位置(${x},${y})是否可以放置${obj}，碰撞大小${collision_size}，碰撞类型${collision_type}
 * 检查指定位置是否能放置单位或建筑
 */
declare function DzPositionCanPlaceAround(
  x: number,
  y: number,
  collisionSize: number,
  collisionType: number
): boolean;

/**
 * 获取指定位置地形高度
 * 获取位置(${x},${y})的地形高度
 * 返回指定坐标处的地形Z坐标
 */
declare function DzGetTerrainZ(x: number, y: number): number;

/**
 * 获取单位所在高度
 * 获取${u}所在的Z坐标
 * 返回单位当前所在的高度
 */
declare function DzGetUnitZ(u: unit): number;

/**
 * 获取单位头顶偏移
 * 获取${u}的头顶偏移
 * 返回单位头顶的高度偏移量
 */
declare function DzGetUnitOverheadOffset(u: widget): number;

/**
 * 设置Frame宽屏模式
 * 设置${frame}的宽屏模式为${is_enable}
 * 启用或禁用Frame的宽屏显示模式
 */
declare function DzFrameSetModelEnableWideScreen(frame: number, isEnable: boolean): void;

/**
 * 启用单位技能
 * 启用${u}的技能${abil_id}
 * 恢复被禁用的单位技能，返回是否成功
 */
declare function DzSetUnitAbilityEnable(u: unit, abilId: number): boolean;

/**
 * 禁用单位技能
 * 禁用${u}的技能${abil_id}
 * 禁用单位的指定技能，返回是否成功
 */
declare function DzSetUnitAbilityDisable(u: unit, abilId: number): boolean;

/**
 * 判断单位技能是否被禁用
 * 判断${u}的技能${abil_id}是否被禁用
 * 检查技能是否处于禁用状态
 */
declare function DzGetUnitAbilityIsDisabled(u: unit, abilId: number): boolean;

/**
 * 获取单位技能禁用次数
 * 获取${u}的技能${abil_id}的禁用次数
 * 返回技能被禁用的次数
 */
declare function DzGetUnitAbilityDisabledCount(u: unit, abilId: number): number;

/**
 * 设置单位技能科技要求
 * 设置${u}的技能${abil_id}的科技要求为${reach}
 * 修改技能的科技依赖条件，返回是否成功
 */
declare function DzSetUnitAbilityTechReach(u: unit, abilId: number, reach: boolean): boolean;

/**
 * 获取单位技能科技要求
 * 获取${u}的技能${abil_id}的科技要求
 * 检查技能是否有科技依赖
 */
declare function DzGetUnitAbilityTechReach(u: unit, abilId: number): boolean;

/**
 * 设置单位技能科技要求提示
 * 设置${u}的技能${abil_id}的科技要求提示为${tip}
 * 修改科技不足时显示的提示文本，返回是否成功
 */
declare function DzSetUnitAbilityTechReachTip(u: unit, abilId: number, tip: string): boolean;

/**
 * 获取当前建筑技能ID（异步）
 * 获取当前正在进行的建筑技能ID
 * 在建筑事件中获取正在建造的技能ID
 */
declare function DzAsyncGetCurrentBuildingAbilityId(): number;

/**
 * 获取当前建筑单位ID（异步）
 * 获取当前正在建造的单位ID
 * 在建筑事件中获取要建造的单位ID
 */
declare function DzAsyncGetCurrentBuildingUnitId(): number;

/**
 * 解锁鼠标矩形限制
 * 解锁鼠标矩形限制${is_unlock}
 * 允许或禁止鼠标超出游戏窗口边界
 */
declare function DzFrameUnlockMouseRectLimit(isUnlock: boolean): void;

/**
 * 判断Simple Frame是否可见
 * 判断Simple Frame ${simple_frame}是否可见
 * 检查Simple Frame的显示状态
 */
declare function KKSimpleFrameIsVisible(simpleFrame: number): boolean;

/**
 * 获取聊天编辑栏Frame
 * 获取聊天编辑栏Frame
 * 返回聊天输入框的Frame句柄
 */
declare function DzFrameGetChatEditBar(): number;

/**
 * 获取本地聊天接收者
 * 获取本地玩家的聊天接收对象
 * 返回聊天消息的接收目标（所有玩家/仅盟友等）
 */
declare function DzGetLocalChatRecipient(): number;

/**
 * 玩家发送聊天消息
 * 让${p}发送消息${msg}，接收者类型为${recipient}
 * 向指定的目标发送聊天消息
 */
declare function DzPlayerSendChat(p: player, msg: string, recipient: number): void;

/**
 * 获取本地选中单位
 * 获取本地玩家选中的第${index}个单位
 * 返回指定索引的选中单位
 */
declare function DzGetLocalSelectUnit(index: number): unit;

/**
 * 获取JASS字符串表数量
 * 获取JASS字符串表的数量
 * 返回字符串表中的条目数
 */
declare function DzGetJassStringTableCount(): number;

/**
 * 从缓存中移除模型
 * 从缓存中移除模型${path}
 * 卸载指定的模型文件缓存
 */
declare function DzModelRemoveFromCache(path: string): void;

/**
 * 清空模型缓存
 * 清空所有模型缓存
 * 卸载所有已加载的模型缓存
 */
declare function DzModelRemoveAllFromCache(): void;

/**
 * 获取信息面板选择按钮
 * 获取信息面板的第${index}个选择按钮
 * 返回单位信息面板上的按钮
 */
declare function DzFrameGetInfoPanelSelectButton(index: number): number;

/**
 * 获取信息面板BUFF按钮
 * 获取信息面板的第${index}个BUFF按钮
 * 返回单位状态栏的BUFF按钮
 */
declare function DzFrameGetInfoPanelBuffButton(index: number): number;

/**
 * 获取民工条
 * 获取民工条Frame
 * 返回建筑进度条的Frame句柄
 */
declare function DzFrameGetPeonBar(): number;

/**
 * 获取命令栏按钮数字文本
 * 获取${whichframe}的数字文本Frame
 * 返回技能按钮上的等级数字显示
 */
declare function DzFrameGetCommandBarButtonNumberText(whichframe: framehandle): number;

/**
 * 获取命令栏按钮数字覆盖层
 * 获取${whichframe}的数字覆盖层Frame
 * 返回技能按钮的数字覆盖显示
 */
declare function DzFrameGetCommandBarButtonNumberOverlay(whichframe: framehandle): number;

/**
 * 获取命令栏按钮冷却指示器
 * 获取${whichframe}的冷却指示器Frame
 * 返回技能按钮的冷却指示器
 */
declare function DzFrameGetCommandBarButtonCooldownIndicator(whichframe: framehandle): number;

/**
 * 获取命令栏按钮自动施法指示器
 * 获取${whichframe}的自动施法指示器Frame
 * 返回技能按钮的自动施法指示器
 */
declare function DzFrameGetCommandBarButtonAutoCastIndicator(whichframe: framehandle): number;

/**
 * 获取世界Frame消息
 * 获取世界Frame消息
 * 返回最后一条世界事件消息的ID
 */
declare function DzFrameGetWorldFrameMessage(): number;

/**
 * 设置单位名称
 * 设置${whichUnit}的名称为${name}
 * 修改单位的显示名字
 */
declare function DzSetUnitName(whichUnit: unit, name: string): void;

/**
 * 设置单位专有名称
 * 设置${whichUnit}的专有名称为${name}
 * 修改单位的英雄名字
 */
declare function DzSetUnitProperName(whichUnit: unit, name: string): void;

/**
 * 设置英雄专有名称
 * 设置单位ID${uid}的英雄专有名称为${name}
 * 修改英雄类单位的名字
 */
declare function DzSetHeroTypeProperName(uid: number, name: string): void;

/**
 * 设置单位类型名称
 * 设置单位ID${uid}的类型名称为${name}
 * 修改单位在游戏中的显示名字
 */
declare function DzSetUnitTypeName(uid: number, name: string): void;

/**
 * 判断单位攻击类型
 * 判断${whichUnit}的第${index}个攻击类型是否为${attackType}
 * 检查单位是否具有特定攻击类型
 */
declare function DzIsUnitAttackType(
  whichUnit: unit,
  index: number,
  attackType: attacktype
): boolean;

/**
 * 设置单位攻击类型
 * 设置${whichUnit}的第${index}个攻击类型为${attackType}
 * 修改单位的攻击类型
 */
declare function DzSetUnitAttackType(whichUnit: unit, index: number, attackType: attacktype): void;

/**
 * 判断单位防甲类型
 * 判断${whichUnit}的防甲类型是否为${defenseType}
 * 检查单位是否具有特定防甲类型
 */
declare function DzIsUnitDefenseType(whichUnit: unit, defenseType: number): boolean;

/**
 * 设置单位防甲类型
 * 设置${whichUnit}的防甲类型为${defenseType}
 * 修改单位的防甲类型
 */
declare function DzSetUnitDefenseType(whichUnit: unit, defenseType: number): void;

/**
 * 创建装饰物
 * 创建ID为${id}，变体${var}，位置(${x},${y},${z})，旋转${rotate}，缩放${scale}的装饰物
 * 在指定位置创建装饰物，返回装饰物句柄
 */
declare function DzDoodadCreate(
  id: number,
  variant: number,
  x: number,
  y: number,
  z: number,
  rotate: number,
  scale: number
): number;

/**
 * 获取装饰物类型ID
 * 获取${doodad}的类型ID
 * 返回装饰物的单位类型ID
 */
declare function DzDoodadGetTypeId(doodad: number): number;

/**
 * 设置装饰物模型
 * 设置${doodad}的模型为${modelFile}
 * 替换装饰物的模型文件
 */
declare function DzDoodadSetModel(doodad: number, modelFile: string): void;

/**
 * 设置装饰物队伍颜色
 * 设置${doodad}的队伍颜色为${color}
 * 应用队伍颜色到装饰物
 */
declare function DzDoodadSetTeamColor(doodad: number, color: number): void;

/**
 * 设置装饰物颜色
 * 设置${doodad}的颜色为${color}
 * 修改装饰物的整体颜色
 */
declare function DzDoodadSetColor(doodad: number, color: number): void;

/**
 * 设置装饰物方向矩阵缩放
 * 设置${doodad}的方向矩阵缩放为(${x},${y},${z})
 * 改变装饰物的三维缩放
 */
declare function DzDoodadSetOrientMatrixScale(
  doodad: number,
  x: number,
  y: number,
  z: number
): void;

/**
 * 重置装饰物方向矩阵
 * 重置${doodad}的方向矩阵
 * 恢复装饰物到默认变换
 */
declare function DzDoodadSetOrientMatrixResize(doodad: number): void;

/**
 * 设置装饰物动画
 * 设置${doodad}播放动画${animName}，随机${animRandom}
 * 播放指定的装饰物动画
 */
declare function DzDoodadSetAnimation(doodad: number, animName: string, animRandom: boolean): void;

/**
 * 设置装饰物时间缩放
 * 设置${doodad}的时间缩放为${scale}
 * 修改装饰物动画的播放速度
 */
declare function DzDoodadSetTimeScale(doodad: number, scale: number): void;

/**
 * 获取装饰物时间缩放
 * 获取${doodad}的时间缩放
 * 返回装饰物动画的播放速度倍数
 */
declare function DzDoodadGetTimeScale(doodad: number): number;

/**
 * 获取装饰物当前动画索引
 * 获取${doodad}的当前动画索引
 * 返回正在播放的动画序列号
 */
declare function DzDoodadGetCurrentAnimationIndex(doodad: number): number;

/**
 * 获取装饰物动画数量
 * 获取${doodad}的动画数量
 * 返回装饰物拥有的动画总数
 */
declare function DzDoodadGetAnimationCount(doodad: number): number;

/**
 * 获取装饰物动画名称
 * 获取${doodad}的第${index}个动画名称
 * 返回指定索引动画的名字
 */
declare function DzDoodadGetAnimationName(doodad: number, index: number): string;

/**
 * 获取装饰物动画时间
 * 获取${doodad}的第${index}个动画时间
 * 返回动画的总时长（毫秒）
 */
declare function DzDoodadGetAnimationTime(doodad: number, index: number): number;

/**
 * 单位UI添加升级数组整数
 * 为单位${uid}的升级ID${id}添加等级${lv}的值${v}
 * 在单位UI升级列表中添加整数值
 */
declare function DzUnitUIAddLevelArrayInteger(uid: number, id: number, lv: number, v: number): void;

/**
 * 设置道具模型
 * 设置${whichItem}的模型为${file}
 * 替换物品的显示模型
 */
declare function DzItemSetModel(whichItem: item, file: string): void;

/**
 * 设置道具顶点颜色
 * 设置${whichItem}的顶点颜色为${color}
 * 修改物品的显示颜色
 */
declare function DzItemSetVertexColor(whichItem: item, color: number): void;

/**
 * 设置道具透明度
 * 设置${whichItem}的透明度为${color}
 * 修改物品的透明度
 */
declare function DzItemSetAlpha(whichItem: item, color: number): void;

/**
 * 设置道具肖像
 * 设置${whichItem}的肖像为${modelPath}
 * 修改物品的肖像显示
 */
declare function DzItemSetPortrait(whichItem: item, modelPath: string): void;

/**
 * 注册Frame血条事件钩子
 * 注册血条事件回调函数${func}
 * 监听单位血条的显示事件
 */
declare function DzFrameHookHpBar(func: () => void): void;

/**
 * 获取血条事件触发单位
 * 获取血条事件的触发单位
 * 在血条事件回调中获取相关单位
 */
declare function DzFrameGetTriggerHpBarUnit(): unit;

/**
 * 获取血条事件Frame
 * 获取血条事件的Frame
 * 在血条事件回调中获取血条Frame
 */
declare function DzFrameGetTriggerHpBar(): number;

/**
 * 获取单位血条
 * 获取${whichUnit}的血条Frame
 * 返回单位对应的血条显示
 */
declare function DzFrameGetUnitHpBar(whichUnit: unit): number;

/**
 * 获取当前鼠标指向的Frame控件
 * 获取鼠标当前指向的Frame
 * 返回鼠标悬停的Frame句柄
 */
declare function DzGetCursorFrame(): number;

/**
 * 判断Frame锚点是否有效
 * 判断${frame}的锚点${anchor}是否有效
 * 检查Frame是否设置了该锚点
 */
declare function DzFrameGetPointValid(frame: number, anchor: number): boolean;

/**
 * 获取Frame相对Frame
 * 获取${frame}的锚点${anchor}所跟随的目标Frame
 * 返回Frame锚点的参考对象
 */
declare function DzFrameGetPointRelative(frame: number, anchor: number): number;

/**
 * 设置Frame纹理坐标
 * 设置${frame}的纹理坐标为左${left}上${top}右${right}下${bottom}
 * 修改Frame显示贴图的采样坐标范围
 */
declare function DzFrameSetTexCoord(
  frame: number,
  left: number,
  top: number,
  right: number,
  bottom: number
): void;

/**
 * 设置单位技能范围
 * 设置${Unit}的技能${abil_code}的范围为${value}
 * 修改技能的施法范围，返回是否成功
 */
declare function DzSetUnitAbilityRange(Unit: unit, abilCode: number, value: number): boolean;

/**
 * 获取单位技能范围
 * 获取${Unit}的技能${abil_code}的范围
 * 返回技能的施法范围
 */
declare function DzGetUnitAbilityRange(Unit: unit, abilCode: number): number;

/**
 * 设置单位技能区域
 * 设置${Unit}的技能${abil_code}的区域为${value}
 * 修改技能的效果范围，返回是否成功
 */
declare function DzSetUnitAbilityArea(Unit: unit, abilCode: number, value: number): boolean;

/**
 * 获取单位技能区域
 * 获取${Unit}的技能${abil_code}的区域
 * 返回技能的效果范围
 */
declare function DzGetUnitAbilityArea(Unit: unit, abilCode: number): number;

/**
 * 设置单位技能冷却
 * 设置${Unit}的技能${abil_code}的冷却为${cool}，最大冷却${max_cool}
 * 修改技能的冷却时间，返回是否成功
 */
declare function DzSetUnitAbilityCool(
  Unit: unit,
  abilCode: number,
  cool: number,
  maxCool: number
): boolean;

/**
 * 获取单位技能冷却
 * 获取${Unit}的技能${abil_code}的冷却
 * 返回技能的当前冷却时间
 */
declare function DzGetUnitAbilityCool(Unit: unit, abilCode: number): number;

/**
 * 获取单位技能最大冷却
 * 获取${Unit}的技能${abil_code}的最大冷却
 * 返回技能的最大冷却时间
 */
declare function DzGetUnitAbilityMaxCool(Unit: unit, abilCode: number): number;

/**
 * 设置单位技能数据A
 * 设置${Unit}的技能${abil_code}的数据A为${value}
 * 修改技能的A级数据，返回是否成功
 */
declare function DzSetUnitAbilityDataA(Unit: unit, abilCode: number, value: number): boolean;

/**
 * 获取单位技能数据A
 * 获取${Unit}的技能${abil_code}的数据A
 * 返回技能的A级数据
 */
declare function DzGetUnitAbilityDataA(Unit: unit, abilCode: number): number;

/**
 * 设置单位技能数据B
 * 设置${Unit}的技能${abil_code}的数据B为${value}
 * 修改技能的B级数据，返回是否成功
 */
declare function DzSetUnitAbilityDataB(Unit: unit, abilCode: number, value: number): boolean;

/**
 * 获取单位技能数据B
 * 获取${Unit}的技能${abil_code}的数据B
 * 返回技能的B级数据
 */
declare function DzGetUnitAbilityDataB(Unit: unit, abilCode: number): number;

/**
 * 设置单位技能数据C
 * 设置${Unit}的技能${abil_code}的数据C为${value}
 * 修改技能的C级数据，返回是否成功
 */
declare function DzSetUnitAbilityDataC(Unit: unit, abilCode: number, value: number): boolean;

/**
 * 获取单位技能数据C
 * 获取${Unit}的技能${abil_code}的数据C
 * 返回技能的C级数据
 */
declare function DzGetUnitAbilityDataC(Unit: unit, abilCode: number): number;

/**
 * 设置单位技能数据D
 * 设置${Unit}的技能${abil_code}的数据D为${value}
 * 修改技能的D级数据，返回是否成功
 */
declare function DzSetUnitAbilityDataD(Unit: unit, abilCode: number, value: number): boolean;

/**
 * 获取单位技能数据D
 * 获取${Unit}的技能${abil_code}的数据D
 * 返回技能的D级数据
 */
declare function DzGetUnitAbilityDataD(Unit: unit, abilCode: number): number;

/**
 * 设置单位技能数据E
 * 设置${Unit}的技能${abil_code}的数据E为${value}
 * 修改技能的E级数据，返回是否成功
 */
declare function DzSetUnitAbilityDataE(Unit: unit, abilCode: number, value: number): boolean;

/**
 * 获取单位技能数据E
 * 获取${Unit}的技能${abil_code}的数据E
 * 返回技能的E级数据
 */
declare function DzGetUnitAbilityDataE(Unit: unit, abilCode: number): number;

/**
 * 设置单位技能按钮位置
 * 设置${Unit}的技能${abil_code}的按钮位置为(${x},${y})
 * 修改技能在命令栏的显示位置，返回是否成功
 */
declare function DzSetUnitAbilityButtonPos(
  Unit: unit,
  abilCode: number,
  x: number,
  y: number
): boolean;

/**
 * 设置单位技能快捷键
 * 设置${Unit}的技能${abil_code}的快捷键为${key}
 * 修改技能的热键，返回是否成功
 */
declare function DzSetUnitAbilityHotkey(Unit: unit, abilCode: number, key: string): boolean;

/**
 * 转换目标类型为字符串
 * 将目标类型${targs}转换为字符串
 * 返回目标类型的字符串表示
 */
declare function DzConvertTargs2Str(targs: number): string;

/**
 * 转换字符串为目标类型
 * 将字符串${targs}转换为目标类型
 * 返回字符串对应的目标类型ID
 */
declare function DzConvertStr2Targs(targs: string): number;

/**
 * 设置单位技能目标类型
 * 设置${Unit}的技能${abil_code}的目标类型为${value}
 * 修改技能可以指向的目标类型，返回是否成功
 */
declare function DzSetUnitAbilityTargs(Unit: unit, abilCode: number, value: number): boolean;

/**
 * 获取单位技能目标类型
 * 获取${Unit}的技能${abil_code}的目标类型
 * 返回技能可以指向的目标类型
 */
declare function DzGetUnitAbilityTargs(Unit: unit, abilCode: number): number;

// ============= 命令队列相关函数 =============

/**
 * 单位队列命令-立即指令
 * 队列${whichUnit}的立即指令${order}
 * 将立即命令加入单位的命令队列，返回是否成功
 */
declare function DzQueueIssueImmediateOrderById(whichUnit: unit, order: number): boolean;

/**
 * 单位队列命令-点位指令
 * 队列${whichUnit}的点位指令${order}到(${x},${y})
 * 将点位命令加入单位的命令队列，返回是否成功
 */
declare function DzQueueIssuePointOrderById(
  whichUnit: unit,
  order: number,
  x: number,
  y: number
): boolean;

/**
 * 单位队列命令-目标指令
 * 队列${whichUnit}的目标指令${order}到${targetWidget}
 * 将目标命令加入单位的命令队列，返回是否成功
 */
declare function DzQueueIssueTargetOrderById(
  whichUnit: unit,
  order: number,
  targetWidget: widget
): boolean;

/**
 * 单位队列命令-即时点位指令
 * 队列${whichUnit}的即时点位指令${order}到(${x},${y})，即时目标${instantTargetWidget}
 * 将即时点位命令加入队列，返回是否成功
 */
declare function DzQueueIssueInstantPointOrderById(
  whichUnit: unit,
  order: number,
  x: number,
  y: number,
  instantTargetWidget: widget
): boolean;

/**
 * 单位队列命令-即时目标指令
 * 队列${whichUnit}的即时目标指令${order}到${targetWidget}，即时目标${instantTargetWidget}
 * 将即时目标命令加入队列，返回是否成功
 */
declare function DzQueueIssueInstantTargetOrderById(
  whichUnit: unit,
  order: number,
  targetWidget: widget,
  instantTargetWidget: widget
): boolean;

/**
 * 单位队列命令-建筑指令
 * 队列${whichPeon}的建筑指令，建筑ID${unitId}在(${x},${y})
 * 将建筑命令加入队列，返回是否成功
 */
declare function DzQueueIssueBuildOrderById(
  whichPeon: unit,
  unitId: number,
  x: number,
  y: number
): boolean;

/**
 * 队伍队列命令-立即指令
 * 队列${whichGroup}的立即指令${order}
 * 为队伍中的所有单位加入立即命令，返回是否成功
 */
declare function DzQueueGroupImmediateOrderById(whichGroup: group, order: number): boolean;

/**
 * 队伍队列命令-点位指令
 * 队列${whichGroup}的点位指令${order}到(${x},${y})
 * 为队伍中的所有单位加入点位命令，返回是否成功
 */
declare function DzQueueGroupPointOrderById(
  whichGroup: group,
  order: number,
  x: number,
  y: number
): boolean;

/**
 * 队伍队列命令-目标指令
 * 队列${whichGroup}的目标指令${order}到${targetWidget}
 * 为队伍中的所有单位加入目标命令，返回是否成功
 */
declare function DzQueueGroupTargetOrderById(
  whichGroup: group,
  order: number,
  targetWidget: widget
): boolean;

/**
 * 中立结构队列命令-立即指令
 * 队列${forWhichPlayer}的中立结构${neutralStructure}的立即指令${unitId}
 * 为中立建筑加入立即命令，返回是否成功
 */
declare function DzQueueIssueNeutralImmediateOrderById(
  forWhichPlayer: player,
  neutralStructure: unit,
  unitId: number
): boolean;

/**
 * 中立结构队列命令-点位指令
 * 队列${forWhichPlayer}的中立结构${neutralStructure}的点位指令${unitId}到(${x},${y})
 * 为中立建筑加入点位命令，返回是否成功
 */
declare function DzQueueIssueNeutralPointOrderById(
  forWhichPlayer: player,
  neutralStructure: unit,
  unitId: number,
  x: number,
  y: number
): boolean;

/**
 * 中立结构队列命令-目标指令
 * 队列${forWhichPlayer}的中立结构${neutralStructure}的目标指令${unitId}到${target}
 * 为中立建筑加入目标命令，返回是否成功
 */
declare function DzQueueIssueNeutralTargetOrderById(
  forWhichPlayer: player,
  neutralStructure: unit,
  unitId: number,
  target: widget
): boolean;

/**
 * 获取单位命令队列数量
 * 获取${u}的命令队列数量
 * 返回单位中待执行的命令个数
 */
declare function DzUnitOrdersCount(u: unit): number;

/**
 * 清空单位命令队列
 * 清空${u}的命令队列，仅队列${onlyQueued}
 * 移除单位的待执行命令
 */
declare function DzUnitOrdersClear(u: unit, onlyQueued: boolean): void;

/**
 * 执行单位命令队列
 * 执行${u}的命令队列
 * 立即开始执行队列中的所有命令
 */
declare function DzUnitOrdersExec(u: unit): void;

/**
 * 强制停止单位命令队列
 * 强制停止${u}的命令执行，清除队列${clearQueue}
 * 立即停止单位的当前命令
 */
declare function DzUnitOrdersForceStop(u: unit, clearQueue: boolean): void;

/**
 * 反转单位命令队列
 * 反转${u}的命令队列
 * 将待执行的命令顺序反转
 */
declare function DzUnitOrdersReverse(u: unit): void;

// ===== KKPER/KKAPI additions (generated) =====
// Command button helpers
/**
 * 新建命令按钮
 * 创建一个命令按钮并返回按钮句柄ID
 */
declare function KKCreateCommandButton(): number;
/**
 * 销毁命令按钮
 * 销毁指定按钮ID对应的命令按钮
 */
declare function KKDestroyCommandButton(btn: number): void;
/**
 * 触发按钮点击
 * 模拟在命令按钮上的鼠标点击
 */
declare function KKCommandButtonClick(btn: number, mouse_type: number): void;
/**
 * 触发目标点击
 * 以鼠标类型对目标对象进行命令点击
 */
declare function KKCommandTargetClick(mouse_type: number, target: widget): boolean;
/**
 * 触发地形点击
 * 在指定坐标触发地形命令点击
 */
declare function KKCommandTerrainClick(
  mouse_type: number,
  x: number,
  y: number,
  z: number
): boolean;
/**
 * 绑定按钮技能
 * 将按钮绑定到单位的指定技能
 */
declare function KKSetCommandUnitAbility(btn: number, Unit: unit, abil_code: number): void;

// Simple converters
/** 将整数转换为技能ID */
declare function KKConvertInt2AbilId(i: number): number;
/** 将技能ID转换为整数 */
declare function KKConvertAbilId2Int(i: number): number;
/** 将整数转换为颜色值 */
declare function KKConvertInt2Color(i: number): number;
/** 将颜色值转换为整数 */
declare function KKConvertColor2Int(i: number): number;

// Frame model API
/**
 * 忽略轨迹事件
 * 设置Frame是否忽略追踪事件
 */
declare function DzFrameSetIgnoreTrackEvents(frame: number, ignore: boolean): void;
/**
 * 添加模型Frame
 * 在父Frame下创建一个模型子Frame
 */
declare function DzFrameAddModel(parent_frame: number): number;
/**
 * 设置模型文件(含队伍色)
 * 为模型Frame设置模型文件与队伍颜色
 */
declare function DzFrameSetModel2(
  model_frame: number,
  model_file: string,
  team_color_id: number
): void;
/**
 * 添加模型附加特效
 * 在模型Frame指定附加点添加模型特效
 */
declare function DzFrameAddModelEffect(
  model_frame: number,
  attach_point: string,
  model_file: string
): number;
/**
 * 移除模型特效
 * 从模型Frame移除指定特效Frame
 */
declare function DzFrameRemoveModelEffect(model_frame: number, effect_frame: number): void;
/**
 * 设置模型动画(索引)
 * 通过动画索引设置模型当前动画
 */
declare function DzFrameSetModelAnimationByIndex(model_frame: number, anim_index: number): void;
/**
 * 设置模型动画(名称)
 * 通过动画名称设置模型当前动画
 */
declare function DzFrameSetModelAnimation(model_frame: number, animation: string): void;
/**
 * 设置模型摄像机源
 * 设定模型摄像机的源位置
 */
declare function DzFrameSetModelCameraSource(
  model_frame: number,
  x: number,
  y: number,
  z: number
): void;
/**
 * 设置模型摄像机目标
 * 设定模型摄像机的目标位置
 */
declare function DzFrameSetModelCameraTarget(
  model_frame: number,
  x: number,
  y: number,
  z: number
): void;
/** 设置模型大小 */
declare function DzFrameSetModelSize(model_frame: number, size: number): void;
/** 获取模型大小 */
declare function DzFrameGetModelSize(model_frame: number): number;
/**
 * 设置模型位置
 * 设置模型Frame的世界坐标位置
 */
declare function DzFrameSetModelPosition(
  model_frame: number,
  x: number,
  y: number,
  z: number
): void;
/** 设置模型X坐标 */
declare function DzFrameSetModelX(model_frame: number, x: number): void;
/** 获取模型X坐标 */
declare function DzFrameGetModelX(model_frame: number): number;
/** 设置模型Y坐标 */
declare function DzFrameSetModelY(model_frame: number, y: number): void;
/** 获取模型Y坐标 */
declare function DzFrameGetModelY(model_frame: number): number;
/** 设置模型Z坐标 */
declare function DzFrameSetModelZ(model_frame: number, z: number): void;
/** 获取模型Z坐标 */
declare function DzFrameGetModelZ(model_frame: number): number;
/** 设置模型播放速度 */
declare function DzFrameSetModelSpeed(model_frame: number, speed: number): void;
/** 获取模型播放速度 */
declare function DzFrameGetModelSpeed(model_frame: number): number;
/** 设置模型缩放 */
declare function DzFrameSetModelScale(model_frame: number, x: number, y: number, z: number): void;
/** 重置模型变换矩阵 */
declare function DzFrameSetModelMatReset(model_frame: number): void;
/** 绕X轴旋转模型 */
declare function DzFrameSetModelRotateX(model_frame: number, x: number): void;
/** 绕Y轴旋转模型 */
declare function DzFrameSetModelRotateY(model_frame: number, y: number): void;
/** 绕Z轴旋转模型 */
declare function DzFrameSetModelRotateZ(model_frame: number, z: number): void;
/** 设置模型顶点颜色 */
declare function DzFrameSetModelColor(model_frame: number, color: number): void;
/** 获取模型顶点颜色 */
declare function DzFrameGetModelColor(model_frame: number): number;
/**
 * 设置模型贴图
 * 设置模型Frame贴图及替换ID
 */
declare function DzFrameSetModelTexture(
  model_frame: number,
  texture_file: string,
  replace_texutre_id: number
): void;
/** 设置模型粒子尺寸 */
declare function DzFrameSetModelParticle2Size(model_frame: number, scale: number): void;

// UI helpers / names / spacing
/** 获取Glue UI Frame */
declare function DzGetGlueUI(): number;
/** 获取鼠标所在Frame */
declare function DzFrameGetMouse(): number;
/** 获取Frame上下文ID */
declare function DzFrameGetContext(frame: number): number;
/** 设置Frame名称与上下文 */
declare function DzFrameSetNameContext(frame: number, name: string, context: number): void;
/** 设置文本字距 */
declare function DzFrameSetTextFontSpacing(text_frame: number, spacing: number): void;
/** 获取命令按钮的冷却模型Frame */
declare function KKCommandGetCooldownModel(cmd_btn: number): number;
/** 设置冷却模型统一尺寸 */
declare function KKCommandSetCooldownModelSize(cmd_btn: number, size: number): void;
/**
 * 设置冷却模型尺寸
 * 分别设置冷却模型的宽高尺寸
 */
declare function KKCommandSetCooldownModelSize2(
  cmd_btn: number,
  width: number,
  height: number
): void;
/** 获取玩家最近选择的道具 */
declare function DzGetPlayerLastSelectedItem(p: player): item;
/** 获取模型缓存数量 */
declare function DzGetCacheModelCount(): number;
/** 设置渲染最大帧率 */
declare function DzSetMaxFps(max_fps: number): void;

// Draw skill panel & effect visibility
/** 启用/禁用单位技能面板绘制 */
declare function DzEnableDrawSkillPanel(u: unit, is_enable: boolean): void;
/** 启用/禁用玩家技能面板绘制 */
declare function DzEnableDrawSkillPanelByPlayer(p: player, is_enable: boolean): void;
/** 设置特效在雾中可见 */
declare function DzSetEffectFogVisible(eff: effect, is_visible: boolean): void;
/** 设置特效在遮罩中可见 */
declare function DzSetEffectMaskVisible(eff: effect, is_visible: boolean): void;

// Frame-world binding
/**
 * 绑定Frame到世界单位
 * 通过世界/屏幕坐标绑定显示
 */
declare function DzFrameBindWidget(
  frame: number,
  u: widget,
  world_x: number,
  world_y: number,
  world_z: number,
  screen_x: number,
  screen_y: number,
  fog_visible: boolean,
  unit_visible: boolean,
  dead_visible: boolean
): void;
/**
 * 绑定Frame到世界坐标
 * 通过世界坐标与屏幕坐标进行绑定
 */
declare function DzFrameBindWorldPos(
  frame: number,
  world_x: number,
  world_y: number,
  world_z: number,
  screen_x: number,
  screen_y: number,
  fog_visible: boolean
): void;
/** 取消Frame绑定 */
declare function DzFrameUnBind(frame: number): void;
/**
 * 绑定Frame到物品
 * 通过世界/屏幕坐标绑定物品显示
 */
declare function KKFrameBindItem(
  frame: number,
  u: widget,
  world_x: number,
  world_y: number,
  world_z: number,
  screen_x: number,
  screen_y: number,
  fog_visible: boolean,
  item_visible: boolean
): void;

// Frame/IME/checkbox helpers
/** 禁用单位预选UI */
declare function DzDisableUnitPreselectUi(): void;
/** 禁用物品预选UI */
declare function DzDisableItemPreselectUi(): void;
/** 获取下层Frame */
declare function DzFrameGetLowerLevelFrame(): number;
/** 设置复选框选中状态 */
declare function DzFrameSetCheckBoxState(check_box_frame: number, checked: boolean): void;
/** 获取复选框选中状态 */
declare function DzFrameGetCheckBoxState(check_box_frame: number): boolean;
/** 判断Frame是否获得焦点 */
declare function DzFrameIsFocus(frame: number): boolean;
/** 设置编辑框激活状态 */
declare function DzFrameSetEditBoxActive(frame: number, is_active: boolean): void;
/** 设置编辑框禁用输入法 */
declare function DzFrameSetEditBoxDisableIme(frame: number, is_disable: boolean): void;

// Window / system metrics
/** 获取窗口模式开启状态 */
declare function DzIsWindowMode(): boolean;
/** 设置窗口位置 */
declare function DzWindowSetPoint(x: number, y: number): void;
/** 设置窗口大小 */
declare function DzWindowSetSize(width: number, height: number): void;
/** 获取系统窗口宽度 */
declare function DzGetSystemMetricsWidth(): number;
/** 获取系统窗口高度 */
declare function DzGetSystemMetricsHeight(): number;

// Doodads
/** 获取装饰物数量 */
declare function DzGetDoodadsCount(): number;
/** 设置装饰物缩放 */
declare function DzSetDoodadsMatScale(doodads_index: number, x: number, y: number, z: number): void;
/** 设置装饰物绕X轴旋转 */
declare function DzSetDoodadsMatRotateX(doodads_index: number, x: number): void;
/** 设置装饰物绕Y轴旋转 */
declare function DzSetDoodadsMatRotateY(doodads_index: number, y: number): void;
/** 设置装饰物绕Z轴旋转 */
declare function DzSetDoodadsMatRotateZ(doodads_index: number, z: number): void;
/** 重置装饰物变换矩阵 */
declare function DzSetDoodadsMatReset(doodads_index: number): void;

// Ability extended (cost/req/unit/build)
/** 设置单位技能魔法消耗 */
declare function DzSetUnitAbilityCost(Unit: unit, abil_code: number, value: number): boolean;
/** 获取单位技能魔法消耗 */
declare function DzGetUnitAbilityCost(Unit: unit, abil_code: number): number;
/** 设置单位技能需求等级 */
declare function DzSetUnitAbilityReqLevel(Unit: unit, abil_code: number, value: number): boolean;
/** 获取单位技能需求等级 */
declare function DzGetUnitAbilityReqLevel(Unit: unit, abil_code: number): number;
/** 设置单位技能关联单位ID */
declare function DzSetUnitAbilityUnitId(Unit: unit, abil_code: number, value: number): boolean;
/** 获取单位技能关联单位ID */
declare function DzGetUnitAbilityUnitId(Unit: unit, abil_code: number): number;
/** 设置单位技能建造命令ID */
declare function DzSetUnitAbilityBuildOrderId(
  Unit: unit,
  abil_code: number,
  value: number
): boolean;
/** 获取单位技能建造命令ID */
declare function DzGetUnitAbilityBuildOrderId(Unit: unit, abil_code: number): number;
/**
 * 设置技能建造模型
 * 设置模型路径与缩放
 */
declare function DzSetUnitAbilityBuildModel(
  Unit: unit,
  abil_code: number,
  model_path: string,
  model_scale: number
): boolean;
/** 判断单位是否拥有技能 */
declare function DzUnitHasAbility(Unit: unit, abil_code: number): boolean;

/**
 * 单位可放置检查
 * 检查${obj}在(${x},${y})附近是否可放置
 * 返回是否可在该点附近放置单位/建筑
 */
declare function DzUnitCanPlaceAround(obj: widget, x: number, y: number): boolean;

// ===== KKWE API sync (KKPRE / KKAPI / BlizzardAPI natives) =====

/**
 * 界面 - 获取 Buff 栏
 * 获取 Buff 栏
 * 返回控制面板单位详情中的 Buff 栏 frame
 */
declare function DzGetBuffBar(): number;

/**
 * 界面 - 获取 Buff 栏按钮
 * 获取 Buff 栏第 ${row} 行第 ${col} 列按钮
 * 返回控制面板单位详情中的 Buff 按钮 frame
 */
declare function DzGetBuffBarButton(row: number, col: number): number;

/**
 * 界面 - 调整 Buff 栏
 * 设置 Buff 栏为 ${row} 行 ${col} 列
 */
declare function DzBuffBarResize(row: number, col: number): void;

/**
 * 界面 - 设置 Buff 栏显示重复 Buff
 * 设置 Buff 栏显示重复 Buff：${flag}
 */
declare function DzSetBuffBarShowDuplicatedBuff(flag: boolean): void;

/**
 * Buff - 添加 Buff
 * 为 ${target} 添加 Buff：来源 ${source} 类型 ${typeId} 显示 ${buffId} 等级 ${level} 优先级 ${priority} 持续 ${duration} 数据 ${data1} ${data2} ${data3} ${data4} ${data5} ${data6} ${data7} ${data8} ${data9} ${data10} ${data11}
 */
declare function DzUnitAddBuff(
  target: unit,
  source: unit,
  typeId: number,
  buffId: number,
  level: number,
  priority: number,
  duration: number,
  data1: number,
  data2: number,
  data3: number,
  data4: number,
  data5: number,
  data6: number,
  data7: number,
  data8: number,
  data9: number,
  data10: number,
  data11: number
): boolean;

/**
 * Buff - 添加被探测到 Bdet
 * 为 ${target} 添加被探测到 Buff ${buffId} 等级 ${level} 优先级 ${priority} 持续 ${duration} 探测玩家 ${detectPlayer} 探测类型 ${detectType}
 * 类型填3, 添加后可以被敌人看到自己的隐身状态
 */
declare function DzUnitAddBuffBdet(
  target: unit,
  buffId: number,
  level: number,
  priority: number,
  duration: number,
  detectPlayer: player,
  detectType: number
): boolean;

/**
 * Buff - 添加操纵死尸 BUan
 * 为 ${target} 添加操纵死尸 Buff ${buffId} 等级 ${level} 优先级 ${priority} 持续 ${duration} 无敌 ${invulnerable}
 * 做为 被召唤出来的死尸 到期后杀死 1为无敌 0不无敌  会受到驱逐魔法的伤害
 */
declare function DzUnitAddBuffBUan(
  target: unit,
  buffId: number,
  level: number,
  priority: number,
  duration: number,
  invulnerable: number
): boolean;

/**
 * Buff - 添加召唤出来的物品 BFig
 * 为 ${target} 添加召唤出来的物品 Buff ${buffId} 等级 ${level} 优先级 ${priority} 持续 ${duration}
 * 做为 被物品召唤出来的召唤物 到期后杀死 会受到驱逐魔法的伤害
 */
declare function DzUnitAddBuffBFig(
  target: unit,
  buffId: number,
  level: number,
  priority: number,
  duration: number
): boolean;

/**
 * Buff - 添加自然之力 BEfn
 * 为 ${target} 添加自然之力 Buff ${buffId} 等级 ${level} 优先级 ${priority} 持续 ${duration}
 * 做为 被自然之力召唤出来的树人 到期后杀死 会受到驱逐魔法的伤害
 */
declare function DzUnitAddBuffBEfn(
  target: unit,
  buffId: number,
  level: number,
  priority: number,
  duration: number
): boolean;

/**
 * Buff - 添加治疗守卫 Bhwd
 * 为 ${target} 添加治疗守卫 Buff ${buffId} 等级 ${level} 优先级 ${priority} 持续 ${duration}
 * 做为 被召唤出来的治疗守卫 到期后杀死 会受到驱逐魔法的伤害
 */
declare function DzUnitAddBuffBhwd(
  target: unit,
  buffId: number,
  level: number,
  priority: number,
  duration: number
): boolean;

/**
 * Buff - 添加疾病云雾 Bplg
 * 为 ${target} 添加疾病云雾 Buff ${buffId} 等级 ${level} 优先级 ${priority} 持续 ${duration}
 * 做为 疾病云雾的蝗虫单位 无法选中 到期后杀死 会受到驱逐魔法的伤害
 */
declare function DzUnitAddBuffBplg(
  target: unit,
  buffId: number,
  level: number,
  priority: number,
  duration: number
): boolean;

/**
 * Buff - 添加骷髅战士 Brai
 * 为 ${target} 添加骷髅战士 Buff ${buffId} 等级 ${level} 优先级 ${priority} 持续 ${duration}
 * 做为 被召唤出来的骷髅战士 到期后杀死  会受到驱逐魔法的伤害
 */
declare function DzUnitAddBuffBrai(
  target: unit,
  buffId: number,
  level: number,
  priority: number,
  duration: number
): boolean;

/**
 * Buff - 添加水元素 BHwe
 * 为 ${target} 添加水元素 Buff ${buffId} 等级 ${level} 优先级 ${priority} 持续 ${duration}
 * 做为 被召唤出来的水元素 到期后杀死  会受到驱逐魔法的伤害
 */
declare function DzUnitAddBuffBHwe(
  target: unit,
  buffId: number,
  level: number,
  priority: number,
  duration: number
): boolean;

/**
 * Buff - 添加定时的生命 BTLF
 * 为 ${target} 添加定时的生命 Buff ${buffId} 等级 ${level} 优先级 ${priority} 持续 ${duration}
 * 做为 定时的生命 到期后杀死  会受到驱逐魔法的伤害
 */
declare function DzUnitAddBuffBTLF(
  target: unit,
  buffId: number,
  level: number,
  priority: number,
  duration: number
): boolean;

/**
 * Buff - 添加守护卷轴 Bdef
 * 为 ${target} 添加守护卷轴 Buff ${buffId} 等级 ${level} 优先级 ${priority} 持续 ${duration} 护甲 ${armor}
 * 能添加绿字护甲的buff
 */
declare function DzUnitAddBuffBdef(
  target: unit,
  buffId: number,
  level: number,
  priority: number,
  duration: number,
  armor: number
): boolean;

/**
 * Buff - 添加吞噬 Bdig
 * 为 ${target} 添加吞噬 Buff：来源 ${source} 显示 ${buffId} 等级 ${level} 优先级 ${priority} 持续 ${duration} 每秒伤害 ${dps}
 * 每秒对target造成伤害
 */
declare function DzUnitAddBuffBdig(
  target: unit,
  source: unit,
  buffId: number,
  level: number,
  priority: number,
  duration: number,
  dps: number
): boolean;

/**
 * Buff - 添加神圣护甲 BHds
 * 为 ${target} 添加神圣护甲 Buff ${buffId} 等级 ${level} 优先级 ${priority} 持续 ${duration}
 * 持续时间内无敌
 */
declare function DzUnitAddBuffBHds(
  target: unit,
  buffId: number,
  level: number,
  priority: number,
  duration: number
): boolean;

/**
 * Buff - 添加魔鬼缠身 BNdo
 * 为 ${target} 添加魔鬼缠身 Buff：来源 ${source} 显示 ${buffId} 等级 ${level} 优先级 ${priority} 持续 ${duration} 每秒伤害 ${dps} 所有者 ${owner} 单位类型 ${unitId} 数量 ${count} 生命周期 ${lifeTime} 召唤 Buff ${summonBuffId}
 * 每秒造成伤害 持续时间内死亡 会召唤单位
 */
declare function DzUnitAddBuffBNdo(
  target: unit,
  source: unit,
  buffId: number,
  level: number,
  priority: number,
  duration: number,
  dps: number,
  owner: player,
  unitId: number,
  count: number,
  lifeTime: number,
  summonBuffId: number
): boolean;

/**
 * Buff - 添加魔鬼缠身 (奴) BNdi
 * 为 ${target} 添加魔鬼缠身 Buff ${buffId} 等级 ${level} 优先级 ${priority} 持续 ${duration}
 * 作为被 召唤的单位 到期后杀死
 */
declare function DzUnitAddBuffBNdi(
  target: unit,
  buffId: number,
  level: number,
  priority: number,
  duration: number
): boolean;

/**
 * Buff - 添加醉酒云雾 BNdh
 * 为 ${target} 添加醉酒云雾 Buff：来源 ${source} 显示 ${buffId} 等级 ${level} 优先级 ${priority} 持续 ${duration} 移速 ${moveSpeed} % 攻速 ${attackSpeed} % 禁用类型 ${disableType} 丢失概率 ${missChance} %
 * 持续时间内 增加减少移速百分比 增加减少攻速百分比 增加减少丢失概率 负数减少
 */
declare function DzUnitAddBuffBNdh(
  target: unit,
  source: unit,
  buffId: number,
  level: number,
  priority: number,
  duration: number,
  moveSpeed: number,
  attackSpeed: number,
  disableType: number,
  missChance: number
): boolean;

/**
 * Buff - 添加地震 BOeq
 * 为 ${target} 添加地震 Buff：来源 ${source} 显示 ${buffId} 等级 ${level} 优先级 ${priority} 持续 ${duration} 移速 ${moveSpeed} % 攻速 ${attackSpeed} %
 * 持续时间内 增加减少移速百分比 增加减少攻速百分比 负数减少
 */
declare function DzUnitAddBuffBOeq(
  target: unit,
  source: unit,
  buffId: number,
  level: number,
  priority: number,
  duration: number,
  moveSpeed: number,
  attackSpeed: number
): boolean;

/**
 * Buff - 添加吃树 Beat
 * 为 ${target} 添加吃树 Buff ${buffId} 等级 ${level} 优先级 ${priority} 持续 ${duration} 生命恢复 ${health} % 魔法恢复 ${mana} %
 * 持续时间内 生命恢复百分比 魔法恢复百分比
 */
declare function DzUnitAddBuffBeat(
  target: unit,
  buffId: number,
  level: number,
  priority: number,
  duration: number,
  health: number,
  mana: number
): boolean;

/**
 * Buff - 添加拔树 Bgra
 * 为 ${target} 添加拔树 Buff ${buffId} 等级 ${level} 优先级 ${priority} 持续 ${duration} 攻击次数 ${attackCount} 禁用武器 ${disableWeapon} 启用武器 ${enableWeapon} 树木 ${treeId}
 */
declare function DzUnitAddBuffBgra(
  target: unit,
  buffId: number,
  level: number,
  priority: number,
  duration: number,
  attackCount: number,
  disableWeapon: number,
  enableWeapon: number,
  treeId: number
): boolean;

/**
 * Buff - 添加诱捕 (空中的) Bena
 * 为 ${target} 添加诱捕 (空中的) Buff：来源 ${source} 显示 ${buffId} 等级 ${level} 优先级 ${priority} 持续 ${duration} 所有者 ${owner} 下落时间 ${fallTime} 高度 ${height} 近战范围 ${meleeRange}
 * 持续时间内不能移动 并且飞行单位会落到地面 近战单位可以设置攻击距离
 */
declare function DzUnitAddBuffBena(
  target: unit,
  source: unit,
  buffId: number,
  level: number,
  priority: number,
  duration: number,
  owner: player,
  fallTime: number,
  height: number,
  meleeRange: number
): boolean;

/**
 * Buff - 添加诱捕 (地面的) Beng
 * 为 ${target} 添加诱捕 (地面的) Buff：来源 ${source} 显示 ${buffId} 等级 ${level} 优先级 ${priority} 持续 ${duration} 所有者 ${owner} 下落时间 ${fallTime} 高度 ${height} 近战范围 ${meleeRange}
 * 持续时间内不能移动 并且飞行单位会落到地面 近战单位可以设置攻击距离
 */
declare function DzUnitAddBuffBeng(
  target: unit,
  source: unit,
  buffId: number,
  level: number,
  priority: number,
  duration: number,
  owner: player,
  fallTime: number,
  height: number,
  meleeRange: number
): boolean;

/**
 * Buff - 添加蛛网 (空中的) Bwea
 * 为 ${target} 添加蛛网 (空中的) Buff：来源 ${source} 显示 ${buffId} 等级 ${level} 优先级 ${priority} 持续 ${duration} 所有者 ${owner} 下落时间 ${fallTime} 高度 ${height} 近战范围 ${meleeRange}
 * 持续时间内不能移动 并且飞行单位会落到地面 近战单位可以设置攻击距离
 */
declare function DzUnitAddBuffBwea(
  target: unit,
  source: unit,
  buffId: number,
  level: number,
  priority: number,
  duration: number,
  owner: player,
  fallTime: number,
  height: number,
  meleeRange: number
): boolean;

/**
 * Buff - 添加蛛网 (地面的) Bweb
 * 为 ${target} 添加蛛网 (地面的) Buff：来源 ${source} 显示 ${buffId} 等级 ${level} 优先级 ${priority} 持续 ${duration} 所有者 ${owner} 下落时间 ${fallTime} 高度 ${height} 近战范围 ${meleeRange}
 * 持续时间内不能移动 并且飞行单位会落到地面 近战单位可以设置攻击距离
 */
declare function DzUnitAddBuffBweb(
  target: unit,
  source: unit,
  buffId: number,
  level: number,
  priority: number,
  duration: number,
  owner: player,
  fallTime: number,
  height: number,
  meleeRange: number
): boolean;

/**
 * Buff - 添加纠缠根须 BEer
 * 为 ${target} 添加纠缠根须 Buff：来源 ${source} 显示 ${buffId} 等级 ${level} 优先级 ${priority} 持续 ${duration} 每秒伤害 ${dps}
 * 持续期间不能移动 不能攻击 并且每秒受到伤害
 */
declare function DzUnitAddBuffBEer(
  target: unit,
  source: unit,
  buffId: number,
  level: number,
  priority: number,
  duration: number,
  dps: number
): boolean;

/**
 * Buff - 添加诅咒 Bcrs
 * 为 ${target} 添加诅咒 Buff：来源 ${source} 显示 ${buffId} 等级 ${level} 优先级 ${priority} 持续 ${duration} 丢失概率 ${missChance} %
 * 持续期间 攻击丢失百分比
 */
declare function DzUnitAddBuffBcrsV2(
  target: unit,
  source: unit,
  buffId: number,
  level: number,
  priority: number,
  duration: number,
  missChance: number
): boolean;

/**
 * Buff - 添加岗哨守卫 Beye
 * 为 ${target} 添加岗哨守卫 Buff ${buffId} 等级 ${level} 优先级 ${priority} 持续 ${duration}
 * 作为被 召唤的岗哨守卫 持续时间内隐身 攻击不会显影 到期后杀死
 */
declare function DzUnitAddBuffBeye(
  target: unit,
  buffId: number,
  level: number,
  priority: number,
  duration: number
): boolean;

/**
 * Buff - 添加精灵之火 Bfae
 * 为 ${target} 添加精灵之火 Buff ${buffId} 等级 ${level} 优先级 ${priority} 持续 ${duration} 所有者 ${owner} 护甲降低 ${armorReduce}
 * 持续期间 减少护甲
 */
declare function DzUnitAddBuffBfae(
  target: unit,
  buffId: number,
  level: number,
  priority: number,
  duration: number,
  owner: player,
  armorReduce: number
): boolean;

/**
 * Buff - 添加影子权杖 Bshs
 * 为 ${target} 添加影子权杖 Buff ${buffId} 等级 ${level} 优先级 ${priority} 持续 ${duration} 所有者 ${owner}
 * 添加后可以被敌人看到自己的隐身状态
 */
declare function DzUnitAddBuffBshs(
  target: unit,
  buffId: number,
  level: number,
  priority: number,
  duration: number,
  owner: player
): boolean;

/**
 * Buff - 添加炎魔 BNlm
 * 为 ${target} 添加炎魔 Buff ${buffId} 等级 ${level} 优先级 ${priority} 持续 ${duration} 分裂数量 ${splitCount} 分裂延迟 ${splitDelay} 所需攻击 ${attackNeeded} 生命加成 ${healthBonus} 生命周期加成 ${lifeTimeBonus} 最大数量 ${maxCount} 剩余数量 ${remainingCount} 距离 ${distance}
 * 会分裂单位 到期后杀死
 */
declare function DzUnitAddBuffBNlm(
  target: unit,
  buffId: number,
  level: number,
  priority: number,
  duration: number,
  splitCount: number,
  splitDelay: number,
  attackNeeded: number,
  healthBonus: number,
  lifeTimeBonus: number,
  maxCount: number,
  remainingCount: number,
  distance: number
): boolean;

/**
 * Buff - 添加灵魂燃烧 BNso
 * 为 ${target} 添加灵魂燃烧 Buff：来源 ${source} 显示 ${buffId} 等级 ${level} 优先级 ${priority} 持续 ${duration} 伤害 ${damage} 间隔 ${interval} 移速降低 ${moveSpeedReduce} 倍 攻速降低 ${attackSpeedReduce} 倍 攻击降低 ${attackReduce} 倍
 * 持续期间受到伤害 并且 降低移速 攻速 攻击力 倍数
 */
declare function DzUnitAddBuffBNso(
  target: unit,
  source: unit,
  buffId: number,
  level: number,
  priority: number,
  duration: number,
  damage: number,
  interval: number,
  moveSpeedReduce: number,
  attackSpeedReduce: number,
  attackReduce: number
): boolean;

/**
 * Buff - 添加被击晕的 BPSE
 * 为 ${target} 添加被击晕的 Buff：来源 ${source} 显示 ${buffId} 等级 ${level} 优先级 ${priority} 持续 ${duration}
 * 持续期间 晕眩 不能攻击移动
 */
declare function DzUnitAddBuffBPSE(
  target: unit,
  source: unit,
  buffId: number,
  level: number,
  priority: number,
  duration: number
): boolean;

/**
 * Buff - 添加烈焰风暴 BHfa
 * 为 ${target} 添加烈焰风暴 Buff ${buffId} 等级 ${level} 优先级 ${priority} 持续 ${duration} 伤害 ${damage}
 * 这个伤害可能没什么作用 加了仅仅是防止被其他烈焰风暴aoe伤害而已
 */
declare function DzUnitAddBuffBHfa(
  target: unit,
  buffId: number,
  level: number,
  priority: number,
  duration: number,
  damage: number
): boolean;

/**
 * Buff - 添加霜冻护甲 BUfa
 * 为 ${target} 添加霜冻护甲 Buff ${buffId} 等级 ${level} 优先级 ${priority} 持续 ${duration} 减益持续 ${debuffDuration} 护甲 ${armor}
 * 持续时间获得 额外护甲
 */
declare function DzUnitAddBuffBUfa(
  target: unit,
  buffId: number,
  level: number,
  priority: number,
  duration: number,
  debuffDuration: number,
  armor: number
): boolean;

/**
 * Buff - 添加被减速的 Bfro
 * 为 ${target} 添加被减速的 Buff：来源 ${source} 显示 ${buffId} 等级 ${level} 优先级 ${priority} 持续 ${duration} 移速 ${moveSpeed} % 攻速 ${attackSpeed} %
 * 持续期间 增加减少 移速 攻速 百分比 负数减少
 */
declare function DzUnitAddBuffBfro(
  target: unit,
  source: unit,
  buffId: number,
  level: number,
  priority: number,
  duration: number,
  moveSpeed: number,
  attackSpeed: number
): boolean;

/**
 * Buff - 添加妖术 BOhx
 * 为 ${target} 添加妖术 Buff：来源 ${source} 显示 ${buffId} 等级 ${level} 优先级 ${priority} 持续 ${duration} 单位类型 ${unitId}
 */
declare function DzUnitAddBuffBOhx(
  target: unit,
  source: unit,
  buffId: number,
  level: number,
  priority: number,
  duration: number,
  unitId: number
): boolean;

/**
 * Buff - 添加恐怖嚎叫 BNht
 * 为 ${target} 添加恐怖嚎叫 Buff ${buffId} 等级 ${level} 优先级 ${priority} 持续 ${duration} 伤害增加 ${damageIncrease} % 护甲 ${armor} 生命恢复 ${healthRegen} 魔法恢复 ${manaRegen}
 * 持续期间 增加减少 攻击 护甲 生命恢复 魔法恢复  负数减少
 */
declare function DzUnitAddBuffBNht(
  target: unit,
  buffId: number,
  level: number,
  priority: number,
  duration: number,
  damageIncrease: number,
  armor: number,
  healthRegen: number,
  manaRegen: number
): boolean;

/**
 * Buff - 添加净化 Bprg
 * 为 ${target} 添加净化 Buff：来源 ${source} 显示 ${buffId} 等级 ${level} 优先级 ${priority} 持续 ${duration} 移速更新次数 ${moveSpeedUpdateCount} 攻速更新次数 ${attackSpeedUpdateCount} 暂停持续 ${pauseDuration} 英雄暂停 ${heroPauseDuration}
 * 获得时会暂停单位 之后减速
 */
declare function DzUnitAddBuffBprg(
  target: unit,
  source: unit,
  buffId: number,
  level: number,
  priority: number,
  duration: number,
  moveSpeedUpdateCount: number,
  attackSpeedUpdateCount: number,
  pauseDuration: number,
  heroPauseDuration: number
): boolean;

/**
 * Buff - 添加医疗 Bhea
 * 为 ${target} 添加医疗 Buff：来源 ${source} 显示 ${buffId} 等级 ${level} 优先级 ${priority} 持续 ${duration}
 * 没有治疗效果  添加之后不会被其他技能治疗
 */
declare function DzUnitAddBuffBhea(
  target: unit,
  source: unit,
  buffId: number,
  level: number,
  priority: number,
  duration: number
): boolean;

/**
 * Buff - 添加生命恢复 Brej
 * 为 ${target} 添加生命恢复 Buff ${buffId} 等级 ${level} 优先级 ${priority} 持续 ${duration} 生命 ${health} 魔法 ${mana}
 * 持续时间内 恢复生命值 恢复魔法值  参数是总的恢复量
 */
declare function DzUnitAddBuffBrej(
  target: unit,
  buffId: number,
  level: number,
  priority: number,
  duration: number,
  health: number,
  mana: number
): boolean;

/**
 * Buff - 添加净化药水 BIrm
 * 为 ${target} 添加净化药水 Buff ${buffId} 等级 ${level} 优先级 ${priority} 持续 ${duration} 魔法 ${mana} 被攻击时驱散 ${dispel}
 * 恢复魔法值  最后一个参数填1被攻击时驱散
 */
declare function DzUnitAddBuffBIrm(
  target: unit,
  buffId: number,
  level: number,
  priority: number,
  duration: number,
  mana: number,
  dispel: number
): boolean;

/**
 * Buff - 添加再生物品 BIrl
 * 为 ${target} 添加再生物品 Buff ${buffId} 等级 ${level} 优先级 ${priority} 持续 ${duration} 生命 ${health} 驱散 ${dispel}
 * 恢复生命值  最后一个参数填1被攻击时驱散
 */
declare function DzUnitAddBuffBIrl(
  target: unit,
  buffId: number,
  level: number,
  priority: number,
  duration: number,
  health: number,
  dispel: number
): boolean;

/**
 * Buff - 添加生命恢复 BIrg
 * 为 ${target} 添加生命恢复 Buff ${buffId} 等级 ${level} 优先级 ${priority} 持续 ${duration} 生命 ${health} 魔法 ${mana} 驱散 ${dispel}
 * 恢复生命值 恢复魔法值  最后一个参数填1被攻击时驱散
 */
declare function DzUnitAddBuffBIrg(
  target: unit,
  buffId: number,
  level: number,
  priority: number,
  duration: number,
  health: number,
  mana: number,
  dispel: number
): boolean;

/**
 * Buff - 添加冰冻 Bfre
 * 为 ${target} 添加冰冻 Buff：来源 ${source} 显示 ${buffId} 等级 ${level} 优先级 ${priority} 持续 ${duration} 镜像 ${mirrorImage}
 * 持续时间 不能移动  最后一个参数 镜像单位填1 否则填0
 */
declare function DzUnitAddBuffBfre(
  target: unit,
  source: unit,
  buffId: number,
  level: number,
  priority: number,
  duration: number,
  mirrorImage: number
): boolean;

/**
 * Buff - 添加腐蚀 BIcb
 * 为 ${target} 添加腐蚀 Buff ${buffId} 等级 ${level} 优先级 ${priority} 持续 ${duration} 护甲降低 ${armorReduce}
 * 持续时间内 降低护甲
 */
declare function DzUnitAddBuffBIcb(
  target: unit,
  buffId: number,
  level: number,
  priority: number,
  duration: number,
  armorReduce: number
): boolean;

/**
 * Buff - 添加再生 BIrb
 * 为 ${target} 添加再生 Buff ${buffId} 等级 ${level} 优先级 ${priority} 持续 ${duration}
 * 作为被复活的召唤物 到期后杀死
 */
declare function DzUnitAddBuffBIrb(
  target: unit,
  buffId: number,
  level: number,
  priority: number,
  duration: number
): boolean;

/**
 * Buff - 添加吸血药水 BIpv
 * 为 ${target} 添加吸血药水 Buff ${buffId} 等级 ${level} 优先级 ${priority} 持续 ${duration} 生命偷取值 ${lifeSteal} 伤害奖励 ${damageBonus}
 * 生命偷取值 0.75 就是每次伤害的75%的回复生命值,  并且期间增加攻击力
 */
declare function DzUnitAddBuffBIpv(
  target: unit,
  buffId: number,
  level: number,
  priority: number,
  duration: number,
  lifeSteal: number,
  damageBonus: number
): boolean;

/**
 * Buff - 添加腐尸甲虫 BUcb
 * 为 ${target} 添加腐尸甲虫 Buff：来源 ${source} 显示 ${buffId} 等级 ${level} 优先级 ${priority} 持续 ${duration}
 * 作为被召唤的甲虫 到期后杀死
 */
declare function DzUnitAddBuffBUcb(
  target: unit,
  source: unit,
  buffId: number,
  level: number,
  priority: number,
  duration: number
): boolean;

/**
 * Buff - 添加献祭(施法者) BEia
 * 为 ${target} 添加献祭(施法者) Buff ${buffId} 等级 ${level} 优先级 ${priority} 持续 ${duration} 伤害 ${damage}
 * 单独添加没有效果 要跟 `Buff - 添加献祭 BEim` 一起添加到单位身上
 */
declare function DzUnitAddBuffBEia(
  target: unit,
  buffId: number,
  level: number,
  priority: number,
  duration: number,
  damage: number
): boolean;

/**
 * Buff - 添加献祭 BEim
 * 为 ${target} 添加献祭 Buff ${buffId} 等级 ${level} 优先级 ${priority} 持续 ${duration} 魔法消耗 ${manaCost} 间隔 ${interval} 范围 ${area} 伤害 ${damage} 目标允许 ${targetFlags} 所有者 ${owner}
 * 持续时间内 消耗魔法 对范围造成伤害
 */
declare function DzUnitAddBuffBEim(
  target: unit,
  buffId: number,
  level: number,
  priority: number,
  duration: number,
  manaCost: number,
  interval: number,
  area: number,
  damage: number,
  targetFlags: number,
  owner: player
): boolean;

/**
 * Buff - 添加永久的献祭 BNpi
 * 为 ${target} 添加永久的献祭 Buff ${buffId} 等级 ${level} 优先级 ${priority} 持续 ${duration} 魔法消耗 ${manaCost} 间隔 ${interval} 范围 ${area} 伤害 ${damage} 目标允许 ${targetFlags} 所有者 ${owner}
 */
declare function DzUnitAddBuffBNpi(
  target: unit,
  buffId: number,
  level: number,
  priority: number,
  duration: number,
  manaCost: number,
  interval: number,
  area: number,
  damage: number,
  targetFlags: number,
  owner: player
): boolean;

/**
 * Buff - 添加永久的献祭 Bpig
 * 为 ${target} 添加永久的献祭 Buff ${buffId} 等级 ${level} 优先级 ${priority} 持续 ${duration} 魔法消耗 ${manaCost} 间隔 ${interval} 范围 ${area} 伤害 ${damage} 目标允许 ${targetFlags} 所有者 ${owner}
 */
declare function DzUnitAddBuffBpig(
  target: unit,
  buffId: number,
  level: number,
  priority: number,
  duration: number,
  manaCost: number,
  interval: number,
  area: number,
  damage: number,
  targetFlags: number,
  owner: player
): boolean;

/**
 * Buff - 添加火焰风衣 BIcf
 * 为 ${target} 添加火焰风衣 Buff ${buffId} 等级 ${level} 优先级 ${priority} 持续 ${duration} 魔法消耗 ${manaCost} 间隔 ${interval} 范围 ${area} 伤害 ${damage} 目标允许 ${targetFlags} 所有者 ${owner}
 */
declare function DzUnitAddBuffBIcf(
  target: unit,
  buffId: number,
  level: number,
  priority: number,
  duration: number,
  manaCost: number,
  interval: number,
  area: number,
  damage: number,
  targetFlags: number,
  owner: player
): boolean;

/**
 * 物品栏 - 设置物品栏格子数量
 * 设置物品栏格子数量为 ${maxSize}
 * 初始化修改格子数量后, 可以超过6格拾取 并且通过 `物品栏 - 获取物品栏按钮` 获取超过6格的ui 然后把ui设置大小跟锚点位置。通过 `单位持有物品` 获取超过6格的物品handle
 */
declare function DzStartManageInventory(maxSize: number): boolean;

/**
 * 物品栏 - 设置快捷键
 * 设置物品栏第 ${slot} 格的快捷键为 ${hotkey}
 * 可以为超过6格的物品栏格子绑定快捷键
 */
declare function DzSetInventoryHotkey(slot: number, hotkey: string): boolean;

/**
 * 物品栏 - 获取物品栏最大格数
 * 获取物品栏最大格数
 */
declare function DzGetInventoryMaxSize(): number;

/**
 * 物品栏 - 获取 移动物品 的命令ID
 * 获取 移动物品到第 ${n} 格的命令ID
 */
declare function DzGetInventoryDropSlotOrderID(slot: number): number;

/**
 * 物品栏 - 获取 使用物品 的命令ID
 * 获取 使用第 ${n} 格物品 的命令ID
 */
declare function DzGetInventoryUseSlotOrderID(slot: number): number;

/**
 * 物品栏 - 获取物品栏按钮
 * 获取物品栏第 ${i} 个按钮
 * 索引从0开始, 扩展的物品栏需要用这个获取 UI (因为 DzFrameGetItemBarButton 只允许获取前6个)
 */
declare function DzGetInventoryBarButton(slot: number): number;

/** DzTriggerRegisterPlayerUnitSwapItemSlotEvent */
declare function DzTriggerRegisterPlayerUnitSwapItemSlotEvent(
  whichTrigger: trigger,
  whichPlayer: player
): event;

/**
 * 移动物品栏物品事件 - 获取来源格子ID
 * 移动物品栏物品事件 - 获取来源格子ID
 * 索引从0开始
 */
declare function DzGetSwapItemSlotEventFromSlotID(): number;

/**
 * 移动物品栏物品事件 - 获取目标格子ID
 * 移动物品栏物品事件 - 获取目标格子ID
 * 索引从0开始
 */
declare function DzGetSwapItemSlotEventToSlotID(): number;

/**
 * Buff - 添加穿刺 BUim
 * 为单位 ${target} 添加 BUim(穿刺) 来源为 ${source} 显示为 ${buffID} 等级 ${level} 魔法盗取优先级 ${spell_steal_priority} 持续时间 ${duration} 伤害 ${damage} 空中停留时间 ${airduration}
 * 会暂停 空中+持续 的总时间 并造成伤害
 */
declare function DzUnitAddBuffBUim(
  target: unit,
  source: unit,
  buffId: number,
  level: number,
  priority: number,
  duration: number,
  data1: number,
  data2: number
): boolean;

/**
 * Buff - 添加地狱火 BNin
 * 为单位 ${target} 添加 BNin(地狱火) 来源为 ${source} 显示为 ${buffID} 等级 ${level} 魔法盗取优先级 ${spell_steal_priority} 持续时间 ${duration} 目标X ${x} 目标Y ${y}
 * 添加时杀死target xy目前看不出有什么作用
 */
declare function DzUnitAddBuffBNin(
  target: unit,
  source: unit,
  buffId: number,
  level: number,
  priority: number,
  duration: number,
  data1: number,
  data2: number
): boolean;

/**
 * Buff - 添加心灵之火 Binf
 * 为单位 ${target} 添加 Binf(心灵之火) 显示为 ${buffID} 等级 ${level} 魔法盗取优先级 ${spell_steal_priority} 持续时间 ${duration} 攻击增加(%) ${attackincrease} 防御增加 ${armor} 生命恢复速度 ${healthregen} 魔法恢复速度 ${manaregen}
 * 攻击是增加百分比, 防御 跟 恢复速度 都是固定值
 */
declare function DzUnitAddBuffBinf(
  target: unit,
  buffId: number,
  level: number,
  priority: number,
  duration: number,
  data1: number,
  data2: number,
  data3: number,
  data4: number
): boolean;

/**
 * Buff - 添加隐形术 Binv
 * 为单位 ${target} 添加 Binv(隐形术) 显示为 ${buffID} 等级 ${level} 魔法盗取优先级 ${spell_steal_priority} 持续时间 ${duration} 渐隐时间${fadeduration}
 * 持续时间内隐身, 攻击或施法时解除
 */
declare function DzUnitAddBuffBinv(
  target: unit,
  buffId: number,
  level: number,
  priority: number,
  duration: number,
  data1: number
): boolean;

/**
 * Buff - 添加无敌的 Bvul
 * 为单位 ${target} 添加 Bvul(无敌的) 显示为 ${buffID} 等级 ${level} 魔法盗取优先级 ${spell_steal_priority} 持续时间 ${duration}
 * 持续时间内无敌
 */
declare function DzUnitAddBuffBvul(
  target: unit,
  buffId: number,
  level: number,
  priority: number,
  duration: number
): boolean;

/**
 * Buff - 添加闪电护盾 Blsh
 * 为单位 ${target} 添加 Blsh(闪电护盾) 显示为 ${buffID} 等级 ${level} 魔法盗取优先级 ${spell_steal_priority} 持续时间 ${duration} 伤害间隔 ${interval} 影响范围 ${AOE} 伤害 ${damage}
 * 持续时间内 对范围内的敌人造成伤害
 */
declare function DzUnitAddBuffBlsh(
  target: unit,
  buffId: number,
  level: number,
  priority: number,
  duration: number,
  data1: number,
  data2: number,
  data3: number
): boolean;

/**
 * Buff - 添加闪电护盾 Blsh
 * 为单位 ${target} 添加 Blsh(闪电护盾) 显示为 ${buffID} 等级 ${level} 魔法盗取优先级 ${spell_steal_priority} 持续时间 ${duration} 伤害间隔 ${interval} 影响范围 ${AOE} 伤害 ${damage} 目标允许 ${targetflags} 玩家 ${player}
 * 持续时间内 对范围内的敌人造成伤害
 */
declare function DzUnitAddBuffBlshV2(
  target: unit,
  buffId: number,
  level: number,
  priority: number,
  duration: number,
  data1: number,
  data2: number,
  data3: number,
  data4: number,
  owner: player
): boolean;

/**
 * Buff - 添加反魔法外壳 Bams
 * 为单位 ${target} 添加 Bams(反魔法外壳) 显示为 ${buffID} 等级 ${level} 魔法盗取优先级 ${spell_steal_priority} 持续时间 ${duration}
 * 持续时间内 魔法免疫
 */
declare function DzUnitAddBuffBams(
  target: unit,
  buffId: number,
  level: number,
  priority: number,
  duration: number
): boolean;

/**
 * Buff - 添加反魔法外壳 (额外的) Bam2
 * 为单位 ${target} 添加 Bam2(反魔法外壳 (额外的)) 显示为 ${buffID} 等级 ${level} 魔法盗取优先级 ${spell_steal_priority} 持续时间 ${duration} 护盾生命 ${shield}
 * 持续时间内 护盾会抵消魔法伤害
 */
declare function DzUnitAddBuffBam2(
  target: unit,
  buffId: number,
  level: number,
  priority: number,
  duration: number,
  data1: number
): boolean;

/**
 * Buff - 添加魔力之焰 Bmfl
 * 为单位 ${target} 添加 Bmfl(魔力之焰) 显示为 ${buffID} 等级 ${level} 魔法盗取优先级 ${spell_steal_priority} 持续时间 ${duration} 影响范围 ${AOE} 每点魔法造成伤害(单位) ${damagepermana} 每点魔法造成伤害(英雄) ${herodamagepermana} 最大伤害(单位) ${maxdamage} 最大伤害(英雄) ${heromaxdamage} 施法距离 ${range} 魔法施法时间 ${cd} 仅溅射伤害有魔法单位 ${onlyunithavemana} 目标允许 ${targetflags} 魔法效果 ${buff}
 * 持续时间内 周围敌人释放技能时 会受到伤害
 */
declare function DzUnitAddBuffBmfl(
  target: unit,
  buffId: number,
  level: number,
  priority: number,
  duration: number,
  data1: number,
  data2: number,
  data3: number,
  data4: number,
  data5: number,
  data6: number,
  data7: number,
  data8: number,
  data9: number,
  data10: number
): boolean;

/**
 * Buff - 添加魔法护盾 BNms
 * 为单位 ${target} 添加 BNms(魔法护盾) 显示为 ${buffID} 等级 ${level} 魔法盗取优先级 ${spell_steal_priority} 持续时间 ${duration} 每点魔法抵消的伤害值 ${damageabsorbpermana} 伤害吸收(%) ${absorbpercent}
 * 持续时间内 根据当前蓝量 跟 伤害吸收比 抵消魔法伤害
 */
declare function DzUnitAddBuffBNms(
  target: unit,
  buffId: number,
  level: number,
  priority: number,
  duration: number,
  data1: number,
  data2: number
): boolean;

/**
 * Buff - 添加镜像 BOmi
 * 为单位 ${target} 添加 BOmi(镜像) 来源为 ${source} 显示为 ${buffID} 等级 ${level} 魔法盗取优先级 ${spell_steal_priority} 持续时间 ${duration} 施加伤害(倍数) ${damagedeal} 所受伤害(倍数) ${damagetaken}
 * 作为镜像单位 持续期间 伤害小于1是减伤大于1是增伤, 到期后会杀死单位
 */
declare function DzUnitAddBuffBOmi(
  target: unit,
  source: unit,
  buffId: number,
  level: number,
  priority: number,
  duration: number,
  data1: number,
  data2: number
): boolean;

/**
 * Buff - 添加幻象物品 BIil
 * 为单位 ${target} 添加 BIil(幻象物品) 来源为 ${source} 显示为 ${buffID} 等级 ${level} 魔法盗取优先级 ${spell_steal_priority} 持续时间 ${duration} 施加伤害(倍数) ${damagedeal} 所受伤害(倍数) ${damagetaken}
 * 作为镜像单位 持续期间 伤害小于1是减伤大于1是增伤, 到期后会杀死单位
 */
declare function DzUnitAddBuffBIil(
  target: unit,
  source: unit,
  buffId: number,
  level: number,
  priority: number,
  duration: number,
  data1: number,
  data2: number
): boolean;

/**
 * Buff - 添加寄生虫 BNpa
 * 为单位 ${target} 添加 BNpa(寄生虫) 显示为 ${buffID} 等级 ${level} 魔法盗取优先级 ${spell_steal_priority} 持续时间 ${duration} 每秒伤害 ${DPS} 移速减少(%) ${movespeedreduce} 攻速减少(%) ${attackspeedreduce} 叠加类型 ${stacktype} 单位类型 ${unitID} 召唤单位数量 ${count} 召唤单位持续时间 ${timelife} 召唤单位所属玩家 ${player} 魔法效果 ${buff}
 * 持续时间内掉血 减速 并且期间死亡 会召唤单位
 */
declare function DzUnitAddBuffBNpa(
  target: unit,
  buffId: number,
  level: number,
  priority: number,
  duration: number,
  data1: number,
  data2: number,
  data3: number,
  data4: number,
  data5: number,
  data6: number,
  data7: number,
  owner: player,
  data8: number
): boolean;

/**
 * Buff - 添加寄生虫 BNpm
 * 为单位 ${target} 添加 BNpm(寄生虫) 显示为 ${buffID} 等级 ${level} 魔法盗取优先级 ${spell_steal_priority} 持续时间 ${duration}
 * 作为召唤单位 到期后杀死
 */
declare function DzUnitAddBuffBNpm(
  target: unit,
  buffId: number,
  level: number,
  priority: number,
  duration: number
): boolean;

/**
 * Buff - 添加变相移动 Bpsh
 * 为单位 ${target} 添加 Bpsh(变相移动) 来源为 ${source} 显示为 ${buffID} 等级 ${level} 魔法盗取优先级 ${spell_steal_priority} 持续时间 ${duration}
 * 持续时间内 模型不可见 且 无法被攻击
 */
declare function DzUnitAddBuffBpsh(
  target: unit,
  source: unit,
  buffId: number,
  level: number,
  priority: number,
  duration: number
): boolean;

/**
 * Buff - 添加变形术 Bply
 * 为单位 ${target} 添加 Bply(变形术) 来源为 ${source} 显示为 ${buffID} 等级 ${level} 魔法盗取优先级 ${spell_steal_priority} 持续时间 ${duration} 单位类型 ${unitID}
 * 持续时间内 变成小动物 且不能施法跟攻击
 */
declare function DzUnitAddBuffBply(
  target: unit,
  source: unit,
  buffId: number,
  level: number,
  priority: number,
  duration: number,
  data1: number
): boolean;

/**
 * Buff - 添加避难权杖 BNsa
 * 为单位 ${target} 添加 BNsa(避难权杖) 显示为 ${buffID} 等级 ${level} 魔法盗取优先级 ${spell_steal_priority} 持续时间 ${duration} 回复延迟 ${delay} 每秒生命恢复 ${healthregenpersec} 魔法伤害参数 ${magicdamage}
 * 持续时间内 不能移动跟攻击施法 恢复生命值
 */
declare function DzUnitAddBuffBNsa(
  target: unit,
  buffId: number,
  level: number,
  priority: number,
  duration: number,
  data1: number,
  data2: number,
  data3: number
): boolean;

/**
 * Buff - 添加雷霆一击 BHtc
 * 为单位 ${target} 添加 BHtc(雷霆一击) 来源为 ${source} 显示为 ${buffID} 等级 ${level} 魔法盗取优先级 ${spell_steal_priority} 持续时间 ${duration} 移速增加(倍数) ${movespeed} 攻速增加(倍数) ${attackspeed}
 * 持续时间内 增加或负数减少 移动速度 攻击速度 倍数-0.5 是降低50%的意思
 */
declare function DzUnitAddBuffBHtc(
  target: unit,
  source: unit,
  buffId: number,
  level: number,
  priority: number,
  duration: number,
  data1: number,
  data2: number
): boolean;

/**
 * Buff - 添加雷霆一击 BCtc
 * 为单位 ${target} 添加 BCtc(雷霆一击) 来源为 ${source} 显示为 ${buffID} 等级 ${level} 魔法盗取优先级 ${spell_steal_priority} 持续时间 ${duration} 移速增加(倍数) ${movespeed} 攻速增加(倍数) ${attackspeed}
 * 持续时间内 增加或负数减少 移动速度 攻击速度 倍数-0.5 是降低50%的意思
 */
declare function DzUnitAddBuffBCtc(
  target: unit,
  source: unit,
  buffId: number,
  level: number,
  priority: number,
  duration: number,
  data1: number,
  data2: number
): boolean;

/**
 * Buff - 添加口袋工厂 BNfy
 * 为单位 ${target} 添加 BNfy(口袋工厂) 显示为 ${buffID} 等级 ${level} 魔法盗取优先级 ${spell_steal_priority} 持续时间 ${duration} 生产单位间隔 ${delay} 生产单位类型 ${unitID} 生产单位持续时间 ${timelife} 魔法效果 ${buff} 生产单位位移 ${offset} 约束范围 ${range}
 * 作为口袋工厂召唤单位, 持续时间内按间隔召唤生产单位, 到期后工厂单位会被杀死
 */
declare function DzUnitAddBuffBNfy(
  target: unit,
  buffId: number,
  level: number,
  priority: number,
  duration: number,
  data1: number,
  data2: number,
  data3: number,
  data4: number,
  data5: number,
  data6: number
): boolean;

/**
 * Buff - 添加人工地精 BNcg
 * 为单位 ${target} 添加 BNcg(人工地精) 来源为 ${source} 显示为 ${buffID} 等级 ${level} 魔法盗取优先级 ${spell_steal_priority} 持续时间 ${duration} 中心X ${x} 中心Y ${y} 约束范围 ${range}
 * 作为召唤单位 到期后被杀死, 离开约束范围也会被杀死, x y 仅在单位为 null 时使用
 */
declare function DzUnitAddBuffBNcg(
  target: unit,
  source: unit,
  buffId: number,
  level: number,
  priority: number,
  duration: number,
  data1: number,
  data2: number,
  data3: number
): boolean;

/**
 * Buff - 添加龙卷风 BNto
 * 为单位 ${target} 添加 BNto(龙卷风) 显示为 ${buffID} 等级 ${level} 魔法盗取优先级 ${spell_steal_priority} 持续时间 ${duration}
 * 作为龙卷风召唤单位 持续时间内无敌 到期后杀死
 */
declare function DzUnitAddBuffBNto(
  target: unit,
  buffId: number,
  level: number,
  priority: number,
  duration: number
): boolean;

/**
 * Buff - 添加邪恶狂热 Buhf
 * 为单位 ${target} 添加 Buhf(邪恶狂热) 来源为 ${source} 显示为 ${buffID} 等级 ${level} 魔法盗取优先级 ${spell_steal_priority} 持续时间 ${duration} 每秒伤害 ${DPS} 攻速增加(%) ${attackspeed}
 * 持续时间内 每秒受到伤害 并且增加攻速
 */
declare function DzUnitAddBuffBuhf(
  target: unit,
  source: unit,
  buffId: number,
  level: number,
  priority: number,
  duration: number,
  data1: number,
  data2: number
): boolean;

/**
 * Buff - 添加反召唤 Buns
 * 为单位 ${target} 添加 Buns(反召唤) 来源为 ${source} 显示为 ${buffID} 等级 ${level} 魔法盗取优先级 ${spell_steal_priority} 持续时间 ${duration} 回收资源率(%) ${recyclerate} 每秒伤害 ${DPS}
 * 单位被暂停 持续受到伤害 并且获得金币跟木材  这个持续时间无效 直到死亡为止
 */
declare function DzUnitAddBuffBuns(
  target: unit,
  source: unit,
  buffId: number,
  level: number,
  priority: number,
  duration: number,
  data1: number,
  data2: number
): boolean;

/**
 * Buff - 添加巫毒(施法者) BOvc
 * 为单位 ${target} 添加 BOvc(巫毒(施法者)) 显示为 ${buffID} 等级 ${level} 魔法盗取优先级 ${spell_steal_priority} 持续时间 ${duration}
 * 只有特效 没别的附加效果
 */
declare function DzUnitAddBuffBOvc(
  target: unit,
  buffId: number,
  level: number,
  priority: number,
  duration: number
): boolean;

/**
 * Buff - 添加巫毒 BOvd
 * 为单位 ${target} 添加 BOvd(巫毒) 显示为 ${buffID} 等级 ${level} 魔法盗取优先级 ${spell_steal_priority} 持续时间 ${duration}
 * 持续时间内 单位无敌
 */
declare function DzUnitAddBuffBOvd(
  target: unit,
  buffId: number,
  level: number,
  priority: number,
  duration: number
): boolean;

/**
 * Buff - 添加守卫 BOwd
 * 为单位 ${target} 添加 BOwd(守卫) 显示为 ${buffID} 等级 ${level} 魔法盗取优先级 ${spell_steal_priority} 持续时间 ${duration}
 * 作为被召唤出来的守卫 到期后杀死
 */
declare function DzUnitAddBuffBOwd(
  target: unit,
  buffId: number,
  level: number,
  priority: number,
  duration: number
): boolean;

/**
 * Buff - 添加怪兽诱捕守卫 BImo
 * 为单位 ${target} 添加 BImo(怪兽诱捕守卫) 显示为 ${buffID} 等级 ${level} 魔法盗取优先级 ${spell_steal_priority} 持续时间 ${duration} 影响区域 ${AOE} 激活延迟 ${delay} 引诱间隔 ${interval}
 * 到期后杀死
 */
declare function DzUnitAddBuffBImo(
  target: unit,
  buffId: number,
  level: number,
  priority: number,
  duration: number,
  data1: number,
  data2: number,
  data3: number
): boolean;

/**
 * Buff - 添加水奴 BNwm
 * 为单位 ${target} 添加 BNwm(水奴) 显示为 ${buffID} 等级 ${level} 魔法盗取优先级 ${spell_steal_priority} 持续时间 ${duration}
 * 作为被召唤出来的单位, 到期后杀死
 */
declare function DzUnitAddBuffBNwm(
  target: unit,
  buffId: number,
  level: number,
  priority: number,
  duration: number
): boolean;

/**
 * Buff - 添加机械类的小玩艺 Bmec
 * 为单位 ${target} 添加 Bmec(机械类的小玩艺) 显示为 ${buffID} 等级 ${level} 魔法盗取优先级 ${spell_steal_priority} 持续时间 ${duration}
 * 作为被召唤出来的单位, 到期后杀死
 */
declare function DzUnitAddBuffBmec(
  target: unit,
  buffId: number,
  level: number,
  priority: number,
  duration: number
): boolean;

/**
 * Buff - 添加熊 BNsg
 * 为单位 ${target} 添加 BNsg(熊) 显示为 ${buffID} 等级 ${level} 魔法盗取优先级 ${spell_steal_priority} 持续时间 ${duration}
 * 作为被召唤出来的单位, 到期后杀死
 */
declare function DzUnitAddBuffBNsg(
  target: unit,
  buffId: number,
  level: number,
  priority: number,
  duration: number
): boolean;

/**
 * Buff - 添加豪猪 BNsq
 * 为单位 ${target} 添加 BNsq(豪猪) 显示为 ${buffID} 等级 ${level} 魔法盗取优先级 ${spell_steal_priority} 持续时间 ${duration}
 * 作为被召唤出来的单位, 到期后杀死
 */
declare function DzUnitAddBuffBNsq(
  target: unit,
  buffId: number,
  level: number,
  priority: number,
  duration: number
): boolean;

/**
 * Buff - 添加战鹰 BNsw
 * 为单位 ${target} 添加 BNsw(战鹰) 显示为 ${buffID} 等级 ${level} 魔法盗取优先级 ${spell_steal_priority} 持续时间 ${duration}
 * 作为被召唤出来的单位, 到期后杀死
 */
declare function DzUnitAddBuffBNsw(
  target: unit,
  buffId: number,
  level: number,
  priority: number,
  duration: number
): boolean;

/**
 * Buff - 添加疾步风 BOwk
 * 为单位 ${target} 添加 BOwk(疾步风) 显示为 ${buffID} 等级 ${level} 魔法盗取优先级 ${spell_steal_priority} 持续时间 ${duration} 转变时间 ${fadeduration} 移速增加(倍数) ${movespeed} 额外攻击伤害 ${attackbonus} 启用额外攻击伤害 ${enableattackbonus}
 * 持续时间内 隐身 + 移动速度 最后1启用 0不启用, 攻击或者施法后解除
 */
declare function DzUnitAddBuffBOwk(
  target: unit,
  buffId: number,
  level: number,
  priority: number,
  duration: number,
  data1: number,
  data2: number,
  data3: number,
  data4: number
): boolean;

/**
 * Buff - 添加冰冻喷吐 Bfrz
 * 为单位 ${target} 添加 Bfrz(冰冻喷吐) 来源为 ${source} 显示为 ${buffID} 等级 ${level} 魔法盗取优先级 ${spell_steal_priority} 持续时间 ${duration}
 * 持续时间内 被冰冻 不能施法攻击移动
 */
declare function DzUnitAddBuffBfrz(
  target: unit,
  source: unit,
  buffId: number,
  level: number,
  priority: number,
  duration: number
): boolean;

/**
 * Buff - 添加液体炸弹 Bliq
 * 为单位 ${target} 添加 Bliq(液体炸弹) 来源为 ${source} 显示为 ${buffID} 等级 ${level} 魔法盗取优先级 ${spell_steal_priority} 持续时间 ${duration} 每秒伤害 ${DPS} 移速减少(倍数) ${movespeedreduce} 攻速减少(倍数) ${attackspeedreduce} 允许修理 ${allowrepair}
 * 持续期间减移动速度 攻击速度
 */
declare function DzUnitAddBuffBliq(
  target: unit,
  source: unit,
  buffId: number,
  level: number,
  priority: number,
  duration: number,
  data1: number,
  data2: number,
  data3: number,
  data4: number
): boolean;

/**
 * Buff - 添加酸性炸弹 BNab
 * 为单位 ${target} 添加 BNab(酸性炸弹) 来源为 ${source} 显示为 ${buffID} 等级 ${level} 魔法盗取优先级 ${spell_steal_priority} 持续时间 ${duration} 护甲减少 ${armorreduce} 伤害数值 ${damage} 伤害间隔 ${interval} 移速减少(倍数) ${movespeedreduce} 攻速减少(倍数) ${attackspeedreduce}
 * 持续时间内 减少移速 攻速 护甲, 并且持续受到伤害
 */
declare function DzUnitAddBuffBNab(
  target: unit,
  source: unit,
  buffId: number,
  level: number,
  priority: number,
  duration: number,
  data1: number,
  data2: number,
  data3: number,
  data4: number,
  data5: number
): boolean;

/**
 * Buff - 添加灵魂保存 BNsl
 * 为单位 ${target} 添加 BNsl(灵魂保存) 来源为 ${source} 显示为 ${buffID} 等级 ${level} 魔法盗取优先级 ${spell_steal_priority} 持续时间 ${duration}
 * 持续时间内无敌，到期后会被杀死
 */
declare function DzUnitAddBuffBNsl(
  target: unit,
  source: unit,
  buffId: number,
  level: number,
  priority: number,
  duration: number
): boolean;

/**
 * Buff - 添加驱散 BHbn
 * 为单位 ${target} 添加 BHbn(驱散) 来源为 ${source} 显示为 ${buffID} 等级 ${level} 魔法盗取优先级 ${spell_steal_priority} 持续时间 ${duration} 移速增加(倍速) ${movespeed} 攻速增加(倍数) ${attackspeed}
 * 持续时间内 无法攻击施法  增加或负数降低移速攻速
 */
declare function DzUnitAddBuffBHbn(
  target: unit,
  source: unit,
  buffId: number,
  level: number,
  priority: number,
  duration: number,
  data1: number,
  data2: number
): boolean;

/**
 * Buff - 添加狂战士 Bbsk
 * 为单位 ${target} 添加 Bbsk(狂战士) 来源为 ${source} 显示为 ${buffID} 等级 ${level} 魔法盗取优先级 ${spell_steal_priority} 持续时间 ${duration} 移速增加(倍数) ${movespeed} 攻速增加(倍数) ${attackspeed} 所受伤害增加(倍数) ${damagetaken}
 * 期间增加 或者负数减少 移动速度 攻击速度 受到伤害加深
 */
declare function DzUnitAddBuffBbsk(
  target: unit,
  source: unit,
  buffId: number,
  level: number,
  priority: number,
  duration: number,
  data1: number,
  data2: number,
  data3: number
): boolean;

/**
 * Buff - 添加黑暗之奴 BNdm
 * 为单位 ${target} 添加 BNdm(黑暗之奴) 显示为 ${buffID} 等级 ${level} 魔法盗取优先级 ${spell_steal_priority} 持续时间 ${duration}
 */
declare function DzUnitAddBuffBNdm(
  target: unit,
  buffId: number,
  level: number,
  priority: number,
  duration: number
): boolean;

/**
 * Buff - 添加黑暗之箭 BNba
 * 为单位 ${target} 添加 BNba(黑暗之箭) 来源为 ${source} 显示为 ${buffID} 等级 ${level} 魔法盗取优先级 ${spell_steal_priority} 持续时间 ${duration} 玩家 ${player} 召唤单位类型 ${unitID} 召唤单位数量 ${count} 召唤单位持续时间 ${timelife} 魔法效果 ${buff}
 * 目标单位 需要在单位物编 战斗 - 死亡类型   这一项勾选可召唤, 在持续时间内死亡可以召唤单位
 */
declare function DzUnitAddBuffBNba(
  target: unit,
  source: unit,
  buffId: number,
  level: number,
  priority: number,
  duration: number,
  owner: player,
  data1: number,
  data2: number,
  data3: number,
  data4: number
): boolean;

/**
 * Buff - 添加火焰雨 BNrd
 * 为单位 ${target} 添加 BNrd(火焰雨) 来源为 ${source} 显示为 ${buffID} 等级 ${level} 魔法盗取优先级 ${spell_steal_priority} 持续时间 ${duration} 每秒伤害 ${DPS}
 * 持续期间 受到伤害
 */
declare function DzUnitAddBuffBNrd(
  target: unit,
  source: unit,
  buffId: number,
  level: number,
  priority: number,
  duration: number,
  data1: number
): boolean;

/**
 * Buff - 添加嗜血术 Bblo
 * 为单位 ${target} 添加 Bblo(嗜血术) 来源为 ${source} 显示为 ${buffID} 等级 ${level} 魔法盗取优先级 ${spell_steal_priority} 持续时间 ${duration} 移速增加(%) ${movespeed} 攻速增加(%) ${attackspeed} 模型放大比例(%) ${modelscale}
 */
declare function DzUnitAddBuffBblo(
  target: unit,
  source: unit,
  buffId: number,
  level: number,
  priority: number,
  duration: number,
  data1: number,
  data2: number,
  data3: number
): boolean;

/**
 * Buff - 添加狂热 Bfzy
 * 为单位 ${target} 添加 Bfzy(狂热) 来源为 ${source} 显示为 ${buffID} 等级 ${level} 魔法盗取优先级 ${spell_steal_priority} 持续时间 ${duration} 移速增加(倍数) ${movespeed} 攻速增加(倍数) ${attackspeed} 模型放大比例(倍数) ${modelscale}
 * 增加攻速 移速 放大模型
 */
declare function DzUnitAddBuffBfzy(
  target: unit,
  source: unit,
  buffId: number,
  level: number,
  priority: number,
  duration: number,
  data1: number,
  data2: number,
  data3: number
): boolean;

/**
 * Buff - 添加火焰呼吸 BNbf
 * 为单位 ${target} 添加 BNbf(火焰呼吸) 来源为 ${source} 显示为 ${buffID} 等级 ${level} 魔法盗取优先级 ${spell_steal_priority} 持续时间 ${duration} 每秒伤害 ${DPS}
 * 持续时间内 每秒受到伤害
 */
declare function DzUnitAddBuffBNbf(
  target: unit,
  source: unit,
  buffId: number,
  level: number,
  priority: number,
  duration: number,
  data1: number
): boolean;

/**
 * Buff - 添加霜冻闪电 BCbf
 * 为单位 ${target} 添加 BCbf(霜冻闪电) 来源为 ${source} 显示为 ${buffID} 等级 ${level} 魔法盗取优先级 ${spell_steal_priority} 持续时间 ${duration} 每秒伤害 ${DPS}
 */
declare function DzUnitAddBuffBCbf(
  target: unit,
  source: unit,
  buffId: number,
  level: number,
  priority: number,
  duration: number,
  data1: number
): boolean;

/**
 * Buff - 添加占据 Bpos
 * 为单位 ${target} 添加 Bpos(占据) 来源为 ${source} 显示为 ${buffID} 等级 ${level} 魔法盗取优先级 ${spell_steal_priority} 持续时间 ${duration} 目标无敌 ${invul} 目标魔法免疫 ${immue}
 * 持续期间 单位被暂停   1无敌 0不无敌
 */
declare function DzUnitAddBuffBpos(
  target: unit,
  source: unit,
  buffId: number,
  level: number,
  priority: number,
  duration: number,
  data1: number,
  data2: number
): boolean;

/**
 * Buff - 添加占据 (施法者) Bpoc
 * 为单位 ${target} 添加 Bpoc(占据 (施法者)) 显示为 ${buffID} 等级 ${level} 魔法盗取优先级 ${spell_steal_priority} 持续时间 ${duration}
 * 持续期间头顶多个特效
 */
declare function DzUnitAddBuffBpoc(
  target: unit,
  buffId: number,
  level: number,
  priority: number,
  duration: number
): boolean;

/**
 * Buff - 添加控制魔法 Bcmg
 * 为单位 ${target} 添加 Bcmg(控制魔法) 显示为 ${buffID} 等级 ${level} 魔法盗取优先级 ${spell_steal_priority} 持续时间 ${duration}
 * 到期后被杀死
 */
declare function DzUnitAddBuffBcmg(
  target: unit,
  buffId: number,
  level: number,
  priority: number,
  duration: number
): boolean;

/**
 * Buff - 添加乌云技能 Bclf
 * 为单位 ${target} 添加 Bclf(乌云技能) 来源为 ${source} 显示为 ${buffID} 等级 ${level} 魔法盗取优先级 ${spell_steal_priority} 持续时间 ${duration} 移速增加(倍数) ${movespeed} 攻速增加(倍数) ${attackspeed} 禁止类型(整数) ${disabletype} 失误概率(倍数) ${misschance}
 * 持续时间内 增加或负数减少 移速 攻速,  禁止类型 1近战 2远程 4特殊 8魔法 如果要同时禁止近战跟远程 1+2即可
 */
declare function DzUnitAddBuffBclf(
  target: unit,
  source: unit,
  buffId: number,
  level: number,
  priority: number,
  duration: number,
  data1: number,
  data2: number,
  data3: number,
  data4: number
): boolean;

/**
 * 技能 - 设置技能数据F
 * 设置单位 ${unit} 当前拥有的技能 ${id} 的数据F ${DataF}
 * 单位的独立修改,不会影响其他单位身上的技能;删除技能后改动即清除;所有技能共享同一组Data位置,不同技能类型通过不同fieldId映射,如无效果可以尝试刷新数据
 */
declare function DzSetUnitAbilityDataF(Unit: unit, abil_code: number, value: number): boolean;

/**
 * 技能 - 获取技能数据F
 * 获取 单位 ${unit} 当前拥有的技能 ${id} 的数据F
 */
declare function DzGetUnitAbilityDataF(Unit: unit, abil_code: number): number;

/**
 * 技能 - 设置技能数据G
 * 设置单位 ${unit} 当前拥有的技能 ${id} 的数据G ${DataG}
 * 单位的独立修改,不会影响其他单位身上的技能;删除技能后改动即清除;所有技能共享同一组Data位置,不同技能类型通过不同fieldId映射,如无效果可以尝试刷新数据
 */
declare function DzSetUnitAbilityDataG(Unit: unit, abil_code: number, value: number): boolean;

/**
 * 技能 - 获取技能数据G
 * 获取 单位 ${unit} 当前拥有的技能 ${id} 的数据G
 */
declare function DzGetUnitAbilityDataG(Unit: unit, abil_code: number): number;

/**
 * 技能 - 设置技能数据H
 * 设置单位 ${unit} 当前拥有的技能 ${id} 的数据H ${DataH}
 * 单位的独立修改,不会影响其他单位身上的技能;删除技能后改动即清除;所有技能共享同一组Data位置,不同技能类型通过不同fieldId映射,如无效果可以尝试刷新数据
 */
declare function DzSetUnitAbilityDataH(Unit: unit, abil_code: number, value: number): boolean;

/**
 * 技能 - 获取技能数据H
 * 获取 单位 ${unit} 当前拥有的技能 ${id} 的数据H
 */
declare function DzGetUnitAbilityDataH(Unit: unit, abil_code: number): number;

/**
 * 技能 - 设置技能数据I
 * 设置单位 ${unit} 当前拥有的技能 ${id} 的数据I ${DataI}
 * 单位的独立修改,不会影响其他单位身上的技能;删除技能后改动即清除;所有技能共享同一组Data位置,不同技能类型通过不同fieldId映射,如无效果可以尝试刷新数据
 */
declare function DzSetUnitAbilityDataI(Unit: unit, abil_code: number, value: number): boolean;

/**
 * 技能 - 获取技能数据I
 * 获取 单位 ${unit} 当前拥有的技能 ${id} 的数据I
 */
declare function DzGetUnitAbilityDataI(Unit: unit, abil_code: number): number;

/**
 * 装饰物的X坐标
 * 获取 ${doodad} 的X坐标
 */
declare function DzDoodadGetX(doodad: number): number;

/**
 * 装饰物的Y坐标
 * 获取 ${doodad} 的Y坐标
 */
declare function DzDoodadGetY(doodad: number): number;

/**
 * 装饰物的Z坐标
 * 获取 ${doodad} 的Z坐标
 */
declare function DzDoodadGetZ(doodad: number): number;

/**
 * 设置装饰物位置
 * 设置 ${doodad} 的坐标：(${x}，${Y}，${z})
 */
declare function DzDoodadSetPosition(doodad: number, x: number, y: number, z: number): void;

/**
 * 设置装饰物旋转
 * 设置 ${doodad} 旋转，角度：${rotate} 方向：(${axisX}，${axisY}，${axisZ})
 */
declare function DzDoodadSetOrientMatrixRotate(
  doodad: number,
  angle: number,
  axisX: number,
  axisY: number,
  axisZ: number
): void;

/**
 * 装饰物显示/隐藏
 * 设置 ${doodad} ${Show/Hide}
 */
declare function DzDoodadSetVisible(doodad: number, enable: boolean): void;

/**
 * 删除装饰物  [NEW]
 * 删除 ${doodad}
 */
declare function DzDoodadRemove(doodad: number): void;

/**
 * 获取相对锚点的界面锚点 [NEW]
 * 判断 ${whichFrame} 的相对锚点 ${anchor} 所在界面的锚点
 */
declare function DzFrameGetPointRelativePoint(frame: number, anchor: number): number;

/**
 * 获取锚点X坐标 [NEW]
 * ${whichFrame} 的 ${anchor} X坐标
 */
declare function DzFrameGetPointX(frame: number, anchor: number): number;

/**
 * 获取锚点Y坐标 [NEW]
 * ${whichFrame} 的 ${anchor} Y坐标
 */
declare function DzFrameGetPointY(frame: number, anchor: number): number;

/**
 * 打开Excel文件 [NEW]
 * 打开Excel文件 ${filePath}
 * 会返回一个工作表
 */
declare function DzXlsxOpen(filePath: string): number;

/**
 * 哈希表 - 开启保存空值(逆天设置null)
 * 哈希表是否 ${是否开启} 开启保存空值(逆天设置null)
 * 开局调用,开启之后 哈希表、逆天局部变量、逆天自定义值 都可以设置null值。 true开启 false关闭
 */
declare function DzEnableHashtableSetNull(is_enable: boolean): void;

/**
 * 物品 - 修改物品碰撞体积
 * 修改物品 ${物品} 的碰撞体积为 ${碰撞体积}
 * 体积可以是0,8,16,32,64。修改之后重新设置一下位置就会刷新了
 */
declare function DzSetItemCollisionSize(it: item, size: number): void;

/**
 * 物品 - 获取物品的碰撞体积
 * 获取 ${物品} 的碰撞体积
 */
declare function DzGetItemCollisionSize(it: item): number;

/**
 * 单位 - 设置单位屏蔽本地命令(模拟失控)
 * 设置单位 ${单位} 屏蔽本地命令为 ${屏蔽状态}
 * true是失控状态, false是恢复。 屏蔽之后该单位任何手动控制都将失效, 只能通过触发器命令控制该单位。 屏蔽本地命令的缺点是 多选单位会因为其中一个屏蔽而所有选择单位
 */
declare function DzSetUnitDisableLocalOrder(u: unit, is_disable: boolean): void;

/**
 * 单位 - 获取单位本地命令是否被屏蔽
 * 获取单位 ${单位} 本地命令是否被屏蔽
 * 判断该单位当前是否失控状态
 */
declare function DzGetUnitDisableLocalOrder(u: unit): boolean;

/**
 * 单位 - 设置单位屏蔽控制命令(模拟失控)
 * 设置单位 ${单位} 屏蔽控制命令为 ${屏蔽状态}
 * true是失控状态, false是恢复。 屏蔽之后该单位任何手动控制都将失效, 只能通过触发器命令控制该单位。
 */
declare function DzSetUnitDisableControlOrder(u: unit, is_disable: boolean): void;

/**
 * 单位 - 获取单位控制命令是否被屏蔽
 * 获取单位 ${单位} 控制命令是否被屏蔽
 * 判断该单位当前是否失控状态
 */
declare function DzGetUnitDisableControlOrder(u: unit): boolean;

/**
 * 单位 - 设置单位攻击1目标允许
 * 设置单位 ${单位} 攻击1目标类型 ${目标允许}
 * 可使用“转化 - 目标允许字符串转整数”, 例如 允许地面单位攻击飞行单位
 */
declare function DzSetUnitAttack1TargetType(u: unit, target_type: number): void;

/**
 * 单位 - 获取单位攻击1目标允许
 * 获取单位 ${单位} 攻击1目标允许
 * 返回值可使用“转化 - 目标允许整数转字符串”
 */
declare function DzGetUnitAttack1TargetType(u: unit): number;

/**
 * 单位 - 设置单位攻击2目标允许
 * 设置单位 ${单位} 攻击2目标类型 ${目标允许}
 * 可使用“转化 - 目标允许字符串转整数”, 例如 设置允许地面单位攻击空中单位
 */
declare function DzSetUnitAttack2TargetType(u: unit, target_type: number): void;

/**
 * 单位 - 获取单位攻击2目标允许
 * 获取单位 ${单位} 攻击2目标允许
 * 返回值可使用“转化 - 目标允许整数转字符串”
 */
declare function DzGetUnitAttack2TargetType(u: unit): number;

/**
 * 单位 - 设置单位作为目标类型
 * 设置单位 ${单位} 作为目标类型 ${目标允许}
 * 使用“转化 - 目标允许字符串转整数”, 例如 设置自身是否作为空中目标, 近战不能打空中
 */
declare function DzSetUnitAsAttackTargetType(u: unit, target_type: number): void;

/**
 * 单位 - 获取单位作为目标类型
 * 获取单位 ${单位} 作为目标类型
 * 返回值可使用“转化 - 目标允许整数转字符串”
 */
declare function DzGetUnitAsAttackTargetType(u: unit): number;

/**
 * 世界坐标 - 为绑定的Frame添加隐藏区域
 * 为绑定的Frame ${frame} 添加隐藏区域( ${左0~0.8}, ${下0~0.6}, ${右0~0.8}, ${上0~0.6} ) 控件大小( ${宽度}, ${高度} )
 * 需要先绑定Frame到世界坐标或者物品单位实时坐标后, 再使用该函数。可以在控件进入区域时隐藏控件。屏幕区域左右0~0.8, 上下0~0.6
 */
declare function DzFrameBindAddHideRect(
  frame: number,
  left: number,
  bottom: number,
  right: number,
  top: number,
  width: number,
  height: number
): void;

/**
 * 界面 - 获取控件实际宽度
 * 获取控件 ${控件} 实际宽度
 * 自适应文本控件等特殊情况要在改变文字内容后延迟1帧之后才能获取到正确的值
 */
declare function DzFrameGetRealWidth(frame: number): number;

/**
 * 界面 - 获取控件实际高度
 * 获取控件 ${控件} 实际高度
 * 自适应文本控件等特殊情况要在改变文字内容后延迟1帧之后才能获取到正确的值
 */
declare function DzFrameGetRealHeight(frame: number): number;

/**
 * 技能 - 设置魔法书技能列表添加新技能
 * 设置单位 ${unit} 当前拥有的魔法书技能 ${id} 的技能列表 添加新技能 ${abil_id}
 * 添加新技能, 不能跟原有的重复，不能超过12个技能。
 */
declare function DzSetUnitAbilitySpellBookAddAbility(
  u: unit,
  abil_id: number,
  add_abil_id: number
): boolean;

/**
 * 技能 - 设置魔法书技能列表移除指定技能
 * 设置单位 ${unit} 当前拥有的魔法书技能 ${id} 的技能列表 移除指定技能 ${abil_id}
 * 将指定技能从魔法书里剔除。
 */
declare function DzSetUnitAbilitySpellBookRemoveAbility(
  u: unit,
  abil_id: number,
  remove_abil_id: number
): boolean;

/**
 * 技能按钮 - 获取按钮上的技能ID
 * 获取按钮 ${按钮} 上的技能ID
 * 参数是原生或自己创建的技能按钮、物品按钮、 返回值是异步的, 当按钮有绑定技能时 会返回正确的ID
 */
declare function KKCommandButtonGetAbilityId(command_button: number): number;

/**
 * 技能按钮 - 获取按钮上的命令ID
 * 获取按钮 ${按钮} 上的命令ID
 * 参数是原生或自己创建的技能按钮、物品按钮、 返回值是异步的, 当按钮有绑定时 会返回正确的ID
 */
declare function KKCommandButtonGetOrderId(command_button: number): number;

/**
 * 游戏 - 修复单位命令事件泄漏
 * 修复单位命令事件泄漏
 * 开局调用一次即可，修复注册单位无目标命令事件后 每次发布无目标命令都会产生的内存泄漏。
 */
declare function DzFixUnitEventMemoryLeak(): void;

/**
 * 单位 - 获取投射物发射坐标X
 * 获取 ${单位} 的投射物发射坐标X
 */
declare function DzGetUnitPojectileLaunchX(u: unit): number;

/**
 * 单位 - 获取投射物发射坐标Y
 * 获取 ${单位} 的投射物发射坐标Y
 */
declare function DzGetUnitPojectileLaunchY(u: unit): number;

/**
 * 单位 - 获取投射物发射坐标Z
 * 获取 ${单位} 的投射物发射坐标Z
 */
declare function DzGetUnitPojectileLaunchZ(u: unit): number;

/**
 * 投射物 - 发射箭矢
 * 发射箭矢 伤害来源: ${source} 目标: ${target} 模型: ${model} 队伍颜色: ${i} 颜色: ${color} 创建坐标: ${x} ${y} ${z} 缩放: ${scale} 速度: ${speed} 攻击类型: ${at} 伤害类型: ${dt} 武器类型: ${wt} 伤害: ${damage} 孤度: ${arc} 自导: ${homing} 可以丢失: ${can_miss} 永不丢失: ${never_miss} 攻击: ${attack} flag: ${flag}
 * 只封装了单位目标, flag 256(0x100) = 单位所受伤害是攻击伤害, 攻击 = 单位所受伤害是物理伤害
 */
declare function DzLaunchMissile(
  source: unit,
  target: widget,
  model: string,
  team_color: number,
  color: number,
  x: number,
  y: number,
  z: number,
  scale: number,
  speed: number,
  attack_type: attacktype,
  damage_type: damagetype,
  weapon_type: weapontype,
  damage: number,
  arc: number,
  homing: boolean,
  can_miss: boolean,
  never_miss: boolean,
  attack: boolean,
  flags: number
): boolean;

/**
 * 投射物 - 发射箭矢(弹射)
 * 发射箭矢(弹射) 伤害来源: ${source} 目标: ${target} 模型: ${model} 队伍颜色: ${i} 颜色: ${color} 创建坐标: ${x} ${y} ${z} 缩放: ${scale} 速度: ${speed} 攻击类型: ${at} 伤害类型: ${dt} 武器类型: ${wt} 伤害: ${damage} 孤度: ${arc} 自导: ${homing} 可以丢失: ${can_miss} 永不丢失: ${never_miss} 攻击: ${attack} flag: ${flag} 目标允许: ${target_flag} 最大目标数: ${target_count} 弹射距离: ${range} 伤害衰减: ${damage_loss}
 * 只封装了单位目标, flag 256(0x100) = 单位所受伤害是攻击伤害, 攻击 = 单位所受伤害是物理伤害
 */
declare function DzLaunchMissileBounce(
  source: unit,
  target: widget,
  model: string,
  team_color: number,
  color: number,
  x: number,
  y: number,
  z: number,
  scale: number,
  speed: number,
  attack_type: attacktype,
  damage_type: damagetype,
  weapon_type: weapontype,
  damage: number,
  arc: number,
  homing: boolean,
  can_miss: boolean,
  never_miss: boolean,
  attack: boolean,
  flags: number,
  target_flags: number,
  target_count: number,
  bounce_range: number,
  damage_loss: number
): boolean;

/**
 * 投射物 - 发射箭矢(穿透)
 * 发射箭矢(穿透) 伤害来源: ${source} 目标: ${target} 模型: ${model} 队伍颜色: ${i} 颜色: ${color} 创建坐标: ${x} ${y} ${z} 缩放: ${scale} 速度: ${speed} 攻击类型: ${at} 伤害类型: ${dt} 武器类型: ${wt} 伤害: ${damage} 孤度: ${arc} 自导: ${homing} 可以丢失: ${can_miss} 永不丢失: ${never_miss} 攻击: ${attack} flag: ${flag} 目标允许: ${target_flag} 伤害衰减: ${damage_loss} 距离: ${distance} 范围: ${range}
 * 只封装了单位目标, flag 256(0x100) = 单位所受伤害是攻击伤害, 攻击 = 单位所受伤害是物理伤害
 */
declare function DzLaunchMissileLine(
  source: unit,
  target: widget,
  model: string,
  team_color: number,
  color: number,
  x: number,
  y: number,
  z: number,
  scale: number,
  speed: number,
  attack_type: attacktype,
  damage_type: damagetype,
  weapon_type: weapontype,
  damage: number,
  arc: number,
  homing: boolean,
  can_miss: boolean,
  never_miss: boolean,
  attack: boolean,
  flags: number,
  target_flags: number,
  damage_loss: number,
  distance: number,
  range: number
): boolean;

/**
 * 投射物 - 发射箭矢(溅射)
 * 发射箭矢(溅射) 伤害来源: ${source} 目标: ${target} 模型: ${model} 队伍颜色: ${i} 颜色: ${color} 创建坐标: ${x} ${y} ${z} 缩放: ${scale} 速度: ${speed} 攻击类型: ${at} 伤害类型: ${dt} 武器类型: ${wt} 伤害: ${damage} 孤度: ${arc} 自导: ${homing} 可以丢失: ${can_miss} 永不丢失: ${never_miss} 攻击: ${attack} flag: ${flag} 目标允许: ${targetflags} 中伤害参数: ${half_factor} 小伤害参数: ${quar_factor} 全伤害范围: ${full_area} 半伤害范围: ${half_area} 小伤害范围: ${quar_area}
 * 只封装了单位目标, flag 256(0x100) = 单位所受伤害是攻击伤害, 攻击 = 单位所受伤害是物理伤害
 */
declare function DzLaunchMissileSplash(
  source: unit,
  target: widget,
  model: string,
  team_color: number,
  color: number,
  x: number,
  y: number,
  z: number,
  scale: number,
  speed: number,
  attack_type: attacktype,
  damage_type: damagetype,
  weapon_type: weapontype,
  damage: number,
  arc: number,
  homing: boolean,
  can_miss: boolean,
  never_miss: boolean,
  attack: boolean,
  flags: number,
  target_flags: number,
  half_factor: number,
  quar_factor: number,
  full_area: number,
  half_area: number,
  quar_area: number
): boolean;

/**
 * 投射物 - 发射炮火
 * 发射炮火 伤害来源: ${source} 目标: ${target} 目标坐标: ${target_x} ${target_y} 模型: ${model} 队伍颜色: ${i} 颜色: ${color} 创建坐标: ${x} ${y} ${z} 缩放: ${scale} 速度: ${speed} 攻击类型: ${at} 伤害类型: ${dt} 武器类型: ${wt} 伤害: ${damage} 孤度: ${arc} 攻击: ${attack} flag: ${flag} 最小范围: ${min_distance} 目标允许: ${targetflags} 中伤害参数: ${half_factor} 小伤害参数: ${quar_factor} 全伤害范围: ${full_area} 半伤害范围: ${half_area} 小伤害范围: ${quar_area}
 * 只封装了单位目标, 目标 null 则类似于攻击地面, flag 256(0x100) = 单位所受伤害是攻击伤害, 攻击 = 单位所受伤害是物理伤害
 */
declare function DzLaunchArtillery(
  source: unit,
  target: widget,
  target_x: number,
  target_y: number,
  model: string,
  team_color: number,
  color: number,
  x: number,
  y: number,
  z: number,
  scale: number,
  speed: number,
  attack_type: attacktype,
  damage_type: damagetype,
  weapon_type: weapontype,
  damage: number,
  arc: number,
  attack: boolean,
  flags: number,
  min_distance: number,
  target_flags: number,
  half_factor: number,
  quar_factor: number,
  full_area: number,
  half_area: number,
  quar_area: number
): boolean;

/**
 * 投射物 - 发射炮火(穿透)
 * 发射炮火(穿透) 伤害来源: ${source} 目标: ${target} 目标坐标: ${target_x} ${target_y} 模型: ${model} 队伍颜色: ${i} 颜色: ${color} 创建坐标: ${x} ${y} ${z} 缩放: ${scale} 速度: ${speed} 攻击类型: ${at} 伤害类型: ${dt} 武器类型: ${wt} 伤害: ${damage} 孤度: ${arc} 攻击: ${attack} flag: ${flag} 最小范围: ${min_distance} 目标允许: ${targetflags} 中伤害参数: ${half_factor} 小伤害参数: ${quar_factor} 全伤害范围: ${full_area} 半伤害范围: ${half_area} 小伤害范围: ${quar_area} 伤害衰减: ${damage_loss} 距离: ${distance} 范围: ${range}
 * 只封装了单位目标, 目标 null 则类似于攻击地面, flag 256(0x100) = 单位所受伤害是攻击伤害, 攻击 = 单位所受伤害是物理伤害
 */
declare function DzLaunchArtilleryLine(
  source: unit,
  target: widget,
  target_x: number,
  target_y: number,
  model: string,
  team_color: number,
  color: number,
  x: number,
  y: number,
  z: number,
  scale: number,
  speed: number,
  attack_type: attacktype,
  damage_type: damagetype,
  weapon_type: weapontype,
  damage: number,
  arc: number,
  attack: boolean,
  flags: number,
  min_distance: number,
  target_flags: number,
  half_factor: number,
  quar_factor: number,
  full_area: number,
  half_area: number,
  quar_area: number,
  damage_loss: number,
  distance: number,
  range: number
): boolean;

/**
 * 投射物 - 发射技能投射物(腐臭蜂群)
 * 发射技能投射物(腐臭蜂群) 伤害来源: ${source} 模型: ${model} 队伍颜色: ${i} 颜色: ${color} 创建坐标: ${x} ${y} ${z} 角度: ${degree} 距离: ${distance} 缩放: ${scale} 速度: ${speed} 攻击类型: ${at} 伤害类型: ${dt} 武器类型: ${wt} 伤害: ${damage} flag: ${flag} 目标允许: ${targetflags} 初始范围: ${start_radius} 最终范围: ${start_radius} 最大伤害: ${max_damage} 魔法效果: ${buffID}
 * 只封装了单位目标, 魔法效果用途未知, flag 256(0x100) = 单位所受伤害是攻击伤害
 */
declare function DzLaunchMissileCarrionSwarmEx(
  source: unit,
  model: string,
  team_color: number,
  color: number,
  x: number,
  y: number,
  z: number,
  facing: number,
  distance: number,
  scale: number,
  speed: number,
  attack_type: attacktype,
  damage_type: damagetype,
  weapon_type: weapontype,
  damage: number,
  flags: number,
  target_flags: number,
  start_radius: number,
  end_radius: number,
  max_damage: number,
  buffID: number
): boolean;

/**
 * 单位 - 杀死(指定凶手)
 * 杀死 ${单位} 凶手为 ${killer}
 * 杀死单位时指定凶手
 */
declare function DzKillUnit(whichUnit: unit, killer: unit): boolean;

/**
 * 单位 - 设置XY坐标(不打断命令)
 * 设置单位 ${unit} 的坐标为 X: ${x} Y: ${y}
 * 相当于同时 设置单位X轴+设置单位Y轴, 并且不会触发错误的进入区域事件, 不会发布stop命令, 性能比设置单位位置高7倍。
 */
declare function DzSetUnitXY(whichUnit: unit, x: number, y: number): boolean;

/**
 * 技能 - 工程升级 - 替换技能(要相同模板)
 * 工程升级替换技能 单位 ${u} 原有技能 ${old_id} 到目标技能 ${new_id} 更新英雄技能 ${flag}
 * 相当于替换技能, 将指定技能替换成目标技能, 只能替换相同模板的类型, 不同模板替换会错误，谨慎使用。
 */
declare function DzSetUnitAbilityEngineeringUpgrade(
  whichUnit: unit,
  old_id: number,
  new_id: number,
  update_hero_ability: boolean
): boolean;

/**
 * 技能 - 工程升级 - 取消替换技能
 * 工程升级取消替换技能 单位 ${u} 原有技能 ${old_id}
 */
declare function DzSetUnitAbilityEngineeringUpgradeCancel(whichUnit: unit, old_id: number): boolean;

/**
 * 技能 - 工程升级 - 获取替换后的技能ID
 * 获取单位 ${unit} 的技能 ${old_id} 工程升级替换后的技能ID
 * 输入旧的id 获取 新的id
 */
declare function DzGetUnitAbilityEngineeringUpgradeNewId(whichUnit: unit, old_id: number): number;

/**
 * 技能 - 工程升级 - 获取替换前的技能ID
 * 获取单位 ${unit} 的技能 ${new_id} 工程升级替换前的技能ID
 * 输入新的id 获取 旧的id
 */
declare function DzGetUnitAbilityEngineeringUpgradeOldId(whichUnit: unit, new_id: number): number;

/**
 * 技能 - 设置技能魔法施法时间
 * 设置单位 ${unit} 当前拥有的技能 ${id} 的魔法施法时间 ${cast_time}
 * 开始施法前的准备时间.暗影突袭的此项为伤害间隔.暴风雪和火焰雨的此项为每波间隔;单位的独立修改,删除技能后改动即清除, 需要刷新数据
 */
declare function DzSetUnitAbilityCastTime(u: unit, abil_id: number, value: number): boolean;

/**
 * 技能 - 获取技能魔法施法时间
 * 获取单位 ${unit} 当前拥有的技能 ${id} 的魔法施法时间
 * 开始施法前的准备时间.暗影突袭的此项为伤害间隔.暴风雪和火焰雨的此项为每波间隔;
 */
declare function DzGetUnitAbilityCastTime(u: unit, abil_id: number): number;

/**
 * 技能 - 设置技能持续时间(普通)
 * 设置单位 ${unit} 当前拥有的技能 ${id} 的持续时间(普通) ${cast_time}
 * 普通持续时间;单位的独立修改,删除技能后改动即清除, 需要刷新数据;烈焰风暴的此项为燃烧持续时间.变身(恶魔猎手)的此项为完成变身前暂停时间
 */
declare function DzSetUnitAbilityDuration(u: unit, abil_id: number, value: number): boolean;

/**
 * 技能 - 获取技能持续时间(普通)
 * 获取单位 ${unit} 当前拥有的技能 ${id} 的持续时间(普通)
 * 普通持续时间;烈焰风暴的此项为燃烧持续时间.变身(恶魔猎手)的此项为完成变身前暂停时间
 */
declare function DzGetUnitAbilityDuration(u: unit, abil_id: number): number;

/**
 * 技能 - 设置技能持续时间(英雄)
 * 设置单位 ${unit} 当前拥有的技能 ${id} 的持续时间(英雄) ${cast_time}
 * 英雄持续时间;单位的独立修改,删除技能后改动即清除, 需要刷新数据;技能对英雄或具有抗性皮肤的单位的持续时间.烈焰风暴的此项为熄灭持续时间.静止陷阱的此项是眩晕时间
 */
declare function DzSetUnitAbilityHeroDuration(u: unit, abil_id: number, value: number): boolean;

/**
 * 技能 - 获取技能持续时间(英雄)
 * 获取单位 ${unit} 当前拥有的技能 ${id} 的持续时间(英雄)
 * 英雄持续时间;技能对英雄或具有抗性皮肤的单位的持续时间.烈焰风暴的此项为熄灭持续时间.静止陷阱的此项是眩晕时间
 */
declare function DzGetUnitAbilityHeroDuration(u: unit, abil_id: number): number;

/**
 * 技能 - 设置技能魔法施放点(前摇)
 * 设置单位 ${unit} 当前拥有的技能 ${id} 的魔法施放点(前摇) ${cast_time}
 * 即施法前摇
 */
declare function DzSetUnitAbilityCastPoint(u: unit, abil_id: number, value: number): boolean;

/**
 * 技能 - 获取技能魔法施放点(前摇)
 * 获取单位 ${unit} 当前拥有的技能 ${id} 的魔法施放点(前摇)
 * 即施法前摇;
 */
declare function DzGetUnitAbilityCastPoint(u: unit, abil_id: number): number;

/**
 * 技能 - 设置技能魔法施放回复(后摇)
 * 设置单位 ${unit} 当前拥有的技能 ${id} 的魔法施放回复(后摇) ${cast_time}
 * 即施法后摇
 */
declare function DzSetUnitAbilityBackSwing(u: unit, abil_id: number, value: number): boolean;

/**
 * 技能 - 设置技能魔法施放回复(后摇)
 * 获取单位 ${unit} 当前拥有的技能 ${id} 的魔法施放回复(后摇)
 * 即施法后摇;
 */
declare function DzGetUnitAbilityBackSwing(u: unit, abil_id: number): number;

/**
 * 单位 - 设置每秒生命恢复
 * 设置 ${单位} 的每秒生命恢复为 ${value}
 */
declare function DzSetUnitLifeRegen(whichUnit: unit, regen: number): boolean;

/**
 * 单位 - 获取每秒生命恢复
 * 获取 ${单位} 的每秒生命恢复
 */
declare function DzGetUnitLifeRegen(whichUnit: unit): number;

/**
 * 单位 - 设置每秒魔法恢复
 * 设置 ${单位} 的每秒魔法恢复为 ${value}
 */
declare function DzSetUnitManaRegen(whichUnit: unit, regen: number): boolean;

/**
 * 单位 - 获取每秒魔法恢复
 * 获取 ${单位} 的每秒魔法恢复
 */
declare function DzGetUnitManaRegen(whichUnit: unit): number;

/**
 * 单位 - 设置最低移动速度
 * 设置 ${单位} 的最低移动速度为 ${value} 忽略变形术 ${flag}
 */
declare function DzSetUnitMinSpeed(
  whichUnit: unit,
  speed: number,
  ignore_polymorph: boolean
): boolean;

/**
 * 单位 - 获取最低移动速度
 * 获取 ${单位} 的最低移动速度
 */
declare function DzGetUnitMinSpeed(whichUnit: unit): number;

/**
 * 单位 - 设置最高移动速度
 * 设置 ${单位} 的最高移动速度为 ${value} 忽略变形术 ${flag}
 */
declare function DzSetUnitMaxSpeed(
  whichUnit: unit,
  speed: number,
  ignore_polymorph: boolean
): boolean;

/**
 * 单位 - 获取最高移动速度
 * 获取 ${单位} 的最高移动速度
 */
declare function DzGetUnitMaxSpeed(whichUnit: unit): number;

/**
 * 单位 - 设置魔法施放点(前摇)
 * 设置 ${单位} 的魔法施放点(前摇)为 ${value}
 * 不会影响已经初始化的技能, 修改之后添加的所有技能会使用该前摇
 */
declare function DzSetUnitCastPoint(whichUnit: unit, cast_point: number): boolean;

/**
 * 单位 - 获取魔法施放点(前摇)
 * 获取 ${单位} 的魔法施放点(前摇)
 */
declare function DzGetUnitCastPoint(whichUnit: unit): number;

/**
 * 单位 - 设置魔法施放回复(后摇)
 * 设置 ${单位} 的魔法施放回复(后摇)为 ${value}
 * 不会影响已经初始化的技能, 修改之后添加的所有技能会使用该后摇
 */
declare function DzSetUnitBackSwing(whichUnit: unit, back_swing: number): boolean;

/**
 * 单位 - 获取魔法施放回复(后摇)
 * 获取 ${单位} 的魔法施放回复(后摇)
 */
declare function DzGetUnitBackSwing(whichUnit: unit): number;

/**
 * 单位 - 设置攻击最大目标数
 * 设置单位 ${unit} 的攻击 ${index} 最大目标数为 ${value}
 * 仅 箭矢(弹射) 攻击类型有效, 并且物编需要填全伤害范围。 第二个参数index 为0的时候 代表攻击1   1的时候代表攻击2
 */
declare function DzSetUnitAttackTargetCount(
  whichUnit: unit,
  index: number,
  target_count: number
): boolean;

/**
 * 单位 - 获取攻击最大目标数
 * 设置单位 ${unit} 的攻击 ${index} 最大目标数
 * 第二个参数index 为0的时候 代表攻击1   1的时候代表攻击2
 */
declare function DzGetUnitAttackTargetCount(whichUnit: unit, index: number): number;

/**
 * 英雄 - 设置主属性类型
 * 设置英雄 ${hero} 的主属性类型为 ${attribute} 保留当前主属性加成 ${flag}
 */
declare function DzSetHeroPrimaryAttributeType(
  whichUnit: unit,
  attribute: number,
  keep_primary_bonus: boolean
): boolean;

/**
 * 英雄 - 获取主属性类型
 * 获取英雄 ${hero} 的主属性类型
 */
declare function DzGetHeroPrimaryAttributeType(whichUnit: unit): number;

/**
 * 英雄 - 设置主属性
 * 设置英雄 ${hero} 的主属性为 ${value}
 * 白字属性
 */
declare function DzSetHeroPrimaryAttribute(whichUnit: unit, attribute: number): boolean;

/**
 * 英雄 - 获取主属性
 * 获取英雄 ${hero} 的主属性 包括加成 ${flag}
 * 加成指的是绿字
 */
declare function DzGetHeroPrimaryAttribute(whichUnit: unit, include_bonus: boolean): number;

/**
 * 英雄 - 设置属性成长
 * 设置英雄 ${hero} 的 ${attribute} 属性成长为 ${value} 保留当前数值: ${flag}
 * 因内部是混用整数和实数 所以保留数值为 TRUE 时会可能丢失/获取额外属性
 */
declare function DzSetHeroPrimaryAttributePlus(
  whichUnit: unit,
  attreibute: number,
  value: number,
  keep_current_bonus: boolean
): boolean;

/**
 * 英雄 - 获取属性成长
 * 获取英雄 ${hero} 的 ${attribute} 属性成长
 */
declare function DzGetHeroPrimaryAttributePlus(whichUnit: unit, attribute: number): number;

/**
 * 游戏 - 禁用攻速限制
 * 禁用攻速限制
 * 极限可以大概每秒 9360, 但是你确定电脑撑得住?
 */
declare function DzDisableAttackSpeedLimit(): void;

/**
 * 游戏 - 设置攻速上限
 * 设置攻速上限为 ${min} - ${max}
 * 除非禁用攻速限制, 不然最终攻速无法超过每秒 50 次
 */
declare function DzSetMinMaxAttackSpeedFactor(min_factor: number, max_factor: number): void;

/**
 * 游戏 - 设置移速可叠加
 * 设置移速可叠加 ${flag}
 * 多个技能，多个物品的移动速度能叠加。平衡性常数那个有bug
 */
declare function DzSetMoveSpeedBonusesStack(is_enable: boolean): void;

/**
 * 游戏 - 设置全局移速 上/下 限
 * 设置全局移速 硬编码限制(建筑 ${building_min}-${building_max} 单位 ${unit_min}-${unit_max}) 平衡性常数限制(建筑 ${GC_building_min}-${GC_building_max} 单位 ${GC_unit_min}-${GC_unit_max}) 采矿最低移速 ${harvest_min} 疾步风最高移速 ${windwalk_max}
 * 副作用: 会影响转身速度
 */
declare function DzSetGlobalUnitMinMaxMoveSpeed(
  building_min: number,
  building_max: number,
  unit_min: number,
  unit_max: number,
  GC_building_min: number,
  GC_building_max: number,
  GC_unit_min: number,
  GC_unit_max: number,
  harvest_min: number,
  windwalk_max: number
): void;

/**
 * 哈希表 - 保存Handle ID
 * 保存Handle ID到哈希表 ${哈希表} 主Key ${主Key} 子Key ${子Key} Handle ID ${HandleId}
 * 保存Handle ID到哈希表中,不改变引用计数, 保存后可以读取指定类型的哈希表实现I2任意类型
 */
declare function DzSaveHandleId(
  whichHashtable: hashtable,
  parentKey: number,
  childKey: number,
  handleId: number
): boolean;

/**
 * 哈希表 - 保存Handle ID(指定类型)
 * 保存Handle ID到哈希表 ${哈希表} 主Key ${主Key} 子Key ${子Key} Handle ID ${HandleId} 类型 ${类型}
 * 类型: 1=引用计数类型 2=texttag 3=lightning 4=image 5=ubersplat 6=fogstate
 */
declare function DzSaveHandleIdEx(
  whichHashtable: hashtable,
  parentKey: number,
  childKey: number,
  handleId: number,
  handleType: number
): boolean;

/**
 * 哈希表 - 读取Handle ID
 * 从哈希表 ${哈希表} 主Key ${主Key} 子Key ${子Key} 读取Handle ID
 * 从哈希表中读取保存的Handle ID
 */
declare function DzLoadHandleId(
  whichHashtable: hashtable,
  parentKey: number,
  childKey: number
): number;

/**
 * 哈希表 - 设置数量上限
 * 设置哈希表数量上限为 ${上限}
 * 默认上限为256个
 */
declare function DzSetHashtableLimit(maxCount: number): void;

/**
 * 游戏 - 禁用移除多余死亡英雄
 * 禁用移除多余死亡英雄
 * 调用后不再自动移除多余的死亡英雄, 还需将英雄的占用人口设置为0 或者提高人口上限
 */
declare function DzDisableRemoveExtraDeadHero(): void;

/**
 * 游戏 - 设置玩家寻路上限
 * 设置 ${玩家} 的寻路上限 深度 ${limit1} 动态 ${limit2} 快速 ${limit3} 本地 ${limit4}
 * 默认值: 深度=800 动态=300 快速=900 本地=1100, 参数全填9999 牺牲性能 换取群体单位移动时不卡寻路。
 */
declare function DzSetPlayerPathFindingLimit(
  whichPlayer: player,
  limit1: number,
  limit2: number,
  limit3: number,
  limit4: number
): boolean;

/**
 * 游戏 - 设置人口上限常量
 * 设置人口上限常量为 ${值}
 * 修改游戏的人口上限常量, 默认限制为200
 */
declare function DzSetGameConstantFoodCeiling(value: number): void;

/**
 * 游戏 - 禁用加载完毕按键继续
 * 禁用加载完毕按键继续
 * 修改过载入图的地图每次进游戏都需要确认, 调用后加载完毕不再需要按键继续,
 */
declare function DzDisableLoadingPressAKey(): void;

/**
 * 界面 - 获取多面板Frame
 * 获取多面板 ${多面板} 的Frame
 * 返回多面板的Frame句柄
 */
declare function DzMultiboardGetFrame(whichMultiboard: multiboard): number;

/**
 * 界面 - 获取计时器对话框Frame
 * 获取计时器对话框 ${计时器对话框} 的Frame
 * 返回计时器对话框的Frame句柄
 */
declare function DzTimerDialogGetFrame(whichTimerDialog: timerdialog): number;

/**
 * 界面 - 添加文字阴影
 * 为 ${Frame} 添加文字阴影 偏移X ${X} 偏移Y ${Y} 颜色 ${颜色}
 * 支持CTextFrame, CMessageFrame, CSimpleFontString, CSimpleMessageFrame
 */
declare function DzFrameAddTextShadow(
  whichFrame: number,
  offsetX: number,
  offsetY: number,
  color: number
): boolean;

/**
 * 界面 - 复制文字阴影(模拟描边)
 * 为 ${Frame} 复制 ${数量} 份阴影
 * 先添加文字阴影，再调用此函数。在原有阴影基础上复制额外的阴影,均匀分布在圆周上
 */
declare function DzFrameDuplicateTextShadow(whichFrame: number, count: number): boolean;

/**
 * 技能按钮 - 显示冷却时间文本
 * 技能按钮显示冷却时间文本 ${显示技能冷却} 物品按钮显示冷却时间文本 ${显示物品冷却}
 * 在命令按钮上显示剩余冷却时间文本
 */
declare function DzSetCommandButtonShowCooldown(showAbility: boolean, showItem: boolean): void;

/**
 * 技能按钮 - 显示快捷键文本
 * 技能按钮显示快捷键文本 ${显示技能快捷键} 物品按钮显示快捷键文本 ${显示物品快捷键}
 * 在命令按钮上显示快捷键文本
 */
declare function DzSetCommandButtonShowHotkey(showAbility: boolean, showItem: boolean): void;

/**
 * 技能按钮 - 设置快捷键文本背景
 * 设置命令按钮快捷键文本背景为 ${路径}
 * 设置快捷键文本的背景纹理路径
 */
declare function DzSetCommandButtonHotkeyBackground(filepath: string): void;

/** DzEffectGroupCreate */
declare function DzEffectGroupCreate(): dzeffectgroup;

/**
 * 特效组 - 获取特效数量
 * 获取 ${特效组} 里的特效数量
 * 包括删除了但没移出的特效
 */
declare function DzEffectGroupGetSize(whichEffectGroup: dzeffectgroup): number;

/**
 * 特效组 - 第N个特效
 * 获取 ${特效组} 里的第 ${N} 个特效
 * 从1开始  循环1到特效组数量
 */
declare function DzEffectGroupAt(whichEffectGroup: dzeffectgroup, index: number): effect;

/**
 * 特效组 - 清除
 * 清除 ${特效组}
 * 清除了变成空的特效组，可以重新添加，如果再使用需要删除掉。
 */
declare function DzEffectGroupClear(whichEffectGroup: dzeffectgroup): number;

/** DzEffectGroupAdd */
declare function DzEffectGroupAdd(
  whichEffectGroup: dzeffectgroup,
  whichEffect: effect,
  allowDuplicate: boolean
): number;

/**
 * 特效组 - 移出
 * 从 ${特效组} 移出 ${特效} (只移出第一个 ${flag})
 */
declare function DzEffectGroupRemove(
  whichEffectGroup: dzeffectgroup,
  whichEffect: effect,
  firstOnly: boolean
): boolean;

/** DzEffectGroupEnumRange */
declare function DzEffectGroupEnumRange(
  whichEffectGroup: dzeffectgroup,
  x: number,
  y: number,
  range: number,
  clear: boolean,
  allowDuplicate: boolean
): number;

/** DzEffectGroupEnumRect */
declare function DzEffectGroupEnumRect(
  whichEffectGroup: dzeffectgroup,
  whichRect: rect,
  clear: boolean,
  allowDuplicate: boolean
): number;

/**
 * 特效组 - 是否包含特效
 * ${特效组} 是否包含 ${特效}
 */
declare function DzEffectGroupContains(
  whichEffectGroup: dzeffectgroup,
  whichEffect: effect
): boolean;

/**
 * 特效组 - 删除
 * 删除 ${特效组}
 */
declare function DzEffectGroupDestroy(whichEffectGroup: dzeffectgroup): boolean;

/**
 * 特效组 - 选取特效
 * 选取特效
 * 选取做动作里获取当前选取的特效
 */
declare function DzGetEnumEffect(): effect;

/**
 * 特效组 - 选取做多动作
 * 选取 ${特效组} 中的每个特效做动作
 * 在动作里使用 DzGetEnumEffect 获取当前选取的特效
 */
declare function DzForEffectGroup(whichEffectGroup: dzeffectgroup, callback: () => void): number;

/**
 * 特效组 - 转换 handle ID 为特效组
 * 转换 handle ID ${handleID} 为特效组
 * 整数地址转换为特效组
 */
declare function DzHandle2EffectGroup(handleID: number): dzeffectgroup;

/**
 * 哈希表 - 保存特效组
 * 保存特效组到哈希表 ${哈希表} 主Key ${主Key} 子Key ${子Key} 特效组 ${特效组}
 * 保存特效组句柄到哈希表中
 */
declare function SaveDzEffectGroupHandle(
  table: hashtable,
  parentKey: number,
  childKey: number,
  g: dzeffectgroup
): boolean;

/**
 * 哈希表 - 读取特效组
 * 从哈希表 ${哈希表} 主Key ${主Key} 子Key ${子Key} 读取特效组
 * 从哈希表中读取保存的特效组句柄
 */
declare function LoadDzEffectGroupHandle(
  table: hashtable,
  parentKey: number,
  childKey: number
): dzeffectgroup;

/**
 * 特效 - 更新坐标
 * 更新 ${特效} 的坐标
 * 先读取Sprite的坐标 然后设置成特效的坐标,如果使用旧版japi修改特效位置 是需要调用该函数刷新坐标。
 */
declare function DzUpdateEffectSmartPosition(whichEffect: effect): boolean;

/**
 * 特效 - 立即删除(不播放死亡动画)
 * 立即删除 ${特效}
 * 不会播放死亡动画立即删除特效
 */
declare function DzRemoveEffect(whichEffect: effect): boolean;

/** DzRemoveEffectTimed */
declare function DzRemoveEffectTimed(whichEffect: effect, time: number): boolean;

/**
 * 特效 - 设置始终渲染
 * 设置特效 ${effect} 始终渲染 ${flag}
 * 可以在 战争迷雾/黑色阴影/屏幕外 时显示此特效,多了会掉帧,可以对体积巨大的模型使用
 */
declare function DzSetEffectAlwaysRender(whichEffect: effect, flag: boolean): boolean;

/** DzDieEffectTimed */
declare function DzDieEffectTimed(whichEffect: effect, time: number): boolean;

/**
 * 特效 - 设置特效组黑名单(异步特效坐标专用)
 * 设置 ${特效} 不会被特效组选取 ${flag}
 * 标记后该特效不会被特效组选取到, 异步特效坐标专用， 标记之后不会导致选取异步
 */
declare function DzSetEffectGroupBlacklist(whichEffect: effect, flag: boolean): boolean;

/**
 * 特效 - 设置绑定特效的缩放大小
 * 设置 ${特效} 绑定模型的缩放 X: ${scaleX} Y: ${scaleY} Z: ${scaleZ}
 * 修改特效模型作为附着模型渲染时的缩放, 设为1.0还原
 */
declare function DzSetEffectAttachedModelScale(
  whichEffect: effect,
  scaleX: number,
  scaleY: number,
  scaleZ: number
): boolean;

/**
 * 界面 - 设置UI模型绑定特效的缩放大小
 * 设置 ${frame} UI模型绑定特效的缩放 X: ${scaleX} Y: ${scaleY} Z: ${scaleZ}
 * 修改UI模型控件的模型作为附着模型渲染时的缩放, 设为1.0还原
 */
declare function DzFrameSetAttachedModelScale(
  frame: number,
  scaleX: number,
  scaleY: number,
  scaleZ: number
): boolean;

/**
 * 特效 - 重新播放出生动画
 * 重新播放 ${特效} 的出生动画
 * 先播放birth动画, 结束后自动播放stand动画
 */
declare function DzEffectReplayBirth(whichEffect: effect): void;

/**
 * 注册Frame事件（阻塞）
 * 为Frame注册事件，回调在当前线程阻塞执行
 */
declare function DzFrameSetScriptBlock(
  frame: number,
  eventId: number,
  funcHandle: () => void,
  sync: boolean
): void;

/**
 * 注册Frame事件（异步，函数名）
 * 为Frame注册事件，使用函数名回调，不进行同步
 */
declare function DzFrameSetScriptAsync(frame: number, eventId: number, funcName: string): void;

/**
 * 注册Frame事件（异步，code）
 * 为Frame注册事件，使用code回调，不进行同步
 */
declare function DzFrameSetScriptByCodeAsync(
  frame: number,
  eventId: number,
  func: () => void
): void;

/**
 * 注册Frame事件（异步阻塞）
 * 为Frame注册事件，回调阻塞执行且不进行同步
 */
declare function DzFrameSetScriptBlockAsync(frame: number, eventId: number, func: () => void): void;
