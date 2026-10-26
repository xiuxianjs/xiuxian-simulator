import { FormatGui, createQuoteMarkdown } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { parseRobotGuildTraining } from "../../../api/bot/guild-training-robot-query.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/guild/battleTraining/res.ts
const REG = /^[!！/#＃]?宗门战备(?:\s+(团队|个人)\s+(攻|守|血|速|命|会))?$/;
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	const [, next] = useEvent();
	const match = (e.MessageText || "").trim().match(REG);
	const branch = match?.[1];
	const key = match?.[2];
	const sendFailure = async (text) => {
		await message.send(FormatGui({
			isPrivate,
			bid,
			title: "宗门战备",
			content: Format.createMarkdown().addText(text),
			footer: [{
				label: "我的宗门",
				command: "/我的宗门"
			}]
		}));
	};
	const loaded = await runRobotBusiness(e, branch && key ? "guild.training-upgrade" : "guild.training-overview", branch && key ? {
		branch,
		key
	} : {}, (value) => parseRobotGuildTraining(value, branch, key), next, async (reply) => {
		await sendFailure(reply.text);
	}).catch(async (error) => {
		await sendFailure(error instanceof Error ? error.message : "宗门战备操作失败");
		return { handled: true };
	});
	if (loaded.handled) return;
	const result = loaded.data;
	const md = Format.createMarkdown();
	if (result.code === "OK") {
		md.addText(`升级成功：${result.data.name}提升至${result.data.newLevel}级`);
		md.addNewline();
		md.addText(`当前效果：${result.data.effectText}`);
		md.addNewline();
		md.addText(`本次消耗：${result.data.costText}`);
		if (typeof result.data.contributionPoints === "number") {
			md.addNewline();
			md.addText(`剩余贡献点：${result.data.contributionPoints}`);
		}
		if (typeof result.data.prestige === "number" && typeof result.data.spiritStone === "number") {
			md.addNewline();
			md.addText(`宗门资源：声望${result.data.prestige} ｜ 灵石${result.data.spiritStone}`);
		}
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "宗门战备",
			content: md,
			footer: [{
				label: "宗门战备",
				command: "/宗门战备"
			}, {
				label: "我的宗门",
				command: "/我的宗门"
			}]
		}));
		return;
	}
	const { guildName, guildLevel, prestige, spiritStone, contributionPoints, unlocked, teamMaxLevel, personalMaxLevel, canUpgradeTeam, team, personal } = result.data;
	md.addText(`宗门：${guildName} · ${guildLevel}级`);
	md.addNewline();
	md.addText(`宗门声望：${prestige} ｜ 宗门灵石：${spiritStone}`);
	md.addNewline();
	md.addText(`个人贡献点：${contributionPoints}`);
	md.addNewline();
	if (!unlocked) {
		md.addNewline();
		md.addText("宗门达到2级后，方可开启团队战阵与个人战备。");
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "宗门战备",
			content: md,
			footer: [{
				label: "我的宗门",
				command: "/我的宗门"
			}]
		}));
		return;
	}
	md.addNewline();
	md.addText(`【团队战阵】（当前宗门上限：${teamMaxLevel}级）`);
	md.addNewline();
	for (const line of team) {
		const lines = [`${line.name}：${line.level}/${line.maxLevel}`, `效果：${line.effectText}`];
		const actions = [];
		if (line.nextCostPrestige && line.nextCostSpiritStone) {
			lines.push(`下一级：声望${line.nextCostPrestige}、灵石${line.nextCostSpiritStone}`);
			if (canUpgradeTeam) actions.push({
				label: `团队${line.key}`,
				command: `/宗门战备 团队 ${line.key}`
			});
		} else lines.push("当前已达本宗门可提升上限");
		md.addBlockquote(createQuoteMarkdown(lines, actions));
	}
	md.addNewline();
	md.addText(`【个人战备】（当前宗门上限：${personalMaxLevel}级）`);
	md.addNewline();
	for (const line of personal) {
		const lines = [`${line.name}：${line.level}/${line.maxLevel}`, `效果：${line.effectText}`];
		const actions = [];
		if (line.nextCostContribution) {
			lines.push(`下一级：贡献点${line.nextCostContribution}`);
			actions.push({
				label: `个人${line.key}`,
				command: `/宗门战备 个人 ${line.key}`
			});
		} else lines.push("当前已达本宗门可提升上限");
		md.addBlockquote(createQuoteMarkdown(lines, actions));
	}
	md.addNewline();
	md.addText("生效范围：宗门主线、灵脉攻防战、宗门大比。");
	message.send(FormatGui({
		isPrivate,
		bid,
		title: "宗门战备",
		content: md,
		footer: [
			{
				label: "我的宗门",
				command: "/我的宗门"
			},
			{
				label: "宗门主线",
				command: "/宗门主线"
			},
			{
				label: "灵脉攻防战",
				command: "/灵脉攻防战"
			},
			{
				label: "宗门大比",
				command: "/宗门大比"
			}
		]
	}));
});

//#endregion
export { res_default as default };