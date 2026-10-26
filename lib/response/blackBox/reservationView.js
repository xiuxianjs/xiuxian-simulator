import { formatGameTime } from "../../utils/gameTime.js";
import { statusName } from "../../api/schemas/black-box.js";
import { admittedPhaseLabel, clock, reminderPhaseLabel, target } from "./shared.js";

//#region src/response/blackBox/reservationView.ts
function renderReservation(r, view, eventId) {
	const { quote, privateChat } = view;
	const ref = target(eventId, r.roomId);
	if (r.notificationEnabled !== void 0) quote([r.notificationEnabled ? "已订阅本场后续通知，不补发已过节点。" : "本场通知已关闭。", "通知设置不代替入场或退队，不改变报价及资金占用。"]);
	if (r.joinClosesAt) {
		const buttons = [{
			label: privateChat ? "刷新记录" : "本人记录（私聊）",
			command: "/黑盒记录"
		}];
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
		const now = Date.parse(r.serverTime);
		const joining = now >= Date.parse(r.opensAt) && now < Date.parse(r.joinClosesAt);
		if (r.status === "reserved" && joining) buttons.unshift({
			label: "入场",
			command: `/黑盒入场 ${ref}`
		});
		if (["reserved", "waiting"].includes(r.status) && now < Date.parse(r.joinClosesAt)) buttons.push({
			label: r.status === "waiting" ? "退队并取消通知" : "取消预约",
			command: `/黑盒取消 ${ref}`
		});
		if (r.status === "cancelled" && now < Date.parse(r.joinClosesAt) && formatGameTime(r.serverTime, "YYYY-MM-DD") === formatGameTime(r.opensAt, "YYYY-MM-DD")) buttons.unshift({
			label: "返回本场入口",
			command: `/黑盒排期 ${formatGameTime(r.opensAt, "HH:mm")}`
		});
		if (r.status === "admitted") buttons.unshift({
			label: privateChat ? "查看本组" : "私聊查看本组",
			command: `/黑盒详情 ${ref}`
		});
		quote([
			`${clock(r.opensAt)} · ${r.roomId.slice(-1)}入口`,
			r.status === "reserved" ? reminderPhaseLabel(r.serverTime, r.opensAt, r.joinClosesAt) : r.status === "waiting" ? "排队中 · 不占用资金" : r.status === "admitted" ? admittedPhaseLabel(r.serverTime, r.groupStartsAt) : statusName[r.status],
			...["reserved", "waiting"].includes(r.status) ? [`入场截止 ${clock(r.joinClosesAt)} · 3人即开，截止2人开，1人流拍`] : [],
			...r.groupStartsAt ? [`本组开拍：${clock(r.groupStartsAt)}`] : []
		], buttons);
		return;
	}
	const buttons = [{
		label: "我的记录",
		command: "/黑盒记录"
	}], now = Date.parse(r.serverTime), open = Date.parse(r.opensAt);
	if (r.status === "reserved" && !r.confirmed && now >= open - 3e5 && now < open) buttons.push({
		label: "确认参拍",
		command: `/黑盒确认 ${ref}`
	});
	quote([
		`${clock(r.opensAt)} · ${r.roomId.slice(-1)}入口 · ${statusName[r.status]}${r.confirmed ? " · 已确认" : ""}`,
		r.status === "cancelled" ? "" : "预约不扣款 · 开拍时复查资格与资金",
		...r.status === "reserved" ? [`确认窗口：${clock((/* @__PURE__ */ new Date(open - 3e5)).toISOString())}—${clock(r.opensAt)}`] : []
	], buttons);
}

//#endregion
export { renderReservation };