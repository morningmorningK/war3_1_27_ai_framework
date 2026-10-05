/**
 * 属性系统的**唯一冲刷器**。
 *
 * ## 为什么需要它
 *
 * `StatSheet` 只负责「算」，不负责「什么时候把算出来的值变成看得见的效果」。
 * 把值写回魔兽原生（`SetUnitState` 那几个）是**有副作用的操作**，而且很贵 ——
 * 一次穿 6 件装备会在同一帧产生几十次 `setSource`，每次都写回原生是浪费。
 *
 * 所以：`setSource` 只标脏，这里按 0.1s 一拍**批量冲刷**。
 *
 * | 角色 | 职责 |
 * |---|---|
 * | `StatSheet` | 持有 base + sources，惰性算 final，`flush()` 时写回 + 发事件 |
 * | `StatSystem` | 维护**脏集合**，定时把脏的 sheet 逐个 `flush()` |
 *
 * ## 为什么用脏集合而不是遍历全部单位
 *
 * `BuffSystem` 那种每拍遍历 `Actor.allActors` 的写法在这里不合适 —— 属性变化是
 * 低频事件（捡装备、上 buff），而全地图单位每 0.1s 全量重算是纯浪费。
 * 只处理**这一拍里真的被改过的**。
 *
 * ## 为什么不用 `FrameLoop.onFrame`
 *
 * 项目铁律：`onFrame` 不能注销，且禁止在帧回调里改 frame 树。属性写回会连带
 * 触发血条等 UI 重绘，放帧回调里会撞上这条。0.1s 的 `Timer` 没有这个问题，
 * 也和 `BuffSystem` 的节拍对齐（buff 到期摘属性 → 下一拍属性写回，最多差 0.1s）。
 */

import { Timer } from "@eiriksgata/wc3ts/*";
import type { StatSheet } from "./StatSheet";

/** 冲刷间隔。与 `BuffSystem.TICK_INTERVAL` 一致 —— 两边错开半拍反而会让延迟翻倍 */
const FLUSH_INTERVAL = 0.1;

export class StatSystem {
  private static instance: StatSystem;

  private timer: Timer | null = null;

  /**
   * 脏集合。key 是 `host.id`（魔兽 handle id），value 是那张 sheet。
   *
   * 用 `Map` 而不是数组：同一个单位在一拍里被标脏几十次，`Map.set` 天然去重；
   * 数组就得自己 `indexOf` 一遍。
   */
  private dirty: Map<number, StatSheet>;

  private constructor() {
    this.dirty = new Map<number, StatSheet>();
  }

  public static getInstance(): StatSystem {
    if (!StatSystem.instance) {
      StatSystem.instance = new StatSystem();
    }
    return StatSystem.instance;
  }

  public init(): void {
    if (this.timer !== null) return;
    this.timer = Timer.create();
    this.timer.start(FLUSH_INTERVAL, true, () => {
      this.flushAll();
    });
  }

  /**
   * 把一张 sheet 标脏，等下一拍冲刷。由 `StatSheet.markDirty()` 调用。
   *
   * **没有 `handle` 的宿主直接跳过** —— 冲刷的全部意义就是把值写回原生，
   * 没有原生可写的就没什么可冲的。这一条同时挡住了自测里那些假宿主，
   * 免得它们常驻在定时器的集合里。
   */
  public markDirty(sheet: StatSheet): void {
    if (sheet.isDisposed()) return;
    if (sheet.host.handle === undefined) return;
    this.dirty.set(sheet.host.id, sheet);
  }

  /** 从脏集合里摘掉。由 `StatSheet.dispose()` 调用 —— 死亡单位不该再被冲刷碰到悬垂句柄 */
  public unmarkDirty(sheet: StatSheet): void {
    this.dirty.delete(sheet.host.id);
  }

  /**
   * 立刻冲刷一张 sheet，不等下一拍。
   *
   * 给**稀有路径**用：捡圣遗物时 `onAcquire` 要读到的「已有属性」必须已经包含
   * 这件遗物自己的加成，否则拿到「+100 生命上限，并回复等量生命」会按旧上限算。
   * 每 0.1s 一次的普通路径仍然走定时器。
   */
  public flushActor(sheet: StatSheet): void {
    this.dirty.delete(sheet.host.id);
    sheet.flush();
  }

  /**
   * 冲刷脏集合里的全部 sheet。
   *
   * **先把 key 抄一份再遍历**，不直接 `forEach` 边遍历边删：`flush()` 会发
   * `STAT_EVENT_CHANGED`，回调里若又改了属性，会重新 `markDirty` 进同一个 Map。
   * 抄本 + 逐个 delete 的写法让「本拍产生的修改」落到下一拍，语义清楚。
   */
  private flushAll(): void {
    const keys: number[] = [];
    this.dirty.forEach((_sheet, id) => {
      keys.push(id);
    });

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      if (key === undefined) continue;
      const sheet = this.dirty.get(key);
      this.dirty.delete(key);
      if (sheet !== undefined) sheet.flush();
    }
  }
}
