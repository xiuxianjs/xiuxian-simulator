import { isPrivateEvent } from "../../utils/privateEvent.js";
import { mentionsRetiredFeature } from "../retiredFeatures.js";

//#region src/response/onboarding/policy.ts
const canonicalOnboardingCommand = (value) => value.trim().replace(/^[/#＃!！]\s*/, "").split(/\s+/).join(" ");
const isOnboardingHelp = (command) => [
	"帮助",
	"修仙帮助",
	"help",
	"menu",
	"菜单",
	"攻略",
	"我的天赋"
].includes(command);
const isOnboardingResolution = (command, view) => view.phase.startsWith("milestone.") && [
	"出关",
	"打坐结束",
	"结束打坐",
	"返程",
	"融臣结束",
	"确认培元丹",
	"取消培元丹",
	"确认明悟丹",
	"确认本命物洗涤",
	"取消本命物洗涤",
	"确认神魂",
	"普攻",
	"普通攻击",
	"战技",
	"神通",
	"自动",
	"切换自动",
	"逃跑"
].includes(command.split(" ")[0]);
const onboardingDisplayLines = (view) => view.lines.flatMap((line) => line.split("\n")).filter((line) => !view.phase.startsWith("milestone.") || !mentionsRetiredFeature(line));
const onboardingButtonId = (version, index) => `ob${version.toString(36)}.${index}`;
function onboardingButtonVersion(event) {
	if (!event.name?.includes("interaction") || !event.InteractionData) return;
	let data;
	try {
		data = JSON.parse(event.InteractionData);
	} catch {
		return;
	}
	if (!data || typeof data.button_id !== "string" || !/^ob.*\./.test(data.button_id)) return;
	const match = /^ob([0-9a-z]{1,11})\.([0-2])$/.exec(data.button_id);
	const version = match ? Number.parseInt(match[1], 36) : 0;
	if (!match || !Number.isSafeInteger(version) || version < 1 || onboardingButtonId(version, Number(match[2])) !== data.button_id || typeof data.button_data !== "string" || canonicalOnboardingCommand(data.button_data) !== canonicalOnboardingCommand(event.MessageText ?? "")) return null;
	return version;
}
let matchesGameCommand;
function configureOnboardingCommandMatcher(matcher) {
	matchesGameCommand = matcher;
}
function isOnboardingAddressed(event, view) {
	const text = String(event.MessageText ?? "").trimStart();
	if (/^[!！]/.test(text)) return false;
	if (isPrivateEvent(event) || event.name?.includes("interaction") || /^[/#＃]/.test(text)) return true;
	const command = canonicalOnboardingCommand(text);
	return command === "继续引导" || command === "退出引导" || isOnboardingHelp(command) || view.actions.some((action) => canonicalOnboardingCommand(action.command) === command) || matchesGameCommand?.(event) === true;
}
function onboardingFooter(view) {
	if (view.status === "active" || view.status === "soft") return [...view.actions.map((button) => [button]), [{
		label: "暂离教学 · /退出引导",
		command: "/退出引导"
	}]];
	if (view.status === "completed") {
		if (view.actions.length) return view.actions.slice(0, 2).map((button) => [button]);
		return [[{
			label: "出关结算 · /出关",
			command: "/出关"
		}], [{
			label: "任务面板 · /任务面板",
			command: "/任务面板"
		}]];
	}
	if (view.status === "exited") return [[{
		label: "恢复教学 · /继续引导",
		command: "/继续引导"
	}], [{
		label: "自由探索 · /任务面板",
		command: "/任务面板"
	}]];
	return [[{
		label: "任务面板 · /任务面板",
		command: "/任务面板"
	}]];
}

//#endregion
export { canonicalOnboardingCommand, configureOnboardingCommandMatcher, isOnboardingAddressed, isOnboardingHelp, isOnboardingResolution, onboardingButtonId, onboardingButtonVersion, onboardingDisplayLines, onboardingFooter };