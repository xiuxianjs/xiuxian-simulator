//#region src/api/schemas/ranking-values.ts
function record(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("查询接口返回格式不完整");
	return value;
}
function number(value, message = "查询接口缺少数值字段") {
	if (typeof value !== "number" || !Number.isSafeInteger(value)) throw new Error(message);
	return value;
}
function text(value) {
	if (typeof value !== "string") throw new Error("查询接口缺少文本字段");
	return value;
}

//#endregion
export { number, record, text };