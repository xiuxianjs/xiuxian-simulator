import { FormatGui, addOptions, createQuoteMarkdown } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { parseAttributePanel } from "../../../api/bot/attribute-panel.js";
import { recoverySummaryMarkdown } from "../../../utils/resourceRecoveryDisplay.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { Format, logger, onResponse, useEvent } from "alemonjs";

//#region src/response/attributes/update/res.ts
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
		addOptions(md, [
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
		]);
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
	const contentMd = Format.createMarkdown();
	contentMd.addText(`境界：${d.realmName}`).addNewline();
	contentMd.addText(`UID: ${d.uid}`).addNewline();
	contentMd.addText(`战力：${d.combatPower}`).addNewline().addNewline();
	contentMd.addBold(`自由属性${d.maxAttributeBonus ? ` · 上限加成 ${d.maxAttributeBonus > 0 ? "+" : ""}${d.maxAttributeBonus}%` : ""}`).addNewline();
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
		attributeLines.push(`${label}\u3000${value} / ${max}`, "▓".repeat(filled) + "░".repeat(10 - filled));
	}
	attributeLines.push("", "服用培元丹");
	contentMd.addBlockquote(createQuoteMarkdown(attributeLines, [
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
	]));
	contentMd.addNewline().addBold("战斗属性").addNewline().addNewline();
	contentMd.addContent([
		"| 属性 | 数值 | 属性 | 数值 |",
		"| :--- | ---: | :--- | ---: |",
		`| 物理攻击 | ${d.physicalAttack} | 物理防御 | ${d.physicalDefense} |`,
		`| 法术攻击 | ${d.magicAttack} | 法术防御 | ${d.magicDefense} |`,
		`| 生命上限 | ${d.hp} | 灵力上限 | ${d.spiritualPower} |`,
		`| 速度 | ${d.speed} | 念力上限 | ${d.mentalPower} |`,
		`| 暴击率 | ${d.critRate}% | 暴击伤害 | ${d.critDamage}% |`,
		`| 抗暴率 | ${d.antiCritRate}% | 命中率 | ${d.hitRate}% |`,
		...d.mpRecoveryEfficiency !== void 0 && d.mentalRecoveryEfficiency !== void 0 ? [`| 回灵效率 | ${d.mpRecoveryEfficiency}% | 回念效率 | ${d.mentalRecoveryEfficiency}% |`] : [],
		`| 闪避率 | ${d.dodgeRate}% | | |`
	].join("\n"));
	contentMd.addNewline().addNewline();
	if (d.resourceRecovery) contentMd.addBlockquote(recoverySummaryMarkdown(d.resourceRecovery));
	await message.send(FormatGui({
		isPrivate,
		bid,
		title: `属性面板 · ${d.daoName}`,
		content: contentMd,
		footer: [footerButtons.slice(0, 3), footerButtons.slice(3)]
	}));
});

//#endregion
export { response as default };