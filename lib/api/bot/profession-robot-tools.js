import { parseProfessionToolBag } from "./queries.js";
import { parseProfessionToolReplace } from "./profession-tool-replace.js";

//#region src/api/bot/profession-robot-tools.ts
function parseProfessionToolCommand(messageText) {
	return messageText.trim().match(/^(!|！|\/|#|＃)?(替换|切换)(?:\s+(.+))?$/)?.[3]?.trim();
}
function parseProfessionRobotTools(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("天工业务结果不完整");
	const row = value;
	if (row.mode === "list") return {
		code: "LIST",
		data: { tools: parseProfessionToolBag(row.bag).items.filter((item) => item.canReplace).map((item) => ({
			id: item.id,
			name: item.name,
			typeName: item.typeName,
			grade: item.grade,
			isLocked: item.isLocked
		})) }
	};
	if (row.mode === "replace") {
		const result = parseProfessionToolReplace(row.result);
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
	}
	throw new Error("天工业务分支无效");
}

//#endregion
export { parseProfessionRobotTools, parseProfessionToolCommand };