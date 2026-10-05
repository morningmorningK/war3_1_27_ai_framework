/**
 * 伤害结算链路的常量与取色。
 *
 * 元素本身**不在这里定义** —— 那是 `src/system/stat/types.ts` 的 `ELEMENTS` / `ElementId`，
 * 属性表（伤害加成 / 抗性两块）就是按那套下标排的。这里只引它，不再抄一份表。
 */

import { ElementId, elementIndex } from "src/system/stat";

/**
 * 接管层的订阅优先级。**必须是全场最大的那个**。
 *
 * 派发按优先级从高到低（`GameEvent.ts:6`）。这一层要做的是
 * 「读原生元数据 → 置 0 → 自算 → 写回最终值」，是一次**覆盖**而不是叠加，
 * 所以必须跑在所有人之前：
 *
 * | 层 | 优先级 | 读到什么 |
 * |---|---|---|
 * | **DamagePipeline** | **100** | 原生命中值 → 抹掉 → 写回自算值 |
 * | `ShieldSystem` | 10 | 我们算完的值，扣盾 |
 * | `DamageNumberDisplay` | 0 | 扣完盾之后的真实扣血 |
 *
 * 写回**不能**拆到比 10 更低的一层去 —— 那样护盾会吸原生裸伤害、飘字会飘错数。
 */
export const DAMAGE_PIPELINE_PRIORITY = 100;

/**
 * `EXGetEventDamageData(4)` 报「物理」时返回的**原始索引**。
 *
 * 值是 4，不是 `ConvertDamageType(4)` 那个 handle —— 实测该函数回传的是索引本身
 * （传 `DAMAGE_TYPE_NORMAL()` 进去，(4) 槽位读回来就是 `4`）。
 *
 * ⚠️ **判物理只能用这个，不能用 `(1) IS_PHYSICAL`** —— 后者在平A 时也返回 0，
 * 实测不可信。依据见 memory `wc3-damage-event-semantics`。
 *
 * ⚠️ 顺带记一条反直觉的实测：**只有索引 4 会走护甲减伤**，
 * `ConvertDamageType(0..26)` 里其余 26 个打高甲靶都是满额。
 */
export const DAMAGE_TYPE_NORMAL_INDEX = 4;

/**
 * 元素 → 6 位大写十六进制色码。**数组紧凑排布**，下标用 `elementIndex()` 取，
 * 顺序严格跟 `ELEMENTS` 对齐（physical, fire, water, thunder, ice, wind, rock, grass）。
 *
 * 用数组而不是 `Record<string, string>`：`elementIndex` 本来就返回数字，
 * 且数组是**密集 push 出来**的，不会踩到「带洞数组在 Lua 里 `.length` 为 0」那个坑
 * （memory `wc3-tstl-sparse-array-length`）。
 *
 * ## 取色依据的是**玩家指定的口径**，不是「像那个元素」的审美
 *
 * | 元素 | 口径 | 取色 |
 * |---|---|---|
 * | 物理 | 白色 | `FFFFFF` |
 * | 火 | 红色 | `FF4444` |
 * | 水 | 蓝色 | `3399FF` |
 * | 雷 | 紫色 | `B366FF` |
 * | 冰 | 浅青 / 冰蓝 | `99E6FF` |
 * | 风 | 淡绿 | `AAFFCC` |
 * | 岩 | 土黄 | `D9A93F` |
 * | 草 | 翠绿 | `3FD93F` |
 *
 * **物理是白色 —— 所以「谁打的」不再靠颜色表达。** 早期版本让物理段借
 * 「出=红 / 受=黄」那套，与这张表冲突，已按这张表统一。
 *
 * 三种绿（风 / 草 / 治疗）刻意拉开亮度与饱和度：风偏青的淡绿、草是高饱和翠绿、
 * 治疗是柔和的浅绿（且有 `+` 前缀再兜一层）。**改其中任何一个都要连着看另外两个。**
 */
const ELEMENT_COLORS: string[] = [
  "FFFFFF", // physical  白
  "FF4444", // fire      红
  "3399FF", // water     蓝
  "B366FF", // thunder   紫
  "99E6FF", // ice       浅青
  "AAFFCC", // wind      淡绿
  "D9A93F", // rock      土黄
  "3FD93F", // grass     翠绿
];

/**
 * 治疗数字：**浅绿**，且显示时前面带 `+`。
 *
 * ⚠️ 目前**没有任何地方发治疗飘字** —— `GameEventType` 里没有 heal 事件，
 * 1.27a 也没有原生的「单位被治疗」事件。这个常量是给将来那个发事件的地方用的。
 */
export const HEAL_COLOR = "88FF88";

/**
 * 护盾吸收值：**浅灰**，显示时**用括号括起来**（形如 `(20)`）。
 *
 * 括号是调用方（`DamageNumberDisplay`）加的，**不是这个常量的一部分** ——
 * 这里只管颜色。分开的理由：将来若有别的地方也要报护盾吸收（比如战斗日志），
 * 那里多半不该带括号。括号之所以必需，见 `DamageNumberDisplay` 里 `showShield` 那段。
 *
 * ⚠️ **这个色现在是「兜底」而不是「唯一」**：破盾那一下（盾吸一部分 + 剩下的真打到血）
 * 护盾数会改跟伤害同色，只有**全额吸收**——屏幕上没有伤害数字可跟——才用这个浅灰。
 * 见 `DamageNumberDisplay.onUnitDamaged` 里的 `shieldHex`。
 *
 * ⚠️ 与 `HEAL_COLOR` 不同，这个常量**已经有真实消费者**了：吸收量由
 * `ctx.finalDamage − data.damage` 在飘字层直接算出来，不需要 `ShieldSystem` 往外报数。
 */
export const SHIELD_COLOR = "C8C8C8";

export function elementColor(e: ElementId): string {
  const c = ELEMENT_COLORS[elementIndex(e)];
  return c === undefined ? "FFFFFF" : c;
}

/**
 * 富文本上色。**全仓零处 `DzFrameSetTextColor`** —— 颜色一律走 `|cffRRGGBB…|r`，
 * 理由是那个原生接口的编码没人验证过（多处注释明写「别用，编码未知」）。
 *
 * 色码必须 **6 位大写十六进制**，`|cff` 是 8 位格式里的前两位 alpha（固定 ff）。
 */
export function colorize(text: string, hex: string): string {
  return "|cff" + hex + text + "|r";
}
