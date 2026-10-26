import { getBackendTianshiBaoluPanel } from "../../api/bot/tianshi-baolu-panel.js";
import { logger } from "alemonjs";

//#region src/response-apps/tianshiBaolu/app.ts
const TIANSHI_BAOLU_CATEGORY_MAP = {
	全部: "all",
	装备: "equipment_set",
	功法: "skill_book",
	本命: "soul_artifact"
};
const parseTianshiBaoluCommand = (messageText) => {
	const match = (messageText ?? "").trim().match(/^(!|！|\/|#|＃)?天师宝录(?:\s+(\S+))?(?:\s+p(\d+))?$/);
	const rawCategory = match?.[2] ?? "";
	const pageFromCategory = rawCategory.match(/^p(\d+)$/);
	const categoryLabel = pageFromCategory ? "全部" : rawCategory || "全部";
	const category = TIANSHI_BAOLU_CATEGORY_MAP[categoryLabel] ?? "all";
	const page = Math.max(1, Number(match?.[3] ?? pageFromCategory?.[1] ?? 1));
	return {
		category,
		categoryLabel: category === "all" ? "全部" : categoryLabel,
		page
	};
};
async function App(params) {
	try {
		return {
			code: "OK",
			data: await getBackendTianshiBaoluPanel(params.bid, params.uid, params.category, params.page)
		};
	} catch (error) {
		logger.error("[天师宝录] 查询失败:", error);
		return {
			code: "LOAD_FAILED",
			data: { message: "查看天师宝录失败，请稍后再试" }
		};
	}
}

//#endregion
export { TIANSHI_BAOLU_CATEGORY_MAP, App as default, parseTianshiBaoluCommand };