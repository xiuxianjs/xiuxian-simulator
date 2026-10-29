import { boolean, fields, integer, list, object, text } from "./schema.js";
import { mutation, observation } from "./mutation.js";
import { parseDailyCheckIn, parseNewcomerCheckIn } from "../api/bot/daily-checkin.js";
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

//#region src/expose/common-actions.ts
const reward = object({
	name: text,
	amount: integer
});
const empty = object({});
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
	claim_daily_fortune: mutation("领取当前真实群的每日机缘；仅群内可用，多个群共享角色当日领取状态，以服务端结果为准。", "daily-fortune.claim", empty, object({
		date: text,
		tier: text,
		alreadyClaimed: boolean,
		...fields(integer, "poolVersion spiritStone spiritCrystal mentalPills qiPills")
	}), () => "/每日机缘", parseDailyFortune, (_input, event) => ({ target: dailyFortuneTarget(event) })),
	open_lootbox: mutation("开启指定礼盒，消耗库存并发放随机奖励；lootboxName 支持配置编号字符串或名称，单次 1..10 个，库存不足时以服务端 openCount 为准。", "lootboxes.open", object({
		lootboxName: {
			type: "string",
			minLength: 1
		},
		openCount: {
			type: "integer",
			minimum: 1,
			maximum: 10
		}
	}), object({
		lootboxName: text,
		openCount: integer,
		rewards: list(object({
			category: text,
			rewardId: integer,
			name: text,
			quantity: integer
		}))
	}), (input) => `/开启礼盒 ${input.lootboxName} ${input.openCount}`, parseLootboxOpen),
	checkin_daily: mutation("执行日常签到，返回服务端奖励或拒绝原因；重复调用沿用当前消息幂等键。", "checkin.daily", empty, object({
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
	]), () => "/日常签到", parseDailyCheckIn),
	checkin_newcomer: mutation("执行新人签到，由服务端判断资格并发放奖励。", "checkin.newcomer", empty, object({
		ritualText: text,
		accumulatedDays: integer,
		expireDate: text,
		issued: list(reward)
	}), () => "/新人签到", parseNewcomerCheckIn),
	checkin_celestial: mutation("执行登仙台签到；当前可签到时段可先通过 get_checkin_status 查询，返回服务端实际签到时段和奖励。", "checkin.celestial", empty, object({
		ritualText: text,
		signedSlots: list(text),
		issued: list(reward)
	}), () => "/登仙台签到", parseCelestialCheckIn),
	checkin_all: mutation("执行一键签到；逐项返回 done、skip、error，整体回执不代表每项成功。", "checkin.hub", empty, list(object({
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
	})), () => "/签到", parseCheckInHub),
	checkin_limited_event: mutation("执行限时活动签到；返回各活动实际签到天数与发放奖励，已签到或活动不可用时保留服务端反馈。", "checkin.limited-event", empty, object({ results: list(object({
		eventTitle: text,
		subTitle: text,
		dayIndex: integer,
		issued: list(object({
			...fields(text, "type name"),
			amount: integer
		}))
	})) }), () => "/活动签到", parseLimitedEventCheckin),
	redeem_gift_code: mutation("兑换指定礼包码；奖励按服务端回执发送邮件，兑换成功不代表附件已经领取。", "gift-codes.redeem", object({ code: {
		type: "string",
		minLength: 1
	} }), object({
		message: text,
		rewardSummary: list(text)
	}), (input) => `/礼包码 ${input.code.replace(/\s+/g, "").toUpperCase()}`, (data) => {
		const result = parseRobotGiftCode(data);
		if (result.code !== "CUSTOM_SUCCESS") throw new Error("礼包码兑换缺少结算回执");
		return {
			message: result.displayMsg,
			rewardSummary: result.rewardSummary
		};
	}, (input) => ({ code: input.code.replace(/\s+/g, "").toUpperCase() }), (input) => {
		if (!input.code.replace(/\s+/g, "")) throw new Error("礼包码不能为空");
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
	delete_read_emails: mutation("批量删除服务端允许删除的已读邮件，未领取附件的已读邮件会被跳过；以实际 deleted 和 total 回执为准。", "emails.delete-all", empty, object({
		deleted: integer,
		total: integer
	}), () => "/一键删除邮件", parseEmailDeleteAll),
	claim_email: mutation("领取指定邮件附件，服务端校验归属和领取状态。", "emails.claim", object({ emailId: {
		type: "integer",
		minimum: 1,
		maximum: Number.MAX_SAFE_INTEGER
	} }), object({
		emailId: integer,
		issued: list(object({
			type: text,
			name: text,
			amount: integer
		}))
	}), (input) => `/领取邮件 ${input.emailId}`, (data, input) => parseEmailClaim(data, input.emailId)),
	claim_all_emails: mutation("一键领取当前角色邮件附件，返回实际领取、跳过和总数。", "emails.claim-all", empty, object({
		claimed: integer,
		skipped: integer,
		total: integer
	}), () => "/一键领取邮件", parseEmailClaimAll)
};

//#endregion
export { commonActions };