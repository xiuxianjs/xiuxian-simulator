import { MSG_FRIEND } from "../../../constants/messages.js";
import { deleteBackendFriend, getBackendFriendRemovalTarget } from "../../../api/bot/friend-removal.js";

//#region src/response-apps/friend/deleteFriend/app.ts
function parseDeleteCommand(messageText) {
	const match = (messageText?.trim() ?? "").match(/^[!！/#＃]?删除好友\s+(.+?)(\s+确认)?$/);
	if (!match) return null;
	return {
		targetArg: match[1].trim(),
		confirmed: Boolean(match[2])
	};
}
async function lookupDeletionTarget(bid, uid, targetArg, mention) {
	const text = targetArg.trim();
	const numeric = /^\d+$/.test(text) ? Number(text) : 0;
	if (Number.isFinite(numeric) && numeric > 0) {
		const serialized = numeric.toString();
		return {
			targetId: numeric,
			target: numeric >= 1e21 || BigInt(serialized) > 9223372036854775807n ? null : await getBackendFriendRemovalTarget(bid, uid, { targetUid: serialized })
		};
	}
	const mentioned = await mention.findOne();
	if (!mentioned?.count || !mentioned.data?.UserId) return {
		targetId: null,
		target: null
	};
	const target = await getBackendFriendRemovalTarget(bid, uid, { targetBid: mentioned.data.UserId });
	return {
		targetId: target?.id ?? null,
		target
	};
}
async function confirmDeleteFriend(bid, uid, targetId, request, prefetched) {
	const result = prefetched ?? await deleteBackendFriend(bid, uid, targetId, request);
	if (result.outcome === "locked") return {
		code: "LOCKED",
		data: { realmName: result.realmName ?? "未知" }
	};
	if (result.outcome === "removed") return {
		code: "OK",
		data: { message: "已删除好友" }
	};
	return {
		code: "FAIL",
		data: { message: {
			self: MSG_FRIEND.CANNOT_OPERATE_SELF,
			not_friend: MSG_FRIEND.NOT_YOUR_FRIEND,
			companion: MSG_FRIEND.IS_COMPANION,
			failed: MSG_FRIEND.DELETE_FAILED
		}[result.outcome] }
	};
}

//#endregion
export { confirmDeleteFriend, lookupDeletionTarget, parseDeleteCommand };