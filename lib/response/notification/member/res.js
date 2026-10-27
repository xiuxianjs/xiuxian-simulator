import { queueCommunityWelcome } from "../../../notification/communityDelivery.js";
import { handleNotificationLifecycle } from "../../../notification/lifecycle.js";
import { useEvent } from "alemonjs";

//#region src/response/notification/member/res.ts
var res_default = async () => {
	const [event, next] = useEvent({ selects: ["member.add"] });
	try {
		if (!await handleNotificationLifecycle(event.current)) return;
		await queueCommunityWelcome(event.current);
	} finally {
		next();
	}
};

//#endregion
export { res_default as default };