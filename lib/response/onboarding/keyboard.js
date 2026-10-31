import { Format } from "alemonjs";

//#region src/response/onboarding/keyboard.ts
const protectedCommand = (command) => /^\/主线扫荡\s/.test(command) || /^\/服用 精力丹 [1-9]\d*$/.test(command) || [
	"/突破",
	"/出关",
	"/闭关"
].includes(command);
const hasBoundReturnChoices = (view) => view.status === "completed" && view.choiceBound === true && view.actions.some((button) => protectedCommand(button.command));
function onboardingKeyboard(userId, isPrivate, buttons) {
	const group = Format.createButtonGroup();
	buttons.flat().forEach((button) => {
		group.addRow().addButton(button.label, button.command, {
			type: "command",
			autoEnter: false,
			toolTip: "当前客户端不支持此按钮，可手动发送按钮旁的指令。",
			permission: isPrivate ? { type: 2 } : {
				type: 0,
				userIds: [userId]
			}
		});
	});
	return group;
}

//#endregion
export { hasBoundReturnChoices, onboardingKeyboard };