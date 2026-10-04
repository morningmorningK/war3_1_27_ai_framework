/** @noSelfInFile */

/** WC3 对象句柄，或 KKWE Frame 整数句柄 */
export type HandleValue = handle | number;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const objectMap: WeakMap<handle, any> = new WeakMap<handle, any>();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const numberMap: Map<number, any> = new Map<number, any>();

export class Handle<T extends HandleValue> {
  public readonly handle: T;

  private static initHandle: HandleValue | undefined;

  protected constructor(handle?: T) {
    this.handle = handle === undefined ? (Handle.initHandle as T) : handle;
    Handle.store(this.handle, this);
  }

  /**
   * Get the unique ID of the handle. The ID is recycled once you destroy the object.
   * Frame 句柄本身就是 integer，直接返回。
   * @returns The unique ID of a handle object.
   */
  public get id() {
    const raw = this.handle;
    if (typeof raw === "number") {
      return raw;
    }
    return GetHandleId(raw as handle);
  }

  protected static initFromHandle(): boolean {
    return Handle.initHandle !== undefined;
  }

  protected static store(rawHandle: HandleValue, obj: unknown): void {
    if (typeof rawHandle === "number") {
      numberMap.set(rawHandle, obj);
    } else {
      objectMap.set(rawHandle, obj);
    }
  }

  protected static release(rawHandle: HandleValue): void {
    if (typeof rawHandle === "number") {
      numberMap.delete(rawHandle);
    } else {
      objectMap.delete(rawHandle);
    }
  }

  /** 从句柄缓存中移除当前包装对象（Frame 整数句柄不会被 WeakMap 回收） */
  protected uncache(): void {
    Handle.release(this.handle);
  }

  protected static getObject(rawHandle: HandleValue) {
    const obj =
      typeof rawHandle === "number" ? numberMap.get(rawHandle) : objectMap.get(rawHandle);
    if (obj !== undefined) {
      return obj;
    }
    Handle.initHandle = rawHandle;
    const newObj = new this();
    Handle.initHandle = undefined;
    return newObj;
  }
}
