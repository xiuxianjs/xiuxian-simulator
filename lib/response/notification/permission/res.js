import { handleNotificationPermissionEvent } from "../../../notification/channel.js";
import { handleCommunityJoinRequest } from "../../../notification/community.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { sendNotificationWelcome } from "../../../notification/welcome.js";
import { useEvent } from "alemonjs";

//#region src/response/notification/permission/res.ts
var res_default = async () => {
	const [event] = useEvent({ selects: ["notice.create", "private.notice.create"] });
	const [message] = useMessage$1();
	if (event.current.Notice?.type === "message-permission") {
		await handleNotificationPermissionEvent(event.current);
		await sendNotificationWelcome(event.current, (data) => message.send(data));
	} else if (event.current.name === "notice.create" && event.current.Notice?.type === "join-request") await handleCommunityJoinRequest(event.current);
};

//#endregion
export { res_default as default };