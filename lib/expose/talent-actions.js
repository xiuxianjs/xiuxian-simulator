import { boolean, integer, list, object, text } from "./schema.js";
import { observation } from "./mutation.js";
import { parsePlayerTalents } from "../api/bot/talents.js";

//#region src/expose/talent-actions.ts
const talentActions = { get_talents: observation("查询本人天赋是否已发放、规则版本，以及修行、生活和战斗天赋的效果与启用状态；不会补发天赋。", "talents.query", object({}), object({
	granted: boolean,
	rulesVersion: integer,
	talents: list(object({
		code: text,
		name: text,
		category: {
			type: "string",
			enum: [
				"修行",
				"生活",
				"战斗"
			]
		},
		description: text,
		enabled: boolean,
		implemented: boolean
	}))
}), () => "/我的天赋", parsePlayerTalents) };

//#endregion
export { talentActions };