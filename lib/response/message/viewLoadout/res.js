import { isPrivateEvent } from "../../../utils/privateEvent.js";
import { formatFullNumber } from "../../../utils/formatHelper.js";
import { detailBubble, errorBubble } from "../../presentation/presets.js";
import "../../presentation/index.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { resolveRobotTarget } from "../../../utils/targetUid.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { parseTargetSuggestions, targetSuggestionsBubble } from "../../targetSuggestions.js";
import { parseBackendPublicPlayerLoadout } from "../../../api/bot/public-player-loadout-query.js";
import "../../attributes/battlePanelTable.js";
import { logger, onResponse, useEvent, useMention } from "alemonjs";

//#region src/response/message/viewLoadout/res.ts
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const [mention] = useMention();
	const [, next] = useEvent();
	const bubble = {
		isPrivate: isPrivateEvent(e),
		bid: e.UserId,
		title: "查看配装"
	};
	const returnToInfo = [{
		label: "返回查看信息",
		command: "/查看信息"
	}];
	try {
		const target = await resolveRobotTarget(e.MessageText || "", mention);
		const result = await runRobotBusiness(e, "profile.loadout", {
			target,
			suggestTargets: true
		}, (value) => parseTargetSuggestions(value, parseBackendPublicPlayerLoadout), next);
		if (result.handled) return;
		if (result.data.mode === "suggestions") {
			await message.send(targetSuggestionsBubble(e, "查看配装", result.data.ids, result.data.reason, void 0, returnToInfo));
			return;
		}
		const { profile, hideProfile, loadout } = result.data.result;
		if (!profile) {
			await message.send(errorBubble({
				...bubble,
				reason: "结果：未找到目标玩家。",
				footer: returnToInfo
			}));
			return;
		}
		const footer = [{
			label: "返回查看信息",
			command: `/查看信息 ${profile.uid}`
		}];
		const player = {
			title: profile.name,
			id: profile.mid ?? profile.uid
		};
		const lines = [`境界：${profile.realmName}`];
		if (hideProfile || !loadout) lines.push("状态：该玩家已隐藏个人信息，配装不可查看。");
		else {
			const { equipment, skillBooks, soulArtifact } = loadout;
			lines.push("");
			if (!equipment.length) lines.push("装备：未穿戴");
			for (const item of equipment) {
				lines.push(`装备 · ${item.slot}：${[item.name, item.grade].filter(Boolean).join(" · ")}`);
				if (item.set) lines.push(`套装：${item.set}`);
				if (item.stats.length) {
					const stats = item.stats.map(({ label, value, percent }) => `${label} ${value > 0 ? "+" : ""}${formatFullNumber(value)}${percent ? "%" : ""}`);
					lines.push(`属性：${stats.join(" · ")}`);
				}
			}
			lines.push("");
			if (!skillBooks.length) lines.push("功法：暂无可展示的装配功法");
			for (const item of skillBooks) {
				lines.push(`功法 · ${item.slot}：${[item.name, item.grade].filter(Boolean).join(" · ")}`);
				const details = [];
				if (item.cost > 0) details.push(`${item.slot === "神通" ? "念力" : "灵力"}消耗：${item.cost}`);
				if (item.cooldown > 0) details.push(`冷却：${item.cooldown} 回合`);
				if (details.length) lines.push(details.join(" · "));
			}
			lines.push("");
			if (soulArtifact) {
				const { name, grade, level, category, positioning, description } = soulArtifact;
				lines.push(`本命物：${[
					name,
					grade,
					`${level} 级`
				].filter(Boolean).join(" · ")}`);
				if (category) lines.push(`类别：${category}`);
				if (positioning) lines.push(`定位：${positioning}`);
				if (description) lines.push(`说明：${description}`);
			} else lines.push("本命物：未出战");
		}
		await message.send(detailBubble({
			...bubble,
			groups: [{
				...player,
				lines
			}],
			footer
		}));
	} catch (error) {
		logger.error(error);
		await message.send(errorBubble({
			...bubble,
			reason: "结果：查看配装失败，请稍后再试。",
			footer: returnToInfo
		}));
	}
});

//#endregion
export { res_default as default };