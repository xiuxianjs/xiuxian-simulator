import { requestBackend } from "../api/bot/client.js";
import { boolean, fields, integer, list, number, object, text } from "./schema.js";
import { intentIdSchema, mutation, observation, taskInputSchema, validateIntentId } from "./mutation.js";
import { query } from "./query.js";
import { parseRobotRealmRanking, parseRobotRegionalRealmRanking } from "../api/bot/realm-ranking-queries.js";
import { parseRobotPopularity } from "../api/bot/popularity-queries.js";
import { parseBackendScarecrow } from "../api/bot/scarecrow.js";
import { parseRobotBattleLog } from "../api/bot/battle-log-query.js";
import { parseTowerRanking } from "../api/bot/tower-ranking-queries.js";
import { parseStorylineRankingQuery } from "../api/bot/storyline-ranking-queries.js";
import { parseAlchemyRanking } from "../api/bot/alchemy-ranking-queries.js";
import { parseRobotPopularityLike } from "../api/bot/popularity-like.js";
import { parseReset, parseRobotDemonTowerBuff, parseSweep } from "../api/bot/demon-tower-actions.js";
import { parseRobotDemonTowerChallenge } from "../api/bot/demon-tower-challenge-robot-query.js";
import { parseDemonTowerInfo } from "../api/bot/demon-tower-info-query.js";
import { parseWorldBossRanking } from "../api/bot/world-boss-ranking-queries.js";
import { parseWorldBossRewards } from "../api/bot/world-boss-rewards-queries.js";
import { parseWorldBossChallenge } from "../api/bot/world-boss-challenge.js";
import { parseWorldBossClaimAll } from "../api/bot/world-boss-claim.js";
import { parseRobotBattleLeaderboard } from "../api/bot/battle-leaderboard-queries.js";
import { ExposeError } from "alemonjs";

