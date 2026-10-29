import { boolean, fields, integer, list, object, text } from "./schema.js";
import { mutation, observation } from "./mutation.js";
import { parseRobotGuildUpgrade } from "../api/bot/guild-upgrade-robot-query.js";
import { parseGuildShopPage } from "../api/bot/guild-shop-page.js";
import { parseGuildShopAutoRefresh } from "../api/bot/guild-shop-auto-refresh.js";
import { parseRobotGuildAutoRefresh } from "../api/bot/guild-auto-refresh-robot-query.js";
import { ExposeError } from "alemonjs";

//#region src/expose/guild-building-actions.ts
const empty = object({});
const refreshState = object({
	outcome: text,
	enabled: boolean,
	hours: list(integer),
	version: text,
	isLeader: boolean,
	isViceLeader: boolean
});
function parseRefreshState(data, expected) {
	const result = parseRobotGuildAutoRefresh(data);
	if (result.outcome !== expected) throw new Error("宗门自动刷新状态不完整");
	if (result.outcome === "view") return result.state;
	return parseGuildShopAutoRefresh(data.data);
}
const upgradeResult = object({
	message: text,
	receipt: object({
		...fields(integer, "guildId level spiritStoneCost prestigeCost"),
		...fields(text, "guildName kind message")
	})
});
function upgrade(kind, word) {
	return mutation(`提升当前宗门${word}；直接消耗宗门资源，服务端检查职位、当前等级和实际费用。`, `guild.upgrade-${kind}`, empty, upgradeResult, () => `/提升宗门${word}`, (data) => parseRobotGuildUpgrade(data, kind));
}
const guildBuildingActions = {
	get_guild_auto_refresh: observation("查询宗门商店自动刷新状态、整点及本人权限；不修改设置。", "guild.auto-refresh", empty, refreshState, () => "/宗门商店自动刷新", (data) => parseRefreshState(data, "view"), () => ({ mode: "view" })),
	set_guild_auto_refresh: mutation("设置宗门商店自动刷新；hours 设置整点并开启，disable 清空整点，enable 需要已有整点。失败时可能已修改配置，先重新查询。", "guild.auto-refresh", object({
		mode: {
			type: "string",
			enum: [
				"enable",
				"disable",
				"hours"
			]
		},
		hours: list({
			type: "integer",
			minimum: 0,
			maximum: 23
		})
	}, ["hours"]), refreshState, (input) => `/宗门商店自动刷新 ${input.mode === "hours" ? input.hours?.join(" ") : input.mode === "enable" ? "开启" : "关闭"}`, (data) => parseRefreshState(data, "set"), (input) => input.mode === "hours" ? {
		mode: input.mode,
		hours: input.hours
	} : { mode: input.mode }, (input) => {
		if (input.mode === "hours" ? !input.hours || input.hours.length < 1 || input.hours.length > 3 || new Set(input.hours).size !== input.hours.length : input.hours !== void 0) throw new ExposeError("INVALID_INPUT", "请按模式提供 1 至 3 个不同整点，或省略整点");
	}),
	upgrade_guild_level: upgrade("level", "等级"),
	upgrade_guild_vein: upgrade("vein", "灵脉"),
	upgrade_guild_shop: upgrade("shop", "商店"),
	refresh_guild_shop: mutation("手动刷新宗门商店并消耗服务端计算的资源；失败反馈也可能发生在刷新已提交之后，先查询商店及资源，不要自动重复刷新。", "guild.shop-refresh", empty, object({
		receipt: object(fields(integer, "guildId cost remaining itemCount")),
		pageError: text
	}, ["pageError"]), () => "/宗门商店 刷新", (data) => {
		if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("宗门商店刷新回执不完整");
		const row = data;
		const receipt = row.receipt;
		if (!receipt || ![
			"guildId",
			"cost",
			"remaining",
			"itemCount"
		].every((key) => Number.isSafeInteger(receipt[key]))) throw new Error("宗门商店刷新回执不完整");
		if (typeof row.pageError === "string") return {
			receipt,
			pageError: row.pageError
		};
		try {
			parseGuildShopPage(row.page);
		} catch {
			return {
				receipt,
				pageError: "刷新已完成，商店页面读取失败，请重新查询"
			};
		}
		return { receipt };
	})
};

//#endregion
export { guildBuildingActions };