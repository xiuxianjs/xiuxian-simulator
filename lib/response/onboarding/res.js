import { parseOnboarding } from "../../api/bot/onboarding.js";
import { canonicalOnboardingCommand, onboardingButtonVersion } from "./policy.js";
import { showOnboarding, showOnboardingRecovery } from "./context.js";
import { selects } from "../config.js";
import { runRobotBusiness } from "../robotBusiness.js";
import { onResponse, useEvent } from "alemonjs";

//#region src/response/onboarding/res.ts
async function handleOnboardingResponse(event, next) {
	if (/^[!！]/.test((event.MessageText ?? "").trimStart())) {
		next();
		return;
	}
	const command = canonicalOnboardingCommand(event.MessageText ?? "");
	const buttonVersion = onboardingButtonVersion(event);
	const control = command === "继续引导" || command === "退出引导";
	if (!control && buttonVersion === void 0) {
		next();
		return;
	}
	try {
		const action = !control && typeof buttonVersion === "number";
		const result = await runRobotBusiness(event, command === "退出引导" ? "onboarding.exit" : action ? "onboarding.action" : "onboarding.view", action ? {
			version: buttonVersion,
			command: event.MessageText?.trim()
		} : {}, parseOnboarding, next);
		if (!result.handled) {
			if (action) result.data.feedback.unshift(`你选择了：${event.MessageText?.trim()}`);
			await showOnboarding(event, result.data);
		}
	} catch (error) {
		await showOnboardingRecovery(event, error);
	}
}
var res_default = onResponse(selects, async (event) => {
	const [, next] = useEvent();
	await handleOnboardingResponse(event, next);
});

//#endregion
export { res_default as default, handleOnboardingResponse };