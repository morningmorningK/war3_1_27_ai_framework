/**
 * 元素反应表 —— **纯数据 + 纯函数，零引擎调用**。
 *
 * ## 为什么单独一个文件
 *
 * 反应倍率是「错了会静默给出错数」的那一类：算歪了不崩、不报错，只是某天有人发现
 * 「怎么蒸发打不出伤害」。抽成纯函数就能用普通断言把手算值钉死
 * （`src/test/ElementalReactionTestExample.ts`），不必进游戏看飘字。
 * 与 `ElementalDamage.ts` 同一个理由。
 *
 * ## 表里现在有两类反应：**增幅**（蒸发 / 融化）、**剧变**（冻结 / 超载 / 超导 / 感电 / 绽放 / 激化 / 燃烧）
 *
 * | 已有附着 | 来袭 | id | kind | 倍率 / 系数 | 消耗比 | 落地效果 |
 * |---|---|---|---|---|---|---|
 * | 火 | 水 | `vaporize_water_on_fire` | `amplify` | 2.0 | 0.5 | — |
 * | 水 | 火 | `vaporize_fire_on_water` | `amplify` | 1.5 | 1.0 | — |
 * | 冰 | 火 | `melt_fire_on_ice` | `amplify` | 2.0 | 0.5 | — |
 * | 火 | 冰 | `melt_ice_on_fire` | `amplify` | 1.5 | 1.0 | — |
 * | 冰 | 水 | `frozen` | `transform` | — | 1.0 | `freeze` |
 * | 水 | 冰 | `frozen` | `transform` | — | 1.0 | `freeze` |
 * | 火 | 雷 | `overload` | `transform` | 2.0 | 1.0 | `overload` |
 * | 雷 | 火 | `overload` | `transform` | 2.0 | 1.0 | `overload` |
 * | 冰 | 雷 | `superconduct` | `transform` | 0.5 | 1.0 | `superconduct` |
 * | 雷 | 冰 | `superconduct` | `transform` | 0.5 | 1.0 | `superconduct` |
 * | 水 | 雷 | `electro_charged` | `transform` | 1.2 | 1.0 | `electro_charged` |
 * | 雷 | 水 | `electro_charged` | `transform` | 1.2 | 1.0 | `electro_charged` |
 * | 水 | 草 | `bloom` | `transform` | 2.0 | 1.0 | `bloom` |
 * | 草 | 水 | `bloom` | `transform` | 2.0 | 1.0 | `bloom` |
 * | 草 | 雷 | `quicken` | `transform` | — | 1.0 | `quicken` |
 * | 雷 | 草 | `quicken` | `transform` | — | 1.0 | `quicken` |
 * | 草 | 火 | `burning` | `transform` | 1.0 | 1.0 | `burning` |
 * | 火 | 草 | `burning` | `transform` | 1.0 | 1.0 | `burning` |
 * | 火 | 风 | `swirl_fire` | `transform` | 0.6 | 1.0 | `swirl` |
 * | 水 | 风 | `swirl_water` | `transform` | 0.6 | 1.0 | `swirl` |
 * | 雷 | 风 | `swirl_thunder` | `transform` | 0.6 | 1.0 | `swirl` |
 * | 冰 | 风 | `swirl_ice` | `transform` | 0.6 | 1.0 | `swirl` |
 * | 草 | 风 | `swirl_grass` | `transform` | 0.6 | 1.0 | `swirl` |
 *
 * 「倍率 / 系数」那两列**不是同一个东西**：增幅是 `ratio`（乘在**来袭那一击**上），
 * 剧变是 `transformCoeff`（乘在**反应自己那一段伤害**的等级基数上）。见下面那节。
 * **两列都是 `—`** 的（冻结 / 激化）是「触发了但自己不造伤害」—— 它们的价值全在
 * `effect` 挂上去的那个状态上。
 *
 * ⚠️ **扩散与结晶都固定来袭方** —— 风必须是被打出去的那一方
 * （`incoming === "wind"`）。反过来（风附着 + 别的元素来袭）**没有反应**，
 * 只会把风附着覆盖掉。岩不在列：`todo §2.2.2` 明写「风无法扩散岩元素」。
 *
 * 其余组合一律**无反应**（同元素 → 只刷新附着；表外组合 → 附着或覆盖）。
 * 结晶：岩来袭接触火 / 水 / 雷 / 冰，消耗附着并生成对应元素碎片，不额外造成伤害。
 *
 * ## ⚠️ 剧变的伤害不在这一层算，但系数在这一层
 *
 * 剧变反应的伤害由 `ReactionEffects.ts` 派发：**基数 = `transformBase(等级) × transformCoeff`**，
 * 再以 `kind: "transform"` 走一遍 `dealRaw()` 补上 `emTransform(EM)` / 抗性 / 免伤
 * （于是**天然不吃**元素加成、暴击、擢升 —— 那正是 `todo §2.2.2` 对剧变的要求）。
 * 系数留在这张表里，是为了「要调只改一处」。
 *
 * ## ⚠️ 两类反应对**来袭那一击**的影响是相反的，别混用一个 `kind`
 *
 *   - **增幅**：把来袭伤害 ×倍率。所以 `DealInput.kind` 传 `"amplify"`。
 *   - **剧变**：对来袭那一击**零影响** —— 它不放大、也不该让它掉出乘区。
 *     所以管线那一侧**只透传 `amplify`**（见 `DamagePipeline_dealElemental`）。
 *
 * `ReactionDef.kind` 记的是**反应自己的类别**（给 `ctx.reactionKind` 汇总与日志用），
 * 与「来袭这一击怎么算」是两件事 —— 这两件事曾经共用一个变量，是冻结这一轮差点
 * 静默吃掉水弹/冰弹全部乘区的地方。
 *
 * ## ⚠️ `DealInput.kind === "transform"` 是给**另一半**准备的
 *
 * 于是 `DealInput.kind` 的三个取值合起来是这么分的（别以为哪一边写错了）：
 *
 * | 取值 | 谁在传 | 含义 |
 * |---|---|---|
 * | `none` | 管线（无反应 / 剧变来袭那一击） | 普通元素段，全乘区照吃 |
 * | `amplify` | 管线（增幅反应命中的那一击） | 被增幅反应放大了 |
 * | `transform` | **剧变反应自己的那一段**（`ReactionEffects.ts` 派发） | 不吃元素加成 / 暴击 / 擢升，只补 `emTransform` |
 *
 * 前两行说的是「**来袭那一击**」，第三行说的是「**反应自己造的那一段**」——
 * 它们是两段不同的伤害、两个不同的 `DamageContext`，从来不会同时出现。
 *
 * ## ⚠️ 倍率与消耗比**方向绑在 id 里**
 *
 * 蒸发两个方向倍率不同（2.0 / 1.5），所以 `ReactionId` 必须把「谁打谁」编进去 ——
 * 只写 `"vaporize"` 的话 `reactionMultiplier` 查不到该用哪个倍率，
 * 只能把倍率提前算好塞进 `DealInput`，那就破坏了「倍率留在纯函数内部」这条硬口径。
 *
 * 冻结两个方向**结果相同**（都是冻结），所以共用一个 id。将来若出现
 * 「冰打水冻得久、水打冰冻得短」这类差异，那时再拆成两个 id。
 */

