import { getQQBotAppIds } from "./utils/qqBotIdentity.js";
import { assertChannelRobotEvent, getBackendConfig } from "./api/bot/config.js";
import { startTransportEvent, transportCheckpoint } from "./utils/transportTiming.js";
import { normalizeRobotBid } from "./api/bot/robot-bid.js";
import { isGameEventEnabled } from "./utils/eventPolicy.js";
import { normalizePrivateEvent } from "./utils/privateEvent.js";
import { startFeatureVisibility } from "./utils/featureVisibility.js";
import { gameExpose } from "./expose/index.js";
import { observePlayerGroupActivity } from "./notification/activity.js";
import { observeChatContact, resetChatContactObserver, stopChatContactObserver } from "./notification/chatContacts.js";
import { startNotificationStream, stopNotificationStream } from "./notification/stream.js";
import { handleCommandError } from "./response/commandError.js";
import { configureOnboardingCommandMatcher } from "./response/onboarding/policy.js";
import { onboardingContent } from "./response/onboarding/context.js";
import router_default, { matchesGameCommand } from "./router.js";
import { onWatchConfigValue } from "alemonjs";
import { platform } from "@alemonjs/qq-bot";

//#region src/index.ts
configureOnboardingCommandMatcher(matchesGameCommand);
const isProduction = process.env.NODE_ENV !== "development";
const isQQBot = process.env.login === platform;
let stopWaitingForAppId;
let servicesStarted = false;
let disposed = false;
async function startReadyServices() {
	if (disposed || servicesStarted) return;
	if ((isQQBot || getBackendConfig().channelMode) && !getQQBotAppIds().length) {
		stopWaitingForAppId ??= onWatchConfigValue(() => {
			startReadyServices().catch((error) => logger.error("机器人服务启动失败", error));
		});
		return;
	}
	stopWaitingForAppId?.();
	stopWaitingForAppId = void 0;
	servicesStarted = true;
	await resetChatContactObserver();
	try {
		await startFeatureVisibility();
	} catch {
		logger.error("功能展示规则加载失败，未确认的功能入口将隐藏，后续消息会重试。");
	}
	if (!disposed && isProduction && isQQBot) startNotificationStream();
}
var src_default = defineChildren({
	onCreated: async () => {
		disposed = false;
		servicesStarted = false;
		await startReadyServices();
		logger.info("修仙机器人已启动");
	},
	onEventStart: async ({ event }) => {
		if (!isGameEventEnabled(event)) return;
		assertChannelRobotEvent(event);
		normalizePrivateEvent(event);
		if (typeof event.UserId === "number" || typeof event.UserId === "bigint") event.UserId = normalizeRobotBid(event.UserId);
		observePlayerGroupActivity(event);
		await observeChatContact(event);
		startTransportEvent(event);
	},
	onEventFinished: ({ event }) => {
		if (isGameEventEnabled(event)) transportCheckpoint("event.processor.finished", event);
	},
	onEventError: handleCommandError,
	onDispose: async () => {
		disposed = true;
		stopWaitingForAppId?.();
		stopWaitingForAppId = void 0;
		stopNotificationStream();
		await stopChatContactObserver();
	},
	register() {
		return {
			expose: gameExpose,
			responseContent: onboardingContent,
			response: router_default
		};
	}
});

//#endregion
export { src_default as default };