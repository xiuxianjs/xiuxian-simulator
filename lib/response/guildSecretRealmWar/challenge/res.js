import { FormatGui } from "../../../utils/messageHelper.js";
import { formatGameTime } from "../../../utils/gameTime.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { parseBackendSecretRealmChallenge } from "../../../api/bot/guild-secret-realm-war.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/guildSecretRealmWar/challenge/res.ts
var res_default = onResponse(selects, async (e) => {
	const m = (e.MessageText || "").trim().match(/^[!！/#＃]?(?:灵脉攻防战|秘境攻防)挑战\s+(\d+)\s+(\d+)\s*$/);
	if (!m) return;
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const [, next] = useEvent();
	const md = Format.createMarkdown();
	const sendFailure = (text) => message.send(FormatGui({
		isPrivate: e.isPrivate ?? false,
		bid,
		title: "灵脉攻防战 - 挑战",
		content: md.addText(text),
		footer: [{
			label: "返回",
			command: "/灵脉攻防战"
		}]
	}));
	let loaded;
	try {
		loaded = await runRobotBusiness(e, "secret-realm.challenge", {
			realmNo: String(Number(m[1])),
			positionNo: String(Number(m[2]))
		}, parseBackendSecretRealmChallenge, next, async (reply) => {
			await sendFailure(reply.text);
		});
	} catch (error) {
		await sendFailure(error?.message ?? "挑战失败");
		return;
	}
	if (loaded.handled) return;
	const r = loaded.data;
	md.addText(r.won ? "挑战胜利，已占领该位置。" : "挑战失败。");
	if (r.participationContribution > 0) md.addNewline().addText(`本周首次有效占领：贡献 +${r.participationContribution}（已到账）`);
	if (typeof r.frozenUntil === "string") md.addNewline().addText(`冻结至：${formatGameTime(r.frozenUntil)}`);
	message.send(FormatGui({
		isPrivate: e.isPrivate ?? false,
		bid,
		title: "灵脉攻防战 - 挑战",
		content: md,
		footer: [{
			label: "返回",
			command: "/灵脉攻防战"
		}]
	}));
});

//#endregion
export { res_default as default };