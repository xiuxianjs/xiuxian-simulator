import { SDKError } from "../../api/core/error.js";
import { isPrivateEvent } from "../../utils/privateEvent.js";
import { markdownButtonLabel } from "../../utils/buttonLabel.js";
import { FormatGui, createQuoteMarkdown } from "../../utils/messageHelper.js";
import { formatGameTime } from "../../utils/gameTime.js";
import { useMessage as useMessage$1 } from "../../utils/useMessage.js";
import { selects } from "../config.js";
import { runRobotBusiness } from "../robotBusiness.js";
import { Format, logger, onResponse, useEvent, useRoute } from "alemonjs";

//#region src/response/blackBox/shared.ts
const target = (eventId, roomId) => `${eventId} ${roomId}`;
const clock = (date) => formatGameTime(date, "MM-DD HH:mm:ss");
function admittedPhaseLabel(serverTime, groupStartsAt) {
	if (!groupStartsAt) return "已入组 · 查看本组状态";
	const elapsed = Date.parse(serverTime) - Date.parse(groupStartsAt);
	if (elapsed < 0) return "已入组 · 等待开拍";
	if (elapsed < 6e4) return "鉴宝中 · 查看本组";
	if (elapsed < 18e4) return "暗标中 · 查看本组";
	return "暗标已截止 · 等待结算";
}
function reminderPhaseLabel(serverTime, opensAt, joinClosesAt) {
	const now = Date.parse(serverTime);
	if (joinClosesAt && now >= Date.parse(joinClosesAt)) return "入场已截止";
	if (now < Date.parse(opensAt)) return "待开场，开场后需点击入场";
	return joinClosesAt ? "可入场" : "查看排期确认入场窗口";
}
function createBlackBoxContext(e, overviewCommand = "/黑盒排期") {
	const [message] = useMessage$1();
	const [, next] = useEvent();
	const [route] = useRoute(e);
	const args = route.rawArgs;
	const privateChat = isPrivateEvent(e);
	let title = "黑盒拍卖会";
	let content = Format.createMarkdown();
	let operation;
	let received = false;
	let footer = [
		...overviewCommand === "/黑盒拍卖" ? [] : [{
			label: "拍卖首页",
			command: "/黑盒拍卖"
		}],
		{
			label: "今日排期",
			command: "/黑盒排期"
		},
		{
			label: "我的记录",
			command: "/黑盒记录"
		}
	];
	let nav;
	const quote = (lines, buttons = []) => {
		const block = createQuoteMarkdown(lines.filter(Boolean));
		for (const button of buttons) block.addText(" ").addButton(markdownButtonLabel(`${button.label}`), {
			data: button.command,
			...button.autoEnter === void 0 ? {} : { autoEnter: button.autoEnter }
		});
		content.addBlockquote(block);
	};
	const send = () => message.send(FormatGui({
		bid: e.UserId,
		isPrivate: privateChat,
		title,
		content,
		footer,
		nav
	}));
	async function call(requestedOperation, arguments_, parse) {
		operation = requestedOperation;
		received = false;
		const result = await runRobotBusiness(e, requestedOperation, arguments_, parse, next);
		received = true;
		return result.handled ? void 0 : result.data;
	}
	const usage = () => quote(["请选择场次或查看我的预约。"]);
	async function recover(error, reservationError = "预约结果待确认，请查看我的预约。") {
		logger.error("黑盒拍卖处理失败", {
			operation,
			received,
			message: error instanceof Error ? error.message : "未知异常",
			...error instanceof SDKError ? {
				code: error.code,
				status: error.status,
				requestId: error.requestId
			} : {}
		});
		content = Format.createMarkdown();
		footer = [];
		nav = void 0;
		const refresh = [
			"black-box.room",
			"black-box.probe",
			"black-box.bid-preview",
			"black-box.bid"
		].includes(operation ?? "") ? {
			label: "刷新",
			command: `/黑盒详情 ${args[0]} ${args[1]}`
		} : {
			label: "查看记录",
			command: "/黑盒记录"
		};
		quote([received ? "回执展示失败，请刷新核对结果。" : {
			"black-box.bid": "报价结果待确认，请刷新核对报价与占用。",
			"black-box.probe": "鉴宝结果待确认，请刷新查看已查线索与剩余次数。",
			"black-box.reservation": reservationError,
			"black-box.bid-preview": "预览失败 · 尚未提交报价",
			"black-box.overview": overviewCommand === "/黑盒拍卖" ? "概览暂未获取，请刷新。" : "排期暂未获取，请刷新。"
		}[operation] ?? "记录暂未获取，请刷新。"], !received && operation === "black-box.overview" ? [{
			label: overviewCommand === "/黑盒拍卖" ? "刷新概览" : "刷新今日排期",
			command: `${overviewCommand}${args[0] ? ` ${args[0]}` : ""}`
		}] : [refresh]);
		await send();
	}
	return {
		args,
		privateChat,
		quote,
		send,
		call,
		usage,
		recover,
		setTitle(value) {
			title = value;
		},
		setNav(value) {
			nav = value;
		},
		setRoomFooter(ref, notifications = true) {
			footer = [
				...notifications ? [{
					label: "通知我",
					command: `/黑盒提醒 ${ref}`
				}, {
					label: "取消通知",
					command: `/黑盒提醒 ${ref} 关闭`
				}] : [],
				{
					label: "刷新本场",
					command: `/黑盒详情 ${ref}`
				},
				...footer
			];
		}
	};
}
function validRoomArgs(args, count) {
	return args.length === count && /^\d+$/.test(args[0]) && Number.isSafeInteger(Number(args[0])) && Number(args[0]) > 0 && /^D\d{2}-\d{4}-[ABC]$/.test(args[1]);
}
function roomInput(args) {
	return {
		eventId: Number(args[0]),
		roomId: args[1]
	};
}
function bidInputHelp(view) {
	if (!validRoomArgs(view.args.slice(0, 2), 2)) {
		view.usage();
		return;
	}
	const ref = target(Number(view.args[0]), view.args[1]);
	view.quote(["请输入正整数报价，预览后再确认提交。"], [{
		label: "重新输入报价",
		command: `/黑盒出价 ${ref} `,
		autoEnter: false
	}, {
		label: "返回本场",
		command: `/黑盒详情 ${ref}`
	}]);
}
function bidAmount(view) {
	const raw = view.args[2];
	const amount = Number(raw);
	if (!/^\d+$/.test(raw) || !Number.isSafeInteger(amount) || amount <= 0) {
		view.quote(["报价须为正整数。"]);
		bidInputHelp(view);
		return;
	}
	return amount;
}
/** All auction commands, including reads and legacy aliases, share this gate. */
function onBlackBoxResponse(handler) {
	return onResponse(selects, async (event) => {
		if (!isPrivateEvent(event)) {
			const [message] = useMessage$1();
			const content = Format.createMarkdown().addBlockquote(createQuoteMarkdown(["黑盒拍卖仅限私聊，请私聊本机器人发送 /黑盒拍卖。"]));
			await message.send(FormatGui({
				bid: event.UserId,
				isPrivate: false,
				title: "黑盒拍卖会",
				content,
				footer: [],
				bar: false
			}));
			return;
		}
		await handler(event);
	});
}

//#endregion
export { admittedPhaseLabel, bidAmount, bidInputHelp, clock, createBlackBoxContext, onBlackBoxResponse, reminderPhaseLabel, roomInput, target, validRoomArgs };