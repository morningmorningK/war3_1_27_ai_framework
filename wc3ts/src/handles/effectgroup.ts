/** @noSelfInFile */

/// <reference path="../types/japi.d.ts" />

import { Handle } from "./handle";
import { Effect } from "./effect";
import { Rectangle } from "./rect";

export class EffectGroup extends Handle<dzeffectgroup> {
  /**
   * @deprecated use `EffectGroup.create` instead.
   */
  constructor() {
    if (Handle.initFromHandle()) {
      super();
      return;
    }
    const handle = DzEffectGroupCreate();
    if (handle === undefined) {
      Error("w3ts failed to create dzeffectgroup handle.");
    }
    super(handle);
  }

  public static create(): EffectGroup | undefined {
    const handle = DzEffectGroupCreate();
    if (handle != null) {
      const obj = this.getObject(handle) as EffectGroup;
      const values: Record<string, unknown> = {};
      values.handle = handle;
      return Object.assign(obj, values);
    }
    return undefined;
  }

  public static createEnumRange(x: number, y: number, range: number): EffectGroup | undefined {
    const group = this.create();
    if (group === undefined) {
      return undefined;
    }
    group.enumRange(x, y, range, false, false);
    return group;
  }

  public static createEnumRect(whichRect: Rectangle): EffectGroup | undefined {
    const group = this.create();
    if (group === undefined) {
      return undefined;
    }
    group.enumRect(whichRect, false, false);
    return group;
  }

  public get size(): number {
    return DzEffectGroupGetSize(this.handle);
  }

  /**
   * 获取第 N 个特效。KKWE 约定从 1 开始。
   */
  public at(index: number): Effect | undefined {
    return Effect.fromHandle(DzEffectGroupAt(this.handle, index));
  }

  public clear(): number {
    return DzEffectGroupClear(this.handle);
  }

  public add(whichEffect: Effect, allowDuplicate = false): number {
    return DzEffectGroupAdd(this.handle, whichEffect.handle, allowDuplicate);
  }

  public remove(whichEffect: Effect, firstOnly = true): boolean {
    return DzEffectGroupRemove(this.handle, whichEffect.handle, firstOnly);
  }

  public contains(whichEffect: Effect): boolean {
    return DzEffectGroupContains(this.handle, whichEffect.handle);
  }

  public enumRange(
    x: number,
    y: number,
    range: number,
    clear = false,
    allowDuplicate = false
  ): number {
    return DzEffectGroupEnumRange(this.handle, x, y, range, clear, allowDuplicate);
  }

  public enumRect(whichRect: Rectangle, clear = false, allowDuplicate = false): number {
    return DzEffectGroupEnumRect(this.handle, whichRect.handle, clear, allowDuplicate);
  }

  public destroy(): boolean {
    return DzEffectGroupDestroy(this.handle);
  }

  public for(callback: () => void): number {
    return DzForEffectGroup(this.handle, callback);
  }

  public getEffects(): Effect[] {
    const effects: Effect[] = [];
    const n = this.size;
    for (let i = 1; i <= n; i++) {
      const e = this.at(i);
      if (e !== undefined) {
        effects.push(e);
      }
    }
    return effects;
  }

  public static fromHandle(handle: dzeffectgroup | undefined): EffectGroup | undefined {
    return handle !== undefined ? this.getObject(handle) : undefined;
  }

  public static fromHandleId(handleId: number): EffectGroup | undefined {
    return this.fromHandle(DzHandle2EffectGroup(handleId));
  }

  public static getEnumEffect(): Effect | undefined {
    return Effect.fromHandle(DzGetEnumEffect());
  }
}
