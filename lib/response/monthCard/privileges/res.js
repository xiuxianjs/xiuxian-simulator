import { commandText } from "../../../utils/commandPrefix.js";
import { markdownButtonLabel } from "../../../utils/buttonLabel.js";
import { isPrivateEvent } from "../../../utils/privateEvent.js";
import { FormatGui } from "../../../utils/messageHelper.js";
import { section } from "../../presentation/sections.js";
import { mentionsRetiredFeature } from "../../retiredFeatures.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { parseBackendVipPrivileges } from "../../../api/bot/vip-privileges-queries.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { Format, logger, onResponse, useEvent } from "alemonjs";

//#region src/response/monthCard/privileges/res.ts
const packResetOptions = [{
	period: "weekly",
	code: "periodic-pack-reset-weekly",
	label: "重置本周",
	command: "/充值 周礼包 重置"
}, {
	period: "monthly",
	code: "periodic-pack-reset-monthly",
	label: "重置本月",
	command: "/充值 月礼包 重置"
}];
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const [, next] = useEvent();
	const bid = e.UserId;
	const isPrivate = isPrivateEvent(e);
	const footer = [{
		label: "返回权益",
		command: "/我的权益"
	}, {
		label: "充值购买",
		command: "/充值"
	}];
	const send = async (content) => {
		await message.send(FormatGui({
			isPrivate,
			bid,
			title: "我的特权",
			content,
			footer
		}));
	};
	try {
		const loaded = await runRobotBusiness(e, "membership.privileges", {}, parseBackendVipPrivileges, next, (reply) => send(Format.createMarkdown().addText(reply.text)));
		if (loaded.handled) return;
		const data = loaded.data;
		const md = Format.createMarkdown();
		const mode = e.MessageText.includes("未解锁") ? "locked" : e.MessageText.includes("月卡") ? "month" : "active";
		if (mode !== "month") md.addText(`VIP：${data.vipLevel} · 累计充值：¥${(data.totalRechargeAmount / 100).toFixed(2)}`).addNewline();
		const rows = (mode === "month" ? data.monthCardPrivileges : data.vipPrivileges.filter((row) => mode === "locked" ? !row.unlocked : row.unlocked && (row.minLevel === void 0 || row.minLevel === data.vipLevel))).filter((row) => !mentionsRetiredFeature(row.text) && !mentionsRetiredFeature(row.needText ?? ""));
		const resetRows = mode === "active" ? packResetOptions.flatMap((option) => {
			const row = rows.find((privilege) => privilege.code === option.code);
			return row ? [{
				...option,
				row
			}] : [];
		}) : [];
		const pagedRows = rows.filter((row) => !resetRows.some((reset) => reset.row === row));
		md.addText(`状态：${mode === "locked" ? "未解锁特权" : mode === "month" ? `月卡特权 · ${data.hasMonthCard ? "生效中" : "未生效"}` : "当前已生效特权"}`).addNewline();
		if (!rows.length) md.addText("暂无对应特权");
		const totalPage = Math.max(1, Math.ceil(pagedRows.length / 5));
		const requestedPage = Number(e.MessageText.match(/\s+(\d+)$/)?.[1] ?? 1);
		const page = Number.isSafeInteger(requestedPage) ? Math.min(totalPage, Math.max(1, requestedPage)) : 1;
		const pageCommand = mode === "locked" ? "/我的特权 未解锁 {page}" : mode === "month" ? "/我的特权 月卡 {page}" : "/我的特权 {page}";
		if (page === 1 && resetRows.length) {
			const block = Format.createMarkdown();
			let promptForPrivate = false;
			resetRows.forEach((reset, index) => {
				if (index > 0) block.addNewline();
				const status = data.periodicPackResets?.find((item) => item.period === reset.period);
				block.addBold(status?.used ? reset.row.text + "（已重置）" : reset.row.text);
				if (!status || status.used) return;
				if (isPrivate) block.addButton(markdownButtonLabel(reset.label), {
					data: commandText(reset.command),
					autoEnter: false
				});
				else promptForPrivate = true;
			});
			if (promptForPrivate) block.addNewline().addText("请在私聊打开「我的特权」重置。");
			md.addBlockquote(block);
		}
		for (const row of pagedRows.slice((page - 1) * 5, page * 5)) md.addBlockquote(section({
			title: row.text,
			suffix: mode === "locked" && row.minLevel !== void 0 ? `· VIP${row.minLevel}` : void 0,
			lines: row.needText ? [`条件：${row.needText}`] : []
		}));
		await message.send(FormatGui({
			isPrivate,
			bid,
			title: "我的特权",
			content: md,
			nav: totalPage > 1 ? {
				current: page,
				total: totalPage,
				count: pagedRows.length,
				command: pageCommand
			} : void 0,
			header: [
				{
					label: "已生效",
					selected: mode === "active",
					command: "/我的特权"
				},
				{
					label: "未解锁",
					selected: mode === "locked",
					command: "/我的特权 未解锁"
				},
				{
					label: "月卡",
					selected: mode === "month",
					command: "/我的特权 月卡"
				}
			],
			footer: [{
				label: "月卡奖励",
				command: "/我的权益 月卡"
			}, ...footer]
		}));
	} catch (error) {
		logger.error("我的特权查询失败:", error);
		await send(Format.createMarkdown().addText("特权状态暂未获取，请稍后重试。"));
	}
});

//#endregion
export { res_default as default };