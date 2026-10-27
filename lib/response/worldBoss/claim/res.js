import { formatGameDate } from "../../../utils/gameTime.js";
import { FormatGui } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { parseWorldBossClaimAll } from "../../../api/bot/world-boss-claim.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/worldBoss/claim/res.ts
/**
* 领取凶兽奖励指令
* 指令：#领取凶兽奖励
*/
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	const [, next] = useEvent();
	const sendFailure = async (text) => {
		const md = Format.createMarkdown();
		md.addText(text);
		await message.send(FormatGui({
			isPrivate,
			bid,
			title: "",
			content: md
		}));
	};
	const loaded = await runRobotBusiness(e, "world-boss.reward-claim", {}, parseWorldBossClaimAll, next, async (reply) => {
		await sendFailure(reply.text);
	}).catch(async (error) => {
		await sendFailure(error instanceof Error ? error.message : "领取奖励失败");
		return { handled: true };
	});
	if (loaded.handled) return;
	const md = Format.createMarkdown();
	const { items, totalStone, totalCrystal } = loaded.data;
	md.addText("✅ 凶兽奖励领取成功");
	md.addNewline();
	md.addNewline();
	for (const r of items) {
		md.addText(`${formatGameDate(r.bossDate)} · ${r.stageName} · ${r.tierName}`);
		md.addNewline();
		const rewards = [];
		if (r.spiritStone > 0) rewards.push(`灵石 ×${r.spiritStone}`);
		if (r.spiritCrystal > 0) rewards.push(`灵晶 ×${r.spiritCrystal}`);
		md.addText(`  → ${rewards.join("、")}`);
		md.addNewline();
	}
	if (items.length > 1) {
		md.addNewline();
		md.addText("【合计】");
		md.addNewline();
		const totals = [];
		if (totalStone > 0) totals.push(`灵石 ×${totalStone}`);
		if (totalCrystal > 0) totals.push(`灵晶 ×${totalCrystal}`);
		md.addBlockquote(Format.createMarkdown().addText(`${totals.join("、")}`));
	}
	md.addNewline();
	message.send(FormatGui({
		isPrivate,
		bid,
		title: "领取凶兽奖励",
		header: [{
			label: "返回",
			command: "/凶兽"
		}],
		content: md,
		footer: [{
			label: "凶兽信息",
			command: "/凶兽"
		}]
	}));
});

//#endregion
export { res_default as default };