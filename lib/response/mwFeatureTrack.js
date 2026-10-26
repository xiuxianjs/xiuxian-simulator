import { setTrackContext, trackFeatureEvent } from "../analytics/index.js";

//#region src/response/mwFeatureTrack.ts
/** Consume the aggregate identity; game addresses are saved by middleware-entry. */
var mwFeatureTrack_default = (event) => {
	const trackCtx = {
		appid: event.Platform === "qq-bot" ? String(event.BotId ?? "") : "",
		scene: event.isPrivate ?? false ? "private" : "public",
		channelId: String(event.ChannelId ?? ""),
		platform: String(event.Platform ?? "unknown")
	};
	setTrackContext(trackCtx);
	const commandText = event.MessageText ?? "";
	if (commandText.trim() && Number.isSafeInteger(event.uid) && event.uid > 0) trackFeatureEvent(event.UserId, event.uid, commandText, Date.now(), true, trackCtx);
	return true;
};

//#endregion
export { mwFeatureTrack_default as default };