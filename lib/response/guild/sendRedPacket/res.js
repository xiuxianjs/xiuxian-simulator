import { FormatGui } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { guildRedPacketSendArguments, parseRobotGuildRedPacketSend } from "../../../api/bot/guild-red-packet-send-robot-query.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/guild/sendRedPacket/res.ts
const currencies = [
	{
		label: "贡献点",
		value: "contribution"
	},
	{
		label: "灵晶",
		value: "spirits_crystal"
	},
	{
		label: "灵石",
		value: "spirit_stone"
	}
];
const counts = [
	5,
	10,
	15,
	20,
	25,
	30
];
const amounts = [
	100,
	1e3,
	1e4,
	1e5
];
function usage() {
	const md = Format.createMarkdown();
	md.addBold("🧧 发红包");
	md.addNewline();
	md.addText("用法：/发红包 货币 份数 每份金额");
	md.addNewline();
	md.addText(`货币：${currencies.map((item) => item.label).join(" / ")}`);
	md.addNewline();
	md.addText(`份数：${counts.join(" / ")}`);
	md.addNewline();
	md.addText(`金额：${amounts.join(" / ")}`);
	md.addNewline();
	md.addNewline();
	md.addText("发送需消耗1个红包道具，并先持有“份数×每份金额”的全额；发送者随后自动领取1份。");
	md.addNewline();
	md.addText("红包有效期3天，过期未领完的剩余余额可由发送者在“我发的红包”中核对并回收。");
	return md;
}
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	const [, next] = useEvent();
	const args = (e.MessageText ?? "").trim().match(/^[!！/#＃]?发红包(?:\s+(.+))?$/)?.[1]?.trim().split(/\s+/).filter(Boolean) ?? [];
	const send = async (text) => {
		await message.send(FormatGui({
			isPrivate,
			bid,
			title: "",
			content: Format.createMarkdown().addText(text),
			footer: [{
				label: "宗门红包",
				command: "/宗门红包"
			}, {
				label: "我发的红包",
				command: "/我发的红包"
			}]
		}));
	};
	const loaded = await runRobotBusiness(e, "guild.red-packet-send", guildRedPacketSendArguments(args), parseRobotGuildRedPacketSend, next, async (reply) => {
		await send(reply.text);
	}).catch(async (error) => {
		await send(error instanceof Error ? error.message : "发红包失败，请稍后再试。");
		return { handled: true };
	});
	if (loaded.handled) return;
	if (loaded.data.outcome === "usage") {
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "",
			content: usage(),
			footer: [
				{
					label: "灵石 5份 100",
					command: "/发红包 灵石 5 100"
				},
				{
					label: "灵晶 10份 100",
					command: "/发红包 灵晶 10 100"
				},
				{
					label: "贡献点 15份 100",
					command: "/发红包 贡献点 15 100"
				},
				{
					label: "核对个人资产",
					command: "/我的信息"
				},
				{
					label: "我发的红包",
					command: "/我发的红包"
				}
			]
		}));
		return;
	}
	await send(loaded.data.receipt.message);
});

//#endregion
export { res_default as default };