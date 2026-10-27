import { FormatGui } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { appendMiddlewareAdvice } from "../../middlewareReply.js";
import { teamRecoveryTips } from "../../teamRecovery.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { sendSecondLayerLockedPage } from "../../access/secondLayer.js";
import { parseBackendTeamInfo } from "../../../api/bot/team-info-queries.js";
import { Format, logger, onResponse, useEvent } from "alemonjs";

//#region src/response/team/teamInfo/res.ts
/**
* 查看队伍信息
* 指令：队伍信息 [队伍ID]
*/
function buildTeamInfoFooter(teamInfo) {
	const footer = [];
	const { actions } = teamInfo;
	if (actions.canInvite) footer.push({
		label: "邀请",
		command: "/邀请入队 "
	});
	if (actions.canViewInvitations) footer.push({
		label: "我的邀请",
		command: "/我的队伍邀请"
	});
	if (actions.canUseTeamMail) footer.push({
		label: "飞信",
		command: "/飞信 队伍"
	});
	if (actions.canReviewApplications) footer.push({
		label: "申请",
		command: "/我的队伍申请"
	});
	if (actions.canViewDungeon) footer.push({
		label: "秘境",
		command: "/查看秘境"
	});
	if (actions.canLeave) footer.push({
		label: "离开",
		command: "/离开队伍"
	});
	if (actions.canApply) footer.push({
		label: "加入队伍",
		command: `/加入队伍 ${teamInfo.teamId}`
	});
	if (footer.length === 1 && actions.canApply) footer.push({
		label: "队伍列表",
		command: "/队伍列表"
	});
	return footer;
}
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const [, next] = useEvent();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	const match = (e.MessageText ?? "").match(/^(!|！|\/|#|＃)?队伍信息\s*(\d+)?$/);
	const teamId = match?.[2] ? Number(match[2]) : void 0;
	let result;
	try {
		const loaded = await runRobotBusiness(e, "teams.info", { teamId: teamId ? teamId.toString() : "" }, (value) => {
			const data = parseBackendTeamInfo(value);
			if (!data.access.ok) return {
				code: "LOCKED",
				data: { realmName: data.access.realmName }
			};
			if (!data.team) return { code: teamId ? "TEAM_NOT_FOUND" : "NO_TEAM" };
			if (!data.team.exists) return { code: "TEAM_NOT_FOUND" };
			return {
				code: "OK",
				data: data.team
			};
		}, next);
		if (loaded.handled) return;
		result = loaded.data;
	} catch (error) {
		logger.error("查询队伍信息失败:", error);
		result = {
			code: "LOAD_FAILED",
			data: { message: error instanceof Error ? error.message : "查询失败" }
		};
	}
	if (result.code === "LOCKED") {
		sendSecondLayerLockedPage({
			bid,
			isPrivate,
			message,
			title: "队伍信息",
			realmName: result.data.realmName
		});
		return;
	}
	if (result.code === "NO_TEAM") {
		const md = Format.createMarkdown();
		md.addText("你当前没有加入任何队伍");
		appendMiddlewareAdvice(md, teamRecoveryTips("teams.info", "你当前没有加入任何队伍"));
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "",
			content: md
		}));
		return;
	}
	if (result.code === "TEAM_NOT_FOUND") {
		const md = Format.createMarkdown();
		md.addText("队伍不存在");
		appendMiddlewareAdvice(md, teamRecoveryTips("teams.info", "队伍不存在"));
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "",
			content: md
		}));
		return;
	}
	if (result.code === "LOAD_FAILED") {
		const md = Format.createMarkdown();
		md.addText(result.data.message);
		appendMiddlewareAdvice(md, teamRecoveryTips("teams.info", result.data.message));
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "",
			content: md
		}));
		return;
	}
	if (result.code !== "OK") return;
	const teamInfo = result.data;
	const footer = buildTeamInfoFooter(teamInfo);
	const md = Format.createMarkdown();
	md.addNewline();
	md.addText(`队长: ${teamInfo.leaderName}`);
	md.addNewline();
	md.addText(`人数: ${teamInfo.memberCount}/${teamInfo.maxMembers}`);
	md.addNewline();
	md.addText(`境界门槛: ${teamInfo.minRealmName ?? "无"}`);
	md.addNewline();
	md.addText(`队伍类型: ${teamInfo.targetInfo?.teamType === "matching_team" ? "匹配队伍" : "普通队伍"}`);
	md.addNewline();
	if (teamInfo.targetInfo?.targetName) {
		md.addText(`目标副本: ${teamInfo.targetInfo.targetName}`);
		md.addNewline();
	}
	md.addNewline();
	md.addBold("【成员列表】");
	teamInfo.members.forEach((member) => {
		const leaderMark = member.isLeader ? "[队长]" : "";
		md.addNewline();
		md.addText(`位置${member.position}: ${member.userName}${leaderMark}`);
	});
	message.send(FormatGui({
		isPrivate,
		bid,
		title: `【队伍信息】队伍ID: ${teamInfo.teamId}`,
		content: md,
		footer
	}));
});

//#endregion
export { res_default as default };