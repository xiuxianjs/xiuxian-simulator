import { FormatGui } from "../../utils/messageHelper.js";
import { buildBubble } from "../presentation/bubble.js";
import { errorBubble, resultBubble } from "../presentation/presets.js";
import { createBackendRequestContext } from "../../api/bot/context.js";
import { formatGameTime } from "../../utils/gameTime.js";
import "../presentation/index.js";
import { useMessage as useMessage$1 } from "../../utils/useMessage.js";
import { parsePeriodicPackReset, validPeriodicPackResetReference } from "../../api/bot/recharge-periodic-packs.js";
import { adviceRenderer } from "../feedbackRenderer.js";
import { runRobotBusiness } from "../robotBusiness.js";
import { buildPeriodicPackFeedback } from "./periodicPackView.js";
import { logger } from "alemonjs";

//#region src/response/recharge/periodicPackReset.ts
const operation = "recharge.periodic-pack-reset";
async function handlePeriodicPackReset(event, period, input, next) {
	const [message] = useMessage$1();
	const category = period === "weekly" ? "周礼包" : "月礼包";
	const common = {
		isPrivate: true,
		bid: event.UserId,
		title: `${category} · 重置购买额度`
	};
	const packCommand = `/充值 ${category}`;
	const footer = [{
		label: "返回特权",
		command: "/我的特权",
		autoEnter: false
	}, {
		label: "查看礼包",
		command: packCommand,
		autoEnter: false
	}];
	const confirming = input[0] === "确认重置";
	const reference = confirming && input.length === 2 && validPeriodicPackResetReference(input[1]) ? input[1] : void 0;
	if (confirming ? reference === void 0 : input.length !== 1) {
		await message.send(errorBubble({
			...common,
			reason: "重置指令无效，请从我的特权重新打开预览。",
			footer
		}));
		return;
	}
	const mode = confirming ? "confirm" : "preview";
	const renderFeedback = adviceRenderer(async (reply) => {
		await message.send(FormatGui({
			...common,
			content: buildPeriodicPackFeedback(reply),
			footer: [...footer, ...reply.buttons.map((button) => ({
				...button,
				autoEnter: false
			}))],
			bar: false
		}));
	});
	try {
		const response = await runRobotBusiness(event, operation, {
			mode,
			period,
			private: true,
			...reference === void 0 ? {} : { reference }
		}, (value) => parsePeriodicPackReset(value, period, mode), next, renderFeedback, createBackendRequestContext(event, operation));
		if (response.handled) return;
		const result = response.data;
		const window = `时间：${result.periodStart} 至 ${result.periodEnd} 00:00（北京时间）`;
		if (result.mode === "preview") {
			await message.send(buildBubble({
				...common,
				sections: [{
					lines: [
						window,
						"确认后开启新一轮购买额度，原轮剩余额度和全包补差不带入新一轮，已购奖励保留。",
						"消耗：本期1次重置资格 · 无需付费",
						"有效期：5分钟"
					],
					actions: [{
						label: "确认重置",
						command: `${packCommand} 确认重置 ${result.reference}`,
						autoEnter: false
					}]
				}],
				footer,
				bar: false
			}));
			return;
		}
		await message.send(resultBubble({
			...common,
			status: "done",
			lines: [
				"结果：本期购买额度已重置",
				window,
				`完成：${formatGameTime(result.resetAt, "YYYY-MM-DD HH:mm")}`
			],
			footer
		}));
	} catch (error) {
		logger.error("周期礼包重置结果未确认:", error);
		await message.send(errorBubble({
			...common,
			reason: confirming ? "重置结果暂未核实，请核对礼包额度或重试原确认。" : "暂未取得重置预览，请返回特权查看。",
			actions: reference ? [{
				label: "重试原确认",
				command: `${packCommand} 确认重置 ${reference}`,
				autoEnter: false
			}] : void 0,
			footer
		}));
	}
}

//#endregion
export { handlePeriodicPackReset };