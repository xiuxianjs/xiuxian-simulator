import { SDKError } from "../core/error.js";
import { DEFAULT_API_BASE } from "../core/helpers.js";
import { logger } from "alemonjs";
import axios from "axios";

//#region src/api/bot/backend-availability.ts
const failureWindowMs = 6e4;
const failureThreshold = 3;
let routeState;
function selectBackendRoute(url, apiBase, fallbackUrl, channelMode) {
	const key = JSON.stringify([
		url,
		apiBase,
		fallbackUrl,
		channelMode
	]);
	if (routeState?.key !== key) routeState = {
		key,
		failures: [],
		usingFallback: false
	};
	const state = routeState;
	if (state.usingFallback) return {
		url: fallbackUrl,
		apiBase: DEFAULT_API_BASE
	};
	if (!fallbackUrl || url === fallbackUrl && apiBase === "/api") return {
		url,
		apiBase
	};
	return {
		url,
		apiBase,
		onUnavailable: () => {
			if (routeState !== state || state.usingFallback) return;
			const now = performance.now();
			state.failures = state.failures.filter((time) => now - time < failureWindowMs);
			state.failures.push(now);
			if (state.failures.length >= failureThreshold) {
				state.usingFallback = true;
				logger.warn("修仙后端主地址在一分钟内发生三次不可用，新请求切换至 api_url。");
			}
		}
	};
}
function recordBackendStatus(config, status, hasBusinessError) {
	if ([
		502,
		503,
		504
	].includes(status) || status === 404 && !hasBusinessError) config.onUnavailable?.();
}
function recordBackendError(config, error) {
	if (error instanceof SDKError) {
		if ([
			"SDK_TIMEOUT",
			"SDK_NETWORK_ERROR",
			"SDK_INVALID_RESPONSE"
		].includes(error.code)) config.onUnavailable?.();
		else if (error.status !== void 0) recordBackendStatus(config, error.status, error.code !== "SDK_HTTP_ERROR");
	} else if (axios.isAxiosError(error)) {
		if (error.response) recordBackendStatus(config, error.response.status, typeof error.response.data?.error?.code === "string");
		else if (error.request || [
			"ERR_NETWORK",
			"ECONNABORTED",
			"ETIMEDOUT"
		].includes(error.code ?? "")) {
			if (error.code !== "ERR_CANCELED") config.onUnavailable?.();
		}
	}
}
async function observeBackendRequest(config, send) {
	try {
		return await send();
	} catch (error) {
		recordBackendError(config, error);
		throw error;
	}
}

//#endregion
export { observeBackendRequest, recordBackendError, recordBackendStatus, selectBackendRoute };