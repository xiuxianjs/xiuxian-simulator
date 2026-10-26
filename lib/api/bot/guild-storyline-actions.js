import { repeatPresentationHeaders } from "./repeat-presentation.js";
import { requestBackend, writeContext } from "./client.js";

//#region src/api/bot/guild-storyline-actions.ts
function record(value, message) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(message);
	return value;
}
function integer(value, message) {
	if (typeof value !== "number" || !Number.isSafeInteger(value)) throw new Error(message);
	return value;
}
function parseGuildStorylineHomeView(value) {
	const row = record(value, "宗门主线首页投影不完整");
	const numeric = (key) => {
		const value = row[key];
		if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(`宗门主线首页缺少${key}`);
		return value;
	};
	const string = (key) => {
		if (typeof row[key] !== "string") throw new Error(`宗门主线首页缺少${key}`);
		return row[key];
	};
	const boolean = (key) => {
		if (typeof row[key] !== "boolean") throw new Error(`宗门主线首页缺少${key}`);
		return row[key];
	};
	return {
		...row.participationRewardContribution === void 0 ? {} : { participationRewardContribution: numeric("participationRewardContribution") },
		allCleared: boolean("allCleared"),
		guildName: string("guildName"),
		guildLevel: numeric("guildLevel"),
		stageIndex: numeric("stageIndex"),
		stageName: string("stageName"),
		isElite: boolean("isElite"),
		bossRemainingHp: numeric("bossRemainingHp"),
		bossMaxHp: numeric("bossMaxHp"),
		totalDamage: numeric("totalDamage"),
		retryBuffUsesLeft: numeric("retryBuffUsesLeft"),
		retryBuffDamageRate: numeric("retryBuffDamageRate"),
		retryBuffText: string("retryBuffText"),
		personalAttemptsUsed: numeric("personalAttemptsUsed"),
		personalAttemptsLimit: numeric("personalAttemptsLimit"),
		personalDamage: numeric("personalDamage"),
		personalParticipation: numeric("personalParticipation"),
		personalEffectiveChallenges: numeric("personalEffectiveChallenges"),
		claimableStagesText: string("claimableStagesText"),
		hasClaimableStages: boolean("hasClaimableStages"),
		canChallenge: boolean("canChallenge")
	};
}
async function getBackendGuildStorylineHome(bid, uid) {
	if (!bid) throw new Error("查询缺少平台身份");
	return parseGuildStorylineHome(await requestBackend(bid, "get_players_id_guild_storyline", { path: { id: uid } }));
}
function parseGuildStorylineHome(value) {
	const data = record(value, "宗门主线资料不完整");
	return {
		guildId: integer(data.guildId, "宗门主线资料缺少宗门"),
		progress: record(data.progress, "宗门主线资料缺少进度"),
		stage: record(data.stage, "宗门主线资料缺少关卡"),
		personalAttemptsUsed: integer(data.personalAttemptsUsed, "宗门主线资料缺少次数"),
		home: parseGuildStorylineHomeView(data.home),
		claimableStages: Array.isArray(data.claimableStages) ? data.claimableStages.map((value) => integer(value, "宗门主线可领奖关卡无效")) : (() => {
			throw new Error("宗门主线资料缺少可领奖关卡");
		})()
	};
}
async function challengeBackendGuildStoryline(bid, uid, request, repeatCommand) {
	if (!bid) throw new Error("操作缺少平台身份");
	return parseGuildStorylineChallenge(await requestBackend(bid, "post_players_id_guild_storyline_challenge", {
		path: { id: uid },
		...writeContext(request),
		headers: repeatPresentationHeaders(repeatCommand)
	}));
}
function parseGuildStorylineChallenge(value) {
	const data = record(value, "宗门主线挑战结算不完整");
	const stageIndex = integer(data.stageIndex, "宗门主线挑战关卡不完整");
	if (stageIndex <= 0) throw new Error("宗门主线挑战关卡不完整");
	const reward = record(data.reward, "宗门主线挑战结算不完整");
	const amount = (key) => {
		const value = integer(reward[key], `宗门主线挑战${key}不完整`);
		if (value < 0) throw new Error(`宗门主线挑战${key}不完整`);
		return value;
	};
	if (typeof reward.stageCleared !== "boolean") throw new Error("宗门主线挑战通关状态不完整");
	let eliteDrop;
	if (reward.eliteDrop !== null && reward.eliteDrop !== void 0) {
		const drop = record(reward.eliteDrop, "宗门主线精英掉落不完整");
		if (typeof drop.rewardName !== "string" || !drop.rewardName.trim() || integer(drop.quantity, "宗门主线精英掉落数量无效") <= 0) throw new Error("宗门主线精英掉落不完整");
		eliteDrop = {
			...drop,
			rewardName: drop.rewardName,
			quantity: drop.quantity
		};
	}
	for (const key of [
		"guildContributionAdded",
		"guildContributionCurrent",
		"guildDailyActivityAdded",
		"guildDailyActivityCurrent",
		"personalAttemptsUsed",
		"personalAttemptsLimit"
	]) if (reward[key] !== void 0) amount(key);
	return {
		...data,
		stageIndex,
		reward: {
			...reward,
			eliteDrop,
			damageDealt: amount("damageDealt"),
			bossHpBefore: amount("bossHpBefore"),
			bossHpAfter: amount("bossHpAfter"),
			stageCleared: reward.stageCleared
		}
	};
}

//#endregion
export { challengeBackendGuildStoryline, getBackendGuildStorylineHome, parseGuildStorylineChallenge, parseGuildStorylineHome, parseGuildStorylineHomeView };