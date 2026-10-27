import { formatGameTime } from "../../../utils/gameTime.js";
import { markdownButtonLabel } from "../../../utils/buttonLabel.js";
import { FormatGui, addOptions } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { parseBackendTeamWorkflow } from "../../../api/bot/social-workflows.js";
import { sendSecondLayerLockedPage } from "../../access/secondLayer.js";
import { Format, logger, onResponse, useEvent } from "alemonjs";

//#region src/response/team/myApplications/res.ts
/**
* 我的队伍申请
* 指令：我的队伍申请
*/
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const [, next] = useEvent();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	const regex = /^(!|！|\/|#|＃)?我的队伍申请$/;
	const messageText = e.MessageText || "";
	if (!regex.test(messageText)) return;
	const back = [{
		label: "我的队伍",
		command: "/我的队伍"
	}];
	let result;
	try {
		const loaded = await runRobotBusiness(e, "teams.my-applications", {}, (value) => {
			const data = parseBackendTeamWorkflow(value, "applications");
			if (!("records" in data)) throw new Error("队伍申请响应不完整");
			const facts = data.records;
			if (!facts.canUseSecondLayerFeature) return {
				code: "LOCKED",
				data: { realmName: facts.realmName }
			};
			if (facts.isLeader) {
				if (!data.pending) throw new Error("队伍待处理申请响应不完整");
				return {
					code: "LEADER",
					data: {
						leaderName: data.pending.leaderName ?? "未知",
						applications: data.pending.applications.map((app) => ({
							id: app.id,
							userId: app.userId,
							userName: app.userName ?? "未知"
						}))
					}
				};
			}
			return {
				code: "MEMBER",
				data: { applications: facts.applications.map((app) => ({
					id: app.id,
					leaderName: app.leaderName ?? "未知",
					createdAt: app.createdAt ? formatGameTime(app.createdAt) : null
				})) }
			};
		}, next);
		if (loaded.handled) return;
		result = loaded.data;
	} catch (error) {
		logger.error("查询我的队伍申请失败:", error);
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
			title: "我的队伍申请",
			realmName: result.data.realmName
		});
		return;
	}
	if (result.code === "LEADER") {
		if (result.data.applications.length === 0) {
			const md = Format.createMarkdown();
			md.addText("暂无入队申请");
			message.send(FormatGui({
				isPrivate,
				bid,
				title: "队伍申请",
				content: md,
				footer: back
			}));
			return;
		}
		const md = Format.createMarkdown();
		for (const app of result.data.applications) {
			md.addText(`【${app.userId}】${app.userName}`);
			addOptions(md, [{
				label: "同意",
				command: `/队伍同意 ${app.id}`
			}, {
				label: "拒绝",
				command: `/队伍拒绝 ${app.id}`
			}]);
		}
		message.send(FormatGui({
			isPrivate,
			bid,
			title: `【${result.data.leaderName}】的队伍`,
			content: md,
			footer: back
		}));
		return;
	}
	if (result.code !== "MEMBER") {
		const md = Format.createMarkdown();
		md.addText(result.data.message);
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "",
			content: md,
			footer: back
		}));
		return;
	}
	if (result.data.applications.length === 0) {
		const md = Format.createMarkdown();
		md.addText("暂无待审核的队伍申请");
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "我的队伍申请",
			content: md,
			footer: [...back, {
				label: "我的邀请",
				command: "/我的队伍邀请"
			}]
		}));
		return;
	}
	const md = Format.createMarkdown();
	md.addText(`共有 ${result.data.applications.length} 条待审核申请`);
	md.addNewline();
	md.addText("");
	md.addNewline();
	for (let i = 0; i < result.data.applications.length; i++) {
		const app = result.data.applications[i];
		md.addBlockquote(Format.createMarkdown().addText(`**【${app.leaderName}】的队伍**`).addNewline().addText(`申请编号：${app.id}`).addNewline().addText(`申请时间：${app.createdAt ?? "暂无"} `).addButton(markdownButtonLabel("取消"), { data: `/取消队伍申请 ${app.id}` }));
		if (i < result.data.applications.length - 1) {
			md.addText("");
			md.addNewline();
		}
	}
	message.send(FormatGui({
		isPrivate,
		bid,
		title: "📋 我的队伍申请",
		content: md,
		footer: [...back, {
			label: "我的邀请",
			command: "/我的队伍邀请"
		}]
	}));
});

//#endregion
export { res_default as default };