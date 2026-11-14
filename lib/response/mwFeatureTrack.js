import { canTrackFeature, setTrackContext, trackFeatureEvent } from "../analytics/index.js";
import { transportEventOffset } from "../utils/transportTiming.js";
import { fetchBackendRobotIdentity } from "../api/bot/identity.js";
import { getCurrentEvent } from "alemonjs";

//#region src/response/mwFeatureTrack.ts
const featureContext = (event) => ({
	appid: event.Platform === "qq-bot" ? String(event.BotId ?? "") : "",
	scene: event.isPrivate ?? false ? "private" : "public",
	channelId: String(event.ChannelId ?? ""),
	platform: String(event.Platform ?? "unknown")
});
function featureElapsed(event, startedAt) {
	const elapsed = transportEventOffset(event) ?? transportEventOffset(getCurrentEvent()) ?? (startedAt === void 0 ? 0 : performance.now() - startedAt);
	return Math.max(0, Math.round(elapsed));
}
/** Consume the aggregate identity; game addresses are saved by middleware-entry. */
function trackFeature(event, success = true, startedAt, uid = event.uid) {
	const trackCtx = featureContext(event);
	setTrackContext(trackCtx);
	const commandText = event.MessageText ?? "";
	if (commandText.trim() && Number.isSafeInteger(uid) && uid > 0) trackFeatureEvent(event.UserId, uid, commandText, featureElapsed(event, startedAt), success, trackCtx);
	return true;
}
/** Local commands and completed registration do not return an aggregate player ID. */
function trackFeatureWithIdentity(event, success, startedAt) {
	const context = featureContext(event);
	const command = event.MessageText ?? "";
	if (!canTrackFeature(command, context)) return;
	const elapsed = featureElapsed(event, startedAt);
	fetchBackendRobotIdentity(event.UserId).then(({ account }) => {
		if (account.playerId !== null) trackFeatureEvent(event.UserId, account.playerId, command, elapsed, success, context);
	}).catch(() => {});
}
/** Reuse an authenticated UID, or resolve it independently of the business response. */
function trackFeatureOutcome(event, success, startedAt) {
	if (Number.isSafeInteger(event.uid) && event.uid > 0) trackFeature(event, success, startedAt);
	else trackFeatureWithIdentity(event, success, startedAt);
}

//#endregion
export { trackFeature as default, trackFeatureOutcome, trackFeatureWithIdentity };