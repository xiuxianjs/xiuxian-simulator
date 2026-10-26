//#region src/constants/battle.ts
/**
* 战斗系统常量配置
*/
/**

* 位置相关常量
*/
const POSITION = {
	FRONT_ROW: [
		1,
		2,
		3
	],
	BACK_ROW: [
		4,
		5,
		6
	],
	MIN_POSITION: 1,
	MAX_POSITION: 6
};
/**
* 技能类型
*/
const SKILL_TYPE = {
	NORMAL: "normal",
	BATTLE: "battle",
	DIVINE: "divine",
	PASSIVE: "passive"
};
/**
* 伤害类型
*/
const DAMAGE_TYPE = {
	PHYSICAL: "physical",
	MAGICAL: "magical",
	TRUE: "true",
	DUAL: "dual"
};
/**
* 目标阵营
*/
const TARGET_SIDE = {
	ENEMY: "enemy",
	ALLY: "ally",
	SELF: "self"
};
/**
* 战斗阵营
*/
const BATTLE_SIDE = {
	A: "A",
	B: "B"
};
/**
* Buff触发时机（已废弃，使用 BUFF_APPLY_TIMING 和 BUFF_EFFECT_TIMING）
* @deprecated 请使用 BUFF_APPLY_TIMING 和 BUFF_EFFECT_TIMING 替代
*/
const BUFF_TRIGGER_TIMING = {
	ROUND_START: 1,
	BEFORE_ACTION: 2,
	ON_CAST_SKILL: 3,
	ON_DAMAGE_DEAL: 4,
	ON_DAMAGE_TAKE: 5,
	AFTER_ACTION: 6,
	ROUND_END: 7,
	ON_DEATH: 8,
	ON_KILL: 9
};
/**
* Buff施加时机
* 决定什么时候把buff添加到单位身上
*/
const BUFF_APPLY_TIMING = {
	BEFORE_SKILL_CAST: 0,
	AFTER_SKILL_CAST: 1,
	BEFORE_DAMAGE_CALC: 2,
	AFTER_DAMAGE_DEALT: 4,
	AFTER_DAMAGE_TAKEN: 5,
	ROUND_START: 6,
	TURN_START: 7,
	TURN_END: 8,
	ROUND_END: 9,
	ON_KILL: 10,
	ON_DEATH: 11,
	ON_CRIT: 12,
	ON_BE_CRIT: 13,
	ON_DODGE: 14,
	ON_BE_DODGED: 15
};
/**
* buff生效时机（新设计）
* 决定什么时候buff影响计算
*/
const BUFF_EFFECT_TIMING = {
	ON_STAT_CALC: 1,
	ON_DAMAGE_CALC: 2,
	ON_HEAL_CALC: 3,
	ON_CRIT_CALC: 4,
	ON_ROUND_TICK: 5,
	ON_TURN_TICK: 6,
	INSTANT: 7
};
/**
* buff类型枚举
*/
const BUFF_TYPE = {
	ATTACK_UP: 1,
	ATTACK_DOWN: 2,
	DEFENSE_UP: 3,
	DEFENSE_DOWN: 4,
	SPEED_UP: 5,
	SPEED_DOWN: 6,
	CRIT_RATE_UP: 7,
	CRIT_DAMAGE_UP: 8,
	SHIELD: 9,
	REGEN: 10,
	DOT: 11,
	STUN: 12,
	SILENCE: 13,
	COUNTER: 14,
	INVINCIBLE: 15,
	DAMAGE_REFLECT: 16,
	HIT_RATE_UP: 17,
	DODGE_RATE_UP: 18,
	ANTI_CRIT_UP: 19,
	HP_MAX_UP: 20,
	DEATH_IMMUNITY: 21,
	EXTRA_TURN: 22,
	HEAL_INSTANT: 23
};
/**
* buff属性模组（影响哪个属性）
*/
const BUFF_ATTRIBUTE_MODULE = {
	PHYSICAL_ATTACK: 1,
	MAGIC_ATTACK: 2,
	PHYSICAL_DEFENSE: 3,
	MAGIC_DEFENSE: 4,
	SPEED: 5,
	HP: 6,
	CRIT_RATE: 7,
	CRIT_DAMAGE: 8,
	DAMAGE_BONUS: 9,
	DAMAGE_REDUCTION: 10,
	HIT_RATE: 11,
	DODGE_RATE: 12,
	ANTI_CRIT_RATE: 13,
	SPECIAL: 99
};
/**
* 攻击模组（用于目标选择）
* 与技能的攻击模组一致，用于选择buff施加目标
*/
const ATTACK_MODULE = {
	SINGLE_FRONT_PRIORITY: "single_front_priority",
	SINGLE_BACK_PRIORITY: "single_back_priority",
	COLUMN_FRONT_PRIORITY: "column_front_priority",
	COLUMN_BACK_PRIORITY: "column_back_priority",
	ROW_FRONT_PRIORITY: "row_front_priority",
	ROW_BACK_PRIORITY: "row_back_priority",
	ALL_ENEMIES: "all_enemies"
};
/**
* 攻击模组ID映射
* 将数字ID映射到攻击模组枚举值（用于buff.module字段）
*/
const ATTACK_MODULE_ID_MAP = {
	1: ATTACK_MODULE.SINGLE_FRONT_PRIORITY,
	2: ATTACK_MODULE.SINGLE_BACK_PRIORITY,
	3: ATTACK_MODULE.COLUMN_FRONT_PRIORITY,
	4: ATTACK_MODULE.COLUMN_BACK_PRIORITY,
	5: ATTACK_MODULE.ROW_FRONT_PRIORITY,
	6: ATTACK_MODULE.ROW_BACK_PRIORITY,
	7: ATTACK_MODULE.ALL_ENEMIES
};
/**
* 根据模组ID或模组字符串获取标准的攻击模组
* @param module 模组ID（数字）或模组字符串
* @returns 标准攻击模组字符串
*/
function getAttackModule(module) {
	if (typeof module === "number") return ATTACK_MODULE_ID_MAP[module] || ATTACK_MODULE.SINGLE_FRONT_PRIORITY;
	return module;
}
/**
* 伤害计算相关常量
*/
const DAMAGE_CALC = {
	MIN_DAMAGE_RATIO: .05,
	DEFENSE_REDUCTION_RATIO: .5,
	RANDOM_DAMAGE_RANGE: .1,
	BASE_CRIT_DAMAGE: 150,
	MULTIPLIER_BASE: 1e4
};
/**
* 行动阶段
*/
const ACTION_PHASE = {
	BEFORE_TURN: "before_turn",
	TURN_START: "turn_start",
	ACTION: "action",
	DAMAGE_SETTLE: "damage_settle",
	TURN_END: "turn_end"
};
/**
* 战斗阶段
*/
const BATTLE_PHASE = {
	INIT: "init",
	WAVE_START: "wave_start",
	ROUND_BEFORE: "round_before",
	ROUND_START: "round_start",
	UNIT_ACTIONS: "unit_actions",
	ROUND_SETTLE: "round_settle",
	ROUND_END: "round_end",
	WAVE_END: "wave_end",
	BATTLE_END: "battle_end"
};
/**
* 单位类型
*/
const UNIT_TYPE = {
	PLAYER: "player",
	NPC: "npc"
};
/**
* 战斗结果
*/
const BATTLE_RESULT = {
	WIN_A: "A",
	WIN_B: "B",
	DRAW: "draw",
	ONGOING: "ongoing"
};
/**
* 技能效果模组映射
*/
const SKILL_MODULE = {
	DAMAGE: "damage",
	HEAL: "heal",
	BUFF: "buff",
	DEBUFF: "debuff",
	DISPEL: "dispel",
	SHIELD: "shield",
	SUMMON: "summon",
	SPECIAL: "special"
};
/**
* 数值限制
*/
const VALUE_LIMITS = {
	MIN_HP: 0,
	MIN_MP: 0,
	MIN_念力: 0,
	MAX_念力: 100,
	MIN_CRIT_RATE: 0,
	MAX_CRIT_RATE: 100,
	MIN_SPEED: 1,
	MAX_BUFF_DURATION: 999
};
/**
* 战斗日志相关
*/
const BATTLE_LOG = {
	MAX_LOGS_PER_WAVE: 1e3,
	ENABLE_DETAIL_LOG: true
};

//#endregion
export { ACTION_PHASE, ATTACK_MODULE, ATTACK_MODULE_ID_MAP, BATTLE_LOG, BATTLE_PHASE, BATTLE_RESULT, BATTLE_SIDE, BUFF_APPLY_TIMING, BUFF_ATTRIBUTE_MODULE, BUFF_EFFECT_TIMING, BUFF_TRIGGER_TIMING, BUFF_TYPE, DAMAGE_CALC, DAMAGE_TYPE, POSITION, SKILL_MODULE, SKILL_TYPE, TARGET_SIDE, UNIT_TYPE, VALUE_LIMITS, getAttackModule };