import { FormatGui } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { parseBackendSecretRealmHome } from "../../../api/bot/guild-secret-realm-war.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/guildSecretRealmWar/home/res.ts
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	const [, next] = useEvent();
	const md = Format.createMarkdown();
	const sendFailure = (text) => message.send(FormatGui({
		isPrivate,
		bid,
		title: "灵脉攻防战",
		content: md.addText(text)
	}));
	let loaded;
	try {
		loaded = await runRobotBusiness(e, "secret-realm.home", {}, parseBackendSecretRealmHome, next, async (reply) => {
			await sendFailure(reply.text);
		});
	} catch (error) {
		await sendFailure(error?.message ?? "获取灵脉攻防战信息失败");
		return;
	}
	if (loaded.handled) return;
	const data = loaded.data;
	const display = data.display;
	md.addText(`状态：${display.statusLabel}`).addNewline().addText(`开放：${data.activeStart} ~ ${data.activeEnd}`);
	if (display.participationNotice) md.addNewline().addText(display.participationNotice);
	if (data.isActive) md.addNewline().addText(`攻击次数：${display.attackRemaining}/${data.maxAttack}`);
	if (display.membershipNotice) md.addNewline().addText(display.membershipNotice);
	if (display.activeOwnedText !== null) md.addNewline().addText(`本期战果：${display.activeOwnedText}`).addNewline().addText(`灵脉加持：${display.outputMultiplierText}倍`).addNewline().addText("惠及宗门挖矿灵石、灵田普通材料收成、打坐／闭关修为；原有秘境收益加成保留。");
	if (display.settledOwnedText !== null) {
		md.addNewline().addText(`上期战果：${display.settledOwnedText}`).addNewline().addText(`可领灵晶：${display.rewardText}`);
		if (display.canPromptClaim) md.addNewline().addText("输入 /灵脉攻防战领取奖励 领取本期奖励。");
	}
	message.send(FormatGui({
		isPrivate,
		bid,
		title: "灵脉攻防战",
		content: md,
		footer: [{
			label: "攻防列表",
			command: "/灵脉攻防战列表 1"
		}]
	}));
});

//#endregion
export { res_default as default };