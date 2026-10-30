import { boolean, fields, integer, list, number, object, text } from "./schema.js";
import { intentIdSchema, mutation, observation, taskInputSchema, validateIntentId } from "./mutation.js";
import { parseRobberyRecords } from "../api/bot/robbery-records.js";
import { parseBackendEnemies } from "../api/bot/queries.js";
import { parseRobotSpar } from "../api/bot/spar.js";
import { parseBackendKillGodRanking, parseRobotKillGodTitleClaim, parseRobotShaQi } from "../api/bot/shaqi-queries.js";

//#region src/expose/pvp-actions.ts
const id = {
	type: "integer",
	minimum: 1,
	maximum: Number.MAX_SAFE_INTEGER
};
const unit = object({
	...fields(text, "id name"),
	...fields(integer, "hp maxHp position"),
	isDead: boolean
});
const shaQi = object({
	...fields(number, "shaQi killGodThreshold dailyDecayAmount jinpenReduceAmount"),
	onKillGodList: boolean
});
const record = object({
	...fields(integer, "id attackerUid stoneReward crystalReward droppedItemQty targetShaQi pkEventId"),
	...fields(text, "attackerName droppedItemName createdAt attackerDisplayName typeText resultText lossText dropText pkState pkDeliveryState counterDeadline counterStatusText battleLogId"),
	...fields(boolean, "isWin isCounterAttack isBounty canCounterAttack")
}, [
	"attackerName",
	"droppedItemName",
	"pkEventId",
	"pkState",
	"pkDeliveryState",
	"counterDeadline",
	"counterStatusText",
	"battleLogId"
]);
const pvpActions = {
	spar_with_player: mutation("与指定玩家比试；batch=true 请求服务端批量比试，实际场次、元力消耗和修为以结算回执为准。同消息新比试使用新 intentId，同次重试沿用原编号；可传入一致的 taskInput，分别检查任务推进和战斗结果。", "pvp.spar", object({
		targetUid: id,
		batch: boolean,
		intentId: intentIdSchema,
		taskInput: taskInputSchema
	}, [
		"batch",
		"intentId",
		"taskInput"
	]), object({
		...fields(integer, "targetUid settledCount experience qiCost dailyMax newCount expGain"),
		...fields(text, "logId expBonusText"),
		proficiencyResult: object({
			gained: boolean,
			points: integer
		}),
		battleResult: object({
			totalRounds: integer,
			totalWaves: integer,
			winner: text,
			finalState: object({
				sideA: list(unit),
				sideB: list(unit)
			})
		})
	}), (input) => `/${input.batch ? "十连比试" : "比试"} ${input.targetUid}`, (data, input) => {
		const result = parseRobotSpar(data);
		if (result.targetUid !== input.targetUid) throw new Error("比试目标回执不匹配");
		return {
			...result,
			qiCost: result.hpCost
		};
	}, (input) => ({
		targetUid: String(input.targetUid),
		...input.batch ? { batch: true } : {}
	}), (input) => validateIntentId(input.intentId), {
		intentId: (input) => input.intentId,
		taskInput: (input) => input.taskInput
	}),
	get_robbery_records: observation("分页查询本人打劫记录及回击资格；服务端会更新相关通知的已读状态。", "pvp.records", object({ page: {
		type: "integer",
		minimum: 1,
		maximum: 100
	} }, ["page"]), object({
		...fields(integer, "currentPage totalPages total"),
		records: list(record)
	}), (input) => `/打劫记录 ${input.page ?? 1}`, parseRobberyRecords, (input) => ({ page: input.page ?? 1 })),
	get_enemies: observation("查询对本人发起过打劫的玩家、最近记录和回击状态；可回击与否以服务端最新记录为准。", "pvp.enemies", object({}), object({ enemies: list(object({
		...fields(integer, "uid totalAttacks lastLogId"),
		...fields(text, "name lastAttackTime"),
		reports: list(record)
	}, ["reports"])) }), () => "/仇人", (data) => ({ enemies: parseBackendEnemies(data).map((row) => ({
		...row,
		lastAttackTime: row.lastAttackTime.toISOString()
	})) })),
	get_sha_qi: observation("查询本人煞气、榜单门槛和每日衰减规则。", "pvp.sha-qi", object({}), shaQi, () => "/煞气", parseRobotShaQi),
	get_kill_god_ranking: observation("查询杀神榜、本人煞气、打劫次数和称号领取资格。", "pvp.kill-god-ranking", object({}), object({
		list: list(object({
			...fields(number, "rank uid shaQi"),
			name: text
		})),
		shaQiInfo: shaQi,
		...fields(number, "robberyRemaining robberyDailyMax streak streakBonusPercent killGodThreshold"),
		...fields(text, "streakText rankingRuleText"),
		...fields(boolean, "hasKillGodTitle canClaimTitle")
	}, ["shaQiInfo"]), () => "/杀神榜", parseBackendKillGodRanking),
	claim_kill_god_title: mutation("领取符合服务端榜单条件的杀神称号；排名、人数和重复领取由服务端校验。", "pvp.kill-god-title-claim", object({}), object({ code: {
		type: "string",
		enum: ["OK"]
	} }), () => "/领取杀神称号", (data) => ({ code: parseRobotKillGodTitleClaim(data) }))
};

//#endregion
export { pvpActions };