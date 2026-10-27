import { getNotificationBackendConfig } from "./config.js";
import { backendConnectionPools } from "./connection-pools.js";
import { notificationRequestError } from "./notification-error.js";
import axios from "axios";

//#region src/api/bot/notification-cache.ts
function cacheClient() {
	const config = getNotificationBackendConfig();
	return axios.create({
		...backendConnectionPools,
		baseURL: config.url,
		timeout: config.timeoutMs,
		headers: config.headers,
		...config.channelMode ? { maxRedirects: 0 } : {}
	});
}
async function post(path, body) {
	const endpoint = `/api/v1/internal/notification-relay/cache${path}`;
	const client = cacheClient();
	try {
		return (await client.post(endpoint, body)).data.data;
	} catch (error) {
		throw notificationRequestError(endpoint, error);
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
	await post("/permission/event", {
		target,
		enabled,
		occurredAt,
		observedOnly
	});
}
async function rememberPlatformPrivateTarget(platform, bid, target) {
	await post("/private-target/remember", {
		platform,
		bid,
		target
	});
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
async function recordPlatformAvailability(target, available, occurredAt, memberId = "", observedOnly = false) {
	await post("/availability/event", {
		target,
		memberId,
		available,
		occurredAt,
		observedOnly
	});
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
	return await post("/community/requests/record", {
		target,
		request
	});
}
async function listCommunityJoinRequests(target, page) {
	return await post("/community/requests/list", {
		target,
		page
	});
}
async function acquirePlatformDeliveryLease(eventId, consumer) {
	return (await post("/receipt/lease/acquire", {
		eventId,
		consumer
	})).acquired;
}
async function queueCommunityNotification(target, kind, itemId, occurredAt) {
	await post("/community/queue", {
		target,
		kind,
		itemId,
		occurredAt
	});
}
async function claimCommunityNotification(botId, consumer) {
	return await post("/community/claim", {
		botId,
		consumer
	});
}
async function finishCommunityNotification(eventId, consumer, retry) {
	await post("/community/finish", {
		eventId,
		consumer,
		retry
	});
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
async function rememberPlatformGroupActivity(bid, activity) {
	await post("/activity/remember", {
		bid,
		...activity
	});
}
async function readPlatformGroupActivity(platform, bid, botId = "") {
	return await post("/activity/read", {
		platform,
		bid,
		botId
	});
}
async function readPlatformGroupCandidates(platform, bid, botId = "") {
	return await post("/activity/candidates", {
		platform,
		bid,
		botId
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
export { acquirePlatformDeliveryLease, acquirePlatformPermissionProbe, claimCommunityNotification, compareAndSetPlatformPermission, finishCommunityNotification, listCommunityJoinRequests, playerNotificationCategories, playerNotificationEnabled, queueCommunityNotification, readCommunitySettings, readNotificationGroupSnapshot, readPlatformAvailability, readPlatformDeliveryReceipt, readPlatformGroupActivity, readPlatformGroupCandidates, readPlatformPermission, readPlatformPrivateTarget, recordCommunityJoinRequest, recordPlatformAvailability, recordPlatformPermissionEvent, recordPlatformPermissionFailure, refreshNotificationGroupSnapshot, rememberPlatformGroupActivity, rememberPlatformPrivateTarget, storePlatformDeliveryReceipt, writeCommunitySettings };