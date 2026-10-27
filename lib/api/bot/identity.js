import { BackendAPIError, requestBackend } from "./client.js";
import { getCurrentEvent } from "alemonjs";

//#region src/api/bot/identity.ts
const record = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
/** Diagnostic mapping only: this response never grants entry or write ownership. */
function getBackendRobotIdentity(bid, request) {
	const event = getCurrentEvent();
	return event?.UserId === bid ? getEventBackendRobotIdentity(event, request) : fetchBackendRobotIdentity(bid, request);
}
/** Fresh identity lookup for non-router consumers; never accepts a caller-supplied player ID. */
async function fetchBackendRobotIdentity(bid, request) {
	const result = await requestBackend(bid, "getRobotIdentity", {
		requestId: request?.requestId,
		signal: request?.signal
	});
	const value = result;
	if (!record(value) || value.bid !== bid || !record(value.account)) throw new BackendAPIError("身份接口返回不完整", "SDK_INVALID_RESPONSE", void 0, request?.requestId);
	const account = value.account;
	if (!(account.status === "registered" ? typeof account.playerId === "number" && Number.isSafeInteger(account.playerId) && account.playerId > 0 : account.status === "unregistered" && account.playerId === null)) throw new BackendAPIError("身份接口返回不完整", "SDK_INVALID_RESPONSE", void 0, request?.requestId);
	return result;
}
const eventIdentities = /* @__PURE__ */ new WeakMap();
function getEventBackendRobotIdentity(event, request) {
	const bid = event.UserId;
	if (typeof bid !== "string" || !bid.trim()) return Promise.reject(new BackendAPIError("平台身份缺失", "ROBOT_BID_INVALID"));
	const cached = eventIdentities.get(event);
	if (cached?.bid === bid) return cached.identity;
	const identity = fetchBackendRobotIdentity(bid, request);
	eventIdentities.set(event, {
		bid,
		identity
	});
	return identity;
}
/** Registration or account switching invalidates even the current message. */
function invalidateEventBackendRobotIdentity(event) {
	eventIdentities.delete(event);
}
/** Seed from the authenticated aggregate endpoint; gameplay still checks ownership. */
function seedEventBackendRobotIdentity(event, identity) {
	if (identity.bid !== event.UserId) throw new BackendAPIError("身份接口返回不完整", "SDK_INVALID_RESPONSE");
	eventIdentities.set(event, {
		bid: identity.bid,
		identity: Promise.resolve(identity)
	});
}

//#endregion
export { fetchBackendRobotIdentity, getBackendRobotIdentity, getEventBackendRobotIdentity, invalidateEventBackendRobotIdentity, seedEventBackendRobotIdentity };