import { parseBackendTeamPendingApplications, parseBackendTeams } from "../api/bot/queries.js";
import { boolean, fields, integer, list, object, page, text } from "./schema.js";
import { mutation, observation } from "./mutation.js";
import { parseTeamAcknowledgement, parseTeamCreated, requireTeamObject } from "../api/bot/team-actions.js";
import { parseBackendTeamInfo } from "../api/bot/team-info-queries.js";
import { parseBackendTeamMatchSnapshot } from "../api/bot/team-match-queries.js";
import { parseBackendTeamMatchStart } from "../api/bot/team-match-start.js";
import { parseBackendTeamMatchCancel } from "../api/bot/team-match-cancel.js";

//#region src/expose/team-actions.ts
const positive = {
	type: "integer",
	minimum: 1,
	maximum: Number.MAX_SAFE_INTEGER
};
const teamSchema = object({
	...fields(integer, "teamId memberCount maxMembers"),
	...fields(text, "leaderName minRealmName"),
	...fields(boolean, "exists isMember isLeader ownMembershipLeader"),
	target: object({
		mode: {
			type: "string",
			enum: ["mainline", "dungeon"]
		},
		targetId: integer,
		teamType: {
			type: "string",
			enum: ["matching_team", "free_team"]
		},
		name: text
	}, ["name"]),
	members: list(object({
		...fields(integer, "userId position"),
		name: text,
		isLeader: boolean
	}, ["name"])),
	actions: object(fields(boolean, "canApply canInvite canManageMembers canReviewApplications canUseTeamMail canViewDungeon canLeave canDisband canViewInvitations"))
}, [
	"leaderName",
	"minRealmName",
	"target"
]);
const infoSchema = object({
	access: object({
		ok: boolean,
		realmName: text
	}, ["realmName"]),
	hasTeam: boolean,
	team: teamSchema
}, ["team"]);
const targetInfoSchema = object({
	hasTeam: boolean,
	team: teamSchema
}, ["team"]);
const matchSnapshot = object({
	targetLabel: text,
	...fields(integer, "waitedSeconds timeoutSeconds"),
	phase: {
		type: "string",
		enum: [
			"WAITING",
			"SAME_REALM",
			"ADJACENT_REALM",
			"NEAREST_REALM"
		]
	}
});
function info(data, teamId) {
	parseBackendTeamInfo(data);
	const row = data;
	if (teamId !== void 0 && row.team?.exists && row.team.teamId !== teamId) throw new Error("队伍信息与请求不匹配");
	return {
		...row,
		hasTeam: row.team?.exists ?? false
	};
}
function started(data) {
	const result = parseBackendTeamMatchStart(data);
	if (!result.targetLabel.trim()) throw new Error("匹配目标回执不完整");
	return result;
}
const teamActions = {
	get_my_team: observation("查询当前角色队伍、成员、阵位与服务端可用操作；access.ok=false 表示资格未解锁，hasTeam 根据服务端 exists 判定是否存在队伍。不会创建队伍。", "teams.overview", object({}), infoSchema, () => "/我的队伍", (data) => info(data)),
	get_team_info: observation("查询指定队伍的服务端可见资料与本人操作资格；不申请入队，不从成员行推断队长权限。", "teams.info", object({ teamId: positive }), targetInfoSchema, (input) => `/队伍信息 ${input.teamId}`, (data, input) => info(data, input.teamId), (input) => ({ teamId: String(input.teamId) })),
	get_team_list: observation("分页查看队伍编号、人数、队长与最低境界；page 默认1，每页5条；不会创建申请。空名称或缺失字段保留服务端事实。", "teams.list", object({ page }, ["page"]), object({
		...fields(integer, "total page pageSize"),
		items: list(object({
			...fields(integer, "id leaderId maxMembers memberCount minRealmId"),
			...fields(text, "leaderName minRealmName")
		}, [
			"leaderName",
			"minRealmName",
			"minRealmId"
		]))
	}), (input) => `/队伍列表 ${input.page ?? 1}`, (data) => {
		parseBackendTeams(data);
		return data;
	}, (input) => ({
		page: input.page ?? 1,
		pageSize: 5
	})),
	create_team: mutation("为当前角色创建队伍，沿用服务端身份、准入和既有队伍状态校验；返回实际队伍编号。", "teams.create", object({}), object({ teamId: positive }), () => "/创建队伍", parseTeamCreated),
	apply_to_team: mutation("向指定队伍申请加入，由服务端判断队伍、境界、容量和自动审批设置。autoApproved=false 表示等待审核，不能报告已经入队。", "teams.apply", object({ teamId: positive }), object({
		applicationId: positive,
		teamId: positive,
		status: {
			type: "integer",
			minimum: 0,
			maximum: 1
		},
		autoApproved: boolean
	}), (input) => `/加入队伍 ${input.teamId}`, (data, input) => {
		const row = requireTeamObject(data, "入队申请");
		if (!Number.isSafeInteger(row.id) || Number(row.id) < 1 || row.teamId !== input.teamId || row.status !== 0 && row.status !== 1) throw new Error("入队申请回执不完整");
		return {
			applicationId: row.id,
			teamId: row.teamId,
			status: row.status,
			autoApproved: row.status === 1
		};
	}, (input) => ({ teamId: String(input.teamId) })),
	leave_team: mutation("让当前角色按服务端原规则离队；队长离队时可能由剩余成员继任，需重新读取状态。不代替解散队伍或回滚战斗。", "teams.leave", object({}), object({ left: boolean }), () => "/离开队伍", (data) => parseTeamAcknowledgement(data, "left")),
	disband_team: mutation("解散当前角色担任队长的队伍，所有成员离队，待处理申请和邀请按服务端原规则收尾；不会回滚已结算的战斗。", "teams.disband", object({}), object({ disbanded: boolean }), () => "/解散队伍", (data) => parseTeamAcknowledgement(data, "disbanded")),
	get_team_applications: observation("查询本人当前队伍的待审核申请；canReview=false 时阅读 error，不代表申请列表为空。申请编号用于队长同意或拒绝操作。", "teams.applications", object({}), object({
		canReview: boolean,
		teamId: positive,
		leaderName: text,
		error: text,
		applications: list(object({
			...fields(integer, "id userId teamId status"),
			...fields(text, "userName createdAt")
		}, ["userName"]))
	}, [
		"teamId",
		"leaderName",
		"error",
		"applications"
	]), () => "/队伍申请", (data) => {
		const row = requireTeamObject(data, "队伍申请列表");
		if (typeof row.error === "string") return {
			canReview: false,
			error: row.error
		};
		parseBackendTeamPendingApplications(data);
		return {
			...row,
			canReview: true
		};
	}),
	approve_team_application: mutation("作为本人当前队伍队长同意指定待审核申请；服务端校验归属、容量和申请人资格，返回实际队伍编号。", "teams.application-approve", object({ applicationId: positive }), object({ teamId: positive }), (input) => `/队伍同意 ${input.applicationId}`, parseTeamCreated, (input) => ({ applicationId: String(input.applicationId) })),
	reject_team_application: mutation("作为本人当前队伍队长拒绝指定待审核申请；服务端继续校验申请归属和处理状态。", "teams.application-reject", object({ applicationId: positive }), object({ rejected: boolean }), (input) => `/队伍拒绝 ${input.applicationId}`, (data) => parseTeamAcknowledgement(data, "rejected"), (input) => ({ applicationId: String(input.applicationId) })),
	get_team_match: observation("查询当前角色匹配队列快照；matching=false 表示服务端未返回有效排队记录，不代表已组队或战斗完成。只返回服务端等待时长及阶段。", "team-match.snapshot", object({}), object({
		matching: boolean,
		snapshot: matchSnapshot
	}, ["snapshot"]), () => "/匹配状态", (data) => {
		const snapshot = parseBackendTeamMatchSnapshot(data);
		return {
			matching: snapshot !== null,
			...snapshot ? { snapshot } : {}
		};
	}),
	start_mainline_match: mutation("为当前角色发起指定章节关卡的主线匹配；返回目标标签仅表示已入队列，不保证已匹配成功、挑战或结算。", "team-match.start-mainline", object({
		chapterNumber: page,
		stageNumber: page
	}), object({ targetLabel: text }), (input) => `/匹配主线 ${input.chapterNumber}-${input.stageNumber}`, started),
	start_dungeon_match: mutation("为当前角色发起指定秘境编号的组队匹配；服务端拒绝单人秘境及不合资格目标，不代表已发起或完成战斗。", "team-match.start-dungeon", object({ dungeonId: positive }), object({ targetLabel: text }), (input) => `/匹配秘境 ${input.dungeonId}`, started),
	cancel_team_match: mutation("取消当前角色匹配；cancelled=false 表示本次未取消有效队列记录，不能把它当成解散队伍或回滚战斗。", "team-match.cancel", object({}), object({
		cancelled: boolean,
		targetLabel: text
	}, ["targetLabel"]), () => "/取消匹配", parseBackendTeamMatchCancel)
};

//#endregion
export { teamActions };