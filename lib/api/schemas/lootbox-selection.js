//#region src/api/schemas/lootbox-selection.ts
/** Selection comes from the server; owned treasures remain valid choices. */
function parseLootboxSelection(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("宝盒自选内容不完整");
	const selection = value;
	if (selection.kind !== "treasure" || ![
		"rare",
		"epic",
		"mythic"
	].includes(String(selection.rarity)) || !Array.isArray(selection.choices) || !selection.choices.length) throw new Error("宝盒自选内容不完整");
	const rarity = selection.rarity;
	const seen = /* @__PURE__ */ new Set();
	return {
		kind: "treasure",
		rarity,
		choices: selection.choices.map((value) => {
			if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("宝盒自选宝物不完整");
			const choice = value;
			const treasureId = choice.treasureId;
			if (typeof treasureId !== "number" || !Number.isSafeInteger(treasureId) || treasureId < 1 || seen.has(treasureId) || typeof choice.name !== "string" || !choice.name.trim() || choice.rarity !== rarity) throw new Error("宝盒自选宝物不完整");
			seen.add(treasureId);
			return {
				treasureId,
				name: choice.name,
				rarity
			};
		})
	};
}

//#endregion
export { parseLootboxSelection };