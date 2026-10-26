import { getItemCategoryLabel } from "../../../constants/marketCategories.js";

//#region src/response/guild/shop/view.ts
function buildGuildShopDisplay(page) {
	return {
		shopItems: page.items.map((item) => {
			let categoryLabel = "";
			if (item.category === "item" && item.itemId) categoryLabel = getItemCategoryLabel("item", item.itemType, item.itemSubtype);
			else if (item.category) categoryLabel = getItemCategoryLabel(item.category);
			return {
				index: item.index,
				itemName: item.name,
				price: item.priceContribution,
				quantity: item.quantity,
				statusText: item.statusText,
				canExchange: item.canExchange,
				slotName: item.slotName ?? "",
				locked: item.locked === true,
				categoryLabel
			};
		}),
		contributionPoints: page.contributionPoints,
		autoRefreshEnabled: page.autoRefreshEnabled,
		autoRefreshHours: page.autoRefreshHours,
		autoRefreshStatusText: page.autoRefreshStatusText,
		refreshDailyLimit: page.refreshDailyLimit,
		isLeader: page.isLeader
	};
}

//#endregion
export { buildGuildShopDisplay };