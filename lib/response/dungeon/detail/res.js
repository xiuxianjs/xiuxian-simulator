import { markdownButtonLabel } from "../../../utils/buttonLabel.js";
import { FormatGui, createQuoteMarkdown } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { appendMiddlewareAdvice } from "../../middlewareReply.js";
import { withBusinessRecovery } from "../../businessRecovery.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { buildDropDetailCommand, formatDropProbability } from "./view.js";
import { dungeonDetailArguments, parseRobotDungeonDetail } from "../../../api/bot/dungeon-robot-query.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/dungeon/detail/res.ts
/**
* 秘境详情指令响应
* 指令：/秘境详情 <秘境名称>
* 展示单个秘境的完整信息：掉落物详情、首通奖励、次数等
*/
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	const [, next] = useEvent();
	const sendFailure = async (text) => {
		const md = Format.createMarkdown().addText(text);
		await message.send(FormatGui({
			isPrivate,
			bid,
			title: "秘境详情",
			content: md
		}));
	};
	const loaded = await runRobotBusiness(e, "dungeon.detail", dungeonDetailArguments(e.MessageText || ""), parseRobotDungeonDetail, next, async (reply) => {
		await sendFailure(reply.text);
	}).catch(async (error) => {
		await sendFailure(error instanceof Error ? error.message : "秘境详情读取失败");
		return { handled: true };
	});
	if (loaded.handled) return;
	const result = loaded.data;
	if (result.outcome === "usage") {
		const md = Format.createMarkdown();
		md.addText("请指定秘境名称，例如：/秘境详情 桃花镇");
		appendMiddlewareAdvice(md, withBusinessRecovery("dungeon.detail", {
			title: "",
			heading: "",
			text: "请指定秘境名称",
			buttons: [],
			advice: []
		}).advice);
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "秘境详情",
			content: md
		}));
		return;
	}
	const d = result.data;
	const contentMd = Format.createMarkdown();
	contentMd.addText(`【${d.name}】【${d.isSingle ? "单人" : "多人"}${d.typeLabel}】`);
	contentMd.addNewline();
	contentMd.addNewline();
	contentMd.addBlockquote(Format.createMarkdown().addText(`境界限制：${d.realmLimit}`).addNewline().addText(`消耗精力：${d.spiritCost}`));
	if (d.guildContributionCost > 0) contentMd.addBlockquote(Format.createMarkdown().addText(`消耗宗门贡献：${d.guildContributionCost}`));
	if (d.minPlayers > 1) contentMd.addBlockquote(Format.createMarkdown().addText(`最少人数：${d.minPlayers}`));
	contentMd.addBlockquote(Format.createMarkdown().addText(`${d.limitText}`).addNewline().addText(`${d.freeText}`));
	contentMd.addText(`必然获得：${d.mustGain}`);
	contentMd.addNewline();
	contentMd.addNewline();
	if (d.skillDrops.length > 0) {
		contentMd.addText("可能获得功法：");
		contentMd.addNewline();
		for (const drop of d.skillDrops) {
			const detailCommand = buildDropDetailCommand(drop.category, drop.itemId);
			contentMd.addBlockquote(createQuoteMarkdown([`${drop.name}（${formatDropProbability(drop.probability)}）`], detailCommand ? [{
				label: "详情",
				command: detailCommand
			}] : []));
		}
		contentMd.addNewline();
	}
	if (d.materialDrops.length > 0) {
		contentMd.addText("可能获得物品：");
		contentMd.addNewline();
		for (const drop of d.materialDrops) {
			const detailCommand = buildDropDetailCommand(drop.category, drop.itemId);
			contentMd.addBlockquote(createQuoteMarkdown([`${drop.name} ×${drop.amount}（${formatDropProbability(drop.probability)}）`], detailCommand ? [{
				label: "详情",
				command: detailCommand
			}] : []));
		}
		contentMd.addNewline();
	}
	if (d.firstClearReward) {
		contentMd.addText(`🎉 首通奖励：${d.firstClearReward.parts.join("、")}`);
		contentMd.addNewline();
	}
	if (d.outputMultiplier !== null) contentMd.addBlockquote(Format.createMarkdown().addText(`灵脉攻防战加成：${d.outputMultiplier.toFixed(2)}倍(✛${d.outputAddPct.toFixed(0)}%）`));
	const actionMd = Format.createMarkdown();
	if (d.hasCleared && !d.inTeam) {
		actionMd.addText(" ").addButton(markdownButtonLabel("扫荡"), { data: `/扫荡秘境 ${d.name}` });
		actionMd.addText(" ").addButton(markdownButtonLabel("×10"), { data: `/扫荡秘境 ${d.name} 10` });
		actionMd.addText(" ").addButton(markdownButtonLabel("探索"), { data: `/探索秘境 ${d.name}` });
	} else actionMd.addText(" ").addButton(markdownButtonLabel("挑战"), { data: `/秘境挑战 ${d.name}` });
	contentMd.addBlockquote(actionMd);
	message.send(FormatGui({
		isPrivate,
		bid,
		title: `秘境详情 - ${d.name}`,
		header: [{
			label: "返回",
			command: "/查看秘境"
		}, {
			label: "队伍",
			command: "/我的队伍"
		}],
		content: contentMd
	}));
});

//#endregion
export { res_default as default };