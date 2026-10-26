import { getBackendCheckInShop } from "../../../api/bot/checkin-shop-queries.js";

//#region src/response-apps/checkInShop/list/app.ts
async function App(params) {
	const result = await getBackendCheckInShop(params.bid, params.uid);
	return {
		code: "OK",
		data: {
			signInCoin: result.signInCoin,
			products: result.products.map((p) => ({
				id: p.id,
				name: p.name,
				description: p.description,
				quantity: p.quantity,
				price: p.price,
				monthlyLimit: p.monthlyLimit,
				bought: p.bought
			}))
		}
	};
}

//#endregion
export { App as default };