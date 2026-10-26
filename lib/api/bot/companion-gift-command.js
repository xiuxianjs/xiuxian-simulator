import { repeatPresentationHeaders } from "./repeat-presentation.js";
import { requestBackend } from "./client.js";
import { parseCompanionGiftOptions, parseCompanionGiftTargets } from "./companion-gift-preparation-queries.js";
import { parseCompanionGiftSettlement } from "./companion-gift.js";

//#region src/api/bot/companion-gift-command.ts
async function commandBackendCompanionGift(bid, uid, input, request, repeatCommand) {
	if (!bid) throw new Error("查询缺少平台身份");
	return parseCompanionGiftCommand(await requestBackend(bid, "post_players_id_companion_gifts_command", {
		headers: repeatPresentationHeaders(request?.idempotencyKey ? repeatCommand : void 0),
		path: { id: uid },
		body: input,
		requestId: request?.requestId,
		idempotencyKey: request?.idempotencyKey
	}));
}
function parseCompanionGiftCommand(data) {
	if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("赠礼指令响应不完整");
	const row = data;
	if (typeof row.mode !== "string" || ![
		"TYPES",
		"INVALID",
		"OPTIONS",
		"TARGETS",
		"GIFT"
	].includes(row.mode) || !Number.isSafeInteger(row.targetId) || Number(row.targetId) < 0 || typeof row.giftName !== "string" || [row.queryError, row.mutationError].some((v) => v !== void 0 && typeof v !== "string")) throw new Error("赠礼指令响应不完整");
	const options = row.options === null ? null : parseCompanionGiftOptions(row.options);
	const targets = row.targets === null ? null : parseCompanionGiftTargets(row.targets, row.giftName || void 0);
	const mutation = row.mutation === null ? null : parseCompanionGiftSettlement(row.mutation);
	if (row.mode === "OPTIONS" && !options && !row.queryError || row.mode === "TARGETS" && !targets && !row.queryError || row.mode === "GIFT" && !mutation && !row.mutationError) throw new Error("赠礼指令响应不完整");
	return {
		mode: row.mode,
		targetId: Number(row.targetId),
		giftName: row.giftName,
		options,
		targets,
		mutation,
		queryError: row.queryError,
		mutationError: row.mutationError
	};
}

//#endregion
export { commandBackendCompanionGift, parseCompanionGiftCommand };