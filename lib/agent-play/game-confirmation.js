import { guidanceSession } from "./guidance-session.js";
import { Expose, getCurrentEvent } from "alemonjs";
import { randomBytes } from "node:crypto";

//#region src/agent-play/game-confirmation.ts
const targets = {
	get_peiyuan_confirmation: {
		cancelRequiresDecision: true,
		decisionNotice: "原随机结果已消耗物品；有效期为生成后的60秒，放弃不会返还已消耗的物品。",
		action: "confirm_peiyuan_pill",
		title: "保留培元结果",
		cancelAction: "cancel_peiyuan_pill",
		cancelTitle: "放弃培元结果",
		kind: "p",
		field: "reference"
	},
	preview_treasure_exploration: {
		action: "confirm_treasure_action",
		title: "确认宝物探索",
		kind: "b",
		inputField: "confirmationRef",
		field: "confirmationRef"
	},
	preview_treasure_synthesis: {
		action: "confirm_treasure_action",
		title: "确认合成宝物",
		kind: "b",
		inputField: "confirmationRef",
		field: "confirmationRef"
	},
	preview_treasure_upgrade: {
		action: "confirm_treasure_action",
		title: "确认升级宝物",
		kind: "b",
		inputField: "confirmationRef",
		field: "confirmationRef"
	},
	preview_treasure_promotion: {
		action: "confirm_treasure_action",
		title: "确认宝物升品",
		kind: "b",
		inputField: "confirmationRef",
		field: "confirmationRef"
	},
	preview_treasure_batch_upgrade: {
		action: "confirm_treasure_action",
		title: "确认批量升级宝物",
		kind: "b",
		inputField: "confirmationRef",
		field: "confirmationRef"
	},
	preview_treasure_batch_promotion: {
		action: "confirm_treasure_action",
		title: "确认批量升品宝物",
		kind: "b",
		inputField: "confirmationRef",
		field: "confirmationRef"
	},
	preview_treasure_decomposition: {
		action: "confirm_treasure_action",
		title: "确认分解宝物",
		kind: "b",
		inputField: "confirmationRef",
		field: "confirmationRef"
	},
	preview_mythic_treasure_selection: {
		action: "confirm_treasure_action",
		title: "确认神话自选",
		kind: "b",
		inputField: "confirmationRef",
		field: "confirmationRef"
	},
	preview_maxed_treasure_decomposition: {
		action: "confirm_treasure_action",
		title: "确认满品宝物分解",
		kind: "b",
		inputField: "confirmationRef",
		field: "confirmationRef"
	},
	preview_spirit_vein_claim: {
		action: "confirm_treasure_action",
		title: "确认领取灵脉收益",
		kind: "b",
		inputField: "confirmationRef",
		field: "confirmationRef"
	},
	preview_treasure_free_daily_pack: {
		action: "confirm_treasure_free_daily_pack",
		title: "确认领取免费礼包",
		kind: "b",
		inputField: "confirmationRef",
		field: "confirmationRef"
	},
	preview_soul_path_choose: {
		retryPolicy: "lookup",
		action: "confirm_soul_path",
		title: "确认选择道途",
		kind: "chooseUuid",
		inputField: "token",
		field: "confirmationToken"
	},
	preview_soul_path_switch: {
		retryPolicy: "lookup",
		action: "confirm_soul_path",
		title: "确认切换道途",
		kind: "uuid",
		inputField: "token",
		field: "confirmationToken"
	},
	preview_soul_path_advance: {
		retryPolicy: "lookup",
		action: "confirm_soul_path",
		title: "确认道途突破",
		kind: "uuid",
		inputField: "token",
		field: "confirmationToken"
	},
	preview_soul_path_reroll: {
		retryPolicy: "lookup",
		action: "confirm_soul_path",
		title: "确认神魂重选",
		kind: "uuid",
		inputField: "token",
		field: "confirmationToken"
	},
	prepare_skill_learn: {
		optionalBind: ["taskInput"],
		action: "confirm_skill_learn",
		title: "确认学习替换",
		bind: ["bookId"],
		kind: "l",
		field: "reference"
	},
	prepare_skill_switch: {
		action: "confirm_skill_switch",
		title: "确认切换功法",
		bind: ["bookId", "skillType"],
		kind: "k",
		field: "reference"
	},
	preview_cave_formation_activation: {
		action: "activate_cave_formation",
		title: "确认激活阵盘",
		bind: ["keyword"],
		kind: "g",
		field: "reference"
	},
	prepare_skill_reroll: {
		cancelRequiresDecision: true,
		decisionNotice: "原随机结果已消耗物品；有效期为生成后的60秒，放弃不会返还已消耗的物品。",
		action: "confirm_skill_reroll",
		title: "保留换词结果",
		cancelAction: "cancel_skill_reroll",
		cancelTitle: "放弃换词结果",
		kind: "x",
		field: "reference"
	},
	prepare_soul_artifact_wash: {
		cancelRequiresDecision: true,
		decisionNotice: "原随机结果已消耗物品；有效期为生成后的60秒，放弃不会返还已消耗的物品。",
		action: "confirm_soul_artifact_wash",
		title: "保留洗涤结果",
		cancelAction: "cancel_soul_artifact_wash",
		cancelTitle: "放弃洗涤结果",
		kind: "y",
		field: "reference"
	},
	preview_shop_purchase: {
		action: "confirm_shop_purchase",
		title: "确认购买",
		kind: "s",
		field: "reference"
	},
	prepare_market_purchase: {
		action: "confirm_market_purchase",
		title: "确认选购",
		kind: "m",
		field: "reference"
	},
	prepare_skill_batch_decomposition: {
		action: "confirm_skill_batch_decomposition",
		title: "确认分解功法",
		kind: "e",
		field: "reference"
	},
	prepare_equipment_batch_decomposition: {
		action: "confirm_equipment_batch_decomposition",
		title: "确认分解装备",
		kind: "d",
		field: "reference"
	},
	prepare_soul_artifact_replacement: {
		action: "confirm_soul_artifact_replacement",
		title: "确认替换本命物",
		kind: "v",
		field: "reference"
	},
	prepare_soul_artifact_separation: {
		action: "confirm_soul_artifact_separation",
		title: "确认分离本命物",
		kind: "u",
		field: "reference"
	},
	preview_spirit_root_feed: {
		action: "confirm_spirit_root_feed",
		title: "确认喂养灵根",
		kind: "r",
		field: "reference"
	},
	prepare_skill_reset: {
		action: "confirm_skill_reset",
		title: "确认重修功法",
		kind: "w",
		field: "reference"
	},
	prepare_companion_oath_upgrade: {
		action: "confirm_companion_oath_upgrade",
		title: "确认升级誓约",
		kind: "o",
		field: "reference"
	},
	prepare_guild_leadership_transfer: {
		action: "confirm_guild_leadership_transfer",
		title: "确认转让宗主",
		kind: "z",
		field: "reference"
	},
	prepare_cave_acceleration: {
		action: "confirm_cave_acceleration",
		title: "确认灵田加速",
		kind: "c",
		field: "reference"
	},
	preview_alchemy: {
		action: "confirm_alchemy",
		title: "确认炼制",
		kind: "a",
		field: "confirmations"
	},
	execute_task_preview_alchemy: {
		action: "confirm_alchemy",
		title: "确认炼制",
		kind: "a",
		field: "confirmations"
	},
	preview_forge_order: {
		action: "create_forge_order",
		title: "确认锻造委托",
		kind: "f",
		field: "token"
	},
	preview_forge: {
		action: "confirm_forge",
		title: "确认打造",
		kind: "f",
		field: "token"
	},
	preview_tribulation: {
		action: "confirm_tribulation",
		title: "确认开劫",
		kind: "t",
		field: "confirmationReference"
	},
	preview_heart_demon: {
		action: "confirm_heart_demon",
		title: "确认心魔回答",
		kind: "h",
		field: "confirmationReference"
	},
	preview_forge_tutorial: {
		action: "confirm_forge",
		title: "确认打造",
		kind: "f",
		field: "token"
	}
};
/** Validate provider declarations before using them for any write gate. */
function readConfirmationTargets(value, actions) {
	if (!Array.isArray(value) || value.length > 128) throw new Error("Invalid confirmation declarations");
	const parsed = {};
	const label = (value) => typeof value === "string" && [...value].length > 0 && [...value].length <= 17 && !/[\n\r/[\]]/u.test(value);
	const key = (value) => typeof value === "string" && /^[a-zA-Z][a-zA-Z0-9_]{0,63}$/u.test(value) && ![
		"constructor",
		"prototype",
		"__proto__"
	].includes(value);
	for (const item of value) {
		if (!item || typeof item !== "object" || !actions.has(item.previewAction) || !actions.has(item.action) || !key(item.previewAction) || Object.hasOwn(parsed, item.previewAction) || !label(item.title) || !/^(?:[a-z]|uuid|chooseUuid)$/u.test(item.kind) || ![
			"token",
			"reference",
			"confirmationReference",
			"confirmationToken",
			"confirmationRef",
			"confirmations"
		].includes(item.field) || item.requiresPreview !== void 0 && typeof item.requiresPreview !== "boolean" || item.retryPolicy !== void 0 && !["original", "lookup"].includes(item.retryPolicy) || item.decisionNotice !== void 0 && (typeof item.decisionNotice !== "string" || item.decisionNotice.length > 1e3) || item.cancelRequiresDecision !== void 0 && (typeof item.cancelRequiresDecision !== "boolean" || item.cancelRequiresDecision && !item.cancelAction) || item.optionalBind !== void 0 && (!Array.isArray(item.optionalBind) || item.optionalBind.length > 16 || !item.optionalBind.every(key)) || item.inputField !== void 0 && !key(item.inputField) || item.bind !== void 0 && (!Array.isArray(item.bind) || item.bind.length > 16 || !item.bind.every(key)) || (item.cancelAction !== void 0 || item.cancelTitle !== void 0) && (!actions.has(item.cancelAction) || !label(item.cancelTitle))) throw new Error("Invalid confirmation declaration");
		parsed[item.previewAction] = {
			...item.requiresPreview === void 0 ? {} : { requiresPreview: item.requiresPreview },
			...item.optionalBind === void 0 ? {} : { optionalBind: [...item.optionalBind] },
			...item.retryPolicy === void 0 ? {} : { retryPolicy: item.retryPolicy },
			...item.cancelRequiresDecision === void 0 ? {} : { cancelRequiresDecision: item.cancelRequiresDecision },
			...item.decisionNotice === void 0 ? {} : { decisionNotice: item.decisionNotice },
			action: item.action,
			title: item.title,
			field: item.field,
			kind: item.kind,
			...item.inputField === void 0 ? {} : { inputField: item.inputField },
			...item.bind === void 0 ? {} : { bind: [...item.bind] },
			...item.cancelAction === void 0 ? {} : {
				cancelAction: item.cancelAction,
				cancelTitle: item.cancelTitle
			}
		};
	}
	return {
		...targets,
		...parsed
	};
}
const preparations = {
	prepare_skill_reroll: {
		title: "消耗换词符生成",
		fields: [{
			name: "bookId",
			type: "positiveInteger"
		}, {
			name: "label",
			type: "singleText"
		}],
		notice: "功法编号：{bookId}；词条：{label}。消耗1个换词符生成随机结果，不保证目标词条。生成后60秒内选择保留或放弃；放弃不返还物品。"
	},
	prepare_soul_artifact_wash: {
		title: "消耗洗涤石生成",
		fields: [],
		notice: "对当前本命物消耗1个洗涤石生成随机结果。生成后60秒内选择保留或放弃；放弃不返还物品。"
	},
	consume_item: {
		followups: [{
			action: "get_peiyuan_confirmation",
			inputField: "snapshot",
			resultPath: ["peiyuanPending", "snapshot"]
		}],
		title: "确认使用道具",
		fields: [
			{
				name: "itemName",
				type: "singleText",
				maxLength: 64,
				nonNumeric: true
			},
			{
				name: "quantity",
				type: "positiveInteger"
			},
			{
				name: "intentId",
				type: "text",
				optional: true
			},
			{
				name: "taskInput",
				type: "text",
				optional: true
			}
		],
		notice: "将尝试消耗{quantity}个{itemName}，效果与实际消耗以服务端回执为准。若产生培元丹待定结果，丹药已消耗，放弃不返还。"
	}
};
function readPreparationTargets(value, writes) {
	if (!Array.isArray(value) || value.length > 128) throw new Error("Invalid preparation declarations");
	const parsed = {};
	const key = (value) => typeof value === "string" && /^[a-zA-Z][a-zA-Z0-9_]{0,63}$/u.test(value) && ![
		"constructor",
		"prototype",
		"__proto__"
	].includes(value);
	for (const item of value) {
		if (!item || !key(item.action) || !writes.has(item.action) || Object.hasOwn(parsed, item.action) || typeof item.title !== "string" || [...item.title].length < 1 || [...item.title].length > 17 || /[\n\r/[\]]/u.test(item.title) || typeof item.notice !== "string" || !item.notice || item.notice.length > 2e3 || !Array.isArray(item.fields) || item.fields.length > 16) throw new Error("Invalid preparation declaration");
		if (item.followups !== void 0 && (!Array.isArray(item.followups) || item.followups.length > 4 || item.followups.some((followup) => !followup || !writes.has(followup.action) || !key(followup.inputField) || !Array.isArray(followup.resultPath) || !followup.resultPath.length || followup.resultPath.length > 4 || !followup.resultPath.every(key)))) throw new Error("Invalid preparation followup");
		const names = /* @__PURE__ */ new Set();
		for (const field of item.fields) {
			if (!field || !key(field.name) || names.has(field.name) || ![
				"positiveInteger",
				"singleText",
				"text"
			].includes(field.type) || field.optional !== void 0 && typeof field.optional !== "boolean" || field.nonNumeric !== void 0 && typeof field.nonNumeric !== "boolean" || field.maxLength !== void 0 && (!Number.isSafeInteger(field.maxLength) || field.maxLength < 1 || field.maxLength > 1e4)) throw new Error("Invalid preparation field");
			names.add(field.name);
		}
		if ([...item.notice.matchAll(/\{([a-zA-Z][a-zA-Z0-9_]*)\}/gu)].some((match) => !names.has(match[1]) || item.fields.find((field) => field.name === match[1])?.optional)) throw new Error("Invalid preparation notice placeholder");
		parsed[item.action] = {
			...item.followups === void 0 ? {} : { followups: item.followups.map((followup) => ({
				...followup,
				resultPath: [...followup.resultPath]
			})) },
			title: item.title,
			notice: item.notice,
			fields: item.fields.map((field) => ({ ...field }))
		};
	}
	return {
		...preparations,
		...parsed
	};
}
const isPaidPreparation = (action, definitions = preparations) => Object.hasOwn(definitions, action);
function permitsPreparationFollowup(originalAction, action, input, result, definitions = preparations) {
	if (!input || typeof input !== "object" || Array.isArray(input)) return false;
	const row = result;
	if (!row?.ok || !row.data?.success || row.data.branch !== "business") return false;
	return (definitions[originalAction]?.followups ?? []).some((followup) => {
		if (followup.action !== action || Object.keys(input).length !== 1 || !Object.hasOwn(input, followup.inputField)) return false;
		let value = row.data?.result;
		for (const field of followup.resultPath) {
			if (!value || typeof value !== "object" || !Object.hasOwn(value, field)) return false;
			value = value[field];
		}
		return (typeof value === "string" || typeof value === "number" && Number.isFinite(value)) && input[followup.inputField] === value;
	});
}
const choiceTitles = /* @__PURE__ */ new Set([
	...Object.values(targets).flatMap((item) => [item.title, ...item.cancelTitle ? [item.cancelTitle] : []]),
	"消耗换词符生成",
	"消耗洗涤石生成",
	"确认使用道具"
]);
async function isGameConfirmationChoice(text) {
	const match = /^(.{1,17})·[a-f0-9]{6}$/u.exec(text.trim());
	if (!match) return false;
	if (choiceTitles.has(match[1])) return true;
	const client = Expose.create();
	const provider = client.list().find((item) => item.protocol === "xiuxian.player.v1" && item.name === "xiuxian-game");
	if (provider?.actions.get_conversation_contract?.effect !== "read") return false;
	try {
		const result = await client.call("xiuxian.player.v1", "xiuxian-game", "get_conversation_contract", {}, { timeoutMs: 1e3 });
		const data = result.ok ? result.data : void 0;
		if (data?.protocol !== "plugin-conversation.v1" || data.provider !== "xiuxian-game") return false;
		const actions = new Set(Object.keys(provider.actions));
		const writes = new Set(Object.entries(provider.actions).filter(([, action]) => action.effect === "write").map(([name]) => name));
		const confirmations = readConfirmationTargets(data.confirmations ?? [], actions);
		const preparations = readPreparationTargets(data.preparations ?? [], writes);
		return Object.values(confirmations).some((item) => item.title === match[1] || item.cancelTitle === match[1]) || Object.values(preparations).some((item) => item.title === match[1]);
	} catch {
		return false;
	}
}
/** Local consent to one generation attempt, never a server quote or retry receipt. */
function preparationGate(action, input, definitions = preparations) {
	const target = definitions[action];
	if (!target) return;
	const session = guidanceSession();
	const event = getCurrentEvent();
	if (!session || !event?.MessageId) return "无法建立本次玩家选择，尚未生成随机结果。";
	if (!input || typeof input !== "object" || Array.isArray(input) || Object.keys(input).some((key) => !target.fields.some((field) => field.name === key))) return "参数不完整或含有额外参数，尚未提交操作。";
	const bound = {};
	for (const field of target.fields) {
		const value = input[field.name];
		if (value === void 0 && field.optional) continue;
		if (field.type === "positiveInteger" ? !Number.isSafeInteger(value) || Number(value) < 1 : typeof value !== "string" || field.type === "singleText" && (!value || /\s/u.test(value)) || field.maxLength !== void 0 && value.length > field.maxLength || field.nonNumeric && /^\d+$/u.test(value)) return "参数不符合插件声明，请先核对原对象和数量，尚未提交操作。";
		bound[field.name] = value;
	}
	const selected = session.offers?.find((offer) => offer.label === event.MessageText?.trim());
	if (selected) {
		if (selected.action !== action || JSON.stringify(selected.arguments) !== JSON.stringify(bound)) return "生成操作与玩家选择的原对象或词条不一致，尚未提交。";
		if (!selected.shown || selected.messageId === event.MessageId) return "请先投递消耗说明，等待玩家下一条消息选择。";
		if (selected.submitted) return "这次生成已经尝试提交，请先核对当前结果；不能用同一选项再次扣除物品。";
		selected.submitted = true;
		return;
	}
	session.offers ??= [];
	if (!session.offers.some((offer) => offer.action === action && offer.messageId === event.MessageId && JSON.stringify(offer.arguments) === JSON.stringify(bound))) {
		const suffix = randomBytes(3).toString("hex");
		const notice = target.notice.replace(/\{([a-zA-Z][a-zA-Z0-9_]*)\}/gu, (_match, key) => String(bound[key]));
		session.offers.push({
			action,
			arguments: bound,
			reference: `consent:${suffix}`,
			label: `${target.title}·${suffix}`,
			notice,
			messageId: event.MessageId,
			shown: false,
			submitted: false
		});
		session.offers = session.offers.slice(-8);
	}
	return "尚未生成或消耗物品。请展示程序生成的消耗说明和选项，等待玩家选择后再按原参数调用；不要把本次拒绝当作已经操作成功。";
}
function providerPreview(result, target) {
	const row = result;
	const facts = row?.data?.conversationPreview;
	const raw = target && row?.data?.result?.[target.field];
	const references = target?.field === "confirmations" && Array.isArray(raw) ? raw.map((item) => item?.reference) : [raw];
	if (!facts || typeof facts.reference !== "string" || !references.includes(facts.reference) || typeof facts.text !== "string" || !facts.text.trim() || facts.text.length > 16e3) return;
	return {
		reference: facts.reference,
		text: facts.text
	};
}
function rememberConfirmation(action, result, input = {}, definitions = targets) {
	const session = guidanceSession();
	const event = getCurrentEvent();
	const target = definitions[action];
	const row = result;
	if (!target || !session || !event?.MessageId || !row?.ok || !row.data?.success || row.data.branch !== "business") return;
	if ((target.requiresPreview || row.data.conversationPreview !== void 0) && !providerPreview(result, target)) return;
	const data = row.data.result;
	const refs = target.field === "confirmations" ? (data?.confirmations ?? []).map((item) => item.reference) : [data?.[target.field]];
	const bound = {};
	for (const key of target.bind ?? []) {
		const value = input[key];
		if (typeof value !== "string" && (typeof value !== "number" || !Number.isSafeInteger(value))) return;
		bound[key] = value;
	}
	for (const key of target.optionalBind ?? []) {
		if (input[key] === void 0) continue;
		if (typeof input[key] !== "string" && (typeof input[key] !== "number" || !Number.isSafeInteger(input[key]))) return;
		bound[key] = input[key];
	}
	session.offers ??= [];
	for (const reference of refs) {
		const pattern = target.kind === "uuid" || target.kind === "chooseUuid" ? `^${target.kind === "chooseUuid" ? "choose:" : ""}[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$` : `^r1_[a-z0-9]+_${target.kind}_[a-z0-9]+_[a-f0-9]{24}$`;
		if (typeof reference !== "string" || !new RegExp(pattern, "u").test(reference)) continue;
		for (const [decision, title] of [[target.action, target.title], ...target.cancelAction ? [[target.cancelAction, target.cancelTitle]] : []]) {
			if (typeof decision !== "string" || typeof title !== "string") continue;
			if (session.offers.some((item) => item.action === decision && item.reference === reference)) continue;
			session.offers.push({
				optionalBind: target.optionalBind,
				retryPolicy: target.retryPolicy,
				decisionNotice: target.decisionNotice,
				businessCancellation: Boolean(target.cancelRequiresDecision && decision === target.cancelAction),
				arguments: bound,
				action: decision,
				reference,
				label: `${title}·${randomBytes(3).toString("hex")}`,
				messageId: event.MessageId,
				shown: false,
				submitted: false
			});
		}
	}
	session.offers = session.offers.slice(-8);
}
const isGuardedConfirmation = (action, definitions = targets) => {
	return Object.values(definitions).some((item) => item.action === action || item.cancelAction === action);
};
function confirmationReference(action, input, definitions = targets) {
	const target = Object.values(definitions).find((item) => item.action === action || item.cancelAction === action);
	return input?.[target?.inputField ?? "reference"];
}
function confirmationGate(action, input, definitions = targets) {
	if (!isGuardedConfirmation(action, definitions)) return;
	const session = guidanceSession();
	const event = getCurrentEvent();
	const reference = confirmationReference(action, input, definitions);
	const offer = session?.offers?.find((item) => item.action === action && item.reference === reference && item.label === event?.MessageText?.trim());
	if (!offer || !offer.shown || offer.messageId === event?.MessageId) return "请先展示原预览并等待玩家发送对应的完整确认选项。不能用泛指的“确认”、旧聊天或新预览替代该选项；没有提交操作。";
	if (offer.optionalBind?.some((key) => !Object.hasOwn(offer.arguments ?? {}, key) && input?.[key] !== void 0)) return "原预览未包含该可选参数，不能在确认时追加操作。";
	if (Object.entries(offer.arguments ?? {}).some(([key, value]) => input?.[key] !== value)) return "确认参数与原预览选择不一致，尚未提交。请沿用原对象、类型和选项，不能更换目标后确认。";
	if (session?.offers?.some((item) => item.reference === reference && item.action !== action && item.submitted)) return "这份原结果已经提交了另一种决定；请先核对原结果，不能改选或重新生成随机结果后提交。";
	if (offer.retryPolicy === "lookup" && offer.submitted) return "这份确认已提交过，插件要求先核对当前状态与原结果，不要跨消息重复提交旧凭证。";
	offer.submitted = true;
}
function confirmationOptions() {
	const offers = (guidanceSession()?.offers ?? []).filter((offer) => !offer.submitted && offer.messageId === getCurrentEvent()?.MessageId);
	return [...new Set(offers.map((offer) => offer.decisionNotice).filter(Boolean))].map((text) => text + "\n").join("") + offers.map((offer) => `${offer.notice ? offer.notice + "\n" : ""}[[${offer.label}]]`).join(" ");
}
/** Called only after the platform acknowledged the actual formatted message. */
function acknowledgeConfirmationOptions(text) {
	const rendered = [...text.matchAll(/\[\[([^\]\n[]{1,24})\]\]/gu)].map((match) => match[1].trim()).filter((label) => label && !/^[/#!！＃]/u.test(label)).slice(0, 100);
	for (const offer of guidanceSession()?.offers ?? []) if (rendered.includes(offer.label)) offer.shown = true;
}
/** Display-only facts from the validated provider quote; never calculate a new price. */
function confirmationPreviewText(action, result, definitions = targets) {
	const row = result;
	if (!row?.ok || !row.data?.success || row.data.branch !== "business") return "";
	return providerPreview(result, definitions[action])?.text ?? "";
}
function pendingBusinessCancellations() {
	return (guidanceSession()?.offers ?? []).filter((item) => item.businessCancellation && !item.submitted && !guidanceSession()?.offers?.some((other) => other.reference === item.reference && other.submitted)).map((item) => item.label);
}
function pendingBusinessCancellationNotice() {
	const labels = pendingBusinessCancellations();
	return [...new Set((guidanceSession()?.offers ?? []).filter((offer) => labels.includes(offer.label)).map((offer) => offer.decisionNotice).filter(Boolean))].join("\n");
}
function recordConfirmationOutcome(action, reference, result) {
	const row = result;
	if (row?.ok === false && row.error?.outcome === "not_started") {
		const offer = guidanceSession()?.offers?.find((item) => item.action === action && item.reference === reference);
		if (offer) offer.submitted = false;
	}
}

//#endregion
export { acknowledgeConfirmationOptions, confirmationGate, confirmationOptions, confirmationPreviewText, confirmationReference, isGameConfirmationChoice, isGuardedConfirmation, isPaidPreparation, pendingBusinessCancellationNotice, pendingBusinessCancellations, permitsPreparationFollowup, preparationGate, readConfirmationTargets, readPreparationTargets, recordConfirmationOutcome, rememberConfirmation };