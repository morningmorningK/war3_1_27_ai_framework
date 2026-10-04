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