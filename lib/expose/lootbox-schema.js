import { integer, list, object, text } from "./schema.js";

//#region src/expose/lootbox-schema.ts
const lootboxSelection = object({
	kind: {
		type: "string",
		enum: ["treasure"]
	},
	rarity: {
		type: "string",
		enum: [
			"rare",
			"epic",
			"mythic"
		]
	},
	choices: list(object({
		treasureId: integer,
		name: text,
		rarity: text
	}))
});
const lootboxOpenResult = object({
	lootboxId: integer,
	lootboxName: text,
	openCount: integer,
	rewards: list(object({
		category: text,
		rewardId: integer,
		name: text,
		quantity: integer
	})),
	selection: lootboxSelection
}, ["lootboxId", "selection"]);

//#endregion
export { lootboxOpenResult, lootboxSelection };