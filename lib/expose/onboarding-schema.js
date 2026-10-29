import { boolean, integer, list, object, text } from "./schema.js";

//#region src/expose/onboarding-schema.ts
const onboardingSchema = object({
	status: {
		type: "string",
		enum: [
			"absent",
			"active",
			"soft",
			"completed",
			"exited"
		]
	},
	phase: text,
	version: integer,
	title: text,
	lines: list(text),
	feedback: list(text),
	actions: list(object({
		label: text,
		command: text
	})),
	choiceBound: boolean
}, ["choiceBound"]);

//#endregion
export { onboardingSchema };