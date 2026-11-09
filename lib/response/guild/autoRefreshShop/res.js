import { FormatGui, addOptions } from "../../../utils/messageHelper.js";
import { buildBubble } from "../../presentation/bubble.js";
import { confirmBubble } from "../../presentation/presets.js";
import "../../presentation/index.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { formatGuildShopAutoRefreshHours } from "../../../response-apps/guild/autoRefreshShop/view.js";
import { guildAutoRefreshArguments, parseRobotGuildAutoRefresh } from "../../../api/bot/guild-auto-refresh-robot-query.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/guild/autoRefreshShop/res.ts
/**
* 宗门商店自动刷新指令
* - /宗门商店自动刷新      ：查看当前设置
* - /宗门商店自动刷新 开启  ：开启自动刷新
* - /宗门商店自动刷新 关闭  ：关闭自动刷新
* - /宗门商店自动刷新 8 12 20：设置1-3个整点自动刷新
*/
/** 自动刷新指令正则 */
const AUTO_REFRESH_REG = /^(?:[!！/#＃])?宗门商店自动刷新(?:\s+(.+))?$/;
/** 自动刷新标题 */
const TITLE = "宗门商店自动刷新";
const REFRESH_COST = "费用：刷新成功会扣宗门灵石，当天依次扣 500、1,000、2,000，手动与自动共用次数";
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	const [, next] = useEvent();
	const match = (e.MessageText ?? "").trim().match(AUTO_REFRESH_REG);
	if (!match) return;
	const param = (match[1] ?? "").trim();
	try {
		const loaded = await runRobotBusiness(e, "guild.auto-refresh", guildAutoRefreshArguments(param), parseRobotGuildAutoRefresh, next, async (reply) => {
			const md = Format.createMarkdown().addText(reply.text);
			if (reply.buttons.length) {
				md.addNewline();
				md.addText("快捷设置：");
				addOptions(md, reply.buttons);
			}
			await message.send(FormatGui({
				isPrivate,
				bid,
				title: TITLE,
				content: md
			}));
		});
		if (loaded.handled) return;
		if (loaded.data.outcome === "preview") {
			await message.send(confirmBubble({
				isPrivate,
				bid,
				title: `${TITLE} · 确认设置`,
				target: [`时间：${formatGuildShopAutoRefreshHours(loaded.data.hours)}`, "有效期：60 秒"],
				costs: [REFRESH_COST, "结果：每次刷新会重置全体成员兑换记录"],
				actions: [{
					label: "确认开启",
					command: `/宗门商店自动刷新 确认 ${loaded.data.reference}`
				}],
				back: {
					label: "取消并返回设置",
					command: "/宗门商店自动刷新"
				}
			}));
			return;
		}
		if (loaded.data.outcome === "view") {
			handleViewAutoRefresh(message, bid, isPrivate, loaded.data.state);
			return;
		}
		const md = Format.createMarkdown().addText(loaded.data.message);
		if (loaded.data.isLeader) {
			md.addNewline();
			addOptions(md, [{
				label: "自动刷新",
				command: "/宗门商店自动刷新"
			}]);
		}
		message.send(FormatGui({
			isPrivate,
			bid,
			title: TITLE,
			content: md
		}));
	} catch (error) {
		await message.send(FormatGui({
			isPrivate,
			bid,
			title: TITLE,
			content: Format.createMarkdown().addText(error instanceof Error ? error.message : "设置自动刷新失败")
		}));
	}
});
/**
* 查询并展示当前自动刷新设置
*/
function handleViewAutoRefresh(message, bid, isPrivate, state) {
	const enabled = state.enabled;
	const hours = state.hours;
	let statusText;
	if (enabled && hours.length > 0) statusText = `状态：已开启，${formatGuildShopAutoRefreshHours(hours)}自动刷新`;
	else statusText = "状态：未开启";
	const actions = !(state.isLeader || state.isViceLeader) ? [] : enabled ? [{
		label: "关闭",
		command: "/宗门商店自动刷新 关闭"
	}, {
		label: "改为 8 12 20",
		command: "/宗门商店自动刷新 8 12 20"
	}] : [
		{
			label: "开启",
			command: "/宗门商店自动刷新 开启"
		},
		{
			label: "8 12 20",
			command: "/宗门商店自动刷新 8 12 20"
		},
		{
			label: "8 20",
			command: "/宗门商店自动刷新 8 20"
		},
		{
			label: "12 20",
			command: "/宗门商店自动刷新 12 20"
		}
	];
	message.send(buildBubble({
		isPrivate,
		bid,
		title: TITLE,
		sections: [{ lines: [
			statusText,
			REFRESH_COST,
			"时间：可设置 1–3 个整点（0–23）"
		] }],
		footer: [actions.slice(0, 2), actions.slice(2)].filter((row) => row.length > 0)
	}));
}

//#endregion
export { res_default as default };