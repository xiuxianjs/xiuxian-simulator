import { observeBackendRequest } from "./backend-availability.js";
import { getNotificationBackendConfig } from "./config.js";
import { isRetryableNotificationRequestError, notificationRequestContext, notificationRequestError } from "./notification-error.js";
import { backendConnectionPools } from "./connection-pools.js";
import { communityClaimReceipt } from "../../notification/communityClaimReceipt.js";
import { logger } from "alemonjs";
import { randomUUID } from "node:crypto";
import axios from "axios";

//#region src/api/bot/notification-cache.ts
function cacheClient() {
	const config = getNotificationBackendConfig();
	const context = notificationRequestContext(config.timeoutMs);
	return {
		client: axios.create({
			...backendConnectionPools,
			baseURL: config.url,
			timeout: config.timeoutMs,
			headers: config.headers,
			...config.channelMode ? { maxRedirects: 0 } : {}
		}),
		context,
		config
	};
}
async function post(path, body, trackAvailability = true) {
	const { client, context, config } = cacheClient();
	const endpoint = `${config.apiBase}/v1/internal/notification-relay/cache${path}`;
	try {
		const send = () => client.post(endpoint, body, { headers: { "X-Request-ID": context.requestId } });
		return (trackAvailability ? await observeBackendRequest(config, send) : await send()).data.data;
	} catch (error) {
		throw notificationRequestError(endpoint, error, context);
	}
}
async function readPlatformPermission(target) {
	return await post("/permission/read", { target });
}
async function acquirePlatformPermissionProbe(target) {
	return await post("/permission/probe", { target });
}
async function compareAndSetPlatformPermission(target, previous, state, ttlSeconds) {
	await post("/permission/cas", {
		target,
		previous,
		state,
		ttlSeconds
	});
}
async function recordPlatformPermissionFailure(target) {
	await post("/permission/failure", { target });
}
async function recordPlatformPermissionEvent(target, enabled, occurredAt, observedOnly = false) {
	requireObservationReceipt(await post("/permission/event", {
		target,
		enabled,
		occurredAt,
		observedOnly
	}));
}
async function rememberPlatformPrivateTarget(platform, bid, target, observedAt) {
	await post("/private-target/remember", {
		platform,
		bid,
		target,
		observedAt
	});
}
async function observePlatformPrivateTarget(platform, bid, target, observedAt) {
	requireObservationReceipt(await post("/private-target/observe", {
		platform,
		bid,
		target,
		observedAt
	}, false));
}
async function readPlatformPrivateTarget(platform, bid, botId) {
	return await post("/private-target/read", {
		platform,
		bid,
		botId: botId ?? ""
	});
}
async function readPlatformDeliveryReceipt(eventId) {
	return await post("/receipt/read", { eventId });
}
async function storePlatformDeliveryReceipt(eventId, receipt) {
	await post("/receipt/store", {
		eventId,
		receipt
	});
}
async function readPlatformAvailability(target, memberId = "") {
	return await post("/availability/read", {
		target,
		memberId
	});
}
const memberAvailabilityBatchSize = 64;
var NotificationMemberAvailabilityUnavailableError = class extends Error {};
async function readPlatformMemberAvailability(target, memberIds) {
	const result = await post("/availability/read", {
		target,
		memberIds
	});
	if (result === null || typeof result === "object" && result !== null && "available" in result && typeof result.available === "boolean" && "updatedAt" in result && typeof result.updatedAt === "number" && !("memberAvailability" in result)) return null;
	if (typeof result === "object" && result !== null && "memberAvailability" in result) {
		const flags = result.memberAvailability;
		if (Array.isArray(flags) && flags.length === memberIds.length && flags.every((flag) => typeof flag === "boolean")) return flags;
	}
	throw new NotificationMemberAvailabilityUnavailableError("群成员状态响应不完整");
}
async function recordPlatformAvailability(target, available, occurredAt, memberId = "", observedOnly = false) {
	requireObservationReceipt(await post("/availability/event", {
		target,
		memberId,
		available,
		occurredAt,
		observedOnly
	}));
}
function requireObservationReceipt(receipt) {
	if (receipt?.ok !== true) {
		const error = /* @__PURE__ */ new Error("通知平台事件未收到有效的保存回执");
		error.name = "NotificationRequestError";
		throw error;
	}
}
async function readCommunitySettings(target) {
	return await post("/community/settings/read", { target });
}
async function writeCommunitySettings(target, settings) {
	await post("/community/settings/write", {
		target,
		settings
	});
}
async function recordCommunityJoinRequest(target, request) {
	const receipt = await post("/community/requests/record", {
		target,
		request
	});
	requireObservationReceipt({ ok: typeof receipt?.inserted === "boolean" });
	return receipt;
}
async function listCommunityJoinRequests(target, page) {
	return await post("/community/requests/list", {
		target,
		page
	});
}
async function acquireFlyMailGroupReminder(platform, bid) {
	return (await post("/flymail/reminder/acquire", { eventId: JSON.stringify([platform, bid]) })).acquired;
}
async function acquirePlatformDeliveryLease(eventId, consumer) {
	return (await post("/receipt/lease/acquire", {
		eventId,
		consumer
	})).acquired;
}
async function queueCommunityNotification(target, kind, itemId, occurredAt, memberObservedAt) {
	requireObservationReceipt(await post("/community/queue", {
		target,
		kind,
		itemId,
		occurredAt,
		...memberObservedAt === void 0 ? {} : { memberObservedAt }
	}));
}
const communityClaimReceiptLifetimeMs = 12e4;
const pendingCommunityClaims = /* @__PURE__ */ new Map();
function clearCommunityClaim(key, receipt, request) {
	if (pendingCommunityClaims.get(key)?.request.requestId === request.requestId) pendingCommunityClaims.delete(key);
	try {
		receipt.clear(request);
	} catch (error) {
		logger.error("清理原群通知领取回执失败", error);
	}
}
async function recoverCommunityClaim(key, receipt, request) {
	let batch;
	try {
		batch = await post("/community/claim/recover", request, false);
	} catch (error) {
		if (!isRetryableNotificationRequestError(error)) clearCommunityClaim(key, receipt, request);
		throw error;
	}
	if (batch === null) {
		clearCommunityClaim(key, receipt, request);
		return null;
	}
	if (!batch?.eventId) throw new Error("群通知原领取回执无效");
	return {
		batch,
		consumer: request.consumer,
		clearRecovery: () => clearCommunityClaim(key, receipt, request)
	};
}
async function claimCommunityNotification(botId) {
	const scope = getNotificationBackendConfig().notificationQueueScope;
	const key = JSON.stringify([
		process.cwd(),
		scope,
		botId
	]);
	const receipt = communityClaimReceipt(scope, botId);
	const now = Date.now();
	for (const [pendingKey, claim] of pendingCommunityClaims) if (claim.expiresAt <= now) pendingCommunityClaims.delete(pendingKey);
	let stored = null;
	try {
		stored = receipt.read();
	} catch (error) {
		logger.error("读取原群通知领取回执失败", error);
	}
	if (stored === "busy") return null;
	const pending = stored ?? pendingCommunityClaims.get(key)?.request;
	if (pending) {
		const original = await recoverCommunityClaim(key, receipt, pending);
		if (original) return original;
		if (scope !== getNotificationBackendConfig().notificationQueueScope) return null;
	}
	const consumer = `node.community:${randomUUID()}`;
	const request = {
		botId,
		consumer,
		requestId: randomUUID()
	};
	const expiresAt = Date.now() + communityClaimReceiptLifetimeMs;
	try {
		const batch = await post("/community/claim", request);
		return batch ? {
			batch,
			consumer
		} : null;
	} catch (error) {
		if (!isRetryableNotificationRequestError(error)) throw error;
		pendingCommunityClaims.set(key, {
			request,
			expiresAt
		});
		try {
			receipt.save(request, expiresAt);
		} catch (saveError) {
			logger.error("保存原群通知领取回执失败", saveError);
		}
		if (scope !== getNotificationBackendConfig().notificationQueueScope) throw error;
		const original = await recoverCommunityClaim(key, receipt, request).catch(() => null);
		if (original) return original;
		throw error;
	}
}
async function finishCommunityNotification(eventId, consumer, retry, deferred, requestId) {
	requireObservationReceipt(await post("/community/finish", {
		eventId,
		consumer,
		retry,
		deferred,
		requestId
	}));
}
async function readNotificationGroupSnapshot(target, memberId, probe) {
	return await post("/group/snapshot", {
		target,
		memberId,
		probe
	});
}
async function refreshNotificationGroupSnapshot(target, memberId, previous, state, ttlSeconds) {
	return await post("/group/refresh", {
		target,
		memberId,
		previous,
		state,
		ttlSeconds
	});
}
function playerNotificationCategories(userId, category, enabled) {
	return post("/player/categories", {
		userId,
		category,
		enabled
	});
}
async function playerNotificationEnabled(userId, source = "") {
	return (await post("/player/categories", {
		userId,
		source
	})).enabled;
}

//#endregion
export { NotificationMemberAvailabilityUnavailableError, acquireFlyMailGroupReminder, acquirePlatformDeliveryLease, acquirePlatformPermissionProbe, claimCommunityNotification, compareAndSetPlatformPermission, finishCommunityNotification, listCommunityJoinRequests, memberAvailabilityBatchSize, observePlatformPrivateTarget, playerNotificationCategories, playerNotificationEnabled, queueCommunityNotification, readCommunitySettings, readNotificationGroupSnapshot, readPlatformAvailability, readPlatformDeliveryReceipt, readPlatformMemberAvailability, readPlatformPermission, readPlatformPrivateTarget, recordCommunityJoinRequest, recordPlatformAvailability, recordPlatformPermissionEvent, recordPlatformPermissionFailure, refreshNotificationGroupSnapshot, rememberPlatformPrivateTarget, storePlatformDeliveryReceipt, writeCommunitySettings };