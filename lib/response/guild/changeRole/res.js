import { markdownButtonLabel } from "../../../utils/buttonLabel.js";
import { FormatGui } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { parseGuildRoleOptions } from "../../../api/bot/guild-role-options-queries.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/guild/changeRole/res.ts
/**
* 宗门改职 —— 展示成员列表 + 可设置的职位按钮
*/
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	const [, next] = useEvent();
	try {
		const loaded = await runRobotBusiness(e, "guild.role-options", {}, parseGuildRoleOptions, next, async (reply) => {
			await message.send(FormatGui({
				isPrivate,
				bid,
				title: "",
				content: Format.createMarkdown().addText(reply.text)
			}));
		});
		if (loaded.handled) return;
		const userId = e.uid;
		const { guildName, roles: allRoles } = loaded.data;
		const members = loaded.data.members.map((member) => ({
			...member,
			userName: member.userExists ? `${member.name}（${member.realmName ?? "未知"}）` : "未知",
			roleName: member.roleName ?? "弟子"
		}));
		const md = Format.createMarkdown();
		md.addText(`职位：${allRoles.map((r) => r.name).join("、")}`);
		md.addNewline();
		md.addText("点击对应职位按钮即可变更");
		md.addNewline();
		md.addNewline();
		for (const member of members) {
			if (member.userId === userId) continue;
			let titleLine = "";
			if (member.isDeputy) titleLine += `【代理宗主】${member.userName}`;
			else titleLine += `【${member.roleName}】${member.userName}`;
			const quote = Format.createMarkdown().addText(titleLine);
			for (const role of member.appointableRoles) quote.addText(" ").addButton(markdownButtonLabel(`${role.name}`), { data: `/设置身份为 ${role.name} ${member.userId}` });
			md.addBlockquote(quote);
		}
		message.send(FormatGui({
			isPrivate,
			bid,
			title: `【${guildName}】职位变更`,
			content: md,
			footer: [{
				label: "返回",
				command: "/宗门成员列表"
			}, {
				label: "宗门",
				command: "/我的宗门"
			}]
		}));
	} catch (error) {
		await message.send(FormatGui({
			isPrivate,
			bid,
			title: "",
			content: Format.createMarkdown().addText(error instanceof Error ? error.message : "获取数据失败")
		}));
	}
});

//#endregion
export { res_default as default };