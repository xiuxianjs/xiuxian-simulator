//#region src/utils/formatHelper.ts
/**
* 通用格式化工具
*/
/** 格式化大数字为中文可读形式（万 / 亿） */
function formatNumber(n) {
	if (n >= 1e8) return `${(n / 1e8).toFixed(2)}亿`;
	if (n >= 1e4) return `${(n / 1e4).toFixed(1)}万`;
	return String(n);
}

//#endregion
export { formatNumber };