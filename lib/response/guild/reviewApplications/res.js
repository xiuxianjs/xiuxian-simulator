import { parseGuildReview } from "../../../api/bot/guild-review-queries.js";
import { FormatGui, createQuoteMarkdown } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/guild/reviewApplications/res.ts
/**
* 宗门审核指令响应处理
* 指令格式: /宗门审核
* 查看待审核的申请列表（仅长老及以上）
*/
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	const [, next] = useEvent();
	try {
		const match = (e.MessageText ?? "").match(/^[!！/#＃]?宗门审核(?:\s+(\d+))?$/);
		let page = match?.[1] ? parseInt(match[1], 10) : 1;
		if (page < 1 || !Number.isInteger(page)) page = 1;
		const loaded = await runRobotBusiness(e, "guild.review-applications", { page }, parseGuildReview, next, async (reply) => {
			const md = Format.createMarkdown();
			if (reply.heading) {
				md.addBold(reply.heading);
				md.addNewline();
			}
			md.addText(reply.text);
			await message.send(FormatGui({
				isPrivate,
				bid,
				title: "",
				content: md,
				footer: reply.buttons
			}));
		});
		if (loaded.handled) return;
		const data = loaded.data;
		handleReviewDisplay({
			...data,
			applications: data.applications.map((row) => ({
				...row,
				userName: row.userName ?? "未知",
				realmName: row.realmName ?? "未知"
			}))
		}, { guildName: data.guildName ?? "" }, message, bid, Number(e.uid), isPrivate);
	} catch (error) {
		logger.error("[宗门审核] 处理错误:", error);
		const md = Format.createMarkdown();
		md.addText("查看申请列表失败，请稍后重试");
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "",
			content: md
		}));
	}
});
function handleReviewDisplay(result, guildInfo, message, bid, _uid, isPrivate = false) {
	try {
		if (result.total === 0) {
			const md = Format.createMarkdown();
			md.addBold("📋 宗门审核");
			md.addNewline();
			md.addText(`【${guildInfo.guildName}】`);
			md.addNewline();
			md.addText("");
			md.addNewline();
			md.addText("暂无待审核的申请");
			message.send(FormatGui({
				isPrivate,
				bid,
				title: "",
				content: md
			}));
			return;
		}
		const md = Format.createMarkdown();
		md.addBold("📋 宗门审核");
		md.addNewline();
		md.addText(`【${guildInfo.guildName}】`);
		md.addNewline();
		md.addText("");
		md.addNewline();
		result.applications.forEach((app) => {
			md.addBlockquote(createQuoteMarkdown([`【${app.userId}】【${app.realmName}】${app.userName}`], [{
				label: "同意",
				command: `/宗门审核同意 ${app.userId}`
			}, {
				label: "拒绝",
				command: `/宗门审核拒绝 ${app.userId}`
			}]));
			md.addNewline();
		});
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "",
			content: md,
			nav: {
				current: result.currentPage,
				total: result.totalPages,
				count: result.total,
				command: "/宗门审核 {page}"
			}
		}));
	} catch (error) {
		logger.error("[宗门审核显示] 处理错误:", error);
		const md = Format.createMarkdown();
		md.addText("显示审核列表失败，请稍后重试");
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "",
			content: md
		}));
	}
}

//#endregion
export { res_default as default };