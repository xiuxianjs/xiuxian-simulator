import { logger } from "alemonjs";

//#region src/response-apps/message/me/app.ts
const parseBanner = (raw) => {
	if (!raw) return;
	try {
		const parsed = JSON.parse(raw);
		return parsed && typeof parsed === "object" && "banner" in parsed && typeof parsed.banner === "string" ? parsed.banner : void 0;
	} catch {
		return;
	}
};
function App(overview) {
	try {
		const facts = overview.profile;
		const user = facts.user;
		if (!facts.found || !user || !facts.homeView) return { code: "USER_NOT_FOUND" };
		const signature = typeof user.signature === "string" ? user.signature.trim() : "";
		const profileName = typeof user.name === "string" && user.name.length > 0 ? user.name : "未命名";
		const renameValue = typeof user.name === "string" ? user.name : "";
		const bannerImageUrl = parseBanner(facts.title?.theme ?? null);
		const notifications = overview.notifications;
		const access = facts.access;
		return {
			code: "OK",
			data: {
				bannerImageUrl,
				guildName: overview.guildName,
				notifications,
				absenceDays: facts.absenceDays,
				atmosphere: overview.atmosphere,
				profile: {
					uid: user.id,
					name: profileName,
					hasMonthCard: facts.homeView.hasMonthCard === true,
					title: facts.title?.name ?? "无",
					genderText: user.gender === 1 ? "男" : "女",
					nextGenderText: user.gender === 1 ? "女" : "男",
					signature
				},
				stats: {
					combatPower: facts.combatPower,
					realmName: facts.homeView.realmName,
					spiritRootTitle: facts.homeView.spiritRootTitle ?? "暂无",
					experienceText: facts.homeView.experienceText,
					qi: {
						current: facts.qi.current,
						cap: facts.qi.cap,
						recoverText: facts.homeView.qiRecoverText
					},
					mental: {
						current: facts.mental.current,
						cap: facts.mental.cap,
						recoverText: facts.homeView.mentalRecoverText
					}
				},
				actions: {
					socialTargetUid: user.id,
					renameValue,
					canStoreGreenBottle: facts.canStoreGreenBottle,
					isNewcomer: facts.isNewcomer,
					isEarlyStarter: facts.homeView.isEarlyStarter,
					canAcceptApprentice: access.canAcceptDisciple,
					canJoinMasterAsDisciple: access.canJoinMasterAsDisciple,
					canUseSecondLayerFeature: access.canUseSecondLayerFeature,
					canUseFifthLayerFeature: access.canUseFifthLayerFeature,
					canUseSpar: access.canUseSpar,
					canJoinAlchemyGuide: access.canJoinAlchemyGuide,
					canUseMeridian: access.canUseMeridian,
					canUseProfessionAndCave: access.canUseProfessionAndCave,
					canUseSoulArtifact: access.canUseSoulArtifact,
					canUseSoulPath: access.canUseSoulPath,
					canAdvanceSoulArtifact: access.canAdvanceSoulArtifact,
					canUseRobberyLikePvp: access.canUseRobberyLikePvp
				}
			}
		};
	} catch (error) {
		logger.error(error);
		return { code: "LOAD_FAILED" };
	}
}

//#endregion
export { App as default };