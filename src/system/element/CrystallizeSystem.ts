/** 结晶碎片：独立地面特效 + 友军走近拾取，不使用原生背包拾取事件。 */
import { Group, TextTag } from "@eiriksgata/wc3ts/*";
import { UNIT_TYPE_DEAD, UNIT_TYPE_STRUCTURE } from "src/constants/game/units";
import { Actor } from "src/system/actor";
import { scheduler, CancelHandle } from "src/system/async";
import { registerBuffDisplay } from "src/system/buff/BuffDisplayRegistry";
import { CRYSTAL_COUNTER_NAMES, CRYSTAL_COUNTER_CONSUMPTION } from "src/system/buff/ShieldRules";
import { EffectEx } from "src/system/EffectEx";
import { StatType } from "src/system/stat";
import { createLogger } from "src/utils/logger";
import { crystallizeShieldAmount } from "./reactionTable";
import type { CrystalElement } from "./reactionTable";

const log = createLogger("Crystallize");
export const CRYSTAL_LIFETIME_SECONDS = 15;
export const CRYSTAL_SHIELD_SECONDS = 15;
export const CRYSTAL_PICKUP_RADIUS = 120;
const MAX_SHARDS = 64;
const SHARDS_PER_TICK = 4;
// 1.27.1 item.ini [sorf] file：真正的地面水晶模型。
const CRYSTAL_MODEL = "Objects\\InventoryItems\\CrystalShard\\CrystalShard.mdl";
const ELEMENT_NAMES: Record<CrystalElement, string> = { fire: "火", water: "水", thunder: "雷", ice: "冰" };
const ELEMENT_COLORS: Record<CrystalElement, number[]> = {
  fire: [255, 89, 56], water: [40, 116, 255], thunder: [159, 64, 255], ice: [88, 223, 255],
};
const crystalJapi = require("jass.japi") as {
  DzSetEffectVertexColor?: (this: void, handle: effect, color: number) => void;
};

interface CrystalShard {
  x: number;
  y: number;
  owner: player;
  sourceId: number;
  element: CrystalElement;
  amount: number;
  visual: EffectEx;
  label?: TextTag;
  expiry?: CancelHandle;
  removed: boolean;
}

export class CrystallizeSystem {
  private static instance: CrystallizeSystem | undefined;
  private shards: CrystalShard[] = [];
  private group: Group | undefined;
  private heartbeat: CancelHandle | undefined;
  private cursor = 0;
  private registered = false;

  public static getInstance(): CrystallizeSystem {
    if (this.instance === undefined) this.instance = new CrystallizeSystem();
    return this.instance;
  }

  public initialize(): void {
    if (this.registered) return;
    this.registered = true;
    const elements: CrystalElement[] = ["fire", "water", "thunder", "ice"];
    for (let i = 0; i < elements.length; i++) {
      const element = elements[i];
      registerBuffDisplay("crystal_shield_" + element, {
        name: ELEMENT_NAMES[element] + "元素结晶护盾",
        description: "来源：结晶反应。拾取碎片获得" + ELEMENT_NAMES[element] +
          "元素护盾，持续 15 秒。对同元素伤害的吸收效率为 2.5 倍；受到" +
          CRYSTAL_COUNTER_NAMES[element] + "元素伤害时，每点伤害消耗 " + CRYSTAL_COUNTER_CONSUMPTION +
          " 点护盾值；其他伤害按 1 倍吸收。护盾元素可触发反应；蒸发 / 融化用反应倍率及攻击者元素精通计算盾耗，替代克制倍率，破盾溢出伤害不增幅。",
        icon: "ReplaceableTextures\\CommandButtons\\BTNGem.blp",
      });
    }
  }

