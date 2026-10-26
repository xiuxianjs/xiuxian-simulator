import { repeatPresentationHeaders } from "./repeat-presentation.js";
import { requestBackend, writeContext } from "./client.js";

//#region src/api/bot/master-actions.ts
function record(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("师徒服务响应不完整");
	return value;
}
function parseMasterAction(value) {
	const result = record(value);
	if (typeof result.message !== "string") throw new Error("师徒服务响应不完整");
	return { message: result.message };
}
function proposal(value) {
	const row = record(value);
	if (!Number.isInteger(row.id) || !Number.isInteger(row.fromUserId) || typeof row.fromName !== "string" || typeof row.fromRealm !== "string") throw new Error("师徒申请数据不完整");
	return row;
}
function id(value, usage) {
	if (!/^\d+$/.test(value.trim()) || !Number.isSafeInteger(Number(value)) || Number(value) <= 0) throw new Error(usage);
	return Number(value);
}
function writable(request, repeatCommand) {
	return {
		...writeContext(request),
		headers: repeatPresentationHeaders(repeatCommand)
	};
}
async function applyBackendMaster(bid, uid, target, request, repeatCommand) {
	if (!bid) throw new Error("操作缺少平台身份");
	const masterUserId = id(target, "使用方法：拜师 <师父UID|@目标>");
	parseMasterAction(await requestBackend(bid, "post_players_id_master_apply", {
		path: { id: uid },
		body: { masterUserId },
		...writable(request, repeatCommand)
	}));
	return { message: "已向师父发起拜师申请，等待对方同意" };
}
async function listBackendMasterProposals(bid, uid) {
	if (!bid) throw new Error("操作缺少平台身份");
	const rows = await requestBackend(bid, "get_players_id_master_proposals", { path: { id: uid } });
	if (!Array.isArray(rows)) throw new Error("师徒申请列表响应不完整");
	return rows.map(proposal);
}
async function acceptBackendMaster(bid, uid, disciple, request, repeatCommand) {
	const target = id(disciple, "使用方法：同意拜师 <徒弟UID>");
	if (!bid) throw new Error("操作缺少平台身份");
	return parseMasterAction(await requestBackend(bid, "post_players_id_master_proposal_decision", {
		path: { id: uid },
		body: {
			kind: "binding",
			discipleId: target,
			accept: true
		},
		...writable(request, repeatCommand)
	}));
}
async function interaction(bid, operation, uid, disciple, request, repeatCommand) {
	if (!bid) throw new Error("操作缺少平台身份");
	const discipleId = id(disciple, operation.includes("bless") ? "使用方法：赐福 <徒弟UID|@目标>" : "使用方法：传功 <徒弟UID|@目标>");
	return parseMasterInteraction(record(await requestBackend(bid, operation, {
		path: {
			id: uid,
			discipleId
		},
		...writable(request, repeatCommand)
	})), operation.includes("bless") ? "赐福" : "传功", discipleId);
}
function parseMasterInteraction(value, action, discipleId) {
	const raw = record(value);
	const result = parseMasterAction(raw);
	if (result.message !== action) return result;
	const lines = [`${action}成功。`, `徒弟 UID：${discipleId}`];
	if (Number.isSafeInteger(raw.rewardExperience) && raw.rewardExperience > 0) lines.push(`基础修为奖励：${raw.rewardExperience}（实际到账受境界修为上限限制）`);
	if (Number.isSafeInteger(raw.virtueExperience) && raw.virtueExperience >= 0) lines.push(`当前师德：${raw.virtueExperience}`);
	if (Number.isSafeInteger(raw.virtueLevel) && raw.virtueLevel > 0) lines.push(`师德等级：${raw.virtueLevel}`);
	return { message: lines.join("\n") };
}
const teachBackendMaster = (bid, uid, disciple, request, repeatCommand) => interaction(bid, "post_players_id_master_teach_discipleId", uid, disciple, request, repeatCommand);
const blessBackendMaster = (bid, uid, disciple, request, repeatCommand) => interaction(bid, "post_players_id_master_bless_discipleId", uid, disciple, request, repeatCommand);
async function giftBackendMaster(bid, uid, disciple, itemKey, request, repeatCommand) {
	if (!bid) throw new Error("操作缺少平台身份");
	const discipleId = id(disciple, "使用方法：赐丹 <徒弟UID|@目标> [培元丹|筑基丹]");
	return parseMasterAction(await requestBackend(bid, "post_players_id_master_gift_discipleId", {
		path: {
			id: uid,
			discipleId
		},
		body: itemKey ? { itemKey } : {},
		...writable(request, repeatCommand)
	}));
}
async function applyBackendGraduation(bid, uid, request, repeatCommand) {
	if (!bid) throw new Error("操作缺少平台身份");
	return parseMasterAction(await requestBackend(bid, "post_players_id_master_graduation", {
		path: { id: uid },
		...writable(request, repeatCommand)
	}));
}
async function listBackendGraduationProposals(bid, uid) {
	if (!bid) throw new Error("操作缺少平台身份");
	const rows = await requestBackend(bid, "get_players_id_master_graduation_proposals", { path: { id: uid } });
	if (!Array.isArray(rows)) throw new Error("出师申请列表响应不完整");
	return rows.map(proposal);
}
async function decideBackendGraduation(bid, uid, disciple, accept, request, repeatCommand) {
	if (!bid) throw new Error("操作缺少平台身份");
	const target = id(disciple, accept ? "使用方法：同意出师 <徒弟UID>" : "使用方法：拒绝出师 <徒弟UID>");
	return parseMasterAction(await requestBackend(bid, "post_players_id_master_proposal_decision", {
		path: { id: uid },
		body: {
			kind: "graduation",
			discipleId: target,
			accept
		},
		...writable(request, repeatCommand)
	}));
}
async function rebelBackendMaster(bid, uid, request, repeatCommand) {
	if (!bid) throw new Error("操作缺少平台身份");
	return parseMasterAction(await requestBackend(bid, "post_players_id_master_rebel", {
		path: { id: uid },
		...writable(request, repeatCommand)
	}));
}
async function expelBackendMaster(bid, uid, disciple, request, repeatCommand) {
	if (!bid) throw new Error("操作缺少平台身份");
	const discipleId = id(disciple, "使用方法：逐出师门 <徒弟UID|@目标>");
	return parseMasterAction(await requestBackend(bid, "post_players_id_master_disciples_discipleId_expel", {
		path: {
			id: uid,
			discipleId
		},
		...writable(request, repeatCommand)
	}));
}
async function claimBackendMasterTitle(bid, uid, request) {
	if (!bid) throw new Error("操作缺少平台身份");
	const row = record(await requestBackend(bid, "post_players_id_master_title_claim", {
		path: { id: uid },
		...writable(request)
	}));
	if (typeof row.title !== "string") throw new Error("师门称号响应不完整");
	return { title: row.title };
}
function parseMasterDecision(value) {
	const data = record(value);
	if (data.outcome === "list" && Array.isArray(data.received)) return {
		outcome: "list",
		received: data.received.map(proposal)
	};
	if (data.outcome === "decided") return {
		outcome: "decided",
		...parseMasterAction(data)
	};
	throw new Error("师徒审批响应不完整");
}
function parseMasterTargetAction(value, action) {
	const data = record(value);
	if (data.outcome === "usage") return { outcome: "usage" };
	if (data.outcome !== "result" || !Number.isSafeInteger(data.targetUid) || Number(data.targetUid) <= 0) throw new Error("师徒操作响应不完整");
	return {
		outcome: "result",
		message: (action === "传功" || action === "赐福" ? parseMasterInteraction(data, action, Number(data.targetUid)) : parseMasterAction(data)).message
	};
}
function parseMasterClaimTitle(value) {
	const data = record(value);
	if (typeof data.title !== "string" || !data.title) throw new Error("师门称号响应不完整");
	return { title: data.title };
}

//#endregion
export { acceptBackendMaster, applyBackendGraduation, applyBackendMaster, blessBackendMaster, claimBackendMasterTitle, decideBackendGraduation, expelBackendMaster, giftBackendMaster, listBackendGraduationProposals, listBackendMasterProposals, parseMasterAction, parseMasterClaimTitle, parseMasterDecision, parseMasterInteraction, parseMasterTargetAction, rebelBackendMaster, teachBackendMaster };