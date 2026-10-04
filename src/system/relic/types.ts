import { Actor } from "../actor";

/** 遗物唯一标识（稳定、可序列化） */
export type RelicId = string;

/** 遗物稀有度（可选，供 UI 配色扩展） */
export type RelicRarity = "common" | "uncommon" | "rare" | "boss" | string;

/**
 * 遗物定义：注册到 RelicRegistry 后由 RelicSystem 在获得/移除时调用钩子
 */
export interface RelicDefinition {
  id: RelicId;
  name: string;
  description: string;
  /** 图标路径（BLP/TGA 等） */
  icon: string;
  rarity?: RelicRarity;
  /** 是否同 id 仅允许一条库存记录（默认 true） */
  unique?: boolean;
  /** 最大层数，默认 1；大于 1 时重复获得会叠加并触发 onStack */
  maxStacks?: number;
  /** 首次获得该遗物（该 id 第一次进背包） */
  onAcquire: (actor: Actor) => void;
  /** 从单位移除时（整层移除或清空） */
  onRemove?: (actor: Actor, stacks: number) => void;
  /** 叠加层数增加时（不含首次 onAcquire） */
  onStack?: (actor: Actor, newStacks: number) => void;
}

/** 池内一条权重项 */
export interface RelicPoolEntry {
  id: RelicId;
  weight: number;
}

/** 单位身上一条遗物记录（有序，决定 UI 从左到右） */
export interface RelicInventoryItem {
  id: RelicId;
  stacks: number;
}

export interface RelicAddedPayload {
  actor: Actor;
  relicId: RelicId;
  stacks: number;
}

export interface RelicRemovedPayload {
  actor: Actor;
  relicId: RelicId;
  stacks: number;
}

export interface RelicInventoryChangedPayload {
  actor: Actor;
}