  public spawn(source: Actor | undefined, target: Actor, element: CrystalElement): void {
    if (source === undefined || GetUnitTypeId(source.handle) === 0 || GetUnitTypeId(target.handle) === 0) return;
    this.initialize();
    if (this.group === undefined) this.group = Group.create();
    if (this.group === undefined) {
      log.error("无法创建碎片拾取枚举组");
      return;
    }
    const x = target.x;
    const y = target.y;
    const em = source.hasStatSheet() ? source.statSheet.getFinal(StatType.ELEMENTAL_MASTERY) : 0;
    // 在生成时快照触发者等级、精通、阵营；触发者死亡后友军仍能拾取。
    const amount = crystallizeShieldAmount(source.level, em);
    const visual = EffectEx.create(CRYSTAL_MODEL, x, y);
    if (visual === undefined) {
      if (this.shards.length === 0) {
        this.group.destroy();
        this.group = undefined;
      }
      return;
    }
    const color = ELEMENT_COLORS[element];
    try {
      if (crystalJapi.DzSetEffectVertexColor !== undefined) {
        crystalJapi.DzSetEffectVertexColor(visual.handle,
          (255 << 24) | (color[0] << 16) | (color[1] << 8) | color[2]);
      }
    } catch (e) {
      log.error(`碎片染色失败，保留元素文字标识：${e}`);
    }
    const shard: CrystalShard = { x, y, owner: GetOwningPlayer(source.handle),
      sourceId: source.id, element, amount, visual, removed: false };
    // 活跃碎片有数量上限，枚举任务分散到心跳中，避免一次伤害集中扫描全场。
    if (this.shards.length >= MAX_SHARDS) this.remove(this.shards[0]);
    this.shards.push(shard);
    if (this.heartbeat === undefined) this.heartbeat = scheduler.onTick(() => this.tick());
    shard.expiry = scheduler.defer(CRYSTAL_LIFETIME_SECONDS, () => this.remove(shard));
    const label = TextTag.create();
    shard.label = label;
    if (label !== undefined) {
      label.setText(ELEMENT_NAMES[element] + "结晶", 0.018);
      label.setPos(x, y, 40);
      label.setColor(color[0], color[1], color[2], 255);
      label.setPermanent(true);
    }
    log.info("生成" + ELEMENT_NAMES[element] + "结晶：基础护盾=" + amount.toFixed(1));
  }

  private tick(): void {
    const group = this.group;
    if (group === undefined) return;
    const count = Math.min(SHARDS_PER_TICK, this.shards.length);
    for (let i = 0; i < count; i++) {
      if (this.shards.length === 0) break;
      if (this.cursor >= this.shards.length) this.cursor = 0;
      const shard = this.shards[this.cursor];
      let closest: unit | undefined;
      let closestDistance = CRYSTAL_PICKUP_RADIUS * CRYSTAL_PICKUP_RADIUS;
      GroupEnumUnitsInRange(group.handle, shard.x, shard.y, CRYSTAL_PICKUP_RADIUS, null);
      let candidate = FirstOfGroup(group.handle);
      while (candidate !== undefined) {
        GroupRemoveUnit(group.handle, candidate);
        if (GetUnitTypeId(candidate) !== 0 && GetWidgetLife(candidate) > 0.405 &&
          !IsUnitType(candidate, UNIT_TYPE_STRUCTURE) && !IsUnitType(candidate, UNIT_TYPE_DEAD) &&
          (GetOwningPlayer(candidate) === shard.owner || IsUnitAlly(candidate, shard.owner))) {
          const dx = GetUnitX(candidate) - shard.x;
          const dy = GetUnitY(candidate) - shard.y;
          const distance = dx * dx + dy * dy;
          if (distance < closestDistance || (distance === closestDistance &&
            (closest === undefined || GetHandleId(candidate) < GetHandleId(closest)))) {
            closest = candidate;
            closestDistance = distance;
          }
        }
        candidate = FirstOfGroup(group.handle);
      }
      const picker = closest !== undefined ? Actor.fromHandle(closest) : undefined;
      if (picker !== undefined) {
        // 先移除，确保同一碎片只能授予一个单位；伤害和颜色均复用既有护盾生命周期。
        this.remove(shard);
        const shield = picker.buffManager.addCrystallizeShield(shard.amount, CRYSTAL_SHIELD_SECONDS, shard.element);
        log.info("拾取" + ELEMENT_NAMES[shard.element] + "结晶：单位=" + picker.id + " 护盾=" + shield.max.toFixed(1));
      } else {
        this.cursor++;
      }
    }
  }

  private remove(shard: CrystalShard): void {
    if (shard.removed) return;
    shard.removed = true;
    shard.expiry?.cancel();
    shard.visual.destroy();
    shard.label?.destroy();
    const index = this.shards.indexOf(shard);
    if (index >= 0) {
      this.shards.splice(index, 1);
      if (index < this.cursor) this.cursor--;
    }
    if (this.shards.length === 0) {
      this.heartbeat?.cancel();
      this.heartbeat = undefined;
      this.group?.destroy();
      this.group = undefined;
      this.cursor = 0;
    }
  }

  /** 供模块卸载 / 热重载回收，销毁碎片、标签、过期任务与枚举组。 */
  public cleanup(): void {
    while (this.shards.length > 0) this.remove(this.shards[this.shards.length - 1]);
    this.heartbeat?.cancel();
    this.heartbeat = undefined;
    this.group?.destroy();
    this.group = undefined;
    this.cursor = 0;
    this.registered = false;
  }
}

export function initialize(): void { CrystallizeSystem.getInstance().initialize(); }
export function cleanup(): void { CrystallizeSystem.getInstance().cleanup(); }
