import { BackendAPIError } from "../../../api/bot/client.js";
import { getBackendProfessionToolBag } from "../../../api/bot/queries.js";
import { replaceBackendProfessionTool } from "../../../api/bot/profession-tool-replace.js";
import { parseProfessionToolCommand } from "../../../api/bot/profession-robot-tools.js";
import "../../../api/bot/index.js";
import { logger } from "alemonjs";

//#region src/response-apps/profession/replaceEquip/app.ts
async function App(params) {
	const identifier = parseProfessionToolCommand(params.messageText);
	try {
		if (!identifier) {
			const { items: tools } = await getBackendProfessionToolBag(params.bid, params.uid);
			return {
				code: "LIST",
				data: { tools: tools.filter((item) => item.canReplace).map((item) => ({
					id: item.id,
					name: item.name,
					typeName: item.typeName,
					grade: item.grade,
					isLocked: item.isLocked
				})) }
			};
		}
		const result = await replaceBackendProfessionTool(params.bid, params.uid, identifier, params.request);
		return {
			code: "OK",
			data: {
				message: result.message,
				equipment: {
					name: result.toolName,
					gradeName: result.gradeName,
					typeName: result.typeName
				}
			}
		};
	} catch (error) {
		logger.error("替换职业工具失败:", error);
		if (error instanceof BackendAPIError) return {
			code: "FAILED",
			message: error.message,
			uid: params.uid
		};
		return { code: "ERROR" };
	}
}

//#endregion
export { App as default };