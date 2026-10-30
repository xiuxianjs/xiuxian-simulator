import { parseBackendCompanionOathPreview } from "./companion-oath-preview.js";
import { parseCompanionProposalInbox } from "./companion-proposal-queries.js";

//#region src/api/bot/companion-actions-robot.ts
function record(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("道侣操作响应不完整");
	return value;
}
function result(data) {
	if (data.mode !== "result" || typeof data.message !== "string") throw new Error("道侣操作响应不完整");
	return {
		mode: "result",
		message: data.message
	};
}
function parseRobotCompanionProposalAction(value) {
	const data = record(value);
	if (data.mode === "list") return {
		mode: "list",
		received: parseCompanionProposalInbox(data).map((p) => ({
			fromName: p.fromName,
			intimacy: p.intimacy
		}))
	};
	return result(data);
}
function parseRobotCompanionRejection(value) {
	return result(record(value));
}
function parseRobotCompanionBreakup(value) {
	const data = record(value);
	if (data.mode === "preview") {
		if (typeof data.partnerName !== "string") throw new Error("道侣操作响应不完整");
		return {
			mode: "preview",
			partnerName: data.partnerName
		};
	}
	const mutation = result(data);
	if (typeof data.narrativeText !== "string" || !data.narrativeText.trim()) throw new Error("解除道侣响应缺少服务端叙事");
	return {
		...mutation,
		narrativeText: data.narrativeText
	};
}
function parseRobotCompanionOathUpgrade(value) {
	const data = record(value);
	if (data.mode === "preview") return {
		mode: "preview",
		...parseBackendCompanionOathPreview(data)
	};
	const mutation = result(data);
	if (typeof data.partnerName !== "string") throw new Error("誓约升级预览数据不完整");
	return {
		...mutation,
		partnerName: data.partnerName
	};
}

//#endregion
export { parseRobotCompanionBreakup, parseRobotCompanionOathUpgrade, parseRobotCompanionProposalAction, parseRobotCompanionRejection };