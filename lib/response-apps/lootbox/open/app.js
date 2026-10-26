import { displayCurrencyText } from "../../../constants/currency.js";
import { lootboxExpectedFailure, openBackendLootbox } from "../../../api/bot/lootbox-open.js";

//#region src/response-apps/lootbox/open/app.ts
async function App(params) {
	try {
		const messageText = params.messageText.replace(/^(!|！|\/|#|＃)?开启礼盒\s*/, "").trim();
		if (!messageText) return {
			code: "NO_INPUT",
			data: { message: "请输入礼盒名称" }
		};
		const args = messageText.split(/\s+/);
		const nameOrId = args[0];
		const parsedCount = args[1] === void 0 ? void 0 : Number(args[1]);
		const result = params.load ? await params.load() : await openBackendLootbox(params.bid, params.uid, nameOrId, Number.isFinite(parsedCount) ? parsedCount : void 0, params.request);
		return {
			code: "OK",
			data: {
				success: true,
				message: [
					`🎁 开启【${result.lootboxName}】${result.openCount > 1 ? `×${result.openCount}` : ""}，获得：`,
					"",
					...result.rewards.map((reward) => `  ✨ ${displayCurrencyText(reward.name)}${reward.quantity > 1 ? ` ×${reward.quantity}` : ""}`)
				].join("\n")
			}
		};
	} catch (error) {
		const expected = lootboxExpectedFailure(error);
		if (expected?.code === "NOT_FOUND") return {
			code: "NOT_FOUND",
			data: {
				message: `未找到名为【${expected.nameOrId}】的礼盒`,
				nameOrId: expected.nameOrId
			}
		};
		if (expected?.code === "NOT_OWNED") return {
			code: "NOT_OWNED",
			data: {
				message: `你没有【${expected.lootboxName}】`,
				lootboxName: expected.lootboxName
			}
		};
		return {
			code: "LOAD_FAILED",
			data: { message: "开启礼盒失败，请稍后重试" }
		};
	}
}

//#endregion
export { App as default };