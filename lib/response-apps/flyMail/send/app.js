import { parseFlyMailSendCommand } from "../../../utils/flyMailCommand.js";
import { sendBackendFlyMail } from "../../../api/bot/flymail-send.js";

//#region src/response-apps/flyMail/send/app.ts
async function sendFlyMailThroughBackend(params) {
	return await sendBackendFlyMail(params);
}

//#endregion
export { parseFlyMailSendCommand, sendFlyMailThroughBackend };