import { ELEMENTS, ElementId } from "src/system/stat";
// ⚠️ **type-only import**，与 `combat/DamageContext.ts:28` 那条（反向）对称。
// 编译后整条消失，所以 element 与 combat 之间不留任何运行时边，不成环。
import type { ReactionKind } from "src/system/combat/DamageContext";

/**
 * 参与**附着**的元素白名单：`ELEMENTS` 去掉 `physical`。
 *
 * ⚠️ **必须过滤，不能直接遍历 `ELEMENTS`。** `ELEMENTS[0] === "physical"`，
 * 而 `deal.add()` 的 `element` 参数也收 `ElementId`。若让 `physical` 参与附着，
 * 一次物理追加伤害就会在目标身上挂一条 `aura_physical` —— 而它**没有注册展示**，
 * 表现是 buff 栏上莫名多一个「未知 Buff」空白格，不报错、不复现。
 * 物理本来就不该有附着（`todo.md` §2.2.1）。
 */
export const AURA_ELEMENTS: ElementId[] = [];
for (let i = 0; i < ELEMENTS.length; i++) {
  const e = ELEMENTS[i];
  if (e !== undefined && e !== "physical") {
    AURA_ELEMENTS.push(e);
  }
}

/** 某个元素能不能附着 */
export function isAuraElement(e: ElementId): boolean {
  return e !== "physical";
}

/**
 * 反应 id。**方向编码在 id 里**，理由见文件头。
 *
 * ⚠️ 但只在**两个方向结果不同**时才拆（蒸发 / 融化：倍率 2.0 vs 1.5）。
 * 冻结 / 超载 / 超导 / 感电两个方向结果完全相同，所以**各只有一个 id**，
 * `lookupReaction()` 的两个分支返回**同一个对象**。
 *
 * ⚠️ **扩散是第三种情况：只有一个方向，却拆成 5 个 id** —— 因为「打哪个元素、
 * 扩散哪个元素」随被扩散的元素变，那是定义的一部分。见下面 `SWIRL_*` 那节。
 */
export type ReactionId =
  | "vaporize_water_on_fire"
  | "vaporize_fire_on_water"
  | "melt_fire_on_ice"
  | "melt_ice_on_fire"
  | "frozen"
  | "overload"
  | "superconduct"
  | "electro_charged"
  | "bloom"
  | "quicken"
  | "burning"
  | "swirl_fire"
  | "swirl_water"
  | "swirl_thunder"
  | "swirl_ice"
  | "swirl_grass"
  | "crystallize_fire"
  | "crystallize_water"
  | "crystallize_thunder"
  | "crystallize_ice";

export type CrystalElement = "fire" | "water" | "thunder" | "ice";

/** 结晶护盾基础厚度：等级 1 为 300，每级 +50；精通加成渐近 +200%。 */
export function crystallizeShieldAmount(level: number, mastery: number): number {
  const lv = Math.max(1, Math.floor(level));
  const em = Math.max(0, mastery);
  return (300 + 50 * (lv - 1)) * (1 + 2 * em / (em + 1000));
}

/**
 * 反应挂到单位上的**落地效果**。由 `ElementalReactionSystem.resolve()` 按它分派。
 *
 * 写成数据而不是在 `resolve()` 里 `if (id === "frozen")`：加一条新反应
 * 只需加一行数据，不用再动判定逻辑（`applyFreeze` 就是这么立起来的）。
 *
 * ⚠️ **不是「控制效果」** —— 削甲（`superconduct`）是 debuff，持续伤害
 * （`electro_charged`）连 debuff 都算不上。字段原名 `control`，装得下
 * 「冻结」装不下另外两个，所以 2026-10-07 改名 `effect`。
 */
export type ReactionEffect =
  /** 冻结：挂 `FreezeBuff`（时长由消耗的元素量决定） */
  | "freeze"
  /** 超载：范围火爆炸 + 击退 */
  | "overload"
  /** 超导：范围冰伤 + 降护甲 */
  | "superconduct"
  /** 感电：持续雷伤 + 保持雷附着 */
  | "electro_charged"
  /** 绽放：生成草原核，延迟后原地范围草伤 */
  | "bloom"
  /** 激化：给目标挂「受到的雷 / 草伤害增加」的减益，不自造伤害 */
  | "quicken"
  /** 燃烧：草附着被一次性吃光，转成一段只打主目标的持续火伤 */
  | "burning"
  /** 扩散：吃掉目标身上的附着，以它为中心把该元素传给周围敌人（挂附着 + 范围元素伤） */
  | "swirl"
  /** 结晶：生成可拾取的元素碎片，不派发剧变伤害。 */
  | "crystallize";

