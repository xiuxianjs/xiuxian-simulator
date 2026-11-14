import { getCommandPrefix, internalCommandText } from "../../utils/commandPrefix.js";
import { isGameEventEnabled } from "../../utils/eventPolicy.js";
import { parseOnboarding } from "../../api/bot/onboarding.js";
import { menuPagePattern, onboardingMenuPage } from "./menu-pages.js";
import { canonicalOnboardingCommand, onboardingButtonVersion } from "./policy.js";
import { showOnboarding, showOnboardingRecovery } from "./context.js";
import { selects } from "../config.js";
import { trackFeatureWithIdentity } from "../mwFeatureTrack.js";
import { runRobotBusiness } from "../robotBusiness.js";
import { onResponse, useEvent } from "alemonjs";

//#region src/response/onboarding/res.ts
async function handleOnboardingResponse(event, next) {
	if (/^[!！]/.test((event.MessageText ?? "").trimStart())) {
		next();
		return;
	}
	const command = canonicalOnboardingCommand(event.MessageText ?? "", getCommandPrefix());
	const pageRequest = (event.MessageText ?? "").match(menuPagePattern);
	if (pageRequest) {
		if (!isGameEventEnabled(event)) {
			next();
			return;
		}
		const page = onboardingMenuPage(pageRequest[1], Number(pageRequest[2]), event);
		trackFeatureWithIdentity(event, Boolean(page));
		if (page) await showOnboarding(event, page.view, void 0, page);
		else await showOnboardingRecovery(event, /* @__PURE__ */ new Error("目录已失效或不属于当前会话，请发送 /继续引导 重新查看。"));
		return;
	}
	const buttonVersion = onboardingButtonVersion(event, getCommandPrefix());
	const control = command === "继续引导" || command === "退出引导";
	if (!control && buttonVersion === void 0) {
		next();
		return;
	}
	event.MessageText = internalCommandText(event.MessageText ?? "");
	try {
		const action = !control && typeof buttonVersion === "number";
		const result = await runRobotBusiness(event, command === "退出引导" ? "onboarding.exit" : action ? "onboarding.action" : "onboarding.view", action ? {
			version: buttonVersion,
			command: event.MessageText?.trim()
		} : {}, parseOnboarding, next);
		if (!result.handled) await showOnboarding(event, result.data);
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