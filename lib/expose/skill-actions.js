import { boolean, fields, integer, list, number, object, text } from "./schema.js";
import { intentIdSchema, mutation, observation, taskInputSchema, validateIntentId } from "./mutation.js";
import { confirmationReferenceSchema, validateConfirmationReference } from "./confirmation.js";
import { parseRobotSkillBookBatchLearn } from "../api/bot/skill-book-batch-learn.js";
import { parseRobotSkillBookLearn } from "../api/bot/skill-book-learn.js";
import { parseSkillBookSwitchOptions } from "../api/bot/skill-book-switch-options.js";
import { parseSkillBookSwitchResponse } from "../api/bot/skill-book-switch.js";
import { parseSkillBookRerollConfirm, parseSkillBookRerollPreview, parseSkillBookResetConfirm, parseSkillBookResetPreview } from "../api/bot/skill-book-reset-reroll.js";
import { ExposeError } from "alemonjs";

//#region src/expose/skill-actions.ts
const skillType = {
	type: "string",
	enum: [
		"战技",
		"被动技",
		"神通"
	]
};
const bookId = {
	type: "integer",
	minimum: 1,
	maximum: Number.MAX_SAFE_INTEGER
};
const resetRefund = object({
	...fields(integer, "exp spiritStone upgradeCount"),
	affectedAttrs: list(text),
	items: list(object({
		name: text,
		...fields(integer, "quantity expValue")
	}))
}, ["items"]);
const resetBook = object({
	id: integer,
	name: text,
	skillType: text
});
const rerollPending = object({
	userSkillBookId: integer,
	...fields(text, "sourceLabel targetLabel skillBookName gradeName realmName targetPool sourceCurrentText sourceMaxText targetCurrentText targetMaxText"),
	targetWasActive: boolean
});
const rerollBook = object({
	id: integer,
	...fields(text, "name grade realm")
});
function rerollDecision(mode) {
	return mutation(mode === "confirm" ? "保留原换词随机结果；原功法状态变化时拒绝，相同引用重试返回原回执。" : "放弃原换词随机结果，已消耗的换词符不返还。", "skill-books.reroll-decide-reference", object({ reference: confirmationReferenceSchema }), object({
		mode: text,
		pending: rerollPending
	}), () => mode === "confirm" ? "/确认换词" : "/取消换词", (data) => {
		if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("换词结果不完整");
		const row = data;
		if (row.mode !== mode) throw new Error("换词决定不匹配");
		return {
			mode,
			pending: parseSkillBookRerollConfirm(row.pending).pending
		};
	}, (input) => ({
		reference: input.reference,
		mode
	}), (input) => validateConfirmationReference(input.reference, "x"));
}
const book = object({
	id: integer,
	name: text,
	skillType
});
const learned = object({
	id: integer,
	...fields(text, "name grade realm"),
	...fields(integer, "gradeLevel proficiency"),
	skillType
});
const refund = object({
	...fields(integer, "totalExp baseExp upgradeExp upgradeCount transferredProficiency"),
	items: list(object({
		...fields(integer, "itemId quantity expValue"),
		name: text
	}))
});
const maximum = object(fields(number, "physicalAttack magicAttack physicalDefense magicDefense hp physicalAttackPercent magicAttackPercent physicalDefensePercent magicDefensePercent hpPercent speed critRate critDamage"));
const options = list(object({
	id: integer,
	name: text,
	skillType,
	status: {
		type: "integer",
		minimum: 2,
		maximum: 3
	},
	...fields(boolean, "isInUse canSwitch")
}));
const switchResult = object({
	outcome: {
		type: "string",
		enum: ["switched", "confirmation_required"]
	},
	skillBook: book,
	oldSkillBook: book,
	targetMaximum: maximum,
	oldMaximum: maximum,
	comparisonLines: list(text),
	confirmationMessage: text
}, [
	"oldSkillBook",
	"targetMaximum",
	"oldMaximum",
	"comparisonLines",
	"confirmationMessage"
]);
function switchData(data, type, expectedId) {
	const row = data;
	if (row?.skillType !== type || row.code !== "SHOW_LIST" && row.code !== "OK") throw new Error("功法切换响应不完整");
	if (row.code === "SHOW_LIST") return {
		code: row.code,
		skillType: type,
		options: parseSkillBookSwitchOptions(row.options, type)
	};
	const result = parseSkillBookSwitchResponse(row.result);
	if (expectedId === void 0 || result.skillBook.id !== expectedId || result.skillBook.skillType !== type) throw new Error("功法切换结果与请求不匹配");
	return {
		code: row.code,
		skillType: type,
		result
	};
}
const skillActions = {
	prepare_skill_reroll: mutation("立即消耗 1 个换词符生成随机换词预览；不保证目标词条，取消也不退还。60 秒内确认或取消。", "skill-books.reroll-prepare-reference", object({
		bookId,
		label: {
			type: "string",
			minLength: 1
		}
	}), object({
		reference: confirmationReferenceSchema,
		expiresAt: integer,
		ownedCount: integer,
		skillBook: rerollBook,
		pending: rerollPending
	}), (input) => `/换词 ${input.bookId} ${input.label}`, (data, input) => {
		if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("换词预览不完整");
		const row = data;
		const result = parseSkillBookRerollPreview(row.result);
		if (result.mode !== "preview" || result.skillBook.id !== input.bookId || result.pending.userSkillBookId !== input.bookId || !Number.isSafeInteger(result.ownedCount) || result.ownedCount < 0 || !Number.isSafeInteger(row.expiresAt) || typeof row.reference !== "string") throw new Error("换词预览不匹配");
		validateConfirmationReference(row.reference, "x");
		return {
			reference: row.reference,
			expiresAt: row.expiresAt,
			ownedCount: result.ownedCount,
			skillBook: result.skillBook,
			pending: result.pending
		};
	}, (input) => ({
		bookId: input.bookId,
		label: input.label
	}), (input) => {
		if (!/^\S+$/.test(input.label)) throw new ExposeError("INVALID_INPUT", "换词属性必须是单个标签");
	}),
	confirm_skill_reroll: rerollDecision("confirm"),
	cancel_skill_reroll: rerollDecision("cancel"),
	get_skill_reroll_options: observation("查询指定已学功法可换词条和换词符库存，不消耗换词符、不生成随机结果。", "skill-books.reroll", object({ bookId }), object({
		bookId: integer,
		ownedCount: integer,
		skillBook: object({
			id: integer,
			...fields(text, "name grade realm")
		}),
		availableAttrs: list(object({ ...fields(text, "label currentText maxText") }))
	}), (input) => `/换词 ${input.bookId}`, (data, input) => {
		if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("换词候选不完整");
		const row = data;
		const result = parseSkillBookRerollPreview(row.result);
		if (row.mode !== "preview" || row.bookId !== input.bookId || result.mode !== "list" || result.skillBook.id !== input.bookId || !Number.isSafeInteger(result.ownedCount) || result.ownedCount < 0) throw new Error("换词候选不匹配");
		return {
			bookId: input.bookId,
			ownedCount: result.ownedCount,
			skillBook: result.skillBook,
			availableAttrs: result.availableAttrs
		};
	}, (input) => ({
		mode: "preview",
		bookId: String(input.bookId),
		attrLabel: null
	})),
	prepare_skill_reset: observation("预览指定已学功法的重制、受影响词条和返还，确认引用有效 60 秒。", "skill-books.reset-preview-reference", object({ bookId }), object({
		reference: confirmationReferenceSchema,
		expiresAt: integer,
		skillBook: resetBook,
		refundInfo: resetRefund
	}), (input) => `/重制功法 ${input.bookId}`, (data, input) => {
		if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("重制预览不完整");
		const row = data;
		const result = parseSkillBookResetPreview({ pending: row.pending });
		if (result.skillBook.id !== input.bookId || typeof row.reference !== "string" || !Number.isSafeInteger(row.expiresAt)) throw new Error("重制预览不匹配");
		validateConfirmationReference(row.reference, "w");
		return {
			skillBook: result.skillBook,
			refundInfo: result.refundInfo,
			reference: row.reference,
			expiresAt: row.expiresAt
		};
	}, (input) => ({ bookId: input.bookId })),
	confirm_skill_reset: mutation("确认原功法重制预览；功法或返还规则变化时拒绝，相同引用重试返回原回执。", "skill-books.reset-confirm-reference", object({ reference: confirmationReferenceSchema }), object({
		skillBook: resetBook,
		refundInfo: resetRefund,
		message: text
	}), () => "/确认重制功法", (data) => {
		const result = parseSkillBookResetConfirm(data);
		return {
			skillBook: result.skillBook,
			refundInfo: result.refundInfo,
			message: result.message
		};
	}, (input) => ({ reference: input.reference }), (input) => validateConfirmationReference(input.reference, "w")),
	learn_current_skill_batch: mutation("立即批量学习执行时当前符合条件的功法；服务端会重新筛选，候选可能与此前预览不同。跳过同技能冲突，逐项检查结果。此操作不确认或绑定先前预览。", "skill-books.batch-learn", object({
		intentId: intentIdSchema,
		taskInput: taskInputSchema
	}, ["intentId", "taskInput"]), object({
		mode: text,
		selection: object({
			candidates: list(object({
				...fields(integer, "userSkillBookId skillId gradeLevel"),
				...fields(text, "name skillType")
			})),
			skippedConflicts: list(object({ ...fields(text, "name skillType reason") }))
		}),
		results: list(object({
			userSkillBookId: integer,
			success: boolean,
			message: text,
			skillBook: object({
				name: text,
				skillType: text
			})
		}, ["skillBook"]))
	}), () => "/一键学习功法 确认", (data) => {
		const result = parseRobotSkillBookBatchLearn(data);
		if (result.mode !== "execute" || result.results.length !== result.selection.candidates.length || result.results.some((row, index) => row.userSkillBookId !== result.selection.candidates[index].userSkillBookId || row.success && !row.skillBook)) throw new Error("一键学习功法结果不完整");
		return result;
	}, () => ({ mode: "execute" }), (input) => validateIntentId(input.intentId), {
		intentId: (input) => input.intentId,
		taskInput: (input) => input.taskInput
	}),
	preview_batch_skill_learning: observation("查询当前可一键学习的功法实例及冲突跳过项，不学习；该预览不锁定候选清单。", "skill-books.batch-learn", object({}), object({
		mode: text,
		selection: object({
			candidates: list(object({
				...fields(integer, "userSkillBookId skillId gradeLevel"),
				...fields(text, "name skillType")
			})),
			skippedConflicts: list(object({ ...fields(text, "name skillType reason") }))
		}),
		results: list(object({
			userSkillBookId: integer,
			success: boolean,
			message: text,
			skillBook: object({
				name: text,
				skillType: text
			})
		}, ["skillBook"]))
	}), () => "/一键学习功法", (data) => {
		const result = parseRobotSkillBookBatchLearn(data);
		if (result.mode !== "preview" || result.results.length !== 0) throw new Error("一键学习预览回执不匹配");
		return result;
	}, () => ({ mode: "preview" })),
	prepare_skill_learn: mutation("学习本人背包功法；若需替换同技能功法，返回原比较、预计返还与 reference，尚未学习。不存在旧功法时会按服务端规则直接学习。", "skill-books.learn", object({
		bookId,
		intentId: intentIdSchema,
		taskInput: taskInputSchema
	}, ["intentId", "taskInput"]), object({
		outcome: {
			type: "string",
			enum: ["learned", "confirmation_required"]
		},
		skillBook: learned,
		oldSkillBook: learned,
		targetMaximum: maximum,
		oldMaximum: maximum,
		refundInfo: refund,
		previewRefund: refund,
		reference: confirmationReferenceSchema
	}, [
		"oldSkillBook",
		"targetMaximum",
		"oldMaximum",
		"refundInfo",
		"previewRefund",
		"reference"
	]), (input) => `/学习功法 ${input.bookId}`, (data, input) => {
		const result = parseRobotSkillBookLearn(data);
		if (result.skillBook?.id !== input.bookId) throw new Error("学习功法结果与请求不匹配");
		if (result.outcome === "confirmation_required") {
			const row = data;
			if (typeof row.reference !== "string" || !row.previewRefund || typeof row.previewRefund !== "object") throw new Error("功法学习预览不完整");
			validateConfirmationReference(row.reference, "l");
			return {
				...result,
				reference: row.reference,
				previewRefund: row.previewRefund
			};
		}
		return result;
	}, (input) => ({
		bookId: String(input.bookId),
		confirm: null,
		exposePreview: true
	}), (input) => validateIntentId(input.intentId), {
		intentId: (input) => input.intentId,
		taskInput: (input) => input.taskInput
	}),
	confirm_skill_learn: mutation("用户明确确认原预览后，确认功法学习替换；服务端核对原功法、熟练度及返还依据，并在同一事务中返还、替换与记录回执。引用跨消息重试返回原结果；状态变化时拒绝。", "skill-books.learn", object({
		bookId,
		reference: confirmationReferenceSchema,
		taskInput: taskInputSchema
	}, ["taskInput"]), object({
		outcome: {
			type: "string",
			enum: ["learned"]
		},
		skillBook: learned,
		oldSkillBook: learned,
		refundInfo: refund
	}), (input) => `/学习功法 ${input.bookId} 确认`, (data, input) => {
		const result = parseRobotSkillBookLearn(data);
		if (result.outcome !== "learned" || result.skillBook?.id !== input.bookId || !result.oldSkillBook || !result.refundInfo) throw new Error("功法学习确认回执不完整");
		return result;
	}, (input) => ({
		bookId: String(input.bookId),
		confirm: "确认",
		reference: input.reference
	}), (input) => validateConfirmationReference(input.reference, "l"), { taskInput: (input) => input.taskInput }),
	learn_skill_book: mutation("学习背包中的功法实例，不强制替换已学同类功法。outcome=confirmation_required 表示仅返回替换比较，尚未完成学习；保留原功法与返还规则。", "skill-books.learn", object({
		bookId,
		intentId: intentIdSchema,
		taskInput: taskInputSchema
	}, ["intentId", "taskInput"]), object({
		outcome: {
			type: "string",
			enum: ["learned", "confirmation_required"]
		},
		skillBook: learned,
		oldSkillBook: learned,
		targetMaximum: maximum,
		oldMaximum: maximum,
		refundInfo: object({
			...fields(integer, "totalExp baseExp upgradeExp upgradeCount transferredProficiency"),
			items: list(object({
				...fields(integer, "itemId quantity expValue"),
				name: text
			}))
		})
	}, [
		"oldSkillBook",
		"targetMaximum",
		"oldMaximum",
		"refundInfo"
	]), (input) => `/学习功法 ${input.bookId}`, (data, input) => {
		const result = parseRobotSkillBookLearn(data);
		if (result.skillBook?.id !== input.bookId) throw new Error("学习功法结果与请求不匹配");
		return result;
	}, (input) => ({
		bookId: String(input.bookId),
		confirm: null
	}), (input) => validateIntentId(input.intentId), {
		intentId: (input) => input.intentId,
		taskInput: (input) => input.taskInput
	}),
	get_skill_switch_options: observation("查询指定战技、被动技或神通可切换列表，不执行切换；保留实例编号、使用状态和服务端资格。", "skill-books.switch", object({ skillType }), object({
		code: {
			type: "string",
			enum: ["SHOW_LIST"]
		},
		skillType,
		options
	}), (input) => `/切换${input.skillType}`, (data, input) => switchData(data, input.skillType), (input) => ({
		skillType: input.skillType,
		bookId: null,
		confirm: null
	})),
	switch_skill_book: mutation("切换本人已学功法；SHOW_LIST 或 confirmation_required 不代表切换成功。同消息新切换使用新 intentId，同次重试沿用原编号。", "skill-books.switch", object({
		skillType,
		bookId,
		intentId: intentIdSchema,
		taskInput: taskInputSchema
	}, ["intentId", "taskInput"]), object({
		code: {
			type: "string",
			enum: ["SHOW_LIST", "OK"]
		},
		skillType,
		options,
		result: switchResult
	}, ["options", "result"]), (input) => `/切换${input.skillType} ${input.bookId}`, (data, input) => switchData(data, input.skillType, input.bookId), (input) => ({
		skillType: input.skillType,
		bookId: String(input.bookId),
		confirm: null
	}), (input) => validateIntentId(input.intentId), {
		intentId: (input) => input.intentId,
		taskInput: (input) => input.taskInput
	}),
	prepare_skill_switch: mutation("切换已学功法；已有同类型功法时返回原比较及 reference，须确认；空槽位可能直接切换。同消息新操作使用新 intentId，同次重试沿用原编号。", "skill-books.switch", object({
		skillType,
		bookId,
		intentId: intentIdSchema
	}, ["intentId"]), object({
		code: {
			type: "string",
			enum: ["SHOW_LIST", "OK"]
		},
		skillType,
		options,
		result: switchResult,
		reference: confirmationReferenceSchema
	}, [
		"options",
		"result",
		"reference"
	]), (input) => `/切换${input.skillType} ${input.bookId}`, (data, input) => {
		const parsed = switchData(data, input.skillType, input.bookId);
		if ("result" in parsed && parsed.result?.outcome === "confirmation_required") {
			const reference = data.reference;
			if (typeof reference !== "string") throw new Error("功法切换确认引用缺失");
			validateConfirmationReference(reference, "k");
			return {
				...parsed,
				reference
			};
		}
		return parsed;
	}, (input) => ({
		skillType: input.skillType,
		bookId: String(input.bookId),
		confirm: null,
		exposePreview: true
	}), (input) => validateIntentId(input.intentId), { intentId: (input) => input.intentId }),
	confirm_skill_switch: mutation("确认原功法切换预览；提交原类型、目标实例和 reference，服务端核对原使用中功法及比较属性后事务切换。原引用跨消息重试返回原结算，不自动替换已变化的功法。", "skill-books.switch", object({
		skillType,
		bookId,
		reference: confirmationReferenceSchema
	}), object({
		code: {
			type: "string",
			enum: ["OK"]
		},
		skillType,
		result: switchResult
	}), (input) => `/切换${input.skillType} ${input.bookId} 确认`, (data, input) => {
		const parsed = switchData(data, input.skillType, input.bookId);
		if (parsed.code !== "OK" || !("result" in parsed) || parsed.result?.outcome !== "switched") throw new Error("功法切换确认结果不完整");
		return parsed;
	}, (input) => ({
		skillType: input.skillType,
		bookId: String(input.bookId),
		confirm: "确认",
		reference: input.reference
	}), (input) => validateConfirmationReference(input.reference, "k"))
};

//#endregion
export { skillActions };