export interface ReactionDef {
  id: ReactionId;
  /** 显示名（聊天战斗日志 / 飘字用）。同一反应两个方向共用一个名字 */
  name: string;
  /**
   * 反应**自身**的类别。
   *
   * ⚠️ 它**不表示「来袭那一击怎么算」** —— 剧变反应对这一击零影响，管线只透传
   * `amplify`。别拿这个字段去喂 `DealInput.kind`，理由见文件头那一节。
   */
  kind: ReactionKind;
  /** 增幅反应的伤害倍率（尚未乘元素精通）。**剧变反应没有这个字段** */
  ratio?: number;
  /**
   * 剧变反应的**系数**（尚未乘等级基数与元素精通）。
   *
   * 剧变伤害 = `transformBase(等级) × transformCoeff` → 再走
   * `dealRaw(kind:"transform")` 补 `emTransform(EM)` / 抗性 / 免伤。
   *
   * ⚠️ **与 `ratio` 是两回事**：`ratio` 乘在来袭那一击上，`transformCoeff`
   * 乘在反应自己那段伤害的等级基数上。**两个字段互斥** —— 一条反应要么增幅、
   * 要么剧变，同时有这两个数的定义一定是写错了。
   *
   * ⚠️ **`ratio` 与它都缺省** = 这条反应**自己不造伤害**（冻结 / 激化）——
   * 价值全在 `effect` 挂上去的那个状态上，不是「漏配了系数」。
   */
  transformCoeff?: number;
  /**
   * 剧变伤害打的是**哪个元素**。缺省 = 这条反应不造成伤害（冻结 / 激化）。
   *
   * 单独一个字段而不是「取来袭元素」：超载是火+雷，打的是**火**伤；
   * 超导是冰+雷，打的是**冰**伤；感电才是雷。来袭元素恰好**没有一个**对得上。
   */
  damageElement?: ElementId;
  /** 结晶生成的护盾元素；不是伤害元素。 */
  shieldElement?: CrystalElement;
  /**
   * 消耗比：`被消耗的附着量 = 来袭元素量 × consumeRatio`。
   *
   * 照原神 1:2 关系 —— 倍率高的那一侧（2.0）消耗更少（0.5），
   * 倍率低的那一侧（1.5）按 1:1 消耗。集中在表里，要调只改这里。
   *
   * 剧变反应（冻结 / 超载 / 超导 / 感电 / 绽放 / 激化 / 燃烧）一律 `1.0`。
   */
  consumeRatio: number;
  /** 反应自带的落地效果。见 `ReactionEffect` 的注释 */
  effect?: ReactionEffect;
}

const VAPORIZE_WATER_ON_FIRE: ReactionDef = {
  id: "vaporize_water_on_fire",
  name: "蒸发",
  kind: "amplify",
  ratio: 2.0,
  consumeRatio: 0.5,
};

const VAPORIZE_FIRE_ON_WATER: ReactionDef = {
  id: "vaporize_fire_on_water",
  name: "蒸发",
  kind: "amplify",
  ratio: 1.5,
  consumeRatio: 1.0,
};

const MELT_FIRE_ON_ICE: ReactionDef = {
  id: "melt_fire_on_ice",
  name: "融化",
  kind: "amplify",
  ratio: 2.0,
  consumeRatio: 0.5,
};

const MELT_ICE_ON_FIRE: ReactionDef = {
  id: "melt_ice_on_fire",
  name: "融化",
  kind: "amplify",
  ratio: 1.5,
  consumeRatio: 1.0,
};

/**
 * 冻结（水 + 冰）。
 *
 * **没有 `ratio`** —— 它不是增幅反应，对来袭那一击零影响（见文件头）。
 * 它做的事是给目标挂一条 `FreezeBuff`，时长由**这次消耗掉的元素量**决定
 * （`frozenSeconds()`），之后照旧走 `addFreezeBuff` 的韧性。
 *
 * `consumeRatio = 1.0`：来袭多少元素量就吃多少附着，冻完目标身上是干净的
 * （来袭元素按增幅反应那套口径也**不附着**）。所以「2U 冰挨一发 2U 水」
 * = 冻结 5 秒、附着清空、不留残留。
 *
 * ⚠️ 与 todo 里「冻结存在元素量」的差别：本轮口径是**冻结时长 = 被消耗的元素量**，
 * 冻结期间**不保存**附着。将来要做「冻着也能继续附着反应」再改，那需要
 * `FreezeBuff` 自己也携带元素量。
 */
const FROZEN: ReactionDef = {
  id: "frozen",
  name: "冻结",
  kind: "transform",
  consumeRatio: 1.0,
  effect: "freeze",
};

/**
 * 超载（火 + 雷）。**两个方向共用这一个对象**（结果相同）。
 *
 * 剧变、**没有 `ratio`**，伤害走 `transformCoeff`：以目标为中心的范围内每个敌人
 * 各吃一段 `transformBase × 2.0` 的**火**伤，并被推离施法者一段距离。
 *
 * ⚠️ **`damageElement` 是 `fire` 不是 `thunder`** —— 原神口径里超载打的是火伤
 * （虽然它由雷引爆）。别按「来袭元素」去推，那正是这个字段存在的理由。
 */
const OVERLOAD: ReactionDef = {
  id: "overload",
  name: "超载",
  kind: "transform",
  transformCoeff: 2.0,
  damageElement: "fire",
  consumeRatio: 1.0,
  effect: "overload",
};

/**
 * 超导（冰 + 雷）。两个方向共用。
 *
 * 范围**冰**伤（系数 0.5，是三个里最弱的）+ 给每个命中单位挂一条降护甲的
 * `SuperconductBuff`。原神里超导本身伤害很低、价值在减抗，这里同理。
 */
const SUPERCONDUCT: ReactionDef = {
  id: "superconduct",
  name: "超导",
  kind: "transform",
  transformCoeff: 0.5,
  damageElement: "ice",
  consumeRatio: 1.0,
  effect: "superconduct",
};

/**
 * 感电（水 + 雷）。两个方向共用。
 *
 * 三兄弟里唯一**持续型**的：触发时先打一跳，然后给目标挂 `ElectroChargedBuff`，
 * 每 1 秒重复一次范围**雷**伤，并顺手刷新目标身上的雷附着。
 *
 * 系数 1.2 是**每跳**的值 —— 总伤害要乘以跳数（见 `ReactionEffects.ts` 的
 * `ELECTRO_CHARGED_DURATION` / `ELECTRO_CHARGED_INTERVAL`）。
 */
const ELECTRO_CHARGED: ReactionDef = {
  id: "electro_charged",
  name: "感电",
  kind: "transform",
  transformCoeff: 1.2,
  damageElement: "thunder",
  consumeRatio: 1.0,
  effect: "electro_charged",
};

