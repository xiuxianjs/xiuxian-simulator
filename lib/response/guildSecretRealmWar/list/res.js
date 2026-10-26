import { FormatGui } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { parseBackendSecretRealmList } from "../../../api/bot/guild-secret-realm-war.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/guildSecretRealmWar/list/res.ts
var res_default = onResponse(selects, async (e) => {
	const m = (e.MessageText || "").trim().match(/^[!！/#＃]?(?:灵脉攻防战|秘境攻防)列表\s*(\d+)?\s*$/);
	if (!m) return;
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const [, next] = useEvent();
	const md = Format.createMarkdown();
	const sendFailure = (text) => message.send(FormatGui({
		isPrivate: e.isPrivate ?? false,
		bid,
		title: "灵脉攻防战列表",
		content: md.addText(text),
		footer: [{
			label: "返回",
			command: "/灵脉攻防战"
		}]
	}));
	let loaded;
	try {
		loaded = await runRobotBusiness(e, "secret-realm.list", { page: String(Number(m[1] || 1)) }, parseBackendSecretRealmList, next, async (reply) => {
			await sendFailure(reply.text);
		});
	} catch (error) {
		await sendFailure(error?.message ?? "获取秘境列表失败");
		return;
	}
	if (loaded.handled) return;
	for (const item of loaded.data.items) {
		const winner = typeof item.winnerGuildName === "string" && item.winnerGuildName.length > 0 ? item.winnerGuildName : "无人占领";
		const points = typeof item.winnerPoints === "number" ? item.winnerPoints : 0;
		md.addText(`【${item.realmNo}】${item.name}（${item.tier}）\n领先：${winner} ${points}分\n查看：/灵脉攻防战查看 ${item.realmNo} 1\n`);
	}
	message.send(FormatGui({
		isPrivate: e.isPrivate ?? false,
		bid,
		title: "灵脉攻防战列表",
		content: md,
		footer: [{
			label: "返回",
			command: "/灵脉攻防战"
		}]
	}));
});

//#endregion
export { res_default as default };