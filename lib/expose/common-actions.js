import { boolean, fields, integer, list, object, text } from "./schema.js";
import { intentIdSchema, mutation, observation, taskInputSchema, validateIntentId } from "./mutation.js";
import { parseDailyCheckIn, parseNewcomerCheckIn } from "../api/bot/daily-checkin.js";
import { lootboxOpenResult } from "./lootbox-schema.js";
import { parseCheckInHub } from "../api/bot/checkin-hub.js";
import { dailyFortuneTarget, parseDailyFortune } from "../api/bot/daily-fortune.js";
import { parseLootboxOpen } from "../api/bot/lootbox-open.js";
import { parseLimitedEventCheckin } from "../api/bot/limited-event-checkin.js";
import { parseRobotGiftCode } from "../api/bot/gift-code-robot-query.js";
import { parseEmailDetail } from "../api/bot/email-detail.js";
import { parseEmailDelete } from "../api/bot/email-delete.js";
import { parseEmailDeleteAll } from "../api/bot/email-delete-all.js";
import { parseEmailClaim } from "../api/bot/email-claim.js";
import { parseEmailClaimAll } from "../api/bot/email-claim-all.js";
import { parseCelestialCheckIn } from "../api/bot/celestial-checkin.js";
import { parseCheckInView } from "../api/bot/checkin-view.js";
import { ExposeError } from "alemonjs";

