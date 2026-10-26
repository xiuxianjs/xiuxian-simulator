import { Format } from "alemonjs";

//#region src/utils/battleLogFormatter.ts
/**
* 伤害类型映射
*/
const DAMAGE_TYPE_MAP = {
	physical: "物理",
	magical: "法术",
	true: "真实",
	dual: "双属性"
};
function getPhaseLabel(phase) {
	return phase === "round_start" ? "回合开始" : phase === "before_action" ? "行动前" : phase === "extra_action" ? "额外行动" : "";
}
function getRoundPrefix(log, showWave) {
	return showWave ? `第${log.wave}波 回合${log.round}` : `回合${log.round}`;
}
function getSkillVerb(log) {
	return log.skillName.startsWith("被动-") || log.actionType === "passive" ? "触发" : log.actionType === "normal" ? "使用" : "释放";
}
function formatProbabilityText(probability) {
	return typeof probability === "number" && probability < 100 ? `${probability.toFixed(1)}%` : "";
}
/**
* 获取Buff来源文本
*/
function getBuffSourceText(buff) {
	if (buff.sourceSkillType === "passive") return `，来源：${buff.sourceUnitName ?? "未知"}的被动【${buff.sourceSkillName ?? buff.buffName}】`;
	if (buff.sourceSkillName) return `，来源：${buff.sourceUnitName ?? "未知"}的【${buff.sourceSkillName}】`;
	if (buff.sourceUnitName) return `，来源：${buff.sourceUnitName}`;
	return "";
}
/**
* 获取施加 Buff 的来源文本
*/
function getAppliedBuffSourceText(buff, actorId) {
	if (!buff.sourceUnitId || buff.sourceUnitId === actorId) return "";
	if (buff.sourceSkillType === "passive") return `，来源：${buff.sourceUnitName ?? "未知"}的被动【${buff.sourceSkillName ?? buff.buffName}】`;
	if (buff.sourceSkillName) return `，来源：${buff.sourceUnitName ?? "未知"}的【${buff.sourceSkillName}】`;
	return buff.sourceUnitName ? `，来源：${buff.sourceUnitName}` : "";
}
function getResourceParts(log) {
	const resourceParts = [];
	if (log.mpGain > 0) resourceParts.push(`灵力+${log.mpGain}`);
	if (log.念力Gain > 0) resourceParts.push(`念力+${log.念力Gain}`);
	return resourceParts;
}
function appendBattleLogDetails(md, log, showBuffs, indent = "  ") {
	const resourceParts = getResourceParts(log);
	if (resourceParts.length > 0) {
		md.addText(`${indent}↺ ${resourceParts.join("，")}`);
		md.addNewline();
	}
	if (log.damageResults && log.damageResults.length > 0) for (const dmg of log.damageResults) {
		if (dmg.isDodged) {
			const dodgeProbabilityText = formatProbabilityText(dmg.dodgeProbability);
			md.addText(`${indent}→ ${dmg.targetName} 💨闪避${dodgeProbabilityText ? `(${dodgeProbabilityText})` : ""}!`);
			md.addNewline();
			continue;
		}
		const damageType = DAMAGE_TYPE_MAP[dmg.damageType ?? ""] ?? dmg.damageType ?? "";
		let damageText = `${indent}→ ${dmg.targetName} 受到 ${dmg.actualDamage}`;
		if (damageType) damageText += ` ${damageType}伤害`;
		if ((dmg.shieldAbsorbed ?? 0) > 0) damageText += ` (护盾吸收${dmg.shieldAbsorbed})`;
		if (dmg.isCrit) {
			const critProbabilityText = formatProbabilityText(dmg.critProbability);
			damageText += ` 💥暴击${critProbabilityText ? `(${critProbabilityText})` : ""}!`;
		}
		if (dmg.isDead) damageText += " ☠️击败";
		md.addText(damageText);
		md.addNewline();
	}
	if (log.healResults && log.healResults.length > 0) for (const heal of log.healResults) {
		let healText = `${indent}✚ ${heal.targetName} 恢复 ${heal.actualHeal} 生命`;
		if (heal.overflow > 0) healText += ` (溢出${heal.overflow})`;
		md.addText(healText);
		md.addNewline();
	}
	if (showBuffs && log.appliedBuffs && log.appliedBuffs.length > 0) for (const buff of log.appliedBuffs) {
		const metaText = [buff.duration > 0 ? `${buff.duration}回合` : "", formatProbabilityText(buff.applyProbability)].filter(Boolean).join("，");
		md.addText(`${indent}✨ 对${buff.targetName}施加【${buff.buffName}】${metaText ? `（${metaText}）` : ""}${getAppliedBuffSourceText(buff, log.actor)}`);
		md.addNewline();
	}
	if (showBuffs && log.activeBuffs && log.activeBuffs.length > 0) for (const buff of log.activeBuffs) {
		const effectText = `${buff.effectValue >= 0 ? "+" : ""}${(buff.effectValue * 100).toFixed(1)}%`;
		let buffText = `${indent}🔮 ${buff.unitName}的【${buff.buffName}】生效`;
		if (buff.stacks > 1) buffText += `（${buff.stacks}层）`;
		buffText += `：${buff.effectType} ${effectText}${getBuffSourceText(buff)}`;
		md.addText(buffText);
		md.addNewline();
	}
}
function formatBattleActionGroup(logs, showBuffs, showWave) {
	const md = Format.createMarkdown();
	const firstLog = logs[0];
	const phaseLabel = getPhaseLabel(firstLog.phase);
	const roundPrefix = getRoundPrefix(firstLog, showWave);
	md.addText(`${roundPrefix}：〔${phaseLabel}〕`);
	md.addNewline();
	for (const log of logs) {
		const skillVerb = getSkillVerb(log);
		const resourceParts = getResourceParts(log);
		const summaryText = `${log.phase === "round_start" ? "↺" : "✨"} ${log.actorName} ${skillVerb}【${log.skillName}】${resourceParts.length > 0 ? `，${resourceParts.join("，")}` : ""}`;
		md.addText(`  ${summaryText}`);
		md.addNewline();
		appendBattleLogDetails(md, {
			...log,
			mpGain: 0,
			念力Gain: 0
		}, showBuffs, "    ");
	}
	return md;
}
/**
* 格式化单条战斗行动日志
* @param log 战斗行动日志
* @param showBuffs 是否显示Buff信息
* @returns FormatMarkDown 对象
*/
function formatBattleAction(log, showBuffs = true, showWave = true) {
	const md = Format.createMarkdown();
	const phaseLabel = getPhaseLabel(log.phase);
	const skillVerb = getSkillVerb(log);
	const phasePrefix = phaseLabel ? `〔${phaseLabel}〕` : "";
	const roundPrefix = getRoundPrefix(log, showWave);
	md.addText(`${roundPrefix}：${phasePrefix}${log.actorName} ${skillVerb}【${log.skillName}】`);
	md.addNewline();
	appendBattleLogDetails(md, log, showBuffs);
	return md;
}
/**
* 格式化战斗结果为 FormatMarkDown
* @param result 战斗结果
* @param options 格式化选项
* @returns FormatMarkDown 对象
*/
function formatBattleResult(result, options = {}) {
	const { maxActions = 10, showDetails = true, showFinalState = true, showPosition, showBuffs = true } = options;
	const md = Format.createMarkdown();
	md.addText("比试结果");
	md.addNewline();
	const sideACount = result.finalState.sideA.length;
	const sideBCount = result.finalState.sideB.length;
	const isTeamBattle = sideACount > 1 || sideBCount > 1;
	const showWave = result.totalWaves > 1;
	md.addNewline();
	md.addBlockquote(Format.createMarkdown().addText(`战斗类型：${sideACount}v${sideBCount}${isTeamBattle ? " （队伍战）" : ""}`).addNewline().addText(`胜利方：${result.winner === "A" ? "你方" : result.winner === "B" ? "对方" : "平局"}`).addNewline().addText(`总回合数：${result.totalRounds}`));
	if (showWave) md.addBlockquote(Format.createMarkdown().addText(`总波次：${result.totalWaves}`));
	const allyIds = new Set(result.finalState.sideA.map((unit) => unit.id));
	const gains = result.battleLog.reduce((total, action) => {
		if (allyIds.has(action.actor)) {
			total.mp += Number.isFinite(action.mpGain) ? Math.max(0, action.mpGain) : 0;
			total.mental += Number.isFinite(action.念力Gain) ? Math.max(0, action.念力Gain) : 0;
		}
		return total;
	}, {
		mp: 0,
		mental: 0
	});
	if (gains.mp > 0 || gains.mental > 0) md.addBlockquote(Format.createMarkdown().addText(`我方实际恢复：灵力 +${gains.mp} · 念力 +${gains.mental}（含境界效果）`));
	const stats = formatBattleStats(result);
	md.addBlockquote(Format.createMarkdown().addText(`我方总伤害：${stats.totalDamageA} | 总治疗：${stats.totalHealsA}`).addNewline().addText(`对方总伤害：${stats.totalDamageB} | 总治疗：${stats.totalHealsB}`));
	if (showDetails && result.battleLog.length > 0) {
		const keyActions = result.battleLog.slice(0, maxActions);
		for (let i = 0; i < keyActions.length; i++) {
			const log = keyActions[i];
			if (log.phase === "round_start" || log.phase === "before_action" || log.phase === "extra_action") {
				const groupedLogs = [log];
				while (i + 1 < keyActions.length && keyActions[i + 1].round === log.round && keyActions[i + 1].wave === log.wave && keyActions[i + 1].phase === log.phase) {
					groupedLogs.push(keyActions[i + 1]);
					i++;
				}
				md.absorb(formatBattleActionGroup(groupedLogs, showBuffs, showWave));
				continue;
			}
			md.absorb(formatBattleAction(log, showBuffs, showWave));
		}
		if (result.battleLog.length > maxActions) {
			md.addText(`...（还有 ${result.battleLog.length - maxActions} 条记录）`);
			md.addNewline();
		}
		md.addNewline();
	}
	if (showFinalState) {
		md.addText("最终状态");
		md.addNewline();
		const shouldShowPosition = showPosition ?? isTeamBattle;
		for (const unit of result.finalState.sideA) {
			const positionInfo = shouldShowPosition ? `[位置${unit.position}] ` : "";
			const status = unit.isDead ? " ☠️" : " ✓";
			md.addBlockquote(Format.createMarkdown().addText(`${positionInfo}${unit.name}：HP ${unit.hp}/${unit.maxHp}${status}`));
		}
		md.addNewline();
		for (const unit of result.finalState.sideB) {
			const positionInfo = shouldShowPosition ? `[位置${unit.position}] ` : "";
			const status = unit.isDead ? " ☠️" : " ✓";
			md.addBlockquote(Format.createMarkdown().addText(` ${positionInfo}${unit.name}：HP ${unit.hp}/${unit.maxHp}${status}`));
		}
	}
	return md;
}
/**
* 格式化简化版战斗结果（仅显示关键信息）
* @param result 战斗结果
* @returns FormatMarkDown 对象
*/
function formatBattleResultSimple(result) {
	const sideACount = result.finalState.sideA.length;
	const sideBCount = result.finalState.sideB.length;
	const md = Format.createMarkdown();
	md.addBold(`【战斗结束】${sideACount}v${sideBCount}`);
	md.addText(`胜利方：${result.winner === "A" ? "你方" : result.winner === "B" ? "对方" : "平局"}`);
	md.addNewline();
	md.addText(`回合数：${result.totalRounds}`);
	return md;
}
/**
* 格式化战斗统计信息
* @param result 战斗结果
* @returns 统计信息
*/
function formatBattleStats(result) {
	let totalDamageA = 0;
	let totalDamageB = 0;
	let totalHealsA = 0;
	let totalHealsB = 0;
	let killedByA = 0;
	let killedByB = 0;
	for (const log of result.battleLog) {
		const isASide = result.finalState.sideA.some((u) => u.id === log.actor);
		if (log.damageResults) {
			const totalDamage = log.damageResults.reduce((sum, dmg) => sum + dmg.actualDamage, 0);
			const kills = log.damageResults.filter((dmg) => dmg.isDead).length;
			if (isASide) {
				totalDamageA += totalDamage;
				killedByA += kills;
			} else {
				totalDamageB += totalDamage;
				killedByB += kills;
			}
		}
		if (log.healResults) {
			const totalHeal = log.healResults.reduce((sum, heal) => sum + heal.actualHeal, 0);
			if (isASide) totalHealsA += totalHeal;
			else totalHealsB += totalHeal;
		}
	}
	return {
		totalDamageA,
		totalDamageB,
		totalHealsA,
		totalHealsB,
		killedByA,
		killedByB
	};
}
/**
* 生成战斗摘要（用于列表展示）
* @param result 战斗结果
* @returns 战斗摘要文本
*/
function formatBattleSummary(result) {
	const stats = formatBattleStats(result);
	return [
		`${result.finalState.sideA.length}v${result.finalState.sideB.length}`,
		`回合${result.totalRounds}`,
		result.winner === "A" ? "✓胜利" : result.winner === "B" ? "✗失败" : "=平局",
		`伤害${stats.totalDamageA}`,
		`击杀${stats.killedByA}`
	].join(" | ");
}

//#endregion
export { formatBattleAction, formatBattleResult, formatBattleResultSimple, formatBattleStats, formatBattleSummary };