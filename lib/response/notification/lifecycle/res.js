import { handleNotificationLifecycle } from "../../../notification/lifecycle.js";
import { useEvent } from "alemonjs";

//#region src/response/notification/lifecycle/res.ts
var res_default = async () => {
	const [event, next] = useEvent({ selects: [
		"private.friend.remove",
		"guild.exit",
		"member.remove"
	] });
	try {
		await handleNotificationLifecycle(event.current);
	} finally {
		next();
	}
};

//#endregion
export { res_default as default };