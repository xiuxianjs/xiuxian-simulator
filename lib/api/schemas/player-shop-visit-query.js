//#region src/api/schemas/player-shop-visit-query.ts
function assertPlayerShopInfo(value, message) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(message);
	const row = value;
	if (![
		"shopId",
		"userId",
		"heatScore",
		"totalSales",
		"totalVolume",
		"level",
		"status",
		"activeListings"
	].every((key) => typeof row[key] === "number" && Number.isSafeInteger(row[key])) || ![
		"ownerName",
		"shopName",
		"levelName"
	].every((key) => typeof row[key] === "string") || row.description !== void 0 && row.description !== null && typeof row.description !== "string") throw new Error(message);
}

//#endregion
export { assertPlayerShopInfo };