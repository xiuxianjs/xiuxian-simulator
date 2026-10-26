import { requestBackend, writeContext } from "./client.js";

//#region src/api/bot/guild-secret-realm-war.ts
function row(value, message) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(message);
	return value;
}
function integer(value, message, minimum = -Infinity) {
	if (typeof value !== "number" || !Number.isSafeInteger(value) || value < minimum) throw new Error(message);
	return value;
}
function positiveInteger(value, message) {
	const parsed = integer(value, message);
	if (parsed <= 0) throw new Error(message);
	return parsed;
}
function finite(value, message) {
	if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(message);
	return value;
}
function text(value, message) {
	if (typeof value !== "string") throw new Error(message);
	return value;
}
function bool(value, message) {
	if (typeof value !== "boolean") throw new Error(message);
	return value;
}
function parseBackendSecretRealmHome(value) {
	const r = row(value, "灵脉攻防战主页响应不完整");
	const display = row(r.display, "灵脉攻防战主页展示投影不完整");
	const guildId = r.guildId === null ? null : positiveInteger(r.guildId, "灵脉攻防战主页响应不完整");
	const nullableText = (value) => value === null ? null : text(value, "灵脉攻防战主页展示投影不完整");
	const activeOwnedText = nullableText(display.activeOwnedText);
	const outputMultiplierText = nullableText(display.outputMultiplierText);
	const settledOwnedText = nullableText(display.settledOwnedText);
	const rewardText = nullableText(display.rewardText);
	if (activeOwnedText === null !== (outputMultiplierText === null) || settledOwnedText === null !== (rewardText === null)) throw new Error("灵脉攻防战主页展示投影不完整");
	return {
		isActive: bool(r.isActive, "灵脉攻防战主页响应不完整"),
		activeStart: text(r.activeStart, "灵脉攻防战主页响应不完整"),
		activeEnd: text(r.activeEnd, "灵脉攻防战主页响应不完整"),
		attackUsed: integer(r.attackUsed, "灵脉攻防战主页响应不完整"),
		maxAttack: integer(r.maxAttack, "灵脉攻防战主页响应不完整"),
		guildId,
		guildName: text(r.guildName, "灵脉攻防战主页响应不完整"),
		joinAt: r.joinAt === null ? null : text(r.joinAt, "灵脉攻防战主页响应不完整"),
		memberRoleName: text(r.memberRoleName, "灵脉攻防战主页响应不完整"),
		activeData: r.activeData === void 0 ? null : r.activeData,
		settledData: r.settledData === void 0 ? null : r.settledData,
		display: {
			participationNotice: display.participationNotice === void 0 ? "" : text(display.participationNotice, "灵脉攻防战主页展示投影不完整"),
			statusLabel: text(display.statusLabel, "灵脉攻防战主页展示投影不完整"),
			attackRemaining: integer(display.attackRemaining, "灵脉攻防战主页展示投影不完整"),
			membershipNotice: text(display.membershipNotice, "灵脉攻防战主页展示投影不完整"),
			activeOwnedText,
			outputMultiplierText,
			settledOwnedText,
			rewardText,
			canPromptClaim: bool(display.canPromptClaim, "灵脉攻防战主页展示投影不完整")
		}
	};
}
async function getBackendSecretRealmHome(bid, uid) {
	if (!bid) throw new Error("查询缺少平台身份");
	return parseBackendSecretRealmHome(await requestBackend(bid, "get_players_id_secret_realms_home", { path: { id: uid } }));
}
async function getBackendSecretRealms(bid, page) {
	if (!bid) throw new Error("查询缺少平台身份");
	return parseBackendSecretRealmList(await requestBackend(bid, "get_secret_realms", { query: {
		page,
		pageSize: 5
	} }));
}
function parseBackendSecretRealmList(data) {
	if (!Array.isArray(data)) throw new Error("灵脉攻防战列表响应不完整");
	return { items: data };
}
async function getBackendSecretRealm(bid, realmNo, page) {
	if (!bid) throw new Error("查询缺少平台身份");
	return parseBackendSecretRealmView(await requestBackend(bid, "get_secret_realms_realmNo", {
		path: { realmNo },
		query: {
			page,
			pageSize: 5
		}
	}));
}
function parseBackendSecretRealmView(data) {
	if (!Array.isArray(data)) throw new Error("灵脉攻防战详情响应不完整");
	return { positions: data };
}
async function challengeBackendSecretRealm(bid, uid, realmNo, positionNo, request) {
	if (!bid) throw new Error("操作缺少平台身份");
	return parseBackendSecretRealmChallenge(await requestBackend(bid, "post_players_id_secret_realms_realmNo_positions_positionNo_challenge", {
		path: {
			id: uid,
			realmNo,
			positionNo
		},
		...writeContext(request)
	}));
}
function parseBackendSecretRealmChallenge(value) {
	const data = row(value, "灵脉攻防战挑战响应不完整");
	if (data.frozenUntil !== void 0 && (typeof data.frozenUntil !== "string" || !Number.isFinite(Date.parse(data.frozenUntil)))) throw new Error("灵脉攻防战挑战响应不完整");
	return {
		...data,
		participationContribution: data.participationContribution === void 0 ? 0 : integer(data.participationContribution, "灵脉攻防战挑战响应不完整", 0),
		won: bool(data.won, "灵脉攻防战挑战响应不完整"),
		realmNo: positiveInteger(data.realmNo, "灵脉攻防战挑战响应不完整"),
		positionNo: positiveInteger(data.positionNo, "灵脉攻防战挑战响应不完整"),
		...typeof data.frozenUntil === "string" ? { frozenUntil: data.frozenUntil } : {}
	};
}
async function claimBackendSecretRealm(bid, uid, request) {
	if (!bid) throw new Error("操作缺少平台身份");
	return parseBackendSecretRealmClaim(await requestBackend(bid, "post_players_id_secret_realms_claim", {
		path: { id: uid },
		...writeContext(request)
	}));
}
function parseBackendSecretRealmClaim(value) {
	const data = row(value, "灵脉攻防战领奖响应不完整");
	return {
		...data,
		spiritCrystal: integer(data.spiritCrystal, "灵脉攻防战领奖响应不完整", 0),
		contribution: integer(data.contribution, "灵脉攻防战领奖响应不完整", 0),
		reputation: integer(data.reputation, "灵脉攻防战领奖响应不完整", 0),
		ownedRealms: positiveInteger(data.ownedRealms, "灵脉攻防战领奖响应不完整"),
		reputationAlreadyClaimed: bool(data.reputationAlreadyClaimed, "灵脉攻防战领奖响应不完整")
	};
}

//#endregion
export { challengeBackendSecretRealm, claimBackendSecretRealm, finite, getBackendSecretRealm, getBackendSecretRealmHome, getBackendSecretRealms, parseBackendSecretRealmChallenge, parseBackendSecretRealmClaim, parseBackendSecretRealmHome, parseBackendSecretRealmList, parseBackendSecretRealmView };