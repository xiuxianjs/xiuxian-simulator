import { SDKError } from "../core/error.js";

//#region src/api/bot/robot-bid.ts
/** 平台数字 ID 仅在可无损转换时接受；不使用昵称或其他身份代替。 */
function normalizeRobotBid(value) {
	let bid;
	if (typeof value === "string") bid = value;
	else if (typeof value === "number" && Number.isSafeInteger(value) && value > 0) bid = String(value);
	else if (typeof value === "bigint" && value > 0n) bid = String(value);
	else throw new SDKError("无法识别玩家平台标识：UserId 缺失或类型无效，请检查平台适配器。", { code: "SDK_ROBOT_BID_INVALID" });
	if (!bid || bid.length > 255 || bid.trim() !== bid || bid.includes(",") || /[^\x20-\x7e]/.test(bid)) throw new SDKError("玩家平台标识格式无效：UserId 必须为 1 至 255 字节的 ASCII 标识，且不能包含逗号或首尾空白。", { code: "SDK_ROBOT_BID_INVALID" });
	return bid;
}

//#endregion
export { normalizeRobotBid };