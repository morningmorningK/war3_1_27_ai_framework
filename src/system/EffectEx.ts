import { Effect, Widget } from "@eiriksgata/wc3ts/*";

/**
 * Effect 的增强封装：
 * - 链式设置坐标/旋转/缩放
 * - 提供 fromHandle/createAttachment 的“类型升级”
 * - 维护一个轻量的实例注册表，便于调试与集中销毁
 */
export class EffectEx extends Effect {
  public static allEffects: Record<number, EffectEx> = {};

  private _destroyed = false;

  private static ensureFields(obj: EffectEx): void {
    const f = obj as unknown as Record<string, unknown>;
    if (f["_destroyed"] === undefined) f["_destroyed"] = false;
  }

  private static remember(obj: EffectEx): EffectEx {
    EffectEx.ensureFields(obj);
    EffectEx.allEffects[obj.id] = obj;
    return obj;
  }

  constructor(modelName: string, x: number, y: number);
  constructor(modelName: string, targetWidget: Widget, attachPointName: string);
  constructor(modelName: string, a: number | Widget, b: number | string) {
    // 统一走父类构造链，避免与 Effect 设计分叉
    if (typeof a === "number" && typeof b === "number") {
      super(modelName, a, b);
    } else {
      super(modelName, a as Widget, b as string);
    }
    EffectEx.remember(this);
  }

  public static create(
    modelName: string,
    x: number,
    y: number,
    z?: number
  ): EffectEx | undefined {
    const obj = new EffectEx(modelName, x, y);

    if (z !== undefined) {
      obj.setZ(z);
    }
    return obj;
  }

  public static createAttachment(
    modelName: string,
    targetWidget: Widget,
    attachPointName: string
  ): EffectEx | undefined {
    return new EffectEx(modelName, targetWidget, attachPointName);
  }

  public static fromHandle(handle: effect | undefined, z?: number): EffectEx | undefined {
    if (!handle) return undefined;
    const id = GetHandleId(handle);
    const existing = EffectEx.allEffects[id];
    if (existing !== undefined) return existing;

    const obj = EffectEx.getObject(handle) as EffectEx;
    if (!obj) return undefined;

    EffectEx.ensureFields(obj);
    Object.assign(obj, { handle });
    EffectEx.allEffects[id] = obj;

    if (z !== undefined) {
      obj.setZ(z);
    }
    return obj;
  }

  public static destroyAll(): void {
    for (const id in EffectEx.allEffects) {
      const fx = EffectEx.allEffects[id];
      if (fx !== undefined) fx.destroy();
    }
  }

  public get isDestroyed(): boolean {
    return this._destroyed;
  }

  public setXY(x: number, y: number): this {
    EXSetEffectXY(this.handle, x, y);
    return this;
  }

  public setZ(z: number): this {
    EXSetEffectZ(this.handle, z);
    return this;
  }

  public setXYZ(x: number, y: number, z: number): this {
    EXSetEffectXY(this.handle, x, y);
    EXSetEffectZ(this.handle, z);
    return this;
  }

  public moveBy(dx: number, dy: number, dz: number = 0): this {
    EXSetEffectXY(this.handle, this.x + dx, this.y + dy);
    if (dz !== 0) {
      EXSetEffectZ(this.handle, this.z + dz);
    }
    return this;
  }

  public setUniformScale(scale: number): this {
    EXSetEffectSize(this.handle, scale);
    return this;
  }

  public setSpeed(speed: number): this {
    EXSetEffectSpeed(this.handle, speed);
    return this;
  }

  public rotateX(angleDeg: number): this {
    EXEffectMatRotateX(this.handle, angleDeg);
    return this;
  }

  public rotateY(angleDeg: number): this {
    EXEffectMatRotateY(this.handle, angleDeg);
    return this;
  }

  public rotateZ(angleDeg: number): this {
    EXEffectMatRotateZ(this.handle, angleDeg);
    return this;
  }

  /**
   * 设置绝对面向（弧度）。
   * 通过 JAPI 矩阵实现，不依赖 BlzSetSpecialEffectYaw（兼容 1.27a）。
   */
  public faceByRadians(yawRad: number): this {
    EXEffectMatReset(this.handle);
    EXEffectMatRotateZ(this.handle, (yawRad * 180) / math.pi);
    return this;
  }

  public scaleXYZ(x: number, y: number, z: number): this {
    EXEffectMatScale(this.handle, x, y, z);
    return this;
  }

  public resetMatrix(): this {
    EXEffectMatReset(this.handle);
    return this;
  }

  public destroy(): void {
    if (this._destroyed) return;
    this._destroyed = true;
    delete EffectEx.allEffects[this.id];
    super.destroy();
  }
}

