import { FormatGui, createQuoteMarkdown } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { parsePositiveUid } from "../../../utils/targetUid.js";
import { parseRobotGuildRoleResign } from "../../../api/bot/guild-role-action-robot-query.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { Format, onResponse, useEvent, useMention } from "alemonjs";

//#region src/response/guild/resignRole/res.ts
/**
* 卸任指令
* /卸任        → 显示可卸任的成员列表（含自身）
* /卸任 UID/@目标 → 将目标降为弟子（或自身卸任）
*/
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const [mention] = useMention();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	const [, next] = useEvent();
	const text = e.MessageText?.trim() ?? "";
	const match = text.match(/^[!！/#＃]?卸任(?:\s+(.+))?$/);
	if (!match) return;
	const numeric = match?.[1] ? text.match(/(\d+)/)?.[1] : void 0;
	const targetUserId = numeric ? parsePositiveUid(numeric) : null;
	const mentioned = match?.[1] && !numeric ? await mention.findOne() : null;
	const targetBid = mentioned?.count && mentioned.data?.UserId ? mentioned.data.UserId : void 0;
	const directoryOnly = !match?.[1];
	try {
		const loaded = await runRobotBusiness(e, "guild.role-resign", {
			mode: directoryOnly ? "directory" : "action",
			targetUid: targetUserId,
			targetBid
		}, parseRobotGuildRoleResign, next, async (reply) => {
			await message.send(FormatGui({
				isPrivate,
				bid,
				title: "",
				content: Format.createMarkdown().addText(reply.text)
			}));
		});
		if (loaded.handled) return;
		const userId = e.uid;
		const result = loaded.data;
		if (result.outcome === "confirmation") {
			const md = Format.createMarkdown();
			md.addText("⚠️ 确认要卸任当前职位吗？");
			md.addNewline();
			md.addNewline();
			md.addText("说明：");
			md.addNewline();
			md.addText("• 卸任后将成为弟子");
			md.addNewline();
			md.addText("• 宗主卸任会自动选择继任者");
			md.addNewline();
			md.addText("• 宗门只有1人时宗主不能卸任");
			md.addNewline();
			md.addText("");
			md.addNewline();
			md.addText("请在60秒内再次点击确认");
			message.send(FormatGui({
				isPrivate,
				bid,
				title: "",
				content: md,
				footer: [{
					label: "确认卸任",
					command: `/卸任 ${userId}`
				}]
			}));
			return;
		}
		if (result.outcome === "result") {
			message.send(FormatGui({
				isPrivate,
				bid,
				title: "",
				content: Format.createMarkdown().addText(result.message)
			}));
			return;
		}
		const { members, operatorRole, operatorUserId } = result;
		const operator = members.find((m) => m.userId === operatorUserId);
		const contentMd = Format.createMarkdown();
		contentMd.addBlockquote(Format.createMarkdown().addText("点击 [卸任] 可将对应成员降为弟子"));
		if (operator && operatorRole !== "弟子") {
			contentMd.addText("【自身卸任】");
			contentMd.addNewline();
			contentMd.addBlockquote(createQuoteMarkdown([`【${operatorRole}】${operator.userName}（ID${operatorUserId}）`], [{
				label: "自行卸任",
				command: `/卸任 ${operatorUserId}`
			}]));
			contentMd.addNewline();
		}
		const demotable = members.filter((m) => {
			if (m.userId === userId) return false;
			return m.canDemote;
		});
		if (demotable.length > 0) {
			contentMd.addText("【可卸任成员】");
			contentMd.addNewline();
			for (const role of ["副宗主", "长老"]) {
				const group = demotable.filter((m) => m.roleName === role);
				if (group.length === 0) continue;
				for (const m of group) contentMd.addBlockquote(createQuoteMarkdown([`${m.userName}（ID：${m.userId}）[${m.roleName}]`], [{
					label: "卸任",
					command: `/卸任 ${m.userId}`
				}]));
			}
			contentMd.addNewline();
		}
		if (operatorRole === "弟子" && demotable.length === 0) {
			const md7 = Format.createMarkdown();
			md7.addText("您是弟子，没有可操作的卸任对象");
			message.send(FormatGui({
				isPrivate,
				bid,
				title: "",
				content: md7
			}));
			return;
		}
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "卸任管理",
			header: [{
				label: "返回",
				command: "/我的宗门"
			}],
			content: contentMd
		}));
	} catch (error) {
		await message.send(FormatGui({
			isPrivate,
			bid,
			title: "",
			content: Format.createMarkdown().addText(error instanceof Error ? error.message : "操作失败")
		}));
	}
});

//#endregion
export { res_default as default };