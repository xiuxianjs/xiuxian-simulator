import { boolean, fields, integer, list, object, page, text } from "./schema.js";
import { mutation, observation } from "./mutation.js";
import { parseGuildLogs } from "../api/bot/queries.js";
import { parseRobotGuildContent } from "../api/bot/guild-content-robot-query.js";
import { parseGuildCreate } from "../api/bot/guild-membership-mutations.js";

//#region src/expose/guild-information-actions.ts
const empty = object({});
const content = object({
	guildName: text,
	notice: text,
	intro: text
}, ["notice", "intro"]);
const guildInformationActions = {
	create_guild: mutation("创建指定名称的宗门，消耗由服务端规定的资源；服务端校验名称、境界、余额和当前宗门状态。", "guild.create", object({ name: {
		type: "string",
		minLength: 1,
		maxLength: 100
	} }), object({
		guildId: integer,
		name: text
	}), (input) => `/创建宗门 ${input.name}`, (data, input) => {
		if (!data || typeof data !== "object" || data.outcome !== "result") throw new Error("创建宗门回执不完整");
		const result = parseGuildCreate(data.receipt);
		if (result.name !== input.name.trim()) throw new Error("创建宗门名称不匹配");
		return result;
	}),
	get_guild_notice: observation("查询当前宗门公告。", "guild.notice", empty, content, () => "/宗门公告", parseRobotGuildContent),
	get_guild_intro: observation("查询当前宗门简介。", "guild.intro", empty, content, () => "/宗门简介", parseRobotGuildContent),
	get_guild_logs: observation("分页查询本人所属宗门日志，服务端校验成员身份。", "guild.logs", object({ page }, ["page"]), object({
		hasGuild: boolean,
		guildName: text,
		...fields(integer, "total page totalPages"),
		logs: list(object({
			id: integer,
			content: text,
			formattedTime: text
		}))
	}), (input) => `/宗门日志 ${input.page ?? 1}`, parseGuildLogs, (input) => ({ page: input.page ?? 1 }))
};

//#endregion
export { guildInformationActions };