import { recoveryEffectText } from "../api/schemas/resource-recovery.js";
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
function recoverySummaryMarkdown(summary, formatNumber = String) {
	const md = Format.createMarkdown();
	md.addText(`回灵效率：${formatNumber(summary.mp)}%（上限 ${formatNumber(summary.cap)}%）`);
	md.addNewline();
	md.addText(`回念效率：${formatNumber(summary.mental)}%（上限 ${formatNumber(summary.cap)}%）`);
	if (!summary.configured || !summary.enabled) {
		md.addNewline();
		md.addText(summary.configured ? "效率配置已关闭" : "尚未配置效率来源");
	}
	for (const source of summary.sources) {
		md.addNewline();
		md.addText(recoveryEffectText(source, formatNumber));
	}
	if (summary.mpTotal > summary.mp || summary.mentalTotal > summary.mental) {
		md.addNewline();
		md.addText(`来源合计：回灵 ${formatNumber(summary.mpTotal)}%、回念 ${formatNumber(summary.mentalTotal)}%；超出上限的部分不生效。`);
	}
	md.addNewline();
	md.addText(summary.note);
	return md;
}

//#endregion
export { recoveryEffectsMarkdown, recoverySummaryMarkdown };