import { parseTowerRewardClaim } from "./tower-reward-claims.js";
import { parseTowerFirstRewards, parseTowerMonthlyRewards } from "./tower-rewards-queries.js";
import { parseTongtianBatch, parseTongtianChallenge, parseTongtianSweep, parseTongtianTower } from "./tongtian-tower.js";

//#region src/api/bot/ranking-robot-query.ts
function parseRobotTowerOverview(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("通天塔响应不完整");
	const data = value;
	if (typeof data.tianjiaoVisible !== "boolean") throw new Error("通天塔导航响应不完整");
	return {
		code: "MY_VIEW",
		data: parseTongtianTower(data.view),
		tianjiaoVisible: data.tianjiaoVisible
	};
}
const parseRobotFirstRewards = (value) => presentTowerFirstRewards(parseTowerFirstRewards(value));
const parseRobotMonthlyRewards = (value) => presentTowerMonthlyRewards(parseTowerMonthlyRewards(value));
function presentTowerFirstRewards(data) {
	if (!data.canUseFifthLayerFeature) return {
		code: "LOCKED",
		realmName: data.realmName ?? "未知"
	};
	if (!data.isOpen) return {
		code: "TOWER_CLOSED",
		message: `通天塔每月${data.openStartDay}-${data.openEndDay}日开放，当前处于关闭阶段`
	};
	return {
		code: "OK",
		data: {
			userRank: data.userRank,
			maxRank: data.maxRank,
			rewards: data.rewards,
			hasClaimableReward: data.hasClaimableReward
		}
	};
}
function presentTowerMonthlyRewards(data) {
	if (!data.canUseFifthLayerFeature) return {
		code: "LOCKED",
		realmName: data.realmName ?? "未知"
	};
	if (!data.isOpen) return {
		code: "TOWER_CLOSED",
		message: `通天塔每月${data.openStartDay}-${data.openEndDay}日开放，当前处于关闭阶段`
	};
	const statusLines = [];
	if (data.claimCount > 0) {
		statusLines.push(`✅ 本月已领取 ${data.claimCount} 个档位`);
		statusLines.push(`最高领奖排名：第 ${data.bestClaimRank} 名`);
	} else if (data.claimStatus === "NOT_RANKED") statusLines.push("本月未上榜，无月度奖励");
	else if (data.claimStatus === "ALL_CLAIMED") statusLines.push("所有月度奖励已领取");
	const rewards = data.rewards.map((reward) => {
		const rangeText = reward.rankingStart === reward.rankingEnd ? `第 ${reward.rankingStart} 名` : `第 ${reward.rankingStart}-${reward.rankingEnd} 名`;
		const rewardTexts = [];
		if (reward.lingJing > 0) rewardTexts.push(`灵晶 x${reward.lingJing}`);
		if (reward.spiritStone > 0) rewardTexts.push(`灵石 x${reward.spiritStone}`);
		return {
			id: reward.id,
			rangeText,
			rewardTexts,
			state: reward.state
		};
	});
	return {
		code: "OK",
		data: {
			currentRank: data.currentRank,
			bestRank: data.bestRank,
			maxRank: data.maxRank,
			statusLines,
			rewards,
			hasClaimableReward: data.hasClaimableReward
		}
	};
}
function rankingClaimArgument(text, monthly) {
	return (text || "").replace(monthly ? /^(!|！|\/|#|＃)?领取月度奖励\s*/ : /^(!|！|\/|#|＃)?领取首通奖励\s*/, "").trim();
}
function parseRobotFirstClaim(value) {
	const row = claimEnvelope(value);
	if (row.outcome === "param_error") return { code: "PARAM_ERROR" };
	const data = parseTowerRewardClaim(row, row.outcome === "batch" ? "claimedCount" : "ranking");
	return row.outcome === "batch" ? {
		code: "BATCH_SUCCESS",
		data: {
			claimedCount: data.claimedCount,
			rewardTexts: data.rewardTexts
		}
	} : {
		code: "SUCCESS",
		data: {
			ranking: data.ranking,
			rewardTexts: data.rewardTexts
		}
	};
}
function parseRobotMonthlyClaim(value) {
	const row = claimEnvelope(value);
	if (row.outcome === "param_error") return { code: "PARAM_ERROR" };
	const data = parseTowerRewardClaim(row, "claimedCount");
	return row.outcome === "batch" ? {
		code: "BATCH_SUCCESS",
		data: {
			claimedCount: data.claimedCount,
			rewardTexts: data.rewardTexts
		}
	} : {
		code: "SUCCESS",
		data: { rewardTexts: data.rewardTexts }
	};
}
function claimEnvelope(value) {
	if (!value || typeof value !== "object" || Array.isArray(value) || ![
		"param_error",
		"batch",
		"single"
	].includes(String(value.outcome))) throw new Error("排名奖励结算响应不完整");
	return value;
}
function rankingChallengeArgument(text) {
	return (text || "").match(/^(?:!|！|\/|#|＃)?挑战排名\s+(\d+)\s*$/)?.[1] ?? "";
}
function rankingSweepArguments(text) {
	const match = (text || "").match(/扫荡排名\s+(\d+)(?:\s+(\d+))?\s*$/);
	return {
		rankArg: match?.[1] ?? "",
		countArg: match?.[2] ?? "5"
	};
}
function parseRobotTowerChallenge(value) {
	if (value && typeof value === "object" && !Array.isArray(value) && value.outcome === "param_error") return { code: "PARAM_ERROR" };
	return {
		code: "SUCCESS",
		data: parseTongtianChallenge(value)
	};
}
const parseRobotTowerBatch = (value) => ({
	code: "OK",
	data: parseTongtianBatch(value)
});
function parseRobotTowerSweep(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("通天塔扫荡响应不完整");
	const row = value;
	if (row.outcome === "list") {
		const view = parseTongtianTower(row.view);
		return view.sweepTargets.length ? {
			code: "LIST",
			data: {
				myRank: view.myRank,
				entries: view.sweepTargets
			}
		} : { code: "LIST_EMPTY" };
	}
	if (row.outcome === "sweep") return {
		code: "SWEEP",
		data: parseTongtianSweep(row.data)
	};
	throw new Error("通天塔扫荡响应不完整");
}

//#endregion
export { parseRobotFirstClaim, parseRobotFirstRewards, parseRobotMonthlyClaim, parseRobotMonthlyRewards, parseRobotTowerBatch, parseRobotTowerChallenge, parseRobotTowerOverview, parseRobotTowerSweep, presentTowerFirstRewards, presentTowerMonthlyRewards, rankingChallengeArgument, rankingClaimArgument, rankingSweepArguments };