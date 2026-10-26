import { handleNotificationLifecycle } from "../../../notification/lifecycle.js";
import { useEvent } from "alemonjs";

//#region src/response/notification/lifecycle/res.ts
var res_default = async () => {
	const [event] = useEvent({ selects: [
		"private.friend.remove",
		"guild.exit",
		"member.remove"
	] });
	await handleNotificationLifecycle(event.current);
};

//#endregion
export { res_default as default };