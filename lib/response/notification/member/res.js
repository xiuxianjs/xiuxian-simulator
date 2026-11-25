import { handleNotificationLifecycle } from "../../../notification/lifecycle.js";
import { useEvent } from "alemonjs";

//#region src/response/notification/member/res.ts
var res_default = async () => {
	const [event, next] = useEvent({ selects: ["member.add"] });
	try {
		await handleNotificationLifecycle(event.current, true);
	} finally {
		next();
	}
};

//#endregion
export { res_default as default };