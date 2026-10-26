import { FormatGui, createQuoteMarkdown } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { parseGuildStorylineHome } from "../../../api/bot/guild-storyline-actions.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/guild/storyline/res.ts
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	const [, next] = useEvent();
	const sendFailure = async (text) => {
		await message.send(FormatGui({
			isPrivate,
			bid,
			title: "宗门主线",
			content: Format.createMarkdown().addText(text)
		}));
	};
	const loaded = await runRobotBusiness(e, "guild.storyline-home", {}, parseGuildStorylineHome, next, async (reply) => {
		await sendFailure(reply.text);
	}).catch(async (error) => {
		await sendFailure(error instanceof Error ? error.message : "加载宗门主线信息失败");
		return { handled: true };
	});
	if (loaded.handled) return;
	const result = {
		code: loaded.data.home.allCleared ? "ALL_CLEARED" : "OK",
		data: {
			guildId: loaded.data.guildId,
			...loaded.data.home,
			claimableStages: loaded.data.claimableStages
		}
	};
	const md = Format.createMarkdown();
	md.addText(`${result.data.guildName} · ${result.data.guildLevel}级`).addNewline();
	if (result.code === "ALL_CLEARED") md.addText("今日四关已全通").addNewline();
	md.addBlockquote(createQuoteMarkdown([
		`第${result.data.stageIndex}关 ${result.data.stageName}${result.data.isElite ? "（精英）" : ""}`,
		`血量：${result.data.bossRemainingHp}/${result.data.bossMaxHp} · 本关累计推进 ${result.data.totalDamage}`,
		...result.data.retryBuffText ? [result.data.retryBuffText] : [],
		`个人次数：${result.data.personalAttemptsUsed}/${result.data.personalAttemptsLimit}`,
		`今日个人伤害：${result.data.personalDamage}`,
		`参与点：${result.data.personalParticipation}（不可兑换）· 有效挑战 ${result.data.personalEffectiveChallenges}`
	], result.data.canChallenge ? [{
		label: "挑战",
		command: "/宗门主线挑战"
	}] : []));
	if (result.data.participationRewardContribution !== void 0) md.addBlockquote(createQuoteMarkdown([
		`每日首次有效挑战：贡献＋${result.data.participationRewardContribution}，日活已满仍可获得`,
		...result.data.allCleared ? ["今日已全通，无法继续挑战；可核对关卡奖励和宗门日活奖励"] : !result.data.canChallenge ? ["今日挑战次数已用尽，可核对记录和宗门日活奖励"] : [],
		"换宗门不重复领取；后续挑战继续推进全宗进度"
	], [{
		label: "宗门日常",
		command: "/宗门日常"
	}]));
	if (result.data.hasClaimableStages) md.addBlockquote(createQuoteMarkdown([`可领取关卡：${result.data.claimableStagesText}`, "关卡灵晶每人每关仅可领取一次"], [{
		label: "一键领取",
		command: "/领取宗门主线奖励"
	}, ...result.data.claimableStages.map((stageIndex) => ({
		label: `第${stageIndex}关`,
		command: `/领取宗门主线奖励 ${stageIndex}`
	}))]));
	message.send(FormatGui({
		isPrivate,
		bid,
		title: "宗门主线",
		content: md,
		footer: [{
			label: "记录",
			command: "/宗门主线记录"
		}]
	}));
});

//#endregion
export { res_default as default };