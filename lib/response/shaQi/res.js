import { FormatGui, createQuoteMarkdown } from "../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../utils/useMessage.js";
import { parseRobotShaQi } from "../../api/bot/shaqi-queries.js";
import { selects } from "../config.js";
import { runRobotBusiness } from "../robotBusiness.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/shaQi/res.ts
/**
* 煞气查看
* 指令：/煞气
*
* 展示当前煞气值、称号、是否在杀神榜、消除途径
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
			title: "煞气",
			content: md,
			header: [{
				label: "悬赏榜",
				command: "/悬赏榜"
			}, {
				label: "杀神榜",
				command: "/杀神榜"
			}],
			footer: [
				{
					label: "记录",
					command: "/打劫记录"
				},
				{
					label: "悬赏",
					command: "/悬赏"
				},
				{
					label: "仇人",
					command: "/仇人"
				}
			]
		}));
	};
	let result;
	try {
		result = await runRobotBusiness(e, "pvp.sha-qi", {}, parseRobotShaQi, next, async (reply) => {
			await sendFailure(reply.text);
		});
	} catch {
		await sendFailure("获取煞气信息失败");
		return;
	}
	if (result.handled) return;
	const info = result.data;
	const md = Format.createMarkdown();
	md.addText(`煞气：${info.shaQi}${info.onKillGodList ? " · 已入杀神榜" : ""}`);
	md.addNewline();
	md.addText(`每日消散：${info.dailyDecayAmount}`);
	if (info.shaQi > 0) md.addBlockquote(createQuoteMarkdown([`金盆×1 · 煞气-${info.jinpenReduceAmount}`], [{
		label: "洗煞",
		command: "/消耗 金盆 1"
	}]));
	message.send(FormatGui({
		isPrivate,
		bid,
		title: "煞气",
		header: [{
			label: "悬赏榜",
			command: "/悬赏榜"
		}, {
			label: "杀神榜",
			command: "/杀神榜"
		}],
		footer: [
			{
				label: "记录",
				command: "/打劫记录"
			},
			{
				label: "悬赏",
				command: "/悬赏"
			},
			{
				label: "仇人",
				command: "/仇人"
			}
		],
		content: md
	}));
});

//#endregion
export { res_default as default };