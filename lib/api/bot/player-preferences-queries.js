//#region src/api/bot/player-preferences-queries.ts
function validatePlayerPreferences(data) {
	if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("玩家设置数据不完整");
	const row = data;
	if ([
		"dungeonBattleMode",
		"teamDungeonNoMental",
		"autoApproveFriendTeam",
		"hideProfile",
		"confirmSpiritCrystal",
		"confirmDaoCrystal",
		"teamInviteEnabled",
		"teamAutoAcceptInvite"
	].some((key) => !Object.hasOwn(row, key) || row[key] === void 0)) throw new Error("玩家设置字段不完整");
	return {
		meditationAutoBoost: row.meditationAutoBoost === true,
		dungeonBattleMode: row.dungeonBattleMode,
		teamDungeonNoMental: row.teamDungeonNoMental,
		autoApproveFriendTeam: row.autoApproveFriendTeam,
		hideProfile: row.hideProfile,
		confirmSpiritCrystal: row.confirmSpiritCrystal,
		confirmDaoCrystal: row.confirmDaoCrystal,
		teamInviteEnabled: row.teamInviteEnabled,
		teamAutoAcceptInvite: row.teamAutoAcceptInvite
	};
}

//#endregion
export { validatePlayerPreferences };