/**
 * 绽放（水 + 草）。两个方向共用。
 *
 * 剧变、伤害走 `transformCoeff`：**但不像三条雷反应那样当场炸** —— 它在反应发生的
 * 坐标留下一颗「草原核」，`BLOOM_CORE_DELAY_SECONDS` 秒之后才在**原地**炸出一段
 * 范围**草**伤（见 `ReactionEffects.ts` 的 `ReactionEffects_applyBloom`）。
 * 所以这个系数是**延迟那一段**的系数，触发它的那一击本身零影响。
 *
 * `consumeRatio = 1.0`：来袭多少元素量就吃多少附着。附着 CD（`ATTACH_CD_SECONDS`）
 * 加上「每次扣光」使得连续绽放需要重新附着，天然限流。
 *
 * ⚠️ **两个方向共用**（水→草 / 草→水 结果相同）。与蒸发/融化不同 ——
 * 它们两个方向倍率不同才拆成两个 id。
 */
const BLOOM: ReactionDef = {
  id: "bloom",
  name: "绽放",
  kind: "transform",
  transformCoeff: 2.0,
  damageElement: "grass",
  consumeRatio: 1.0,
  effect: "bloom",
};

/**
 * 激化（草 + 雷）。两个方向共用。
 *
 * ⚠️ **它是全表唯一一条「不造任何伤害」的反应**（冻结挂 `FreezeBuff`，好歹是个控制）——
 * 落地效果是给目标挂 `QuickenBuff`：**受到的雷 / 草伤害 ×(1 + 幅度)**，
 * 幅度由**触发者**的元素精通经 `quickenVuln()` 算出来（见那个函数）。
 *
 * 所以这里**既没有 `ratio` 也没有 `transformCoeff` / `damageElement`** ——
 * 那不是漏配，是它本来就不打人。`ReactionEffects.ts` 因此**完全不参与**它：
 * 派发伤害的模块不接一个不派发伤害的反应（`resolve()` 里照 `freeze` 的先例直接挂）。
 *
 * `kind` 仍写 `"transform"`：这个枚举只有 `none | amplify | transform`，
 * 而它显然不是增幅。与 `freeze` 同一个取舍（冻结也不造伤害）。
 * 它**不会**让来袭那一击掉出乘区 —— 管线只透传 `amplify`（见文件头）。
 */
const QUICKEN: ReactionDef = {
  id: "quicken",
  name: "激化",
  kind: "transform",
  consumeRatio: 1.0,
  effect: "quicken",
};

/**
 * 燃烧（火 + 草）。两个方向共用。
 *
 * 用户 2026-10-09 定的三个口径：
 *
 *   1. **草在触发那一下被一次性吃光**（不是边烧边扣）。烧多久由**被吃掉的草量**推出
 *      （`burningSeconds()`，与冻结的 `frozenSeconds()` 完全对称）。
 *   2. **触发那一拍不额外造成伤害** —— 纯 DoT，第一跳在一个跳间隔之后。
 *   3. **每跳只打主目标** —— 单体，不做范围枚举（与三条雷反应 / 绽放都不同）。
 *
 * ⚠️ 口径 2 说的是「**反应**不额外加伤害」，**不是**「这一拍不掉血」：触发燃烧的那发
 * 火弹照常造成它自己的伤害（管线把 `DealInput.kind` 降成 `"none"`，全乘区照吃）。
 *
 * `transformCoeff = 0.5` 是**每跳**的系数，总伤害要乘实际跳数。
 * 常规 2U 草 → 烧 4 秒 → **6 跳**（间隔 0.6 秒）→ 共 **3.0× 基数**（单体）。
 *
 * ⚠️ **「每跳系数」与「跳间隔」是一对，改一个必须重算另一个**（用户口径：
 * 跳频可以调，**总伤不变**）。当前这一对是按「2U 草 = 3.0× 总伤」定的：
 * 间隔 0.6 → 4 秒正好 6 跳 → 每跳 3.0 / 6 = **0.5**。
 * 挑 0.6 而不是更好看的 0.5，是因为 0.5 会因 `BuffManager` 的浮点相位把跳点
 * 打成 0.5 / 1.1 / 1.6… 不规整，而且 4 秒只有 7 跳、每跳得写 3/7 这个丑数。
 * 实测跳数表见 `burningSeconds()` 的注释。
 *
 * 与三条雷反应相比：燃烧是**单体**、**触发拍零伤害**、还把草吃光（不能自我维持），
 * 所以总伤给到 3.0×（感电约 4.8× 但那是范围且能刷新自身附着）。
 */
const BURNING: ReactionDef = {
  id: "burning",
  name: "燃烧",
  kind: "transform",
  transformCoeff: 0.5,
  damageElement: "fire",
  consumeRatio: 1.0,
  effect: "burning",
};

/**
 * 扩散每段范围伤的**剧变系数**。
 *
 * 全场最低一档（对照：超导 0.5 单体削甲 / 感电 1.2 每跳 / 超载 2.0 / 绽放 2.0 /
 * 燃烧 0.5×6 跳 = 3.0 总伤）。理由：扩散还附带「把附着传给周围敌人」的连带收益
 * —— 那些敌人接下来会被别的元素打出反应，那部分价值不体现在这段伤害上；
 * 而且它可能同时打中多个目标，系数再高就变成一按全清。
 *
 * 用户 2026-10-10 定的数，进游戏看完手感再调。
 */
const SWIRL_COEFF = 0.6;

/**
 * 扩散的 5 条定义（风 × 火 / 水 / 雷 / 冰 / 草）。
 *
 * ## ⚠️ 为什么是 5 个 id，而不是像冻结那样 1 个
 *
 * `REACTION_TABLE` 是 `Record<ReactionId, ReactionDef>`，一个 id 只能有一条定义。
 * 冻结两个方向结果相同，所以一个 id 两个分支返回**同一个对象**；扩散不一样 ——
 * 「打哪个元素、扩散哪个元素」**随被扩散的元素变**，那是定义的一部分，
 * 不能只靠调用方传参。
 *
 * 于是**复用 `damageElement` 同时承担两件事**：这段范围伤打哪个元素、以及
 * 扩散出去的是哪个元素。两者天然相同（风扩散火 → 打火伤、给周围挂火附着），
 * 不新增字段。
 *
 * ## 为什么只有单向
 *
 * 风必须是**来袭**的那一方（`incoming === "wind"`）。反过来（风附着 + 别的元素来袭）
 * 没有反应，只会把风附着覆盖掉 —— `todo §2.2.2` 写的是「风攻击接触目标身上的附着」。
 *
 * ⚠️ **岩不在列**：`todo §2.2.2` 明写「风无法扩散岩元素」。
 *
 * ## 消耗与落地
 *
 * `consumeRatio = 1.0`：把这一发风能吃掉的那部分附着全吃掉（上限 = 来袭元素量）。
 * 落地效果见 `ReactionEffects.ReactionEffects_applySwirl()`：以目标为中心枚举敌人，
 * 各吃一段该元素的范围伤，并把该元素挂给他们 —— **但跳过主目标自己**。
 */
