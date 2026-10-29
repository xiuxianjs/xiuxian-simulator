import { FormatGui } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { parseBackendSecretRealmClaim } from "../../../api/bot/guild-secret-realm-war.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/guildSecretRealmWar/claim/res.ts
var res_default = onResponse(selects, async (e) => {
	if (!/^[!！/#＃]?(?:灵脉攻防战|秘境攻防)领取奖励\s*$/.test((e.MessageText || "").trim())) return;
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const [, next] = useEvent();
	const md = Format.createMarkdown();
	const sendFailure = (text) => message.send(FormatGui({
		isPrivate: e.isPrivate ?? false,
		bid,
		title: "灵脉攻防战",
		content: md.addText(text),
		footer: [{
			label: "返回",
			command: "/灵脉攻防战"
		}]
	}));
	let loaded;
	try {
		loaded = await runRobotBusiness(e, "secret-realm.claim", {}, parseBackendSecretRealmClaim, next, async (reply) => {
			await sendFailure(reply.text);
		});
	} catch (error) {
		await sendFailure(error?.message ?? "领取奖励失败");
		return;
	}
	if (loaded.handled) return;
	md.addText(`领取成功：灵晶${loaded.data.spiritCrystal} ｜ 贡献${loaded.data.contribution} ｜ 宗门声望${loaded.data.reputation}`);
	message.send(FormatGui({
		isPrivate: e.isPrivate ?? false,
		bid,
		title: "灵脉攻防战",
		content: md,
		footer: [{
			label: "返回",
			command: "/灵脉攻防战"
		}]
	}));
});

//#endregion
export { res_default as default };