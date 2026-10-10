/**
 * 物品 ↔ 遗物 桥 —— 把「地图上的一件真魔兽物品」接到 `RelicSystem` 的库存上。
 *
 * ## 为什么需要这一层
 *
 * `RelicSystem.addRelic` 全仓只有两个调用方，且都是测试（`RelicSystemTestExample`
 * 是死代码、`StatSystemTestExample` 只在 debug 跑）—— **生产代码里没有任何发放入口**。
 * 于是「英雄携带某件物品 → 获得某个遗物效果」这条链路在阶段 B 之前根本不存在。
 *
 * 本文件补的就是这段：原生拾取/丢弃事件 → 查 rawcode 表 → 增删遗物层数。
 *
 * ## 为什么触发器建在这里，而不是 `GameEvent.ts`
 *
 * `GameEvent.ts` 的那套是**共享基础设施**（`UnitDamageEventData` 是护盾、飘字、
 * 伤害管线三方共同的契约），动它要同时考虑所有既有订阅者。本模块是**自成一体**的
 * 一件功能，触发器自建、自己持有，改坏了只影响物品这一条链路。
 * 唯一复用的是一个纯登记循环 `registerAnyUnitEvent`（已导出），那不算改派发语义。
 *
 * ## 一层遗物 = 一件实物
 *
 * **丢弃摘一层，不是摘光。** 背包里两件余烬就是两层，丢一件只该掉一层。
 * 用 `removeRelic(target, id)` 的默认行为（掉一层），**不要**传 `{ all: true }` ——
 * 那会在「手持 3 件只丢 1 件」时把三层一口气清零，物品还在身上、加成却没了。
 */

// ⚠️ 这两个常量**不是**环境全局，必须从 `define` 模块显式导入 ——
// 只写 `EVENT_PLAYER_UNIT_PICKUP_ITEM()` 会报 TS2304（同 `GameEvent.ts` 的写法）
import {
  EVENT_PLAYER_UNIT_DROP_ITEM,
  EVENT_PLAYER_UNIT_PICKUP_ITEM,
} from "@eiriksgata/wc3ts/src/globals/define";
import { Actor } from "src/system/actor";
import { registerAnyUnitEvent } from "src/system/event/GameEvent";
import { RelicSystem } from "src/system/relic/RelicSystem";
import type { RelicId } from "src/system/relic/types";
import { FourCC } from "src/utils/helper";
import { createLogger } from "src/utils/logger";

const log = createLogger("ItemRelicBridge");

/**
 * 一条物品 → 遗物的绑定。
 *
 * `itemTypeId` 存的是 **`FourCC` 整数**，不是四位字符串 ——
 * `GetItemTypeId()` 本来就返回整数，存字符串就得在每次拾取时做一次
 * 「整数 → 字符 → 比较」，白白多两个出错面。
 */
interface ItemRelicBinding {
  itemTypeId: number;
  relicId: RelicId;
  /** 只用于日志，不参与判定 */
  label: string;
}

/**
 * 绑定表。**用字面量数组一次性建出来**（密集、无洞）——
 * 事后按下标写、留 `undefined` 的数组在 Lua 里 `.length` 是 0，遍历会整段静默失效
 * （见记忆 `wc3-tstl-sparse-array-length`）。
 *
 * rawcode 与 `maps/table/item.ini` 的段名必须逐字一致。
 */
const BINDINGS: ItemRelicBinding[] = [
  { itemTypeId: FourCC("I000"), relicId: "elemental_ember", label: "余烬" },
  { itemTypeId: FourCC("I002"), relicId: "time_hourglass", label: "时之沙漏" },
  { itemTypeId: FourCC("I003"), relicId: "shield_amulet", label: "守护护符" },
  { itemTypeId: FourCC("I004"), relicId: "tenacity_charm", label: "坚定护符" },
  { itemTypeId: FourCC("I005"), relicId: "haste_glove", label: "加速手套" },
  { itemTypeId: FourCC("I006"), relicId: "arcane_codex", label: "元素秘典" },
];

let bound = false;

/**
 * 注册拾取/丢弃触发器。**幂等** —— 热重载会重复调 `initialize()`，
 * 不守的话同一个事件上会挂两遍动作，一件物品进背包加两层。
 */
export function initItemRelicBridge(): void {
  if (bound) {
    return;
  }
  bound = true;

  const pickupTrig = CreateTrigger();
  registerAnyUnitEvent(pickupTrig, EVENT_PLAYER_UNIT_PICKUP_ITEM());
  TriggerAddAction(pickupTrig, () => ItemRelicBridge_onPickup());

  const dropTrig = CreateTrigger();
  registerAnyUnitEvent(dropTrig, EVENT_PLAYER_UNIT_DROP_ITEM());
  TriggerAddAction(dropTrig, () => ItemRelicBridge_onDrop());

  log.info("物品↔遗物桥已注册，绑定 " + BINDINGS.length + " 件");
}

/** 按物品 rawcode 查遗物 id。查不到返回 undefined（**不是报错** —— 地图上绝大多数物品都不绑遗物） */
function ItemRelicBridge_relicOf(item: item): ItemRelicBinding | undefined {
  if (item === undefined) {
    return undefined;
  }
  const typeId = GetItemTypeId(item);
  for (let i = 0; i < BINDINGS.length; i++) {
    const b = BINDINGS[i];
    if (b !== undefined && b.itemTypeId === typeId) {
      return b;
    }
  }
  return undefined;
}

/**
 * 拾取。
 *
 * `GetTriggerUnit()` = 捡起物品的单位；`GetManipulatedItem()` = 被捡的那件。
 * 单位可能不在 `Actor` 表里（地图预设的单位若没走过 `Actor.create` 就不在），
 * 那时 `fromHandle` 给 undefined，**直接放过**而不是报错。
 */
function ItemRelicBridge_onPickup(): void {
  const binding = ItemRelicBridge_relicOf(GetManipulatedItem());
  if (binding === undefined) {
    return;
  }
  const actor = Actor.fromHandle(GetTriggerUnit());
  if (actor === undefined) {
    log.warn("拾取了「" + binding.label + "」，但拾取者不在 Actor 表里，跳过");
    return;
  }
  const ok = RelicSystem.getInstance().addRelic(actor, binding.relicId);
  log.info("拾取 " + binding.label + "（" + binding.relicId + "）→ addRelic=" + String(ok));
}

/**
 * 丢弃 / 掉落。**摘一层**，理由见文件头。
 *
 * ⚠️ 死亡时物品也会被打落，本回调会跟着跑一遍。那没关系：
 * `elementalEmber` 没有 `getStatModifiers`，`stripRelicStatMods` 与 `flushIfDirty`
 * 都靠 `hasStatSheet()` 提前返回，整条路不碰属性表 —— 就算 `bindDeathCleanup`
 * 已经先 `detach()` 过，也不会在死句柄上重建表（风险 #11）。
 */
function ItemRelicBridge_onDrop(): void {
  const binding = ItemRelicBridge_relicOf(GetManipulatedItem());
  if (binding === undefined) {
    return;
  }
  const actor = Actor.fromHandle(GetTriggerUnit());
  if (actor === undefined) {
    return;
  }
  const ok = RelicSystem.getInstance().removeRelic(actor, binding.relicId);
  log.info("丢弃 " + binding.label + "（" + binding.relicId + "）→ removeRelic=" + String(ok));
}
