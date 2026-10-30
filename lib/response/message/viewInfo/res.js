import { parseBackendPublicPlayerProfile } from "../../../api/bot/public-player-profile-query.js";
import { FormatGui } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { resolveRobotTarget } from "../../../utils/targetUid.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { Format, logger, onResponse, useEvent, useMention } from "alemonjs";

//#region src/response/message/viewInfo/res.ts
/**
* 查看信息指令响应
* 指令：/查看信息 123 或 /查看信息 @目标
* 用于查看指定 UID/@目标 的境界与属性概览
*/
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const [mention] = useMention();
	const bid = e.UserId;
	const isPrivate = e.isPrivate ?? false;
	const [, next] = useEvent();
	const target = await resolveRobotTarget(e.MessageText || "", mention);
	if (!target) {
		const md = Format.createMarkdown();
		md.addText("请输入目标UID，格式：/查看信息 123 或 /查看信息 @目标");
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "",
			content: md
		}));
		return;
	}
	try {
		const result = await runRobotBusiness(e, "profile.view", { target }, parseBackendPublicPlayerProfile, next);
		if (result.handled) return;
		const data = result.data;
		if (!data.found || !data.profile || !data.cave) {
			const md = Format.createMarkdown();
			md.addText("未找到目标用户信息，请检查UID是否正确。");
			message.send(FormatGui({
				isPrivate,
				bid,
				title: "",
				content: md
			}));
			return;
		}
		const profile = {
			...data.profile,
			hideProfile: data.hideProfile
		};
		const cave = data.cave;
		if (profile.hideProfile) {
			const md = Format.createMarkdown();
			md.addBold("查看信息");
			md.addNewline();
			md.addText(`【${profile.name}】`);
			md.addNewline();
			md.addText(`称号：${profile.activeTitle}`);
			md.addNewline();
			md.addText(`UID：${profile.uid}`);
			md.addNewline();
			md.addText(`境界：${profile.realmName}`);
			md.addNewline();
			md.addNewline();
			md.addBold("洞府来访");
			md.addNewline();
			md.addText(`当前关系：${cave.relationLabel}`);
			md.addNewline();
			md.addText(`灵气可见：${cave.canViewAura ? "可感知" : "不可感知"}`);
			md.addNewline();
			md.addText(`灵气浓度：${cave.auraText}`);
			md.addNewline();
			md.addText(cave.summary);
			md.addNewline();
			md.addNewline();
			md.addText("该玩家已隐藏个人信息");
			message.send(FormatGui({
				isPrivate,
				bid,
				title: "",
				content: md
			}));
			return;
		}
		const detail = data.detail;
		if (!detail) {
			const md = Format.createMarkdown();
			md.addText("查看信息失败，请稍后再试。");
			message.send(FormatGui({
				isPrivate,
				bid,
				title: "",
				content: md
			}));
			return;
		}
		const md = Format.createMarkdown();
		md.addBold("查看信息");
		md.addNewline();
		md.addText(`【${profile.name}】`);
		md.addNewline();
		md.addText(`称号：${profile.activeTitle}`);
		md.addNewline();
		md.addText(`UID：${profile.uid}`);
		md.addNewline();
		md.addText(`境界：${profile.realmName}`);
		md.addNewline();
		md.addNewline();
		md.addBold("洞府来访");
		md.addNewline();
		md.addText(`当前关系：${cave.relationLabel}`);
		md.addNewline();
		md.addText(`灵气可见：${cave.canViewAura ? "可感知" : "不可感知"}`);
		md.addNewline();
		md.addText(`灵气浓度：${cave.auraText}`);
		md.addNewline();
		md.addText(cave.summary);
		md.addNewline();
		md.addNewline();
		md.addBold("属性");
		md.addNewline();
		md.addText(`力量：${detail.strength}  智慧：${detail.intelligence}`);
		md.addNewline();
		md.addText(`体质：${detail.constitution}  敏捷：${detail.agility}`);
		md.addNewline();
		md.addText(`气运：${detail.luck}`);
		md.addNewline();
		md.addNewline();
		md.addBold("战斗属性");
		md.addNewline();
		md.addText(`物理攻击：${detail.battle.physicalAttack}`);
		md.addNewline();
		md.addText(`物理防御：${detail.battle.physicalDefense}`);
		md.addNewline();
		md.addText(`法术攻击：${detail.battle.magicAttack}`);
		md.addNewline();
		md.addText(`法术防御：${detail.battle.magicDefense}`);
		md.addNewline();
		md.addText(`生命上限：${detail.battle.hp}`);
		md.addNewline();
		md.addText(`速度：${detail.battle.speed}`);
		md.addNewline();
		md.addText(`暴击几率：${detail.battle.critRate}%`);
		md.addNewline();
		md.addText(`暴击伤害：${detail.battle.critDamage}%`);
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "",
			content: md
		}));
	} catch (error) {
		logger.error(error);
		const md = Format.createMarkdown();
		md.addText("查看信息失败，请稍后再试。");
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