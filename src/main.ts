import { Frame, Timer } from "@eiriksgata/wc3ts/*";
import { ydlua } from "./ydlua";
import { ConfigManager } from "./config";
import { PlayersConfig } from "./config/Players";
import { MapGeneral } from "./config/Map";
import { mouseEvents } from "./system/event";
import { scheduler } from "./system/async";
import DamageSystem from "./system/damage";
import { BuffSystem } from "./system/buff";
import ShieldSystem from "./system/ShieldSystem";
import SummoningSystem from "./system/SummoningSystem";
import { UnitBlood } from "./system/ui/component/UnitBlood";
import { NativeUISystem } from "./system/ui/gameui";
import { registerDefaultRelicsAndPools } from "./system/relic";
import { initItemRelicBridge } from "./system/item/ItemRelicBridge";
import { initTestSkills } from "./system/skill/TestSkills";
import { ElementalReactionSystem } from "./system/element/ElementalReactionSystem";
import { registerSkillBuffDisplays } from "./system/skill/SkillBuffs";
import { BuffBarUI } from "./system/ui/component/BuffBarUI";
import { CommandCardCooldownUI } from "./system/ui/component/CommandCardCooldownUI";
import { RelicBarUI } from "./system/ui/component/RelicBarUI";
import { UnitBloodToggleUI } from "./system/ui/component/UnitBloodToggleUI";
import { DisplayToggleUI } from "./system/ui/component/DisplayToggleUI";
import { FpsDisplay } from "./system/ui/FpsDisplay";
import { DamageNumberDisplay } from "./system/ui/DamageNumberDisplay";
import { relicSystemTestExample } from "./test/RelicSystemTestExample";
import { seedBuffBarDemo } from "./test/BuffBarTestExample";
import { runSpellCardBulletHellTest } from "./test/BulletHellTestExample";
import { testAddShield } from "./test/HeroUnitSkillTestExample";
import { createLogger } from "./utils/logger";
import { rgeisterUnitSpellEffectEvent } from "./examples/UnitEventExample";
import { asyncSelfTest } from "./test/AsyncTestExample";
import { seedChatBoxDemo } from "./test/ChatBoxTestExample";
import { statSelfTest } from "./test/StatSystemTestExample";
import { statPanelSelfTest } from "./test/StatPanelTestExample";
import { elementalDamageSelfTest } from "./test/ElementalDamageTestExample";
import { elementalReactionSelfTest } from "./test/ElementalReactionTestExample";
import { elementAuraSelfTest } from "./test/ElementAuraTestExample";
import { StatSystem } from "./system/stat";
import { DamagePipeline } from "./system/combat";
import LifestealSystem from "./system/combat/LifestealSystem";
import FreezeShatterSystem from "./system/combat/FreezeShatterSystem";
import CooldownReductionSystem from "./system/skill/CooldownReductionSystem";
import { StatPanelUI } from "./system/ui/component/StatPanelUI";
import { ChatBoxUI } from "./system/ui/ChatBoxUI";
// TODO(阶段1): 探针验证完毕后删除此行与 initialize() 里的调用
import { runNativeUIProbe } from "./test/NativeUIProbe";

const log = createLogger("Main");

/**
 * 阶段 1 原生 UI 探针开关。
 *
 * **当前打开**：移植卡在「`frameByName("ConsoleUIBackdrop", 0)` 解析不到 →
 * `create()` 报「父节点无效」→ 自建底板全部建不出来」。探针那 55 个名字 × 4 个
 * finder 的全量扫描正好回答「1.27a 下到底哪些原生 frame 名字能被解析到」。
 *
 * 与 `create()` 的剪贴板报告不冲突 —— `NativeUISystem` 里的
 * `ENABLE_CLIPBOARD_DIAGNOSTICS` 是 false，它只走 `print`。
 *
 * 验证完即把这里改回 `false`，并删除 `src/test/NativeUIProbe.ts`。
 */
const ENABLE_NATIVE_UI_PROBE = false;

