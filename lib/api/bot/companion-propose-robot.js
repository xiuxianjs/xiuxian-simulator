import { parseCompanionProposalPreflight } from "./companion-proposal-preflight.js";
import { parseCompanionProposalCommand } from "./interaction-overview.js";

//#region src/api/bot/companion-propose-robot.ts
function parseRobotCompanionPropose(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("道侣申请响应不完整");
	const data = value;
	if (data.mode === "friends") return {
		mode: "friends",
		preflight: parseCompanionProposalPreflight(data.preflight)
	};
	if (data.mode !== "command") throw new Error("道侣申请响应不完整");
	return {
		mode: "command",
		command: parseCompanionProposalCommand(data.command)
	};
}

//#endregion
export { parseRobotCompanionPropose };