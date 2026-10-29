import { FormatGui } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { appendMiddlewareAdvice, appendMiddlewareBlocks } from "../../middlewareReply.js";
import { resolveRobotTargetFromArg } from "../../../utils/targetUid.js";
import { parseRobotBountyPublish } from "../../../api/bot/bounty-actions.js";
import { bountyRecoveryTips } from "../../bountyRecovery.js";
import { selects } from "../../config.js";
import { adviceRenderer } from "../../feedbackRenderer.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { Format, onResponse, useEvent, useMention } from "alemonjs";

//#region src/response/bounty/publish/res.ts
/**
* 悬赏
* 指令：/悬赏 UID/@目标 金额 [人数]
*
* 对指定目标悬赏，扣除灵晶（含20%手续费）
*/
const bountyHeader = [{
	label: "悬赏榜",
	command: "/悬赏榜"
}, {
	label: "杀神榜",
	command: "/杀神榜"
}];
const bountyFooter = [
	{
		label: "记录",
		command: "/打劫记录"
	},
	{
		label: "悬赏",
		command: "/悬赏"
	},
	{
		label: "仇人",
		command: "/仇人"
	},
	{
		label: "煞气",
		command: "/煞气"
	}
];
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const [mention] = useMention();
	const bid = e?.UserId;
	const [, next] = useEvent();
	const isPrivate = e.isPrivate ?? e.name.startsWith("private.");
	const match = (e.MessageText ?? "").trim().match(/^(?:!|！|\/|#|＃)?悬赏\s+(\S+)\s+(\d+)(?:\s+(\d+))?$/);
	const sendFailure = async (text, reply) => {
		const md = Format.createMarkdown().addText(text);
		if (reply?.quote) md.addBlockquote(Format.createMarkdown().addText(reply.quote));
		appendMiddlewareBlocks(md, reply?.blocks?.filter((block) => block.text !== text || block.inlineButtons?.length));
		appendMiddlewareAdvice(md, reply?.advice ?? bountyRecoveryTips("bounty.publish", text));
		await message.send(FormatGui({
			isPrivate,
			bid,
			title: "悬赏",
			content: md,
			header: bountyHeader,
			footer: reply?.buttons.length ? reply.buttons : bountyFooter
		}));
	};
	let result;
	try {
		const target = match ? await resolveRobotTargetFromArg(match[1], mention) : null;
		result = await runRobotBusiness(e, "bounty.publish", {
			mode: match ? "publish" : "usage",
			target,
			amount: match ? String(parseInt(match[2], 10)) : null,
			maxCompletions: match?.[3] ? String(parseInt(match[3], 10)) : null
		}, parseRobotBountyPublish, next, adviceRenderer(async (reply) => {
			await sendFailure(reply.text, reply);
		}));
	} catch {
		await sendFailure(match ? "悬赏发布结果未获完整确认，请先核对当前悬赏和本人资产。" : "悬赏规则加载失败，请稍后再试");
		return;
	}
	if (result.handled) return;
	if (result.data.outcome === "policy") {
		const helpMd = Format.createMarkdown();
		const policy = result.data.policy;
		helpMd.addText("/悬赏 道友UID 金额 [人数]");
		helpMd.addNewline();
		helpMd.addBlockquote(Format.createMarkdown().addText(`赏金上限${policy.maxAmount}灵晶 · 每人至少${policy.minPerPerson}灵晶`).addNewline().addText(`名额${policy.minCompletions}~${policy.maxCompletions}人 · 默认${policy.defaultCompletions}人`).addNewline().addText(`手续费${policy.feePercent}%（不退还） · 有效期${policy.validHours}小时`));
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "悬赏",
			content: helpMd,
			header: bountyHeader,
			footer: bountyFooter
		}));
		return;
	}
	const d = result.data.data;
	const md = Format.createMarkdown();
	md.addText("悬赏发布成功");
	md.addNewline();
	md.addNewline();
	md.addText(`悬赏编号：#${d.bountyId}`);
	md.addNewline();
	md.addBlockquote(Format.createMarkdown().addText(`支付灵晶：${d.totalCost},手续费：${d.fee}`).addNewline().addText(`赏金池：${d.rewardPool},每人赏金：${d.rewardPerPerson}`).addNewline().addText(`允许完成：${d.maxCompletions}人,有效期：${d.validHours}小时`));
	message.send(FormatGui({
		isPrivate,
		bid,
		title: "悬赏",
		header: bountyHeader,
		footer: bountyFooter,
		content: md
	}));
	if (!isPrivate && d.targetName) {
		const f = Format.create();
		const broadcastMd = Format.createMarkdown();
		broadcastMd.addText(`🎯 有人悬赏 ${d.targetName} 的项上人头，赏金 ${d.rewardPool} 灵晶！`);
		f.addMarkdown(broadcastMd);
		message.send({ format: f });
	}
});

//#endregion
export { res_default as default };