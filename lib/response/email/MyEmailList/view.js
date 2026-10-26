//#region src/response/email/MyEmailList/view.ts
const PAGE_SIZE = 5;
function emailListView(result, page) {
	const visibleEmails = result.list ?? [];
	const totalPage = Math.max(1, Math.ceil(result.total / PAGE_SIZE));
	if (visibleEmails.length === 0) return {
		code: "EMPTY",
		total: result.total
	};
	return {
		code: "OK",
		list: visibleEmails.map((emailItem) => {
			const goodsList = emailItem["email.goods"] ?? [];
			return {
				emailId: emailItem["email.id"],
				name: emailItem["email.name"],
				subtitle: emailItem["email.subtitle"] ?? "",
				state: emailItem.state,
				goodsList: Array.isArray(goodsList) ? goodsList : [],
				canClaim: emailItem.canClaim,
				canDelete: emailItem.canDelete
			};
		}),
		page,
		totalPage,
		total: result.total,
		hasClaimable: result.hasClaimable,
		hasDeletable: result.hasDeletable
	};
}

//#endregion
export { emailListView };