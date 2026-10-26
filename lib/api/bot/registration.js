import { BackendAPIError, requestBackend, writeContext } from "./client.js";
import { parsePlayerTalents } from "./talents.js";
import { parseSpiritRoot } from "./spirit-root.js";

//#region src/api/bot/registration.ts
async function registerBackendPlayer(bid, input, request) {
	const result = await requestBackend(bid, "post_players", {
		body: {
			bid,
			name: input.name,
			...input.region ? { region: input.region } : {}
		},
		...writeContext(request)
	});
	if (!result || !Number.isSafeInteger(result.id) || result.id <= 0 || typeof result.name !== "string" || !result.name) throw new BackendAPIError("角色注册接口返回不完整", "SDK_INVALID_RESPONSE", void 0, request.requestId);
	return result;
}
function parseBackendRegistration(value) {
	if (!value || typeof value !== "object" || Array.isArray(value) || !("code" in value)) throw new Error("角色注册响应不完整");
	if (value.code === "EXISTING_USER" || value.code === "NEED_NAME") return { code: value.code };
	if (value.code !== "OK" && value.code !== "NEED_GENDER" || !("data" in value) || !value.data || typeof value.data !== "object" || Array.isArray(value.data) || !("playerName" in value.data) || typeof value.data.playerName !== "string" || !value.data.playerName) throw new Error("角色注册响应不完整");
	if (value.code === "NEED_GENDER") return {
		code: "NEED_GENDER",
		data: { playerName: value.data.playerName }
	};
	return {
		code: "OK",
		data: {
			playerName: value.data.playerName,
			..."talents" in value.data ? { talents: parsePlayerTalents(value.data.talents) } : {},
			..."spiritRoot" in value.data ? { spiritRoot: parseSpiritRoot(value.data.spiritRoot) } : {}
		}
	};
}

//#endregion
export { parseBackendRegistration, registerBackendPlayer };