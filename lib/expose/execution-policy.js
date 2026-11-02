import { authorizedEvent } from "./access.js";
import { list, object, text } from "./schema.js";
import { Expose } from "alemonjs";

//#region src/expose/execution-policy.ts
const observations = /* @__PURE__ */ new WeakSet();
const freshNames = /* @__PURE__ */ new Set();
function declareFreshObservation(handler) {
	observations.add(handler);
}
function bindExecutionPolicies(configs) {
	freshNames.clear();
	for (const config of configs) {
		if (config.name !== "xiuxian.player.v1") continue;
		for (const [name, action] of Object.entries(config.actions)) if (observations.has(action.handler)) freshNames.add(name);
	}
}
const isFreshObservation = (action) => freshNames.has(action);
const executionPolicyActions = { get_execution_policy: Expose.action({
	description: "只读静态执行策略。教学状态需每次查询原服务端；序章与教学动作按原intentId重放。不会授权操作，也不替代服务端版本校验与幂等结算。",
	effect: "read",
	inputSchema: object({}),
	outputSchema: object({
		protocol: {
			type: "string",
			enum: ["plugin-execution-policy.v1"]
		},
		actions: list(object({
			action: text,
			mode: {
				type: "string",
				enum: ["fresh", "operation"]
			},
			keyField: text
		}, ["keyField"]))
	}),
	authorize: (_input, context) => {
		authorizedEvent(context);
		return true;
	},
	handler: () => ({
		protocol: "plugin-execution-policy.v1",
		actions: [
			...[.../* @__PURE__ */ new Set(["get_onboarding", ...freshNames])].map((action) => ({
				action,
				mode: "fresh"
			})),
			{
				action: "continue_registration_guide",
				mode: "operation",
				keyField: "intentId"
			},
			{
				action: "perform_onboarding_action",
				mode: "operation",
				keyField: "intentId"
			}
		]
	})
}) };

//#endregion
export { bindExecutionPolicies, declareFreshObservation, executionPolicyActions, isFreshObservation };