import { parseGuildRedPacketSend } from "./guild-red-packet-mutations.js";

//#region src/api/bot/guild-red-packet-send-robot-query.ts
function guildRedPacketSendArguments(args) {
	const number = (text) => text === void 0 ? null : {
		text,
		value: Number.isFinite(Number(text)) ? Number(text) : null
	};
	return {
		currency: args[0] ?? null,
		count: number(args[1]),
		amount: number(args[2])
	};
}
function parseRobotGuildRedPacketSend(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("发红包响应不完整");
	const data = value;
	if (data.outcome === "usage") return { outcome: "usage" };
	if (data.outcome !== "result") throw new Error("发红包响应不完整");
	return {
		outcome: "result",
		receipt: parseGuildRedPacketSend(data.receipt)
	};
}

//#endregion
export { guildRedPacketSendArguments, parseRobotGuildRedPacketSend };