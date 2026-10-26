//#region src/utils/alchemyQueryPresentation.ts
function presentAlchemyLeaderboard(result, currentUid) {
	const entry = (item) => ({
		rank: item.rank,
		uid: item.playerId,
		name: item.name,
		level: item.level,
		title: item.title,
		exp: item.exp,
		totalCrafts: item.totalCrafts,
		successRate: item.successRate,
		canLike: item.canLike
	});
	return {
		code: "OK",
		data: {
			currentUid,
			self: result.self,
			nearby: result.nearby.map(entry),
			total: result.total,
			page: {
				current: result.page,
				total: result.totalPages
			},
			items: result.items.map((item) => ({
				rank: item.rank,
				uid: item.playerId,
				name: item.name,
				level: item.level,
				title: item.title,
				exp: item.exp,
				totalCrafts: item.totalCrafts,
				successRate: item.successRate,
				canLike: item.canLike
			}))
		}
	};
}

//#endregion
export { presentAlchemyLeaderboard };