import { requestBackend } from "./client.js";

//#region src/api/bot/guild-home-query.ts
function record(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("宗门主页数据不完整");
	return value;
}
function number(value) {
	if (typeof value !== "number" || !Number.isSafeInteger(value)) throw new Error("宗门主页缺少数值");
	return value;
}
function refreshHour(value) {
	if (typeof value !== "number" || !Number.isFinite(value)) throw new Error("宗门主页缺少数值");
	return value;
}
function boolean(value) {
	if (typeof value !== "boolean") throw new Error("宗门主页缺少状态");
	return value;
}
function nullableText(value) {
	if (value === null) return null;
	if (typeof value !== "string") throw new Error("宗门主页缺少文本");
	return value;
}
function nullableNumber(value) {
	return value === null ? null : number(value);
}
function membership(value) {
	if (value === null) return null;
	const row = record(value);
	return {
		guildId: number(row.guildId),
		guildName: nullableText(row.guildName),
		roleName: nullableText(row.roleName),
		isDeputy: boolean(row.isDeputy),
		canUpgrade: boolean(row.canUpgrade),
		isLeader: boolean(row.isLeader)
	};
}
function guild(value) {
	if (value === null) return null;
	const row = record(value);
	const leader = record(row.leader);
	const refresh = record(row.shopAutoRefresh);
	if (!Array.isArray(row.titles) || !row.titles.every((item) => typeof item === "string") || !Array.isArray(refresh.hours)) throw new Error("宗门主页列表不完整");
	return {
		level: number(row.level),
		leader: {
			userId: number(leader.userId),
			name: nullableText(leader.name)
		},
		spiritStone: number(row.spiritStone),
		spiritStoneCap: number(row.spiritStoneCap),
		prestige: number(row.prestige),
		prestigeCap: number(row.prestigeCap),
		veinLevel: nullableNumber(row.veinLevel),
		shopLevel: nullableNumber(row.shopLevel),
		viceLeaderCount: number(row.viceLeaderCount),
		viceLeaderLimit: number(row.viceLeaderLimit),
		elderCount: number(row.elderCount),
		elderLimit: number(row.elderLimit),
		memberCount: number(row.memberCount),
		memberCapacity: number(row.memberCapacity),
		minRealmName: nullableText(row.minRealmName),
		notice: nullableText(row.notice),
		titles: row.titles,
		shopAutoRefresh: {
			enabled: boolean(refresh.enabled),
			hours: refresh.hours.map(refreshHour)
		}
	};
}
async function getBackendGuildHome(bid, uid) {
	if (!bid) throw new Error("查询缺少平台身份");
	return parseGuildHome(await requestBackend(bid, "get_players_id_guild_home", { path: { id: uid } }));
}
function parseGuildHome(value) {
	const data = record(value);
	const access = record(data.access);
	const unlock = record(data.unlockLevels);
	const storyline = record(data.storyline);
	return {
		hasGuild: boolean(data.hasGuild),
		access: {
			canCreateOrApplyGuild: boolean(access.canCreateOrApplyGuild),
			canCreateGuild: access.canCreateGuild === void 0 ? false : boolean(access.canCreateGuild)
		},
		membership: membership(data.hasGuild === false && data.membership === void 0 ? null : data.membership),
		guild: guild(data.hasGuild === false && data.guild === void 0 ? null : data.guild),
		unlockLevels: {
			shop: nullableNumber(unlock.shop),
			viceLeader: nullableNumber(unlock.viceLeader),
			elder: nullableNumber(unlock.elder)
		},
		pendingApplications: number(data.pendingApplications),
		storyline: {
			initialized: boolean(storyline.initialized),
			allCleared: boolean(storyline.allCleared),
			stageIndex: nullableNumber(storyline.stageIndex)
		}
	};
}

//#endregion
export { getBackendGuildHome, parseGuildHome };