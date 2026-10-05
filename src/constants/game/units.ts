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

// 攻速 / 攻击间隔：v1 属性系统**不写回**这两个（见 StatSheet 的 TS-only 清单），
// 列在这里是为了将来实测 1.27a 能否可靠写入时有现成常量可用。
export const UNIT_STATE_ATTACK_SPACE = ConvertUnitState(0x25); // 攻击间隔
export const UNIT_STATE_ATTACK_SPEED = ConvertUnitState(0x51); // 每秒攻击次数

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