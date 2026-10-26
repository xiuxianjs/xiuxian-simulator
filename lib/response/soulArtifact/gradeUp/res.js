import { FormatGui, createQuoteMarkdown } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { appendMiddlewareAdvice, sendMiddlewareReply } from "../../middlewareReply.js";
import { withBusinessRecovery } from "../../businessRecovery.js";
import { selects } from "../../config.js";
import { adviceRenderer } from "../../feedbackRenderer.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { parseSoulArtifactGradeUpgrade } from "../../../api/bot/soul-artifact-grade-upgrade.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/soulArtifact/gradeUp/res.ts
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? e.name.startsWith("private.");
	const [, parentNext] = useEvent();
	const match = (e.MessageText?.trim() ?? "").match(/^[!！/#＃]?本命物升品\s*(\d+)?$/);
	const parsedId = match?.[1] ? Number(match[1]) : void 0;
	const instanceId = parsedId && Number.isSafeInteger(parsedId) ? parsedId : void 0;
	const footer = [{
		label: "本命物信息",
		command: "/本命物信息"
	}, ...instanceId ? [{
		label: "返回详情",
		command: `/本命物详情 ${instanceId}`
	}] : []];
	const renderResultUnknown = async () => {
		const md = Format.createMarkdown().addText("暂未确认本次升品结果。").addNewline();
		md.addBlockquote(createQuoteMarkdown(["先查看本命物品级和背包材料，暂勿重复升品。"], [{
			label: "储物袋 · 本命",
			command: "/储物袋 本命"
		}]));
		await message.send(FormatGui({
			isPrivate,
			bid,
			title: "本命物 · 升品",
			content: md,
			footer
		}));
	};
	const renderFailure = adviceRenderer(async (reply) => {
		const materials = reply.text.match(/^需要 (\d+) 个同名(.+?)本命物，当前只有 (\d+) 个$/);
		if (materials) {
			const [, required, gradeName, available] = materials;
			const md = Format.createMarkdown().addText("材料不足").addNewline();
			md.addBlockquote(createQuoteMarkdown([
				`需要：同名${gradeName} ×${required}`,
				`可用：${available} 件`,
				"升品材料须同名且同品；其他品级不计入。",
				"已炼化、锁定或上架的本命物不能作为材料。"
			], [{
				label: "储物袋 · 本命",
				command: "/储物袋 本命"
			}]));
			appendMiddlewareAdvice(md, reply.advice.filter((tip) => !(tip.command === "/储物袋 本命" && tip.description.startsWith("需要同名且同品的其他本命物；"))));
			await message.send(FormatGui({
				isPrivate,
				bid,
				title: "本命物 · 升品",
				content: md,
				footer
			}));
			return;
		}
		const recovered = withBusinessRecovery("soul-artifacts.grade-upgrade", reply);
		const buttons = [...recovered.buttons];
		for (const button of [{
			label: "本命物信息",
			command: "/本命物信息"
		}, ...instanceId ? [{
			label: "返回详情",
			command: `/本命物详情 ${instanceId}`
		}] : []]) if (!buttons.some((existing) => existing.command === button.command) && !recovered.advice.some((tip) => tip.command === button.command)) buttons.push(button);
		await sendMiddlewareReply(e, {
			...recovered,
			title: "本命物 · 升品",
			buttons
		}, "footer");
	});
	if (!match) {
		await renderFailure({
			title: "",
			heading: "",
			text: "格式错误，请先核对本命物操作用法。",
			buttons: [],
			advice: []
		});
		return;
	}
	const response = await runRobotBusiness(e, "soul-artifacts.grade-upgrade", { instanceId: match?.[1] ?? null }, parseSoulArtifactGradeUpgrade, parentNext, renderFailure).catch(async () => {
		await renderResultUnknown();
		return { handled: true };
	});
	if (response.handled) return;
	const result = response.data;
	const md = Format.createMarkdown().addText(`「${result.artifact.name}」升品成功`).addNewline();
	md.addBlockquote(createQuoteMarkdown([`品级：${result.previousGradeName} → ${result.newGradeName}`, `消耗：同名${result.previousGradeName} ×${result.consumed}`]));
	await message.send(FormatGui({
		isPrivate,
		bid,
		title: "本命物 · 升品",
		content: md,
		footer
	}));
});

//#endregion
export { res_default as default };