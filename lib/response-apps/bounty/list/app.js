import { PAGE_SIZE } from "../../../constants/common.js";
import "../../../constants/index.js";
import { getBackendBounties } from "../../../api/bot/bounty-queries.js";

//#region src/response-apps/bounty/list/app.ts
/**
* 悬赏榜 - 业务逻辑层
*/
async function App(params) {
	let { page } = params;
	if (!Number.isFinite(page) || page < 1) page = 1;
	const { list, total } = await getBackendBounties(params.bid, page);
	const totalPages = Math.ceil(total / 5);
	return {
		code: "OK",
		data: {
			list,
			total,
			page,
			totalPages
		}
	};
}

//#endregion
export { App as default };