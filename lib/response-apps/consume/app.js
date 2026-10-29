import { EMPTY_STRING, FIRST_ARG_INDEX, SECOND_ARG_INDEX } from "../../constants/common.js";
import { CONFIRM_KEYWORD } from "../../constants/skillBook.js";
import "../../constants/index.js";
import { consumeBackendItem, parseMingwuSelection, parsePeiyuanPending } from "../../api/bot/consume.js";
import { consumeInputProblem } from "../../response/consumeArguments.js";
import { refineBackendSoulArtifact } from "../../api/bot/soul-artifact-commands.js";

//#region src/response-apps/consume/app.ts
async function App(params) {
	const { bid, uid, rawText, request } = params;
	try {
		const problem = consumeInputProblem(rawText);
		if (problem) return {
			code: "FAIL",
			data: { message: problem }
		};
		const isLianhua = /^(!|！|\/|#|＃)?炼化/.test(rawText);
		const messageText = rawText.replace(/^(!|！|\/|#|＃)?(消耗|服用|学习丹方|炼化)\s*/, "").trim();
		const args = messageText ? messageText.split(/\s+/) : [];
		const itemIdOrName = args[0];
		const forceEquip = args[1] === CONFIRM_KEYWORD;
		if (isLianhua && itemIdOrName && /^\d+$/.test(itemIdOrName)) {
			const numericId = Number(itemIdOrName);
			const command = params.refine ? await params.refine() : await refineBackendSoulArtifact(bid, uid, numericId, forceEquip, request, rawText);
			const preview = command.preview;
			if (preview.found) {
				if (!forceEquip && preview.needsConfirmation && preview.current && preview.target) return {
					code: "SOUL_ARTIFACT_NEED_CONFIRM",
					data: {
						message: [
							"检测到当前已炼化本命物，是否替换？",
							"",
							`当前：【${preview.current.name}】【${preview.currentGradeName}】`,
							`待炼化：【${preview.target.name}】【${preview.targetGradeName}】`,
							preview.comparisonLines.length > 0 ? `\n面板对比:\n${preview.comparisonLines.map((line) => `- ${line}`).join("\n")}` : "",
							`\n${preview.refundLine}`
						].join(""),
						targetInstanceId: preview.target.instanceId
					}
				};
				const equipResult = command.equipped;
				if (!equipResult) throw new Error("炼化本命物响应不完整");
				const lines = [`成功炼化本命物「${equipResult.artifact.name}」`];
				if (equipResult.separated?.name) {
					const refundInfo = equipResult.separated.refundQuantity > 0 ? `（Lv.${equipResult.separated.previousLevel}已重置，退还筑灵石×${equipResult.separated.refundQuantity}）` : "";
					lines.push(`原本命物「${equipResult.separated.name}」已自动分离${refundInfo}`);
				}
				return {
					code: "SOUL_ARTIFACT_EQUIP",
					data: {
						success: true,
						message: lines.join("\n") + command.repeatSuffix
					}
				};
			}
			const generic = command.consumed;
			if (!generic) throw new Error("消耗道具响应不完整");
			if (generic.outcome === "peiyuan_pending") return {
				code: "PENDING_PEIYUAN",
				data: parsePeiyuanPending(generic.pending)
			};
			if (generic.outcome === "mingwu_select") return {
				code: "PENDING_MINGWU_SELECT",
				data: parseMingwuSelection(generic.pending)
			};
			if (generic.outcome === "rejected") return {
				code: "FAIL",
				data: { message: generic.message }
			};
			return {
				code: "OK",
				data: {
					message: generic.message,
					remainingQuantity: generic.remainingQuantity
				}
			};
		}
		if (!itemIdOrName || itemIdOrName === "") return {
			code: "MISSING_PARAM",
			data: { message: "参数错误" }
		};
		if (!isLianhua && /^\d+$/.test(itemIdOrName)) return {
			code: "NUMERIC_NOT_ALLOWED",
			data: { message: "请输入物品名称" }
		};
		const quantityStr = args[0 + 1];
		let quantity = 1;
		if (quantityStr) {
			quantity = parseInt(quantityStr, 10);
			if (isNaN(quantity) || quantity < 1) return {
				code: "INVALID_QUANTITY",
				data: { message: "数量必须是大于0的整数" }
			};
		}
		const result = params.consume ? await params.consume() : await consumeBackendItem(bid, uid, {
			itemName: itemIdOrName,
			quantity
		}, request, rawText);
		if (result.outcome === "peiyuan_pending") return {
			code: "PENDING_PEIYUAN",
			data: parsePeiyuanPending(result.pending)
		};
		if (result.outcome === "mingwu_select") return {
			code: "PENDING_MINGWU_SELECT",
			data: parseMingwuSelection(result.pending)
		};
		if (result.outcome === "rejected") return {
			code: "FAIL",
			data: { message: result.message }
		};
		return {
			code: "OK",
			data: {
				message: result.message,
				remainingQuantity: result.remainingQuantity
			}
		};
	} catch (error) {
		return {
			code: "ERROR",
			data: { message: error?.message ?? "消耗道具失败，请稍后再试或联系运营。" }
		};
	}
}

//#endregion
export { App as default };