//#region src/expose/common-actions.ts
const reward = object({
	name: text,
	amount: integer
});
const calendarScopes = {
	overview: "概览",
	daily: "日常",
	dates: "日期",
	milestones: "累计",
	newcomer: "新人",
	event: "活动",
	carnival: "狂欢",
	celestial: "时段"
};
const calendarButton = object({
	label: text,
	command: text
});
const treasureSelectionId = {
	type: "integer",
	minimum: 1,
	maximum: Number.MAX_SAFE_INTEGER
};
function validateLootboxSelection(input) {
	validateIntentId(input.intentId);
	if (input.treasureId !== void 0 && (!Number.isSafeInteger(input.treasureId) || input.treasureId < 1 || input.openCount !== 1)) throw new ExposeError("INVALID_INPUT", "自选宝盒每次只能开启1个，宝物ID必须为正整数");
}
const commonActions = {
	get_checkin_calendar: observation("查询签到概览或各类签到日历及奖励预览；dates 可指定页码，省略时由服务端选择当前页。不会执行签到。", "checkin.view", object({
		scope: {
			type: "string",
			enum: Object.keys(calendarScopes)
		},
		page: {
			type: "integer",
			minimum: 1,
			maximum: 100
		}
	}, ["page"]), object({
		title: text,
		blocks: list(object({
			text,
			buttons: list(calendarButton)
		})),
		buttons: list(calendarButton)
	}), (input) => input.scope === "overview" ? "/签到概览" : `/签到日历 ${calendarScopes[input.scope]}${input.page ? ` ${input.page}` : ""}`, parseCheckInView, (input) => ({
		scope: input.scope,
		page: input.page ?? 0
	})),
	claim_daily_fortune: mutation("领取当前真实群的每日机缘；仅群内可用，多个群共享角色当日领取状态，以服务端结果为准。", "daily-fortune.claim", object({
		intentId: intentIdSchema,
		taskInput: taskInputSchema
	}, ["intentId", "taskInput"]), object({
		date: text,
		tier: text,
		alreadyClaimed: boolean,
		...fields(integer, "poolVersion spiritStone spiritCrystal mentalPills qiPills")
	}), () => "/每日机缘", parseDailyFortune, (_input, event) => ({ target: dailyFortuneTarget(event) }), (input) => validateIntentId(input.intentId), {
		intentId: (input) => input.intentId,
		taskInput: (input) => input.taskInput
	}),
	open_lootbox_by_id: mutation("按礼盒配置ID开启。自选宝盒未传treasureId时仅返回候选、不消耗；传查询返回的treasureId时开启1盒，可选已拥有宝物，不计探索及保底。随机礼盒行为不变；同次重试沿用原intentId。", "lootboxes.open", object({
		lootboxId: {
			type: "integer",
			minimum: 1,
			maximum: Number.MAX_SAFE_INTEGER
		},
		openCount: {
			type: "integer",
			minimum: 1,
			maximum: 10
		},
		treasureId: treasureSelectionId,
		intentId: intentIdSchema
	}, ["intentId", "treasureId"]), lootboxOpenResult, (input) => `/开启礼盒 ${input.lootboxId} ${input.openCount}${input.treasureId === void 0 ? "" : ` ${input.treasureId}`}`, parseLootboxOpen, (input) => ({
		lootboxId: input.lootboxId,
		lootboxName: "",
		openCount: input.openCount,
		...input.treasureId === void 0 ? {} : { treasureId: input.treasureId }
	}), validateLootboxSelection, { intentId: (input) => input.intentId }),
	open_lootbox: mutation("开启指定礼盒。自选宝盒未传treasureId时只预览不消耗，传候选ID且openCount=1才发完整宝物，允许重复且不计探索保底。随机礼盒行为不变；同次重试沿用原intentId；连锁任务保留taskInput。", "lootboxes.open", object({
		lootboxName: {
			type: "string",
			minLength: 1
		},
		openCount: {
			type: "integer",
			minimum: 1,
			maximum: 10
		},
		treasureId: treasureSelectionId,
		intentId: intentIdSchema,
		taskInput: taskInputSchema
	}, [
		"intentId",
		"taskInput",
		"treasureId"
	]), lootboxOpenResult, (input) => `/开启礼盒 ${input.lootboxName} ${input.openCount}${input.treasureId === void 0 ? "" : ` ${input.treasureId}`}`, parseLootboxOpen, (input) => ({
		lootboxName: input.lootboxName,
		openCount: input.openCount,
		...input.treasureId === void 0 ? {} : { treasureId: input.treasureId }
	}), validateLootboxSelection, {
		intentId: (input) => input.intentId,
		taskInput: (input) => input.taskInput
	}),
	checkin_daily: mutation("执行日常签到，返回服务端奖励或拒绝原因；重复调用沿用当前消息幂等键。 连锁任务可传入一致的 taskInput，分别检查任务和签到回执。", "checkin.daily", object({ taskInput: taskInputSchema }, ["taskInput"]), object({
		ritualText: text,
		accumulatedDays: integer,
		issued: list(reward),
		dateIssued: list(reward),
		accumulatedIssued: list(reward),
		progressText: text,
		titleMessage: text
	}, [
		"dateIssued",
		"accumulatedIssued",
		"progressText",
		"titleMessage"
	]), () => "/日常签到", parseDailyCheckIn, () => ({}), void 0, { taskInput: (input) => input.taskInput }),
	checkin_newcomer: mutation("执行新人签到，由服务端判断资格并发放奖励。 连锁任务可传入一致的 taskInput，分别检查任务和签到回执。", "checkin.newcomer", object({ taskInput: taskInputSchema }, ["taskInput"]), object({
		ritualText: text,
		accumulatedDays: integer,
		expireDate: text,
		issued: list(reward)
	}), () => "/新人签到", parseNewcomerCheckIn, () => ({}), void 0, { taskInput: (input) => input.taskInput }),
	checkin_celestial: mutation("执行登仙台签到；当前可签到时段可先通过 get_checkin_status 查询，返回服务端实际签到时段和奖励。 连锁任务可传入一致的 taskInput，分别检查任务和签到回执。", "checkin.celestial", object({ taskInput: taskInputSchema }, ["taskInput"]), object({
		ritualText: text,
		signedSlots: list(text),
		issued: list(reward)
	}), () => "/登仙台签到", parseCelestialCheckIn, () => ({}), void 0, { taskInput: (input) => input.taskInput }),
	checkin_all: mutation("执行一键签到；逐项返回 done、skip、error，整体回执不代表每项成功。连锁任务当前步骤为签到时可传入原 taskInput，服务端先推进任务再执行签到；查看 taskContinuation 和业务结果。相同消息中新操作使用新 intentId，重试沿用原编号。", "checkin.hub", object({
		taskInput: {
			type: "string",
			minLength: 1,
			maxLength: 200
		},
		intentId: intentIdSchema
	}, ["taskInput", "intentId"]), list(object({
		name: text,
		status: {
			type: "string",
			enum: [
				"done",
				"skip",
				"error"
			]
		},
		message: text
	})), (input) => {
		if (input.taskInput === void 0) return "/签到";
		const command = input.taskInput.trim().replace(/^[!！/#＃]\s*/, "").trim();
		if (!["签到", "一键签到"].includes(command)) throw new ExposeError("INVALID_INPUT", "签到任务指令不匹配");
		return `/${command}`;
	}, parseCheckInHub, () => ({}), (input) => validateIntentId(input.intentId), {
		taskInput: (input) => input.taskInput,
		intentId: (input) => input.intentId
	}),
	checkin_limited_event: mutation("执行限时活动签到；返回各活动实际签到天数与发放奖励，已签到或活动不可用时保留服务端反馈。 连锁任务可传入一致的 taskInput，分别检查任务和签到回执。", "checkin.limited-event", object({ taskInput: taskInputSchema }, ["taskInput"]), object({ results: list(object({
		eventTitle: text,
		subTitle: text,
		dayIndex: integer,
		issued: list(object({
			...fields(text, "type name"),
			amount: integer
		}))
	})) }), () => "/活动签到", parseLimitedEventCheckin, () => ({}), void 0, { taskInput: (input) => input.taskInput }),
	redeem_gift_code: mutation("兑换指定礼包码；奖励按服务端回执发送邮件，兑换成功不代表附件已经领取。同消息新操作使用新 intentId，同次重试沿用原编号。", "gift-codes.redeem", object({
		code: {
			type: "string",
			minLength: 1
		},
		intentId: intentIdSchema,
		taskInput: taskInputSchema
	}, ["intentId", "taskInput"]), object({
		message: text,
		rewardSummary: list(text)
	}), (input) => input.taskInput === void 0 ? `/礼包码 ${input.code.replace(/\s+/g, "").toUpperCase()}` : `/${input.taskInput.trim().replace(/^[!！/#＃]\s*/, "")}`, (data) => {
		const result = parseRobotGiftCode(data);
		if (result.code !== "CUSTOM_SUCCESS") throw new Error("礼包码兑换缺少结算回执");
		return {
			message: result.displayMsg,
			rewardSummary: result.rewardSummary
		};
	}, (input) => ({ code: input.code.replace(/\s+/g, "").toUpperCase() }), (input) => {
		validateIntentId(input.intentId);
		if (!input.code.replace(/\s+/g, "")) throw new ExposeError("INVALID_INPUT", "礼包码不能为空");
		if (input.taskInput !== void 0) {
			if (input.taskInput.trim().replace(/^[!！/#＃]\s*/, "").match(/^(?:礼包码|礼品码)\s+(.+)$/u)?.[1].replace(/\s+/g, "").toUpperCase() !== input.code.replace(/\s+/g, "").toUpperCase()) throw new ExposeError("INVALID_INPUT", "任务步骤必须为礼包码或礼品码指令，且兑换码一致");
		}
	}, {
		intentId: (input) => input.intentId,
		taskInput: (input) => input.taskInput
	}),
	get_email_detail: observation("查看本人指定邮件详情并将未读邮件标记为已读；不会领取附件。goodsJson 原样表示服务端附件 JSON，资格以 canClaim、canDelete 为准。", "emails.detail", object({ emailId: {
		type: "integer",
		minimum: 1,
		maximum: Number.MAX_SAFE_INTEGER
	} }), object({
		emailId: integer,
		name: text,
		subtitle: text,
		data: text,
		time: text,
		state: integer,
		goodsJson: text,
		canClaim: boolean,
		canDelete: boolean
	}, [
		"name",
		"subtitle",
		"data"
	]), (input) => `/查看邮件 ${input.emailId}`, (data, input) => {
		const row = parseEmailDetail(data, input.emailId);
		return {
			...row,
			emailId: row.id,
			goodsJson: JSON.stringify(row.goods)
		};
	}, (input) => ({
		idText: String(input.emailId),
		idValue: String(input.emailId)
	})),
	delete_email: mutation("删除指定本人邮件：若附件尚未领取，首次操作返回确认窗口；已有有效确认时再次调用会删除，须由用户新的明确请求确认。", "emails.delete", object({ emailId: {
		type: "integer",
		minimum: 1,
		maximum: Number.MAX_SAFE_INTEGER
	} }), object({
		emailId: integer,
		deleted: boolean,
		confirmationRequired: boolean,
		confirmationExpiresInSeconds: integer
	}, ["confirmationRequired", "confirmationExpiresInSeconds"]), (input) => `/删除邮件 ${input.emailId}`, (data, input) => parseEmailDelete(data, input.emailId), (input) => input),
	delete_read_emails: mutation("批量删除服务端允许删除的已读邮件，未领取附件的已读邮件会被跳过；以实际 deleted 和 total 回执为准。同消息新操作使用新 intentId，同次重试沿用原编号。", "emails.delete-all", object({
		intentId: intentIdSchema,
		taskInput: taskInputSchema
	}, ["intentId", "taskInput"]), object({
		deleted: integer,
		total: integer
	}), () => "/一键删除邮件", parseEmailDeleteAll, () => ({}), (input) => validateIntentId(input.intentId), {
		intentId: (input) => input.intentId,
		taskInput: (input) => input.taskInput
	}),
	claim_email: mutation("领取指定邮件附件，服务端校验归属和领取状态。", "emails.claim", object({
		emailId: {
			type: "integer",
			minimum: 1,
			maximum: Number.MAX_SAFE_INTEGER
		},
		intentId: intentIdSchema,
		taskInput: taskInputSchema
	}, ["intentId", "taskInput"]), object({
		emailId: integer,
		issued: list(object({
			type: text,
			name: text,
			amount: integer
		}))
	}), (input) => `/领取邮件 ${input.emailId}`, (data, input) => parseEmailClaim(data, input.emailId), (input) => ({ emailId: input.emailId }), (input) => validateIntentId(input.intentId), {
		intentId: (input) => input.intentId,
		taskInput: (input) => input.taskInput
	}),
	claim_all_emails: mutation("一键领取当前角色邮件附件，返回实际领取、跳过和总数。结果未知时先核对邮件状态；同消息中新的领取使用新 intentId，重试原请求沿用原编号。 连锁任务可传入一致的 taskInput，分别检查任务和领取回执。", "emails.claim-all", object({
		intentId: intentIdSchema,
		taskInput: taskInputSchema
	}, ["intentId", "taskInput"]), object({
		claimed: integer,
		skipped: integer,
		total: integer
	}), () => "/一键领取邮件", parseEmailClaimAll, () => ({}), (input) => validateIntentId(input.intentId), {
		intentId: (input) => input.intentId,
		taskInput: (input) => input.taskInput
	})
};

//#endregion
export { commonActions };