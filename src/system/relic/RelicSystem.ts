import { Actor } from "../actor";
import { eventBus } from "../event/EventBus";
import { gameEvents } from "../event";
import { RelicPool } from "./RelicPool";
import { RelicRegistry } from "./RelicRegistry";
import { createLogger } from "src/utils/logger";
import { StatModifier, StatSourceKind, toStatModifier } from "../stat/types";
import { StatSystem } from "../stat/StatSystem";
import {
  RelicDefinition,
  RelicId,
  RelicInventoryItem,
  RelicPoolEntry,
} from "./types";

const log = createLogger("RelicSystem");

const EVENT_ADDED = "relic:added";
const EVENT_REMOVED = "relic:removed";
const EVENT_INVENTORY_CHANGED = "relic:inventoryChanged";

/**
 * 遗物挂属性修正器用的来源 key。与 `BuffManager` 的 `buff:<id>` 对称。
 *
 * key 用遗物 **id**（不是实例）—— 一个单位身上同一个遗物只有一条记录，
 * 层数体现在 `stacks` 里，所以不需要实例 id 区分。
 */
function relicStatSourceKey(relicId: RelicId): string {
  return `relic:${relicId}`;
}

interface InternalEntry {
  id: RelicId;
  stacks: number;
}

/**
 * 遗物运行时：注册表、命名池、单位库存
 */
export class RelicSystem {
  private static instance: RelicSystem | undefined;

  private readonly registry = new RelicRegistry();
  private readonly pools = new Map<string, RelicPool>();
  /** actorId (handle id) -> 有序遗物列表 */
  private readonly inventory = new Map<number, InternalEntry[]>();
  private deathCleanupBound = false;

  public static getInstance(): RelicSystem {
    if (!RelicSystem.instance) {
      RelicSystem.instance = new RelicSystem();
    }
    return RelicSystem.instance;
  }

  public registerDefinition(def: RelicDefinition): void {
    this.registry.register(def);
  }

  public registerDefinitions(defs: RelicDefinition[]): void {
    this.registry.registerAll(defs);
  }

  public registerPool(name: string, entries: RelicPoolEntry[]): void {
    this.pools.set(name, new RelicPool(entries));
  }

  public getPool(name: string): RelicPool | undefined {
    return this.pools.get(name);
  }

  /**
   * 仅从命名池随机抽取 id，不写入单位
   */
  public drawFromPool(poolName: string): RelicId | undefined {
    const pool = this.pools.get(poolName);
    if (!pool) {
      log.warn(`drawFromPool: pool not found: ${poolName}`);
      return undefined;
    }
    return pool.draw();
  }

  public getDefinition(id: RelicId): RelicDefinition | undefined {
    return this.registry.get(id);
  }

  /**
   * 为单位添加遗物；成功返回 true
   */
  public addRelic(
    target: Actor,
    id: RelicId,
    options?: { silent?: boolean }
  ): boolean {
    const def = this.registry.get(id);
    if (!def) {
      log.warn(`addRelic: unknown relic id: ${id}`);
      return false;
    }
    const uid = target.id;
    const maxStacks = def.maxStacks ?? 1;

    let list = this.inventory.get(uid);
    if (!list) {
      list = [];
      this.inventory.set(uid, list);
    }

    const existing = list.find((e) => e.id === id);
    if (existing) {
      if (existing.stacks >= maxStacks) {
        return false;
      }
      existing.stacks += 1;
      this.applyRelicStatMods(target, def, existing.stacks);
      if (def.onStack) {
        def.onStack(target, existing.stacks);
      }
      if (!options?.silent) {
        this.emitAdded(target, id, existing.stacks);
        this.emitInventoryChanged(target);
      }
      return true;
    }

    list.push({ id, stacks: 1 });
    // **顺序**：先挂属性（`applyRelicStatMods` 内部会同步冲刷），再 `onAcquire` ——
    // 让 `onAcquire` 里读到的属性已经含本遗物的加成。`burningBlood` 的
    // 「按新上限回等量血」就依赖这一点。
    this.applyRelicStatMods(target, def, 1);
    if (def.onAcquire) {
      def.onAcquire(target);
    }
    if (!options?.silent) {
      this.emitAdded(target, id, 1);
      this.emitInventoryChanged(target);
    }
    return true;
  }

  /**
   * 移除一层（或 all 时移除该 id 的全部层数）；条目清空时调用 onRemove
   */
  public removeRelic(
    target: Actor,
    id: RelicId,
    options?: { silent?: boolean; all?: boolean }
  ): boolean {
    const def = this.registry.get(id);
    if (!def) return false;

    const list = this.inventory.get(target.id);
    if (!list) return false;

    const idx = list.findIndex((e) => e.id === id);
    if (idx < 0) return false;

    const entry = list[idx];
    const removeAll = options?.all === true;
    const delta = removeAll ? entry.stacks : 1;

    entry.stacks -= delta;
    if (entry.stacks <= 0) {
      list.splice(idx, 1);
      // 摘掉属性来源后**手动冲刷一次**：`onRemove` 之后调用方可能立刻来读属性
      // （比如「卸下装备后重新计算面板」），等下一拍就会读到旧值。
      // `strip` 本身不冲刷，它也被 `clearUnit` 批量调用。
      this.stripRelicStatMods(target, def);
      if (def.onRemove) {
        def.onRemove(target, delta);
      }
      this.flushIfDirty(target);
    } else {
      // 只掉一层：按新层数整体重挂
      this.applyRelicStatMods(target, def, entry.stacks);
      if (def.onStack) {
        def.onStack(target, entry.stacks);
      }
    }

    if (!options?.silent) {
      this.emitRemoved(target, id, delta);
      this.emitInventoryChanged(target);
    }
    return true;
  }

