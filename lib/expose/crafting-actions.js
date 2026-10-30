import { boolean, fields, integer, list, number, object, text } from "./schema.js";
import { intentIdSchema, mutation, observation, replySchema, taskInputSchema, validateIntentId } from "./mutation.js";
import { forgeStatFields, parseForgeOverview, parseForgePreview, parseForgeResult } from "../api/schemas/forge.js";
import { confirmationReferenceSchema, validateConfirmationReference } from "./confirmation.js";
import { parseAlchemyV2Reply } from "../api/bot/alchemy-v2.js";
import { ExposeError } from "alemonjs";

//#region src/expose/crafting-actions.ts
const positive = {
	type: "integer",
	minimum: 1,
	maximum: Number.MAX_SAFE_INTEGER
};
const empty = object({});
function alchemyReply(value) {
	const reply = parseAlchemyV2Reply(value);
	return {
		reply,
		confirmations: [...reply.buttons, ...(reply.blocks ?? []).flatMap((block) => block.inlineButtons ?? [])].flatMap((button) => {
			const match = button.command.match(/^\/炼丹 确认 (r1_[a-z0-9]+_a_[a-z0-9]+_[a-f0-9]{24})$/);
			return match ? [{
				reference: match[1],
				label: button.label
			}] : [];
		})
	};
}
const alchemy = object({
	reply: replySchema,
	confirmations: list(object({
		reference: text,
		label: text
	}))
});
const stats = Object.fromEntries(Object.keys(forgeStatFields).map((key) => [key, number]));
const forgeMaterialSchema = object({
	...fields(text, "source name"),
	...fields(integer, "itemId required available listed"),
	locked: boolean
});
const attribute = object({
	...fields(text, "key name unit"),
	min: number,
	max: number
});
const forgeRecipeSchema = object({
	attributes: list(attribute),
	...fields(boolean, "tradeable canEquip earlyCraft learned assessment completed canCraft"),
	...fields(integer, "id requiredLevel craftRequiredLevel spiritStoneCost toolGrade"),
	...fields(text, "name grade type requiredRealm reason toolType"),
	equipment: object({
		id: integer,
		name: text,
		...stats
	}),
	materials: list(forgeMaterialSchema)
}, ["craftRequiredLevel", "earlyCraft"]);
const tutorialTool = {
	...fields(integer, "templateId gradeLevel permission"),
	...fields(text, "name type grade")
};
const preview = object({
	token: confirmationReferenceSchema,
	expiresAt: integer,
	tutorial: boolean,
	recipe: forgeRecipeSchema,
	expGained: integer,
	assessmentNew: boolean,
	tutorialTool: object(tutorialTool)
}, ["tutorialTool"]);
const forgeResultSchema = object({
	...fields(integer, "crafterId craftId recipeId expGained spiritStoneCost"),
	...fields(text, "currentEquipment name crafter createdAt"),
	...fields(boolean, "canEquip assessmentNew tutorial replayed"),
	comparisons: list(object({
		...fields(text, "key name unit"),
		...fields(number, "value current delta")
	})),
	equipment: object({
		...fields(integer, "id equipmentId userId permission"),
		crafterName: text,
		...stats
	}, ["crafterName"]),
	materials: list(forgeMaterialSchema),
	tutorialTool: object({
		...tutorialTool,
		instanceId: integer,
		equipped: boolean
	})
}, ["tutorialTool"]);
const forgeOverviewSchema = object({
	...fields(boolean, "available joined canAdvance canJoin"),
	...fields(text, "reason title advanceReason nextTitle entryRealm"),
	...fields(integer, "level exp expRequired assessmentDone assessmentRequired"),
	recipes: list(forgeRecipeSchema)
});
function taskAlchemyRecipes(input) {
	const original = input.taskInput.trim().replace(/^[!！/#＃]\s*/, "").trim();
	const match = /^(?:丹方|丹方列表|查看丹方|炼丹\s+丹方)(?:\s+(\d+))?$/.exec(original);
	const rawPage = match?.[1];
	const number = rawPage === void 0 ? 1 : Number(rawPage);
	if (!match || !Number.isSafeInteger(number) || number < 1 || number > 1e5 || input.page !== void 0 && input.page !== number) throw new ExposeError("INVALID_INPUT", "丹方任务指令与页码不匹配");
	return {
		original: `/${original}`,
		command: `/炼丹 丹方${rawPage === void 0 ? "" : ` ${rawPage}`}`
	};
}
const craftingActions = {
	execute_task_alchemy_recipes: mutation("执行丹方列表任务步骤，支持路由现有别名及页码；返回服务端列表和任务推进，不执行炼制。", "alchemy.v2", object({
		taskInput: taskInputSchema,
		page: {
			type: "integer",
			minimum: 1,
			maximum: 1e5
		},
		intentId: intentIdSchema
	}, ["page", "intentId"]), alchemy, (input) => taskAlchemyRecipes(input).command, alchemyReply, () => ({}), (input) => {
		validateIntentId(input.intentId);
		taskAlchemyRecipes(input);
	}, {
		intentId: (input) => input.intentId,
		taskInput: (input) => input.taskInput,
		taskCommand: (input) => taskAlchemyRecipes(input).original
	}),
	get_alchemy_dashboard: mutation("查看炼丹当前状态与功能入口；服务端可能处理入门状态，返回原始业务提示及可确认引用，不自动执行按钮。", "alchemy.v2", empty, alchemy, () => "/炼丹", alchemyReply),
	enroll_alchemist: mutation("按现有入门流程加入炼丹师或恢复入门引导；服务端处理资格及原有入门奖励，不自动继续其他按钮。", "alchemy.v2", empty, alchemy, () => "/炼丹 入门", alchemyReply),
	get_alchemy_recipes: observation("查看指定页炼丹丹方；返回服务端说明及预览入口，不立即炼制。", "alchemy.v2", object({ page: {
		type: "integer",
		minimum: 1,
		maximum: 2147483647
	} }), alchemy, (input) => `/炼丹 丹方 ${input.page}`, alchemyReply, () => ({})),
	execute_task_preview_alchemy: mutation("执行炼丹预览任务步骤，返回原预览和确认引用；提交炼丹前必须向用户说明并取得明确确认。", "alchemy.v2", object({
		recipeId: positive,
		count: {
			type: "integer",
			minimum: 1,
			maximum: 1e3
		},
		taskInput: taskInputSchema,
		intentId: intentIdSchema
	}, ["intentId"]), alchemy, (input) => `/炼丹 预览 ${input.recipeId} ${input.count}`, alchemyReply, () => ({}), (input) => validateIntentId(input.intentId), {
		intentId: (input) => input.intentId,
		taskInput: (input) => input.taskInput
	}),
	preview_alchemy: observation("预览指定丹方 1..1000 炉的材料、消耗及条件；返回绑定原预览的服务端确认引用，必须先向用户说明并取得确认。", "alchemy.v2", object({
		recipeId: positive,
		count: {
			type: "integer",
			minimum: 1,
			maximum: 1e3
		}
	}), alchemy, (input) => `/炼丹 预览 ${input.recipeId} ${input.count}`, alchemyReply, () => ({})),
	confirm_alchemy: mutation("用户明确确认原预览后，使用原 r1_a 引用提交炼丹或天工获取。保留原操作编号、用户绑定和过期校验；失败不能重新预览后自动确认。", "alchemy.v2", object({
		reference: confirmationReferenceSchema,
		taskInput: taskInputSchema
	}, ["taskInput"]), alchemy, (input) => `/炼丹 确认 ${input.reference}`, alchemyReply, () => ({}), (input) => validateConfirmationReference(input.reference, "a"), { taskInput: (input) => input.taskInput }),
	get_forge_overview: observation("查看锻造等级、图纸、材料库存、学习和制作资格；不保存或制作装备，服务端保留准入。", "forge.overview", empty, forgeOverviewSchema, () => "/我的锻造", parseForgeOverview),
	preview_forge: observation("预览指定锻造图纸的材料、费用、属性范围和原确认引用；不消耗制作材料。请先向用户说明并取得确认。", "forge.preview", object({ recipeId: positive }), preview, (input) => `/打造 ${input.recipeId}`, parseForgePreview, (input) => ({
		recipeId: input.recipeId,
		tutorial: false
	})),
	preview_forge_tutorial: observation("预览加入锻造师的入门制作与工具奖励；取得用户确认后再用原引用调用 confirm_forge。", "forge.preview", empty, preview, () => "/加入锻造师", parseForgePreview, () => ({
		recipeId: 0,
		tutorial: true
	})),
	confirm_forge: mutation("用户明确确认原预览后，使用原 r1_f 引用打造；服务端校验原材料、图纸和预览有效期，返回实际装备及重放标记。不得重建最新预览后自动提交。", "forge.confirm", object({ reference: confirmationReferenceSchema }), forgeResultSchema, (input) => `/确认打造 ${input.reference}`, parseForgeResult, (input) => ({ token: input.reference }), (input) => validateConfirmationReference(input.reference, "f"))
};

//#endregion
export { craftingActions, forgeMaterialSchema, forgeOverviewSchema, forgeRecipeSchema, forgeResultSchema };