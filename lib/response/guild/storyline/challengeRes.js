import { FormatGui, addOptions } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { appendMiddlewareAdvice } from "../../middlewareReply.js";
import { parseGuildStorylineChallenge } from "../../../api/bot/guild-storyline-actions.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/guild/storyline/challengeRes.ts
var challengeRes_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	const text = (e.MessageText || "").trim();
	if (!/^[!！/#＃]?宗门主线挑战$/.test(text)) return;
	const [, next] = useEvent();
	const sendFailure = async (text) => {
		const md = Format.createMarkdown();
		md.addText(text);
		await message.send(FormatGui({
			isPrivate,
			bid,
			title: "宗门主线挑战",
			content: md
		}));
	};
	const loaded = await runRobotBusiness(e, "guild.storyline-challenge", {}, parseGuildStorylineChallenge, next, async (reply) => {
		await sendFailure(reply.text);
	}).catch(async (error) => {
		await sendFailure(error instanceof Error ? error.message : "宗门主线挑战失败");
		return { handled: true };
	});
	if (loaded.handled) return;
	const data = loaded.data;
	const reward = data.reward;
	const md = Format.createMarkdown();
	md.addText(`宗门主线第${data.stageIndex}关结算`);
	md.addNewline();
	md.addText(`本次伤害：${reward.damageDealt}`);
	md.addNewline();
	md.addText(`血量变化：${reward.bossHpBefore} -> ${reward.stageCleared ? 0 : reward.bossHpAfter}`);
	md.addNewline();
	md.addText(reward.stageCleared ? reward.allCleared === true ? "本关已攻破，今日四关已全通" : "本关已攻破，宗门已推进至下一关" : "本关尚未攻破");
	if (typeof reward.guildContributionAdded === "number" && typeof reward.guildContributionCurrent === "number") md.addNewline().addText(`宗门贡献：+${reward.guildContributionAdded}（当前${reward.guildContributionCurrent}）`);
	if (typeof reward.guildDailyActivityAdded === "number" && typeof reward.guildDailyActivityCurrent === "number") {
		md.addNewline().addText(`宗门日活：+${reward.guildDailyActivityAdded}（当前${reward.guildDailyActivityCurrent}）`);
		if (reward.guildDailyActivityAdded === 0) md.addNewline().addText("本次未增加日活；每日首次有效挑战可加日活，受日活上限限制");
	}
	if (reward.eliteDrop) md.addNewline().addText(`精英掉落：${reward.eliteDrop.rewardName} ×${reward.eliteDrop.quantity}（已到账）`);
	if (typeof reward.personalAttemptsUsed === "number" && typeof reward.personalAttemptsLimit === "number") md.addNewline().addText(`今日次数：${reward.personalAttemptsUsed}/${reward.personalAttemptsLimit} · 剩余${Math.max(0, reward.personalAttemptsLimit - reward.personalAttemptsUsed)}次`);
	if (!reward.stageCleared) appendMiddlewareAdvice(md, [{
		command: reward.damageDealt > 0 ? "/宗门主线" : "/我的功法",
		description: reward.damageDealt > 0 ? "本次伤害已计入当前关卡，本关尚未攻破不代表结算失败；先看宗门累计进度和本人剩余次数，再决定后续挑战" : "本次未造成有效伤害，先核对已装备功法、装备和境界条件，按实际培养入口提升；次数已结算，不自动重复挑战"
	}]);
	md.addNewline();
	addOptions(md, [
		{
			label: "返回主线",
			command: "/宗门主线"
		},
		{
			label: "核对挑战记录",
			command: "/宗门主线记录"
		},
		{
			label: "宗门日常",
			command: "/宗门日常"
		}
	]);
	message.send(FormatGui({
		isPrivate,
		bid,
		title: "宗门主线挑战",
		content: md
	}));
});

//#endregion
export { challengeRes_default as default };