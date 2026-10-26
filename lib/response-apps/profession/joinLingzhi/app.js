import { continueCurrentBackendLingzhiGuide, startBackendLingzhiGuide } from "../../../api/bot/lingzhi-guide.js";
import { isLingzhiGuideContinue } from "../../../api/bot/lingzhi-robot-guide.js";
import { logger } from "alemonjs";

//#region src/response-apps/profession/joinLingzhi/app.ts
async function App(params) {
	if (!params.uid) return { code: "INVALID_USER" };
	const uid = params.uid;
	try {
		if (isLingzhiGuideContinue(params.messageText)) {
			const advanced = await continueCurrentBackendLingzhiGuide(params.bid, uid, params.request, params.messageText);
			if (!advanced.session && !advanced.completed) return {
				code: "FAIL",
				data: { message: "你还未开始灵药师指引，请先使用 /加入灵药师" }
			};
			if (advanced.completed) return {
				code: "GUIDE_COMPLETED",
				data: { message: "灵药师指引已完成。\n已为你备好洞府灵田、灵锄，请前往 /灵田 查看。" }
			};
			if (!advanced.session) return {
				code: "FAIL",
				data: { message: "推进灵药师指引失败，请稍后重试。" }
			};
			return {
				code: "SHOW_STEP",
				data: { step: advanced.session.step }
			};
		}
		const started = await startBackendLingzhiGuide(params.bid, uid, params.request, params.messageText);
		if (!started.session) return {
			code: "FAIL",
			data: { message: "开启灵药师指引失败，请稍后重试。" }
		};
		return {
			code: "SHOW_STEP",
			data: { step: started.session.step }
		};
	} catch (error) {
		logger.error("灵药师指引 app 处理失败:", error);
		return {
			code: "FAIL",
			data: { message: "灵药师指引处理失败，请稍后重试。" }
		};
	}
}

//#endregion
export { App as default };