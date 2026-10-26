//#region src/api/bot/player-profile-query.ts
const record = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
const text = (value) => value === null || typeof value === "string";
const finite = (value) => typeof value === "number" && Number.isFinite(value);
const integer = (value) => Number.isSafeInteger(value);
const resource = (value) => record(value) && finite(value.current) && integer(value.cap) && Number(value.cap) >= 0 && integer(value.regenIntervalMinutes) && Number(value.regenIntervalMinutes) > 0;
const accessKeys = [
	"canUseSecondLayerFeature",
	"canUseFifthLayerFeature",
	"canUseSpar",
	"canUseMeridian",
	"canUseProfessionAndCave",
	"canUseSoulArtifact",
	"canUseSoulPath",
	"canAdvanceSoulArtifact",
	"canJoinAlchemyGuide",
	"canUseRobberyLikePvp",
	"canJoinMasterAsDisciple",
	"canAcceptDisciple"
];
function validatePlayerProfile(data) {
	const user = record(data) ? data.user : null;
	const realm = record(data) ? data.realm : null;
	const title = record(data) ? data.title : null;
	const homeView = record(data) ? data.homeView : null;
	const validUser = user === null || record(user) && integer(user.id) && user.id > 0 && text(user.name) && (user.gender === null || integer(user.gender)) && text(user.signature) && finite(user.experience) && finite(user.qiValue) && finite(user.mentalValue) && (user.realmId === null || integer(user.realmId) && user.realmId > 0) && text(user.createdAt) && text(user.lastCheckInTime);
	const validRealm = realm === null || record(realm) && integer(realm.id) && realm.id > 0 && text(realm.name) && integer(realm.level) && integer(realm.stageLevel) && (realm.experienceLimit === null || finite(realm.experienceLimit));
	const validTitle = title === null || record(title) && integer(title.id) && title.id > 0 && text(title.name) && text(title.theme);
	const validAccess = record(data) && record(data.access) && (!data.found || accessKeys.every((key) => typeof data.access[key] === "boolean")) && Object.values(data.access).every((value) => typeof value === "boolean");
	const validHomeView = homeView === null || record(homeView) && (homeView.hasMonthCard === void 0 || typeof homeView.hasMonthCard === "boolean") && typeof homeView.realmName === "string" && (homeView.spiritRootTitle === void 0 || typeof homeView.spiritRootTitle === "string" && homeView.spiritRootTitle.length > 0) && typeof homeView.experienceText === "string" && typeof homeView.qiRecoverText === "string" && typeof homeView.mentalRecoverText === "string" && typeof homeView.isEarlyStarter === "boolean";
	if (!record(data) || typeof data.found !== "boolean" || !validUser || data.found && user === null || !validRealm || !validTitle || !text(data.themeConfig) || !text(data.foundationPrefix) || !resource(data.mental) || !resource(data.qi) || !validAccess || !validHomeView || data.found && homeView === null || typeof data.isNewcomer !== "boolean" || typeof data.canStoreGreenBottle !== "boolean" || data.absenceDays !== null && !finite(data.absenceDays) || !integer(data.combatPower) || data.combatPower < 0) throw new Error("我的资料响应不完整");
	return data;
}

//#endregion
export { validatePlayerProfile };