import { FormatGui } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { isLingzhiGuideContinue, parseRobotLingzhiGuide } from "../../../api/bot/lingzhi-robot-guide.js";
import { Format, logger, onResponse, useEvent } from "alemonjs";

//#region src/response/profession/joinLingzhi/res.ts
const LINGZHI_GUIDE_CONTINUE_COMMAND = "/继续灵药指引";
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	try {
		const [, next] = useEvent();
		const response = await runRobotBusiness(e, "profession.lingzhi-guide", { continued: isLingzhiGuideContinue(e.MessageText) }, parseRobotLingzhiGuide, next, async (reply) => {
			await message.send(FormatGui({
				isPrivate,
				bid,
				title: reply.title,
				content: Format.createMarkdown().addText(reply.text)
			}));
		});
		if (response.handled) return;
		const result = response.data;
		if (result.code === "GUIDE_COMPLETED") {
			const md = Format.createMarkdown();
			md.addText("🌿 灵药师指引完成！");
			md.addNewline();
			md.addNewline();
			md.addText("你俯身拢土，灵息顺着掌心沉入田垄，洞府中的第一缕草木生机自此扎根。");
			md.addNewline();
			md.addNewline();
			md.addText(result.data.message);
			sendGuideMessage({
				message,
				bid,
				isPrivate,
				title: "灵药师指引",
				content: md,
				footer: [{
					label: "灵田",
					command: "/灵田"
				}, {
					label: "我的职业",
					command: "/我的职业"
				}]
			});
			return;
		}
		if (result.code !== "SHOW_STEP") throw new Error("LINGZHI_GUIDE_UNEXPECTED_RESULT");
		showGuideStep({
			step: result.data.step,
			message,
			bid,
			isPrivate
		});
	} catch (error) {
		logger.error("灵药师指引失败:", error);
		const md = Format.createMarkdown();
		md.addText("灵药师指引处理失败，请稍后重试。");
		sendGuideMessage({
			message,
			bid,
			isPrivate,
			title: "灵药师指引",
			content: md
		});
	}
});
function showGuideStep(params) {
	const { step, message, bid, isPrivate } = params;
	switch (step) {
		case 1: {
			const md = Format.createMarkdown();
			md.addText("🌿 灵药师指引");
			md.addNewline();
			md.addNewline();
			md.addText("洞府石门轻启，潮润灵气扑面而来。青苔沿石阶生长，一片荒置药圃静卧在微光之下。");
			md.addNewline();
			md.addText("灵植执事俯身捻起一撮泥土，缓声道：“灵药师修的不是锋芒，而是草木生机。先学会认田，才能种出真正有灵性的药材。”");
			sendGuideMessage({
				message,
				bid,
				isPrivate,
				title: "灵药师指引",
				content: md,
				footer: [{
					label: "继续",
					command: LINGZHI_GUIDE_CONTINUE_COMMAND
				}]
			});
			break;
		}
		case 2: {
			const md = Format.createMarkdown();
			md.addText("🪴 识田");
			md.addNewline();
			md.addNewline();
			md.addText("“灵田最怕两件事：一是根基不稳，二是心浮气躁。”执事抬手指向田垄，“田分品阶，草木有性，浇灌、除虫、除草、收割，皆要按节气与状态来做。”");
			md.addNewline();
			md.addText("“待药香漫过田垄，便是草木回馈修行之时。”");
			sendGuideMessage({
				message,
				bid,
				isPrivate,
				title: "灵药师指引",
				content: md,
				footer: [{
					label: "继续",
					command: LINGZHI_GUIDE_CONTINUE_COMMAND
				}]
			});
			break;
		}
		case 3: {
			const md = Format.createMarkdown();
			md.addText("🧰 领工具");
			md.addNewline();
			md.addNewline();
			md.addText("执事将灵锄、灵土与聚灵草种装好，放到你面前。");
			md.addNewline();
			md.addText("“完成指引后，先查看入门物资，再亲手开垦、播种与浇灌。收获后记得补种，让药圃接着生长。”");
			sendGuideMessage({
				message,
				bid,
				isPrivate,
				title: "灵药师指引",
				content: md,
				footer: [{
					label: "继续",
					command: LINGZHI_GUIDE_CONTINUE_COMMAND
				}]
			});
			break;
		}
		case 4: {
			const md = Format.createMarkdown();
			md.addText("✅ 准备开启灵田");
			md.addNewline();
			md.addNewline();
			md.addText("执事轻轻点头：“去吧，从今日起，你便以灵药师身份照料洞府灵田。先把田开起来，再谈后面的草木之道。”");
			sendGuideMessage({
				message,
				bid,
				isPrivate,
				title: "灵药师指引",
				content: md,
				footer: [{
					label: "完成指引",
					command: LINGZHI_GUIDE_CONTINUE_COMMAND
				}]
			});
			break;
		}
		default: {
			const md = Format.createMarkdown();
			md.addText("未知的灵药师指引步骤。");
			sendGuideMessage({
				message,
				bid,
				isPrivate,
				title: "灵药师指引",
				content: md
			});
		}
	}
}
function sendGuideMessage(params) {
	const { message, bid, isPrivate, title = "", content, footer = [] } = params;
	message.send(FormatGui({
		isPrivate,
		bid,
		title,
		content,
		footer
	}));
}

//#endregion
export { res_default as default };