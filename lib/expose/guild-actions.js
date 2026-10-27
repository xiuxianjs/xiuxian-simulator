import { boolean, fields, integer, number, object, text } from "./schema.js";
import { mutation } from "./mutation.js";
import { parseGuildCheckin } from "../api/bot/guild-checkin.js";
import { parseRobotGuildCheckin } from "../api/bot/guild-daily-robot-query.js";
import { parseGuildMining } from "../api/bot/guild-mining.js";
import { parseGuildStipend } from "../api/bot/guild-worship-stipend.js";
import { parseRobotGuildMining } from "../api/bot/guild-activity-robot-query.js";
import { parseRobotGuildStipend } from "../api/bot/guild-claims-robot-query.js";

//#region src/expose/guild-actions.ts
const guildActions = {
	checkin_guild: mutation("执行当前宗门签到，服务端校验成员与签到状态；返回实际贡献、声望、日周活跃及连续签到奖励。", "guild.checkin", object({}), object({
		message: text,
		receipt: object({
			message: text,
			...fields(integer, "guildId contributionAdded prestigeAdded dailyActivityAdded weeklyActivityAdded weeklyBonusSpiritStone weeklyCheckinCount")
		})
	}), () => "/宗门签到", (data) => {
		return {
			message: parseRobotGuildCheckin(data).data.message,
			receipt: parseGuildCheckin(data.receipt)
		};
	}),
	mine_guild: mutation("执行宗门采矿入口：开始采矿、查询进行中进度或结算已完成产出；检查 outcome、remainingSeconds、settledHours 和实际增量，不在机器人计算收益。", "guild.mining", object({}), object({
		message: text,
		receipt: object({
			outcome: {
				type: "string",
				enum: [
					"started",
					"in_progress",
					"settled"
				]
			},
			...fields(text, "message guildName"),
			...fields(integer, "guildId veinLevel miningQuota remainingSeconds settledHours spiritStoneAdded contributionAdded dailyActivityAdded"),
			started: boolean,
			capReached: boolean,
			baseSpiritStone: integer,
			spiritStoneBonus: integer,
			outputMultiplier: number
		}, [
			"baseSpiritStone",
			"spiritStoneBonus",
			"outputMultiplier"
		])
	}), () => "/宗门采矿", (data) => {
		return {
			message: parseRobotGuildMining(data).message,
			receipt: parseGuildMining(data.receipt)
		};
	}),
	claim_guild_stipend: mutation("领取本周宗门俸禄，资格、活跃和倍率由服务端计算；返回实际领取数与计算事实。", "guild.stipend-claim", object({}), object({
		message: text,
		receipt: object({
			...fields(integer, "guildId amount weeklyActivity guildLevel baseAmount"),
			...fields(number, "levelMultiplier activityMultiplier")
		})
	}), () => "/领取宗门俸禄", (data) => {
		return {
			message: parseRobotGuildStipend(data).message,
			receipt: parseGuildStipend(data.receipt)
		};
	})
};

//#endregion
export { guildActions };