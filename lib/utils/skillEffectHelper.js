import { BUFF_APPLY_TIMING, BUFF_ATTRIBUTE_MODULE, BUFF_TYPE } from "../constants/battle.js";

//#region src/utils/skillEffectHelper.ts
const CAMP_TEXT = {
	enemy: "敌方",
	ally: "友方",
	self: "自身"
};
const BUFF_TYPE_TEXT = {
	[BUFF_TYPE.ATTACK_UP]: "攻击提升",
	[BUFF_TYPE.ATTACK_DOWN]: "攻击降低",
	[BUFF_TYPE.DEFENSE_UP]: "防御提升",
	[BUFF_TYPE.DEFENSE_DOWN]: "防御降低",
	[BUFF_TYPE.SPEED_UP]: "速度提升",
	[BUFF_TYPE.SPEED_DOWN]: "速度降低",
	[BUFF_TYPE.CRIT_RATE_UP]: "暴击率提升",
	[BUFF_TYPE.CRIT_DAMAGE_UP]: "暴击伤害提升",
	[BUFF_TYPE.SHIELD]: "护盾",
	[BUFF_TYPE.REGEN]: "持续回血",
	[BUFF_TYPE.DOT]: "持续伤害",
	[BUFF_TYPE.STUN]: "眩晕",
	[BUFF_TYPE.SILENCE]: "沉默",
	[BUFF_TYPE.COUNTER]: "反击",
	[BUFF_TYPE.INVINCIBLE]: "无敌",
	[BUFF_TYPE.DAMAGE_REFLECT]: "伤害反弹",
	[BUFF_TYPE.HIT_RATE_UP]: "命中提升",
	[BUFF_TYPE.DODGE_RATE_UP]: "闪避提升",
	[BUFF_TYPE.ANTI_CRIT_UP]: "抗暴提升",
	[BUFF_TYPE.HP_MAX_UP]: "生命上限提升",
	[BUFF_TYPE.DEATH_IMMUNITY]: "免死",
	[BUFF_TYPE.EXTRA_TURN]: "额外行动",
	[BUFF_TYPE.HEAL_INSTANT]: "即时恢复"
};
const BUFF_ATTRIBUTE_TEXT = {
	[BUFF_ATTRIBUTE_MODULE.PHYSICAL_ATTACK]: "物攻",
	[BUFF_ATTRIBUTE_MODULE.MAGIC_ATTACK]: "法攻",
	[BUFF_ATTRIBUTE_MODULE.PHYSICAL_DEFENSE]: "物防",
	[BUFF_ATTRIBUTE_MODULE.MAGIC_DEFENSE]: "法防",
	[BUFF_ATTRIBUTE_MODULE.SPEED]: "速度",
	[BUFF_ATTRIBUTE_MODULE.HP]: "生命",
	[BUFF_ATTRIBUTE_MODULE.CRIT_RATE]: "暴击率",
	[BUFF_ATTRIBUTE_MODULE.CRIT_DAMAGE]: "暴击伤害",
	[BUFF_ATTRIBUTE_MODULE.DAMAGE_BONUS]: "最终伤害",
	[BUFF_ATTRIBUTE_MODULE.DAMAGE_REDUCTION]: "最终减伤",
	[BUFF_ATTRIBUTE_MODULE.HIT_RATE]: "命中率",
	[BUFF_ATTRIBUTE_MODULE.DODGE_RATE]: "闪避率",
	[BUFF_ATTRIBUTE_MODULE.ANTI_CRIT_RATE]: "抗暴率",
	[BUFF_ATTRIBUTE_MODULE.SPECIAL]: "特殊效果"
};
const APPLY_TIMING_TEXT = {
	[BUFF_APPLY_TIMING.BEFORE_SKILL_CAST]: "释放前附加",
	[BUFF_APPLY_TIMING.AFTER_SKILL_CAST]: "释放后附加",
	[BUFF_APPLY_TIMING.BEFORE_DAMAGE_CALC]: "伤害计算前附加",
	[BUFF_APPLY_TIMING.AFTER_DAMAGE_DEALT]: "造成伤害后触发",
	[BUFF_APPLY_TIMING.AFTER_DAMAGE_TAKEN]: "受到伤害后触发",
	[BUFF_APPLY_TIMING.ROUND_START]: "回合开始触发",
	[BUFF_APPLY_TIMING.TURN_START]: "自身行动前触发",
	[BUFF_APPLY_TIMING.TURN_END]: "自身行动后触发",
	[BUFF_APPLY_TIMING.ROUND_END]: "回合结束触发",
	[BUFF_APPLY_TIMING.ON_KILL]: "击杀时触发",
	[BUFF_APPLY_TIMING.ON_DEATH]: "死亡时触发",
	[BUFF_APPLY_TIMING.ON_CRIT]: "暴击时触发",
	[BUFF_APPLY_TIMING.ON_BE_CRIT]: "被暴击时触发",
	[BUFF_APPLY_TIMING.ON_DODGE]: "闪避时触发",
	[BUFF_APPLY_TIMING.ON_BE_DODGED]: "被闪避时触发"
};
const EFFECT_SHORT_TRIGGER_TEXT = {
	[BUFF_APPLY_TIMING.BEFORE_SKILL_CAST]: "施放前",
	[BUFF_APPLY_TIMING.AFTER_SKILL_CAST]: "施放后",
	[BUFF_APPLY_TIMING.BEFORE_DAMAGE_CALC]: "伤害前",
	[BUFF_APPLY_TIMING.AFTER_DAMAGE_DEALT]: "命中后",
	[BUFF_APPLY_TIMING.AFTER_DAMAGE_TAKEN]: "受击后",
	[BUFF_APPLY_TIMING.ROUND_START]: "回合开始",
	[BUFF_APPLY_TIMING.TURN_START]: "行动前",
	[BUFF_APPLY_TIMING.TURN_END]: "行动后",
	[BUFF_APPLY_TIMING.ROUND_END]: "回合结束",
	[BUFF_APPLY_TIMING.ON_KILL]: "击杀时",
	[BUFF_APPLY_TIMING.ON_DEATH]: "死亡时",
	[BUFF_APPLY_TIMING.ON_CRIT]: "暴击时",
	[BUFF_APPLY_TIMING.ON_BE_CRIT]: "被暴击时",
	[BUFF_APPLY_TIMING.ON_DODGE]: "闪避时",
	[BUFF_APPLY_TIMING.ON_BE_DODGED]: "被闪避时"
};
const ATTRIBUTE_DRIVEN_BUFF_TYPES = /* @__PURE__ */ new Set([
	BUFF_TYPE.ATTACK_UP,
	BUFF_TYPE.ATTACK_DOWN,
	BUFF_TYPE.DEFENSE_UP,
	BUFF_TYPE.DEFENSE_DOWN,
	BUFF_TYPE.SPEED_UP,
	BUFF_TYPE.SPEED_DOWN,
	BUFF_TYPE.CRIT_RATE_UP,
	BUFF_TYPE.CRIT_DAMAGE_UP,
	BUFF_TYPE.HIT_RATE_UP,
	BUFF_TYPE.DODGE_RATE_UP,
	BUFF_TYPE.ANTI_CRIT_UP,
	BUFF_TYPE.HP_MAX_UP
]);
const NEGATIVE_TREND_BUFF_TYPES = /* @__PURE__ */ new Set([
	BUFF_TYPE.ATTACK_DOWN,
	BUFF_TYPE.DEFENSE_DOWN,
	BUFF_TYPE.SPEED_DOWN
]);
/**
* 将万分比格式化为百分比文本。
*/
const formatScaledPercent = (value, scale = 100) => {
	if (value === void 0 || value === null || Number.isNaN(Number(value))) return null;
	const normalized = Number(value) / scale;
	return `${normalized % 1 === 0 ? normalized.toString() : normalized.toFixed(2).replace(/\.0+$|(?<=\.[0-9]*[1-9])0+$/g, "")}%`;
};
/**
* 将技能 Buff 关联记录映射为展示层使用的效果数据。
*/
const mapSkillBuffToSkillEffect = (skillBuff) => ({
	name: skillBuff.buff?.name ?? "未知效果",
	probability: skillBuff.probability !== void 0 && skillBuff.probability !== null ? Number(skillBuff.probability) : void 0,
	type: skillBuff.buff?.type !== void 0 && skillBuff.buff?.type !== null ? Number(skillBuff.buff.type) : void 0,
	module: skillBuff.buff?.module ?? null,
	camp: skillBuff.buff?.camp ?? null,
	applyTiming: skillBuff.buff?.applyTiming !== void 0 && skillBuff.buff?.applyTiming !== null ? Number(skillBuff.buff.applyTiming) : void 0,
	effectTiming: skillBuff.buff?.effectTiming !== void 0 && skillBuff.buff?.effectTiming !== null ? Number(skillBuff.buff.effectTiming) : void 0,
	removable: skillBuff.buff?.removable,
	triggerScope: skillBuff.buff?.triggerScope,
	applyProbability: skillBuff.buff?.applyProbability !== void 0 && skillBuff.buff?.applyProbability !== null ? Number(skillBuff.buff.applyProbability) : void 0,
	effectProbability: skillBuff.buff?.effectProbability !== void 0 && skillBuff.buff?.effectProbability !== null ? Number(skillBuff.buff.effectProbability) : void 0,
	duration: skillBuff.buff?.duration !== void 0 && skillBuff.buff?.duration !== null ? Number(skillBuff.buff.duration) : void 0,
	multiplier: skillBuff.buff?.multiplier !== void 0 && skillBuff.buff?.multiplier !== null ? Number(skillBuff.buff.multiplier) : void 0,
	maxStacks: skillBuff.buff?.maxStacks !== void 0 && skillBuff.buff?.maxStacks !== null ? Number(skillBuff.buff.maxStacks) : void 0,
	attributeModule: skillBuff.buff?.attributeModule !== void 0 && skillBuff.buff?.attributeModule !== null ? Number(skillBuff.buff.attributeModule) : void 0
});
/**
* 生成 Buff 的核心语义描述，优先使用类型语义，属性模组仅作为兜底。
*/
const getSkillEffectSemanticText = (effect) => {
	const typeText = effect.type !== void 0 ? BUFF_TYPE_TEXT[effect.type] : null;
	const attrText = effect.attributeModule !== void 0 ? BUFF_ATTRIBUTE_TEXT[effect.attributeModule] ?? `属性${effect.attributeModule}` : null;
	const multiplierText = formatScaledPercent(effect.multiplier);
	if (effect.type !== void 0 && ATTRIBUTE_DRIVEN_BUFF_TYPES.has(effect.type) && attrText) {
		const trendSymbol = NEGATIVE_TREND_BUFF_TYPES.has(effect.type) ? "-" : "+";
		return multiplierText ? `${attrText}${trendSymbol}${multiplierText}` : attrText;
	}
	if (typeText) {
		if (!multiplierText) return typeText;
		if (effect.type === BUFF_TYPE.COUNTER) return `反击倍率${multiplierText}`;
		return `${typeText}${multiplierText}`;
	}
	if (attrText && multiplierText) return `${attrText}+${multiplierText}`;
	if (attrText) return attrText;
	return effect.name || null;
};
/**
* 格式化单条 Buff 效果文案，避免特殊 Buff 被错误展示为属性增减。
*/
const formatSkillEffectLine = (effect) => {
	const probabilityText = formatScaledPercent(effect.probability);
	const applyProbabilityText = formatScaledPercent(effect.applyProbability);
	const effectProbabilityText = formatScaledPercent(effect.effectProbability);
	const campText = effect.camp ? CAMP_TEXT[effect.camp] ?? effect.camp : null;
	const timingText = effect.applyTiming !== void 0 ? EFFECT_SHORT_TRIGGER_TEXT[effect.applyTiming] ?? APPLY_TIMING_TEXT[effect.applyTiming] : null;
	const semanticText = getSkillEffectSemanticText(effect);
	const actionParts = [];
	const extraParts = [];
	if (timingText) actionParts.push(timingText);
	if (campText) actionParts.push(campText);
	if (effect.duration !== void 0) actionParts.push(`持续${effect.duration}回合`);
	if (semanticText) extraParts.push(semanticText);
	if (probabilityText && probabilityText !== "100%") extraParts.push(`触发率${probabilityText}`);
	if (applyProbabilityText && applyProbabilityText !== "100%") extraParts.push(`施加率${applyProbabilityText}`);
	if (effectProbabilityText && effectProbabilityText !== "100%") extraParts.push(`生效率${effectProbabilityText}`);
	if (effect.maxStacks !== void 0 && effect.maxStacks > 1) extraParts.push(`最多${effect.maxStacks}层`);
	if (effect.removable === false) extraParts.push("不可驱散");
	const mainText = actionParts.length > 0 ? `${actionParts.join("")}，${extraParts.join("，")}` : extraParts.join("，");
	return `• 【${effect.name}】${mainText}`;
};

//#endregion
export { formatSkillEffectLine, mapSkillBuffToSkillEffect };