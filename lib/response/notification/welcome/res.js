import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { handleNotificationLifecycle } from "../../../notification/lifecycle.js";
import { sendNotificationWelcome } from "../../../notification/welcome.js";
import { useEvent } from "alemonjs";

//#region src/response/notification/welcome/res.ts
var res_default = async () => {
	const [event] = useEvent({ selects: ["private.friend.add", "guild.join"] });
	const [message] = useMessage$1();
	if (!await handleNotificationLifecycle(event.current)) return;
	await sendNotificationWelcome(event.current, (data) => message.send(data));
};

//#endregion
export { res_default as default };