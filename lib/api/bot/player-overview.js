import { getEventAccessFacts } from "./access-facts.js";
import { requestBackend } from "./client.js";
import { validatePlayerProfile } from "./player-profile-query.js";
import { validateHomeNotifications } from "./home-notification-queries.js";
import { validatePlayerPreferences } from "./player-preferences-queries.js";
import { validateGroupSubscription } from "./group-subscription-queries.js";
import { getCurrentEvent } from "alemonjs";

//#region src/api/bot/player-overview.ts
async function getBackendHomeOverview(bid, uid, request) {
	const facts = getEventAccessFacts(getCurrentEvent(), bid, uid);
	if (facts?.homeOverview !== void 0) try {
		return validateHomeOverview(facts.homeOverview, uid);
	} catch {}
	const receipt = facts?.resourceSettlement;
	return validateHomeOverview(await requestBackend(bid, "post_players_id_home_overview", {
		path: { id: uid },
		requestId: request?.requestId,
		...receipt ? { headers: { "X-Command-Resource-Receipt": receipt } } : {}
	}), uid);
}
function validateHomeOverview(data, uid) {
	const profile = validatePlayerProfile(data.profile);
	if (uid !== void 0 && profile.found && profile.user?.id !== uid) throw new Error("主页资料身份不匹配");
	const notifications = validateHomeNotifications(data.notifications);
	const atmosphere = data.atmosphere;
	if (profile.found && (!atmosphere || atmosphere.text !== null && typeof atmosphere.text !== "string" || ![
		"absence",
		"ambience",
		"none"
	].includes(atmosphere.kind) || atmosphere.kind === "none" !== (atmosphere.text === null))) throw new Error("主页氛围响应不完整");
	if (data.guildName !== void 0 && data.guildName !== null && typeof data.guildName !== "string") throw new Error("主页宗门响应不完整");
	return {
		profile,
		notifications,
		atmosphere,
		...data.guildName !== void 0 ? { guildName: data.guildName } : {}
	};
}
async function getBackendSettingsOverview(bid, uid, includeGroup) {
	if (!bid) throw new Error("查询缺少平台身份");
	return validateSettingsOverview(await requestBackend(bid, "get_players_id_settings_overview", {
		path: { id: uid },
		query: { includeGroup }
	}));
}
function validateSettingsOverview(data) {
	if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("设置数据不完整");
	const row = data;
	return {
		preferences: validatePlayerPreferences(row.preferences),
		subscription: validateGroupSubscription(row.subscription)
	};
}

//#endregion
export { getBackendHomeOverview, getBackendSettingsOverview, validateHomeOverview, validateSettingsOverview };