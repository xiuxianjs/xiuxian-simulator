import { parseBackendSkillBookProficiency } from "../../../api/bot/skill-book-proficiency.js";
import { FormatGui } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { appendMiddlewareAdvice, sendMiddlewareReply } from "../../middlewareReply.js";
import { EMPTY_STRING } from "../../../constants/common.js";
import { extractArgs } from "../../../utils/commandParser.js";
import { withBusinessRecovery } from "../../businessRecovery.js";
import { selects } from "../../config.js";
import { adviceRenderer } from "../../feedbackRenderer.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/skillBook/proficiency/res.ts
const response = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? e.name.startsWith("private.");
	const failure = adviceRenderer((reply) => sendMiddlewareReply(e, withBusinessRecovery("skill-books.proficiency", reply), "footer"));
	try {
		const [, parentNext] = useEvent();
		const args = extractArgs(e.MessageText || "", /^(!|！|\/|#|＃)?参悟\s*/);
		const points = args.at(-1);
		if (args.length >= 2 && points !== "全部" && points !== "所有" && (!/^\d+$/.test(points ?? "") || !Number.isSafeInteger(Number(points)) || Number(points) < 1)) {
			await failure({
				title: "",
				heading: "",
				text: "参数错误：熟练点数使用完整正整数，或“全部”“所有”；请核对本人已学实例编号或完整功法名称。",
				buttons: [],
				advice: []
			});
			return;
		}
		const response = await runRobotBusiness(e, "skill-books.proficiency", { tokens: args }, (value) => {
			const data = parseBackendSkillBookProficiency(value);
			const { consumedPoints = 0, oldProficiency = 0, newProficiency = 0, remainingPoints = 0, successCount = 0, failCount = 0 } = data;
			const invalidCounters = [
				consumedPoints,
				oldProficiency,
				newProficiency,
				remainingPoints,
				successCount,
				failCount
			].some((value) => !Number.isSafeInteger(value) || value < 0);
			if (data.outcome !== "ok" || invalidCounters || consumedPoints < 1 || successCount + failCount !== consumedPoints || oldProficiency > newProficiency || newProficiency > 100 || newProficiency - oldProficiency !== successCount) throw new Error("参悟功法接口响应不完整");
			return data;
		}, parentNext, failure).catch(async () => {
			await failure({
				title: "",
				heading: "",
				text: "参悟结果未获完整确认，请先核对当前熟练度、熟练点与原回执。",
				buttons: [],
				advice: []
			});
			return { handled: true };
		});
		if (response.handled) return;
		const identifier = args.slice(0, -1).join(" ");
		const result = {
			code: "OK",
			data: response.data
		};
		const md = Format.createMarkdown();
		switch (result.code) {
			case "OK": {
				const { skillBookName, consumedPoints, oldProficiency, newProficiency, remainingPoints, successCount, failCount, pityTriggered } = result.data;
				md.addText("✅ 参悟完成");
				md.addNewline();
				md.addNewline();
				md.addText(`【${skillBookName}】`);
				md.addNewline();
				md.addText(`熟练度: ${oldProficiency}% → ${newProficiency}%`);
				md.addNewline();
				md.addText(`成功 ${successCount} 次 / 失败 ${failCount} 次`);
				if (pityTriggered) {
					md.addNewline();
					md.addText("🎯 本次触发过保底成功");
				}
				md.addNewline();
				md.addText(`消耗熟练点: ${consumedPoints}`);
				md.addNewline();
				md.addText(`剩余熟练点: ${remainingPoints}`);
				break;
			}
		}
		if (result.code === "OK") {
			const { remainingPoints, newProficiency } = result.data;
			if ((newProficiency ?? 0) >= 100 || (remainingPoints ?? 0) === 0) appendMiddlewareAdvice(md, withBusinessRecovery("skill-books.proficiency", {
				title: "",
				heading: "",
				text: (newProficiency ?? 0) >= 100 ? "该功法熟练度已达圆满" : "当前熟练点不足",
				buttons: [],
				advice: []
			}).advice);
			if ((remainingPoints ?? 0) > 0 && (newProficiency ?? 0) < 100) {
				message.send(FormatGui({
					isPrivate,
					bid,
					title: "",
					content: md,
					footer: [{
						label: "继续参悟",
						command: `/参悟 ${identifier} 1`
					}, {
						label: "全部参悟",
						command: `/参悟 ${identifier} 全部`
					}]
				}));
				return;
			}
		}
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "",
			content: md
		}));
	} catch {
		await failure({
			title: "",
			heading: "",
			text: "参悟结果未获完整确认，请先核对当前熟练度、熟练点与原回执。",
			buttons: [],
			advice: []
		});
	}
});

//#endregion
export { response as default };