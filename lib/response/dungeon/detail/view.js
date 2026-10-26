import { displayCurrencyText } from "../../../constants/currency.js";

//#region src/response/dungeon/detail/view.ts
function dungeonDetailView(item) {
	const limitText = item.dailyLimit > 0 ? `今日次数：(${item.usedToday}/${item.dailyLimit})` : `今日次数：(${item.usedToday}/不限)`;
	const freeText = `今日免费：已用${item.freeUsed}/${item.freeLimit}次，剩余${item.freeRemaining}次（不耗精力）`;
	const currencies = item.currencyDrops.map((drop) => `${displayCurrencyText(drop.name)}+${drop.amount}`);
	return {
		name: item.name,
		id: item.id,
		isSingle: item.isSingle,
		typeLabel: item.typeLabel,
		realmLimit: item.realmLimit,
		spiritCost: item.spiritCost,
		guildContributionCost: item.guildContributionCost,
		minPlayers: item.minPlayers,
		limitText,
		freeText,
		mustGain: `修为+${item.expReward}` + (currencies.length ? `，${currencies.join("、")}` : ""),
		skillDrops: item.skillDrops,
		materialDrops: item.materialDrops,
		hasCleared: item.hasCleared,
		firstClearReward: item.firstClearReward ? { parts: item.firstClearReward.parts.map(displayCurrencyText) } : null,
		outputMultiplier: item.outputMultiplier,
		outputAddPct: item.outputAddPct,
		inTeam: item.inTeam
	};
}
const formatDropProbability = (probability) => {
	const percent = probability / 100;
	return percent >= 1 ? `${percent.toFixed(1)}%` : `${percent.toFixed(2)}%`;
};
const buildDropDetailCommand = (category, itemId) => {
	if (category === "skill_book") return `/物品详情 功法 ${itemId}`;
	if (category === "equipment") return `/物品详情 装备 ${itemId}`;
	if (category === "item") return `/物品详情 物品 ${itemId}`;
	return null;
};

//#endregion
export { buildDropDetailCommand, dungeonDetailView, formatDropProbability };