//#region src/expose/battle-actions.ts
function towerBuffCommand(input) {
	if (input.taskInput === void 0) return `/妖塔选buff ${input.buffKey} ${input.count}`;
	const command = input.taskInput.trim().replace(/^[!！/#＃]\s*/, "").trim();
	const match = /^妖塔选buff\s+(hp|atk|critDmg|生命|攻击|暴伤)(?:\s+(\d+))?$/i.exec(command);
	if (!match || {
		hp: "hp",
		atk: "atk",
		critdmg: "critDmg",
		生命: "hp",
		攻击: "atk",
		暴伤: "critDmg"
	}[match[1].toLowerCase()] !== input.buffKey || Number(match[2] ?? 1) !== input.count) throw new ExposeError("INVALID_INPUT", "妖塔加成任务指令与类型或次数不匹配");
	return `/${command}`;
}
const empty = object({});
const buff = object(fields(text, "key label cnKey"));
const starBuff = object({
	...fields(text, "key label cnKey"),
	minStars: number
});
const buffs = object(fields(number, "hp atk critDmg"));
const milestone = object(fields(number, "id stars score"));
const unit = object({
	...fields(text, "id name"),
	...fields(integer, "hp maxHp position"),
	isDead: boolean
});
const round = object({
	...fields(integer, "damageDealt totalPlayerDamage attackCount remainingAttempts rank"),
	...fields(text, "logId stageName bossTitle bossName"),
	battle: object({
		winner: {
			type: "string",
			enum: [
				"A",
				"B",
				"draw"
			]
		},
		totalRounds: integer,
		finalState: object({
			sideA: list(unit),
			sideB: list(unit)
		})
	}),
	battleSummary: object(fields(integer, "sideACount sideBCount totalDamageA totalDamageB totalHealsA totalHealsB"))
}, ["rank"]);
const batch = object({
	stopReason: text,
	rounds: list(round),
	lastRound: round,
	...fields(integer, "attemptsUsed totalDamageDealt remainingAttempts"),
	...fields(text, "stageName bossTitle bossName")
}, ["stopReason"]);
function bossResult(value, all) {
	const row = value;
	if (row?.outcome !== "result" || row.mode !== (all ? "all" : "single")) throw new Error("凶兽挑战回执模式不匹配");
	return parseWorldBossChallenge(row.data, all);
}
const availability = object({
	available: boolean,
	reason: text
});
const towerInfo = object({
	access: object({
		ok: boolean,
		realmName: text
	}),
	info: object({
		...fields(boolean, "hasStarted isFinished showChallengeButtons showSweepButton showResetButton"),
		...fields(number, "currentLayer currentStage currentLayerStars cumulativeStars totalScore totalSpiritStone sweepableLayers userPower targetLayer maxRecordedLayer totalBestStars fullStarLayers recordedLayers pendingBuffSelections towerScore"),
		...fields(text, "sweepableLayersText buffText conditionLabel"),
		monsterPower: object(fields(number, "star1 star2 star3")),
		buffs,
		bestStarsByLayer: list(object(fields(number, "layer stars"))),
		milestones: object({
			...fields(number, "claimedCount totalCount"),
			next: object(fields(number, "stars score"))
		}, ["next"]),
		challenge: availability,
		sweep: availability,
		reset: availability,
		buffSelection: availability,
		availableBuffs: list(starBuff)
	})
}, ["info"]);
const realmEntry = object({
	...fields(number, "rank uid realmLevel experience"),
	...fields(text, "name realmName")
});
const realmRanking = object({
	...fields(boolean, "canUseFifthLayerFeature canUseSpar"),
	realmName: text,
	region: text,
	list: list(realmEntry),
	self: realmEntry,
	nearby: list(realmEntry)
}, [
	"realmName",
	"region",
	"self"
]);
const towerEntry = object({
	...fields(number, "rank playerId totalStars highestLayer"),
	name: text
});
const storylineEntry = object({
	...fields(number, "rank uid totalStars"),
	name: text
});
const alchemyEntry = object({
	...fields(number, "rank playerId level exp totalCrafts successCount"),
	...fields(text, "name title successRate"),
	canLike: boolean
});
const battleActions = {
	challenge_scarecrow: mutation("进行稻草人伤害测试，测试本身不扣修为、精力或真气；入场可能结算常规资源。可指定 1 至 20 回合，省略时使用服务端默认回合。返回伤害统计与战斗日志编号。", "scarecrow.challenge", object({ rounds: {
		type: "integer",
		minimum: 1,
		maximum: 20
	} }, ["rounds"]), object({
		logId: text,
		rounds: integer,
		summary: object({
			...fields(integer, "totalDamage skillDamage buffDamage totalSkillAttacks critCount maxSingleDamage maxSingleDamageRound"),
			critRate: number,
			...fields(text, "critRateText buffDamageShareText maxSingleDamageSkill"),
			skills: list(object({
				...fields(text, "skillName damageShareText"),
				...fields(integer, "count totalDamage")
			}))
		})
	}), (input) => `/挑战稻草人${input.rounds === void 0 ? "" : ` ${input.rounds}`}`, parseBackendScarecrow, (input) => ({ roundsText: input.rounds === void 0 ? null : String(input.rounds) })),
	get_battle_log: observation("查询指定战斗日志；日志可能已过期，若仅有战斗回忆则 text 缺失且 memoryAvailable=true。仅使用战斗结果返回的 logId。", "battle.log", object({ logId: {
		type: "string",
		minLength: 1
	} }), object({
		logId: text,
		text,
		memoryAvailable: boolean,
		memoryExpiresAt: text
	}, ["text", "memoryExpiresAt"]), (input) => `/查看战斗过程 ${input.logId}`, (data, input) => {
		const result = parseRobotBattleLog(data, input.logId);
		return {
			logId: result.logId,
			text: result.text,
			memoryAvailable: !!result.memoryShare,
			...result.memoryShare ? { memoryExpiresAt: result.memoryShare.expiresAt } : {}
		};
	}, (input) => ({ logId: input.logId })),
	like_popularity: mutation("为指定榜单上的目标玩家点赞；服务端校验目标、本人资格和每日限制，并返回实际奖励及剩余次数。targetUid 是目标，不是调用者身份。", "popularity.like", object({
		targetUid: {
			type: "integer",
			minimum: 1,
			maximum: Number.MAX_SAFE_INTEGER
		},
		boardType: {
			type: "string",
			enum: [
				"battle",
				"realm",
				"storyline",
				"demonTower",
				"regionBattle",
				"regionRealm",
				"alchemy"
			]
		}
	}), object({
		outcome: {
			type: "string",
			enum: ["liked", "ignored"]
		},
		message: text,
		remainingLikes: integer,
		currentPopularity: integer,
		boardType: text,
		boardLabel: text
	}, [
		"message",
		"remainingLikes",
		"currentPopularity",
		"boardType",
		"boardLabel"
	]), (input) => `/点赞人气 ${input.targetUid} ${input.boardType}`, (data, input) => {
		const result = parseRobotPopularityLike(data);
		if (result.outcome === "liked" && result.boardType !== input.boardType) throw new Error("点赞回执榜单不匹配");
		return result;
	}, (input) => ({
		target: { uid: input.targetUid },
		boardType: input.boardType
	})),
	get_popularity_leaderboard: observation("查询人气排行榜、本人及附近排名；未解锁时保留服务端拒绝。", "leaderboard.popularity", object({}), object({
		canUseFifthLayerFeature: boolean,
		realmName: text,
		list: list(object({
			...fields(number, "rank uid popularity"),
			name: text
		})),
		nearby: list(object({
			...fields(number, "rank uid popularity"),
			name: text
		})),
		self: object({
			...fields(number, "rank uid popularity"),
			name: text
		})
	}, ["realmName", "self"]), () => "/人气排行榜", (data) => {
		const parsed = parseRobotPopularity(data);
		const raw = data;
		return {
			...parsed,
			realmName: raw.realmName
		};
	}),
	get_realm_leaderboard: observation("查询境界排行榜、本人及附近排名；未解锁时保留服务端拒绝。", "leaderboard.realm", object({}), realmRanking, () => "/境界排行榜", parseRobotRealmRanking),
	get_regional_realm_leaderboard: observation("查询本人归属区的境界排行榜；未解锁或没有归属区时保留服务端拒绝。", "leaderboard.realm-region", object({}), realmRanking, () => "/区境界排行榜", parseRobotRegionalRealmRanking),
	get_battle_leaderboard: observation("分页查询战力排行榜、本人排名及附近玩家；building 或 complete 描述服务端构建状态，不能把未完成榜单当作完整排名。", "leaderboard.battle", object({ page: {
		type: "integer",
		minimum: 1,
		maximum: 2147483647
	} }, ["page"]), object({
		...fields(number, "page totalPages total time"),
		...fields(boolean, "building complete canUseSpar"),
		list: list(object({
			...fields(number, "rank uid power"),
			name: text
		}, ["name"])),
		nearby: list(object({
			...fields(number, "rank uid power"),
			name: text
		}, ["name"])),
		self: object({
			...fields(number, "rank uid power"),
			name: text
		}, ["name"])
	}, ["time", "self"]), (input) => `/战力排行榜 ${input.page ?? 1}`, parseRobotBattleLeaderboard, (input) => ({
		page: String(input.page ?? 1),
		top50: false
	})),
	get_regional_battle_leaderboard: observation("分页查询本人归属区的战力排行榜、本人及附近排名；building 或 complete 表示榜单构建状态，资格不足或无归属区时保留服务端拒绝。", "leaderboard.battle-region", object({ page: {
		type: "integer",
		minimum: 1,
		maximum: 2147483647
	} }, ["page"]), object({
		...fields(number, "page totalPages total time"),
		...fields(boolean, "building complete canUseSpar"),
		list: list(object({
			...fields(number, "rank uid power"),
			name: text
		}, ["name"])),
		nearby: list(object({
			...fields(number, "rank uid power"),
			name: text
		}, ["name"])),
		self: object({
			...fields(number, "rank uid power"),
			name: text
		}, ["name"])
	}, ["time", "self"]), (input) => `/区战力排行榜 ${input.page ?? 1}`, parseRobotBattleLeaderboard, (input) => ({
		page: String(input.page ?? 1),
		top50: false
	})),
	get_demon_tower_leaderboard: observation("分页查询妖塔排行榜、本人及附近排名；access.ok 表示境界资格，playerId 可用于人气点赞目标。", "demon-tower.ranking", object({ page: {
		type: "integer",
		minimum: 1,
		maximum: 2147483647
	} }, ["page"]), object({
		access: object({
			ok: boolean,
			realmName: text
		}, ["realmName"]),
		leaderboard: object({
			...fields(number, "page total totalPages"),
			list: list(towerEntry),
			self: towerEntry,
			nearby: list(towerEntry)
		}, ["self"])
	}, ["leaderboard"]), (input) => `/妖塔排行榜 ${input.page ?? 1}`, parseTowerRanking, (input) => ({
		pageText: String(input.page ?? 1),
		top50: false
	})),
	get_storyline_leaderboard: observation("分页查询主线星数排行榜、本人及附近排名；未解锁时保留服务端拒绝。", "leaderboard.storyline", object({ page: {
		type: "integer",
		minimum: 1,
		maximum: 2147483647
	} }, ["page"]), object({
		...fields(number, "page total totalPages"),
		items: list(storylineEntry),
		self: storylineEntry,
		nearby: list(storylineEntry)
	}, ["self"]), (input) => `/主线排行榜 ${input.page ?? 1}`, (data) => {
		const result = parseStorylineRankingQuery(data);
		if (!result.access.ok || !result.leaderboard) throw new Error("主线排行榜成功响应缺少榜单");
		return result.leaderboard;
	}, (input) => ({
		input: `/主线排行榜 ${input.page ?? 1}`,
		top50: false
	})),
	get_alchemy_leaderboard: observation("分页查询丹师排行榜、本人及附近排名；未解锁时保留服务端拒绝，playerId 可用于人气点赞目标。", "leaderboard.alchemy", object({ page: {
		type: "integer",
		minimum: 1,
		maximum: 2147483647
	} }, ["page"]), object({
		...fields(number, "page pageSize total totalPages"),
		items: list(alchemyEntry),
		self: alchemyEntry,
		nearby: list(alchemyEntry)
	}, ["self"]), (input) => `/丹师排行榜 ${input.page ?? 1}`, (data) => {
		const result = parseAlchemyRanking(data);
		if (!result.access.canAccess) throw new Error("丹师排行榜成功响应缺少资格");
		return result;
	}, (input) => ({
		page: String(input.page ?? 1),
		top50: false
	})),
	get_world_boss_leaderboard: observation("查询当前境界的世界凶兽伤害排行榜、本人排名和伤害；不可查询时保留服务端拒绝。", "world-boss.ranking", empty, object({
		...fields(integer, "stageLevel myRank"),
		myDamage: number,
		stageName: text,
		available: boolean,
		unavailableMessage: text,
		ranking: list(object({
			rank: integer,
			damage: number,
			name: text
		}))
	}, ["myRank"]), () => "/凶兽排行榜", parseWorldBossRanking),
	get_world_boss_rewards: observation("查询当前境界的世界凶兽奖励档位和可领取数量；此操作不领取奖励。", "world-boss.rewards", empty, object({
		...fields(integer, "stageLevel claimableRewardCount"),
		stageName: text,
		available: boolean,
		unavailableMessage: text,
		config: object({
			...fields(text, "bossName bossTitle"),
			baseDamage: number
		}),
		tiers: list(object({
			...fields(text, "tierName conditionText"),
			...fields(integer, "damagePercent spiritStone spiritCrystal")
		}))
	}, ["config"]), () => "/凶兽奖励", parseWorldBossRewards),
	challenge_world_boss: mutation("挑战一次世界凶兽并结算伤害。返回实际战斗、累计伤害和剩余次数；同消息中不同挑战使用不同 intentId，同次重试沿用原编号。 连锁任务可传入一致的 taskInput，检查任务推进与业务回执。", "world-boss.challenge", object({
		intentId: intentIdSchema,
		taskInput: taskInputSchema
	}, ["intentId", "taskInput"]), round, () => "/挑战凶兽", (data) => bossResult(data, false), () => ({ mode: "single" }), (input) => validateIntentId(input.intentId), {
		intentId: (input) => input.intentId,
		taskInput: (input) => input.taskInput
	}),
	challenge_world_boss_all: mutation("连续使用世界凶兽剩余挑战次数；可能部分完成后停止。检查 rounds、attemptsUsed、remainingAttempts 和 stopReason，不自动重新挑战。", "world-boss.challenge", object({
		intentId: intentIdSchema,
		taskInput: taskInputSchema
	}, ["intentId", "taskInput"]), batch, () => "/挑战凶兽 全部", (data) => bossResult(data, true), () => ({ mode: "all" }), (input) => validateIntentId(input.intentId), {
		intentId: (input) => input.intentId,
		taskInput: (input) => input.taskInput
	}),
	claim_world_boss_rewards: mutation("领取当前角色所有可领取的世界凶兽奖励，返回实际领取条目及灵石、灵晶合计。", "world-boss.reward-claim", object({
		intentId: intentIdSchema,
		taskInput: taskInputSchema
	}, ["intentId", "taskInput"]), object({
		items: list(object({
			...fields(text, "bossDate stageName tierName"),
			...fields(integer, "stageLevel spiritStone spiritCrystal playerDamage")
		})),
		totalStone: integer,
		totalCrystal: integer
	}), () => "/领取凶兽奖励", parseWorldBossClaimAll, () => ({}), (input) => validateIntentId(input.intentId), {
		intentId: (input) => input.intentId,
		taskInput: (input) => input.taskInput
	}),
	execute_task_demon_tower: mutation("执行妖塔连锁任务查看步骤，返回当前进度和任务推进回执，不发起挑战。", "demon-tower.info", object({
		taskInput: taskInputSchema,
		intentId: intentIdSchema
	}, ["intentId"]), towerInfo, () => "/妖塔", parseDemonTowerInfo, () => ({}), (input) => validateIntentId(input.intentId), {
		intentId: (input) => input.intentId,
		taskInput: (input) => input.taskInput
	}),
	get_demon_tower: query("查询镇妖塔当前进度、历史星数、战力、加成及挑战/扫荡/重置资格；服务端可能初始化状态。每次调用重新读取状态。", towerInfo, async ({ bid, uid, request }) => parseDemonTowerInfo(await requestBackend(bid, "get_players_id_tower", {
		path: { id: uid },
		...request
	}))),
	challenge_demon_tower: mutation("按指定 1..3 星难度挑战当前妖塔层；检查 result.success、layerCleared、needSelectBuff。同消息新挑战使用不同 intentId，同次重试沿用原编号。 连锁任务可传入一致的 taskInput，检查任务推进与业务回执。", "demon-tower.challenge", object({
		stars: {
			type: "integer",
			minimum: 1,
			maximum: 3
		},
		intentId: intentIdSchema,
		taskInput: taskInputSchema
	}, ["intentId", "taskInput"]), object({
		logId: text,
		...fields(boolean, "success layerCleared allCleared needSelectBuff"),
		...fields(number, "starsEarned scoreEarned totalTowerScore spiritStoneEarned nextLayer nextStage cumulativeStars battleRounds"),
		condition: {
			type: "string",
			enum: [
				"ROUND_LIMIT",
				"HP_THRESHOLD",
				"NO_SKILLS"
			]
		},
		conditionLabel: text,
		battleWinner: {
			type: "string",
			enum: [
				"A",
				"B",
				"draw",
				""
			]
		},
		milestonesTriggered: list(milestone),
		availableBuffs: list(starBuff)
	}, ["logId"]), (input) => `/妖塔挑战 ${input.stars}`, (data) => {
		const result = parseRobotDemonTowerChallenge(data);
		if (result.outcome !== "result") throw new Error("妖塔挑战未返回结算回执");
		return result.data;
	}, (input) => ({ stars: input.stars }), (input) => validateIntentId(input.intentId), {
		intentId: (input) => input.intentId,
		taskInput: (input) => input.taskInput
	}),
	select_demon_tower_buff: mutation("使用妖塔可选加成次数，检查实际加成和剩余次数。同消息新选择使用新 intentId，同次重试沿用原编号。", "demon-tower.buff", object({
		buffKey: {
			type: "string",
			enum: [
				"hp",
				"atk",
				"critDmg"
			]
		},
		count: {
			type: "integer",
			minimum: 1,
			maximum: Number.MAX_SAFE_INTEGER
		},
		intentId: intentIdSchema,
		taskInput: taskInputSchema
	}, ["intentId", "taskInput"]), object({
		count: integer,
		buffApplied: text,
		newBuffs: buffs,
		remainingBuffSelections: integer,
		buffOptions: list(buff)
	}), towerBuffCommand, (data, input) => {
		const result = parseRobotDemonTowerBuff(data);
		if (result.outcome !== "result" || result.data.count !== input.count) throw new Error("妖塔加成未返回结算回执");
		return result.data;
	}, (input) => ({ selection: {
		buffKey: input.buffKey,
		count: input.count
	} }), (input) => validateIntentId(input.intentId), {
		intentId: (input) => input.intentId,
		taskInput: (input) => input.taskInput
	}),
	sweep_demon_tower: mutation("扫荡服务端允许的妖塔层数并结算奖励。同消息新扫荡使用新 intentId，同次重试沿用原编号。 连锁任务可传入一致的 taskInput，检查任务推进与业务回执。", "demon-tower.sweep", object({
		intentId: intentIdSchema,
		taskInput: taskInputSchema
	}, ["intentId", "taskInput"]), object({
		...fields(integer, "layersSwept totalSpiritStone totalScore cumulativeStars nextLayer buffsToSelect"),
		milestonesTriggered: list(milestone),
		availableBuffs: list(buff)
	}), () => "/妖塔扫荡", parseSweep, () => ({}), (input) => validateIntentId(input.intentId), {
		intentId: (input) => input.intentId,
		taskInput: (input) => input.taskInput
	}),
	reset_demon_tower: mutation("重置妖塔进度，消耗重列旗及重置次数；先查询状态和资格。同消息新重置使用新 intentId，同次重试沿用原编号。", "demon-tower.reset", object({
		intentId: intentIdSchema,
		taskInput: taskInputSchema
	}, ["intentId", "taskInput"]), object({
		success: boolean,
		message: text,
		resetsUsed: integer,
		maxResets: integer
	}), () => "/妖塔重置", parseReset, () => ({}), (input) => validateIntentId(input.intentId), {
		intentId: (input) => input.intentId,
		taskInput: (input) => input.taskInput
	})
};

//#endregion
export { battleActions };