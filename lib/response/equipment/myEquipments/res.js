import { parseBackendEquipped } from "../../../api/bot/equipped-queries.js";
import { FormatGui, addOptions } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { appendMiddlewareAdvice, appendMiddlewareBlocks } from "../../middlewareReply.js";
import { recoveryEffectsMarkdown } from "../../../utils/resourceRecoveryDisplay.js";
import { equipmentRecoveryTips } from "../../equipmentRecovery.js";
import { selects } from "../../config.js";
import { adviceRenderer } from "../../feedbackRenderer.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { formatSetEffectLine } from "../setEffectFormat.js";
import { Format, logger, onResponse, useEvent } from "alemonjs";

//#region src/response/equipment/myEquipments/res.ts
/**
* 我的装备指令
* 显示玩家所有部位的装备概览
*/
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const [, next] = useEvent();
	const isPrivate = e.isPrivate ?? false;
	try {
		const result = await runRobotBusiness(e, "equipment.equipped", {}, parseBackendEquipped, next, adviceRenderer(async (reply) => {
			const md = Format.createMarkdown();
			md.addText(reply.text);
			if (reply.quote) md.addBlockquote(Format.createMarkdown().addText(reply.quote));
			appendMiddlewareBlocks(md, reply.blocks?.filter((block) => block.text !== reply.text || block.inlineButtons?.length));
			appendMiddlewareAdvice(md, reply.advice);
			await message.send(FormatGui({
				isPrivate,
				bid,
				title: "",
				content: md,
				footer: reply.buttons.length ? reply.buttons : void 0
			}));
		}));
		if (result.handled) return;
		const data = result.data;
		const equippedSlots = data.slots;
		const playerName = data.playerName === "" ? "未知玩家" : data.playerName ?? "未知玩家";
		const md = Format.createMarkdown();
		if (equippedSlots.length === 0) {
			md.addText("暂无装备类型数据");
			appendMiddlewareAdvice(md, equipmentRecoveryTips("equipment.equipped", "暂无装备类型数据"));
			md.addNewline();
		} else equippedSlots.forEach((slot) => {
			const { type, item: equippedItem } = slot;
			const lineText = equippedItem ? `${type.name}：${equippedItem.equipment.name}` : `${type.name}：未装备`;
			md.addText(lineText);
			if (equippedItem) addOptions(md, [{
				label: "详情",
				command: `/我的${type.name}`
			}, {
				label: "卸下",
				command: `/卸下 ${type.name}`
			}]);
			else md.addNewline();
		});
		/**
		* 套装展示：件数与每项激活状态均由 Go 投影提供。
		*/
		if (data.sets.length > 0) {
			md.addBold("套装效果");
			md.addNewline();
			for (const setInfo of data.sets) {
				const effText = setInfo.effects.map((e) => formatSetEffectLine(e.effect, e.active)).join("\n");
				md.addText(`${setInfo.name ?? "未知套装"}（${setInfo.count}件）：`);
				md.addNewline();
				md.addBlockquote(Format.createMarkdown().addText(`${effText}`));
				if (setInfo.recoveryEffects?.length) md.addBlockquote(recoveryEffectsMarkdown(setInfo.recoveryEffects));
			}
		}
		md.addNewline();
		message.send(FormatGui({
			isPrivate,
			bid,
			title: `${playerName}的装备`,
			content: md,
			footer: [
				{
					label: "属性面板",
					command: "/属性面板"
				},
				{
					label: "一键装备",
					command: "/一键装备"
				},
				{
					label: "一键分解预览",
					command: "/一键分解装备"
				},
				...data.canUseFifthLayerFeature ? [{
					label: "模板",
					command: "/战斗模板"
				}] : [],
				{
					label: "储物袋",
					command: "/我的储物袋 装备"
				}
			]
		}));
	} catch (error) {
		logger.error("获取装备信息失败:", error);
		const md = Format.createMarkdown();
		md.addText("获取装备信息失败，请稍后重试");
		appendMiddlewareAdvice(md, equipmentRecoveryTips("equipment.equipped", "获取装备信息失败，请稍后重试"));
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "",
			content: md
		}));
	}
});

//#endregion
export { res_default as default };