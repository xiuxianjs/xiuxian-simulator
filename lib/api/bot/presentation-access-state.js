//#region src/api/bot/presentation-access-state.ts
const snapshots = /* @__PURE__ */ new WeakMap();
function presentationAccessFor(event, read) {
	let snapshot = snapshots.get(event);
	if (!snapshot || snapshot.bid !== event.UserId) {
		snapshot = {
			bid: event.UserId,
			pending: read()
		};
		snapshots.set(event, snapshot);
	}
	return snapshot.pending;
}
function invalidatePresentationAccess(event) {
	snapshots.delete(event);
}

//#endregion
export { invalidatePresentationAccess, presentationAccessFor };