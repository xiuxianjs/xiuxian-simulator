import { normalizePrivateEvent } from "../utils/privateEvent.js";
import { useEvent } from "alemonjs";
import { platform, useMode } from "@alemonjs/qq-bot";

//#region src/response/mwBan.ts
var mwBan_default = (e) => {
	const [event] = useEvent({
		regular: /[\s\S]*/,
		selects: [
			"private.message.create",
			"message.create",
			"interaction.create",
			"private.interaction.create"
		]
	});
	const mode = useMode(event.current);
	normalizePrivateEvent(e);
	if (mode("guild") && event.current.Platform === platform) e.isQQBotGuild = true;
	else e.isQQBotGroup = true;
	if (e.isQQBotGuild) return;
	return true;
};

//#endregion
export { mwBan_default as default };