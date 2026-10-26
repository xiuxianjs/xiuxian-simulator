import { FormatGui } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { appendMiddlewareAdvice } from "../../middlewareReply.js";
import { withBusinessRecovery } from "../../businessRecovery.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { parseStorylineAllChestClaim } from "../../../api/bot/storyline-chest-claim.js";
import { Format, logger, onResponse, useEvent } from "alemonjs";

//#region src/response/storyline/claimAllChests/res.ts
/**
* 一键领取所有章节宝箱
* /一键领取宝箱
*/
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const [, parentNext] = useEvent();
	try {
		const resultMd = Format.createMarkdown();
		const response = await runRobotBusiness(e, "storyline.chests-claim-all", {}, parseStorylineAllChestClaim, parentNext, async (reply) => {
			await message.send(FormatGui({
				isPrivate: e.isPrivate ?? false,
				bid,
				title: "副本 - 一键领取宝箱",
				header: reply.buttons,
				content: Format.createMarkdown().addText(reply.text)
			}));
		});
		if (response.handled) return;
		const result = { data: response.data };
		if (result.data.success) {
			resultMd.addText(`🎁 ${result.data.message}`);
			resultMd.addNewline();
			resultMd.addNewline();
			for (const detail of result.data.details) {
				resultMd.addText(`第${detail.chapterNumber}章 ${detail.chapterName}：宝箱×${detail.claimed.length}，灵晶×${detail.reward}`);
				resultMd.addNewline();
			}
		}
		if (!result.data.success) {
			resultMd.addText(result.data.message);
			appendMiddlewareAdvice(resultMd, withBusinessRecovery("storyline.chests-claim-all", {
				title: "",
				heading: "",
				text: result.data.message,
				buttons: [],
				advice: []
			}).advice);
		}
		message.send(FormatGui({
			isPrivate: e.isPrivate ?? false,
			bid,
			title: "副本 - 一键领取宝箱",
			header: [{
				label: "返回",
				command: "/查看主线"
			}, {
				label: "秘境",
				command: "/查看秘境"
			}],
			content: resultMd
		}));
	} catch (_error) {
		logger.error("一键领取宝箱失败:", _error);
		const errMd = Format.createMarkdown();
		errMd.addText("❌ 领取失败，请稍后重试");
		message.send(FormatGui({
			isPrivate: e.isPrivate ?? false,
			bid,
			title: "副本 - 一键领取宝箱",
			header: [{
				label: "返回",
				command: "/查看主线"
			}],
			content: errMd
		}));
	}
});

//#endregion
export { res_default as default };