import { repeatPresentationHeaders } from "./repeat-presentation.js";
import { requestBackend } from "./client.js";
import { parseSoulArtifactEquipPreview, parseSoulArtifactEquipResult } from "./soul-artifact-equip.js";
import { parseSoulArtifactUnequipResult } from "./soul-artifact-unequip.js";
import { parseConsumeResult } from "./consume.js";

//#region src/api/bot/soul-artifact-commands.ts
function row(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("本命物指令响应不完整");
	return value;
}
async function refineBackendSoulArtifact(bid, uid, instanceId, confirmed, request, repeatCommand) {
	if (!bid) throw new Error("缺少平台身份");
	return parseSoulRefineCommand(row(await requestBackend(bid, "post_players_id_soul_artifacts_refine_command", {
		path: { id: uid },
		body: {
			instanceId,
			confirmed
		},
		headers: repeatPresentationHeaders(repeatCommand),
		requestId: request?.requestId,
		idempotencyKey: request?.idempotencyKey
	})));
}
function parseSoulRefineCommand(value) {
	const data = row(value);
	return {
		repeatSuffix: typeof data.repeatSuffix === "string" ? data.repeatSuffix : "",
		preview: parseSoulArtifactEquipPreview(data.preview),
		equipped: data.equipped === null ? null : parseSoulArtifactEquipResult(data.equipped),
		consumed: data.consumed === null ? null : parseConsumeResult(data.consumed)
	};
}
async function commandBackendSoulArtifactUnequip(bid, uid, confirmed, request, repeatCommand) {
	if (!bid) throw new Error("缺少平台身份");
	return parseSoulArtifactUnequipResult(await requestBackend(bid, "post_players_id_soul_artifacts_unequip_command", {
		path: { id: uid },
		body: { confirmed },
		headers: repeatPresentationHeaders(repeatCommand),
		requestId: request?.requestId,
		idempotencyKey: request?.idempotencyKey
	}));
}

//#endregion
export { commandBackendSoulArtifactUnequip, parseSoulRefineCommand, refineBackendSoulArtifact };