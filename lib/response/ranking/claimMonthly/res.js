import { parseRobotMonthlyClaim, rankingClaimArgument } from "../../../api/bot/ranking-robot-query.js";
import { FormatGui } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/ranking/claimMonthly/res.ts
/**
* 领取通天塔月度奖励
* 指令格式: /领取月度奖励 {档位ID} 或 /领取月度奖励 全部
*/
const response = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const [, next] = useEvent();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	try {
		const loaded = await runRobotBusiness(e, "ranking.claim-monthly", { claimArg: rankingClaimArgument(e.MessageText || "", true) }, parseRobotMonthlyClaim, next, async (reply) => {
			const md = Format.createMarkdown().addText("❌ 领取失败").addNewline().addNewline().addText(reply.text);
			await message.send(FormatGui({
				isPrivate,
				bid,
				title: "",
				content: md,
				footer: [{
					label: "返回奖励页",
					command: "/月度排名奖励"
				}]
			}));
		});
		if (loaded.handled) return;
		const result = loaded.data;
		if (result.code === "PARAM_ERROR") {
			const md = Format.createMarkdown();
			md.addText("❌ 参数错误");
			md.addNewline();
			md.addNewline();
			md.addText("使用方法:");
			md.addNewline();
			md.addText("/领取月度奖励 [档位ID]");
			md.addNewline();
			md.addText("/领取月度奖励 全部");
			message.send(FormatGui({
				isPrivate,
				bid,
				title: "",
				content: md
			}));
			return;
		}
		if (result.code === "BATCH_SUCCESS") {
			const md = Format.createMarkdown();
			md.addText("✅ 批量领取成功");
			md.addNewline();
			md.addNewline();
			md.addText(`已领取 ${result.data.claimedCount} 个档位：`);
			md.addNewline();
			md.addText(result.data.rewardTexts.join("、"));
			message.send(FormatGui({
				isPrivate,
				bid,
				title: "",
				content: md,
				footer: [{
					label: "月度奖励",
					command: "/月度排名奖励"
				}, {
					label: "通天塔",
					command: "/通天塔"
				}]
			}));
			return;
		}
		const md = Format.createMarkdown();
		md.addText("✅ 领取成功");
		md.addNewline();
		md.addNewline();
		md.addText("月度奖励已领取：");
		md.addNewline();
		md.addText(result.data.rewardTexts.join("、"));
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "",
			content: md,
			footer: [{
				label: "通天塔",
				command: "/通天塔"
			}]
		}));
	} catch {
		const md = Format.createMarkdown();
		md.addText("领取月度奖励失败，请稍后再试或联系运营。");
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "",
			content: md
		}));
	}
});

//#endregion
export { response as default };