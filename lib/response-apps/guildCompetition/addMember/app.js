import { addBackendGuildCompetitionMember } from "../../../api/bot/guild-competition-actions.js";
import { getBackendGuildCompetitionMemberCandidates } from "../../../api/bot/competition-member-candidates-query.js";

//#region src/response-apps/guildCompetition/addMember/app.ts
async function addMemberDirect(params) {
	try {
		return {
			code: "DIRECT_ADD",
			data: { message: (await addBackendGuildCompetitionMember(params.bid, params.uid, params.targetUid, params.pos, params.request)).message }
		};
	} catch (error) {
		return {
			code: "LOAD_FAILED",
			data: { message: error?.message ?? "添加失败" }
		};
	}
}
function candidates(bid, uid, page) {
	return getBackendGuildCompetitionMemberCandidates(bid, uid, page);
}
async function fetchMemberList(params) {
	try {
		const data = await candidates(params.bid, params.uid, params.page);
		if (!data.hasGuild) return {
			code: "NO_GUILD",
			data: { message: "您还未加入任何宗门" }
		};
		if (!data.canManage) return {
			code: "NO_PERMISSION",
			data: { message: "权限不足" }
		};
		if (!data.hasTeam) return {
			code: "EMPTY_LIST",
			data: { message: "宗门未报名本届大比，请先报名。" }
		};
		if (!data.members.length) return {
			code: "EMPTY_LIST",
			data: { message: "宗门内暂无可添加的成员。" }
		};
		return {
			code: "MEMBER_LIST",
			data
		};
	} catch (error) {
		return {
			code: "LOAD_FAILED",
			data: { message: error?.message ?? "获取成员列表失败" }
		};
	}
}
async function fetchPositionSelect(params) {
	try {
		const data = await candidates(params.bid, params.uid, 1);
		if (!data.hasGuild) return {
			code: "NO_GUILD",
			data: { message: "您还未加入任何宗门" }
		};
		if (!data.canManage) return {
			code: "NO_PERMISSION",
			data: { message: "权限不足" }
		};
		if (!data.hasTeam) return {
			code: "TEAM_NOT_FOUND",
			data: { message: "宗门未报名本届大比，请先报名。" }
		};
		if (!data.availablePositions.length) return {
			code: "TEAM_FULL",
			data: { message: "参赛队伍已满，无法添加新成员。" }
		};
		return {
			code: "POSITION_SELECT",
			data: {
				targetUid: params.targetUid,
				availablePositions: data.availablePositions
			}
		};
	} catch (error) {
		return {
			code: "LOAD_FAILED",
			data: { message: error?.message ?? "获取位置信息失败" }
		};
	}
}

//#endregion
export { addMemberDirect, fetchMemberList, fetchPositionSelect };