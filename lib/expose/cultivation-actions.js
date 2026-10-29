import { requestBackend } from "../api/bot/client.js";
import { boolean, fields, integer, list, number, object, text } from "./schema.js";
import { mutation, observation } from "./mutation.js";
import { parseMeridianPulse } from "../api/bot/meridian.js";
import { query } from "./query.js";
import { parseMeditationBoostOptions, parseMeditationEnd, parseMeditationStart } from "../api/bot/meditation.js";
import { parseRealmBreakthrough } from "../api/bot/realm-breakthrough.js";

//#region src/expose/cultivation-actions.ts
const empty = object({});
const boost = object({
	billingMode: {
		type: "string",
		enum: ["prepaid", "settlement"]
	},
	...fields(integer, "estimatedCharge estimatedRefund budgetMinutes reservedStone consumedStone refundedStone remainingMinutes"),
	enabled: boolean,
	multiplier: number,
	endsAt: text
}, [
	"billingMode",
	"estimatedCharge",
	"estimatedRefund",
	"remainingMinutes",
	"endsAt"
]);
const benefits = {
	hasSeclusionPassBonus: boolean,
	maxDurationMinutes: integer,
	...fields(number, "qiBonusRate expBonusRate"),
	bonusLines: list(text),
	boost,
	success: boolean,
	...fields(text, "message elapsedText bonusLine"),
	elapsedMinutes: integer
};
const startFields = {
	...benefits,
	button: text,
	buttonText: text,
	alreadyMeditating: boolean,
	...fields(integer, "qiSoFar expSoFar dailyRemaining maxDurationHours"),
	config: object(fields(number, "QI_PER_INTERVAL INTERVAL_MINUTES DAILY_QI_CAP EXP_PER_ENERGY EXP_RECOVERY_EFFICIENCY RECOVERED_MENTAL_PER_INTERVAL EXP_PER_INTERVAL MAX_DURATION_MINUTES")),
	passPreview: object({
		maxDurationMinutes: integer,
		...fields(number, "qiBonusRate expBonusRate")
	})
};
const start = object(startFields, [
	"bonusLines",
	"boost",
	"button",
	"buttonText"
]);
const end = object({
	...benefits,
	...fields(integer, "qiGained expGained creditedExperience recoveredMental totalQi dailyQiGained dailyQiCap minimumRewardMinutes"),
	rewardNotice: text
}, [
	"bonusLines",
	"boost",
	"creditedExperience"
]);
const pulse = object({
	...fields(integer, "index phase phaseIndex normalPulsesRemaining Progress RequiredProgress progressBefore basePulseRemaining extraPulseRemaining trueQiRemaining dailyPulseRemaining"),
	...fields(text, "phaseName Name Category Description pulseBlockedReason"),
	...fields(boolean, "completed tailJumpEscalation phaseCompleted allCompleted canPulse jumped"),
	phases: list(object({
		...fields(integer, "phase totalCount completedCount"),
		name: text,
		...fields(boolean, "completed unlocked")
	})),
	config: object(fields(integer, "TOTAL_COUNT QI_PER_MERIDIAN PULSE_QI_COST PULSE_PROGRESS DAILY_PULSE_MAX DAILY_EXTRA_PULSE_MAX FOUNDATION_STAGE_LEVEL"))
});
const cultivationActions = {
	get_meditation_progress: query("查询闭关进度和服务端收益预估；不会启动或结算，预估不代表实际入账。reason 区分未开始和进行中。", object({
		...startFields,
		reason: {
			type: "string",
			enum: ["not_started", "active"]
		}
	}, [
		"bonusLines",
		"boost",
		"button",
		"buttonText"
	]), async ({ bid, uid, request }) => {
		const raw = await requestBackend(bid, "get_players_id_meditation_progress", {
			path: { id: uid },
			...request
		});
		const reason = raw?.reason;
		if (reason !== "not_started" && reason !== "active") throw new Error("闭关进度状态不完整");
		return {
			...parseMeditationStart(raw),
			reason
		};
	}),
	get_meditation_boost_options: observation("查询闭关自动加速设置、倍率、每结算周期灵石费用和余额。经过服务端准入，可能结算常规资源；不购买加速、不修改设置。", "meditation.boost-options", empty, object({
		...fields(boolean, "autoEnabled enabled"),
		...fields(integer, "pricePerInterval intervalMinutes spiritStone maxHours"),
		multiplier: number
	}), () => "/闭关加速", (data) => ({
		...parseMeditationBoostOptions(data),
		intervalMinutes: data.intervalMinutes
	})),
	start_meditation: mutation("开始闭关；已经闭关则返回当前进度。遵循玩家现有自动加速设置，可能在出关时消耗灵石；先查询加速设置，不表示免费修炼。检查 result.success。", "meditation.start", empty, start, () => "/闭关", parseMeditationStart),
	end_meditation: mutation("结束闭关并由服务端结算收益及灵石加速费用，返回实际入账、恢复和费用；检查 result.success，未达到奖励时长可能无收益。", "meditation.end", empty, end, () => "/出关", parseMeditationEnd),
	pulse_meridian: mutation("执行一次冲脉，消耗服务端规定的真气和次数；返回实际进度、跳脉、剩余次数及后续资格，不自动连续冲脉。", "meridians.pulse", empty, pulse, () => "/冲脉", parseMeridianPulse),
	breakthrough_realm: mutation("执行一次境界突破，由服务端检查修为和资格并结算，返回新境界、解锁丹方及师门提示。", "realm.breakthrough", empty, object({
		newRealm: object({
			name: text,
			...fields(number, "level spiritualPower speed magicAttack physicalAttack magicDefense physicalDefense experienceLimit")
		}),
		message: text,
		unlockedRecipes: list(text),
		isNewStage: boolean,
		newStageName: text,
		masterStageMessages: list(text)
	}), () => "/突破", parseRealmBreakthrough)
};

//#endregion
export { cultivationActions };