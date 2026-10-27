import { integer, list, object, text } from "./schema.js";
import { mutation } from "./mutation.js";
import { parseCheckInHub } from "../api/bot/checkin-hub.js";
import { parseLootboxOpen } from "../api/bot/lootbox-open.js";
import { parseDailyCheckIn, parseNewcomerCheckIn } from "../api/bot/daily-checkin.js";
import { parseEmailClaim } from "../api/bot/email-claim.js";
import { parseEmailClaimAll } from "../api/bot/email-claim-all.js";

//#region src/expose/common-actions.ts
const reward = object({
	name: text,
	amount: integer
});
const empty = object({});
const commonActions = {
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