import { boolean, fields, integer, list, number, object, text } from "./schema.js";
import { intentIdSchema, mutation, observation, taskInputSchema, validateIntentId } from "./mutation.js";
import { parseGuildStorylineRecords } from "../api/bot/queries.js";
import { parseGuildWorkflow } from "../api/bot/guild-workflow.js";
import { parseGuildStorylineChallenge, parseGuildStorylineHome } from "../api/bot/guild-storyline-actions.js";

//#region src/expose/guild-storyline-actions.ts
const empty = object({});
const homeView = object({
	...fields(boolean, "allCleared isElite hasClaimableStages canChallenge"),
	...fields(text, "guildName stageName retryBuffText claimableStagesText"),
	...fields(number, "guildLevel stageIndex bossRemainingHp bossMaxHp totalDamage retryBuffUsesLeft retryBuffDamageRate personalAttemptsUsed personalAttemptsLimit personalDamage personalParticipation personalEffectiveChallenges participationRewardContribution")
}, ["participationRewardContribution"]);
const reward = object({
	...fields(integer, "damageDealt bossHpBefore bossHpAfter guildContributionAdded guildContributionCurrent guildDailyActivityAdded guildDailyActivityCurrent personalAttemptsUsed personalAttemptsLimit"),
	stageCleared: boolean,
	eliteDrop: object({
		rewardName: text,
		quantity: integer
	})
}, [
	"guildContributionAdded",
	"guildContributionCurrent",
	"guildDailyActivityAdded",
	"guildDailyActivityCurrent",
	"personalAttemptsUsed",
	"personalAttemptsLimit",
	"eliteDrop"
]);
const guildStorylineActions = {
	get_guild_storyline: observation("查询宗门主线当前关卡、剩余血量、挑战次数及可领取关卡；服务端可能更新周期进度。", "guild.storyline-home", empty, object({
		guildId: integer,
		personalAttemptsUsed: integer,
		claimableStages: list(integer),
		home: homeView,
		progressJson: text,
		stageJson: text
	}), () => "/宗门主线", (data) => {
		const result = parseGuildStorylineHome(data);
		return {
			...result,
			progressJson: JSON.stringify(result.progress),
			stageJson: JSON.stringify(result.stage)
		};
	}),
	execute_task_guild_storyline: mutation("查询宗门主线当前关卡、剩余血量、挑战次数及可领取关卡；服务端可能更新周期进度。", "guild.storyline-home", object({
		taskInput: taskInputSchema,
		intentId: intentIdSchema
	}, ["intentId"]), object({
		guildId: integer,
		personalAttemptsUsed: integer,
		claimableStages: list(integer),
		home: homeView,
		progressJson: text,
		stageJson: text
	}), () => "/宗门主线", (data) => {
		const result = parseGuildStorylineHome(data);
		return {
			...result,
			progressJson: JSON.stringify(result.progress),
			stageJson: JSON.stringify(result.stage)
		};
	}, () => ({}), (input) => validateIntentId(input.intentId), {
		intentId: (input) => input.intentId,
		taskInput: (input) => input.taskInput
	}),
	get_guild_storyline_records: observation("查询本人宗门主线挑战记录、伤害与参与贡献；不执行挑战。", "guild.storyline-records", empty, object({
		guildName: text,
		guildLevel: integer,
		records: list(object({
			...fields(integer, "stageIndex damageDealt participationPoint battleResult attemptNo"),
			isEffective: boolean
		}))
	}), () => "/宗门主线记录", parseGuildStorylineRecords),
	challenge_guild_storyline: mutation("挑战执行时宗门当前主线关卡，按回执核对伤害、通关、贡献与掉落。同消息新挑战使用新 intentId，同次重试沿用原编号。", "guild.storyline-challenge", object({
		intentId: intentIdSchema,
		taskInput: taskInputSchema
	}, ["intentId", "taskInput"]), object({
		stageIndex: integer,
		reward
	}), () => "/宗门主线挑战", parseGuildStorylineChallenge, () => ({}), (input) => validateIntentId(input.intentId), {
		intentId: (input) => input.intentId,
		taskInput: (input) => input.taskInput
	}),
	claim_guild_storyline_rewards: mutation("领取指定关卡奖励；不传 stageIndex 则依次领取全部可领奖关卡。部分成功时检查 partial、claimedStages、failedStage 与 failureReason。", "guild.storyline-claim", object({
		stageIndex: {
			type: "integer",
			minimum: 1,
			maximum: 4
		},
		intentId: intentIdSchema,
		taskInput: taskInputSchema
	}, [
		"stageIndex",
		"intentId",
		"taskInput"
	]), object({
		stageIndex: integer,
		spiritCrystal: number,
		partial: boolean,
		claimedStages: list(integer),
		failedStage: integer,
		failureReason: text
	}, [
		"partial",
		"claimedStages",
		"failedStage",
		"failureReason"
	]), (input) => `/领取宗门主线奖励${input.stageIndex === void 0 ? "" : ` ${input.stageIndex}`}`, (data, input) => {
		const result = parseGuildWorkflow({
			action: "storyline_claim",
			stageIndex: input.stageIndex ?? 0
		}, 0, data);
		if (input.stageIndex !== void 0 && result.stageIndex !== input.stageIndex) throw new Error("宗门主线领奖关卡不匹配");
		return result;
	}, (input) => input.stageIndex === void 0 ? {} : { stageIndex: input.stageIndex }, (input) => validateIntentId(input.intentId), {
		intentId: (input) => input.intentId,
		taskInput: (input) => input.taskInput
	})
};

//#endregion
export { guildStorylineActions };