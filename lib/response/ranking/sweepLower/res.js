import { FormatGui, addOptions } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { parseRobotTowerSweep, rankingSweepArguments } from "../../../api/bot/ranking-robot-query.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/ranking/sweepLower/res.ts
/**
* 扫荡排名 — 选择比自己排名低的对手进行扫荡
* 指令：/扫荡排名 N [次数]  或  /扫荡排名（无参数查看后10名）
*
* 跳过战斗，直接完成扫荡，无冷却。
* 扫荡不会改变排名（因为对手排名更低）。
*/
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const [, next] = useEvent();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	let result;
	try {
		const loaded = await runRobotBusiness(e, "ranking.sweep", rankingSweepArguments(e.MessageText || ""), parseRobotTowerSweep, next, async (reply) => {
			await message.send(FormatGui({
				isPrivate,
				bid,
				title: "",
				content: Format.createMarkdown().addText(reply.text),
				footer: void 0
			}));
		});
		if (loaded.handled) return;
		result = loaded.data;
	} catch (error) {
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "",
			content: Format.createMarkdown().addText(error instanceof Error ? error.message : "扫荡排名失败，请稍后再试")
		}));
		return;
	}
	if (result.code === "LIST_EMPTY") {
		const md = Format.createMarkdown();
		md.addText("你已经是最后一名了，没有更低排名的对手");
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "",
			content: md
		}));
		return;
	}
	if (result.code === "LIST") {
		const md = Format.createMarkdown();
		md.addBold("扫荡列表");
		md.addNewline();
		md.addBlockquote(Format.createMarkdown().addText(`当前排名：第${result.data.myRank}名`));
		for (const entry of result.data.entries) {
			md.addText(`【${entry.rank}】${entry.name} ✊${entry.power} `);
			const btns = [];
			if (!entry.isFake) btns.push({
				label: "查看",
				command: `/查看信息 ${entry.id}`
			});
			btns.push({
				label: "扫荡",
				command: `/扫荡排名 ${entry.rank} 1`
			});
			btns.push({
				label: "X10",
				command: `/扫荡排名 ${entry.rank} 10`
			});
			addOptions(md, btns);
		}
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "",
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
				}
			],
			content: md,
			footer: [
				{
					label: "连续爬",
					command: "/连续爬塔"
				},
				{
					label: "首通奖",
					command: "/首通排名奖励"
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
		return;
	}
	{
		const md = Format.createMarkdown();
		md.addBold("通天塔 · 扫荡").addNewline().addNewline();
		md.addBlockquote(Format.createMarkdown().addText(`扫荡次数：${result.data.sweepCount}次`).addNewline().addText(`获得修为：+${result.data.experienceGained}${result.data.experienceBonusText}  声望：+${result.data.reputationGained}`));
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "",
			content: md,
			footer: [{
				label: "继续扫",
				command: e.MessageText
			}, {
				label: "扫荡",
				command: "/扫荡排名"
			}]
		}));
	}
});

//#endregion
export { res_default as default };