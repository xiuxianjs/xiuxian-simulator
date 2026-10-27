import { parseSkillBookBatchUpgrade } from "../../../api/bot/skill-book-batch-upgrade.js";
import { FormatGui } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { appendMiddlewareAdvice, sendMiddlewareReply } from "../../middlewareReply.js";
import { EMPTY_STRING, FIRST_ARG_INDEX } from "../../../constants/common.js";
import "../../../constants/index.js";
import { withBusinessRecovery } from "../../businessRecovery.js";
import { selects } from "../../config.js";
import { adviceRenderer } from "../../feedbackRenderer.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/skillBook/batchUpgrade/res.ts
/**
* 升级功法指令处理器
* 指令格式: /升级功法 {功法ID} [次数]
* 对指定已学习功法连续升级，直到材料或灵石不足，或属性全满
*/
const response = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? e.name.startsWith("private.");
	const messageText = (e.MessageText || "").replace(/^(!|！|\/|#|＃)?升级功法\s*/, "").trim();
	const args = messageText ? messageText.split(/\s+/) : [];
	const skillBookIdStr = args[0];
	const countStr = args.length > 1 ? args[1] : void 0;
	const [, parentNext] = useEvent();
	const failure = adviceRenderer((reply) => sendMiddlewareReply(e, withBusinessRecovery("skill-books.batch-upgrade", reply), "footer"));
	if (args.length > 2 || skillBookIdStr !== void 0 && (!/^\d+$/.test(skillBookIdStr) || !Number.isSafeInteger(Number(skillBookIdStr)) || Number(skillBookIdStr) < 1) || countStr !== void 0 && countStr !== "选择" && (!/^\d+$/.test(countStr) || !Number.isSafeInteger(Number(countStr)) || Number(countStr) < 1)) {
		await failure({
			title: "",
			heading: "",
			text: "参数错误：请核对功法实例编号及完整参数，不附多余文字。",
			buttons: [],
			advice: []
		});
		return;
	}
	const response = await runRobotBusiness(e, "skill-books.batch-upgrade", {
		bookId: skillBookIdStr ?? null,
		count: countStr ?? null
	}, (value) => {
		if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("连续升级功法响应不完整");
		const row = value;
		if (row.mode === "choose" && typeof row.bookId === "string" && /^\d+$/.test(row.bookId) && Number.isSafeInteger(Number(row.bookId)) && Number(row.bookId) > 0) return {
			mode: "choose",
			bookId: row.bookId
		};
		if (row.mode !== "execute") throw new Error("连续升级功法响应不完整");
		const result = parseSkillBookBatchUpgrade(row.result);
		if (result.outcome !== "ok" || !result.target || result.successCount < 0 || result.upgradeCount < 1 || result.successCount > result.upgradeCount || result.totalConsumedExp < 0 || result.totalConsumedSpiritStone < 0 || result.skillBookId < 1 || result.target.id < 1) throw new Error("连续升级功法响应不完整");
		return {
			mode: "execute",
			result: {
				...result,
				target: result.target
			}
		};
	}, parentNext, failure).catch(async () => {
		await failure({
			title: "",
			heading: "",
			text: "功法升级结果未获完整确认，请先核对等级、材料与原回执。",
			buttons: [],
			advice: []
		});
		return { handled: true };
	});
	if (response.handled) return;
	if (response.data.mode === "choose") {
		const md = Format.createMarkdown();
		md.addText(`选择功法【${response.data.bookId}】的连续升级次数。`);
		md.addNewline();
		md.addText("升级消耗经验道具与灵石；材料不足或属性全满时停止。");
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "连续升级功法",
			content: md,
			footer: [...[
				1,
				5,
				10
			].map((count) => ({
				label: `升级${count}次`,
				command: `/升级功法 ${response.data.bookId} ${count}`
			})), {
				label: "返回功法",
				command: "/我的功法"
			}]
		}));
		return;
	}
	const result = {
		code: "OK",
		data: response.data.result
	};
	switch (result.code) {
		case "OK": {
			const { target, successCount, totalConsumedExp, totalConsumedSpiritStone, lastUpgradeCount, attributeLines, stopReason, upgradeCount: actualUpgradeCount, skillBookId: resultSkillBookId } = result.data;
			const md = Format.createMarkdown();
			if (successCount > 0) {
				md.addBold(`✅ 【${target.name}+${lastUpgradeCount}】连续升级 ${successCount} 次`);
				md.addNewline();
				md.addText(`消耗经验: ${totalConsumedExp}`);
				md.addNewline();
				md.addText(`消耗灵石: ${totalConsumedSpiritStone}`);
				md.addNewline();
				if (attributeLines.length > 0) {
					md.addNewline();
					md.addText("📈 属性变化：");
					md.addNewline();
					for (const line of attributeLines) {
						md.addText(line);
						md.addNewline();
					}
				}
			} else {
				md.addBold(`❌ 【${target.name}】无法升级`);
				md.addNewline();
			}
			if (stopReason) {
				md.addNewline();
				md.addText(`停止原因：${stopReason}`);
			}
			const stopped = successCount < actualUpgradeCount;
			const recovery = withBusinessRecovery("skill-books.batch-upgrade", {
				title: "升级功法",
				heading: "",
				text: stopReason,
				buttons: [],
				advice: []
			});
			if (stopped) appendMiddlewareAdvice(md, recovery.advice);
			md.addNewline();
			message.send(FormatGui({
				isPrivate,
				bid,
				title: "升级功法",
				content: md,
				footer: [...!stopped ? [{
					label: "继续升级",
					command: `/升级功法 ${resultSkillBookId} ${actualUpgradeCount}`
				}] : recovery.buttons, {
					label: "我的功法",
					command: "/我的功法"
				}]
			}));
		}
	}
});

//#endregion
export { response as default };