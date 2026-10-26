import { invalidatePresentationAccess } from "./presentation-access-state.js";
import { invalidateEventCatalog } from "./catalog-query-reuse.js";

//#region src/api/bot/access-facts.ts
const snapshots = /* @__PURE__ */ new WeakMap();
const importerFacts = /* @__PURE__ */ new WeakMap();
function withAccessFacts(facts, importer) {
	importerFacts.set(importer, facts);
	return importer;
}
function getRegisteredAccessFacts(importers) {
	return [...new Set(importers.flatMap((importer) => importerFacts.get(importer) ?? []))];
}
function seedEventAccessFacts(event, bid, uid, facts) {
	if (event.UserId !== bid || !Number.isSafeInteger(uid) || uid < 1) throw new Error("准入事实身份不匹配");
	snapshots.set(event, {
		bid,
		uid,
		facts
	});
}
function getEventAccessFacts(event, bid, uid) {
	if (!event || event.UserId !== bid) return;
	const snapshot = snapshots.get(event);
	return snapshot?.bid === bid && (uid === void 0 || snapshot.uid === uid) ? snapshot.facts : void 0;
}
function invalidateEventAccessFacts(event) {
	snapshots.delete(event);
	invalidatePresentationAccess(event);
	invalidateEventCatalog(event);
}

//#endregion
export { getEventAccessFacts, getRegisteredAccessFacts, invalidateEventAccessFacts, seedEventAccessFacts, withAccessFacts };