function swirlDef(id: ReactionId, element: ElementId): ReactionDef {
  return {
    id: id,
    name: "扩散",
    kind: "transform",
    transformCoeff: SWIRL_COEFF,
    damageElement: element,
    consumeRatio: 1.0,
    effect: "swirl",
  };
}

/** 扩散了**火**：风打带火附着的目标 */
const SWIRL_FIRE = swirlDef("swirl_fire", "fire");
/** 扩散了**水** */
const SWIRL_WATER = swirlDef("swirl_water", "water");
/** 扩散了**雷** */
const SWIRL_THUNDER = swirlDef("swirl_thunder", "thunder");
/** 扩散了**冰** */
const SWIRL_ICE = swirlDef("swirl_ice", "ice");
/** 扩散了**草** */
const SWIRL_GRASS = swirlDef("swirl_grass", "grass");

const CRYSTALLIZE_NAMES: Record<CrystalElement, string> = {
  fire: "火结晶", water: "水结晶", thunder: "雷结晶", ice: "冰结晶",
};

function crystallizeDef(id: ReactionId, element: CrystalElement): ReactionDef {
  return { id, name: CRYSTALLIZE_NAMES[element], kind: "transform", consumeRatio: 1.0,
    effect: "crystallize", shieldElement: element };
}
const CRYSTALLIZE_FIRE = crystallizeDef("crystallize_fire", "fire");
const CRYSTALLIZE_WATER = crystallizeDef("crystallize_water", "water");
const CRYSTALLIZE_THUNDER = crystallizeDef("crystallize_thunder", "thunder");
const CRYSTALLIZE_ICE = crystallizeDef("crystallize_ice", "ice");

/**
 * 按 id 查定义。给 `reactionMultiplier` / 日志 / 飘字用 —— 它们只拿到 `ReactionId`，
 * 拿不到方向组合。
 *
 * 用普通对象（字符串键）而不是数组：键是字符串，不存在「带洞数组 `.length` 为 0」
 * 那个坑（memory `wc3-tstl-sparse-array-length`）。
 *
 * ⚠️ 名字从 `AMPLIFY_TABLE` 改成 `REACTION_TABLE`：它现在装得下非增幅的反应，
 * 老名字会让下一个人在「增幅表里为什么有冻结」上耗掉半小时。
 */
export const REACTION_TABLE: Record<ReactionId, ReactionDef> = {
  vaporize_water_on_fire: VAPORIZE_WATER_ON_FIRE,
  vaporize_fire_on_water: VAPORIZE_FIRE_ON_WATER,
  melt_fire_on_ice: MELT_FIRE_ON_ICE,
  melt_ice_on_fire: MELT_ICE_ON_FIRE,
  frozen: FROZEN,
  overload: OVERLOAD,
  superconduct: SUPERCONDUCT,
  electro_charged: ELECTRO_CHARGED,
  bloom: BLOOM,
  quicken: QUICKEN,
  burning: BURNING,
  swirl_fire: SWIRL_FIRE,
  swirl_water: SWIRL_WATER,
  swirl_thunder: SWIRL_THUNDER,
  swirl_ice: SWIRL_ICE,
  swirl_grass: SWIRL_GRASS,
  crystallize_fire: CRYSTALLIZE_FIRE,
  crystallize_water: CRYSTALLIZE_WATER,
  crystallize_thunder: CRYSTALLIZE_THUNDER,
  crystallize_ice: CRYSTALLIZE_ICE,
};

/**
 * 查表：目标身上**已有附着** `existing`，**来袭**元素 `incoming` → 反应定义。
 *
 * 二十七种组合：九对双向元素（十八种）+ 风单向扩散五种 + 岩单向结晶四种。
 * 其余（含同元素、`physical`、以及风当「已有附着」那一侧的任意组合）一律 `undefined`
 * = 无反应。显式写分支而不是二维数组：组合就这么多，读起来一眼到底，
 * 且不必碰「稀疏数组」那类陷阱。
 *
 * ⚠️ 冻结 / 超载 / 超导 / 感电 / 绽放 / 激化 / 燃烧**两个方向共用同一个对象**（结果相同）。所以
 * `id` 相同、`name` 相同、`consumeRatio` 相同 —— 谁打谁不影响结果，只影响飘字的颜色
 * （颜色取的是**来袭元素**，那是表现层自己算的，与这张表无关）。
 *
 * ⚠️ 扩散和结晶为单向反应，分别按元素拆成 5 个、4 个 id。
 * 它的分支写在最后、单独一段 —— 别把它混进上面那串「成对」里，
 * 那会让下一个人以为风也有双向。
 *
 * ⚠️ 雷有关的**四条方向不对称地挂在不同元素上**：超载挂在「火↔雷」、超导挂在
 * 「冰↔雷」、感电挂在「水↔雷」、激化挂在「草↔雷」。加第五条雷反应时，
 * 这里是唯一的落点，别去动 `ELEMENTS` 的顺序。
 */
