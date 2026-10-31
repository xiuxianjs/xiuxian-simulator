//#region src/response/treasureEffects.ts
/** Keep treasure prose and actual gains separate from the ordinary receipt. */
function appendTreasureEffects(md, notices) {
	for (const notice of notices ?? []) {
		md.addNewline().addNewline().addText(notice.description);
		for (const benefit of notice.benefits) md.addNewline().addBold(benefit);
	}
}

//#endregion
export { appendTreasureEffects };