import { displayCurrencyText } from "../constants/currency.js";

//#region src/utils/issuedRewardText.ts
/** Keep committed receipts readable on older servers that omit reward names. */
function issuedRewardText(rewards) {
	const labels = {
		item: "物品",
		equipment: "装备",
		skill: "功法",
		skill_book: "功法",
		currency: "货币",
		recipe: "丹方",
		lootbox: "礼盒",
		soul_artifact: "本命物"
	};
	return rewards.length ? rewards.map((reward) => `${displayCurrencyText(reward.name.trim() || `${labels[reward.type] ?? "奖励"}（名称暂缺）`)}x${reward.amount}`).join("、") : "无";
}

//#endregion
export { issuedRewardText };