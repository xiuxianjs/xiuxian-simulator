import { displayCurrencyText } from "../../../constants/currency.js";

//#region src/response/dungeon/sweep/view.ts
function parseSweepCommand(text) {
	const cleaned = (text ?? "").trim().replace(/^(!|！|\/|#|＃)?\s*/, "");
	if (!cleaned.startsWith("扫荡秘境")) return {
		ok: false,
		isCommand: false,
		message: ""
	};
	const match = cleaned.match(/^扫荡秘境\s+(.+?)(?:\s+(\d+))?$/);
	if (!match) return {
		ok: false,
		isCommand: true,
		message: "用法：/扫荡秘境 名称 [次数]"
	};
	const dungeonName = match[1].trim(), times = match[2] ? Number(match[2]) : 1;
	if (!dungeonName) return {
		ok: false,
		isCommand: true,
		message: "请输入秘境名称"
	};
	if (![
		1,
		5,
		10
	].includes(times)) return {
		ok: false,
		isCommand: true,
		message: "扫荡次数仅支持 1、5、10"
	};
	return {
		ok: true,
		dungeonName,
		times
	};
}
function dungeonSweepView(value) {
	return {
		treasureEffects: value.treasureEffects,
		dungeonName: value.dungeonName,
		times: value.times,
		totalSpiritCost: value.totalSpiritCost,
		totalExp: value.normalExperienceGained ?? value.totalExp,
		totalCurrencyText: value.currency.map((r) => `${displayCurrencyText(r.name)} +${r.amount}`).join(" | "),
		totalItemsText: (value.normalItems ?? value.items).map((r) => `${r.name}×${r.amount}`).join("、")
	};
}

//#endregion
export { dungeonSweepView, parseSweepCommand };