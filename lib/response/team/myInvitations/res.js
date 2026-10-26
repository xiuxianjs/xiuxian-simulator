import { FormatGui, addOptions } from "../../../utils/messageHelper.js";
import { formatGameTime } from "../../../utils/gameTime.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { sendSecondLayerLockedPage } from "../../access/secondLayer.js";
import { parseBackendTeamInvitationInbox } from "../../../api/bot/team-invitation-inbox.js";
import { Format, logger, onResponse, useEvent } from "alemonjs";

//#region src/response/team/myInvitations/res.ts
/**
* 我的队伍邀请列表
* 指令：我的队伍邀请
*/
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const [, next] = useEvent();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	const regex = /^(!|！|\/|#|＃)?我的队伍邀请$/;
	const messageText = e.MessageText || "";
	if (!regex.test(messageText)) return;
	let result;
	try {
		const loaded = await runRobotBusiness(e, "teams.invitations", {}, (value) => {
			const data = parseBackendTeamInvitationInbox(value);
			if (!data.access.ok) return {
				code: "LOCKED",
				data: { realmName: data.access.realmName ?? "未知" }
			};
			const invitations = data.invitations.map((row) => ({
				...row,
				leaderName: row.leaderName ?? "未知",
				inviterName: row.inviterName ?? "未知",
				createdAt: row.createdAt
			}));
			return {
				code: "OK",
				data: {
					invitations,
					message: invitations.length === 0 ? "暂无待处理的队伍邀请" : void 0
				}
			};
		}, next);
		if (loaded.handled) return;
		result = loaded.data;
	} catch (error) {
		logger.error("获取邀请列表失败:", error);
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
			title: "我的队伍邀请",
			realmName: result.data.realmName
		});
		return;
	}
	if (result.code !== "OK") {
		const md = Format.createMarkdown();
		md.addText(result.data.message);
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "",
			content: md
		}));
		return;
	}
	if (result.data.invitations.length === 0) {
		const md = Format.createMarkdown();
		md.addText("暂无待处理的队伍邀请");
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "队伍邀请",
			content: md,
			footer: [{
				label: "我的队伍",
				command: "/我的队伍"
			}, {
				label: "队伍列表",
				command: "/队伍列表"
			}]
		}));
		return;
	}
	const md = Format.createMarkdown();
	md.addText(`共有 ${result.data.invitations.length} 条待处理邀请`);
	md.addNewline();
	md.addText("");
	md.addNewline();
	for (let i = 0; i < result.data.invitations.length; i++) {
		const inv = result.data.invitations[i];
		md.addText(`邀请ID：${inv.id}`);
		md.addNewline();
		md.addText(`队伍ID：${inv.teamId}`);
		md.addNewline();
		md.addText(`队长：${inv.leaderName}`);
		md.addNewline();
		md.addText(`邀请者：${inv.inviterName}`);
		md.addNewline();
		md.addText(`时间：${formatGameTime(inv.createdAt)}`);
		md.addNewline();
		addOptions(md, [{
			label: "同意",
			command: `/队伍邀请同意 ${inv.id}`
		}, {
			label: "拒绝",
			command: `/队伍邀请拒绝 ${inv.id}`
		}]);
		md.addNewline();
		if (i < result.data.invitations.length - 1) {
			md.addText("");
			md.addNewline();
		}
	}
	message.send(FormatGui({
		isPrivate,
		bid,
		title: "我的队伍邀请",
		content: md,
		footer: [{
			label: "我的队伍",
			command: "/我的队伍"
		}]
	}));
});

//#endregion
export { res_default as default };