export function lookupReaction(
  existing: ElementId,
  incoming: ElementId
): ReactionDef | undefined {
  // 岩必须是来袭方；岩附着不会被其他元素反向结晶。
  if (incoming === "rock") {
    if (existing === "fire") return CRYSTALLIZE_FIRE;
    if (existing === "water") return CRYSTALLIZE_WATER;
    if (existing === "thunder") return CRYSTALLIZE_THUNDER;
    if (existing === "ice") return CRYSTALLIZE_ICE;
  }
  if (existing === "fire" && incoming === "water") {
    return VAPORIZE_WATER_ON_FIRE;
  }
  if (existing === "water" && incoming === "fire") {
    return VAPORIZE_FIRE_ON_WATER;
  }
  if (existing === "ice" && incoming === "fire") {
    return MELT_FIRE_ON_ICE;
  }
  if (existing === "fire" && incoming === "ice") {
    return MELT_ICE_ON_FIRE;
  }
  if (existing === "ice" && incoming === "water") {
    return FROZEN;
  }
  if (existing === "water" && incoming === "ice") {
    return FROZEN;
  }
  if (existing === "fire" && incoming === "thunder") {
    return OVERLOAD;
  }
  if (existing === "thunder" && incoming === "fire") {
    return OVERLOAD;
  }
  if (existing === "ice" && incoming === "thunder") {
    return SUPERCONDUCT;
  }
  if (existing === "thunder" && incoming === "ice") {
    return SUPERCONDUCT;
  }
  if (existing === "water" && incoming === "thunder") {
    return ELECTRO_CHARGED;
  }
  if (existing === "thunder" && incoming === "water") {
    return ELECTRO_CHARGED;
  }
  if (existing === "water" && incoming === "grass") {
    return BLOOM;
  }
  if (existing === "grass" && incoming === "water") {
    return BLOOM;
  }
  if (existing === "grass" && incoming === "thunder") {
    return QUICKEN;
  }
  if (existing === "thunder" && incoming === "grass") {
    return QUICKEN;
  }
  if (existing === "grass" && incoming === "fire") {
    return BURNING;
  }
  if (existing === "fire" && incoming === "grass") {
    return BURNING;
  }

  // ---- 扩散（风）----
  // ⚠️ **风必须是来袭的那一方**，所以判据写成 `incoming === "wind"` 而不是成对罗列。
  // 反过来（风附着 + 别的元素来袭）**故意没有反应** —— `todo §2.2.2` 说的是
  // 「风攻击接触目标身上的附着」，风自己不是被扩散的对象，它只会被下一个元素覆盖。
  // ⚠️ **岩不在列**（`todo §2.2.2`：风无法扩散岩元素），别顺手补上。
  if (incoming === "wind") {
    if (existing === "fire") {
      return SWIRL_FIRE;
    }
    if (existing === "water") {
      return SWIRL_WATER;
    }
    if (existing === "thunder") {
      return SWIRL_THUNDER;
    }
    if (existing === "ice") {
      return SWIRL_ICE;
    }
    if (existing === "grass") {
      return SWIRL_GRASS;
    }
  }
  return undefined;
}

/**
 * 元素精通 → 增幅反应的**加成系数**（照原神口径）。
 *
 * ```
 * bonus = 2.78 × EM / (EM + 1400)
 * 最终反应倍率 = ratio × (1 + bonus)
 * ```
 *
 * `EM = 0` → 返回 `1`（即不放大）。这是**加在 1 上的系数**，不是最终倍率 ——
 * 别把它直接当倍率用（`EM = 1000` 时它是 `2.1583`，配 2.0 的蒸发才是 `4.3167`）。
 */
export const EM_AMPLIFY_COEFF = 2.78;
export const EM_AMPLIFY_CONST = 1400;

export function emAmplify(mastery: number): number {
  if (mastery <= 0) {
    return 1;
  }
  return 1 + (EM_AMPLIFY_COEFF * mastery) / (mastery + EM_AMPLIFY_CONST);
}

/**
 * 元素精通 → **剧变**反应的加成系数（照原神口径）。
 *
 * ```
 * bonus = 16 × EM / (EM + 2000)
 * ```
 *
 * 与 `emAmplify` 是**两条曲线**，不是同一条的两种写法 —— 剧变系数大得多
 * （`EM = 200` 时 `2.4545` vs 增幅的 `1.3475`）。用错的那条不会崩，只是数值
 * 差两三倍，所以要问「这是增幅还是剧变」，而不是「要不要乘精通」。
 *
 * 消费者有**碎冰**（`FreezeShatterSystem`）与 `ReactionEffects.ts` 派发的三条雷反应。
 * 冻结本身不是伤害反应，但「冰被打碎」在原神里属剧变一侧，所以走这条。
 *
 * ⚠️ 碎冰**不是**用 `transformBase(等级)` 那一套 —— 它的基数取自「打碎冰那一击的
 * 实际扣血 × 0.5」（见 `FreezeShatterSystem` 文件头）。两套口径并存是**已知的**，
 * 记在 `todo_next.md` 里；别顺手把碎冰改过来，那要单独一轮。
 */
export const EM_TRANSFORM_COEFF = 16;
export const EM_TRANSFORM_CONST = 2000;

export function emTransform(mastery: number): number {
  if (mastery <= 0) {
    return 1;
  }
  return 1 + (EM_TRANSFORM_COEFF * mastery) / (mastery + EM_TRANSFORM_CONST);
}

/**
 * 剧变反应的**等级基数**：`1 级基数 + 每级增量 × (等级 − 1)`。
 *
 * 用户 2026-10-07 选的口径 —— 照 `todo §2.2.2` 原文「伤害只由**元素精通、
 * 触发者等级**决定」。于是剧变伤害与这一击多疼、攻击力多少**完全无关**：
 * 换个武器、叠一层火伤加成，超载的数字一动不动，只有升级和堆元素精通能让它变大。
 *
 * 想成「两个 1 级英雄互殴时超载该打多少」来定这两个数：
 *
 * | 等级 | 基数 | 超载(×2.0) | 超导(×0.5) | 感电每跳(×1.2) |
 * |---|---|---|---|---|
 * | 1 | 12 | 24 | 6 | 14.4 |
 * | 5 | 36 | 72 | 18 | 43.2 |
 * | 10 | 66 | 132 | 33 | 79.2 |
 *
 * ⚠️ 这是**首版数值**，集中在这两个常量里，进游戏看完再调。
 * 调的时候只需要记住：增幅反应的对照是「一发火弹 base 100 × 火伤加成」。
 */
export const TRANSFORM_BASE_LV1 = 12;
export const TRANSFORM_BASE_PER_LEVEL = 6;

/**
 * 等级 → 剧变反应的基数。**纯函数**，好钉断言。
 *
 * ⚠️ **等级 ≤ 0（或非整数）一律按 1 级**。`Actor.level` 走的是原生 `GetUnitLevel`，
 * 非英雄单位在很多情况下返回 0 —— 直接拿 0 去算会得出 `-6` 这个负数基数，
 * 一路乘下来的表现是「剧变反应给目标回血」，不报错、只是符号反了。
 */
