//#region src/utils/giftRecordPresentation.ts
const getTitle = (mode) => {
	if (mode === "send") return "赠礼记录（送出）";
	if (mode === "receive") return "赠礼记录（收到）";
	return "赠礼记录";
};
const getCmdPrefix = (mode) => {
	if (mode === "send") return "/赠礼记录 送出";
	if (mode === "receive") return "/赠礼记录 收到";
	return "/赠礼记录";
};
function presentGiftRecords(data, mode) {
	return {
		...data,
		title: getTitle(mode),
		cmdPrefix: getCmdPrefix(mode),
		mode
	};
}

//#endregion
export { presentGiftRecords };