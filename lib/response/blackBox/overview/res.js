import { currencyName, parseBlackBoxOverview } from "../../../api/schemas/black-box.js";
import { clock, createBlackBoxContext, onBlackBoxResponse } from "../shared.js";

//#region src/response/blackBox/overview/res.ts
var res_default = onBlackBoxResponse(async (e) => {
	const view = createBlackBoxContext(e, "/黑盒拍卖");
	try {
		if (view.args.length) {
			const time = view.args.length === 1 && /^([01]?\d|2[0-3])(?::[0-5]\d)?$/.test(view.args[0]) ? ` ${view.args[0]}` : "";
			view.quote(["排期请使用 /黑盒排期 查看。"], [{
				label: "查看排期",
				command: `/黑盒排期${time}`
			}]);
			await view.send();
			return;
		}
		const data = await view.call("black-box.overview", {}, parseBlackBoxOverview);
		if (!data) return;
		view.quote([
			data.enabled ? `今日普通额度 · 可用 ${data.allowanceAvailable}（次日重置）` : "普通额度 · 当前未开放，未发放",
			...["SPIRIT_CRYSTAL", "SPIRIT_MILK"].map((currency) => {
				const fund = data.funds.find((f) => f.currency === currency);
				return `${currencyName[currency]} · ${fund ? `可用 ${fund.available}` : "暂未获取"}`;
			}),
			...data.enabled ? [`额度占用 ${data.allowanceHeld} · 已用 ${data.allowanceSpent}`] : []
		]);
		view.quote([
			data.enabled ? data.schedule?.testWelfare ? "测试福利场 · 固定灵石×50" : "拍卖会已开放" : data.state === "scheduled" && data.startsAt ? `活动已排期，开放时间：${clock(data.startsAt)}` : data.state === "ended" ? "本批排期已结束；本人记录仍可查看。" : "活动暂未开放",
			"仅限私聊参与",
			...data.enabled ? [`每日参与补给 · ${data.supplementGranted ? "已领取" : "未领取"}`] : []
		]);
		if (data.enabled) view.quote([
			"普通额度800起拍 · 每日最多3次底价成交 · 失标不扣额度",
			"每日参与补给：筑灵石×20、灵石×50",
			"完成一场且保留合格报价即领，无需竞得"
		]);
		await view.send();
	} catch (error) {
		await view.recover(error);
	}
});

//#endregion
export { res_default as default };