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
const ENABLE_NATIVE_UI_PROBE = true;

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
    // 必须在上一行之后：那一行才同步造出全部单位，早了 Actor.allActors 里是空的
    seedBuffBarDemo();
    asyncSelfTest();
  });
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
  RelicBarUI.getInstance().create();
  BuffBarUI.getInstance().create();

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
