import { repeatPresentationHeaders } from "./repeat-presentation.js";
import { requestBackend, writeContext } from "./client.js";

//#region src/api/bot/team-actions.ts
function requireTeamObject(value, operation) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${operation}响应不完整`);
	return value;
}
async function createBackendTeam(bid, request, repeatCommand) {
	if (!bid) throw new Error("操作缺少平台身份");
	const data = requireTeamObject(await requestBackend(bid, "post_teams", {
		...writeContext(request),
		headers: repeatPresentationHeaders(repeatCommand)
	}), "创建队伍");
	if (!Number.isInteger(data.id) || data.id <= 0) throw new Error("创建队伍响应不完整");
	return data.id;
}
async function applyBackendTeam(bid, teamId, request, repeatCommand) {
	if (!bid) throw new Error("操作缺少平台身份");
	const data = requireTeamObject(await requestBackend(bid, "post_teams_teamId_applications", {
		path: { teamId },
		...writeContext(request),
		headers: repeatPresentationHeaders(repeatCommand)
	}), "队伍申请");
	if (typeof data.status !== "number") throw new Error("队伍申请响应不完整");
	return { autoApproved: data.status === 1 };
}
async function inviteBackendTeam(bid, inviteeId, request, repeatCommand) {
	if (!bid) throw new Error("操作缺少平台身份");
	const data = requireTeamObject(await requestBackend(bid, "post_teams_invitations", {
		body: { inviteeId },
		...writeContext(request),
		headers: repeatPresentationHeaders(repeatCommand)
	}), "队伍邀请");
	if (typeof data.status !== "number") throw new Error("队伍邀请响应不完整");
	return { autoAccepted: data.status === 1 };
}
async function approveBackendTeamApplication(bid, applicationId, request, repeatCommand) {
	if (!bid) throw new Error("操作缺少平台身份");
	requireTeamObject(await requestBackend(bid, "post_teams_applications_applicationId_approve", {
		path: { applicationId },
		...writeContext(request),
		headers: repeatPresentationHeaders(repeatCommand)
	}), "同意队伍申请");
}
async function rejectBackendTeamApplication(bid, applicationId, request, repeatCommand) {
	if (!bid) throw new Error("操作缺少平台身份");
	requireTeamObject(await requestBackend(bid, "post_teams_applications_applicationId_reject", {
		path: { applicationId },
		...writeContext(request),
		headers: repeatPresentationHeaders(repeatCommand)
	}), "拒绝队伍申请");
}
async function acceptBackendTeamInvitation(bid, invitationId, request, repeatCommand) {
	if (!bid) throw new Error("操作缺少平台身份");
	requireTeamObject(await requestBackend(bid, "post_teams_invitations_invitationId_accept", {
		path: { invitationId },
		...writeContext(request),
		headers: repeatPresentationHeaders(repeatCommand)
	}), "接受队伍邀请");
}
async function rejectBackendTeamInvitation(bid, invitationId, request, repeatCommand) {
	if (!bid) throw new Error("操作缺少平台身份");
	requireTeamObject(await requestBackend(bid, "post_teams_invitations_invitationId_reject", {
		path: { invitationId },
		...writeContext(request),
		headers: repeatPresentationHeaders(repeatCommand)
	}), "拒绝队伍邀请");
}
async function kickBackendTeamMember(bid, memberId, request, repeatCommand) {
	if (!bid) throw new Error("操作缺少平台身份");
	requireTeamObject(await requestBackend(bid, "delete_teams_members_memberId", {
		path: { memberId },
		...writeContext(request),
		headers: repeatPresentationHeaders(repeatCommand)
	}), "踢出队员");
}
async function leaveBackendTeam(bid, request, repeatCommand) {
	if (!bid) throw new Error("操作缺少平台身份");
	requireTeamObject(await requestBackend(bid, "post_teams_leave", {
		...writeContext(request),
		headers: repeatPresentationHeaders(repeatCommand)
	}), "离开队伍");
}
async function disbandBackendTeam(bid, request, repeatCommand) {
	if (!bid) throw new Error("操作缺少平台身份");
	requireTeamObject(await requestBackend(bid, "delete_teams_mine", {
		...writeContext(request),
		headers: repeatPresentationHeaders(repeatCommand)
	}), "解散队伍");
}
function parseTeamCreated(value) {
	const data = requireTeamObject(value, "创建队伍");
	if (!Number.isSafeInteger(data.id) || Number(data.id) <= 0) throw new Error("创建队伍响应不完整");
	return { teamId: Number(data.id) };
}
function parseTeamApplicationStatus(value) {
	const data = requireTeamObject(value, "队伍申请");
	if (typeof data.status !== "number") throw new Error("队伍申请响应不完整");
	return { autoApproved: data.status === 1 };
}
function parseTeamAcknowledgement(value, key) {
	const data = requireTeamObject(value, "队伍操作");
	if (data[key] !== true) throw new Error("队伍操作响应不完整");
	return data;
}
function parseTeamTargetMutation(value, invite) {
	const data = requireTeamObject(value, "队伍操作");
	if (data.outcome === "target_missing") return { outcome: "target_missing" };
	if (invite ? typeof data.status !== "number" : data.kicked !== true) throw new Error("队伍操作响应不完整");
	return {
		outcome: "done",
		autoAccepted: invite && data.status === 1,
		...invite && data.status === 0 && Number.isSafeInteger(data.id) && Number(data.id) > 0 ? { invitationId: Number(data.id) } : {}
	};
}

//#endregion
export { acceptBackendTeamInvitation, applyBackendTeam, approveBackendTeamApplication, createBackendTeam, disbandBackendTeam, inviteBackendTeam, kickBackendTeamMember, leaveBackendTeam, parseTeamAcknowledgement, parseTeamApplicationStatus, parseTeamCreated, parseTeamTargetMutation, rejectBackendTeamApplication, rejectBackendTeamInvitation, requireTeamObject };