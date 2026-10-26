import { repeatPresentationHeaders } from "./repeat-presentation.js";
import { requestBackend, writeContext } from "./client.js";

//#region src/api/bot/player-shop-description.ts
async function updateBackendPlayerShopDescription(bid, uid, description, request, repeatCommand) {
	if (!bid) throw new Error("操作缺少平台身份");
	const context = writeContext(request);
	const data = await requestBackend(bid, "put_players_id_market_shop_description", {
		headers: repeatPresentationHeaders(repeatCommand),
		path: { id: uid },
		body: { description },
		...context
	});
	if (data?.updated !== true) throw new Error("店铺简介更新响应不完整");
	return data;
}

//#endregion
export { updateBackendPlayerShopDescription };