//#region src/api/bot/presentation-access-state.ts
const snapshots = /* @__PURE__ */ new WeakMap();
function seedPresentationAccess(event, bid, features) {
	if (event.UserId === bid) snapshots.set(event, {
		bid,
		pending: Promise.resolve(features)
	});
}
function presentationAccessFor(event, read) {
	let snapshot = snapshots.get(event);
	if (!snapshot || snapshot.bid !== event.UserId) {
		snapshot = {
			bid: event.UserId,
			pending: read()
		};
		snapshots.set(event, snapshot);
		const current = snapshot;
		current.pending.catch(() => {
			if (snapshots.get(event) === current) snapshots.delete(event);
		});
	}
	return snapshot.pending;
}
function invalidatePresentationAccess(event) {
	snapshots.delete(event);
}

//#endregion
export { invalidatePresentationAccess, presentationAccessFor, seedPresentationAccess };