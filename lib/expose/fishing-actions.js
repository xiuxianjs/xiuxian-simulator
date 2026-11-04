import { boolean, integer, list, object, text } from "./schema.js";
import { isPrivateEvent } from "../utils/privateEvent.js";
import { mutation, observation } from "./mutation.js";
import { fishingBaits, fishingChums, fishingCurrencies, fishingKinds, fishingShopCategories, fishingViews, parseFishingView, validFishingReference } from "../api/bot/fishing.js";
import { parseBackendNormalCheckout } from "../api/bot/sponsor-payment.js";
import { ExposeError } from "alemonjs";

//#region src/expose/fishing-actions.ts
const action = object({
	label: text,
	command: text
});
const viewSchema = object({
	rulesVersion: text,
	view: text,
	title: text,
	status: text,
	sections: list(object({
		title: text,
		id: text,
		suffix: text,
		lines: list(text),
		actions: list(action)
	})),
	footer: list(action),
	navRows: list(list(action)),
	nav: object({
		page: integer,
		totalPages: integer,
		total: integer,
		command: text
	}),
	confirmationRef: text,
	operationId: text,
	expiresAt: text
}, [
	"nav",
	"navRows",
	"confirmationRef",
	"operationId",
	"expiresAt"
]);
const identifier = {
	type: "string",
	minLength: 1,
	maxLength: 64
};
const positive = {
	type: "integer",
	minimum: 1,
	maximum: Number.MAX_SAFE_INTEGER
};
const queryFields = {
	waterLevel: {
		type: "integer",
		minimum: 0,
		maximum: 9
	},
	blessingRealm: {
		type: "integer",
		minimum: 0,
		maximum: 9
	},
	sku: identifier,
	shopCategory: {
		type: "string",
		enum: [...fishingShopCategories]
	},
	shopMode: {
		type: "string",
		enum: ["buy", "sell"]
	},
	speciesId: identifier,
	catchId: identifier,
	castId: identifier,
	rodId: identifier,
	operationId: identifier,
	currency: {
		type: "string",
		enum: [...fishingCurrencies]
	},
	page: {
		type: "integer",
		minimum: 1,
		maximum: 2147483647
	},
	returnPage: {
		type: "integer",
		minimum: 1,
		maximum: 2147483647
	}
};
const previewFields = {
	...queryFields,
	sku: identifier,
	waterLevel: {
		type: "integer",
		minimum: 0,
		maximum: 9
	},
	hours: {
		type: "integer",
		minimum: 1,
		maximum: 24
	},
	baitType: {
		type: "string",
		enum: Object.values(fishingBaits)
	},
	baitCount: {
		type: "integer",
		minimum: 1,
		maximum: 1e6
	},
	chumType: {
		type: "string",
		enum: ["none", ...Object.values(fishingChums)]
	},
	chumCount: {
		type: "integer",
		minimum: 0,
		maximum: 1e3
	},
	chumTier: {
		type: "integer",
		minimum: 0,
		maximum: 0
	},
	quantity: positive,
	preserveUpgrade: boolean,
	lock: boolean,
	minWeightG: {
		type: "integer",
		minimum: 0,
		maximum: Number.MAX_SAFE_INTEGER
	},
	maxWeightG: {
		type: "integer",
		minimum: 0,
		maximum: Number.MAX_SAFE_INTEGER
	},
	settings: object({
		pushRareFish: boolean,
		pushFishKing: boolean,
		autoChum: boolean,
		chumType: {
			type: "string",
			enum: ["none", ...Object.values(fishingChums)]
		},
		chumTier: {
			type: "integer",
			minimum: 0,
			maximum: 0
		},
		autoBaitSwitch: boolean,
		baitOrder: {
			type: "array",
			minItems: 0,
			maxItems: 5,
			items: {
				type: "string",
				enum: Object.values(fishingBaits)
			}
		}
	}, [
		"pushRareFish",
		"pushFishKing",
		"autoChum",
		"chumType",
		"chumTier",
		"autoBaitSwitch",
		"baitOrder"
	]),
	fishIds: {
		type: "array",
		minItems: 1,
		maxItems: 100,
		items: identifier
	}
};
function validateIdentifiers(input) {
	for (const value of [
		input.speciesId,
		input.catchId,
		input.castId,
		input.rodId,
		input.operationId,
		input.sku,
		...input.fishIds ?? []
	]) if (value !== void 0 && !/^[A-Za-z0-9_.:-]{1,64}$/.test(value)) throw new ExposeError("INVALID_INPUT", "垂钓编号格式无效");
}
const fishingActions = {
	checkout_fishing_pack: mutation("建立本人垂钓礼包原订单并取得收银台；仅私聊展示支付信息，结果不明核对原订单，不重复购买。", "fishing.pack-checkout", object({ sku: identifier }), object({
		order: object({
			orderNo: text,
			payAmount: integer,
			status: text
		}),
		payUrl: text,
		packageName: text,
		promotionTexts: list(text)
	}, ["promotionTexts"]), (input) => `/垂钓 礼包购买 ${input.sku}`, (data) => parseBackendNormalCheckout(data), (input, event) => {
		if (!isPrivateEvent(event)) throw new ExposeError("INVALID_INPUT", "支付订单及收银台仅支持私聊");
		return { sku: input.sku };
	}, validateIdentifiers),
	get_fishing: observation("查询本人垂钓状态、鱼种聚合/实例/详情、钓具或买卖渔市；页码各层独立，不推测他人资产。", "fishing.query", object({
		view: {
			type: "string",
			enum: [...fishingViews]
		},
		...queryFields
	}, ["view", ...Object.keys(queryFields)]), viewSchema, () => "/垂钓", (data, _input, uid) => parseFishingView(data, uid), (input) => ({
		...input,
		view: input.view ?? "overview"
	}), validateIdentifiers),
	preview_fishing_action: observation("预览本人垂钓动作的原资产、费用与配置；仅取得5分钟原引用，未确认不扣款。开钓预留已有有限饵窝，不自动购买。", "fishing.preview", object({
		kind: {
			type: "string",
			enum: [...fishingKinds]
		},
		...previewFields
	}, Object.keys(previewFields)), viewSchema, () => "/垂钓", (data, _input, uid) => {
		const result = parseFishingView(data, uid);
		if (!result.confirmationRef) throw new Error("垂钓预览缺少原确认引用");
		return result;
	}, (input) => input, (input) => {
		validateIdentifiers(input);
		if (input.kind === "settings") {
			if (!input.settings || Object.keys(input.settings).length === 0) throw new ExposeError("INVALID_INPUT", "请选择至少一项垂钓设置");
			if (input.settings.baitOrder && new Set(input.settings.baitOrder).size !== input.settings.baitOrder.length) throw new ExposeError("INVALID_INPUT", "鱼饵顺序不能重复");
		} else if (input.settings) throw new ExposeError("INVALID_INPUT", "设置仅通过设置预览修改");
		if (input.kind === "start" && (!input.waterLevel || !input.hours || ![
			1,
			4,
			6,
			8,
			12,
			24
		].includes(input.hours) || !input.rodId || !input.baitType || !input.baitCount)) throw new ExposeError("INVALID_INPUT", "开钓需完整水域、时长、原竿、饵及有限窝配置");
		if (input.kind === "rod-upgrade" && !input.rodId) throw new ExposeError("INVALID_INPUT", "升阶需要本人原竿编号");
		if (input.kind === "use-net" && input.quantity !== void 0 && input.quantity !== 1) throw new ExposeError("INVALID_INPUT", "每次仅使用一张捕灵网");
		if (input.kind === "sell-material" && (!input.quantity || !/^material:(water_sand|wave_crystal|sea_marrow)$/.test(input.sku ?? ""))) throw new ExposeError("INVALID_INPUT", "回收仅支持三种垂钓专材及正整数份数");
		if (input.kind === "sell-fish-range" && (input.minWeightG === void 0 || input.maxWeightG === void 0 || input.catchId !== void 0 || input.fishIds !== void 0 || input.minWeightG > input.maxWeightG)) throw new ExposeError("INVALID_INPUT", "请指定有效重量区间，不混用鱼编号");
		if (input.kind === "fish-lock" && (!input.catchId || typeof input.lock !== "boolean")) throw new ExposeError("INVALID_INPUT", "锁定需要完整鱼编号与目标状态");
		if (input.kind === "purchase" && (!input.sku || !input.quantity)) throw new ExposeError("INVALID_INPUT", "购买需要原商品编号和整包份数");
		if (input.kind === "use-chum" && (!input.quantity || !Object.values(fishingChums).includes(input.chumType))) throw new ExposeError("INVALID_INPUT", "请选择六种窝料之一及正整数份数");
		if (input.kind === "purchase" && /^chum:[^:]+:\d+$/.test(input.sku ?? "")) throw new ExposeError("INVALID_INPUT", "窝料已取消等级，请重新选择商品");
		if (input.kind === "purchase" && input.sku?.startsWith("bait:") && ["crystal", "dao"].includes(input.currency ?? "")) throw new ExposeError("INVALID_INPUT", "鱼饵仅在灵石或灵鳞钱页出售");
		if (input.kind === "cashout" && (!input.quantity || !["crystal", "stone"].includes(input.currency ?? ""))) throw new ExposeError("INVALID_INPUT", "仅允许灵鳞钱兑出灵晶或灵石");
	}),
	confirm_fishing_action: mutation("确认本人原r1_y预览；结果不明或重复请求重试同一引用，不重建新配置、订单或扣款。", "fishing.confirm", object({ ref: {
		type: "string",
		minLength: 1,
		maxLength: 64
	} }), viewSchema, (input) => `/垂钓 确认 ${input.ref}`, (data, _input, uid) => parseFishingView(data, uid), (input) => ({ ref: input.ref }), (input) => {
		if (!validFishingReference(input.ref)) throw new ExposeError("INVALID_INPUT", "请使用原垂钓预览完整引用，截断或其他类型凭据不可确认");
	})
};

//#endregion
export { fishingActions };