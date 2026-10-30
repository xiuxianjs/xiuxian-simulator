import { FormatGui, createQuoteMarkdown } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { parseRobotRealmOverview } from "../../../api/bot/realm-overview.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { Format, logger, onResponse, useEvent } from "alemonjs";

//#region src/response/realms/myRealm/res.ts
/**
* 我的境界指令
* 综合显示当前境界、下一境界、突破/晋级条件、概率等信息
* 取代原先的"突破条件"和"晋级条件"指令
*/
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	try {
		const [, parentNext] = useEvent();
		const response = await runRobotBusiness(e, "realm.overview", {}, parseRobotRealmOverview, parentNext, async (reply) => {
			const md = Format.createMarkdown();
			md.addText(reply.text);
			await message.send(FormatGui({
				isPrivate,
				bid,
				title: "",
				content: md
			}));
		});
		if (response.handled) return;
		const result = { data: response.data };
		const md = Format.createMarkdown();
		for (const section of result.data.sections) {
			if (section.title) {
				md.addBold(section.title);
				md.addNewline();
			}
			md.addBlockquote(createQuoteMarkdown(section.lines));
			md.addNewline();
		}
		const footer = [];
		md.addNewline();
		if (result.data.showBreakthrough) footer.push({
			label: "突破",
			command: "/突破"
		});
		if (result.data.showPromotion) footer.push({
			label: "晋级",
			command: "/晋级"
		});
		if (result.data.showTribulation) footer.push({
			label: "我的劫云",
			command: "/我的渡劫"
		});
		footer.push({
			label: "劫云榜",
			command: "/劫云榜"
		});
		if (result.data.canUseSoulPath) footer.push({
			label: "道途",
			command: "/元婴道途"
		});
		footer.push({
			label: "我的主页",
			command: "/我"
		});
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "",
			content: md,
			footer
		}));
	} catch (error) {
		logger.error("查看我的境界失败:", error);
		const md = Format.createMarkdown();
		md.addText("查看境界信息时发生错误，请稍后再试。");
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "",
			content: md
		}));
	}
});

//#endregion
export { res_default as default };