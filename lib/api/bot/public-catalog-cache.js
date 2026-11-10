import { getBackendConfig } from "./config.js";
import { BackendAPIError } from "./client.js";
import { createHash } from "node:crypto";

//#region src/api/bot/public-catalog-cache.ts
const catalogs = /* @__PURE__ */ new Set([
	"base.grades",
	"base.equipment-types",
	"base.skill-types",
	"base.realms",
	"base.alchemy-recipes",
	"base.forge-recipes"
]);
const realmFields = [
	"id",
	"name",
	"level",
	"stageLevel",
	"spiritualPower",
	"speed",
	"magicDefense",
	"physicalDefense",
	"magicAttack",
	"physicalAttack",
	"hp",
	"experienceLimit",
	"attributePoints",
	"maxStrength",
	"maxIntelligence",
	"maxConstitution",
	"maxAgility",
	"maxLuck"
];
const versionPattern = /^c1_[0-9a-f]{64}$/;
const invalid = () => {
	throw new BackendAPIError("公开目录缓存响应无效，请重新查询", "SDK_INVALID_RESPONSE");
};
function publicRecipe(value, forge) {
	const integers = forge ? [
		"recipeId",
		"outputEquipmentId",
		"requiredLevel",
		"craftRequiredLevel",
		"spiritStoneCost",
		"baseExp",
		"configuredToolGrade",
		"toolGrade"
	] : [
		"recipeId",
		"requiredLevel",
		"fireDemand",
		"furnaceDemand",
		"baseExp",
		"regularItemId",
		"excellentItemId",
		"outputQuantity"
	];
	const strings = forge ? ["name", "toolType"] : [];
	const booleans = forge ? ["assessment", "earlyCraft"] : [];
	if (integers.some((key) => !Number.isSafeInteger(value[key])) || strings.some((key) => typeof value[key] !== "string") || booleans.some((key) => typeof value[key] !== "boolean") || !Array.isArray(value.materials)) return invalid();
	const materials = value.materials.map((material) => {
		if (!material || typeof material !== "object" || Array.isArray(material)) return invalid();
		const row = material;
		if (!Number.isSafeInteger(row.itemId) || !Number.isSafeInteger(row.quantity)) return invalid();
		return {
			itemId: row.itemId,
			quantity: row.quantity
		};
	});
	return {
		...Object.fromEntries([
			...integers,
			...strings,
			...booleans
		].map((key) => [key, value[key]])),
		materials
	};
}
function publicPage(data, operation, page, pageSize) {
	const fields = operation === "base.realms" ? realmFields : operation === "base.grades" ? [
		"id",
		"name",
		"category",
		"level",
		"realmId"
	] : operation === "base.equipment-types" ? [
		"id",
		"name",
		"category",
		"isCraftable"
	] : ["id", "name"];
	if (data.page !== page || data.pageSize !== pageSize || !Number.isSafeInteger(data.total) || Number(data.total) < 0 || !Array.isArray(data.items) || data.items.length > pageSize || data.items.length > Number(data.total)) return invalid();
	const result = {
		items: data.items.map((row) => {
			if (!row || typeof row !== "object" || Array.isArray(row)) return invalid();
			const value = row;
			if (operation === "base.alchemy-recipes" || operation === "base.forge-recipes") return publicRecipe(value, operation === "base.forge-recipes");
			if (Object.keys(value).length !== fields.length || fields.some((key) => {
				if (key === "name" || key === "category") return typeof value[key] !== "string";
				if (key === "isCraftable") return typeof value[key] !== "boolean";
				return !Number.isSafeInteger(value[key]) || key === "id" && Number(value[key]) < 1 || key === "realmId" && Number(value[key]) < 0;
			})) return invalid();
			return Object.fromEntries(fields.map((key) => [key, value[key]]));
		}),
		total: Number(data.total),
		page,
		pageSize
	};
	if (operation === "base.alchemy-recipes") {
		if (typeof data.version !== "string" || !data.version) return invalid();
		result.version = data.version;
	} else if (operation === "base.forge-recipes") {
		if (typeof data.enabled !== "boolean" || !Number.isSafeInteger(data.entryRealmId)) return invalid();
		result.enabled = data.enabled;
		result.entryRealmId = Number(data.entryRealmId);
	}
	return result;
}
var PublicCatalogCache = class {
	limits;
	now;
	entries = /* @__PURE__ */ new Map();
	bytes = 0;
	constructor(limits = {
		entries: 128,
		bytes: 4194304,
		entryBytes: 262144,
		retentionMs: 3e5
	}, now = Date.now) {
		this.limits = limits;
		this.now = now;
	}
	prepare(scope, operation, args) {
		if (!catalogs.has(operation) || Object.keys(args).some((key) => key !== "page" && key !== "pageSize") || !Number.isInteger(args.page) || Number(args.page) < 1 || Number(args.page) > 21474836 || !Number.isInteger(args.pageSize) || Number(args.pageSize) < 1 || Number(args.pageSize) > 100) return;
		const page = Number(args.page), pageSize = Number(args.pageSize);
		const key = JSON.stringify([
			scope,
			operation,
			page,
			pageSize
		]);
		const now = this.now();
		for (const [id, entry] of this.entries) if (entry.expires <= now) this.remove(id);
		const prior = this.entries.get(key);
		if (prior) {
			this.entries.delete(key);
			this.entries.set(key, prior);
		}
		return {
			arguments: {
				...args,
				knownVersion: prior?.version ?? ""
			},
			decode: (value, decode) => {
				if (!value || typeof value !== "object" || Array.isArray(value)) return invalid();
				const data = value;
				if (data.catalogNotModified !== void 0) {
					if (data.catalogNotModified !== true || !prior || data.catalogVersion !== prior.version || Object.keys(data).length !== 2) return invalid();
					return decode(JSON.parse(prior.json));
				}
				const publicData = publicPage(data, operation, page, pageSize);
				const version = data.catalogVersion;
				if (version !== void 0 && (typeof version !== "string" || !versionPattern.test(version))) return invalid();
				const json = JSON.stringify(publicData);
				const result = decode(publicData);
				if (typeof version === "string") {
					const bytes = Buffer.byteLength(json);
					this.remove(key);
					if (bytes <= this.limits.entryBytes && bytes <= this.limits.bytes && this.limits.entries > 0) {
						while (this.entries.size >= this.limits.entries || this.bytes + bytes > this.limits.bytes) this.remove(this.entries.keys().next().value);
						this.entries.set(key, {
							version,
							json,
							bytes,
							expires: this.now() + this.limits.retentionMs
						});
						this.bytes += bytes;
					}
				}
				return result;
			}
		};
	}
	remove(key) {
		const entry = this.entries.get(key);
		if (entry) {
			this.bytes -= entry.bytes;
			this.entries.delete(key);
		}
	}
};
const publicCatalogCache = new PublicCatalogCache();
function preparePublicCatalogRequest(operation, args) {
	if (!catalogs.has(operation)) return;
	const config = getBackendConfig();
	const scope = createHash("sha256").update(JSON.stringify([
		config.scope,
		config.channelMode,
		config.channelBotId,
		config.robotAuthToken
	])).digest("hex");
	return publicCatalogCache.prepare(scope, operation, args);
}

//#endregion
export { PublicCatalogCache, preparePublicCatalogRequest };