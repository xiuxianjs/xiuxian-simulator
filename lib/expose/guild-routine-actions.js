import { boolean, fields, integer, list, number, object, text } from "./schema.js";
import { intentIdSchema, mutation, observation, taskInputSchema, validateIntentId } from "./mutation.js";
import { parseGuildShopPage } from "../api/bot/guild-shop-page.js";
import { parseGuildBattleTrainingState, parseGuildBattleTrainingUpgrade } from "../api/bot/guild-battle-training.js";
import { parseGuildDailyTask } from "../api/bot/guild-daily-task-query.js";
import { parseGuildWeeklyTask } from "../api/bot/guild-weekly-task-query.js";
import { parseGuildMilestoneClaim, parseGuildMilestonesClaimAll } from "../api/bot/guild-milestone-claim.js";
import { parseRobotGuildMilestoneClaim } from "../api/bot/guild-claims-robot-query.js";
import { parseRobotGuildWorship } from "../api/bot/guild-activity-robot-query.js";
import { parseRobotGuildShopExchange } from "../api/bot/guild-shop-robot-query.js";

//#region src/expose/guild-routine-actions.ts
const positive = {
	type: "integer",
	minimum: 1,
	maximum: Number.MAX_SAFE_INTEGER
};
const nonnegative = {
	type: "integer",
	minimum: 0,
	maximum: Number.MAX_SAFE_INTEGER
};
const period = {
	type: "string",
	enum: ["daily_activity", "weekly_activity"]
};
const offer = {
	type: "string",
	enum: [
		"灵石",
		"灵晶",
		"道晶"
	]
};
const label = (type) => type === "daily_activity" ? "日活" : "周活";
const milestone = object({
	...fields(integer, "id threshold rewardSpiritStone rewardContribution rewardPrestige"),
	description: text,
	...fields(boolean, "claimed canClaim")
}, [
	"description",
	"rewardSpiritStone",
	"rewardContribution",
	"rewardPrestige"
]);
const expectedItem = object({
	shopItemId: positive,
	itemId: positive,
	name: text,
	category: text,
	quantity: positive,
	priceContribution: nonnegative
});
const trainingLine = object({
	...fields(text, "key name effectText"),
	...fields(integer, "level maxLevel nextCostPrestige nextCostSpiritStone nextCostContribution")
}, [
	"nextCostPrestige",
	"nextCostSpiritStone",
	"nextCostContribution"
]);
const guildRoutineActions = {
	get_guild_battle_training: observation("查询宗门战备等级、权限、资源和每项下次升级消耗；不执行升级。", "guild.training-overview", object({}), object({
		...fields(integer, "guildId guildLevel prestige spiritStone contributionPoints teamMaxLevel personalMaxLevel"),
		guildName: text,
		unlocked: boolean,
		canUpgradeTeam: boolean,
		team: list(trainingLine),
		personal: list(trainingLine)
	}), () => "/宗门战备", parseGuildBattleTrainingState),
	upgrade_guild_battle_training: mutation("升级指定宗门战备项目；团队消耗宗门资源，个人消耗贡献，资格和等级以回执为准。同消息新升级使用新 intentId，同次重试沿用原编号。", "guild.training-upgrade", object({
		branch: {
			type: "string",
			enum: ["团队", "个人"]
		},
		key: {
			type: "string",
			enum: [
				"攻",
				"守",
				"血",
				"速",
				"命",
				"会"
			]
		},
		intentId: intentIdSchema
	}, ["intentId"]), object({
		branch: text,
		key: text,
		name: text,
		newLevel: integer,
		effectText: text,
		costText: text,
		contributionPoints: integer,
		prestige: integer,
		spiritStone: integer
	}, [
		"contributionPoints",
		"prestige",
		"spiritStone"
	]), (input) => `/宗门战备 ${input.branch} ${input.key}`, (data, input) => parseGuildBattleTrainingUpgrade(data, input.branch, input.key), (input) => ({
		branch: input.branch,
		key: input.key
	}), (input) => validateIntentId(input.intentId), { intentId: (input) => input.intentId }),
	get_guild_daily: observation("查询本人宗门日常任务、活跃、贡献和可领取里程碑；沿用服务端周期重置与结算，不自动完成任务。", "guild.daily", object({}), object({
		...fields(integer, "guildId contributionPoints dailyActivity dailyActivityMax dailyMiningCount dailyExchangeCount prestigeRemaining"),
		...fields(text, "guildName miningText"),
		...fields(boolean, "checkinDone dailyWorshipDone dailyStorylineDone claimAllAvailable"),
		dailyTasks: list(object({
			...fields(text, "key line actionLabel"),
			actionAvailable: boolean
		})),
		milestones: list(milestone)
	}), () => "/宗门日常", (value) => {
		const result = parseGuildDailyTask(value);
		const raw = value.milestones;
		return {
			...result,
			milestones: result.milestones.map((item, index) => ({
				...raw[index],
				...item
			}))
		};
	}),
	get_guild_weekly: observation("查询本人宗门周常任务、活跃、贡献、可领里程碑及预计俸禄；预计俸禄不是领取回执。", "guild.weekly", object({}), object({
		...fields(integer, "guildId contributionPoints weeklyActivity weeklyActivityMax stipendThreshold stipendPreviewAmount stipendBaseAmount stipendGuildLevel weeklyCheckinCount weeklyMiningCount weeklyExchangeCount"),
		...fields(number, "stipendLevelMultiplier stipendActivityMultiplier"),
		guildName: text,
		claimAllAvailable: boolean,
		weeklyTasks: list(object({
			...fields(text, "key label unit bonusText"),
			...fields(integer, "progress target activityReward"),
			completed: boolean
		})),
		milestones: list(milestone)
	}), () => "/宗门周常", parseGuildWeeklyTask),
	execute_task_guild_daily: mutation("执行宗门日常连锁任务步骤，返回任务推进及活跃面板；分别检查任务和业务回执。", "guild.daily", object({
		taskInput: taskInputSchema,
		intentId: intentIdSchema
	}, ["intentId"]), object({
		...fields(integer, "guildId contributionPoints dailyActivity dailyActivityMax dailyMiningCount dailyExchangeCount prestigeRemaining"),
		...fields(text, "guildName miningText"),
		...fields(boolean, "checkinDone dailyWorshipDone dailyStorylineDone claimAllAvailable"),
		dailyTasks: list(object({
			...fields(text, "key line actionLabel"),
			actionAvailable: boolean
		})),
		milestones: list(milestone)
	}), () => "/宗门日常", (value) => {
		const result = parseGuildDailyTask(value);
		const raw = value.milestones;
		return {
			...result,
			milestones: result.milestones.map((item, index) => ({
				...raw[index],
				...item
			}))
		};
	}, () => ({}), (input) => validateIntentId(input.intentId), {
		intentId: (input) => input.intentId,
		taskInput: (input) => input.taskInput
	}),
	execute_task_guild_weekly: mutation("执行宗门周常连锁任务步骤，返回任务推进及活跃面板；预计俸禄不是领取回执。", "guild.weekly", object({
		taskInput: taskInputSchema,
		intentId: intentIdSchema
	}, ["intentId"]), object({
		...fields(integer, "guildId contributionPoints weeklyActivity weeklyActivityMax stipendThreshold stipendPreviewAmount stipendBaseAmount stipendGuildLevel weeklyCheckinCount weeklyMiningCount weeklyExchangeCount"),
		...fields(number, "stipendLevelMultiplier stipendActivityMultiplier"),
		guildName: text,
		claimAllAvailable: boolean,
		weeklyTasks: list(object({
			...fields(text, "key label unit bonusText"),
			...fields(integer, "progress target activityReward"),
			completed: boolean
		})),
		milestones: list(milestone)
	}), () => "/宗门周常", parseGuildWeeklyTask, () => ({}), (input) => validateIntentId(input.intentId), {
		intentId: (input) => input.intentId,
		taskInput: (input) => input.taskInput
	}),
	claim_guild_milestone: mutation("领取宗门日活或周活面板中的指定奖励；服务端在发奖前核对原类型，仍校验本人活跃和已领状态。奖励中的宗门灵石/声望归宗门，贡献归成员，不应当作个人灵石收益。", "guild.milestone-claim", object({
		type: period,
		milestoneId: positive,
		intentId: intentIdSchema,
		taskInput: taskInputSchema
	}, ["intentId", "taskInput"]), object({
		message: text,
		receipt: object({
			message: text,
			milestoneId: integer,
			type: period,
			...fields(integer, "threshold currentPoints"),
			rewards: object(fields(integer, "spiritStone contribution prestige"))
		})
	}), (input) => `/领取宗门${label(input.type)}奖励 ${input.milestoneId}`, (data, input) => {
		const parsed = parseRobotGuildMilestoneClaim(data, input.milestoneId);
		const receipt = parseGuildMilestoneClaim(data.receipt, input.milestoneId);
		if (receipt.type !== input.type) throw new Error("宗门奖励回执类型不匹配");
		return {
			message: parsed.message,
			receipt
		};
	}, (input) => ({
		milestoneArg: String(input.milestoneId),
		expectedType: input.type
	}), (input) => validateIntentId(input.intentId), {
		intentId: (input) => input.intentId,
		taskInput: (input) => input.taskInput
	}),
	claim_all_guild_milestones: mutation("一键领取本人可领宗门日活或周活奖励；必须检查 partial、claimed 和 message，部分成功不代表全部已领取。", "guild.milestone-claim-all", object({
		type: period,
		intentId: intentIdSchema,
		taskInput: taskInputSchema
	}, ["intentId", "taskInput"]), object({
		message: text,
		partial: boolean,
		claimed: list(object({
			...fields(integer, "id threshold"),
			description: text
		}))
	}), (input) => `/一键领取宗门${label(input.type)}奖励`, parseGuildMilestonesClaimAll, (input) => ({ type: input.type }), (input) => validateIntentId(input.intentId), {
		intentId: (input) => input.intentId,
		taskInput: (input) => input.taskInput
	}),
	get_guild_worship_options: observation("查看今日祭祀状态及三种供品的服务端消耗、活跃和贡献回报，不执行祭祀。", "guild.worship", object({}), object({
		...fields(boolean, "dailyWorshipDone canWorship"),
		...fields(text, "introText noticeText"),
		offers: list(object({
			name: offer,
			...fields(integer, "cost activity contribution"),
			line: text,
			canWorship: boolean
		}))
	}), () => "/祭祀祖师", (data) => {
		const result = parseRobotGuildWorship(data);
		if (result.code !== "GUIDE") throw new Error("祭祀选项响应不完整");
		return result.data;
	}, () => ({ offer: "" })),
	execute_task_guild_worship_options: mutation("查看今日祭祀状态及三种供品的服务端消耗、活跃和贡献回报，不执行祭祀。", "guild.worship", object({
		taskInput: taskInputSchema,
		intentId: intentIdSchema
	}, ["intentId"]), object({
		...fields(boolean, "dailyWorshipDone canWorship"),
		...fields(text, "introText noticeText"),
		offers: list(object({
			name: offer,
			...fields(integer, "cost activity contribution"),
			line: text,
			canWorship: boolean
		}))
	}), () => "/祭祀祖师", (data) => {
		const result = parseRobotGuildWorship(data);
		if (result.code !== "GUIDE") throw new Error("祭祀选项响应不完整");
		return result.data;
	}, () => ({ offer: "" }), (input) => validateIntentId(input.intentId), {
		intentId: (input) => input.intentId,
		taskInput: (input) => input.taskInput
	}),
	worship_guild: mutation("使用指定灵石、灵晶或道晶供品执行一次祭祀祖师，会消耗货币；先查看供品选项，不会自动换用其他货币。", "guild.worship", object({
		offer,
		intentId: intentIdSchema,
		taskInput: taskInputSchema
	}, ["intentId", "taskInput"]), object({
		...fields(integer, "guildId cost dailyActivityAdded currentDailyActivity contributionAdded"),
		offer,
		...fields(text, "message offerText dailyActivityText contributionText")
	}), (input) => `/祭祀祖师 ${input.offer}`, (data, input) => {
		const result = parseRobotGuildWorship(data);
		if (result.code !== "OK" || result.data.offer !== input.offer) throw new Error("祭祀结果与请求不匹配");
		return result.data;
	}, (input) => ({ offer: input.offer }), (input) => validateIntentId(input.intentId), {
		intentId: (input) => input.intentId,
		taskInput: (input) => input.taskInput
	}),
	get_guild_shop: observation("查看本人宗门商店、贡献、已兑换/锁定状态和原商品快照；不手动刷新或兑换，返回当前自动刷新配置。兑换须携带本次商品的原 id、itemId、名称、类别、数量及贡献价格。", "guild.shop", object({}), object({
		contributionPoints: integer,
		...fields(boolean, "autoRefreshEnabled isLeader"),
		autoRefreshHours: list(number),
		autoRefreshStatusText: text,
		refreshDailyLimit: integer,
		items: list(object({
			...fields(integer, "id index itemId quantity priceContribution"),
			...fields(text, "name category statusText slotName itemType itemSubtype"),
			...fields(boolean, "purchased canExchange locked")
		}, [
			"slotName",
			"locked",
			"itemType",
			"itemSubtype"
		]))
	}), () => "/宗门商店", parseGuildShopPage),
	execute_task_guild_shop: mutation("查看本人宗门商店、贡献、已兑换/锁定状态和原商品快照；不手动刷新或兑换，返回当前自动刷新配置。兑换须携带本次商品的原 id、itemId、名称、类别、数量及贡献价格。", "guild.shop", object({
		taskInput: taskInputSchema,
		intentId: intentIdSchema
	}, ["intentId"]), object({
		contributionPoints: integer,
		...fields(boolean, "autoRefreshEnabled isLeader"),
		autoRefreshHours: list(number),
		autoRefreshStatusText: text,
		refreshDailyLimit: integer,
		items: list(object({
			...fields(integer, "id index itemId quantity priceContribution"),
			...fields(text, "name category statusText slotName itemType itemSubtype"),
			...fields(boolean, "purchased canExchange locked")
		}, [
			"slotName",
			"locked",
			"itemType",
			"itemSubtype"
		]))
	}), () => "/宗门商店", parseGuildShopPage, () => ({}), (input) => validateIntentId(input.intentId), {
		intentId: (input) => input.intentId,
		taskInput: (input) => input.taskInput
	}),
	exchange_guild_shop_item: mutation("兑换宗门商店本次列表中的一个商品；expected.shopItemId 取列表 id，其余字段使用该商品原值。服务端在事务内校验原商品及贡献价格，刷新、替换或价格变化时拒绝，不自动兑换同序号的新商品。receipt.itemId 是商店栏位记录编号，contributionDelta 是含服务端兑换奖励的净贡献变化。", "guild.shop-exchange", object({
		itemIndex: {
			type: "integer",
			minimum: 1,
			maximum: 2147483647
		},
		expected: expectedItem
	}), object({
		outcome: {
			type: "string",
			enum: ["result"]
		},
		receipt: object({
			...fields(integer, "itemId quantity contributionDelta prestigeGain remainingDailyCount"),
			itemName: text
		})
	}), (input) => `/宗门商店兑换 ${input.itemIndex}`, (data, input) => {
		const result = parseRobotGuildShopExchange(data);
		if (result.outcome !== "result" || result.receipt.itemId !== input.expected.shopItemId || result.receipt.itemName !== input.expected.name || result.receipt.quantity !== input.expected.quantity) throw new Error("宗门兑换回执与原商品不匹配");
		return result;
	}, (input) => ({
		itemIndex: input.itemIndex,
		expected: {
			shopItemId: input.expected.shopItemId,
			itemId: input.expected.itemId,
			name: input.expected.name,
			category: input.expected.category,
			quantity: input.expected.quantity,
			priceContribution: input.expected.priceContribution
		}
	}))
};

//#endregion
export { guildRoutineActions };