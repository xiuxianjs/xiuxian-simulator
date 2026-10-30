//#region src/api/bot/recharge-periodic-packs.ts
function invalid() {
	throw new Error("周月礼包响应不完整，请刷新后重试");
}
function row(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) return invalid();
	return value;
}
function text(value) {
	if (typeof value !== "string") return invalid();
	return value;
}
function integer(value) {
	if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) return invalid();
	return value;
}
function array(value, parse) {
	if (!Array.isArray(value)) return invalid();
	return value.map(parse);
}
function date(value) {
	const result = text(value);
	if (!/^\d{4}-\d{2}-\d{2}$/.test(result) || !Number.isFinite(Date.parse(result)) || new Date(result).toISOString().slice(0, 10) !== result) return invalid();
	return result;
}
function parseRechargePeriodicPacks(value) {
	const data = row(value);
	if (data.period !== "weekly" && data.period !== "monthly") return invalid();
	const products = array(data.products, (value) => {
		const item = row(value);
		const packageId = item.packageId === null ? null : integer(item.packageId);
		const priceAmount = integer(item.priceAmount);
		const basePriceAmount = integer(item.basePriceAmount);
		const creditedAmount = integer(item.creditedAmount);
		const limit = integer(item.limit);
		const successful = integer(item.successful);
		const pending = integer(item.pending);
		const remaining = integer(item.remaining);
		if (packageId === 0 || basePriceAmount === 0 || limit === 0 || remaining > limit || typeof item.available !== "boolean" || typeof item.isBundle !== "boolean" || item.available && (priceAmount === 0 || remaining === 0)) return invalid();
		return {
			sku: text(item.sku),
			name: text(item.name),
			packageId,
			priceAmount,
			basePriceAmount,
			creditedAmount,
			limit,
			successful,
			pending,
			remaining,
			isBundle: item.isBundle,
			available: item.available,
			unavailableReason: text(item.unavailableReason),
			label: text(item.label),
			promotionTexts: array(item.promotionTexts, text),
			rewardParts: array(item.rewardParts, (value) => {
				const reward = row(value);
				return {
					kind: text(reward.kind),
					name: text(reward.name),
					quantity: integer(reward.quantity)
				};
			})
		};
	});
	if (new Set(products.map((product) => product.sku)).size !== products.length) return invalid();
	const periodStart = date(data.periodStart);
	const periodEnd = date(data.periodEnd);
	const resetsAt = text(data.resetsAt);
	const unresolvedOrderNo = data.unresolvedOrderNo === null ? null : text(data.unresolvedOrderNo);
	if (periodStart >= periodEnd || !Number.isFinite(Date.parse(resetsAt)) || unresolvedOrderNo !== null && !/^[A-Za-z0-9_-]{1,64}$/.test(unresolvedOrderNo)) return invalid();
	return {
		period: data.period,
		serverDate: date(data.serverDate),
		periodStart,
		periodEnd,
		resetsAt,
		unresolvedOrderNo,
		products
	};
}
function parsePeriodicPackReceipt(value) {
	const data = row(value);
	if (data.period !== "weekly" && data.period !== "monthly") return invalid();
	return {
		sku: text(data.sku),
		period: data.period,
		periodStart: date(data.periodStart),
		periodEnd: date(data.periodEnd),
		daoCrystal: integer(data.daoCrystal),
		spiritCrystal: integer(data.spiritCrystal),
		treasureMaps: integer(data.treasureMaps),
		promotionTexts: array(data.promotionTexts, text),
		items: array(data.items, (value) => {
			const item = row(value);
			if (item.kind !== "lootbox") return invalid();
			return {
				kind: item.kind,
				lootboxId: integer(item.lootboxId),
				name: text(item.name),
				quantity: integer(item.quantity)
			};
		})
	};
}

//#endregion
export { parsePeriodicPackReceipt, parseRechargePeriodicPacks };