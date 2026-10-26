import { formatGameTime } from "../../../utils/gameTime.js";
import { currencyName, parseBlackBoxHistory, statusName } from "../../../api/schemas/black-box.js";
import { admittedPhaseLabel, clock, createBlackBoxContext, onBlackBoxResponse, reminderPhaseLabel, target } from "../shared.js";

//#region src/response/blackBox/history/res.ts
const inspectable = (status) => [
	"admitted",
	"won",
	"lost",
	"passed",
	"system_cancelled"
].includes(status);
var res_default = onBlackBoxResponse(async (e) => {
	const view = createBlackBoxContext(e);
	try {
		const { args, quote, send, call, usage } = view;
		if (args.length > 1 || args.length && (!/^\d+$/.test(args[0]) || !Number.isSafeInteger(Number(args[0])) || Number(args[0]) < 1)) {
			usage();
			await send();
			return;
		}
		const data = await call("black-box.history", { page: Number(args[0] ?? 1) }, parseBlackBoxHistory);
		if (!data) return;
		if (!data.items.length) quote(["暂无参拍记录"]);
		for (const r of data.items) {
			const ref = target(r.eventId, r.roomId), buttons = [];
			const now = Date.parse(data.serverTime), open = Date.parse(r.opensAt);
			if (inspectable(r.status)) buttons.push({
				label: "详情",
				command: `/黑盒详情 ${ref}`
			});
			if ([
				"reserved",
				"waiting",
				"admitted"
			].includes(r.status)) buttons.push({
				label: "通知我",
				command: `/黑盒提醒 ${ref}`
			}, {
				label: "取消通知",
				command: `/黑盒提醒 ${ref} 关闭`
			});
			const clicking = r.admissionPolicy === "click-window-v1";
			if (clicking) {
				const closes = r.joinClosesAt ? Date.parse(r.joinClosesAt) : NaN;
				if (r.status === "reserved" && now >= open && now < closes) buttons.push({
					label: "入场",
					command: `/黑盒入场 ${ref}`
				});
				if (["reserved", "waiting"].includes(r.status) && now < closes) buttons.push({
					label: r.status === "waiting" ? "退队并取消通知" : "取消预约",
					command: `/黑盒取消 ${ref}`
				});
			} else if (r.status === "reserved" && now < open) {
				if (!r.confirmed && now >= open - 3e5) buttons.push({
					label: "确认参拍",
					command: `/黑盒确认 ${ref}`
				});
				buttons.push({
					label: "取消预约",
					command: `/黑盒取消 ${ref}`
				});
			}
			quote([
				`【${r.roomId.slice(-1)}】${formatGameTime(r.opensAt, "MM-DD HH:mm")} · 第${r.activityDay}日`,
				r.title,
				`${clicking && r.status === "reserved" ? reminderPhaseLabel(data.serverTime, r.opensAt, r.joinClosesAt) : clicking && r.status === "admitted" ? admittedPhaseLabel(data.serverTime, r.groupStartsAt) : statusName[r.status]}${!clicking && r.confirmed && r.status === "reserved" ? " · 已确认" : ""}`,
				...r.statusReason ? [r.statusReason] : [],
				...r.ownBid || r.ownHeld ? [`报价 ${r.ownBid}${currencyName[r.currency]} · 占用 ${r.ownHeld}${currencyName[r.currency]}`] : [],
				...r.charged ? [`已支付${r.charged}${currencyName[r.currency]}`] : [],
				...clicking && r.joinClosesAt && ["reserved", "waiting"].includes(r.status) ? [`点击入场截止：${clock(r.joinClosesAt)}`] : !clicking && r.status === "reserved" ? [`确认窗口：${clock((/* @__PURE__ */ new Date(open - 3e5)).toISOString())}—${clock(r.opensAt)}`] : []
			], buttons);
		}
		view.setNav({
			current: data.page,
			hasNext: data.hasMore,
			command: "/黑盒记录 {page}"
		});
		await send();
	} catch (error) {
		await view.recover(error);
	}
});

//#endregion
export { res_default as default };