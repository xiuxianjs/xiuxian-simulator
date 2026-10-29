import { requestBackend } from "../api/bot/client.js";
import { boolean, integer, list, number, object, text } from "./schema.js";
import { mutation, observation } from "./mutation.js";
import { query } from "./query.js";
import { caveSchema } from "./common-queries.js";
import { confirmationReferenceSchema, validateConfirmationReference } from "./confirmation.js";
import { parseBackendCaveCommand, parseBackendCavePlantQuery } from "../api/bot/cave-command.js";
import { parseMasterAction } from "../api/bot/master-actions.js";
import { parseBackendCaveAccelerationPreview } from "../api/bot/cave-plot-actions.js";
import { parseRobotCaveAction, parseRobotCavePlant } from "../api/bot/cave-robot-command.js";
import { parseBackendCaveFormationActivation, parseBackendCaveFormationRemoval } from "../api/bot/cave-formation-actions.js";
import { ExposeError } from "alemonjs";

//#region src/expose/cave-actions.ts
const plotIndex = {
	type: "integer",
	minimum: 1,
	maximum: 2147483647
};
const options = object({
	plotIndex: integer,
	remainingPlots: integer,
	options: list(object({
		seedName: text,
		cropName: text,
		matureHours: number,
		quantity: integer
	}))
});
const commandResult = object({
	message: text,
	ownerUid: integer,
	snapshotError: text,
	needsSeedSelection: boolean,
	overview: caveSchema,
	options
}, [
	"ownerUid",
	"snapshotError",
	"overview",
	"options"
]);
const accelerationPreview = object({
	found: boolean,
	message: text,
	...Object.fromEntries("plotIndex greenBottleUsedCount greenBottleLimit remainingSeconds lingfeiCount greenBottleCount remainingSlots maxLingfei maxGreenBottle spiritStone stoneCost maxSpiritStone ripenCost".split(" ").map((key) => [key, integer])),
	remainingHours: number,
	spiritStoneEnabled: boolean,
	canRipen: boolean,
	ripenNextAt: text,
	stoneReason: text
}, "plotIndex greenBottleUsedCount greenBottleLimit remainingSeconds lingfeiCount greenBottleCount remainingSlots maxLingfei maxGreenBottle spiritStone stoneCost maxSpiritStone ripenCost remainingHours spiritStoneEnabled canRipen ripenNextAt stoneReason".split(" "));
const accelerator = {
	type: "string",
	enum: [
		"lingfei",
		"greenBottle",
		"spiritStone",
		"ripen"
	]
};
const count = {
	type: "integer",
	minimum: 1,
	maximum: Number.MAX_SAFE_INTEGER
};
const tendResult = object({
	message: text,
	ownerId: integer,
	water: integer,
	worm: integer,
	weed: integer,
	harvested: integer
});
function parseTendResult(data) {
	const message = parseMasterAction(data).message;
	const row = data;
	if (![
		"ownerId",
		"water",
		"worm",
		"weed",
		"harvested"
	].every((key) => Number.isSafeInteger(row[key]) && Number(row[key]) >= 0) || Number(row.ownerId) === 0) throw new Error("灵田打理回执不完整");
	return {
		...row,
		message
	};
}
const formationExpectation = object({
	category: text,
	targetKey: text,
	itemName: text,
	durationHours: number,
	effect: text,
	current: object({
		key: text,
		expiresAt: text
	})
}, ["current"]);
const plotArgs = (input) => ({ plotIndex: input.plotIndex === void 0 ? null : String(input.plotIndex) });
const care = (operation, word, description) => mutation(description, operation, object({ plotIndex }, ["plotIndex"]), commandResult, (input) => `/${word}${input.plotIndex === void 0 ? "" : ` ${input.plotIndex}`}`, (data) => {
	const result = parseRobotCaveAction(data);
	if (result.mode !== "command") throw new Error("灵田操作未返回结算回执");
	return result.result;
}, plotArgs);
const caveActions = {
	preview_cave_formation_activation: observation("预览指定阵盘的配置、库存和当前同类阵法，不消耗阵盘；激活时须原样携带 expected。", "cave-formations.activate", object({ keyword: {
		type: "string",
		minLength: 1
	} }), object({
		keyword: text,
		expected: formationExpectation,
		formationName: text,
		effect: text,
		durationHours: number,
		owned: integer,
		reference: confirmationReferenceSchema
	}), (input) => `/激活阵盘 ${input.keyword}`, (data, input) => {
		const row = data;
		if (row?.keyword !== input.keyword.trim() || typeof row.reference !== "string") throw new Error("阵盘预览与请求不匹配");
		validateConfirmationReference(row.reference, "g");
		return data;
	}, (input) => ({
		keyword: input.keyword,
		preview: true
	})),
	activate_cave_formation: mutation("激活预览中的阵盘，会消耗一个阵盘并可能刷新或替换当前同类阵法；服务端核对原配置和原状态后执行。", "cave-formations.activate", object({
		keyword: {
			type: "string",
			minLength: 1
		},
		reference: confirmationReferenceSchema
	}), object({
		outcome: {
			type: "string",
			enum: [
				"created",
				"refreshed",
				"replaced"
			]
		},
		replaced: boolean,
		replacedFormationName: text,
		name: text,
		durationHours: number,
		formation: object({
			formationKey: text,
			formationCategory: text,
			formationName: text,
			formationEffect: text,
			expiresAt: text
		})
	}, ["replacedFormationName"]), (input) => `/激活阵盘 ${input.keyword}`, parseBackendCaveFormationActivation, (input) => ({
		keyword: input.keyword,
		reference: input.reference
	}), (input) => validateConfirmationReference(input.reference, "g")),
	remove_cave_formation: mutation("移除本人看到的原阵法；keyword、key 和 expiresAt 必须来自洞府快照。阵法已更换或刷新时服务端拒绝，冻结阵法移除会按原规则结算。", "cave-formations.remove", object({
		keyword: {
			type: "string",
			minLength: 1
		},
		key: {
			type: "string",
			minLength: 1
		},
		expiresAt: {
			type: "string",
			minLength: 1
		}
	}), object({
		removed: boolean,
		category: text,
		outcome: {
			type: "string",
			enum: ["removed"]
		},
		name: text,
		durationHours: number,
		formation: object({
			formationKey: text,
			formationCategory: text,
			formationName: text,
			formationEffect: text,
			expiresAt: text
		})
	}), (input) => `/移除阵法 ${input.keyword}`, (data, input) => {
		const result = parseBackendCaveFormationRemoval(data);
		if (result.formation.formationKey !== input.key || Date.parse(result.formation.expiresAt) !== Date.parse(input.expiresAt)) throw new Error("移除阵法回执与原状态不匹配");
		return result;
	}, (input) => ({
		keyword: input.keyword,
		expected: {
			key: input.key,
			expiresAt: input.expiresAt
		}
	})),
	plant_all_cave_plots: mutation("使用指定灵种批量播种本人空闲灵田，种子名称取自播种选项；按服务端实际库存、地块和回执判断结果。", "cave.plant", object({ seedName: {
		type: "string",
		minLength: 1
	} }), commandResult, (input) => `/播种 ${input.seedName}`, (data) => {
		const result = parseRobotCavePlant(data);
		if (result.mode !== "plant") throw new Error("批量播种未返回操作回执");
		return result.result;
	}, (input) => ({
		plotIndex: null,
		seedName: input.seedName
	})),
	prepare_cave_acceleration: observation("准备指定灵田加速，返回绑定本人原作物的确认引用及服务端报价；支持灵肥、小绿瓶、灵石或催熟。ripen 的 count 必须为 1，准备不消耗资源。", "cave.accelerate", object({
		plotIndex,
		accelerator,
		count
	}), object({
		reference: confirmationReferenceSchema,
		accelerator,
		count,
		maxSpiritStone: integer,
		preview: accelerationPreview,
		plot: object({
			plotIndex: integer,
			seedName: text,
			cropName: text,
			plantedAt: text,
			matureAt: text,
			usedCount: integer,
			limit: integer
		})
	}), (input) => `/灵田加速 ${input.plotIndex}`, (data, input) => {
		const row = data;
		const quote = row?.quote;
		if (row?.mode !== "reference-preview" || !quote || typeof quote.reference !== "string" || quote.accelerator !== input.accelerator || quote.count !== input.count || !Number.isSafeInteger(quote.maxSpiritStone) || Number(quote.maxSpiritStone) < 0) throw new Error("灵田加速确认预览不完整");
		validateConfirmationReference(quote.reference, "c");
		const preview = parseBackendCaveAccelerationPreview(quote.preview);
		if (!preview.found || preview.plotIndex !== input.plotIndex) throw new Error("灵田加速预览与地块不匹配");
		if (quote.plot?.plotIndex !== input.plotIndex) throw new Error("灵田加速预览缺少原作物");
		const raw = quote.preview;
		return {
			...quote,
			preview: Object.fromEntries(Object.entries(preview).filter(([key]) => raw[key] !== void 0 && raw[key] !== null))
		};
	}, (input) => ({
		mode: "prepare-reference",
		plotIndex: String(input.plotIndex),
		accelerator: input.accelerator,
		count: String(input.count)
	}), (input) => {
		if (input.accelerator === "ripen" && input.count !== 1) throw new ExposeError("INVALID_INPUT", "立即催熟的次数必须为 1");
	}),
	confirm_cave_acceleration: mutation("确认原灵田加速引用；服务端事务核对原作物、加速条件和灵石价格上限，实际消耗不足或状态变化时拒绝。成功回执包含实际次数、时长和灵石消耗；原引用跨消息重试复用结果。", "cave.accelerate", object({ reference: confirmationReferenceSchema }), object({
		message: text,
		requestedCount: integer,
		actualCount: integer,
		hoursReduced: integer,
		secondsReduced: integer,
		spiritStoneSpent: integer,
		immediate: boolean,
		plot: object({
			plotIndex: integer,
			seedName: text,
			cropName: text,
			isMature: boolean,
			remainingSeconds: integer,
			plantedAt: text,
			matureAt: text
		}, ["plantedAt", "matureAt"])
	}), () => "/灵田加速", (data) => {
		const row = data;
		const result = row?.result;
		if (row?.mode !== "reference-confirm" || !result || typeof result.message !== "string" || !result.message || !result.plot || typeof result.plot !== "object" || ![
			"requestedCount",
			"actualCount",
			"hoursReduced",
			"secondsReduced",
			"spiritStoneSpent"
		].every((key) => Number.isSafeInteger(result[key]) && Number(result[key]) >= 0) || typeof result.immediate !== "boolean") throw new Error("灵田加速结算回执不完整");
		return result;
	}, (input) => ({
		mode: "confirm-reference",
		reference: input.reference
	}), (input) => validateConfirmationReference(input.reference, "c")),
	cultivate_all_cave_plots: mutation("一次开垦服务端允许的全部灵田地块，会消耗实际所需材料；按返回 message 和快照判断结果，快照失败不重做开垦。", "cave.cultivate", object({}), commandResult, () => "/开垦所有", parseBackendCaveCommand, () => ({
		plotIndex: null,
		all: true
	})),
	upgrade_cave_plot: mutation("升级本人指定灵田地块，消耗和等级上限由服务端校验；返回实际操作说明和快照，不对其他地块批量升级。", "cave.upgrade", object({ plotIndex }), commandResult, (input) => `/升级灵田 ${input.plotIndex}`, (data) => {
		const result = parseRobotCaveAction(data);
		if (result.mode !== "command") throw new Error("灵田升级未返回结算回执");
		return result.result;
	}, plotArgs),
	get_cave_acceleration_options: observation("查询本人指定灵田的加速可选项、库存及服务端报价，不消耗资源；found=false 表示没有有效加速预览。", "cave.accelerate", object({ plotIndex }), accelerationPreview, (input) => `/灵田加速 ${input.plotIndex}`, (data, input) => {
		const result = parseRobotCaveAction(data);
		if (result.mode !== "preview" || result.preview.found && result.preview.plotIndex !== input.plotIndex) throw new Error("灵田加速预览与请求不匹配");
		const raw = data.preview;
		return Object.fromEntries(Object.entries(result.preview).filter(([key]) => raw[key] !== void 0 && raw[key] !== null));
	}, (input) => ({
		mode: "preview",
		plotIndex: String(input.plotIndex),
		accelerator: null,
		count: null
	})),
	get_cave_plant_options: query("查询本人灵田可播种灵种、库存、成熟时长及空闲地块；plotIndex 可选，不执行播种。", object({
		options,
		overview: caveSchema
	}), async ({ bid, uid, request }, input) => parseBackendCavePlantQuery(await requestBackend(bid, "get_players_id_cave_plant_query", {
		path: { id: uid },
		query: { plotIndex: input.plotIndex ?? 0 },
		...request
	})), object({ plotIndex }, ["plotIndex"])),
	cultivate_cave_plot: mutation("开垦指定灵田地块，消耗材料、资格由服务端校验。返回实际操作说明与最新快照；snapshotError 表示操作后快照读取失败，不能自动重做。", "cave.cultivate", object({ plotIndex }), commandResult, (input) => `/开垦 ${input.plotIndex}`, parseBackendCaveCommand, plotArgs),
	plant_cave_seed: mutation("在指定地块播种所选灵种，消耗库存；灵种名称取 get_cave_plant_options。成熟周期、产出和状态由服务端决定。", "cave.plant", object({
		plotIndex,
		seedName: {
			type: "string",
			minLength: 1
		}
	}), commandResult, (input) => `/播种 ${input.plotIndex} ${input.seedName}`, (data) => {
		const result = parseRobotCavePlant(data);
		if (result.mode !== "plant") throw new Error("播种未返回操作回执");
		return result.result;
	}, (input) => ({
		...plotArgs(input),
		seedName: input.seedName
	})),
	water_cave_plots: care("cave.water", "浇灌", "浇灌本人灵田；指定 plotIndex 操作一块，省略时按服务端批量规则处理全部地块。"),
	remove_cave_worms: care("cave.worm", "除虫", "对本人灵田除虫；指定 plotIndex 操作一块，省略时批量处理。"),
	remove_cave_weeds: care("cave.weed", "除草", "对本人灵田除草；指定 plotIndex 操作一块，省略时批量处理。"),
	harvest_cave_plots: care("cave.harvest", "收割", "收割本人已成熟灵田；指定 plotIndex 操作一块，省略时批量处理。以服务端实际收获回执为准。"),
	tend_companion_cave_plots: mutation("一键照料道侣灵田；harvest=true 时代收成熟作物，收获归道侣所有。各步骤可能部分失败，应检查 message 和实际数量。", "cave.companion-tend-all", object({ harvest: boolean }, ["harvest"]), tendResult, (input) => `/一键照料道侣灵田${input.harvest ? " 代收割" : ""}`, parseTendResult, (input) => ({ harvest: input.harvest ?? false })),
	tend_cave_plots: mutation("一键打理本人灵田，依次照料并收割；可能部分完成，必须检查 message 中各步骤结果，不能将整个调用成功视为每项成功。", "cave.tend-all", object({}), tendResult, () => "/一键打理灵田", parseTendResult, () => ({ harvest: false }))
};

//#endregion
export { caveActions };