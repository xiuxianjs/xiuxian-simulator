import { boolean, integer, list, object, page, text } from "./schema.js";
import { mutation, observation } from "./mutation.js";
import { parseGroupSubscriptionResult } from "../api/bot/group-subscription-business.js";
import { validateRobotSettingsOverview } from "../api/bot/settings-robot-query.js";
import { parseNotificationHistory } from "../api/bot/notification-history-queries.js";
import { validateBackendThemes } from "../api/bot/theme-queries.js";
import { validateBackendActivatedTheme, validateBackendDeactivatedTheme } from "../api/bot/theme-state.js";
import { validateBackendInkMode } from "../api/bot/theme-ink-mode.js";
import { parseFlyMailNotice } from "../utils/flyMailPresentation.js";
import { ExposeError } from "alemonjs";

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
	get_group_notification_subscription: observation("查询本人群通知订阅及投递状态；found=false 表示没有订阅，blocked 表示平台主动通知受限。", "settings.overview", object({}), object({
		found: boolean,
		subscription: object({
			platform: text,
			channelId: text,
			targetScope: {
				type: "string",
				enum: ["group", "channel"]
			},
			isEnabled: boolean,
			failureCount: integer,
			botId: text,
			lastDeliveryAt: text,
			lastError: text,
			channelState: object({
				state: {
					type: "string",
					enum: [
						"allowed",
						"blocked",
						"unknown"
					]
				},
				retryAt: integer,
				source: text,
				updatedAt: integer
			}, [
				"retryAt",
				"source",
				"updatedAt"
			])
		}, [
			"botId",
			"lastDeliveryAt",
			"lastError",
			"channelState"
		])
	}, ["subscription"]), () => "/我的设置", (data) => {
		const { subscription } = validateRobotSettingsOverview(data);
		return subscription ? {
			found: true,
			subscription
		} : { found: false };
	}, () => ({ includeGroup: true })),
	enable_group_notifications: mutation("为当前消息所在群开启或切换通知订阅，目标群仅来自真实消息上下文，服务端校验平台和可用性。", "notifications.group-enable", object({}), object({ switched: boolean }), () => "/开启群订阅", (data) => parseGroupSubscriptionResult(data, "enable"), (_, event) => ({
		isPrivate: event.isPrivate === true || event.name === "private.message.create",
		platform: String(event.Platform ?? ""),
		channelId: event.ChannelId ? String(event.ChannelId) : "",
		botId: event.BotId ?? null,
		targetScope: event.Target?.scope === "channel" || event.SpaceId?.startsWith("GUILD:") ? "channel" : "group"
	})),
	disable_group_notifications: mutation("关闭本人的群通知订阅，服务端按真实消息上下文校验。", "notifications.group-disable", object({}), object({ disabled: boolean }), () => "/关闭群订阅", (data) => parseGroupSubscriptionResult(data, "disable"), (_, event) => ({
		isPrivate: event.isPrivate === true || event.name === "private.message.create",
		platform: String(event.Platform ?? ""),
		channelId: event.ChannelId ? String(event.ChannelId) : "",
		botId: event.BotId ?? null,
		targetScope: event.Target?.scope === "channel" || event.SpaceId?.startsWith("GUILD:") ? "channel" : "group"
	})),
	get_themes: observation("查询本人可用主题、当前激活状态与自定义权限。", "themes.overview", object({}), object({
		themes: list(object({
			id: integer,
			name: text,
			config: text,
			source: text,
			isActive: boolean,
			sortOrder: integer
		})),
		permission: object({
			canCustomEdit: boolean,
			maxCustomSlots: integer,
			requiredVipLevel: integer
		}, ["requiredVipLevel"])
	}), () => "/我的主题", validateBackendThemes),
	activate_theme: mutation("切换到本人可用的指定主题；结果以 outcome 为准。", "themes.activate", object({ themeId: {
		type: "integer",
		minimum: 1,
		maximum: Number.MAX_SAFE_INTEGER
	} }), object({
		outcome: text,
		id: integer,
		name: text
	}, ["id", "name"]), (input) => `/切换主题 ${input.themeId}`, (data, input) => validateBackendActivatedTheme(data, input.themeId)),
	deactivate_theme: mutation("关闭当前主题并返回是否存在被关闭的主题。", "themes.deactivate", object({}), object({ removed: boolean }), () => "/关闭主题", validateBackendDeactivatedTheme),
	set_theme_ink_mode: mutation("设置当前主题墨色；code 为 NO_ACTIVE_THEME 时没有激活主题，设置未生效。", "themes.ink-mode", object({ mode: {
		type: "string",
		enum: ["ink", "dark"]
	} }), object({
		code: text,
		mode: text
	}), (input) => `/切换墨色模式 ${input.mode === "ink" ? "宣纸水墨" : "深底暗黑"}`, (data, input) => validateBackendInkMode(data, input.mode)),
	get_notification_history: observation("私聊中分页读取本人历史通知；每页最多五条。历史记录不代表当前任务或奖励状态，飞信内容仅按服务端返回提供。", "notifications.history", object({ page }, ["page"]), object({
		page: integer,
		hasNext: boolean,
		nextCursor: text,
		items: list(object({
			id: text,
			time: text,
			text,
			delivery: text,
			flymail: object({
				scope: text,
				messageId: integer,
				conversationId: integer,
				senderUid: integer,
				senderName: text,
				content: text,
				createdAt: text
			})
		}, ["flymail"]))
	}, ["nextCursor"]), (input) => `/我的通知 ${input.page ?? 1}`, (data, input) => {
		const result = parseNotificationHistory(data, input.page ?? 1);
		return {
			...result,
			items: result.items.map((item) => ({
				...item,
				flymail: parseFlyMailNotice(item.flymail)
			}))
		};
	}, (input, event) => {
		if (event.name !== "private.message.create" || event.isPrivate === false || event.IsPrivate === false) throw new ExposeError("FORBIDDEN", "通知记录仅限私聊查询");
		return { pageText: String(input.page ?? 1) };
	}),
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