import { BackendAPIError } from "../../../api/bot/client.js";
import { getBackendSkillBookSwitchOptions } from "../../../api/bot/skill-book-switch-options.js";
import { switchBackendSkillBook } from "../../../api/bot/skill-book-switch.js";
import { logger } from "alemonjs";

//#region src/response-apps/skillBook/switch/app.ts
async function switchOptions(bid, uid, skillTypeName) {
	const typeSkillBooks = await getBackendSkillBookSwitchOptions(bid, uid, skillTypeName);
	if (typeSkillBooks.length === 0) return {
		code: "NO_SKILL_BOOKS",
		data: { message: `您还没有已学习的${skillTypeName}类功法` }
	};
	return {
		code: "SHOW_LIST",
		data: {
			typeSkillBooks,
			skillTypeName
		}
	};
}
async function App(params) {
	try {
		if (!params.skillBookId) return await switchOptions(params.bid, params.uid, params.skillTypeName);
		const result = await switchBackendSkillBook(params.bid, params.uid, params.skillBookId, params.skillTypeName, params.forceSwitch, params.request, params.messageText);
		if (result.outcome === "confirmation_required") return {
			code: "NEED_CONFIRM",
			data: {
				actualSkillBookId: result.skillBook.id,
				message: result.confirmationMessage
			}
		};
		return {
			code: "OK",
			data: { result: {
				success: true,
				skillBook: result.skillBook,
				oldSkillBook: result.oldSkillBook
			} }
		};
	} catch (error) {
		if (error instanceof BackendAPIError) {
			if (error.code === "SKILL_BOOK_NOT_LEARNED") try {
				return await switchOptions(params.bid, params.uid, params.skillTypeName);
			} catch (loadError) {
				logger.error(`加载${params.skillTypeName}切换列表失败:`, loadError);
				return {
					code: "LOAD_FAILED",
					data: { message: `切换${params.skillTypeName}失败，请稍后再试或联系运营。` }
				};
			}
			return {
				code: "FAILED",
				data: { message: error.message }
			};
		}
		logger.error(`切换${params.skillTypeName}失败:`, error);
		return {
			code: "LOAD_FAILED",
			data: { message: `切换${params.skillTypeName}失败，请稍后再试或联系运营。` }
		};
	}
}

//#endregion
export { App as default };