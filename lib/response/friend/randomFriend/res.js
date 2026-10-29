import { markdownButtonLabel } from "../../../utils/buttonLabel.js";
import { FormatGui } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { appendMiddlewareAdvice } from "../../middlewareReply.js";
import { parseBackendRandomFriend } from "../../../api/bot/random-friend-queries.js";
import { friendRecoveryTips } from "../../friendRecovery.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { sendFifthLayerLockedPage } from "../../access/fifthLayerView.js";
import "../../access/fifthLayer.js";
import { Format, logger, onResponse, useEvent } from "alemonjs";

//#region src/response/friend/randomFriend/res.ts
/**
* 随机好友推荐指令
* 指令：/随机好友
*/
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	const [, next] = useEvent();
	try {
		const result = await runRobotBusiness(e, "friends.random", {}, parseBackendRandomFriend, next);
		if (result.handled) return;
		if (!result.data.access.ok) {
			sendFifthLayerLockedPage({
				bid,
				isPrivate,
				message,
				title: "随机好友",
				realmName: result.data.access.realmName ?? "未知"
			});
			return;
		}
		if (!result.data.player) {
			const md = Format.createMarkdown();
			md.addText("当前没有可以推荐的道友，请稍后再试");
			appendMiddlewareAdvice(md, friendRecoveryTips("friends.random", "当前没有可以推荐的道友，请稍后再试"));
			message.send(FormatGui({
				isPrivate,
				bid,
				title: "随机推荐道友",
				content: md
			}));
			return;
		}
		const { uid: targetUid, name } = result.data.player;
		const realmName = result.data.player.realmName ?? "无境界";
		const activeTitle = result.data.player.activeTitle ?? "无";
		{
			const md = Format.createMarkdown();
			md.addText(`UID: ${targetUid} `);
			md.addButton(markdownButtonLabel("结交"), { data: `/结交 ${targetUid}` });
			md.addText(" ");
			md.addButton(markdownButtonLabel("查看"), { data: `/查看信息 ${targetUid}` });
			md.addText(" ");
			md.addButton(markdownButtonLabel("比试"), { data: `/比试 ${targetUid}` });
			md.addNewline();
			md.addText(`道号：${name}`);
			md.addNewline();
			md.addText(`称号：${activeTitle}`);
			md.addNewline();
			md.addText(`境界：${realmName}`);
			md.addNewline();
			md.addNewline();
			md.addText("茫茫人海，缘来是你，不妨结为道友，共赴仙途");
			message.send(FormatGui({
				isPrivate,
				bid,
				title: "随机推荐道友",
				content: md
			}));
		}
	} catch (error) {
		logger.error("[随机好友] 错误:", error);
		const md = Format.createMarkdown();
		md.addText(error instanceof Error ? error.message : "推荐道友失败，请稍后再试");
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "随机推荐道友",
			content: md
		}));
	}
});

//#endregion
export { res_default as default };