import { repeatPresentationHeaders } from "./repeat-presentation.js";
import { requestBackend, writeContext } from "./client.js";
import { parseNormalExperienceGained, parseTreasureEffects } from "./treasure-effects.js";

//#region src/api/bot/meditation.ts
function record(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("闭关接口返回不完整，请更新服务端后重试");
	return value;
}
function numeric(value, integer = false) {
	if (typeof value !== "number" || (integer ? !Number.isSafeInteger(value) : !Number.isFinite(value))) throw new Error("闭关接口返回不完整，请更新服务端后重试");
	return value;
}
function text(value) {
	if (typeof value !== "string") throw new Error("闭关接口返回不完整，请更新服务端后重试");
	return value;
}
function flag(value) {
	if (typeof value !== "boolean") throw new Error("闭关接口返回不完整，请更新服务端后重试");
	return value;
}
function benefits(row) {
	return {
		hasSeclusionPassBonus: flag(row.hasSeclusionPassBonus),
		maxDurationMinutes: numeric(row.maxDurationMinutes, true),
		qiBonusRate: numeric(row.qiBonusRate),
		expBonusRate: numeric(row.expBonusRate)
	};
}
async function guardBackendMeditationCommand(bid, uid, command) {
	const row = record(await requestBackend(bid, "post_players_id_meditation_guard", {
		path: { id: uid },
		body: { command }
	}));
	return {
		active: flag(row.active),
		allowed: flag(row.allowed)
	};
}
async function startBackendMeditation(bid, uid, request, repeatCommand) {
	return parseMeditationStart(record(await requestBackend(bid, "post_players_id_meditation_start", {
		path: { id: uid },
		headers: repeatPresentationHeaders(repeatCommand),
		...repeatCommand?.match(/灵石\s+(\d+)$/) ? { body: { boostHours: Number(repeatCommand.match(/灵石\s+(\d+)$/)?.[1]) } } : {},
		...writeContext(request)
	})));
}
function parseBonusLines(value) {
	if (!Array.isArray(value)) throw new Error("闭关加成数据不完整");
	return value.map(text);
}
function parseBoost(value) {
	const row = record(value);
	return {
		...row.estimatedCharge === void 0 ? {} : { estimatedCharge: numeric(row.estimatedCharge, true) },
		...row.estimatedRefund === void 0 ? {} : { estimatedRefund: numeric(row.estimatedRefund, true) },
		...row.billingMode === "settlement" || row.billingMode === "prepaid" ? { billingMode: row.billingMode } : {},
		enabled: flag(row.enabled),
		multiplier: numeric(row.multiplier),
		budgetMinutes: numeric(row.budgetMinutes, true),
		reservedStone: numeric(row.reservedStone, true),
		consumedStone: numeric(row.consumedStone, true),
		refundedStone: numeric(row.refundedStone, true),
		...row.endsAt === void 0 ? {} : { endsAt: text(row.endsAt) },
		...row.remainingMinutes === void 0 ? {} : { remainingMinutes: numeric(row.remainingMinutes, true) }
	};
}
function parseMeditationBoostOptions(value) {
	const row = record(value);
	return {
		autoEnabled: row.autoEnabled === true,
		enabled: flag(row.enabled),
		pricePerInterval: numeric(row.pricePerInterval, true),
		multiplier: numeric(row.multiplier),
		spiritStone: numeric(row.spiritStone, true),
		maxHours: numeric(row.maxHours, true)
	};
}
function parseMeditationStart(value) {
	const row = record(value);
	const config = record(row.config);
	const preview = record(row.passPreview);
	return {
		...benefits(row),
		...row.bonusLines === void 0 ? {} : { bonusLines: parseBonusLines(row.bonusLines) },
		...row.boost === null || row.boost === void 0 ? {} : { boost: parseBoost(row.boost) },
		success: flag(row.success),
		message: text(row.message),
		...row.button === void 0 ? {} : { button: text(row.button) },
		...row.buttonText === void 0 ? {} : { buttonText: text(row.buttonText) },
		alreadyMeditating: flag(row.alreadyMeditating),
		elapsedMinutes: numeric(row.elapsedMinutes, true),
		qiSoFar: numeric(row.qiSoFar, true),
		expSoFar: numeric(row.expSoFar, true),
		dailyRemaining: numeric(row.dailyRemaining, true),
		maxDurationHours: numeric(row.maxDurationHours, true),
		elapsedText: text(row.elapsedText),
		bonusLine: text(row.bonusLine),
		config: {
			QI_PER_INTERVAL: numeric(config.QI_PER_INTERVAL),
			INTERVAL_MINUTES: numeric(config.INTERVAL_MINUTES),
			DAILY_QI_CAP: numeric(config.DAILY_QI_CAP),
			EXP_PER_ENERGY: numeric(config.EXP_PER_ENERGY),
			EXP_RECOVERY_EFFICIENCY: numeric(config.EXP_RECOVERY_EFFICIENCY),
			RECOVERED_MENTAL_PER_INTERVAL: numeric(config.RECOVERED_MENTAL_PER_INTERVAL),
			EXP_PER_INTERVAL: numeric(config.EXP_PER_INTERVAL),
			MAX_DURATION_MINUTES: numeric(config.MAX_DURATION_MINUTES)
		},
		passPreview: {
			maxDurationMinutes: numeric(preview.maxDurationMinutes, true),
			qiBonusRate: numeric(preview.qiBonusRate),
			expBonusRate: numeric(preview.expBonusRate)
		}
	};
}
async function settleBackendMeditation(bid, uid, request, repeatCommand) {
	return parseMeditationEnd(record(await requestBackend(bid, "post_players_id_meditation_settle", {
		path: { id: uid },
		headers: repeatPresentationHeaders(repeatCommand),
		...writeContext(request)
	})));
}
function parseMeditationEnd(value) {
	const row = record(value);
	return {
		treasureEffects: parseTreasureEffects(row.treasureEffects),
		normalExperienceGained: parseNormalExperienceGained(row.normalExperienceGained),
		...benefits(row),
		...row.bonusLines === void 0 ? {} : { bonusLines: parseBonusLines(row.bonusLines) },
		...row.boost === null || row.boost === void 0 ? {} : { boost: parseBoost(row.boost) },
		success: flag(row.success),
		message: text(row.message),
		elapsedMinutes: numeric(row.elapsedMinutes, true),
		qiGained: numeric(row.qiGained, true),
		expGained: numeric(row.expGained, true),
		...row.creditedExperience === void 0 ? {} : { creditedExperience: numeric(row.creditedExperience, true) },
		recoveredMental: numeric(row.recoveredMental, true),
		totalQi: numeric(row.totalQi, true),
		dailyQiGained: numeric(row.dailyQiGained, true),
		dailyQiCap: numeric(row.dailyQiCap, true),
		minimumRewardMinutes: numeric(row.minimumRewardMinutes, true),
		elapsedText: text(row.elapsedText),
		bonusLine: text(row.bonusLine),
		rewardNotice: text(row.rewardNotice)
	};
}

//#endregion
export { guardBackendMeditationCommand, parseMeditationBoostOptions, parseMeditationEnd, parseMeditationStart, settleBackendMeditation, startBackendMeditation };