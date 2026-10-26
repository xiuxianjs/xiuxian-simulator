import { requestBackend, writeContext } from "./client.js";
import { requireAccountResponse, validEmailBegin, validEmailConfirm, validPasswordResult, validProfile, validRoleSwitch } from "./account-validation.js";

//#region src/api/bot/account.ts
async function switchBackendRole(bid, targetPlayerId, request) {
	const data = await requestBackend(bid, "post_auth_roles_switch", {
		body: { targetPlayerId },
		...writeContext(request)
	});
	requireAccountResponse(validRoleSwitch(data), request);
	return data;
}
async function getBackendSecurityProfile(bid, request) {
	const data = await requestBackend(bid, "get_auth_profile", { requestId: request?.requestId });
	requireAccountResponse(validProfile(data), request);
	return data;
}
async function setBackendPassword(bid, uid, password, request) {
	return parseBackendPasswordResult(await requestBackend(bid, "put_players_id_auth_password", {
		path: { id: uid },
		body: { password },
		...writeContext(request)
	}), request);
}
function parseBackendPasswordResult(value, request) {
	requireAccountResponse(validPasswordResult(value), request);
	return value;
}
async function beginBackendEmailVerification(bid, type, value, request) {
	const data = await requestBackend(bid, "post_auth_email_verifications", {
		body: {
			type,
			value
		},
		...writeContext(request)
	});
	requireAccountResponse(validEmailBegin(data, type), request);
	return data;
}
async function confirmBackendEmailVerification(bid, type, code, request) {
	return parseBackendEmailConfirmation(await requestBackend(bid, "post_auth_email_verifications_type_confirm", {
		path: { type },
		body: { code },
		...writeContext(request)
	}), type, request);
}
function parseBackendEmailConfirmation(value, type, request) {
	requireAccountResponse(validEmailConfirm(value, type), request);
	return value;
}
async function issueBackendLoginWindow(bid, uid, request) {
	return parseBackendLoginWindow(await requestBackend(bid, "post_players_id_auth_temporary_password", {
		path: { id: uid },
		requestId: request.requestId
	}), uid, request);
}
function parseBackendLoginWindow(value, uid, request) {
	const data = value;
	requireAccountResponse(data !== null && typeof data === "object" && data.playerId === uid && (data.email === void 0 || typeof data.email === "string") && typeof data.temporaryPassword === "string" && /^\d{8}$/.test(data.temporaryPassword) && Number.isInteger(data.expiresIn) && data.expiresIn > 0 && typeof data.expiresAt === "string" && Number.isFinite(Date.parse(data.expiresAt)), request);
	return data;
}

//#endregion
export { beginBackendEmailVerification, confirmBackendEmailVerification, getBackendSecurityProfile, issueBackendLoginWindow, parseBackendEmailConfirmation, parseBackendLoginWindow, parseBackendPasswordResult, setBackendPassword, switchBackendRole };