//#region src/response/email/findEmail/view.ts
function emailDetailView(result) {
	let goodsList = [];
	if (result.goods && Array.isArray(result.goods)) goodsList = result.goods;
	const hasGoods = goodsList.length > 0;
	const canClaim = result.canClaim;
	const canDelete = result.canDelete;
	return {
		code: "OK",
		emailId: result.id,
		name: result.name,
		subtitle: result.subtitle ?? "",
		data: result.data ?? "",
		state: result.state,
		goodsList,
		hasGoods,
		canClaim,
		canDelete
	};
}

//#endregion
export { emailDetailView };