//#region src/response/redeemCode/claim/command.ts
function extractCode(messageText) {
	return messageText.replace(/^(!|！|\/|#|＃)?(礼包码|兑换码|礼品码|领取回归礼包|领取测试礼包)/, "").trim();
}

//#endregion
export { extractCode };