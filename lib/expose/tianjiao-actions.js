import { boolean, fields, integer, list, number, object, text } from "./schema.js";
import { mutation, observation } from "./mutation.js";
import { parseTianjiaoLeaderboard } from "../api/bot/tianjiao-leaderboard-queries.js";
import { parseTianjiaoRewards } from "../api/bot/tianjiao-rewards-queries.js";
import { parseTianjiaoChallenge } from "../api/bot/tianjiao-challenge.js";

//#region src/expose/tianjiao-actions.ts
const empty = object({});
const unit = object({
	name: text,
	hp: integer,
	maxHp: integer,
	isDead: boolean
});
const tianjiaoActions = {
	get_tianjiao_leaderboard: observation("查询登天梯榜单、开放条件、本人排名、剩余次数与建议目标；能否挑战以服务端为准。", "tianjiao.leaderboard", empty, object({
		...fields(boolean, "isVisible canChallenge"),
		...fields(text, "lockedMessage requiredText requiredRealmName stageName"),
		stageLevel: integer,
		attemptsLeft: number,
		myRank: integer,
		suggestedTarget: integer,
		entries: list(object({
			rank: integer,
			occupied: boolean,
			userName: text,
			realmName: text,
			power: integer,
			isMe: boolean,
			userId: integer
		}, ["userId"]))
	}, ["myRank", "suggestedTarget"]), () => "/登天梯", parseTianjiaoLeaderboard),
	get_tianjiao_rewards: observation("查询登天梯当前奖励档位和本人领取记录；挑战时发放的奖励以服务端结果为准。", "tianjiao.rewards", empty, object({
		isVisible: boolean,
		stageLevel: integer,
		stageName: text,
		view: object({
			lockedMessage: text,
			recordTotal: integer,
			tiers: list(object({
				rank: integer,
				rewardText: text,
				claimedAt: text
			}, ["claimedAt"])),
			records: list(object({
				stageLevel: integer,
				stageName: text,
				rank: integer,
				rewardText: text,
				claimedAt: text
			}))
		})
	}), () => "/登天奖励", parseTianjiaoRewards),
	challenge_tianjiao: mutation("挑战指定登天梯排名，空位可能直接占位；消耗次数与奖励以服务端回执为准，同一原消息重试保持幂等。", "tianjiao.challenge", object({ rank: {
		type: "integer",
		minimum: 1,
		maximum: Number.MAX_SAFE_INTEGER
	} }), object({
		success: boolean,
		message: text,
		oldRank: integer,
		newRank: integer,
		directOccupy: boolean,
		rewardText: text,
		logId: text,
		battle: object({
			rounds: integer,
			sideA: list(unit),
			sideB: list(unit)
		})
	}, [
		"oldRank",
		"newRank",
		"logId",
		"battle"
	]), (input) => `/登天挑战 ${input.rank}`, (data) => {
		const receipt = parseTianjiaoChallenge(data);
		if (!receipt.success) throw new Error("登天挑战回执无效");
		return receipt;
	}, (input) => ({ rankArg: String(input.rank) }))
};

//#endregion
export { tianjiaoActions };