/**
 * UI v1.6 移植（`src/system/ui/gameui/`）总开关。
 *
 * **当前关闭，恢复已知良好状态用。**
 *
 * 事故记录（2026-10-04 凌晨，三次运行三次坏，每次坏的东西都不一样）：
 *
 *   第 1 次：frame 全部解析不到（finder 用错），界面纹丝不动。这一版是无害的。
 *   第 2 次：修好 finder 之后，原生 UI 改动**真的执行了**。用户报
 *           「所有触发失效 + Lua 控制台没了」。前者已查明是 `create()` 排在四个
 *           system 的 `init()` 之前、而 bootstrap 的 `initialize()` 没有 pcall，
 *           一抛全断；已挪到最末尾并包 try/catch。后者未查明。
 *   第 3 次：关掉四个未验证的原生操作、加上剪贴板诊断之后，**直接闪退**。
 *           `Errors/2026-10-04 01.40.*`，崩溃族是全新的：
 *             MSVCP140.dll  std::ios_base::~ios_base+76  (EAX 已损坏，读 [eax+8])
 *             ← ydbase.dll ← VCRUNTIME140.dll
 *
 *           **已查明（2026-10-04 上午）**：与 `DzSetClipboard` 无关 —— 那行代码
 *           一次都没执行到。真凶是给 `frameByName` 加 finder 诊断那笔改动：
 *           `catch` 块里写了 `continue`，tstl 把 catch 编成**内嵌函数**，而 Lua 的
 *           `goto` 不跨函数找 label，于是生成的
 *             NativeFrames.lua:96: no visible label '__continue9' for <goto> at line 94
 *           让整个 .lua **加载失败**。`src.main` 的 import 链随之崩掉，错误穿过
 *           ydbase.dll 的文件层变成原生 FATAL ERROR。同一笔改动也把同样的 bug
 *           写进了 `src/test/NativeUIProbe.ts`（已修）。
 *           这也解释了第 1、2 次为什么没事 —— 那时 `frameByName` 里还没有 try/catch。
 *
 *           教训见 memory `wc3-tstl-continue-in-catch`：**catch 里只能改用标志位，
 *           别写 `continue`**（`return` 是安全的，只有 goto 有这个问题）。
 *
 * 所以：之后一次只放回一小步、每步单独验证，而不是再攒一堆改动一起上。
 *
 * **当前打开（2026-10-04 上午）**：探针已经把「界面纹丝不动」查清楚了 ——
 * 根因不是原生 API 不可用，而是**一大半原生 frame 在 1.27a 上按名字取不到**：
 *
 *   `ConsoleUIBackdrop`（所有自建 frame 的父节点）→ `consoleParent()` 逐级降级
 *   `CommandButton_0..11`（12/12 MISS）          → `DzFrameGetCommandBarButton`
 *   `InventoryButton_0..5`（6/6 MISS）           → `DzGetInventoryBarButton`
 *
 * 详见 `NativeFrames.ts` 里那几段说明。
 */
const ENABLE_NATIVE_UI_PORT = true;

/**
 * 应用程序主入口
 * 负责引导整个应用程序的启动
 */