export function transformBase(level: number): number {
  const lv = level < 1 ? 1 : Math.floor(level);
  return TRANSFORM_BASE_LV1 + TRANSFORM_BASE_PER_LEVEL * (lv - 1);
}

// ===========================================================================
// 激化的增伤幅度
// ===========================================================================

/**
 * 激化（草 + 雷）的增伤幅度**基数** —— `EM = 0` 时目标受到的雷 / 草伤害增加多少。
 *
 * 用户 2026-10-08 选的口径：**百分比倍率**（照 `todo §1.8` 原文「提升后续雷、草伤害
 * **倍率**」），而不是像剧变那样给一个独立伤害段。落地是目标身上的一条
 * `QuickenBuff`，往 `elemVulnStat("thunder")` / `elemVulnStat("grass")` 各挂一个
 * `FLAT` 来源，最终在 `dealRaw()` 里乘成 `×(1 + 幅度)`。
 *
 * ⚠️ **它读的是触发者的元素精通**（与原神口径一致，也与 `FreezeShatterSystem` /
 * `ReactionEffects` 读施法者 EM 一致），不是目标的。
 */
export const QUICKEN_VULN_BASE = 0.15;

/** 激化增伤幅度里**随精通增长**的那部分的上限（渐近值） */
export const QUICKEN_VULN_COEFF = 0.35;

/** 激化增伤幅度的**饱和常数**：越大越「耐堆」 */
export const QUICKEN_VULN_CONST = 1000;

/**
 * 元素精通 → 激化的增伤幅度。
 *
 * ```
 * vuln = 0.15 + 0.35 × EM / (EM + 1000)
 * ```
 *
 * | EM | 0 | 200 | 500 | 1000 | ∞ |
 * |---|---|---|---|---|---|
 * | vuln | **0.15** | 0.208 | 0.267 | **0.325** | 0.50（渐近） |
 *
 * 与 `emAmplify` / `emTransform` 并列的**第三条曲线**，别互相套用：那两条是「乘在
 * 伤害上的倍率」，这一条是「加在目标易伤上的比例」—— 形状相同、含义差一层。
 *
 * ⚠️ 返回值**恒 ≥ `QUICKEN_VULN_BASE`**（负数精通也退回基数），所以挂上去的
 * `QuickenBuff` 永远是个**纯增伤**，不会变成减伤 —— `elemVulnStat` 那一格在
 * `clampFinal` 里也是钳 `≥ 0` 的（两道保险）。
 *
 * ⚠️ 数值是**首版**，集中在这三个常量里，进游戏看完再调。
 */
export function quickenVuln(mastery: number): number {
  if (mastery <= 0) {
    return QUICKEN_VULN_BASE;
  }
  return QUICKEN_VULN_BASE + (QUICKEN_VULN_COEFF * mastery) / (mastery + QUICKEN_VULN_CONST);
}

/**
 * 冻结时长系数：**每消耗 1U 附着冻多少秒**。
 *
 * 用户 2026-10-07 选的口径 —— 冻结时长由**这次真正消耗掉的元素量**决定，
 * 而不是一个写死的秒数。于是附着衰减变得有意义：一条快衰减完的 0.6U 冰被水弹打中
 * 只能冻 1.5 秒，而刚挂上的 2U 冰能冻满 5 秒。
 *
 * ⚠️ 这里传进来的是 `consumeGauge()` 的返回值（**实际扣掉的量**，已按附着剩余量钳过），
 * 不是来袭元素量。传错了的表现是「打一条快没了的附着照样冻满 5 秒」。
 */
export const FROZEN_SECONDS_PER_GAUGE = 2.5;

/**
 * 冻结时长上限（秒）。**先于韧性**生效 —— 上限钳完才交给 `addFreezeBuff`。
 *
 * 8 秒对应 3.2U 附着。没有上限的话，将来出现 8U / 12U 的高附着攻击
 * （大招、元素爆发）会直接冻 20~30 秒，那已经不是控制而是处决了。
 */
export const FROZEN_MAX_SECONDS = 8;

/** 消耗 `consumed` U 附着能冻多少秒。纯函数，好钉断言 */
export function frozenSeconds(consumed: number): number {
  if (consumed <= 0) {
    return 0;
  }
  const seconds = consumed * FROZEN_SECONDS_PER_GAUGE;
  return seconds > FROZEN_MAX_SECONDS ? FROZEN_MAX_SECONDS : seconds;
}

/**
 * 燃烧时长系数：**每消耗 1U 草附着烧多少秒**。与 `FROZEN_SECONDS_PER_GAUGE` 完全对称。
 *
 * 用户 2026-10-09 选的口径 —— 燃烧时长由**这次真正消耗掉的草量**决定，
 * 而不是写死秒数。一条快衰减完的 0.6U 草被火弹点燃只能烧 1.5 秒（下限），
 * 刚挂上的 2U 草能烧满 4 秒。
 *
 * ⚠️ **是 `2.0` 不是 `0.5`** —— 别被「每 U 几秒」这个读法带偏去写分数：
 * 草弹挂 2U，要烧 4 秒 ⟹ 每 U 就是 2 秒。写 0.5 的话 2U 只有 1 秒，
 * 直接撞下限、跳数从 3 掉到 1，而**不报错**（`burningSeconds` 的钳位会把它救成 1.5）。
 *
 * ⚠️ 传进来的是 `consumeGauge()` 的返回值（**实际扣掉的量**），不是来袭元素量。
 */
export const BURNING_GAUGE_PER_SECOND = 2.0;

/**
 * 燃烧的**跳间隔**（秒）。放在这里而不是 `ReactionBuffs.ts`，是因为
 * `BURNING_MIN_SECONDS` 的约束是**对着它**定的，两者必须一起看（见下）。
 *
 * ⚠️ **它和 `BURNING.transformCoeff` 是一对**：调跳频就必须同步调每跳系数，
 * 否则总伤跟着变（用户 2026-10-10 的口径是「跳频可调、总伤不变」）。
 * 当前 0.6 秒 → 2U 草（4 秒）正好 **6 跳** → 每跳 0.5 → 总 3.0×。
 *
 * ⚠️ 别顺手改成更好看的 `0.5`：`BuffManager` 以固定 0.1s 累加 `elapsed`，
 * 而浮点下 `0.1` 累加十次是 `0.9999999999999999` —— 跨不过整秒，
 * 于是 0.5 的跳点会被打成 `0.5 / 1.1 / 1.6 / 2.1…`（**不规整**），
 * 而且 4 秒只剩 7 跳、每跳得写 `3/7` 这个丑数。0.6 则完全规整（`0.6 × k`）。
 */
