import { PAGE_SIZE } from "../../constants/common.js";
import "../../constants/index.js";

//#region src/response/cavePlot/pagination.ts
/** 页码单独标记，不能把访友 UID、地块号或灵种名称当成页码。 */
function parseCavePage(text) {
	const match = text.trim().match(/\s+页(?:\s+(\S+))?\s*$/);
	const value = Number(match?.[1] ?? 1);
	const page = Number.isFinite(value) ? Math.max(1, Math.floor(value)) : value === Infinity ? Number.MAX_SAFE_INTEGER : 1;
	return {
		text: match ? text.trim().slice(0, match.index).trimEnd() : text.trim(),
		page
	};
}
/** 仅裁剪气泡展示；数据和可执行动作仍来自同一次服务端查询。 */
function paginateCaveItems(items, requestedPage, command) {
	const total = Math.max(1, Math.ceil(items.length / 5));
	const page = Math.min(total, Number.isFinite(requestedPage) ? Math.max(1, Math.floor(requestedPage)) : 1);
	return {
		items: items.slice((page - 1) * 5, page * 5),
		nav: total > 1 ? {
			current: page,
			total,
			count: items.length,
			command
		} : void 0
	};
}
function cavePageForPlot(plots, plotIndex) {
	const index = plots.findIndex((plot) => plot.plotIndex === plotIndex);
	return Math.floor(Math.max(0, index) / 5) + 1;
}

//#endregion
export { cavePageForPlot, paginateCaveItems, parseCavePage };