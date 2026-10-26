//#region src/utils/teamTarget.ts
async function resolvePositionTarget(_bid, targetArg, mention) {
	const text = targetArg.trim();
	const numeric = /^\d+$/.test(text) ? Number(text) : null;
	if (numeric !== null && Number.isFinite(numeric) && numeric > 0) return { targetUid: String(numeric) };
	if (!mention) return null;
	const user = await mention.findOne();
	if (!user?.count || !user.data?.UserId) return null;
	return { targetBid: user.data.UserId };
}
async function resolveTransferTarget(_bid, messageText, mention) {
	const match = String(messageText ?? "").match(/(\d+)/);
	if (match) {
		const uid = Number(match[1]);
		return Number.isFinite(uid) && uid > 0 ? { targetUid: String(uid) } : null;
	}
	if (!mention) return null;
	const user = await mention.findOne();
	if (!user?.count || !user.data?.UserId) return null;
	return { targetBid: user.data.UserId };
}

//#endregion
export { resolvePositionTarget, resolveTransferTarget };