import { displayCurrencyText } from "../../../constants/currency.js";
import { markdownButtonLabel } from "../../../utils/buttonLabel.js";
import { FormatGui, createQuoteMarkdown } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { parseBackendWorldMilestoneClaim } from "../../../api/bot/world-milestone-actions.js";
import { parseBackendWorldMilestoneView } from "../../../api/bot/world-milestone-queries.js";
import { Format, logger, onResponse, useEvent } from "alemonjs";

//#region src/response/recharge/milestone/res.ts
/**
* 世界里程碑指令
* 查看全服充值人数里程碑和领取奖励
*/
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	const [, parentNext] = useEvent();
	try {
		const isClaimRequest = e.MessageText.trim().includes("领取");
		const feedback = async (reply) => {
			await message.send(FormatGui({
				header: [{
					label: "返回权益",
					command: "/我的权益"
				}],
				isPrivate,
				bid,
				title: "",
				content: Format.createMarkdown().addText(reply.text)
			}));
		};
		const response = isClaimRequest ? await runRobotBusiness(e, "world-milestones.claim-all", {}, (value) => ({
			code: "CLAIM_SUCCESS",
			...parseBackendWorldMilestoneClaim(value)
		}), parentNext, feedback) : await runRobotBusiness(e, "world-milestones.view", {}, parseBackendWorldMilestoneView, parentNext, feedback);
		if (response.handled) return;
		const result = response.data;
		switch (result.code) {
			case "EMPTY": {
				const md = Format.createMarkdown();
				md.addText("暂无里程碑配置，请联系运营。");
				await message.send(FormatGui({
					header: [{
						label: "返回权益",
						command: "/我的权益"
					}],
					isPrivate,
					bid,
					title: "",
					content: md
				}));
				return;
			}
			case "CLAIM_SUCCESS": {
				const md = Format.createMarkdown();
				md.addText(`成功领取 ${result.count} 个里程碑奖励！`).addNewline();
				for (const reward of result.issued) md.addBlockquote(createQuoteMarkdown([`${displayCurrencyText(reward.name) || "物品"} ×${reward.amount}`]));
				md.addBlockquote(createQuoteMarkdown([], [{
					label: "最新进度",
					command: "/里程碑"
				}, {
					label: "储物袋",
					command: "/储物袋"
				}]));
				await message.send(FormatGui({
					header: [{
						label: "返回权益",
						command: "/我的权益"
					}],
					isPrivate,
					bid,
					title: "",
					content: md
				}));
				return;
			}
			case "VIEW": {
				const md = Format.createMarkdown();
				md.addBold("🌍 全服充值进度");
				md.addButton(markdownButtonLabel("充值"), { data: "/充值" });
				md.addNewline();
				md.addBlockquote(Format.createMarkdown().addText(`当前充值人数：${result.worldCountText} `));
				if (result.nextMilestoneCount !== null) md.addBlockquote(Format.createMarkdown().addText(`下一档：${result.nextMilestoneCount} 人，还差 ${result.nextMilestoneGapText} 人`));
				else md.addBlockquote(Format.createMarkdown().addText("当前已解锁全部里程碑奖励"));
				if (result.unclaimedCount > 0) md.addBlockquote(Format.createMarkdown().addText(`待领取奖励：${result.unclaimedCount} 档`));
				md.addNewline();
				md.addBold("🎁 里程碑奖励");
				if (result.unclaimedCount > 0) md.addButton(markdownButtonLabel("领取全部"), { data: "/里程碑 领取" });
				else md.addText(" · 当前无可领取奖励");
				md.addNewline();
				const showAll = e.MessageText.includes("全部");
				const visible = showAll ? result.milestones : result.milestones.filter((milestone) => milestone.status.includes("可领取") || milestone.milestoneCount === result.nextMilestoneCount);
				for (const milestone of visible) md.addBlockquote(Format.createMarkdown().addText(`${milestone.milestoneCount} 人里程碑 ${milestone.status}`).addNewline().addText(`${milestone.rewardText}`));
				await message.send(FormatGui({
					header: [{
						label: "返回权益",
						command: "/我的权益"
					}],
					isPrivate,
					bid,
					title: "世界充值里程碑",
					footer: [{
						label: showAll ? "待领与下一档" : "全部档位",
						command: showAll ? "/里程碑" : "/里程碑 全部"
					}, {
						label: "刷新",
						command: "/里程碑"
					}],
					content: md
				}));
			}
		}
	} catch (error) {
		logger.error("里程碑处理失败:", error);
		const md = Format.createMarkdown();
		md.addText("操作失败，请稍后再试。");
		await message.send(FormatGui({
			header: [{
				label: "返回权益",
				command: "/我的权益"
			}],
			isPrivate,
			bid,
			title: "",
			content: md
		}));
	}
});

//#endregion
export { res_default as default };