  /** 清空单位所有遗物（死亡等） */
  public clearUnit(target: Actor, options?: { silent?: boolean }): void {
    const uid = target.id;
    const list = this.inventory.get(uid);
    if (!list || list.length === 0) return;

    const copy = [...list];
    this.inventory.delete(uid);

    for (const e of copy) {
      const def = this.registry.get(e.id);
      if (!def) continue;
      this.stripRelicStatMods(target, def);
      if (def.onRemove) {
        def.onRemove(target, e.stacks);
      }
    }
    // **这里刻意不冲刷**：`clearUnit` 的主要调用场景是死亡回收（`bindDeathCleanup`
    // 里紧跟着就 `actor.detach()`），对一具尸体写回属性没有意义，而且马上就要
    // `dispose()` 掉属性表。真需要立刻生效的调用方自己冲刷一次即可。

    if (!options?.silent) {
      for (const e of copy) {
        this.emitRemoved(target, e.id, e.stacks);
      }
      this.emitInventoryChanged(target);
    }
  }

  public getRelics(target: Actor): ReadonlyArray<RelicInventoryItem> {
    const list = this.inventory.get(target.id);
    if (!list) return [];
    return list.map((e) => ({ id: e.id, stacks: e.stacks }));
  }

  public hasRelic(target: Actor, id: RelicId): boolean {
    const list = this.inventory.get(target.id);
    return list !== undefined && list.some((e) => e.id === id);
  }

  /**
   * 单位死亡时清遗物并 detach Actor，避免 handle id 复用。
   * 由 registerDefaultRelicsAndPools 调用一次，避免 Actor ↔ RelicSystem 循环 import。
   */
  public bindDeathCleanup(): void {
    if (this.deathCleanupBound) {
      return;
    }
    this.deathCleanupBound = true;
    gameEvents.onUnitDeath((data) => {
      const actor = data.Actor;
      if (actor === undefined) {
        return;
      }
      this.clearUnit(actor);
      actor.detach();
    });
  }

  /**
   * 挂上遗物的属性修正器，**并立即冲刷一次**。
   *
   * 为什么不等 `StatSystem` 的下一拍：紧接着的 `onAcquire` / `onStack` 常常要读到
   * 含本遗物加成之后的属性值（`burningBlood` 就要按新上限回血）。遗物的获得是
   * 稀有路径（一局也就几十次），多这一拍同步写回的代价可以忽略。
   *
   * buff 那边**故意不这么做**（见 `BuffManager.applyStatMods`）—— buff 是高频路径，
   * 而且目前没有哪个 buff 的 `onApply` 要读属性。
   */
  private applyRelicStatMods(target: Actor, def: RelicDefinition, stacks: number): void {
    if (def.getStatModifiers === undefined) return;

    const key = relicStatSourceKey(def.id);
    const mods = def.getStatModifiers(target, stacks);

    if (mods.length === 0) {
      // 英雄 / 非英雄分支这类「这个单位不适用」的情况走了这里。
      // 仍然要 removeSource 而不是直接返回 —— 万一它是从「适用」变成「不适用」
      // （比如单位变了），旧来源得摘掉。
      if (target.hasStatSheet()) {
        target.statSheet.removeSource(key);
      }
      return;
    }

    const full: StatModifier[] = [];
    for (let i = 0; i < mods.length; i++) {
      const m = mods[i];
      if (m === undefined) continue;
      full.push(toStatModifier(m, StatSourceKind.RELIC, def.id));
    }

    // getter 会建表 —— 拿到一件加属性的遗物，就是第一次用得上属性表
    target.statSheet.setSource(key, full);
    StatSystem.getInstance().flushActor(target.statSheet);
  }

  /**
   * 摘掉某遗物留下的属性来源。**不冲刷** —— 调用方在批量摘完后统一冲刷一次，
   * 免得 `clearUnit()` 里摘 5 件遗物就写 5 遍原生。
   */
  private stripRelicStatMods(target: Actor, def: RelicDefinition): void {
    if (def.getStatModifiers === undefined) return;
    // 不碰 getter：没表就说明这件遗物从没挂过修正器
    if (!target.hasStatSheet()) return;
    target.statSheet.removeSource(relicStatSourceKey(def.id));
  }

  /** 把一批摘除的结果一次性写回原生。没表就没什么可冲的 */
  private flushIfDirty(target: Actor): void {
    if (!target.hasStatSheet()) return;
    StatSystem.getInstance().flushActor(target.statSheet);
  }

  private emitAdded(target: Actor, relicId: RelicId, stacks: number): void {
    eventBus.emit(EVENT_ADDED, { actor: target, relicId, stacks });
  }

  private emitRemoved(target: Actor, relicId: RelicId, stacks: number): void {
    eventBus.emit(EVENT_REMOVED, { actor: target, relicId, stacks });
  }

  private emitInventoryChanged(target: Actor): void {
    eventBus.emit(EVENT_INVENTORY_CHANGED, { actor: target });
  }
}

export const RELIC_EVENT_ADDED = EVENT_ADDED;
export const RELIC_EVENT_REMOVED = EVENT_REMOVED;
export const RELIC_EVENT_INVENTORY_CHANGED = EVENT_INVENTORY_CHANGED;
