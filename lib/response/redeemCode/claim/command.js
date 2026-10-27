//#region src/response/redeemCode/claim/command.ts
function extractCode(messageText) {
	return messageText.replace(/^(!|！|\/|#|＃)?(礼包码|兑换码|礼品码)/, "").trim();
}

//#endregion
export { extractCode };