import { formatGameTime } from "../../../utils/gameTime.js";
import { currencyName, parseBlackBoxBidPreview } from "../../../api/schemas/black-box.js";
import { bidAmount, bidInputHelp, createBlackBoxContext, onBlackBoxResponse, roomInput, target, validRoomArgs } from "../shared.js";

//#region src/response/blackBox/preview/res.ts
var res_default = onBlackBoxResponse(async (e) => {
	const view = createBlackBoxContext(e);
	if (!validRoomArgs(view.args, 3)) {
		bidInputHelp(view);
		await view.send();
		return;
	}
	try {
		const { args, call, quote, send } = view;
		const input = roomInput(args);
		const ref = target(input.eventId, input.roomId);
		const amount = bidAmount(view);
		if (amount === void 0) {
			await send();
			return;
		}
		const preview = await call("black-box.bid-preview", {
			...input,
			amount
		}, parseBlackBoxBidPreview);
		if (!preview) return;
		const r = preview.room;
		quote([
			`${formatGameTime(r.opensAt, "MM-DD HH:mm")} · ${r.roomId.slice(-1)}入口`,
			`暗标预览：${preview.amount}${currencyName[r.currency]}`,
			"尚未提交 · 确认后占用报价金额",
			`当前占用 ${r.ownHeld}${currencyName[r.currency]} → ${preview.amount}${currencyName[r.currency]}`,
			"竞得按报价支付，失标释放资金",
			...r.revealsAt ? [`全场${formatGameTime(r.revealsAt, "HH:mm")}起统一揭晓并结算，暗标截止后资金仍占用至结算。`] : []
		], [{
			label: "确认报价",
			command: `/确认黑盒出价 ${ref} ${preview.amount}`
		}, {
			label: "返回本场",
			command: `/黑盒详情 ${ref}`
		}]);
		await send();
	} catch (error) {
		await view.recover(error);
	}
});

//#endregion
export { res_default as default };