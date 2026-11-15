import { confirmBubble, errorBubble, listBubble, resultBubble } from "../presentation/presets.js";
import { formatGameTime } from "../../utils/gameTime.js";
import { useMessage as useMessage$1 } from "../../utils/useMessage.js";
import { parsePKCommandInteger } from "../../api/bot/pk-management.js";
import { parsePursuitBoard, parsePursuitFight, parsePursuitPublish, parsePursuitReceipt, parsePursuitReference } from "../../api/bot/pk-pursuit.js";
import { selects } from "../config.js";
import { runRobotBusiness } from "../robotBusiness.js";
import { onResponse, useEvent } from "alemonjs";

//#region src/response/pkPursuit/res.ts
const command = /^[!！/#＃]?(追击榜|委托追回|确认追回|帮追回|确认追击)(?:\s+(.*))?$/;
const backToBoard = {
	label: "返回追击榜",
	command: "/追击榜"
};
const backToReport = (reportId) => ({
	label: "返回战报",
	command: `/争夺战报 ${reportId}`
});
var res_default = onResponse(selects, async (e) => {
	const [, next] = useEvent();
	const match = command.exec(e.MessageText.trim());
	if (!match) {
		next();
		return;
	}
	const [message] = useMessage$1();
	const common = {
		isPrivate: e.isPrivate ?? false,
		bid: e.UserId
	};
	const [, action, raw = ""] = match;
	const args = raw ? raw.split(/\s+/) : [];
	const reportId = parsePKCommandInteger(args[0]);
	const feedback = async (reason) => {
		const back = action === "追击榜" ? {
			label: "返回我的活动",
			command: "/我的活动"
		} : backToBoard;
		await message.send(errorBubble({
			...common,
			title: "追击",
			reason,
			footer: [back]
		}));
	};
	const reject = () => feedback("指令参数无效，请从追击榜或原战报重新操作。");
	try {
		if (action === "追击榜") {
			const page = args.length === 0 ? 1 : args.length === 1 ? parsePKCommandInteger(args[0]) : null;
			if (page === null) {
				await reject();
				return;
			}
			const response = await runRobotBusiness(e, "pvp.pursuit-board", { page }, parsePursuitBoard, next, (reply) => feedback(reply.text));
			if (response.handled) return;
			const { items, page: current, count } = response.data;
			await message.send(listBubble({
				...common,
				title: "追击榜",
				items: items.length ? items.map((item) => ({
					title: item.defenderName,
					id: item.reportId,
					lines: [
						`奖励：${item.bounty} 灵晶 · 战败损失：${item.loss} 灵晶`,
						`截止：${formatGameTime(item.deadline)}`,
						`状态：${item.fighting ? "正在交手" : "可出战"}`
					],
					actions: item.fighting ? [] : [{
						label: "帮追回",
						command: `/帮追回 ${item.reportId}`
					}]
				})) : [{ lines: ["状态：暂无可追击委托"] }],
				nav: count > 5 ? {
					current,
					total: Math.ceil(count / 5),
					count,
					command: "/追击榜 {page}"
				} : void 0,
				footer: [{
					label: "返回我的活动",
					command: "/我的活动"
				}]
			}));
			return;
		}
		if (action === "委托追回") {
			const bounty = args.length === 1 ? 300 : args.length === 2 ? parsePKCommandInteger(args[1]) : null;
			if (reportId === null || bounty === null) {
				await reject();
				return;
			}
			const response = await runRobotBusiness(e, "pvp.pursuit-publish-preview", {
				reportId,
				bounty
			}, parsePursuitPublish, next, (reply) => feedback(reply.text));
			if (response.handled) return;
			const data = response.data;
			await message.send(confirmBubble({
				...common,
				title: "确认委托追回",
				target: [`战报：#${data.reportId}`, `截止：${formatGameTime(data.deadline)}`],
				costs: [
					`托管：${data.bounty} 灵晶`,
					"结果：道友首胜返物付赏，到期未追回则退赏。",
					`赏金范围：200–2,000 灵晶。调整时发送 /委托追回 ${data.reportId} 金额。`
				],
				actions: [{
					label: "确认发布",
					command: `/确认追回 ${data.confirmation}`
				}],
				back: backToReport(data.reportId)
			}));
			return;
		}
		if (action === "帮追回") {
			if (reportId === null || args.length !== 1) {
				await reject();
				return;
			}
			const response = await runRobotBusiness(e, "pvp.pursuit-fight-preview", { reportId }, parsePursuitFight, next, (reply) => feedback(reply.text));
			if (response.handled) return;
			const data = response.data;
			await message.send(confirmBubble({
				...common,
				title: "确认追击",
				target: [
					`目标：${data.defenderName} · 战报 #${data.reportId}`,
					`奖励：胜利返还随身灵晶并获得 ${data.bounty} 灵晶`,
					`截止：${formatGameTime(data.deadline)}`
				],
				costs: [`战败损失：${data.loss} 灵晶 · 劫匪实收 ${data.share} · 系统回收 ${data.recycled}`],
				actions: [{
					label: "确认出战",
					command: `/确认追击 ${data.confirmation}`
				}],
				back: backToBoard
			}));
			return;
		}
		const confirmation = args.length === 1 ? parsePursuitReference(args[0], action === "确认追回" ? "pp" : "pf") : null;
		if (!confirmation) {
			await reject();
			return;
		}
		if (action === "确认追回") {
			const response = await runRobotBusiness(e, "pvp.pursuit-publish", { confirmation }, parsePursuitPublish, next, (reply) => feedback(reply.text));
			if (response.handled) return;
			const data = response.data;
			await message.send(resultBubble({
				...common,
				title: "委托追回",
				status: "done",
				lines: [`状态：已发布，托管 ${data.bounty} 灵晶`, `截止：${formatGameTime(data.deadline)}`],
				footer: [backToReport(data.reportId)]
			}));
			return;
		}
		const response = await runRobotBusiness(e, "pvp.pursuit-fight", { confirmation }, parsePursuitReceipt, next, (reply) => feedback(reply.text));
		if (response.handled) return;
		const data = response.data;
		await message.send(resultBubble({
			...common,
			title: "追击结果",
			status: data.state === "won" ? "done" : "fail",
			lines: [`战报：#${data.reportId}`, data.state === "won" ? "结果：原物已追回，随身灵晶已退还。" : data.state === "lost" ? `结果：未能追回，损失 ${data.loss} 灵晶 · 劫匪实收 ${data.share} · 系统回收 ${data.recycled}` : "结果：交手未得出有效胜负，随身灵晶已退还。"],
			rewards: data.state === "won" ? [`${data.bounty} 灵晶`] : void 0,
			actions: data.battleId ? [{
				label: "查看本场战报",
				command: `/查看战斗过程 ${data.battleId}`
			}] : void 0,
			footer: [backToBoard]
		}));
	} catch {
		await feedback("追击回执暂时读不到，请刷新原战报或追击榜核对状态。");
	}
});

//#endregion
export { res_default as default };