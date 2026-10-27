import { requestBackend } from "../api/bot/client.js";
import { boolean, fields, integer, list, number, object, page, text } from "./schema.js";
import { query } from "./query.js";
import { parseBackendLootboxes, parseEquipmentBag, parseProfessionToolBag, parseSkillBookBag, parseSoulArtifactBag } from "../api/bot/queries.js";

//#region src/expose/bags.ts
const kind = object({
	kind: text,
	equipmentType: text,
	skillType: text
}, ["equipmentType", "skillType"]);
const filter = {
	type: "string",
	minLength: 1,
	maxLength: 100
};
const pagination = fields(integer, "page total totalPages");
const attributes = {
	...fields(integer, "physicalAttack magicAttack physicalDefense magicDefense hp speed"),
	...fields(number, "physicalAttackPercent magicAttackPercent physicalDefensePercent magicDefensePercent hpPercent critRate critDamage")
};
const equipment = object({
	...pagination,
	types: list(text),
	activeType: text,
	capabilities: list(kind),
	items: list(object({
		...fields(integer, "id equipmentId isEquipped isLocked"),
		...fields(text, "displayName displayEquipmentType displayGrade"),
		attributeParts: list(text),
		...attributes,
		...fields(boolean, "canEquip canLock canDecompose"),
		capabilities: list(kind)
	}))
}, ["activeType"]);
const books = object({
	...pagination,
	skillType: text,
	capabilities: list(kind),
	items: list(object({
		...fields(integer, "id skillBookId status isLocked quantity identifiableCount"),
		...fields(text, "displayName displayGrade displaySkillType"),
		unidentified: boolean,
		attributeParts: list(text),
		...attributes,
		capabilities: list(kind)
	}))
});
const artifacts = object({
	...fields(integer, "page total pageSize"),
	items: list(object({
		...fields(integer, "id userSoulArtifactId artifactId gradeId level washCount isLocked"),
		...fields(text, "name gradeName lockAction"),
		...fields(boolean, "hasUpgraded isEquipped canRefine canToggleLock")
	}))
});
const tools = object({
	...pagination,
	pageSize: integer,
	types: list(text),
	activeType: text,
	capabilities: list(text),
	items: list(object({
		...fields(integer, "id toolId gradeId isEquipped isLocked"),
		...fields(text, "name typeName grade"),
		...fields(boolean, "canReplace canToggleLock"),
		capabilities: list(text)
	}))
}, ["activeType"]);
const lootboxes = object({
	...fields(integer, "page total pageSize"),
	items: list(object({
		...fields(integer, "id lootboxId quantity"),
		...fields(text, "name description"),
		capabilities: list(object({
			kind: text,
			valid: boolean,
			options: list(object(fields(integer, "requestedCount effectiveCount")))
		}))
	}))
});
const bagQueryActions = {
	get_equipment_bag: query("分页查询装备背包、分类、属性、装备/锁定/分解资格；不执行操作。", equipment, async ({ bid, uid, request }, input) => parseEquipmentBag(await requestBackend(bid, "get_players_id_equipment_bag", {
		path: { id: uid },
		query: {
			view: "storage",
			page: input.page ?? 1,
			equipmentType: input.equipmentType
		},
		...request
	})), object({
		page,
		equipmentType: filter
	}, ["page", "equipmentType"])),
	get_skill_book_bag: query("分页查询功法背包、未鉴定状态、数量、属性和操作资格。", books, async ({ bid, uid, request }, input) => parseSkillBookBag(await requestBackend(bid, "get_players_id_skill_books_bag", {
		path: { id: uid },
		query: {
			view: "storage",
			page: input.page ?? 1,
			skillType: input.skillType
		},
		...request
	})), object({
		page,
		skillType: filter
	}, ["page", "skillType"])),
	get_soul_artifact_bag: query("分页查询本命物背包、等级、洗涤次数和炼化资格。", artifacts, async ({ bid, uid, request }, input) => parseSoulArtifactBag(await requestBackend(bid, "get_players_id_soul_artifacts_bag", {
		path: { id: uid },
		query: { page: input.page ?? 1 },
		...request
	})), object({ page }, ["page"])),
	get_profession_tool_bag: query("分页查询天工工具、类型、品阶和替换资格。", tools, async ({ bid, uid, request }, input) => parseProfessionToolBag(await requestBackend(bid, "get_players_id_profession_tools_bag", {
		path: { id: uid },
		query: {
			page: input.page ?? 1,
			typeName: input.typeName
		},
		...request
	})), object({
		page,
		typeName: filter
	}, ["page", "typeName"])),
	get_lootboxes: query("分页查询礼盒库存与服务端允许的开启数量，不开启礼盒。", lootboxes, async ({ bid, uid, request }, input) => parseBackendLootboxes(await requestBackend(bid, "get_players_id_lootboxes", {
		path: { id: uid },
		query: { page: input.page ?? 1 },
		...request
	})), object({ page }, ["page"]))
};

//#endregion
export { bagQueryActions };