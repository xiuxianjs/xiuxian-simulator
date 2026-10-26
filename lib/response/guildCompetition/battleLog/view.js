import { formatGameTime, parseGameTime } from "../../../utils/gameTime.js";

//#region src/response/guildCompetition/battleLog/view.ts
function competitionBattleView(data) {
	if (!data.hasGuild) return {
		code: "NO_GUILD",
		data: { message: "你还未加入宗门" }
	};
	if (!data.hasTeams) return {
		code: "NO_RECORDS",
		data: { message: "暂无宗门大比参赛记录" }
	};
	if (!data.count || !data.records.length) return {
		code: "NO_RECORDS",
		data: { message: "暂无战斗记录" }
	};
	return {
		code: "OK",
		data: {
			records: data.records.map((row) => {
				const battleTime = parseGameTime(row.battleTime)?.toDate() ?? /* @__PURE__ */ new Date(NaN);
				return {
					...row,
					battleTime,
					formattedTime: formatGameTime(battleTime),
					opponentName: row.opponentName ?? `队伍${row.opponentTeamId}`,
					stageName: row.stage === 1 ? "淘汰赛" : row.stage === 2 ? "晋级赛" : `未知(${row.stage})`
				};
			}),
			page: data.page,
			totalPages: data.totalPages,
			count: data.count
		}
	};
}

//#endregion
export { competitionBattleView };