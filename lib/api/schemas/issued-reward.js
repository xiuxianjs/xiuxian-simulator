//#region src/api/schemas/issued-reward.ts
/** Issued entries have positive quantities; an empty array is valid. */
function parsePositiveIssuedRewards(value, listError, itemError = listError) {
	return parseIssuedRewards(value, listError, itemError, 1);
}
/** Capped resource grants can successfully issue zero units. */
function parseNonNegativeIssuedRewards(value, listError, itemError = listError) {
	return parseIssuedRewards(value, listError, itemError, 0);
}
function parseIssuedRewards(value, listError, itemError, minimum) {
	if (!Array.isArray(value)) throw new Error(listError);
	return value.map((value) => {
		if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(itemError);
		const reward = value;
		if (typeof reward.type !== "string" || typeof reward.name !== "string" || typeof reward.amount !== "number" || !Number.isSafeInteger(reward.amount) || reward.amount < minimum) throw new Error(itemError);
		return {
			type: reward.type,
			name: reward.name,
			amount: reward.amount
		};
	});
}

//#endregion
export { parseNonNegativeIssuedRewards, parsePositiveIssuedRewards };