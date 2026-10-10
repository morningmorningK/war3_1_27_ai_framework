/**
 * Buff 展示用元数据（名称、图标、描述），按 key 注册；
 * key 可为 typeId，也可为自定义 displayKey。未知类型有占位。
 */

import { Buff } from "./Buff";
import { FreezeBuff } from "./FreezeBuff";
import { ShieldBuff, ElementalShieldBuff, CRYSTAL_SAME_ELEMENT_EFFICIENCY } from "./ShieldBuff";
import { elementalShieldCounter, SHIELD_ELEMENT_NAMES, CRYSTAL_COUNTER_CONSUMPTION } from "./ShieldRules";
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
    // 原先写的 `BTNSpell_ShieldWall.blp` 在 `dev_lib/w3x2lni/template/**` 里
    // **查无此物**（那个常量并没有 `_`，真实文件名是 `BTNSpellShieldAmulet` 一类），
    // 表现是 buff 栏上一直画一个空白格子。改成一个确认存在的。
    icon: "ReplaceableTextures\\CommandButtons\\BTNAntiMagicShell.blp",
  });
}

export function getBuffDisplay(key: string): BuffDisplayDefinition {
  return registry.get(key) ?? DEFAULT_UNKNOWN;
}

/** 查找顺序：displayKey > typeId；未知时用 displayKey/typeId 作为标题 */
export function resolveBuffDisplay(buff: Buff): BuffDisplayDefinition {
  const key = buff.displayKey ?? buff.typeId;
  const base = registry.get(key) ?? registry.get(buff.typeId);
  if (buff instanceof ShieldBuff && buff.sourceKind === "skill") {
    const element = buff instanceof ElementalShieldBuff ? buff.element : "none";
    const shieldName = element === "none" ? "无元素技能护盾" : SHIELD_ELEMENT_NAMES[element] + "元素技能护盾";
    const skill = buff.displayKey === undefined ? undefined : registry.get(buff.displayKey);
    return { ...(base ?? DEFAULT_UNKNOWN), name: skill === undefined ? shieldName : skill.name + "（" + shieldName + "）" };
  }
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
    t += "\n来源：" + (buff.sourceKind === "crystallize" ? "结晶反应" : "技能");
    t += "\n护盾元素：" + SHIELD_ELEMENT_NAMES[buff instanceof ElementalShieldBuff ? buff.element : "none"];
    t += `\n护盾：${math.floor(buff.current)} / ${math.floor(buff.max)}`;
    if (buff instanceof ElementalShieldBuff) {
      t += `\n当前可抵挡同元素伤害：${math.floor(buff.current * CRYSTAL_SAME_ELEMENT_EFFICIENCY)}`;
      const counter = elementalShieldCounter(buff.element);
      if (counter !== undefined) {
        t += `\n按基础克制规则可挡${SHIELD_ELEMENT_NAMES[counter]}元素伤害：${math.floor(buff.current / CRYSTAL_COUNTER_CONSUMPTION)}`;
      }
      t += "\n触发蒸发 / 融化时，盾耗改用反应倍率（含攻击者元素精通）；不叠乘克制盾耗，溢出伤害不增幅。";
    }
  }
  if (buff instanceof FreezeBuff) {
    t += `\n剩余冻结量：${buff.gauge.toFixed(2)}U`;
    t += "\n火攻击触发融化，雷攻击触发超导；消耗冻结量并缩短控制，耗尽后解除冻结。";
  }
  return t;
}
