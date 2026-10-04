/**
 * Buff 展示用元数据（名称、图标、描述），按 key 注册；
 * key 可为 typeId，也可为自定义 displayKey。未知类型有占位。
 */

import { Buff } from "./Buff";
import { ShieldBuff } from "./ShieldBuff";
import { BuffTypeId } from "./types";

export interface BuffDisplayDefinition {
  name: string;
  description: string;
  icon: string;
}

const FALLBACK_ICON =
  "ReplaceableTextures\\CommandButtons\\BTNSelectHeroOn.blp";

const registry = new Map<string, BuffDisplayDefinition>();

const DEFAULT_UNKNOWN: BuffDisplayDefinition = {
  name: "未知 Buff",
  description: "",
  icon: FALLBACK_ICON,
};

export function registerBuffDisplay(
  key: string,
  def: BuffDisplayDefinition
): void {
  registry.set(key, def);
}

/** 注册内置类型（护盾等）；可多次调用，后写覆盖 */
export function registerDefaultBuffDisplays(): void {
  registerBuffDisplay(BuffTypeId.SHIELD, {
    name: "护盾",
    description: "吸收一定伤害；护盾耗尽或持续时间结束时移除。",
    icon: "ReplaceableTextures\\CommandButtons\\BTNSpell_ShieldWall.blp",
  });
}

export function getBuffDisplay(key: string): BuffDisplayDefinition {
  return registry.get(key) ?? DEFAULT_UNKNOWN;
}

/** 查找顺序：displayKey > typeId；未知时用 displayKey/typeId 作为标题 */
export function resolveBuffDisplay(buff: Buff): BuffDisplayDefinition {
  const key = buff.displayKey ?? buff.typeId;
  const base = registry.get(key) ?? registry.get(buff.typeId);
  if (base) return base;
  return { ...DEFAULT_UNKNOWN, name: key };
}

/** 剩余秒数；永久 Buff 为 null */
export function getRemainingSeconds(buff: Buff): number | null {
  if (buff.duration < 0) return null;
  return Math.max(0, buff.duration - buff.elapsed);
}

/**
 * 图标暗幕进度 0~1：0 = 刚挂上（图标全亮），1 = 到期（图标全暗）。
 * 永久 Buff 恒为 0 —— 没有倒计时，也就没有暗幕（todo.md「常驻类Buff无倒计时」）。
 *
 * 判 `<= 0` 而不是 `< 0`：`duration === 0` 是「挂上即到期」，拿它做除数会得到
 * `Infinity` / `NaN`，那种 buff 一律当无暗幕处理。
 */
export function getBuffTimeProgress(buff: Buff): number {
  if (buff.duration <= 0) return 0;
  const p = buff.elapsed / buff.duration;
  return p > 1 ? 1 : p < 0 ? 0 : p;
}

/**
 * 槽位角标：简短剩余时间。
 *
 * **常驻 Buff 返回空串**（而不是 "∞"）—— todo.md 「永久、常驻类 Buff 隐藏时间数字」。
 * 是否永久由 Tooltip 去说（`buildBuffTooltipText` 里仍然写"永久"），图标上只留图标与层数。
 */
export function formatSlotTimeShort(buff: Buff): string {
  if (buff.duration < 0) return "";
  const r = getRemainingSeconds(buff)!;
  if (r >= 100) return `${math.floor(r)}`;
  if (r >= 10) return `${math.floor(r)}`;
  return `${r.toFixed(1)}`;
}

/** Tips 正文：名称、描述、剩余时间、护盾数值 */
export function buildBuffTooltipText(buff: Buff): string {
  const d = resolveBuffDisplay(buff);
  let t = `${d.name}\n\n${d.description}`;
  const rem = getRemainingSeconds(buff);
  if (rem !== null) {
    t += `\n\n剩余时间：${rem.toFixed(1)} 秒`;
  } else {
    t += `\n\n剩余时间：永久`;
  }
  if (buff instanceof ShieldBuff) {
    t += `\n护盾：${math.floor(buff.current)} / ${math.floor(buff.max)}`;
  }
  return t;
}
