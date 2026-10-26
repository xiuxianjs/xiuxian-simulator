import { FormatGui } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { parseRobotWorldBossRanking } from "../../../api/bot/world-boss-robot-query.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/worldBoss/leaderboard/res.ts
/**
* 凶兽排行指令
* 指令：#凶兽排行
*/
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	const [, next] = useEvent();
	const sendFailure = async (text) => {
		const md = Format.createMarkdown();
		md.addText(text);
		await message.send(FormatGui({
			isPrivate,
			bid,
			title: "",
			content: md
		}));
	};
	const loaded = await runRobotBusiness(e, "world-boss.ranking", {}, parseRobotWorldBossRanking, next, async (reply) => {
		await sendFailure(reply.text);
	}).catch(async (error) => {
		await sendFailure(error instanceof Error ? error.message : "查询排行失败");
		return { handled: true };
	});
	if (loaded.handled) return;
	const md = Format.createMarkdown();
	const { stageName, ranking, myRank, myDamage } = loaded.data;
	md.addText(`🏆 凶兽伤害排行 · ${stageName}`);
	md.addNewline();
	md.addNewline();
	if (ranking.length === 0) md.addBlockquote(Format.createMarkdown().addText("暂无挑战记录"));
	else for (const item of ranking) {
		const medal = item.rank <= 3 ? [
			"🥇",
			"🥈",
			"🥉"
		][item.rank - 1] : `【${item.rank}】`;
		md.addText(`${medal} ${item.name}  ${item.damage}`);
		md.addNewline();
	}
	md.addNewline();
	md.addText("【我的排名】");
	md.addNewline();
	if (myRank) md.addBlockquote(Format.createMarkdown().addText(`第 ${myRank} 名 | 伤害：${myDamage}`));
	else md.addBlockquote(Format.createMarkdown().addText("暂未参与"));
	md.addNewline();
	md.addNewline();
	message.send(FormatGui({
		isPrivate,
		bid,
		title: "凶兽排行",
		header: [{
			label: "返回",
			command: "/凶兽"
		}],
		content: md,
		footer: [{
			label: "凶兽信息",
			command: "/凶兽"
		}, {
			label: "挑战凶兽",
			command: "/挑战凶兽"
		}]
	}));
});

//#endregion
export { res_default as default };