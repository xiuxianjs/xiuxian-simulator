import { FormatGui, addOptions, createQuoteMarkdown } from "../../../utils/messageHelper.js";
import { section } from "../../presentation/sections.js";
import { parseAttributePanel } from "../../../api/bot/attribute-panel.js";
import "../../presentation/index.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { renderCachedImage } from "../../../utils/imageRender.js";
import { recoverySummaryMarkdown } from "../../../utils/resourceRecoveryDisplay.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import AttributePanel from "../../../img/views/AttributePanel.js";
import { checkEncounterAfterPanel } from "../../onlineEncounter/afterPanel.js";
import { Format, ResultCode, logger, onResponse, useEvent } from "alemonjs";

//#region src/response/attributes/update/res.ts
const formatPanelNumber = new Intl.NumberFormat("en-US", { maximumSignificantDigits: 21 }).format;
const pillActions = [
	{
		label: "✛1",
		command: "/服用 培元丹 1"
	},
	{
		label: "✛3",
		command: "/服用 培元丹 3"
	},
	{
		label: "✛5",
		command: "/服用 培元丹 5"
	}
];
/**
* 展示道号、境界、五维属性、自由属性点及战斗属性
*/
const response = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	if (!e.UserId) {
		const md = Format.createMarkdown();
		md.addText("未找到用户信息，请先踏入仙途");
		message.send(FormatGui({
			isPrivate,
			bid,
			content: md
		}));
		return;
	}
	const [, parentNext] = useEvent();
	const sendFailure = async (text) => {
		const md = Format.createMarkdown();
		md.addText(text);
		const footerButtons = [{
			label: "装备",
			command: "/我的装备"
		}, {
			label: "功法",
			command: "/我的功法"
		}];
		md.addNewline();
		md.addText("属性分配");
		addOptions(md, pillActions);
		await message.send(FormatGui({
			isPrivate,
			bid,
			content: md,
			footer: footerButtons
		}));
	};
	const result = await runRobotBusiness(e, "attributes.panel", {}, parseAttributePanel, parentNext, (reply) => sendFailure(reply.text)).catch(async (error) => {
		logger.error(error);
		await sendFailure("更新属性失败，请联系运营");
		return { handled: true };
	});
	if (result.handled) return;
	const d = result.data;
	const footerButtons = [
		{
			label: "装备",
			command: "/我的装备"
		},
		{
			label: "功法",
			command: "/我的功法"
		},
		{
			label: "宝录",
			command: "/天师宝录"
		},
		...d.access.canUseSoulArtifact ? [{
			label: "本命",
			command: "/我的本命物"
		}] : [],
		...d.access.canUseSoulPath ? [{
			label: "道途印证",
			command: "/道途印证"
		}] : [],
		...d.access.canUseMeridian ? [{
			label: "经络",
			command: "/经络"
		}] : [{
			label: "闭关",
			command: "/闭关"
		}]
	];
	const footer = [footerButtons.slice(0, 3), footerButtons.slice(3)];
	if (/^\/?属性面板图$/.test(e.MessageText?.trim() ?? "")) {
		let imageSent = false;
		try {
			const { access: _access, resourceRecovery: _recovery, ...stats } = d;
			const image = await renderCachedImage(AttributePanel, {
				...stats,
				avatarURL: e.UserAvatar
			}, "panel:attributes");
			if (image) {
				const receipts = await message.send({ format: Format.create().addImage(image) });
				imageSent = receipts.length > 0 && receipts.every((receipt) => receipt.code === ResultCode.Ok);
			}
		} catch (error) {
			logger.error(error);
		}
		if (imageSent) {
			const content = Format.createMarkdown();
			if (d.resourceRecovery) content.addBlockquote(recoverySummaryMarkdown(d.resourceRecovery)).addNewline();
			content.addBlockquote(section({
				lines: ["服用培元丹"],
				actions: pillActions
			}));
			await message.send(FormatGui({
				isPrivate,
				bid,
				title: "属性面板操作",
				content,
				footer
			}));
			return;
		}
	}
	const contentMd = Format.createMarkdown();
	contentMd.addText(`境界：${d.realmName}`).addNewline();
	contentMd.addText(d.mid ? `MID：${d.mid}` : `UID: ${d.uid}`).addNewline();
	contentMd.addText(`战力：${formatPanelNumber(d.combatPower)}`).addNewline().addNewline();
	contentMd.addBold(`自由属性${d.maxAttributeBonus ? ` · 上限加成 ${d.maxAttributeBonus > 0 ? "+" : ""}${formatPanelNumber(d.maxAttributeBonus)}%` : ""}`).addNewline();
	const attributes = [
		[
			"力量",
			d.strength,
			d.maxStrength
		],
		[
			"智慧",
			d.intelligence,
			d.maxIntelligence
		],
		[
			"体质",
			d.constitution,
			d.maxConstitution
		],
		[
			"敏捷",
			d.agility,
			d.maxAgility
		],
		[
			"气运",
			d.luck,
			d.maxLuck
		]
	];
	const attributeLines = [];
	for (const [label, value, max] of attributes) {
		const filled = max > 0 ? Math.max(0, Math.min(10, Math.floor(value / max * 10))) : 0;
		if (attributeLines.length > 0) attributeLines.push("");
		attributeLines.push(`${label}\u3000${formatPanelNumber(value)} / ${formatPanelNumber(max)}`, "▓".repeat(filled) + "░".repeat(10 - filled));
	}
	attributeLines.push("", "服用培元丹");
	contentMd.addBlockquote(createQuoteMarkdown(attributeLines, pillActions));
	contentMd.addNewline().addBold("战斗属性").addNewline().addNewline();
	contentMd.addContent([
		"| 属性 | 数值 | 属性 | 数值 |",
		"| :--- | ---: | :--- | ---: |",
		`| 物理攻击 | ${formatPanelNumber(d.physicalAttack)} | 物理防御 | ${formatPanelNumber(d.physicalDefense)} |`,
		`| 法术攻击 | ${formatPanelNumber(d.magicAttack)} | 法术防御 | ${formatPanelNumber(d.magicDefense)} |`,
		`| 生命上限 | ${formatPanelNumber(d.hp)} | 灵力上限 | ${formatPanelNumber(d.spiritualPower)} |`,
		`| 速度 | ${formatPanelNumber(d.speed)} | 念力上限 | ${formatPanelNumber(d.mentalPower)} |`,
		`| 暴击率 | ${formatPanelNumber(d.critRate)}% | 暴击伤害 | ${formatPanelNumber(d.critDamage)}% |`,
		`| 抗暴率 | ${formatPanelNumber(d.antiCritRate)}% | 命中率 | ${formatPanelNumber(d.hitRate)}% |`,
		...d.mpRecoveryEfficiency !== void 0 && d.mentalRecoveryEfficiency !== void 0 ? [`| 回灵效率 | ${formatPanelNumber(d.mpRecoveryEfficiency)}% | 回念效率 | ${formatPanelNumber(d.mentalRecoveryEfficiency)}% |`] : [],
		`| 闪避率 | ${formatPanelNumber(d.dodgeRate)}% | | |`
	].join("\n"));
	contentMd.addNewline().addNewline();
	if (d.resourceRecovery) contentMd.addBlockquote(recoverySummaryMarkdown(d.resourceRecovery, formatPanelNumber));
	await checkEncounterAfterPanel(e, "attributes", message, message.send(FormatGui({
		isPrivate,
		bid,
		title: `属性面板 · ${d.daoName}`,
		content: contentMd,
		footer
	})));
});

//#endregion
export { response as default };