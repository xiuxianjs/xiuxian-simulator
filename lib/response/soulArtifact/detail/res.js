import { markdownButtonLabel } from "../../../utils/buttonLabel.js";
import { FormatGui } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { appendMiddlewareAdvice, appendMiddlewareBlocks } from "../../middlewareReply.js";
import { recoveryEffectsMarkdown } from "../../../utils/resourceRecoveryDisplay.js";
import { detailRecoveryTips } from "../../detailRecovery.js";
import { withBusinessRecovery } from "../../businessRecovery.js";
import { selects } from "../../config.js";
import { adviceRenderer } from "../../feedbackRenderer.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { parseRobotSoulDetail } from "../../../api/bot/soul-artifact-overview-queries.js";
import { soulArtifactActions, soulArtifactBlockedAdvice } from "../capabilities.js";
import { Format, logger, onResponse, useEvent } from "alemonjs";

//#region src/response/soulArtifact/detail/res.ts
const COMMAND_REGEX = /^(!|！|\/|#|＃)?本命物详情\s+(\d+)$/;
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? e.name.startsWith("private.");
	const match = (e.MessageText ?? "").trim().match(COMMAND_REGEX);
	const [, parentNext] = useEvent();
	const renderFailure = adviceRenderer(async (reply) => {
		reply = withBusinessRecovery("soul-artifacts.detail", reply);
		const md = Format.createMarkdown();
		if (reply.heading) md.addBold(reply.heading).addNewline();
		const plainBlocks = (reply.blocks ?? []).filter((block) => !block.quoted && !block.inlineButtons?.length);
		if (!plainBlocks.length || plainBlocks.map((block) => block.text).join("") !== reply.text) md.addText(reply.text);
		for (const block of plainBlocks) if (block.text === "\n") md.addNewline();
		else md.addText(block.text);
		if (reply.quote) md.addBlockquote(Format.createMarkdown().addText(reply.quote));
		appendMiddlewareBlocks(md, reply.blocks?.filter((block) => block.quoted || block.inlineButtons?.length));
		appendMiddlewareAdvice(md, reply.advice);
		await message.send(FormatGui({
			isPrivate,
			bid,
			title: reply.title || "本命物详情",
			...reply.buttons.length ? { header: reply.buttons } : {},
			content: md
		}));
	});
	const response = await runRobotBusiness(e, "soul-artifacts.detail", { instanceId: match?.[2] ?? null }, (value) => {
		const artifact = parseRobotSoulDetail(value);
		if (!match || artifact.instanceId !== Number(match[2]) || artifact.capabilities.some((capability) => capability.instanceId !== artifact.instanceId)) throw new Error("本命物详情目标不匹配");
		soulArtifactActions(artifact.capabilities);
		return artifact;
	}, parentNext, renderFailure).catch(async (error) => {
		logger.error("[本命物详情] 查询失败", error);
		await renderFailure({
			title: "",
			heading: "",
			text: "本命物详情查询未获完整确认，请从本人当前列表重新核对实例编号。",
			buttons: [{
				label: "返回储物袋",
				command: "/储物袋 本命"
			}],
			advice: detailRecoveryTips("soul-artifacts.detail", "查询失败")
		});
		return { handled: true };
	});
	if (response.handled) return;
	const artifact = response.data;
	const maxLevel = artifact.maxLevel;
	const contentMd = Format.createMarkdown();
	contentMd.addText(`本命物：${artifact.name}（${artifact.gradeName}）`);
	contentMd.addNewline();
	contentMd.addText(`编号：${artifact.instanceId}`);
	contentMd.addNewline();
	contentMd.addText(`状态：${artifact.statusText}`);
	contentMd.addNewline();
	contentMd.addText(`定位：${artifact.category} · ${artifact.positioning}`);
	contentMd.addNewline();
	contentMd.addText(`等级：Lv.${artifact.level} / ${maxLevel}`);
	contentMd.addNewline();
	contentMd.addText(`洗涤：${artifact.washCount}次（${artifact.washQuality}）`);
	contentMd.addNewline();
	if (artifact.revealedAffixCount < artifact.maxAffixCount) {
		contentMd.addText(`显现词条：${artifact.revealedAffixCount} / ${artifact.maxAffixCount}`);
		contentMd.addNewline();
	}
	contentMd.addNewline();
	if (artifact.recoveryEffects?.length) {
		contentMd.addBlockquote(recoveryEffectsMarkdown(artifact.recoveryEffects));
		contentMd.addNewline();
	}
	contentMd.addText(artifact.combatPanels ? "当前境界战斗加成" : "基础面板");
	contentMd.addNewline();
	for (const panel of artifact.combatPanels ?? artifact.basePanels) contentMd.addBlockquote(Format.createMarkdown().addText(` ${panel.name}：${artifact.combatPanels ? "+" : ""}${panel.value}`));
	contentMd.addNewline();
	contentMd.addText(artifact.combatPanels ? "洗炼记录" : "词条");
	contentMd.addNewline();
	for (const panel of artifact.panels) {
		const tag = panel.affixTypeName;
		if (panel.isPercent) contentMd.addBlockquote(Format.createMarkdown().addText(` ${panel.name}(${tag})：${+Number(panel.washBonus).toFixed(2)}% / ${+Number(panel.washCap).toFixed(2)}%`));
		else contentMd.addBlockquote(Format.createMarkdown().addText(` ${panel.name}(${tag})：${panel.washBonus} / ${panel.washCap}`));
		contentMd.addNewline();
	}
	const actionMd = Format.createMarkdown();
	for (const action of soulArtifactActions(artifact.capabilities)) actionMd.addText(" ").addButton(markdownButtonLabel(action.label), { data: action.command });
	actionMd.addText(" ").addButton(markdownButtonLabel("储物袋 · 本命"), { data: "/储物袋 本命" });
	contentMd.addBlockquote(actionMd);
	appendMiddlewareAdvice(contentMd, soulArtifactBlockedAdvice(artifact.capabilities));
	await message.send(FormatGui({
		isPrivate,
		bid,
		title: "本命物详情",
		header: [{
			label: "返回储物袋",
			command: "/储物袋 本命"
		}, {
			label: "本命物信息",
			command: "/本命物信息"
		}],
		content: contentMd
	}));
});

//#endregion
export { res_default as default };