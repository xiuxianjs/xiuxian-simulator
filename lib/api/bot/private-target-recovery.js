import { SDKError } from "../core/error.js";
import { isParameterRecord } from "../core/helpers.js";
import { getBackendConfig } from "./config.js";
import { platformObservationOutbox } from "../../notification/platformObservationOutbox.js";
import { logger } from "alemonjs";

//#region src/api/bot/private-target-recovery.ts
function capturePrivateTargetRecovery(bid, observedAt, input, config) {
	if (typeof bid !== "string" || !bid || typeof observedAt !== "number" || !Number.isSafeInteger(observedAt) || observedAt <= 0 || !isParameterRecord(input) || !isParameterRecord(input.privateTarget)) return;
	const { platform, BotId, scope, targetId } = input.privateTarget;
	if (typeof platform !== "string" || !platform || platform !== input.platform || scope !== "c2c" && scope !== "direct" || typeof targetId !== "string" || !targetId || BotId !== void 0 && typeof BotId !== "string") return;
	const backend = config ?? getBackendConfig();
	const queueScope = backend.notificationQueueScope;
	const botId = BotId ?? (backend.channelMode ? backend.channelBotId : void 0);
	if (backend.channelMode && botId !== backend.channelBotId) return;
	const target = {
		platform,
		...botId ? { BotId: botId } : {},
		scope,
		targetId
	};
	const defer = () => {
		try {
			platformObservationOutbox.deferPrivateTarget(queueScope, platform, bid, target, observedAt);
		} catch (error) {
			logger.error("私聊地址待补写记录落盘失败", error);
		}
	};
	return {
		observedAt,
		scope: queueScope,
		record(result) {
			if (result.contextWarnings.includes("PRIVATE_TARGET_NOT_SAVED")) defer();
		},
		recordUnconfirmed(error) {
			if (!(error instanceof SDKError)) return;
			const { code, status } = error;
			if (code === "SDK_TIMEOUT" || code === "SDK_NETWORK_ERROR" || code === "SDK_INVALID_RESPONSE" && (status === void 0 || status < 400) || status !== void 0 && status >= 500 && status <= 599) defer();
		}
	};
}

//#endregion
export { capturePrivateTargetRecovery };