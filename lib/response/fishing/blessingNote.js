//#region src/response/fishing/blessingNote.ts
/** Only forward the service's settled note. Never add the amount to a gain. */
function fishingBlessingNote(text) {
	if (text === void 0) return "";
	const index = text.lastIndexOf("锦鲤赐福+");
	return index < 0 ? "" : text.slice(index);
}
function fishingBlessingSuffix(text) {
	const note = fishingBlessingNote(text);
	return note ? `（含${note}）` : "";
}

//#endregion
export { fishingBlessingNote, fishingBlessingSuffix };