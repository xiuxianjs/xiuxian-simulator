import { chooseBackendSoulPath, getBackendSoulPathState, nurtureBackendSoulPath, setBackendSoulSupplyDirection } from "../../api/bot/soul-path.js";
import { logger } from "alemonjs";

//#region src/response-apps/soulPath/app.ts
const PATH_INPUT_MAP = {
	玄法: "xuan_fa",
	玄法道: "xuan_fa",
	炼体: "lian_ti",
	炼体道: "lian_ti",
	御器: "yu_qi",
	御器道: "yu_qi"
};
const DIRECTION_INPUT_MAP = {
	定魂: "ding_hun",
	养魄: "yang_po",
	悟道: "wu_dao",
	出窍: "chu_qiao"
};
const parseSoulPathInput = (value) => PATH_INPUT_MAP[value.trim()] ?? null;
const parseSoulNurtureDirection = (value) => DIRECTION_INPUT_MAP[value.trim()] ?? null;
async function executeSoulSupplyChoice(bid, uid, input, request) {
	const direction = parseSoulNurtureDirection(input);
	if (!direction && input.trim() !== "自动") return {
		success: false,
		message: "用法：/神魂补给 <自动|定魂|养魄|悟道|出窍>"
	};
	try {
		return {
			success: true,
			data: await setBackendSoulSupplyDirection(bid, uid, direction, request),
			message: ""
		};
	} catch (error) {
		logger.error("[神魂补给] 设置失败:", error);
		return {
			success: false,
			message: error instanceof Error ? error.message : "补给设置失败，请稍后再试。"
		};
	}
}
async function loadSoulPanel(bid, uid, request) {
	try {
		return {
			success: true,
			data: await getBackendSoulPathState(bid, uid, request)
		};
	} catch (error) {
		logger.error("[元婴神魂] 面板加载失败:", error);
		return {
			success: false,
			message: error instanceof Error ? error.message : "元婴神魂面板加载失败，请稍后再试。"
		};
	}
}
const loadSoulPathDetails = loadSoulPanel;
async function executeSoulNurture(bid, uid, directionInput, request) {
	const direction = parseSoulNurtureDirection(directionInput);
	if (!direction) return {
		success: false,
		message: "用法：/神魂温养 <定魂|养魄|悟道|出窍>"
	};
	try {
		return {
			success: true,
			data: await nurtureBackendSoulPath(bid, uid, direction, request)
		};
	} catch (error) {
		logger.error("[神魂温养] 执行失败:", error);
		return {
			success: false,
			message: error instanceof Error ? error.message : "神魂温养失败，请稍后再试。"
		};
	}
}
async function executeSoulChoose(bid, uid, pathInput, request) {
	const pathKey = parseSoulPathInput(pathInput);
	if (!pathKey) return {
		success: false,
		message: "用法：/选择道途 <玄法|炼体|御器>"
	};
	try {
		return {
			success: true,
			data: await chooseBackendSoulPath(bid, uid, pathKey, request)
		};
	} catch (error) {
		logger.error("[选择道途] 执行失败:", error);
		return {
			success: false,
			message: error instanceof Error ? error.message : "选择道途失败，请稍后再试。"
		};
	}
}

//#endregion
export { executeSoulChoose, executeSoulNurture, executeSoulSupplyChoice, loadSoulPanel, loadSoulPathDetails, parseSoulNurtureDirection, parseSoulPathInput };