import { markdownButtonLabel } from "./buttonLabel.js";
import { ZERO_VALUE } from "../constants/common.js";
import { ATTACK_MODULE, getAttackModule } from "../constants/battle.js";
import { formatSkillEffectLine } from "./skillEffectHelper.js";
import { Format } from "alemonjs";

//#region src/utils/skillBookHelper.ts
/**
* 功法辅助工具函数
*/
const DAMAGE_TYPE_TEXT = {
	physical: "物理",
	magical: "法术",
	true: "真实",
	dual: "双属性"
};
const TRIGGER_CONDITION_TEXT = {
	round_start: "每回合开始时触发",
	hp_below_50_round_start: "每回合开始时，若气血低于50%则触发",
	hp_below_30: "气血低于30%时触发",
	on_crit: "造成暴击时触发",
	after_skill: "释放技能后触发",
	after_divine: "释放神通后触发",
	on_hit_taken: "受到攻击后触发",
	on_physical_hit_taken: "受到物理攻击后触发",
	on_dodge: "闪避时触发",
	on_fatal: "濒死时触发",
	on_kill_or_low_hp: "击杀目标或低血时触发"
};
const formatScaledPercent = (value, scale = 100) => {
	if (value === void 0 || value === null || Number.isNaN(Number(value))) return null;
	const normalized = Number(value) / scale;
	return `${normalized % 1 === 0 ? normalized.toString() : normalized.toFixed(2).replace(/\.0+$|(?<=\.[0-9]*[1-9])0+$/g, "")}%`;
};
const formatDirectValue = (value) => {
	if (value === void 0 || value === null || Number.isNaN(Number(value))) return null;
	const normalized = Number(value);
	return normalized % 1 === 0 ? normalized.toString() : normalized.toFixed(2).replace(/\.0+$|(?<=\.[0-9]*[1-9])0+$/g, "");
};
const formatSkillMultiplier = (value) => {
	const percentValue = formatDirectValue(value);
	if (!percentValue) return null;
	return `${percentValue}%`;
};
const getAttackModulePresentation = (module, targetCount) => {
	switch (module === void 0 || module === null ? null : getAttackModule(module)) {
		case ATTACK_MODULE.SINGLE_FRONT_PRIORITY: return { label: targetCount && targetCount > 1 ? `前排单体，最多${targetCount}个` : "前排单体" };
		case ATTACK_MODULE.SINGLE_BACK_PRIORITY: return { label: targetCount && targetCount > 1 ? `后排单体，最多${targetCount}个` : "后排单体" };
		case ATTACK_MODULE.COLUMN_FRONT_PRIORITY: return { label: targetCount && targetCount > 0 ? `前排整列，最多${targetCount}个` : "前排整列" };
		case ATTACK_MODULE.COLUMN_BACK_PRIORITY: return { label: targetCount && targetCount > 0 ? `后排整列，最多${targetCount}个` : "后排整列" };
		case ATTACK_MODULE.ROW_FRONT_PRIORITY: return { label: targetCount && targetCount > 0 ? `前排整排，最多${targetCount}个` : "前排整排" };
		case ATTACK_MODULE.ROW_BACK_PRIORITY: return { label: targetCount && targetCount > 0 ? `后排整排，最多${targetCount}个` : "后排整排" };
		case ATTACK_MODULE.ALL_ENEMIES: return { label: "敌方全体" };
		default: return { label: targetCount && targetCount > 1 ? `最多${targetCount}个目标` : "单体目标" };
	}
};
const buildSkillNarrative = (skillBook) => {
	const lines = [];
	const skillName = skillBook.skillName ?? skillBook.name;
	const damageText = skillBook.damageType ? DAMAGE_TYPE_TEXT[skillBook.damageType] ?? skillBook.damageType : null;
	const multiplierText = formatSkillMultiplier(skillBook.multiplier);
	const moduleInfo = getAttackModulePresentation(skillBook.skillModule, skillBook.targetCount);
	const triggerText = skillBook.triggerCondition ? TRIGGER_CONDITION_TEXT[skillBook.triggerCondition] ?? skillBook.triggerCondition : null;
	const extraEffects = (skillBook.skillEffects ?? []).slice(0, 2);
	if (skillBook.skillType === "被动技") {
		lines.push(`“${skillName}”为被动效果，不需要主动施放。`);
		if (triggerText) lines.push(`通常会在${triggerText}自动触发。`);
		if (extraEffects.length > 0) lines.push(`触发后可附加${extraEffects.map((effect) => `“${effect.name}”`).join("、")}。`);
		return lines;
	}
	let firstLine = `“${skillName}”攻击${moduleInfo.label}`;
	if (damageText) {
		firstLine += "，造成";
		if (multiplierText) firstLine += `${multiplierText}的${damageText}伤害`;
		else firstLine += `${damageText}伤害`;
	}
	firstLine += "。";
	lines.push(firstLine);
	if (extraEffects.length > 0) {
		const primaryEffect = extraEffects[0];
		const probabilityText = formatScaledPercent(primaryEffect?.probability);
		if (primaryEffect) lines.push(`${probabilityText && probabilityText !== "100%" ? `${probabilityText}的概率` : ""}可触发“${primaryEffect.name}”效果。`);
	}
	return lines;
};
const appendSkillBookCombatSections = (md, skillBook, options = {}) => {
	const skillNarrative = buildSkillNarrative(skillBook);
	const skillDamageText = skillBook.damageType ? DAMAGE_TYPE_TEXT[skillBook.damageType] ?? skillBook.damageType : null;
	const multiplierText = formatSkillMultiplier(skillBook.multiplier);
	const cooldownText = skillBook.cooldown && skillBook.cooldown > 0 ? `${skillBook.cooldown}回合` : "无冷却";
	const costText = formatDirectValue(skillBook.cost);
	const defenseIgnoreText = formatDirectValue(skillBook.defenseIgnorePercent);
	const triggerText = skillBook.triggerCondition ? TRIGGER_CONDITION_TEXT[skillBook.triggerCondition] ?? skillBook.triggerCondition : null;
	if (skillDamageText) {
		md.addText(`伤害: ${skillDamageText}${multiplierText ? ` · 倍率${multiplierText}` : ""}`);
		md.addNewline();
	}
	if (options.statusText) {
		md.addText(`状态: ${options.statusEmoji ? `${options.statusEmoji} ` : ""}${options.statusText}`);
		md.addNewline();
	}
	if (options.proficiencyText) {
		md.addText(`熟练${options.proficiencyText}`);
		if (options.proficiencyButtonData) {
			md.addText(" ");
			md.addButton(markdownButtonLabel("＋"), { data: options.proficiencyButtonData });
		}
		if (options.proficiencyAllButtonData) {
			md.addText(" ");
			md.addButton(markdownButtonLabel("全部"), { data: options.proficiencyAllButtonData });
		}
		if ((skillBook.proficiency ?? 0) < 60) {
			md.addText(" ");
			md.addButton(markdownButtonLabel("明悟丹"), { data: "/服用 明悟丹 1" });
		}
		md.addNewline();
	}
	md.addText(`冷却: ${cooldownText}`);
	md.addNewline();
	if (costText && Number(skillBook.cost ?? 0) > 0) {
		md.addText(`施放消耗: ${costText}`);
		md.addNewline();
	}
	if (defenseIgnoreText && Number(skillBook.defenseIgnorePercent ?? 0) > 0) {
		md.addText(`无视防御: ${defenseIgnoreText}%`);
		md.addNewline();
	}
	if (triggerText) {
		md.addText(`触发条件: ${triggerText}`);
		md.addNewline();
	}
	if (skillNarrative.length > 0) {
		md.addNewline();
		md.addText("【技能介绍】");
		skillNarrative.forEach((line) => {
			md.addNewline();
			md.addText(line);
		});
	}
	if (skillBook.skillEffects && skillBook.skillEffects.length > 0) {
		md.addNewline();
		md.addText("附带效果:");
		skillBook.skillEffects.forEach((effect) => {
			md.addNewline();
			md.addText(formatSkillEffectLine(effect));
		});
	} else if (skillBook.buffNames?.length) {
		md.addNewline();
		md.addText(`附带效果: ${skillBook.buffNames.join("、")}`);
	}
};
/**
* 根据功法ID从列表中获取功法
* @param skillBooks 功法列表
* @param skillBookId 功法ID（主键）
* @returns 功法数据，如果ID不存在则返回null
*/
const getSkillBookById = (skillBooks, skillBookId) => {
	return skillBooks.find((skillBook) => Number(skillBook.id) === skillBookId) ?? null;
};
/**
* 格式化功法列表项文本
* @param skillBook 功法数据
* @param displayId 显示ID（使用功法主键ID）
* @returns 格式化后的文本
*/
const formatSkillBookListItem = (skillBook, _displayId) => {
	return skillBook.listText;
};
/**
* 格式化功法详细信息（FormatMarkDown）
* @param skillBook 功法数据
* @param displayId 显示ID（使用功法主键ID）
* @returns FormatMarkDown 对象
*/
const formatSkillBookDetail = (skillBook, displayId, proficiencyPoints = 0) => {
	const view = skillBook.detailDisplay;
	if (!view) throw new Error("功法详情接口缺少展示投影");
	const md = Format.createMarkdown();
	md.addText(view.titleText);
	md.addButton(markdownButtonLabel("升级"), { data: `/升级功法 ${displayId}` });
	md.addText(" ");
	md.addButton(markdownButtonLabel("换词"), { data: `/换词 ${displayId}` });
	md.addNewline();
	md.addNewline();
	md.addText(`功法ID: ${displayId}`);
	md.addNewline();
	md.addText(`类型: ${skillBook.skillType}`);
	md.addNewline();
	md.addText(`持有熟练点: ${proficiencyPoints}`);
	md.addNewline();
	if (view.damageLine) {
		md.addText(view.damageLine);
		md.addNewline();
	}
	md.addText(view.statusLine);
	md.addNewline();
	md.addText(`熟练度: ${view.proficiencyText}`);
	if (view.canComprehend) {
		md.addText(" ");
		md.addButton(markdownButtonLabel("＋"), { data: `/参悟 ${displayId} 1` });
		md.addText(" ");
		md.addButton(markdownButtonLabel("全部"), { data: `/参悟 ${displayId} 全部` });
	}
	if (view.canUseMingwudan) {
		md.addText(" ");
		md.addButton(markdownButtonLabel("明悟丹"), { data: "/服用 明悟丹 1" });
	}
	md.addNewline();
	md.addText(view.cooldownLine);
	md.addNewline();
	for (const line of [
		view.costLine,
		view.defenseIgnoreLine,
		view.triggerLine
	]) if (line) {
		md.addText(line);
		md.addNewline();
	}
	if (view.narrativeLines.length > 0) {
		md.addNewline();
		md.addText("【技能介绍】");
		for (const line of view.narrativeLines) {
			md.addNewline();
			md.addText(line);
		}
	}
	if (view.effectLines.length > 0) {
		md.addNewline();
		md.addText("附带效果:");
		for (const line of view.effectLines) {
			md.addNewline();
			md.addText(line);
		}
	} else if (view.effectNamesLine) {
		md.addNewline();
		md.addText(view.effectNamesLine);
	}
	if (view.recoveryLines?.length) {
		md.addNewline();
		md.addText("【资源恢复固有效果】");
		for (const line of view.recoveryLines) {
			md.addNewline();
			md.addText(line);
		}
	}
	if (view.attributeLines.length > 0) {
		md.addNewline();
		md.addText("【属性加成】");
		view.attributeLines.forEach((attr) => {
			md.addNewline();
			md.addText(attr);
		});
	} else {
		md.addNewline();
		md.addText("暂无属性加成");
	}
	return md;
};
/**
* 构建成功消息
* @param title 标题（如：学习成功、升级成功）
* @param skillBookName 功法名称
* @param skillType 功法类型
* @returns 基础成功消息
*/
const buildSuccessMessage = (title, skillBookName, skillType) => {
	return `✅ ${title}\n\n【${skillBookName}】\n类型: ${skillType}`;
};
/**
* 构建失败消息
* @param title 标题（如：学习失败、升级失败）
* @param reason 失败原因
* @returns 失败消息
*/
const buildFailureMessage = (title, reason) => {
	return `❌ ${title}\n\n${reason}`;
};

//#endregion
export { appendSkillBookCombatSections, buildFailureMessage, buildSuccessMessage, formatSkillBookDetail, formatSkillBookListItem, getSkillBookById };