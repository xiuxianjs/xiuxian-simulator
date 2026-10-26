import { formatGameTime } from "../../../utils/gameTime.js";
import { currencyName, parseBlackBoxOverview } from "../../../api/schemas/black-box.js";
import { clock, createBlackBoxContext, onBlackBoxResponse, target } from "../shared.js";

//#region src/response/blackBox/schedule/res.ts
var res_default = onBlackBoxResponse(async (e) => {
	const view = createBlackBoxContext(e);
	try {
		const { args, quote, send, call, usage } = view;
		view.setTitle(args.length ? "黑盒拍卖 · 场次入口" : "黑盒拍卖 · 今日排期");
		const selectedTime = args[0]?.replace("：", ":");
		if (args.length > 1 || selectedTime && !/^([01]?\d|2[0-3])(?::[0-5]\d)?$/.test(selectedTime)) {
			usage();
			await send();
			return;
		}
		const data = await call("black-box.overview", {}, parseBlackBoxOverview);
		if (!data) return;
		if (!data.enabled) quote([data.state === "scheduled" && data.startsAt ? `活动已排期，开放时间：${clock(data.startsAt)}` : data.state === "ended" ? "本期活动已结束；本人记录仍可查看。" : "活动暂未开放"]);
		if (data.schedule && data.eventId) {
			const schedule = data.schedule;
			const clicking = schedule.admissionPolicy === "click-window-v1";
			quote([`第${schedule.day}日场次${schedule.testWelfare ? " · 测试福利场" : ""}`, ...schedule.testWelfare && schedule.startsAt && schedule.endsAt ? [`测试时间：${clock(schedule.startsAt)}—${clock(schedule.endsAt)}（结束不含）`] : []]);
			let matched = false;
			for (const s of data.schedule.sessions) {
				const hour = formatGameTime(s.opensAt, "H");
				const slotTime = formatGameTime(s.opensAt, "HH:mm");
				const matches = selectedTime?.includes(":") ? selectedTime.padStart(5, "0") === slotTime : Number(selectedTime) === Number(hour);
				if (selectedTime && !matches) continue;
				matched = true;
				if (!args.length) {
					const opened = Date.parse(data.serverTime) >= Date.parse(s.opensAt);
					const joining = clicking && opened && s.joinClosesAt && Date.parse(data.serverTime) < Date.parse(s.joinClosesAt);
					const phaseLabel = clicking ? s.rooms.every((r) => r.status === "cancelled") ? "流拍" : joining ? "入场中" : opened ? "入场截止" : "未开场" : s.rooms.every((r) => r.status === "cancelled") ? "已取消" : opened ? s.rooms.some((r) => r.status === "pending") ? "等待开场处理" : "预约截止" : "可预约";
					quote([`${slotTime} · ${s.type} · ${phaseLabel}`], [{
						label: "查看入口",
						command: `/黑盒排期 ${slotTime}`
					}]);
					continue;
				}
				quote([
					`${slotTime} · ${s.type}`,
					...clicking ? ["点击“通知我”订阅本场：开场前3分钟提醒、开放匹配、实际开组和最终结算。直接入场不会订阅。"] : [],
					...clicking && s.joinClosesAt ? [`入场截止 ${formatGameTime(s.joinClosesAt, "HH:mm")} · 3人即开，截止2人开，1人流拍`] : []
				]);
				for (const r of s.rooms) {
					const now = Date.parse(data.serverTime);
					const open = Date.parse(s.opensAt);
					const pending = !r.status || r.status === "pending";
					const buttons = [];
					if (clicking && pending && s.joinClosesAt && now < Date.parse(s.joinClosesAt)) {
						buttons.push(now < open ? {
							label: "通知我",
							command: `/黑盒提醒 ${target(data.eventId, r.id)}`
						} : {
							label: "入场",
							command: `/黑盒入场 ${target(data.eventId, r.id)}`
						});
						if (now >= open) buttons.push({
							label: "通知我",
							command: `/黑盒提醒 ${target(data.eventId, r.id)}`
						});
					} else if (!clicking && pending && now < open) buttons.push({
						label: "预约",
						command: `/黑盒预约 ${target(data.eventId, r.id)}`
					});
					else buttons.push({
						label: "我的记录",
						command: "/黑盒记录"
					});
					quote([
						`【${r.label}】${currencyName[r.currency]}${r.floor}起拍`,
						r.clue,
						...r.status === "cancelled" ? [clicking ? "本入口已流拍" : "本入口已取消"] : []
					], buttons);
				}
			}
			if (args.length && !matched) quote([`今日${selectedTime?.includes(":") ? selectedTime : `${Number(selectedTime)}点`}暂无场次`], [{
				label: "今日排期",
				command: "/黑盒排期"
			}]);
		}
		if (!data.schedule?.sessions.length) quote(["暂无场次排期"]);
		await send();
	} catch (error) {
		await view.recover(error);
	}
});

//#endregion
export { res_default as default };