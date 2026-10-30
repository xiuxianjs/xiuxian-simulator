import { boolean, object } from "./schema.js";
import { intentIdSchema, mutation, validateIntentId } from "./mutation.js";
import { projectTemplates, templateSchema } from "./queries.js";
import { parseBattleTemplateSave } from "../api/bot/battle-template-save.js";
import { parseBattleTemplateApply } from "../api/bot/battle-template-apply.js";
import { parseBattleTemplateDelete } from "../api/bot/battle-template-delete.js";

//#region src/expose/template-actions.ts
const slot = {
	type: "integer",
	minimum: 1,
	maximum: 5
};
const withFlag = (flag) => object({
	...templateSchema.type === "object" ? templateSchema.properties : {},
	[flag]: boolean
});
const args = (input) => ({
	slotText: String(input.slot),
	name: input.name ?? null
});
const templateActions = {
	save_battle_template: mutation("将当前装备和功法保存到 1..5 槽位；已有模板会覆盖。名称由服务端规范化，返回实际保存名称。", "battle-templates.save", object({
		slot,
		name: { type: "string" }
	}, ["name"]), withFlag("created"), (input) => `/保存战斗模板 ${input.slot}${input.name === void 0 ? "" : ` ${input.name}`}`, (data, input) => {
		const result = parseBattleTemplateSave(data, input.slot);
		return {
			...projectTemplates({
				current: result,
				templates: []
			}).current,
			created: result.created
		};
	}, args),
	apply_battle_template: mutation("应用已保存的战斗模板，改变当前装备和功法。同消息重新应用使用新 intentId，同次重试沿用原编号。", "battle-templates.apply", object({
		slot,
		intentId: intentIdSchema
	}, ["intentId"]), withFlag("cacheInvalidated"), (input) => `/应用战斗模板 ${input.slot}`, (data, input) => {
		const result = parseBattleTemplateApply(data, input.slot);
		return {
			...projectTemplates({
				current: result,
				templates: []
			}).current,
			cacheInvalidated: result.cacheInvalidated
		};
	}, args, (input) => validateIntentId(input.intentId), { intentId: (input) => input.intentId }),
	delete_battle_template: mutation("删除指定槽位的战斗模板；不分解装备或功法，deleted=false 表示没有删除记录。", "battle-templates.delete", object({ slot }), object({ deleted: boolean }), (input) => `/删除战斗模板 ${input.slot}`, parseBattleTemplateDelete, args)
};

//#endregion
export { templateActions };