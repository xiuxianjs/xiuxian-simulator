import { boolean, object, text } from "./schema.js";
import { mutation, observation } from "./mutation.js";
import { validateRobotSettingsOverview } from "../api/bot/settings-robot-query.js";

//#region src/expose/settings-actions.ts
function booleanPreference(description, operation, field, command) {
	return mutation(description, operation, object({ value: boolean }), object({ [field]: boolean }), (input) => `/${command} ${input.value ? "开启" : "关闭"}`, (data, input) => {
		const row = data;
		if (row?.[field] !== input.value) throw new Error("设置回执与请求不匹配");
		return row;
	});
}
function confirmationPreference(operation, field, currency) {
	return mutation(`设置${currency}购买确认阈值；0 表示关闭该偏好阈值。Expose 商店购买仍须使用原预览引用确认。`, operation, object({ value: {
		type: "integer",
		minimum: 0,
		maximum: Number.MAX_SAFE_INTEGER
	} }), object({ [field]: {
		type: "integer",
		minimum: 0,
		maximum: Number.MAX_SAFE_INTEGER
	} }), (input) => `/配置${currency}确认 ${input.value}`, (data, input) => {
		const row = data;
		if (row?.[field] !== input.value) throw new Error("确认阈值回执与请求不匹配");
		return row;
	});
}
const rules = {
	none: "关闭",
	all: "所有人",
	friend: "仅好友",
	companion: "仅道侣"
};
const settingsActions = {
	get_player_settings: observation("查询本人游戏设置；preferencesJson 保留服务端原有字段值和旧配置类型，不包含群订阅信息。", "settings.overview", object({}), object({ preferencesJson: text }), () => "/我的设置", (data) => {
		validateRobotSettingsOverview(data);
		return { preferencesJson: JSON.stringify(data.preferences) };
	}, () => ({ includeGroup: false })),
	set_profile_hidden: booleanPreference("设置本人资料是否隐藏。", "settings.hide-profile", "hideProfile", "配置信息隐藏"),
	set_friend_team_approval: booleanPreference("设置是否自动审批好友的入队申请。", "settings.friend-team-approval", "autoApproveFriendTeam", "配置好友自动审批进队"),
	set_team_invitations_enabled: booleanPreference("设置是否接受队伍邀请。", "settings.team-invites", "teamInviteEnabled", "配置接受队伍邀请"),
	set_meditation_auto_boost: booleanPreference("设置闭关自动加速；开启后按服务端规则可能消耗灵石。", "settings.meditation-auto-boost", "meditationAutoBoost", "配置闭关自动加速"),
	set_spirit_crystal_confirmation: confirmationPreference("settings.spirit-crystal-confirmation", "confirmSpiritCrystal", "灵晶"),
	set_dao_crystal_confirmation: confirmationPreference("settings.dao-crystal-confirmation", "confirmDaoCrystal", "道晶"),
	set_team_dungeon_energy: mutation("设置组队秘境不消耗精力选项；value=true 表示不消耗，实际行为由服务端决定。", "settings.team-dungeon-energy", object({ value: boolean }), object({ teamDungeonNoMental: boolean }), (input) => `/配置组队精力 ${input.value ? "不消耗" : "消耗"}`, (data, input) => {
		const row = data;
		if (row?.teamDungeonNoMental !== input.value) throw new Error("组队精力设置回执与请求不匹配");
		return row;
	}),
	set_dungeon_battle_mode: mutation("设置秘境战斗模式为 auto 自动或 manual 手动。", "settings.dungeon-battle-mode", object({ value: {
		type: "string",
		enum: ["auto", "manual"]
	} }), object({ dungeonBattleMode: {
		type: "string",
		enum: ["auto", "manual"]
	} }), (input) => `/配置秘境模式 ${input.value === "auto" ? "自动" : "手动"}`, (data, input) => {
		const row = data;
		if (row?.dungeonBattleMode !== input.value) throw new Error("秘境模式回执与请求不匹配");
		return row;
	}),
	set_team_auto_accept: mutation("设置队伍邀请自动接受规则：none、all、friend 或 companion。", "settings.team-auto-accept-invite", object({ value: {
		type: "string",
		enum: [
			"none",
			"all",
			"friend",
			"companion"
		]
	} }), object({ teamAutoAcceptInvite: {
		type: "string",
		enum: [
			"none",
			"all",
			"friend",
			"companion"
		]
	} }), (input) => `/配置自动同意队伍邀请 ${rules[input.value]}`, (data, input) => {
		const row = data;
		if (row?.teamAutoAcceptInvite !== input.value) throw new Error("邀请规则回执与请求不匹配");
		return row;
	})
};

//#endregion
export { settingsActions };