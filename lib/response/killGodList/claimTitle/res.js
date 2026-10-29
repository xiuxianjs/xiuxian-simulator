import { FormatGui } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { appendMiddlewareAdvice, sendMiddlewareReply } from "../../middlewareReply.js";
import { parseRobotKillGodTitleClaim } from "../../../api/bot/shaqi-queries.js";
import { titleRecoveryTips } from "../../titleRecovery.js";
import { selects } from "../../config.js";
import { adviceRenderer } from "../../feedbackRenderer.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/killGodList/claimTitle/res.ts
/**
* 领取杀神称号
* 指令：/领取杀神称号
*
* 条件：杀神榜上榜人数 ≥ 10，且自身是榜一
*/
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	const [, next] = useEvent();
	const sendFailure = async (text) => {
		const md = Format.createMarkdown().addText(text);
		appendMiddlewareAdvice(md, titleRecoveryTips("pvp.kill-god-title-claim", text));
		await message.send(FormatGui({
			isPrivate,
			bid,
			title: "领取杀神称号",
			content: md,
			footer: [{
				label: "杀神榜",
				command: "/杀神榜"
			}, {
				label: "我的称号",
				command: "/我的称号"
			}]
		}));
	};
	let result;
	try {
		result = await runRobotBusiness(e, "pvp.kill-god-title-claim", {}, parseRobotKillGodTitleClaim, next, adviceRenderer(async (reply) => {
			await sendMiddlewareReply(e, {
				...reply,
				title: "领取杀神称号",
				buttons: [
					{
						label: "杀神榜",
						command: "/杀神榜"
					},
					{
						label: "我的称号",
						command: "/我的称号"
					},
					...reply.buttons
				]
			});
		}));
	} catch {
		await sendFailure("领取失败，请稍后再试。");
		return;
	}
	if (result.handled) return;
	const md = Format.createMarkdown();
	md.addText("已获得称号「杀神」");
	message.send(FormatGui({
		isPrivate,
		bid,
		title: "领取杀神称号",
		content: md,
		footer: [{
			label: "杀神榜",
			command: "/杀神榜"
		}, {
			label: "我的称号",
			command: "/我的称号"
		}]
	}));
});

//#endregion
export { res_default as default };