import { parseGuildStorylineRecords } from "../../../api/bot/queries.js";
import { FormatGui } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/guild/storyline/recordsRes.ts
var recordsRes_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	const [, next] = useEvent();
	const sendFailure = async (text) => {
		await message.send(FormatGui({
			isPrivate,
			bid,
			title: "",
			content: Format.createMarkdown().addText(text)
		}));
	};
	const loaded = await runRobotBusiness(e, "guild.storyline-records", {}, parseGuildStorylineRecords, next, async (reply) => {
		await sendFailure(reply.text);
	}).catch(async (error) => {
		await sendFailure(error instanceof Error ? error.message : "读取宗门主线记录失败");
		return { handled: true };
	});
	if (loaded.handled) return;
	const result = { data: loaded.data };
	const md = Format.createMarkdown();
	md.addBold("【宗门主线记录】");
	md.addNewline();
	md.addText(`宗门：${result.data.guildName} · ${result.data.guildLevel}级`);
	md.addNewline();
	md.addNewline();
	if (result.data.records.length === 0) md.addText("今日还没有挑战记录");
	else result.data.records.forEach((record) => {
		md.addText(`第${record.attemptNo}次 · 第${record.stageIndex}关 · 伤害${record.damageDealt} · 参与点${record.participationPoint} · ${record.isEffective ? "有效" : "无效"} · ${record.battleResult ? "胜" : "负"}`);
		md.addNewline();
	});
	message.send(FormatGui({
		isPrivate,
		bid,
		title: "",
		content: md
	}));
});

//#endregion
export { recordsRes_default as default };