import { createBackendRequestContext } from "./context.js";
import { catalogRequestFromMessage, seedEventCatalog } from "./catalog-query-reuse.js";
import { invalidateEventAccessFacts, seedEventAccessFacts } from "./access-facts.js";
import { BackendAPIError, requestBackend } from "./client.js";
import { seedEventBackendRobotIdentity } from "./identity.js";
import { validateHomeOverview } from "./player-overview.js";
import { parseBackendTeamMatchCommandGuard } from "./team-match-queries.js";
import { parseBackendRealmAccess } from "./realm-access-queries.js";

//#region src/api/bot/command-entry.ts
const entries = /* @__PURE__ */ new WeakMap();
const phases = /* @__PURE__ */ new WeakMap();
function homeFactAllowed(value) {
	return value.guide?.step === null && value.captcha?.outcome === "not_pending" && value.mute?.muted === false && value.entry?.routeAllowed === true && value.entry.processingError === void 0 && !value.entry.maintenance.disabled && !value.entry.featureGuard?.blocked && (!value.operation?.challengeRequired || value.operation.checksDisabled) && !value.teamMatch?.blocked && !(value.seclusion?.inSeclusion && !value.seclusion.allowed) && !(value.meditation?.active && !value.meditation.allowed);
}
function validIdentity(value, bid) {
	const account = value?.identity?.account;
	return value?.identity?.bid === bid && !!account && (account.status === "unregistered" ? account.playerId === null : account.status === "registered" && Number.isSafeInteger(account.playerId) && Number(account.playerId) > 0);
}
function validate(value, bid, profile) {
	const invalid = () => {
		throw new BackendAPIError("机器人指令入口响应不完整", "SDK_INVALID_RESPONSE");
	};
	if (!validIdentity(value, bid)) invalid();
	if (value.identity.account.status === "unregistered") return;
	const guide = value.guide;
	if (!guide || !Number.isSafeInteger(guide.version) || guide.version < 0 || guide.expiresAt !== null || guide.step !== null && ![
		2,
		3,
		4,
		5
	].includes(guide.step)) invalid();
	if (guide?.step !== null) return;
	const captcha = value.captcha;
	if (!captcha || ![
		"not_pending",
		"pending",
		"passed",
		"failed",
		"muted"
	].includes(captcha.outcome) || ![
		captcha.failureCount,
		captcha.remainingAttempts,
		captcha.muteCount
	].every((n) => Number.isSafeInteger(n) && n >= 0) || ![captcha.passedTtlSeconds, captcha.muteTtlSeconds].every((n) => Number.isSafeInteger(n) && n >= -2) || typeof captcha.muteUnlockTime !== "string") invalid();
	if (captcha?.outcome !== "not_pending" || !profile.checkMute) return;
	const mute = value.mute;
	if (!mute || typeof mute.muted !== "boolean" || typeof mute.claimed !== "boolean" || typeof mute.muteUnlockTime !== "string" || !Number.isSafeInteger(mute.replyCount) || mute.replyCount < 0 || ![mute.muteTtlSeconds, mute.replyTtlSeconds].every((n) => Number.isSafeInteger(n) && n >= -2)) invalid();
	if (mute?.muted || !profile.playerEntry) return;
	const entry = value.entry;
	if (!entry || typeof entry.routeAllowed !== "boolean" || typeof entry.maintenance?.disabled !== "boolean" || typeof entry.resourcesSettled !== "boolean" || typeof entry.nativeComebackProcessed !== "boolean" || entry.featureGuard !== void 0 && typeof entry.featureGuard.blocked !== "boolean") invalid();
	if (!entry?.routeAllowed || entry.maintenance.disabled || entry.featureGuard?.blocked) return;
	if (profile.trackOperation) {
		const operation = value.operation;
		if (!operation || typeof operation.checksDisabled !== "boolean" || typeof operation.challengeRequired !== "boolean" || ![operation.operationCount, operation.operationLimit].every((n) => Number.isSafeInteger(n) && n >= 0) || !Number.isSafeInteger(operation.passedTtlSeconds) || operation.passedTtlSeconds < -2) invalid();
		if (!operation?.checksDisabled && operation?.challengeRequired && (typeof value.challenge?.svg !== "string" || !value.challenge.svg.startsWith("<svg ") || !Number.isSafeInteger(value.challenge.captchaTtlSeconds) || value.challenge.captchaTtlSeconds <= 0)) invalid();
		if (!operation?.checksDisabled && operation?.challengeRequired) return;
	}
	for (const stage of profile.guards ?? []) if (stage === "teamMatch") {
		try {
			parseBackendTeamMatchCommandGuard(value.teamMatch);
		} catch {
			invalid();
		}
		if (value.teamMatch?.blocked) return;
	} else if (stage === "seclusion") {
		if (typeof value.seclusion?.inSeclusion !== "boolean" || typeof value.seclusion.allowed !== "boolean") invalid();
		if (value.seclusion?.inSeclusion && !value.seclusion.allowed) return;
	} else if (typeof value.meditation?.active !== "boolean" || typeof value.meditation.allowed !== "boolean") invalid();
}
function getEventCommandEntry(event, profile) {
	const cached = entries.get(event);
	const signature = profile ? JSON.stringify([
		event.UserId,
		event.MessageId,
		event.InteractionId,
		event.MessageText,
		profile
	]) : "";
	if (cached?.bid === event.UserId && (!profile || cached.signature === signature)) return cached.pending;
	if (cached && profile) invalidateEventCommandEntry(event);
	if (!profile) return Promise.resolve(null);
	const context = createBackendRequestContext(event);
	if (!context.idempotencyKey) return Promise.reject(new BackendAPIError("指令入口需要平台消息ID", "INVALID_ARGUMENT"));
	const phase = phases.get(event) ?? 0;
	const idempotencyKey = phase ? `${context.idempotencyKey}:phase-${phase}` : context.idempotencyKey;
	const catalogRequest = profile.playerEntry && profile.checkMute ? catalogRequestFromMessage(event.MessageText ?? "", profile.catalogKind) : void 0;
	const send = async (stages) => {
		const { catalogKind: _catalogKind, ...bodyStages } = stages;
		const value = await requestBackend(event.UserId, "post_robot_command_entry", {
			body: {
				...bodyStages,
				messageText: event.MessageText ?? ""
			},
			...catalogRequest ? { headers: { "X-Command-Catalog": "v1" } } : {},
			requestId: context.requestId,
			idempotencyKey
		});
		validate(value, event.UserId, stages);
		return value;
	};
	const pending = send(profile).then((value) => {
		seedEventBackendRobotIdentity(event, value.identity);
		const uid = value.identity.account.playerId;
		if (value.accessFacts !== void 0 && uid !== null) {
			const raw = value.accessFacts;
			if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new BackendAPIError("准入事实响应不完整", "SDK_INVALID_RESPONSE");
			const facts = {};
			if (raw.resourceSettlement !== void 0) {
				if (typeof raw.resourceSettlement !== "string" || !/^[a-f0-9]{64}$/.test(raw.resourceSettlement)) throw new BackendAPIError("资源结算回执响应不完整", "SDK_INVALID_RESPONSE");
				facts.resourceSettlement = raw.resourceSettlement;
			}
			if (raw.homeOverview !== void 0 && profile.playerEntry === true && profile.accessFacts?.includes("homeOverview") && homeFactAllowed(value)) try {
				facts.homeOverview = validateHomeOverview(raw.homeOverview, uid);
			} catch {}
			if (raw.realm !== void 0) facts.realm = parseBackendRealmAccess(raw.realm);
			if (raw.social !== void 0) {
				if (!raw.social || typeof raw.social.ok !== "boolean" || typeof raw.social.realmName !== "string" || raw.social.realmNameValue !== null && typeof raw.social.realmNameValue !== "string" || ![
					raw.social.canUseSecondLayerFeature,
					raw.social.canUseFifthLayerFeature,
					raw.social.canUseSpar,
					raw.social.canCreateOrApplyGuild
				].every((v) => typeof v === "boolean") || raw.social.ok !== raw.social.canUseFifthLayerFeature) throw new BackendAPIError("社交准入事实响应不完整", "SDK_INVALID_RESPONSE");
				facts.social = { ...raw.social };
			}
			value.accessFacts = facts;
			seedEventAccessFacts(event, value.identity.bid, uid, facts);
		}
		if (catalogRequest && uid !== null && homeFactAllowed(value)) seedEventCatalog(event, value.identity.bid, uid, catalogRequest, value.catalog);
		return value;
	});
	entries.set(event, {
		bid: event.UserId,
		signature,
		pending
	});
	return pending;
}
function invalidateEventCommandEntry(event) {
	entries.delete(event);
	invalidateEventAccessFacts(event);
	phases.set(event, (phases.get(event) ?? 0) + 1);
}

//#endregion
export { getEventCommandEntry, invalidateEventCommandEntry };