//#region src/response/reviewedNames.ts
function hasReviewedNames(data) {
	return typeof data === "object" && data !== null && "namesReviewed" in data && data.namesReviewed === true;
}

//#endregion
export { hasReviewedNames };