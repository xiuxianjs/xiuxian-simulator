import { getCommandErrorMessage } from "../../../utils/commandError.js";
import { getBackendStorylineCatalog } from "../../../api/bot/storyline-catalog-queries.js";
import { logger } from "alemonjs";

//#region src/response-apps/storyline/list/app.ts
async function App(params) {
	let access = {
		canUseMeridian: false,
		canUseSecondLayerFeature: false,
		inTeam: false
	};
	try {
		const data = await getBackendStorylineCatalog(params.bid, params.uid, params.chapterArg, params.pageArg ?? 1);
		access = {
			canUseMeridian: data.canUseMeridian,
			canUseSecondLayerFeature: data.canUseSecondLayerFeature,
			inTeam: data.inTeam
		};
		if (data.overview) {
			const { chapters, ...overview } = data.overview;
			const arcOrder = [...new Set(chapters.map((chapter) => chapter.arc))];
			return {
				code: "OVERVIEW",
				access,
				data: {
					...overview,
					mentalValue: data.mentalValue,
					arcs: arcOrder.map((arc) => ({
						arc,
						chapters: chapters.filter((chapter) => chapter.arc === arc)
					}))
				}
			};
		}
		const detail = data.detail;
		if (detail.status !== "OK") return {
			code: "DETAIL_FAILED",
			access,
			data: { message: detail.statusMessage }
		};
		return {
			code: "DETAIL",
			access,
			data: {
				...detail,
				mentalValue: data.mentalValue,
				stages: detail.stages
			}
		};
	} catch (error) {
		logger.error("查询主线失败:", error);
		return {
			code: "LOAD_FAILED",
			access,
			data: { message: getCommandErrorMessage(error) }
		};
	}
}

//#endregion
export { App as default };