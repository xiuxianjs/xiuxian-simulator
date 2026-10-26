import { FormatGui, createQuoteMarkdown } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { parseRobotCompanionInfo } from "../../../api/bot/companion-robot-query.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/companion/info/res.ts
/**
* 我的道侣指令
*/
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	const [, next] = useEvent();
	let response;
	try {
		response = await runRobotBusiness(e, "companion.info", {}, parseRobotCompanionInfo, next, async (reply) => {
			await message.send(FormatGui({
				isPrivate,
				bid,
				title: reply.title,
				header: reply.buttons.some((button) => button.command === "/结为道侣") ? [{
					label: "申请列表",
					command: "/同意道侣"
				}] : void 0,
				content: Format.createMarkdown().addText(reply.text),
				footer: reply.buttons.length ? reply.buttons : void 0
			}));
		});
	} catch {
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "我的道侣",
			content: Format.createMarkdown().addText("获取道侣信息失败，请稍后重试")
		}));
		return;
	}
	if (response.handled) return;
	const d = { data: response.data }.data;
	const infoLines = [
		`道侣：${d.partnerName}（${d.partnerRealm}）`,
		`灵契值：${d.intimacy}（${d.spiritBondLevel}）`,
		`同心值：${d.tongxin}`,
		`誓约类型：${d.oathType === "advanced" ? "高级誓约" : "普通誓约"}`,
		`经验加成：+${d.blessingPercent}%`,
		`双修经验：+${d.dualCultivationExp}`
	];
	const dailyLines = [
		`双修：${d.dailyDualCultivationUsed}/1`,
		`秘境同行：${d.dailyDungeonUsed}/5`,
		`赠送礼物：${d.dailyGiftUsed}/2`
	];
	const md = Format.createMarkdown();
	md.addText(infoLines.join("\n"));
	md.addNewline();
	md.addText("【今日陪伴】");
	md.addBlockquote(Format.createMarkdown().addText(d.companionMessage));
	md.addText("【今日活动】");
	md.addBlockquote(createQuoteMarkdown(dailyLines));
	if (d.anniversaryMessage) md.addBlockquote(Format.createMarkdown().addText(`🎋 ${d.anniversaryMessage}`));
	md.addNewline();
	message.send(FormatGui({
		isPrivate,
		bid,
		title: "【我的道侣】",
		content: md,
		footer: [
			{
				label: "道侣任务",
				command: "/道侣任务"
			},
			{
				label: "代签到",
				command: "/道侣签到"
			},
			{
				label: "代领月卡",
				command: "/道侣月卡"
			},
			{
				label: "照料灵田",
				command: "/一键照料道侣灵田"
			},
			{
				label: "双修",
				command: "/双修"
			},
			{
				label: "赠送",
				command: `/赠送 ${d.partnerId}`
			},
			...d.oathType === "normal" ? [{
				label: "升级誓约",
				command: "/升级誓约"
			}] : [],
			{
				label: "解除道侣",
				command: "/解除道侣"
			}
		]
	}));
});

//#endregion
export { res_default as default };