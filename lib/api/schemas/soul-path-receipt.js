//#region src/api/schemas/soul-path-receipt.ts
/** Go SoulPathActionResult is shared by choosing, switching and advancing. */
function parseSoulPathReceipt(value, message) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(message);
	const data = value;
	if (typeof data.message !== "string" || data.pathKey !== "xuan_fa" && data.pathKey !== "lian_ti" && data.pathKey !== "yu_qi" || typeof data.pathName !== "string" || typeof data.nodeName !== "string" || data.pathSwitchAvailableAt !== null && typeof data.pathSwitchAvailableAt !== "string") throw new Error(message);
	return {
		message: data.message,
		pathKey: data.pathKey,
		pathName: data.pathName,
		nodeName: data.nodeName,
		pathSwitchAvailableAt: data.pathSwitchAvailableAt
	};
}

//#endregion
export { parseSoulPathReceipt };