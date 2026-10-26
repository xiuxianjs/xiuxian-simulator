import { formatGameDate, formatGameTime } from "../../utils/gameTime.js";

//#region src/api/bot/membership-panels.ts
function formatTheme(config) {
	if (config === null) return;
	try {
		return JSON.parse(config) ?? void 0;
	} catch {
		return;
	}
}
function projectRightsPanel(data, avatarURL) {
	const vipLevel = data.vipLevel;
	const totalRechargeAmount = data.totalRechargeAmount / 100;
	const monthCardExpire = data.monthCard.expireTime;
	const seclusionPassExpire = data.seclusionPass.expireTime;
	return {
		code: "OK",
		access: {
			canUseMeridian: data.canUseMeridian,
			canUseSoulPath: data.canUseSoulPath
		},
		data: {
			avatarURL,
			theme: formatTheme(data.activeThemeConfig),
			name: data.name,
			vipLevel,
			totalRechargeAmount,
			progressText: data.progressText,
			firstRechargeTimeText: data.firstRechargeTime ? formatGameDate(data.firstRechargeTime) : "未充值",
			monthCardValid: data.monthCard.active,
			monthCardExpireText: data.monthCard.active && monthCardExpire ? formatGameTime(monthCardExpire) : "未开通或已过期",
			monthCardRemainingDays: data.monthCard.remainingDays,
			monthCardTotalDays: data.monthCard.totalDays,
			monthCardMaxDays: data.monthCard.maxDays,
			monthCardRemainingQuota: data.monthCard.remainingQuota,
			monthCardInstantRewards: data.monthCardInstantRewards,
			monthCardDailyClaimable: data.monthCard.daily.claimableCount,
			monthCardDailyClaimed: data.monthCard.daily.claimedCount,
			monthCardDailyUpcoming: data.monthCard.daily.upcomingCount,
			seclusionPassValid: data.seclusionPass.active,
			seclusionPassExpireText: data.seclusionPass.active && seclusionPassExpire ? formatGameTime(seclusionPassExpire) : "未开通或已过期",
			seclusionPassRemainingDays: data.seclusionPass.remainingDays,
			seclusionPriceText: data.seclusionPriceText,
			seclusionRewards: data.seclusionRewards
		}
	};
}
function projectPrivilegesPanel(data, avatarURL) {
	if (!data.found) return { code: "INVALID_USER" };
	const { name, vipLevel, hasMonthCard } = data;
	const totalRechargeAmount = data.totalRechargeAmount / 100;
	let theme;
	if (data.activeThemeConfig !== null) try {
		theme = JSON.parse(data.activeThemeConfig) ?? void 0;
	} catch {
		theme = void 0;
	}
	return {
		code: "OK",
		access: {
			canUseMeridian: data.canUseMeridian,
			canUseSoulPath: data.canUseSoulPath
		},
		data: {
			avatarURL,
			theme,
			name,
			vipLevel,
			totalRechargeAmount,
			vipPrivileges: data.vipPrivileges,
			monthCardPrivileges: data.monthCardPrivileges,
			hasMonthCard
		}
	};
}

//#endregion
export { projectPrivilegesPanel, projectRightsPanel };