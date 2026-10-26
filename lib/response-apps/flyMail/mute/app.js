import { formatFlyMailMuteResult, parseFlyMailMuteCommand } from "../../../utils/flyMailCommand.js";
import { getBackendFlyMailMuteContext, setBackendFlyMailMute } from "../../../api/bot/flymail-mute.js";

//#region src/response-apps/flyMail/mute/app.ts
async function resolveFlyMailMuteTarget(bid, uid, targetArg, mention) {
	const text = String(targetArg ?? "").trim();
	const value = Number(text);
	if (/^\d+$/.test(text) && Number.isFinite(value) && value > 0) return value;
	if (!mention) return null;
	const user = await mention.findOne();
	if (!user?.count || !user.data?.UserId) return null;
	return (await getBackendFlyMailMuteContext(bid, uid, user.data.UserId)).targetUid;
}
async function changeFlyMailMute(params) {
	const result = await setBackendFlyMailMute(params.bid, params.uid, params.targetUid, params.action === "mute", params.request);
	return formatFlyMailMuteResult(result, params.action);
}

//#endregion
export { changeFlyMailMute, formatFlyMailMuteResult, getBackendFlyMailMuteContext as getFlyMailMuteAccess, parseFlyMailMuteCommand, resolveFlyMailMuteTarget };