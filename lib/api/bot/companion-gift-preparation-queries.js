//#region src/api/bot/companion-gift-preparation-queries.ts
const record = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
const integer = (value) => typeof value === "number" && Number.isSafeInteger(value);
const positiveInteger = (value) => integer(value) && value > 0;
function parseCompanionGiftTargets(data, giftName) {
	if (!record(data) || data.giftExists !== null && typeof data.giftExists !== "boolean" || !Array.isArray(data.friends)) throw new Error("赠礼好友候选数据不完整");
	if (giftName === void 0 && data.giftExists !== null || giftName !== void 0 && typeof data.giftExists !== "boolean") throw new Error("赠礼名称校验数据不完整");
	if (data.directCategory !== void 0 && (typeof data.directCategory !== "string" || ![
		"丹药",
		"道具",
		"图纸",
		"丹方",
		"种子",
		"道侣道具"
	].includes(data.directCategory))) throw new Error("直接赠送类别数据不完整");
	const friends = data.friends.map((friend) => {
		if (!record(friend) || !positiveInteger(friend.friendId) || typeof friend.friendName !== "string" || typeof friend.isCompanion !== "boolean") throw new Error("赠礼好友候选数据不完整");
		return {
			friendId: friend.friendId,
			friendName: friend.friendName,
			isCompanion: friend.isCompanion
		};
	});
	return {
		giftExists: data.giftExists,
		friends,
		directCategory: data.directCategory
	};
}
function parseCompanionGiftOptions(data) {
	if (!record(data) || typeof data.targetFound !== "boolean" || !positiveInteger(data.targetId) || data.targetName !== null && typeof data.targetName !== "string" || !Array.isArray(data.gifts) || !integer(data.dailyPremiumGiftUsed) || !integer(data.dailyPremiumGiftLimit) || !integer(data.weeklyIntimacyUsed) || !integer(data.weeklyIntimacyLimit)) throw new Error("赠礼选项数据不完整");
	const gifts = data.gifts.map((gift) => {
		if (!record(gift) || !positiveInteger(gift.itemId) || typeof gift.name !== "string" || !integer(gift.quantity) || !integer(gift.intimacy) || typeof gift.isPremium !== "boolean") throw new Error("赠礼选项数据不完整");
		return {
			itemId: gift.itemId,
			name: gift.name,
			quantity: gift.quantity,
			intimacy: gift.intimacy,
			isPremium: gift.isPremium
		};
	});
	return {
		targetFound: data.targetFound,
		targetId: data.targetId,
		targetName: data.targetName,
		gifts,
		dailyPremiumGiftUsed: data.dailyPremiumGiftUsed,
		dailyPremiumGiftLimit: data.dailyPremiumGiftLimit,
		weeklyIntimacyUsed: data.weeklyIntimacyUsed,
		weeklyIntimacyLimit: data.weeklyIntimacyLimit
	};
}

//#endregion
export { parseCompanionGiftOptions, parseCompanionGiftTargets };