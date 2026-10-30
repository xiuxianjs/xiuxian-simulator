import { object } from "./schema.js";
import { onboardingSchema } from "./onboarding-schema.js";
import { parseOnboarding } from "../api/bot/onboarding.js";
import { intentIdSchema, mutation, observation, validateIntentId } from "./mutation.js";

//#region src/expose/onboarding-actions.ts
const onboardingActions = {
	get_onboarding: observation("查询当前教学状态和服务端提供的可选动作，不恢复已退出的教学。", "onboarding.view", object({}), onboardingSchema, () => "/查看主线 1", parseOnboarding),
	resume_onboarding: mutation("恢复教学并返回当前状态和可选动作；同消息新操作使用新 intentId，同次重试沿用原编号。", "onboarding.view", object({ intentId: intentIdSchema }, ["intentId"]), onboardingSchema, () => "/继续引导", parseOnboarding, () => ({}), (input) => validateIntentId(input.intentId), { intentId: (input) => input.intentId }),
	exit_onboarding: mutation("暂离教学，返回服务端实际状态；同消息新操作使用新 intentId，同次重试沿用原编号。", "onboarding.exit", object({ intentId: intentIdSchema }, ["intentId"]), onboardingSchema, () => "/退出引导", parseOnboarding, () => ({}), (input) => validateIntentId(input.intentId), { intentId: (input) => input.intentId }),
	perform_onboarding_action: mutation("执行当前教学状态返回的动作；传入原始版本和指令，服务端拒绝过期或不属于当前步骤的操作。动作可能消耗资源或结算战斗。", "onboarding.action", object({
		version: {
			type: "integer",
			minimum: 1,
			maximum: Number.MAX_SAFE_INTEGER
		},
		command: {
			type: "string",
			minLength: 1,
			maxLength: 100
		},
		intentId: intentIdSchema
	}, ["intentId"]), onboardingSchema, (input) => input.command, parseOnboarding, (input) => ({
		version: input.version,
		command: input.command
	}), (input) => validateIntentId(input.intentId), { intentId: (input) => input.intentId })
};

//#endregion
export { onboardingActions };