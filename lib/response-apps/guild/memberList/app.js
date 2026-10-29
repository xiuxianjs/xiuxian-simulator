import { getBackendGuildMembers } from "../../../api/bot/queries.js";
import { PAGE_SIZE } from "../../../constants/common.js";
import "../../../constants/index.js";
import "../../../api/bot/index.js";

//#region src/response-apps/guild/memberList/app.ts
async function App(params) {
	try {
		const data = await getBackendGuildMembers(params.bid, params.uid, params.page ?? 1, params.pageSize ?? 5);
		if (data.membershipStatus !== "joined") return {
			code: "FAIL",
			data: { message: data.membershipStatus === "not_joined" ? "你还未加入任何宗门" : data.membershipStatus === "guild_missing" ? "未找到宗门信息" : "未找到宗门成员信息" }
		};
		return {
			code: "OK",
			data
		};
	} catch (error) {
		return {
			code: "LOAD_FAILED",
			data: { message: error?.message ?? "获取成员列表失败" }
		};
	}
}

//#endregion
export { App as default };