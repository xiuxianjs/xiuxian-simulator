import { section } from "../response/presentation/sections.js";
import { recoveryEffectText } from "../api/schemas/resource-recovery.js";
import "../response/presentation/index.js";
import { Format } from "alemonjs";

//#region src/utils/resourceRecoveryDisplay.ts
function recoveryEffectsMarkdown(effects) {
	const md = Format.createMarkdown();
	md.addText("资源恢复固有效果");
	for (const effect of effects) {
		md.addNewline();
		md.addText(recoveryEffectText(effect));
		md.addNewline();
		md.addText(effect.conditionText);
	}
	return md;
}
function appendRecoveryChanges(md, lines) {
	if (lines?.length) md.addNewline().addBlockquote(section({ lines }));
}

//#endregion
export { appendRecoveryChanges, recoveryEffectsMarkdown };