import { formatGameTime } from "../../../utils/gameTime.js";
import { FormatGui } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { parseRobotGiftRecords } from "../../../api/bot/companion-robot-query.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/companion/giftRecords/res.ts
const parseQuery = (text) => {
	const match = (text ?? "").trim().match(/^[!！/#＃]?赠礼记录(?:\s+(送出|收到))?(?:\s+(\d+))?\s*$/);
	const mode = match?.[1] === "送出" ? "send" : match?.[1] === "收到" ? "receive" : "all";
	const page = match?.[2] ? Math.max(1, Number(match[2])) : 1;
	return {
		mode,
		page: Number.isFinite(page) ? Math.floor(page) : 1
	};
};
const buildFilterButtons = (mode) => [
	{
		label: "全部",
		selected: mode === "all",
		command: "/赠礼记录"
	},
	{
		label: "送出",
		selected: mode === "send",
		command: "/赠礼记录 送出"
	},
	{
		label: "收到",
		selected: mode === "receive",
		command: "/赠礼记录 收到"
	}
];
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	const text = (e.MessageText ?? "").trim();
	if (!/^[!！/#＃]?赠礼记录(?:\s+(送出|收到))?(?:\s+\d+)?\s*$/.test(text)) return;
	const query = parseQuery(text);
	const [, next] = useEvent();
	let response;
	try {
		response = await runRobotBusiness(e, "companion.gift-records", {
			mode: query.mode,
			page: String(query.page)
		}, (data) => parseRobotGiftRecords(data, query.mode), next, async (reply) => {
			await message.send(FormatGui({
				isPrivate,
				bid,
				title: reply.title,
				content: Format.createMarkdown().addText(reply.text),
				footer: reply.buttons.length ? reply.buttons : void 0
			}));
		});
	} catch {
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "赠礼记录",
			content: Format.createMarkdown().addText("查看赠礼记录失败，请稍后再试")
		}));
		return;
	}
	if (response.handled) return;
	const result = { data: response.data };
	const uid = e.uid;
	const { data } = result;
	const filterButtons = buildFilterButtons(query.mode);
	if (data.rows.length === 0) {
		const md = Format.createMarkdown();
		md.addText("暂无赠礼记录");
		md.addNewline();
		md.addText("可从好友页或赠送页进入赠礼流程。");
		message.send(FormatGui({
			isPrivate,
			bid,
			title: data.title,
			content: md,
			header: [{
				label: "返回好友",
				command: "/我的好友"
			}],
			footer: filterButtons
		}));
		return;
	}
	const md = Format.createMarkdown();
	md.addBlockquote(Format.createMarkdown().addText(`筛选：${query.mode === "send" ? "送出" : query.mode === "receive" ? "收到" : "全部"}`));
	for (const row of data.rows) {
		const isSender = row.senderUid === uid;
		const targetName = isSender ? row.receiverName : row.senderName;
		const actionText = isSender ? "送给" : "收到";
		const timeText = formatGameTime(row.created_at);
		const effectText = row.tongxinGained > 0 ? `灵契 +${row.intimacyGained} / 同心 +${row.tongxinGained}` : `灵契 +${row.intimacyGained}`;
		md.addText(`${timeText}【${row.relationText}${row.premium ? "·珍礼" : ""}】`);
		md.addNewline();
		md.addBlockquote(Format.createMarkdown().addText(`${actionText}：${targetName}`).addNewline().addText(`礼物：${row.giftName} x${row.quantity}`).addNewline().addText(`效果：${effectText}`));
	}
	message.send(FormatGui({
		isPrivate,
		bid,
		title: data.title,
		header: [{
			label: "返回好友",
			command: "/我的好友"
		}],
		content: md,
		nav: {
			current: data.currentPage,
			total: data.totalPages,
			count: data.total,
			command: `${data.cmdPrefix} {page}`
		},
		footer: filterButtons
	}));
});

//#endregion
export { res_default as default };