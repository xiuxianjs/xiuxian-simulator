import { FormatGui } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { appendMiddlewareAdvice, appendMiddlewareBlocks } from "../../middlewareReply.js";
import { EMPTY_STRING } from "../../../constants/common.js";
import { parseRobotSkillDetail } from "../../../api/bot/skill-detail-queries.js";
import { detailRecoveryTips } from "../../detailRecovery.js";
import { selects } from "../../config.js";
import { adviceRenderer } from "../../feedbackRenderer.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { extractArgs } from "../../../utils/commandParser.js";
import { formatSkillBookDetail } from "../../../utils/skillBookHelper.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/skillBook/detail/res.ts
const response = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	try {
		const [, parentNext] = useEvent();
		const args = extractArgs(e.MessageText || "", /^(!|！|\/|#|＃)?查看功法\s*/);
		const response = await runRobotBusiness(e, "skill-books.detail", { bookId: args[0] ?? null }, parseRobotSkillDetail, parentNext, adviceRenderer(async (reply) => {
			const md = Format.createMarkdown();
			md.addText(reply.text);
			if (reply.quote) md.addBlockquote(Format.createMarkdown().addText(reply.quote));
			appendMiddlewareBlocks(md, reply.blocks?.filter((block) => block.text !== reply.text || block.inlineButtons?.length));
			appendMiddlewareAdvice(md, reply.advice);
			await message.send(FormatGui({
				isPrivate,
				bid,
				title: "",
				content: md,
				footer: reply.buttons.length ? reply.buttons : void 0
			}));
		}));
		if (response.handled) return;
		const result = { data: response.data };
		const md = formatSkillBookDetail(result.data.skillBook, result.data.skillBookId, result.data.proficiencyPoints);
		const view = result.data.skillBook.detailDisplay;
		const footer = [
			{
				label: "返回",
				command: "/我的功法"
			},
			{
				label: "升级",
				command: `/升级功法 ${result.data.skillBookId}`
			},
			{
				label: "换词",
				command: `/换词 ${result.data.skillBookId}`
			},
			...view.visibilityAction !== "NONE" ? [{
				label: view.visibilityLabel,
				command: `${{
					SHOW: "/显示功法",
					HIDE: "/隐藏功法"
				}[view.visibilityAction]} ${result.data.skillBookId}`
			}] : [],
			...view.canReset ? [{
				label: "重制",
				command: `/重制功法 ${result.data.skillBookId}`
			}] : []
		];
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "",
			content: md,
			footer
		}));
	} catch {
		const md = Format.createMarkdown();
		md.addText("查看功法详情失败，请稍后再试或联系运营。");
		appendMiddlewareAdvice(md, detailRecoveryTips("skill-books.detail", "查询失败"));
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "",
			content: md
		}));
	}
});

//#endregion
export { response as default };