function main(): void {
  PanCameraToTimed(200, 0, 0);
  if (!ConfigManager.getInstance().isDebugMode()) {
    return;
  }
  Timer.create().start(0.01, false, () => {
    rgeisterUnitSpellEffectEvent();
    // ⚠️ 测试技能的发放**全部在 `UnitEventExample` 里**（谁造的单位谁负责发），
    // 这里不再调 `grantTestSkills()`。
    //
    // 那一句是「扫 `Actor.allActors`、按归属给本地玩家的单位补发」，用户口径是不要
    // 这套全局扫描 —— 直接在那个脚本里 `grantTestSkillsTo(hero)` 就够。
    // **函数本身留在 `TestSkills.ts` 里没删**（将来真要批量补发时还能用），
    // 所以这里的 import 去掉了它也不会有悬空引用。
    //
    // 原来这里的顺序注释（「必须在上一行之后」）是给 `grantTestSkills()` 用的，
    // 一并删掉 —— 现在这个回调里第一句就是造单位，没有依赖顺序的第二句了。
    // seedBuffBarDemo(); 测试buff
    // asyncSelfTest();  测试异步
    seedChatBoxDemo();
    // 属性系统地基的自测（纯计算内核，不碰引擎、不需要单位，放哪都行）。
    // 放在这个 0.01s 回调里是为了和上面几项一起只在 debug 模式下跑。
    statSelfTest();

    // 元素伤害公式的自测（阶段 B / Step 2）。同样是纯计算，不碰引擎、不需要单位。
    // **用 try/catch 单独包** —— 它和 `statSelfTest` 没有依赖关系，
    // 一个抛了不该让另一个不跑。
    try {
      elementalDamageSelfTest();
    } catch (e) {
      log.error(`元素伤害公式自测抛出异常，已隔离：${e}`);
    }

    // 元素反应（纯函数层）的自测（§2.2 / Step 1）。同样是纯计算，不碰引擎。
    // 单独 try/catch：与上面两套互不依赖，一个抛了不该让另一个不跑。
    try {
      elementalReactionSelfTest();
    } catch (e) {
      log.error(`元素反应自测抛出异常，已隔离：${e}`);
    }

    // 阶段 B 的伤害探针（`src/test/DamageProbe.ts`）已于 Step 6 验收通过后删除。
    // 它验过的口径都记在 memory `wc3-damage-event-semantics` 里；P6/P7/P8 三段
    // 的结论（接管后写回值不被二次削甲、遗物钩子、真物品拾取/丢弃）分别对应
    // `DamagePipeline` 的 Step 3/5/6。要重跑得把那个文件从 git 历史里捞回来。
  });

  // 属性面板的自测（阶段 E / Step 3）。
  //
  // ⚠️ **不能和上面那批挤在 0.01s** —— 它要挑一个真实的 `Actor` 来读原生，
  // 而 `rgeisterUnitSpellEffectEvent()` 虽然同步造出了单位，那些单位却是
  // 在那一次 `Timer.create().start(0.01, ...)` 回调里才建出来的；
  // 更重要的是**同一批 `BuffManager` 挂上去的属性来源还没被冲刷拍写回原生**。
  // 等 1.5s（跨过 0.1s 冲刷拍的十几轮）再测，读到的是稳定态。
  //
  // 包 try/catch 的理由同 `initialize()` 里那几处：这个回调里抛出去，
  // 后面……没有后面了，但异常冒泡到定时器回调里同样是脏的。
  Timer.create().start(1.5, false, () => {
    try {
      statPanelSelfTest();
    } catch (e) {
      log.error(`属性面板自测抛出异常，已隔离：${e}`);
    }

    // 元素附着 / 反应系统的自测（§2.2 / Step 2）。同样需要**真单位**（附着是挂在
    // `BuffManager` 上的 buff），所以和面板自测同一个 1.5s 时机。
    // 单独 try/catch：两者互不依赖，一个抛了不该让另一个不跑。
    // ⚠️ 它和面板自测挑的**不是**同一个单位（面板只要「无属性表」的，附着不挑）
    // —— 所以两者不会互相干扰；附着不带属性修正器，也动不到面板的读数。
    try {
      elementAuraSelfTest();
    } catch (e) {
      log.error(`元素附着自测抛出异常，已隔离：${e}`);
    }
  });

  // 攻速 / 每秒回复那两个一次性探针（`AttackSpeedProbe.ts` / `RegenProbe.ts`）
  // 已于 2026-10-06 结论落档后删除，读数与推论见：
  //   - 攻速 `0x51` 是**倍率**且可写、引擎会叠加敏捷增量 → `stat/types.ts` 的 ⚠️
  //   - 回复是**一个原生字段**（物品/技能那份也累加在里面）、写入是绝对值覆盖
  //     → memory `wc3-unit-state-japi-write`
  // 两条都验完了，**不要再把它们加回来**；要复测照那段 memory 重写即可。
  //
  // 漂移槽位探针（`DriftSlotProbe.ts`，2026-10-07 三轮跑完）也已删除 —— 它把
  // `DRIFT_SLOTS` 那份名单一条条问出来了，读数全在 `stat/StatSheet.ts` 的
  // `DRIFT_SLOTS` 注释里。**同样不要再加回来**：要复测照那张表重写。

  // 攻速（`0x51`）接线前的一次性探针（`AttackSpeedWireProbe.ts`，2026-10-07 两轮跑完）
  // 也已删除，**不要再加回来** —— 它把接法的三个前提问出来了，读数落档在
  // `stat/StatSheet.ts` 的 `DRIFT_SLOTS` 表（攻速那一行）与 `stat/types.ts` 的 ⚠️：
  //   - 引擎对 `0x51` 是**加法**（偏离值 3.700 + 敏捷×10 → 3.900）；
  //   - **但每写回一次就把写那一刻的敏捷项固化一次**（再写 3.700 读回 3.700，那 0.2
  //     等 2 秒也没回来）⟹ 折算不是「更好」而是它的活路；
  //   - 非英雄可写、写后稳定（步兵 1.500 → 1.500）⟹ 不需要英雄守卫。
  // 要复测照那两处重写。

}

