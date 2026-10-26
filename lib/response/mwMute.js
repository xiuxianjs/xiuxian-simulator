import { FormatGui } from "../utils/messageHelper.js";
import { formatGameTime } from "../utils/gameTime.js";
import { useMessage as useMessage$1 } from "../utils/useMessage.js";
import { Format, logger } from "alemonjs";

//#region src/response/mwMute.ts
var mwMute_default = async (event, result) => {
	const mute = result.mute;
	if (result.reason !== "MUTED" || !mute?.muted) return true;
	logger.info(`[禁言拦截] 用户 ${event.UserId}(uid:${event.uid}) 被禁言，解除时间: ${mute.muteUnlockTime}`);
	if (mute.claimed) {
		const [message] = useMessage$1(event);
		const md = Format.createMarkdown();
		md.addText(`你的修仙功能已被禁言，限制将于${formatGameTime(mute.muteUnlockTime)}解除。`);
		await message.send(FormatGui({
			isPrivate: /private/.test(event.name),
			bid: event.UserId,
			title: "",
			content: md
		}));
	}
	return false;
};

//#endregion
export { mwMute_default as default };