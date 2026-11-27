import { FormatGui, addOptions } from "../../../utils/messageHelper.js";
import { section } from "../../presentation/sections.js";
import { parseAttributePanel } from "../../../api/bot/attribute-panel.js";
import "../../presentation/index.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { renderCachedImage } from "../../../utils/imageRender.js";
import AttributePanel from "../../../img/views/AttributePanel.js";
import { checkEncounterAfterPanel } from "../../onlineEncounter/afterPanel.js";
import { battlePanelTable, formatPanelNumber } from "../battlePanelTable.js";
import { Format, ResultCode, logger, onResponse, useEvent } from "alemonjs";

//#region src/response/attributes/update/res.ts
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
			label: "宝物",
			command: "/宝物"
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
	const footer = [footerButtons.slice(0, 4), footerButtons.slice(4)];
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
	const attributeLines = [
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
	].map(([label, value, max]) => {
		return `${label}（${value > 0 && max > 0 ? Math.max(1, Math.min(100, Math.round(value / max * 100))) : 0}%）\u3000${formatPanelNumber(value)} / ${formatPanelNumber(max)}`;
	});
	const attributeQuote = section({ lines: [
		...attributeLines,
		"",
		"服用培元丹"
	] });
	contentMd.addBlockquote(addOptions(attributeQuote, pillActions));
	contentMd.addNewline().addBold("战斗属性").addNewline().addNewline();
	contentMd.addContent(battlePanelTable(d));
	contentMd.addNewline().addNewline();
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