/**
 * 初始化函数 - 供模块化加载使用
 */
export function initialize(): void {
  ydlua.getInstance().initialize();

  // 异步底座的心跳（`src/system/async/`）。**放在最前面** —— 它是后面所有
  // 「分片任务 / 延迟回调 / 状态锁」的驱动源，别的 system 起来时它就该在跑了。
  // 包 try/catch 的理由同下面几处：这里抛出去后面所有 system 的 init 都不会执行。
  try {
    scheduler.start();
  } catch (e) {
    log.error(`Scheduler.start() 抛出异常，异步底座不可用：${e}`);
  }

  try {
    Frame.loadTOC("resource\\fdf\\path.toc");
    log.info("FDF TOC loaded successfully");
  } catch (e) {
    log.error(`loading FDF TOC: ${e}`);
  }

  registerDefaultRelicsAndPools();

  // 物品↔遗物桥（阶段 B / Step 6）。**必须排在 `registerDefaultRelicsAndPools()` 之后** ——
  // 它俩没有初始化顺序上的硬依赖（拾取是运行时才发生），但定义先注册好、
  // 触发器再开，读起来「能查到的一定存在」，不用去想中间那一瞬间。
  // 包 try/catch 的理由同下面几处：这里抛出去后面所有 system 的 init 都不会执行。
  try {
    initItemRelicBridge();
  } catch (e) {
    log.error(`initItemRelicBridge() 抛出异常，已隔离：${e}`);
  }

  // 测试技能（吸血 / 治疗 / 治疗加成）的效果订阅。**只是订阅，不发技能** ——
  // 技能发给哪些单位取决于单位什么时候被造出来，那件事在 `main()` 的 debug 分支里做。
  // 包 try/catch 的理由同上面几处：这里抛出去后面所有 system 的 init 都不会执行。
  try {
    initTestSkills();
  } catch (e) {
    log.error(`initTestSkills() 抛出异常，已隔离：${e}`);
  }

  RelicBarUI.getInstance().create();
  BuffBarUI.getInstance().create();

  // 测试技能那两个 Buff 的图标 / 名字 / Tips。**必须排在 `BuffBarUI.create()` 之后** ——
  // 那个 `create()` 自己会先注册内置那一批（护盾），这里跟着后面注册本仓的。
  // 两边 key 不重叠、渲染时才查表，所以顺序其实无所谓；这么排只是读起来因果清楚。
  //
  // 包 try/catch 的理由同下面几处：bootstrap.lua 调 main.initialize() 时没有 pcall，
  // 这里抛出去后面所有 system 的 init 都不会执行。
  try {
    registerSkillBuffDisplays();
  } catch (e) {
    log.error(`registerSkillBuffDisplays() 抛出异常，已隔离：${e}`);
  }

  // 把 buff 栏接到「选中/取消选中」上。
  // **之前一直漏了这一步** —— 只 create() 不 bind，事件从不触发，watchTarget 恒为
  // undefined，rebuildSlots() 第一行就 return，一个图标都不画。
  // 包 try/catch 的理由同下面几处：bootstrap.lua 调 main.initialize() 时没有 pcall，
  // 这里抛出去后面所有 system 的 init 都不会执行。
  try {
    BuffBarUI.getInstance().bindFollowLocalSelection();
  } catch (e) {
    log.error(`BuffBarUI.bindFollowLocalSelection() 抛出异常，已隔离：${e}`);
  }

  // 原生命令卡技能按钮上的线性冷却暗幕（复用 Buff 栏那个 IconTimeCurtain）。
  // **不需要 bind 选中事件** —— 它每帧直接问 `DzGetSelectedLeaderUnit()`，
  // 那个单位天然就是命令卡所对应的单位（理由见该文件头）。
  // 包 try/catch 的理由同上：这里抛出去后面所有 system 的 init 都不会执行。
  try {
    CommandCardCooldownUI.getInstance().create();
  } catch (e) {
    log.error(`CommandCardCooldownUI.create() 抛出异常，已隔离：${e}`);
  }

  // 头顶血条的分类开关（右上角两个按钮）。
  // 包 try/catch 的理由与本函数末尾那段注释相同：bootstrap.lua 调 main.initialize()
  // 时没有 pcall 包裹，这里一旦抛出去，后面所有 system 的 init 都不会执行。
  try {
    UnitBloodToggleUI.getInstance().create();
  } catch (e) {
    log.error(`UnitBloodToggleUI.create() 抛出异常，已隔离：${e}`);
  }

  // 右上角血条按钮**下方**那一列显示开关（帧率 / 伤害数字）。
  // 坐标上必须排在 UnitBloodToggleUI 之后，理由见 DisplayToggleUI 文件头的布局耦合说明。
  // 包 try/catch 的理由同上：这里抛出去后面所有 system 的 init 都不会执行。
  try {
    DisplayToggleUI.getInstance().create();
  } catch (e) {
    log.error(`DisplayToggleUI.create() 抛出异常，已隔离：${e}`);
  }

  // 聊天框：面板 + 玩家聊天接线。布局常量与坐标来历都搬去了 `ChatBoxUI.ts` 文件头。
  // 两个调用分开包 try/catch —— 建面板失败（比如 frame 建不出来）不该连带
  // 订阅也一起没了，反过来也一样。
  // 包 try/catch 的理由同上面几处：这里抛出去后面所有语句都不会执行。
  try {
    ChatBoxUI.getInstance().create();
  } catch (e) {
    log.error(`ChatBoxUI.create() 抛出异常，聊天框没建出来：${e}`);
  }

  try {
    ChatBoxUI.getInstance().bindPlayerChat();
  } catch (e) {
    log.error(`ChatBoxUI.bindPlayerChat() 抛出异常，玩家聊天不会进面板：${e}`);
  }

  PlayersConfig.CameraControl();
  UnitBlood.registerLocalDrawEvent();

  MapGeneral.sceneVisionInit();

  DzEnableWideScreen(true);

  mouseEvents.initialize();
  // 原来这里写死 `DzToggleFPS(true)` —— 那一句**实测没有效果**（KKWE 的 FPS 接口是坏的，
  // 详见 `FpsDisplay.ts` 文件头）。现在改成自绘：`FpsDisplay` 自己数帧、自己画，
  // 右上角那个「帧率显示」按钮控制的是它。
  FpsDisplay.init();

  DzFrameUnlockMouseRectLimit(true);

  SummoningSystem.getInstance().init();
  DamageSystem.getInstance().initialize();
  BuffSystem.getInstance().init();
  ShieldSystem.getInstance().init();

  // 伤害接管层（阶段 B / Step 1）。**位置必须在 `DamageSystem.initialize()` 之后** ——
  // 原生 `EVENT_UNIT_DAMAGED` 触发器由那里按单位注册，它还没跑起来时挂在这里收不到事件。
  //
  // 与 `ShieldSystem.init()` 的先后**不影响执行顺序**：同一次派发里谁先跑由
  // priority 决定（管线 100、护盾 10），跟注册顺序无关。排在这里只是因为读起来因果清楚。
  //
  // 包 try/catch 的理由同下面几处：bootstrap.lua 调 main.initialize() 时没有 pcall，
  // 这里抛出去后面所有语句都不会执行。
  try {
    DamagePipeline.getInstance().initialize();
  } catch (e) {
    log.error(`DamagePipeline.initialize() 抛出异常，已隔离：${e}`);
  }

  // 元素反应系统（§2.2 附着骨架）。**位置在 `BuffSystem.init()` 之后** ——
  // 它往目标身上挂附着 buff，走的是 `BuffManager`，生命周期得先活着。
  //
  // 它**不依赖 `StatSystem`**：附着 buff 不带属性修正器（`getStatModifiers()` 恒 `[]`），
  // 不碰属性表。`init()` 本身只做两件事：注册 7 个附着展示、订阅死亡清理 CD。
  // 真正的判定入口 `resolve()` 由 `DamagePipeline` 在伤害回调里调（见那里的接入）。
  //
  // 包 try/catch 的理由同上面几处：bootstrap.lua 调 main.initialize() 时没有 pcall，
  // 这里抛出去后面所有语句都不会执行。
  try {
    ElementalReactionSystem.getInstance().init();
  } catch (e) {
    log.error(`ElementalReactionSystem.init() 抛出异常，已隔离：${e}`);
  }

  // 属性系统的冲刷器：按 0.1s 一拍把脏掉的属性表写回原生。
  // **位置在 `BuffSystem.init()` 之后** —— buff 往属性表挂修正器，那些 `setSource`
  // 只标脏，真正落到原生是这里的事。两者节拍相同（0.1s），最坏差一拍。
  // 包 try/catch 的理由同上面几处：bootstrap.lua 调 main.initialize() 时没有 pcall，
  // 这里抛出去后面所有语句都不会执行。
  try {
    StatSystem.getInstance().init();
  } catch (e) {
    log.error(`StatSystem.init() 抛出异常，属性不会写回原生：${e}`);
  }

  // 吸血（阶段 B / Step 5）。**位置必须在 `StatSystem.init()` 之后** —— 它每发物理伤害
  // 都要读施法者的 `LIFESTEAL`，属性表得先有人冲刷。
  //
  // 它**不依赖 `DamagePipeline` 的注册顺序**，但依赖那个管线真的在跑（没有管线就没有
  // `DamageContext`，`findDamageContext` 恒返回 undefined，表现是「吸血永远不触发」）。
  // 排在这两处之后，读起来是「管线活着 → 属性活着 → 吸血活着」。
  //
  // 包 try/catch 的理由同上面几处：bootstrap.lua 调 main.initialize() 时没有 pcall，
  // 这里抛出去后面所有语句都不会执行。
  try {
    LifestealSystem.getInstance().init();
  } catch (e) {
    log.error(`LifestealSystem.init() 抛出异常，已隔离：${e}`);
  }

  // 碎冰（控制效果线 / 冻结的出口）。**位置必须在 `DamagePipeline` 之后** ——
  // 它靠 priority 4 排在护盾(10)之后读「真正扣掉的血」，但**注册顺序不影响执行顺序**
  // （那是 priority 决定的），排在这里是因为它和吸血是同一条链上的邻居。
  //
  // 它**不依赖 `StatSystem`**：阈值读的是原生最大生命，不碰属性表。
  //
  // 包 try/catch 的理由同上面几处：bootstrap.lua 调 main.initialize() 时没有 pcall，
  // 这里抛出去后面所有语句都不会执行。
  try {
    FreezeShatterSystem.getInstance().init();
  } catch (e) {
    log.error(`FreezeShatterSystem.init() 抛出异常，已隔离：${e}`);
  }

  // 冷却缩减（CDR 阶段 / Step 2）。**位置必须在 `StatSystem.init()` 之后** ——
  // 它每次施法都要读施法者的 `COOLDOWN_REDUCTION`，属性表得先有人冲刷。
  // 与吸血并列放在这里，读起来是「属性活着 → 消费属性的系统活着」。
  //
  // 它**不依赖任何其它系统的注册顺序**：读写技能冷却走的是 `Dz*` 直读原生
  // （不碰 ability 句柄），技能事件来自 `GameEvent` 早就注册好的通用频道。
  //
  // 包 try/catch 的理由同上面几处：bootstrap.lua 调 main.initialize() 时没有 pcall，
  // 这里抛出去后面所有语句都不会执行。
  try {
    CooldownReductionSystem.getInstance().init();
  } catch (e) {
    log.error(`CooldownReductionSystem.init() 抛出异常，已隔离：${e}`);
  }

  // 属性面板（阶段 E）。**位置在 `StatSystem.init()` 之后** —— 面板要读
  // `actor.statSheet.getFinal(...)`，虽然表的建立是惰性的（`Actor.statSheet` getter），
  // 但冲刷器得先活着，读到的才是被刷新过的值。
  //
  // 它自己会在 `create()` 里接上 C 键，并把「能被 ESC 关掉」登记进 `EscapeRouter`
  // —— ESC 的全局触发器由那一个模块单点注册，这里不需要再做什么。
  //
  // 包 try/catch 的理由同上面几处：bootstrap.lua 调 main.initialize() 时没有 pcall，
  // 这里抛出去后面所有语句都不会执行。
  try {
    StatPanelUI.getInstance().create();
  } catch (e) {
    log.error(`StatPanelUI.create() 抛出异常，已隔离：${e}`);
  }

  // 伤害飘字。**位置在 `ShieldSystem.init()` 之后** —— 只是读起来因果清楚
  // （「先扣护盾、再飘字」），实际先后由事件优先级决定，与登记顺序无关：
  // 本类用 `DAMAGE_TEXT_PRIORITY = 0`，ShieldSystem 用 10，数值大的先跑。
  // 包 try/catch 的理由同上面几处：bootstrap.lua 调 main.initialize() 时没有 pcall，
  // 这里抛出去后面所有语句都不会执行。
  try {
    DamageNumberDisplay.init();
  } catch (e) {
    log.error(`DamageNumberDisplay.init() 抛出异常，已隔离：${e}`);
  }

  // 给场上已有的单位补血条 + 订阅之后出现的单位。
  //
  // **位置必须在上面四个 system 的 init() 之后** —— 血条每帧要读
  // `actor.shieldPercent`（走 `BuffManager`），而 BuffSystem / ShieldSystem
  // 要到上面两行才就绪。这也是它没和 `UnitBloodToggleUI.create()`（只有两个
  // 按钮，无依赖）放在一起的原因。
  try {
    UnitBloodToggleUI.getInstance().attachToAllUnits();
  } catch (e) {
    log.error(`UnitBloodToggleUI.attachToAllUnits() 抛出异常，已隔离：${e}`);
  }

  main();

  // UI v1.6 移植（阶段 3 核心骨架）。
  //
  // **放在整个 initialize() 的最末尾，并且包一层 try/catch** —— 这一条是踩出来的。
  // bootstrap.lua:151 的 `main.initialize()` **没有 pcall 包裹**，所以 initialize()
  // 里任何一处抛异常，后面的语句全都不执行。此前把这行放在四个 system 的 init()
  // 之前，一旦它抛了，SummoningSystem / DamageSystem / BuffSystem / ShieldSystem
  // 全部起不来 —— 表现为「所有触发都失效」。
  if (ENABLE_NATIVE_UI_PORT) {
    try {
      NativeUISystem.getInstance().create();
    } catch (e) {
      log.error(`NativeUISystem.create() 抛出异常，已隔离：${e}`);
    }
  }

  // TODO(阶段1): 探针验证完毕后删除这一行
  if (ENABLE_NATIVE_UI_PROBE) {
    runNativeUIProbe();
  }
}

/**
 * 热重载处理函数
 * 当模块被热重载时调用
 */
export function onHotReload(): void {
  log.info("module hot reloaded");
}
