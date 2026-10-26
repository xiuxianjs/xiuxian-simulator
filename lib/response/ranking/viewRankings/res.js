import { FormatGui, addOptions } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { parseRobotTowerOverview } from "../../../api/bot/ranking-robot-query.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/ranking/viewRankings/res.ts
/**
* 查看排行榜/通天塔
* 指令：/通天塔, /查看通天塔, /通天塔 我的
*/
const formatCompactPower = (power) => {
	if (power >= 1e4) {
		const value = power / 1e4;
		return `${Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1)}w`;
	}
	if (power >= 1e3) {
		const value = power / 1e3;
		return `${Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1)}k`;
	}
	return String(power);
};
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const [, next] = useEvent();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	let result;
	try {
		const loaded = await runRobotBusiness(e, "ranking.overview", {}, parseRobotTowerOverview, next, async (reply) => {
			await message.send(FormatGui({
				isPrivate,
				bid,
				title: "",
				content: Format.createMarkdown().addText(reply.text),
				footer: reply.buttons
			}));
		});
		if (loaded.handled) return;
		result = loaded.data;
	} catch (error) {
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "",
			content: Format.createMarkdown().addText(error instanceof Error ? error.message : "通天塔加载失败，请稍后再试"),
			footer: []
		}));
		return;
	}
	const tianjiaoButtons = result.tianjiaoVisible ? [{
		label: "登天梯",
		command: "/登天梯"
	}] : [];
	if (!result.data.isOpen) {
		const md = Format.createMarkdown();
		md.addText(result.data.message ?? "通天塔暂未开放");
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "",
			content: md,
			footer: tianjiaoButtons
		}));
		return;
	}
	const md = Format.createMarkdown();
	md.addText("前三甲");
	md.addNewline();
	for (const player of result.data.top3) {
		const rankIcon = player.rank === 1 ? "🥇" : player.rank === 2 ? "🥈" : "🥉";
		md.addText(`${rankIcon} ${player.name} ✊${formatCompactPower(player.power)} `);
		const topBtns = [];
		if (!player.isFake) topBtns.push({
			label: "查看",
			command: `/查看信息 ${player.id}`
		});
		if (player.rank > result.data.myRank) {
			topBtns.push({
				label: "扫荡",
				command: `/扫荡排名 ${player.rank} 5`
			});
			topBtns.push({
				label: "X10",
				command: `/扫荡排名 ${player.rank} 10`
			});
		}
		addOptions(md, topBtns);
	}
	if (result.data.nearby.length > 0) {
		md.addText("周围排名");
		md.addNewline();
		for (const player of result.data.nearby) {
			const powerText = `✊${formatCompactPower(player.power)}`;
			if (player.isMe) {
				md.addText(`【${player.rank}】${player.name}${powerText} 👈`);
				md.addNewline();
			} else {
				md.addText(`【${player.rank}】${player.name}${powerText} `);
				const nearBtns = [];
				if (!player.isFake) nearBtns.push({
					label: "查看",
					command: `/查看信息 ${player.id}`
				});
				if (player.rank > result.data.myRank) {
					nearBtns.push({
						label: "扫荡",
						command: `/扫荡排名 ${player.rank} 5`
					});
					nearBtns.push({
						label: "X10",
						command: `/扫荡排名 ${player.rank} 10`
					});
				} else nearBtns.push({
					label: "挑战",
					command: `/挑战排名 ${player.rank}`
				});
				addOptions(md, nearBtns);
			}
		}
	} else {
		md.addText("周围排名");
		md.addNewline();
		md.addText("暂无排名信息");
		md.addNewline();
	}
	md.addBlockquote(Format.createMarkdown().addText(`${result.data.challengeTip}`).addNewline().addText(`挑战所需：${result.data.challengeCost}点元力`).addNewline().addText(`${result.data.rewardTip}`));
	message.send(FormatGui({
		isPrivate,
		bid,
		header: [
			{
				label: "通天塔",
				command: "/通天塔"
			},
			{
				label: "妖塔",
				command: "/妖塔"
			},
			{
				label: "珍宝楼",
				command: "/珍宝楼"
			},
			{
				label: "灵脉攻防战",
				command: "/灵脉攻防战"
			},
			{
				label: "宗门大比",
				command: "/宗门大比"
			}
		],
		content: md,
		footer: [
			...tianjiaoButtons,
			{
				label: "连续爬",
				command: "/连续爬塔"
			},
			{
				label: "月度奖",
				command: "/月度排名奖励"
			},
			{
				label: "扫荡",
				command: "/扫荡排名"
			}
		]
	}));
});

//#endregion
export { res_default as default };