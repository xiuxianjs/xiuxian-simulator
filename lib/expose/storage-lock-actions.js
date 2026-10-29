import { boolean, integer, object, text } from "./schema.js";
import { mutation } from "./mutation.js";
import { parseStorageLockResult } from "../api/bot/storage-lock.js";
import { ExposeError } from "alemonjs";

//#region src/expose/storage-lock-actions.ts
const categories = [
	"材料",
	"道具",
	"装备",
	"天工",
	"功法",
	"本命"
];
const assets = {
	材料: "item",
	道具: "item",
	装备: "equipment",
	天工: "professionTool",
	功法: "skillBook",
	本命: "soulArtifact"
};
function lock(locked) {
	const word = locked ? "锁定" : "解锁";
	return mutation(`${word}本人指定背包实例；功法可能按服务端分组影响多个实例，检查 count 和 group。其他状态限制由服务端决定。`, locked ? "storage.lock" : "storage.unlock", object({
		category: {
			type: "string",
			enum: [...categories]
		},
		instanceId: {
			type: "integer",
			minimum: 1,
			maximum: Number.MAX_SAFE_INTEGER
		}
	}), object({
		category: text,
		instanceId: integer,
		outcome: text,
		count: integer,
		name: text,
		group: boolean,
		message: text
	}, ["name"]), (input) => `/${word} ${input.category} ${input.instanceId}`, (data, input) => {
		if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("背包锁定回执不完整");
		const row = data;
		if (row.mode !== "id" || row.category !== input.category || row.itemId !== input.instanceId) throw new Error("背包锁定回执目标不匹配");
		const parsed = parseStorageLockResult(row.result, "instance", assets[input.category]);
		if (parsed.kind !== "instance") throw new Error("背包锁定回执选择方式不匹配");
		return {
			category: input.category,
			instanceId: input.instanceId,
			...parsed.instance,
			message: parsed.view.message
		};
	}, (input) => ({ args: [input.category, String(input.instanceId)] }));
}
const bulkCategories = [
	"材料",
	"道具",
	"装备",
	"天工",
	"功法",
	"材料-草药",
	"材料-经验材料",
	"材料-经验",
	"材料-其它",
	"道具-丹药",
	"道具-其它"
];
function lockCategory(locked) {
	const word = locked ? "锁定" : "解锁";
	return mutation(`批量${word}本人背包中指定分类当前符合条件的物品；实际影响范围和数量以服务端回执为准。`, locked ? "storage.lock" : "storage.unlock", object({ category: {
		type: "string",
		enum: [...bulkCategories]
	} }), object({
		category: text,
		outcome: text,
		count: integer,
		message: text
	}), (input) => `/${word} ${input.category}`, (data, input) => {
		if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("背包锁定回执不完整");
		const row = data;
		if (row.mode !== "category" || row.category !== input.category) throw new Error("背包锁定回执目标不匹配");
		const parsed = parseStorageLockResult(row.result, "category");
		if (parsed.kind !== "category") throw new Error("背包锁定回执选择方式不匹配");
		return {
			category: input.category,
			...parsed.category,
			message: parsed.view.message
		};
	}, (input) => ({ args: [input.category] }));
}
function lockType(locked) {
	const word = locked ? "锁定" : "解锁";
	const token = (input) => `${input.category}-${input.typeName}`;
	return mutation(`按服务端类型名称批量${word}本人装备、天工或功法；实际变更数量以服务端回执为准。`, locked ? "storage.lock" : "storage.unlock", object({
		category: {
			type: "string",
			enum: [
				"装备",
				"天工",
				"功法"
			]
		},
		typeName: {
			type: "string",
			minLength: 1
		}
	}), object({
		category: text,
		typeName: text,
		outcome: text,
		count: integer,
		message: text
	}), (input) => `/${word} ${token(input)}`, (data, input) => {
		if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("背包锁定回执不完整");
		const row = data;
		if (row.mode !== "category" || row.category !== token(input)) throw new Error("背包锁定回执目标不匹配");
		const parsed = parseStorageLockResult(row.result, "category");
		if (parsed.kind !== "category") throw new Error("背包锁定回执选择方式不匹配");
		return {
			category: input.category,
			typeName: input.typeName,
			...parsed.category,
			message: parsed.view.message
		};
	}, (input) => ({ args: [token(input)] }), (input) => {
		if (!/^\S+$/.test(input.typeName)) throw new ExposeError("INVALID_INPUT", "类型名称必须是单个非空名称");
	});
}
const storageLockActions = {
	lock_storage_instance: lock(true),
	unlock_storage_instance: lock(false),
	lock_storage_category: lockCategory(true),
	unlock_storage_category: lockCategory(false),
	lock_storage_type: lockType(true),
	unlock_storage_type: lockType(false)
};

//#endregion
export { storageLockActions };