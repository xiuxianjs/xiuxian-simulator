import { isGameEventEnabled } from "./utils/eventPolicy.js";
import { assertChannelRobotEvent, getBackendConfig } from "./api/bot/config.js";
import { observeChatContact, resetChatContactObserver, stopChatContactObserver } from "./notification/chatContacts.js";
import { startTransportEvent, transportCheckpoint } from "./utils/transportTiming.js";
import { normalizeRobotBid } from "./api/bot/robot-bid.js";
import { startFeatureVisibility } from "./utils/featureVisibility.js";
import { normalizePrivateEvent } from "./utils/privateEvent.js";
import { observePlayerGroupActivity } from "./notification/activity.js";
import { startNotificationStream, stopNotificationStream } from "./notification/stream.js";
import { handleCommandError } from "./response/commandError.js";
import router_default, { matchesGameCommand } from "./router.js";
import { configureOnboardingCommandMatcher } from "./response/onboarding/policy.js";
import { onboardingContent } from "./response/onboarding/context.js";
import { platform } from "@alemonjs/qq-bot";

//#region src/index.ts
configureOnboardingCommandMatcher(matchesGameCommand);
const isProduction = process.env.NODE_ENV !== "development";
const isQQBot = process.env.login === platform;
var src_default = defineChildren({
	onCreated: async () => {
		if (!getBackendConfig().channelMode) await resetChatContactObserver();
		else logger.warn("渠道模式：聊天运营接口尚未接入，暂停聊天观察与投递。");
		try {
			await startFeatureVisibility();
		} catch {
			logger.error("功能展示规则加载失败，未确认的功能入口将隐藏，后续消息会重试。");
		}
		if (isProduction && isQQBot) startNotificationStream();
		logger.info("修仙机器人已启动");
	},
	onEventStart: async ({ event }) => {
		if (!isGameEventEnabled(event)) return;
		assertChannelRobotEvent(event);
		normalizePrivateEvent(event);
		if (typeof event.UserId === "number" || typeof event.UserId === "bigint") event.UserId = normalizeRobotBid(event.UserId);
		observePlayerGroupActivity(event);
		if (!getBackendConfig().channelMode) await observeChatContact(event);
		startTransportEvent(event);
	},
	onEventFinished: ({ event }) => {
		if (isGameEventEnabled(event)) transportCheckpoint("event.processor.finished", event);
	},
	onEventError: handleCommandError,
	onDispose: async () => {
		stopNotificationStream();
		await stopChatContactObserver();
	},
	register() {
		return {
			responseContent: onboardingContent,
			response: router_default
		};
	}
});

//#endregion
export { src_default as default };