export const BURNING_TICK_SECONDS = 0.6;

/**
 * 燃烧时长下限（秒）。⚠️ **必须大于一个跳间隔**（`BURNING_TICK_SECONDS`）。
 *
 * 时长短于一个间隔 ⟹ **一跳都跳不出来** ⟹「燃烧触发了、飘了字、目标掉血为零」，
 * 而所有查表断言全绿 —— 静默失效。
 *
 * 1.5 是 0.6 的 2.5 倍，留足余量：实测 `duration = 1.5` 跳 **2** 次。
 * 纯函数层有一条 `MIN > TICK` 的正面断言钉着这条约束。
 */
export const BURNING_MIN_SECONDS = 1.5;

/**
 * 燃烧时长上限（秒）。与 `FROZEN_MAX_SECONDS` 同一个理由 ——
 * 防止将来的高附着攻击点出几十秒的 DoT。
 *
 * 8 秒对应 4U 草，**常规对局摸不到**（草弹只挂 2U，4U 要靠将来的大招/元素爆发）。
 * 留这个上限是为了让「将来加高附着攻击」时不必回来补。
 */
export const BURNING_MAX_SECONDS = 8;

/**
 * 消耗 `consumed` U 草附着能烧多少秒。纯函数，好钉断言。
 *
 * 返回值**恒落在 `[BURNING_MIN_SECONDS, BURNING_MAX_SECONDS]`**（`consumed <= 0` 也返回下限）——
 * 与 `frozenSeconds()` 那个「0 就返回 0」不同：燃烧是**已经触发了**才调到这里，
 * 返回 0 等于「反应发生了但什么也没发生」，所以宁可给下限。
 *
 * ## ⚠️ 秒数**不等于**跳数 —— 实际跳数要按 `BURNING_TICK_SECONDS` 的浮点相位实测
 *
 * `BuffManager` 以固定 0.1s 累加 `elapsed`，而 buff 内部是
 * `nextTickAt = this.elapsed + 间隔`。浮点误差让跳点整体偏移，**没有干净的公式**。
 * 按 `BuffManager.tick` 逐行同构模拟出来的（间隔 0.6、每跳系数 0.5）：
 *
 * | 时长 | 跳数 | 总伤 | 对应草量 |
 * |---|---|---|---|
 * | 1.5（下限） | **2** | 1.0× | < 0.75U |
 * | 2.0 | 3 | 1.5× | 1U |
 * | 3.0 | 5 | 2.5× | 1.5U |
 * | **4.0** | **6** | **3.0×** | **2U（草弹，常规）** |
 * | 5.0 | 8 | 4.0× | 2.5U |
 * | 8.0（上限） | 12 | 6.0× | 4U |
 *
 * 跳点（4 秒那档）：`0.6 / 1.2 / 1.8 / 2.4 / 3.0 / 3.6` —— 完全规整。
 *
 * ⚠️ 改 `BURNING_TICK_SECONDS` 后**必须重跑这张表**，并同步改 `transformCoeff`
 * 让 2U 那一行仍等于 3.0×。
 */
export function burningSeconds(consumed: number): number {
  const seconds = consumed <= 0 ? 0 : consumed * BURNING_GAUGE_PER_SECOND;
  if (seconds < BURNING_MIN_SECONDS) {
    return BURNING_MIN_SECONDS;
  }
  return seconds > BURNING_MAX_SECONDS ? BURNING_MAX_SECONDS : seconds;
}

/**
 * 一次反应消耗掉多少附着量：`min(附着量, 来袭量 × 消耗比)`。
 *
 * 返回值**不会是负数**，也**不会超过附着量**（附着扣到 0 为止，多出来的来袭量不欠账）。
 * 调用方拿它去推进附着 buff 的 `elapsed`。
 */
export function consumeGauge(
  auraGauge: number,
  incomingGauge: number,
  consumeRatio: number
): number {
  const want = incomingGauge * consumeRatio;
  if (want < 0) {
    return 0;
  }
  return want > auraGauge ? auraGauge : want;
}

/**
 * 附着衰减速率（元素量 / 秒）。**线性**，锚点 `1U = 7.5 秒`。
 *
 * ⚠️ 原神的衰减**不是单一线性**（分段、高附着量衰减更快）。这里用线性是本作的
 * **自定口径**：4U 会撑到 30 秒，比原神长。改口径只动这一个常量 ——
 * 但改之前先想清楚 `ElementalAuraBuff` 的 `duration = gauge / 速率` 会跟着变。
 *
 * 时间基准是 `BuffSystem` 的 **0.1s 名义心跳**（`delta` 写死，不是真实经过时间），
 * 所以「7.5 秒」是名义值。见 `BuffSystem.ts:27`。
 */
export const AURA_DECAY_PER_SECOND = 1 / 7.5;

/**
 * 附着 CD（秒）。同一 `(攻击者, 元素)` 在这个窗口内**不重复附着**（但仍可触发反应）。
 *
 * 半原神：原神标准 ICD 是「3 次命中或 2.5 秒」，这里只取纯时间窗，且按
 * `(攻击者, 元素)` 计（跨目标共享）—— 比 `(攻击者, 受击者, 元素)` 更贴原神，
 * 表规模也被「活着的攻击者数」天然封顶。
 *
 * 时间基准是 `scheduler.elapsedSeconds`（0.05s 心跳），与附着衰减的 buff 时钟
 * **是两个域**，互不要求对齐（CD 只管「隔多久能再挂」，不参与衰减）。
 */
export const ATTACH_CD_SECONDS = 0.5;

/**
 * 施法元素载荷的有效期（秒）。技能声明元素后，若这么久内没有对应的伤害事件来认领，
 * 载荷作废 —— 防止一个没打出去的施法把元素留到下一次攻击上。
 *
 * 基准同 `ATTACH_CD_SECONDS`（`scheduler.elapsedSeconds`）。
 */
export const SPELL_ELEMENT_TTL_SECONDS = 3.0;
