import { formatNumber } from "./formatHelper.js";

//#region src/utils/currencyCardHelper.ts
/** Format already queried currency facts without accessing storage. */
function appendCurrencyCardToMd(md, user, options) {
	const spiritStone = user?.spiritStone ?? 0;
	const spiritsCrystal = user?.spiritsCrystal ?? 0;
	const spiritsMilk = user?.spiritsMilk ?? 0;
	const signInCoin = user?.signInCoin ?? 0;
	const towerScore = user?.towerScore ?? 0;
	const reputation = user?.reputation ?? 0;
	const tongxin = user?.tongxin ?? 0;
	const greenBottle = user?.greenBottle ?? 0;
	const currencies = [
		{
			label: "灵石",
			value: spiritStone
		},
		{
			label: "灵晶",
			value: spiritsCrystal
		},
		{
			label: "道晶",
			value: spiritsMilk
		},
		{
			label: "签到币",
			value: signInCoin
		},
		{
			label: "积分",
			value: towerScore
		},
		{
			label: "声望",
			value: reputation
		},
		{
			label: "同心值",
			value: tongxin
		},
		{
			label: "小绿瓶",
			value: greenBottle
		}
	];
	const includedCurrencies = options?.includeLabels?.length ? currencies.filter((item) => options.includeLabels?.includes(item.label)) : currencies;
	const visibleCurrencies = options?.hideZero ? includedCurrencies.filter((item) => item.value > 0) : includedCurrencies;
	if (visibleCurrencies.length > 0) {
		if (options?.singleLine) {
			md.addText(visibleCurrencies.map((item) => `${item.label}：${formatNumber(item.value)}`).join(" | "));
			md.addNewline();
		} else {
			const cols = 3;
			const rowCount = Math.ceil(visibleCurrencies.length / cols);
			const firstRow = visibleCurrencies.slice(0, cols);
			md.addText("| " + firstRow.map((c) => c.label).join(" | ") + " |");
			md.addNewline();
			md.addText("| " + firstRow.map(() => "------").join(" | ") + " |");
			md.addNewline();
			md.addText("| " + firstRow.map((c) => formatNumber(c.value)).join(" | ") + " |");
			md.addNewline();
			for (let r = 1; r < rowCount; r++) {
				const row = visibleCurrencies.slice(r * cols, (r + 1) * cols);
				md.addText("| " + row.map((c) => c.label).join(" | ") + " |");
				md.addNewline();
				md.addText("| " + row.map((c) => formatNumber(c.value)).join(" | ") + " |");
				md.addNewline();
			}
		}
		md.addNewline();
	}
	if (visibleCurrencies.length > 0) md.addNewline();
}

//#endregion
export { appendCurrencyCardToMd };