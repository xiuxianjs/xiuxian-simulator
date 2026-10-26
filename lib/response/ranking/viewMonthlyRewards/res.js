import { FormatGui, addOptions } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { sendFifthLayerLockedPage } from "../../access/fifthLayerView.js";
import "../../access/fifthLayer.js";
import { parseRobotMonthlyRewards } from "../../../api/bot/ranking-robot-query.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/ranking/viewMonthlyRewards/res.ts
/**
* 查看月度排名奖励
*/
const response = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const [, next] = useEvent();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	try {
		const loaded = await runRobotBusiness(e, "ranking.monthly-rewards", {}, parseRobotMonthlyRewards, next);
		if (loaded.handled) return;
		const result = loaded.data;
		if (result.code === "LOCKED") {
			sendFifthLayerLockedPage({
				bid,
				isPrivate,
				message,
				title: "月度排名奖励",
				realmName: result.realmName
			});
			return;
		}
		if (result.code === "INVALID_USER") {
			const md = Format.createMarkdown();
			md.addText("你还未踏入修仙之路");
			message.send(FormatGui({
				isPrivate,
				bid,
				title: "",
				content: md
			}));
			return;
		}
		if (result.code === "TOWER_CLOSED") {
			const md = Format.createMarkdown();
			md.addText(result.message);
			message.send(FormatGui({
				isPrivate,
				bid,
				title: "",
				content: md
			}));
			return;
		}
		const md = Format.createMarkdown();
		md.addBold("月度排名奖励");
		md.addNewline();
		if (result.data.currentRank > result.data.maxRank) md.addText("当前排名：未上榜");
		else md.addText(`当前排名：第 ${result.data.currentRank} 名`);
		md.addNewline();
		if (result.data.bestRank && result.data.bestRank <= result.data.maxRank) md.addText(`本月最高排名：第 ${result.data.bestRank} 名`);
		else md.addText("本月最高排名：未上榜");
		md.addNewline();
		for (const line of result.data.statusLines) {
			md.addText(` ${line}`);
			md.addNewline();
		}
		md.addNewline();
		md.addNewline();
		md.addText("【 奖励档位 】");
		md.addNewline();
		for (const reward of result.data.rewards) {
			md.addText(`${reward.rangeText} `);
			if (reward.state === "CLAIMABLE") addOptions(md, [{
				label: "可领取",
				command: `/领取月度奖励 ${reward.id}`
			}]);
			else {
				if (reward.state === "CLAIMED") md.addText("✅ 已领取");
				else md.addText("未达成");
				md.addNewline();
			}
			if (reward.rewardTexts.length > 0) {
				md.addText(`  ${reward.rewardTexts.join("、")}`);
				md.addNewline();
			}
			md.addNewline();
		}
		md.addText("💡月度奖励基于本月达到的最高排名");
		const footer = [];
		if (result.data.hasClaimableReward) footer.push({
			label: "全部领取",
			command: "/领取月度奖励 全部"
		});
		footer.push({
			label: "首通奖励",
			command: "/首通排名奖励"
		});
		footer.push({
			label: "通天塔",
			command: "/通天塔"
		});
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "",
			content: md,
			footer
		}));
	} catch {
		const md = Format.createMarkdown();
		md.addText("查看月度排名奖励失败，请稍后再试或联系运营。");
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