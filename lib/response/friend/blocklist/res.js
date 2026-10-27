import { formatGameTimeAgo } from "../../../utils/gameTime.js";
import { parseBackendBlocklist } from "../../../api/bot/queries.js";
import { FormatGui, addOptions } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { appendMiddlewareAdvice } from "../../middlewareReply.js";
import { friendRecoveryTips } from "../../friendRecovery.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { sendFifthLayerLockedPage } from "../../access/fifthLayerView.js";
import "../../access/fifthLayer.js";
import { parseGuardedSocialQuery } from "../../../api/bot/social-robot-query.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/friend/blocklist/res.ts
/**
* 黑名单列表指令
*/
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	const [, next] = useEvent();
	const result = await runRobotBusiness(e, "friends.blocklist", {}, (data) => parseGuardedSocialQuery(data, parseBackendBlocklist), next);
	if (result.handled) return;
	const { access: fifthLayerAccess, data: items } = result.data;
	if (!fifthLayerAccess.ok) {
		sendFifthLayerLockedPage({
			bid,
			isPrivate,
			message,
			title: "黑名单",
			realmName: fifthLayerAccess.realmName
		});
		return;
	}
	if (items === null) return;
	if (items.length === 0) {
		const md = Format.createMarkdown();
		md.addText("黑名单为空");
		appendMiddlewareAdvice(md, friendRecoveryTips("friends.blocklist", "黑名单为空"));
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "【黑名单】",
			content: md
		}));
		return;
	}
	const md = Format.createMarkdown();
	md.addText(`共${items.length}人`);
	md.addNewline();
	items.forEach((item) => {
		const timeAgo = formatGameTimeAgo(item.createdAt, true);
		md.addNewline();
		md.addText(`【${item.id}】${item.blockedUserName} - ${timeAgo}`);
		addOptions(md, [{
			label: "取消",
			command: `/取消拉黑 ${item.id}`
		}]);
	});
	message.send(FormatGui({
		isPrivate,
		bid,
		title: "【黑名单】",
		content: md
	}));
});
/**
* 获取时间差描述
*/

//#endregion
export { res_default as default };