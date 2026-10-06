/**
 * 游戏单位相关常量定义
 */

// 英雄单位类型
export const HERO_ARCHMAGE = 'Hamg';
export const HERO_MOUNTAIN_KING = 'Hmkg';
export const HERO_PALADIN = 'Hpal';
export const HERO_BLOOD_MAGE = 'Hblm';

// 人族单位类型
export const UNIT_PEASANT = 'hpea';
export const UNIT_FOOTMAN = 'hfoo';
export const UNIT_RIFLEMAN = 'hrif';
export const UNIT_KNIGHT = 'hkni';

// 单位状态常量
export const UNIT_STATE_LIFE = ConvertUnitState(0);
export const UNIT_STATE_MAX_LIFE = ConvertUnitState(1);
export const UNIT_STATE_MANA = ConvertUnitState(2);
export const UNIT_STATE_MAX_MANA = ConvertUnitState(3);

// 属性系统要写回原生的那几个（取值出处 wc3ts/src/globals/define.ts:546-559，已核对）。
//
// **0x12 与 0x13 必须分开**：白字（`ATTACK_WHITE`）是「基础攻击力」，绿字
// （`ATTACK_BONUS`）是「加成攻击力」。面板上「基础攻击力」读前者、「额外攻击力」
// 读后者；`%攻击力` 这类修正只作用在白字层，分开存才不会连绿字一起放大。
export const UNIT_STATE_ATTACK_WHITE = ConvertUnitState(0x12); // 白字基础攻击
export const UNIT_STATE_ATTACK_BONUS = ConvertUnitState(0x13); // 绿字加成攻击
export const UNIT_STATE_DEFEND_WHITE = ConvertUnitState(0x20); // 护甲

// 攻速 / 攻击间隔。**两个不是倒数关系，量纲不同**（2026-10-06 实测，
// memory `wc3-unit-state-japi-write`）：
//
//   0x51 = 攻速**倍率**，1.0 = 没有任何加速。步兵读 1.000、圣骑士读 1.260
//          （= 1 + 13 敏捷 × 0.02）。**可读可写**（`SetUnitState`），
//          而且引擎会把敏捷增量叠在写回值之上。
//   0x25 = **基础攻击间隔**（秒），静态值：步兵 1.350、圣骑士 2.200。
//          写 0x51 它纹丝不动。
//
// 实际出手频率 = `0x51 / 0x25`。
// ⚠️ 属性系统目前**故意不接** `ATTACK_SPEED`（快照模型会抹掉引擎那份），见
// `stat/types.ts` 的 ⚠️ 与 `todo_next.md`。
export const UNIT_STATE_ATTACK_SPACE = ConvertUnitState(0x25); // 基础攻击间隔（秒）
export const UNIT_STATE_ATTACK_SPEED = ConvertUnitState(0x51); // 攻速倍率（1.0 = 100%）

// 单位类型常量
export const UNIT_TYPE_HERO = ConvertUnitType(0);
export const UNIT_TYPE_DEAD = ConvertUnitType(1);
export const UNIT_TYPE_STRUCTURE = ConvertUnitType(2);
export const UNIT_TYPE_FLYING = ConvertUnitType(3);
export const UNIT_TYPE_GROUND = ConvertUnitType(4);

// 攻击类型
export const ATTACK_TYPE_NORMAL = ConvertAttackType(0);
export const ATTACK_TYPE_PIERCE = ConvertAttackType(1);
export const ATTACK_TYPE_SIEGE = ConvertAttackType(2);
export const ATTACK_TYPE_MAGIC = ConvertAttackType(5);

// 护甲类型
export const ARMOR_TYPE_UNARMORED = ConvertDamageType(0);
export const ARMOR_TYPE_LIGHT = ConvertDamageType(1);
export const ARMOR_TYPE_MEDIUM = ConvertDamageType(2);
export const ARMOR_TYPE_HEAVY = ConvertDamageType(3);
export const ARMOR_TYPE_FORTIFIED = ConvertDamageType(4);
export const ARMOR_TYPE_HERO = ConvertDamageType(5);