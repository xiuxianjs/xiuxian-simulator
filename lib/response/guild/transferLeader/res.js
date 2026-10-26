import { FormatGui, createQuoteMarkdown } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { parseGuildLeadershipTransfer } from "../../../api/bot/guild-member-lifecycle.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/guild/transferLeader/res.ts
/**
* 宗主转让指令
* 指令：/宗主转让 [编号]
* 无参数时展示近7天活跃度前三的成员列表
* 带编号时由服务端创建并核验60秒确认，再执行转让
*/
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	const [, next] = useEvent();
	const match = (e.MessageText ?? "").trim().match(/宗主转让\s+(\d+)/);
	const idx = match ? parseInt(match[1], 10) : 0;
	try {
		const loaded = await runRobotBusiness(e, "guild.leadership-transfer", { index: idx }, parseGuildLeadershipTransfer, next, async (reply) => {
			await message.send(FormatGui({
				isPrivate,
				bid,
				title: "",
				content: Format.createMarkdown().addText(reply.text)
			}));
		});
		if (loaded.handled) return;
		const result = loaded.data;
		if (result.outcome === "transferred") {
			const resultMd = Format.createMarkdown();
			resultMd.addText("✅ " + result.message);
			message.send(FormatGui({
				isPrivate,
				bid,
				title: "",
				content: resultMd
			}));
			return;
		}
		if (result.outcome === "confirmation_required") {
			const md = Format.createMarkdown();
			md.addText(`⚠️ ${result.message}`);
			md.addNewline();
			md.addText(`确认有效期：${result.confirmationExpiresInSeconds ?? 60}秒`);
			message.send(FormatGui({
				isPrivate,
				bid,
				title: "",
				content: md,
				footer: [{
					label: "确认转让",
					command: `/宗主转让 ${idx}`
				}]
			}));
			return;
		}
		const topMembers = result.candidates;
		const md = Format.createMarkdown();
		md.addText("📋 宗主转让 - 近7天活跃度排行");
		md.addNewline();
		md.addNewline();
		md.addText("请选择要转让宗主职位的成员：");
		md.addNewline();
		for (let i = 0; i < topMembers.length; i++) {
			const m = topMembers[i];
			md.addBlockquote(createQuoteMarkdown([`【${m.index}】${m.name}（${m.roleName}）`, `本周活跃：${m.weeklyActivity}  |  累计贡献：${m.contributionTotal}`], [{
				label: "转让",
				command: `/宗主转让 ${m.index}`
			}]));
		}
		md.addText("⚠️ 转让后您将变为弟子，请谨慎操作");
		md.addNewline();
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "",
			content: md
		}));
	} catch (error) {
		await message.send(FormatGui({
			isPrivate,
			bid,
			title: "",
			content: Format.createMarkdown().addText(error instanceof Error ? error.message : "转让失败")
		}));
	}
});

//#endregion
export { res_default as default };