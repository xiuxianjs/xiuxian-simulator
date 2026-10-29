import { parseNativeComebackClaim } from "../../../api/bot/native-comeback.js";
import { FormatGui } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/comeback/nativeClaim/res.ts
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	const md = Format.createMarkdown();
	const [, next] = useEvent();
	const renderFailure = async (text) => {
		const content = Format.createMarkdown();
		content.addText(text);
		await message.send(FormatGui({
			isPrivate,
			bid,
			title: "回归签到",
			content,
			footer: [{
				label: "回归奖励",
				command: "/回归奖励"
			}, {
				label: "我的信息",
				command: "/我的信息"
			}]
		}));
	};
	let data;
	try {
		const loaded = await runRobotBusiness(e, "native-comeback.claim", {}, parseNativeComebackClaim, next, (reply) => renderFailure(reply.text));
		if (loaded.handled) return;
		data = loaded.data;
	} catch (error) {
		await renderFailure(error instanceof Error ? error.message : "领取本服回归奖励失败");
		return;
	}
	md.addText(data.message);
	if (data.rewardSummary.length > 0) {
		md.addNewline();
		md.addNewline();
		for (const reward of data.rewardSummary) {
			md.addText(reward);
			md.addNewline();
		}
	}
	message.send(FormatGui({
		isPrivate,
		bid,
		title: "回归签到",
		content: md,
		footer: [{
			label: "回归奖励",
			command: "/回归奖励"
		}, {
			label: "我的信息",
			command: "/我的信息"
		}]
	}));
});

//#endregion
export { res_default as default };