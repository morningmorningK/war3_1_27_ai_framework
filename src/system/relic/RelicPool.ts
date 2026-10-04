import { RelicId, RelicPoolEntry } from "./types";

/**
 * 权重随机遗物池（单次 draw 返回一个 id）
 */
export class RelicPool {
  private entries: RelicPoolEntry[];

  constructor(entries: RelicPoolEntry[]) {
    this.entries = entries.filter((e) => e.weight > 0);
  }

  public setEntries(entries: RelicPoolEntry[]): void {
    this.entries = entries.filter((e) => e.weight > 0);
  }

  /**
   * 从池中按权重随机抽取一个遗物 id；池为空时返回 undefined
   */
  public draw(): RelicId | undefined {
    if (this.entries.length === 0) return undefined;
    let total = 0;
    for (const e of this.entries) {
      total += e.weight;
    }
    if (total <= 0) return undefined;
    let r = GetRandomReal(0, total);
    for (const e of this.entries) {
      r -= e.weight;
      if (r <= 0) return e.id;
    }
    return this.entries[this.entries.length - 1].id;
  }
}
