//#region src/utils/name.ts
/**
* 输入系统自带名字，
* 根据原则进行切割
* 1、去掉所有字符
* 2、长度仅保留1-8个字
*/
function formatName(name) {
	if (!name) return "某某某";
	return name.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, "").slice(0, 8) ?? "某某某";
}

//#endregion
export { formatName };