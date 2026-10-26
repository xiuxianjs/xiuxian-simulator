import { getBackendRobotIdentity } from "../api/bot/identity.js";

//#region src/utils/targetUid.ts
const parsePositiveUid = (value) => {
	const text = String(value ?? "").trim();
	if (!text) return null;
	if (!/^\d+$/.test(text)) return null;
	const uid = Number(text);
	if (!Number.isSafeInteger(uid) || uid <= 0) return null;
	return uid;
};
const resolveMentionUid = async (mention) => {
	if (!mention) return null;
	const user = await mention.findOne();
	if (!user?.count || !user.data?.UserId) return null;
	const identity = await getBackendRobotIdentity(user.data.UserId);
	return identity.account.status === "registered" ? identity.account.playerId : null;
};
const resolveTargetUid = async (messageText, mention) => {
	const uidMatch = String(messageText ?? "").match(/(\d+)/);
	if (uidMatch) return parsePositiveUid(uidMatch[1]);
	return await resolveMentionUid(mention);
};
const resolveTargetUidFromArg = async (targetArg, mention) => {
	const uid = parsePositiveUid(targetArg);
	if (uid) return uid;
	return await resolveMentionUid(mention);
};
const resolveRobotTarget = async (messageText, mention) => {
	const uidMatch = String(messageText ?? "").match(/(\d+)/);
	if (uidMatch) {
		const uid = parsePositiveUid(uidMatch[1]);
		return uid ? { uid } : null;
	}
	if (!mention) return null;
	const user = await mention.findOne();
	return user?.count && user.data?.UserId ? { bid: user.data.UserId } : null;
};
/** Preserve argument-first target selection without requesting game identity. */
const resolveRobotTargetFromArg = async (targetArg, mention) => {
	const uid = parsePositiveUid(targetArg);
	if (uid) return { uid };
	if (!mention) return null;
	const user = await mention.findOne();
	return user?.count && user.data?.UserId ? { bid: user.data.UserId } : null;
};

//#endregion
export { parsePositiveUid, resolveMentionUid, resolveRobotTarget, resolveRobotTargetFromArg, resolveTargetUid, resolveTargetUidFromArg };