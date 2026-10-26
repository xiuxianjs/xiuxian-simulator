import { getBackendGuildReview } from "../../../api/bot/guild-review-queries.js";

//#region src/response-apps/guild/reviewApplications/app.ts
async function App(params) {
	try {
		const data = await getBackendGuildReview(params.bid, params.uid, params.page);
		if (!data.hasGuild) return {
			code: "NO_GUILD",
			data: { message: "您还未加入任何宗门，无法查看申请审核" }
		};
		if (!data.canReview) return {
			code: "NO_PERMISSION",
			data: {
				message: "只有长老及以上才能执行此操作",
				roleName: data.roleName ?? "未知"
			}
		};
		const result = {
			applications: data.applications.map((row) => ({
				...row,
				userName: row.userName ?? "未知",
				realmName: row.realmName ?? "未知",
				createdAt: row.createdAt
			})),
			total: data.total,
			totalPages: data.totalPages,
			currentPage: data.currentPage
		};
		return {
			code: "OK",
			data: {
				guildName: data.guildName ?? "",
				result
			}
		};
	} catch (error) {
		return {
			code: "LOAD_FAILED",
			data: { message: error?.message ?? "查看申请列表失败" }
		};
	}
}

//#endregion
export { App as default };