import { boolean, fields, integer, list, object, page, text } from "./schema.js";
import { mutation } from "./mutation.js";
import { parseGuildMembers } from "../api/bot/queries.js";
import { parseGuildApplicationDecision, parseGuildApply } from "../api/bot/guild-membership-mutations.js";
import { parseRobotGuildList } from "../api/bot/guild-directory-robot-query.js";
import { parseGuildApplications } from "../api/bot/guild-application-queries.js";
import { parseGuildApplicationCancel } from "../api/bot/guild-application-cancel.js";
import { parseGuildReview } from "../api/bot/guild-review-queries.js";

//#region src/expose/guild-membership-actions.ts
const id = {
	type: "integer",
	minimum: 1,
	maximum: Number.MAX_SAFE_INTEGER
};
function envelope(value) {
	if (!value || typeof value !== "object" || Array.isArray(value) || value.outcome !== "result") throw new Error("宗门操作未返回结果");
	return value;
}
function reviewDecision(approve) {
	return mutation(approve ? "同意原宗门申请；编号和申请人来自审核列表。服务端锁定当前审核者身份、权限和原申请，撤回重提等状态变化时拒绝，不自动同意最新申请。" : "拒绝原宗门申请；编号和申请人来自审核列表。服务端校验当前宗门、权限及原申请，不拒绝同一申请人后来的新申请。", approve ? "guild.application-approve" : "guild.application-reject", object({
		applicantId: id,
		applicationId: id
	}), object({
		...fields(integer, "applicationId guildId applicantId"),
		...fields(text, "applicantName message"),
		outcome: {
			type: "string",
			enum: [approve ? "approved" : "rejected"]
		}
	}), (input) => `/宗门审核${approve ? "同意" : "拒绝"} ${input.applicantId}`, (value, input) => {
		const row = envelope(value);
		const result = parseGuildApplicationDecision(row.receipt);
		if (result.applicationId !== input.applicationId || result.applicantId !== input.applicantId || result.outcome !== (approve ? "approved" : "rejected")) throw new Error("宗门审核回执与原申请不匹配");
		return result;
	}, (input) => ({
		target: { uid: input.applicantId },
		expectedApplicationId: input.applicationId
	}));
}
const guildMembershipActions = {
	get_guild_list: mutation("分页查看可申请宗门，每页5项，保留服务端简介、等级和最低境界。redirected=true 表示页码已被服务端纠正；result 缺失表示纠正查询失败，不能当作没有宗门。", "guild.list", object({ page }), object({
		canCreateOrApplyGuild: boolean,
		redirected: boolean,
		result: object({
			...fields(integer, "total currentPage totalPages"),
			guilds: list(object({
				...fields(integer, "id memberCount levelId level"),
				...fields(text, "name intro minRealmName"),
				titles: list(text)
			}, [
				"level",
				"intro",
				"minRealmName"
			]))
		})
	}, ["result"]), (input) => `/宗门列表 ${input.page}`, (data) => {
		parseRobotGuildList(data);
		return data;
	}, (input) => input, void 0, { freshRead: true }),
	apply_to_guild: mutation("向指定宗门提交入门申请；服务端校验境界、容量和重复申请。成功只表示申请提交，不能报告已加入宗门。", "guild.apply", object({ guildId: id }), object({
		...fields(integer, "applicationId guildId memberCount"),
		...fields(text, "guildName levelName")
	}), (input) => `/加入宗门 ${input.guildId}`, (data, input) => {
		const result = parseGuildApply(envelope(data).receipt);
		if (result.guildId !== input.guildId) throw new Error("宗门申请回执与目标不匹配");
		return result;
	}),
	get_guild_applications: mutation("查询本人待处理的宗门申请与可取消状态；hasGuild 独立表示当前是否已入宗，不把待审核申请当作宗门成员身份。", "guild.my-applications", object({}), object({
		hasGuild: boolean,
		...fields(text, "guildName guildNameText"),
		applications: list(object({
			...fields(integer, "id guildId"),
			status: {
				type: "integer",
				minimum: 0,
				maximum: 0
			},
			...fields(text, "guildName guildNameText statusText createdAt createdDateText"),
			canCancel: boolean
		}, ["guildName", "createdAt"]))
	}, ["guildName"]), () => "/我的申请", (data) => {
		parseGuildApplications(data);
		return data;
	}, (input) => input, void 0, { freshRead: true }),
	cancel_guild_application: mutation("按本人原申请编号取消待审核宗门申请；不退出已加入的宗门，不处理其他玩家的申请。编号来自 get_guild_applications。", "guild.application-cancel", object({ applicationId: id }), object({
		outcome: {
			type: "string",
			enum: ["cancelled"]
		},
		guildExists: boolean,
		guildName: text,
		message: text
	}, ["guildName"]), (input) => `/取消宗门申请 ${input.applicationId}`, (data) => {
		const row = envelope(data);
		const receipt = parseGuildApplicationCancel(row.receipt);
		if (receipt.outcome !== "cancelled" || typeof row.message !== "string") throw new Error("宗门申请取消未获确认");
		return {
			...receipt,
			message: row.message
		};
	}),
	get_guild_members: mutation("分页查询本人宗门成员、职位、活跃、贡献和离任状态，每页5项；未入宗或查询失败返回拒绝，不伪造空成员列表。", "guild.members", object({ page }), object({
		membershipStatus: {
			type: "string",
			enum: ["joined"]
		},
		guildName: text,
		...fields(integer, "page pageSize total totalPages"),
		members: list(object({
			...fields(integer, "userId roleId dailyActivity weeklyActivity contributionTotal"),
			...fields(text, "name realmName roleName leaveEndAt"),
			...fields(boolean, "isOnLeave isDeputy")
		}, [
			"name",
			"realmName",
			"roleName",
			"leaveEndAt"
		]))
	}), (input) => `/宗门成员列表 ${input.page}`, (data) => {
		parseGuildMembers(data);
		return data;
	}, (input) => input, void 0, { freshRead: true }),
	get_guild_review_applications: mutation("查询本人有权限审核的待处理宗门申请；保留申请编号 id、申请人 userId 和当前权限，不把无权审核当作空列表。", "guild.review-applications", object({ page }), object({
		...fields(boolean, "hasGuild canReview isDeputy"),
		...fields(text, "guildName roleName nextCursor"),
		...fields(integer, "currentPage totalPages total"),
		applications: list(object({
			...fields(integer, "id userId"),
			...fields(text, "userName realmName createdAt")
		}, [
			"userName",
			"realmName",
			"createdAt"
		]))
	}, [
		"guildName",
		"roleName",
		"nextCursor"
	]), (input) => `/宗门审核 ${input.page}`, (data) => {
		parseGuildReview(data);
		return data;
	}, (input) => input, void 0, { freshRead: true }),
	approve_guild_application: reviewDecision(true),
	reject_guild_application: reviewDecision(false)
};

//#endregion
export { guildMembershipActions };