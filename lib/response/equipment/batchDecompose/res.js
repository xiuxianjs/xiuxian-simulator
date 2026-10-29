import { parseBackendEquipmentBatchDecompose, parseRobotEquipmentBatchQuery } from "../../../api/bot/equipment-batch-decompose.js";
import { FormatGui, createQuoteMarkdown } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { appendMiddlewareAdvice, appendMiddlewareBlocks } from "../../middlewareReply.js";
import { equipmentRecoveryTips } from "../../equipmentRecovery.js";
import { selects } from "../../config.js";
import { adviceRenderer } from "../../feedbackRenderer.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { Format, logger, onResponse, useEvent, useSubscribe } from "alemonjs";

//#region src/response/equipment/batchDecompose/res.ts
/**
* 一键分解装备指令处理器
* 指令格式:
*   /一键分解装备            → 展示品级选择面板
*   /一键分解装备 全部        → 预览待分解内容，需确认
*   /一键分解装备 <品级名>    → 预览待分解内容，需确认
*/
const COMMAND_KEYWORD = "一键分解装备";
/** 确认超时时间（毫秒） */
const CONFIRM_TIMEOUT_MS = 6e4;
/** 分解明细最大展示条数 */
const MAX_DETAIL_DISPLAY = 20;
const response = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const [subscribe] = useSubscribe(selects);
	const bid = e?.UserId;
	const [, parentNext] = useEvent();
	const isPrivate = e.isPrivate ?? false;
	const feedback = adviceRenderer(async (reply) => {
		const [msg] = useMessage$1();
		const md = Format.createMarkdown();
		const plainBlocks = (reply.blocks ?? []).filter((block) => !block.quoted && !block.inlineButtons?.length);
		if (!plainBlocks.length || plainBlocks.map((block) => block.text).join("") !== reply.text) md.addText(reply.text);
		for (const block of plainBlocks) if (/^\n+$/.test(block.text)) for (const _ of block.text) md.addNewline();
		else md.addText(block.text);
		if (reply.quote) md.addBlockquote(Format.createMarkdown().addText(reply.quote));
		const extraBlocks = reply.blocks?.filter((block) => block.quoted || block.inlineButtons?.length) ?? [];
		appendMiddlewareBlocks(md, extraBlocks);
		appendMiddlewareAdvice(md, reply.advice);
		const footer = [];
		if (reply.buttons.length) {
			footer.push(reply.buttons.slice(0, 1));
			for (let i = 1; i < reply.buttons.length; i += 3) footer.push(reply.buttons.slice(i, i + 3));
		}
		await msg.send(FormatGui({
			isPrivate,
			bid,
			title: "",
			content: md,
			footer
		}));
	});
	try {
		const argPart = String(e.MessageText ?? "").trim().replace(/^(!|！|\/|#|＃)?一键分解装备\s*/, "").trim();
		const result = await runRobotBusiness(e, "equipment.batch-decompose-query", { gradeName: argPart }, parseRobotEquipmentBatchQuery, parentNext, feedback);
		if (result.handled) return;
		const query = result.data;
		const { totalCount } = query.options;
		const sortedGrades = query.options.gradeBreakdown.map((g) => ({
			id: g.id,
			name: g.gradeName,
			level: g.level,
			count: g.count
		}));
		if (query.mode === "choose") {
			const footerRows = [];
			footerRows.push([{
				label: `全部 (${totalCount}件)`,
				command: `/${COMMAND_KEYWORD} 全部`
			}]);
			for (let i = 0; i < sortedGrades.length; i += 3) {
				const slice = sortedGrades.slice(i, i + 3);
				footerRows.push(slice.map((g) => ({
					label: `${g.name} (${g.count}件)`,
					command: `/${COMMAND_KEYWORD} ${g.name}`
				})));
			}
			const md = Format.createMarkdown();
			md.addBold(COMMAND_KEYWORD);
			md.addNewline();
			md.addText("选择分解范围，每次最多分解300件。");
			md.addNewline();
			md.addText("💡 已装备、已锁定的装备不会被分解");
			message.send(FormatGui({
				isPrivate,
				bid,
				title: "",
				content: md,
				footer: footerRows
			}));
			return;
		}
		const selectedGrade = query.selectedGrade;
		const gradeId = selectedGrade.id === 0 ? null : String(selectedGrade.id);
		const previewResult = { data: query.preview };
		/** 构建预览信息 */
		const previewMd = Format.createMarkdown();
		previewMd.addBold("⚠️ 分解确认");
		previewMd.addNewline();
		previewMd.addText(`分解范围：${selectedGrade.name}`);
		previewMd.addNewline();
		previewMd.addText(`待分解总数：${previewResult.data.totalCount} 件`);
		previewMd.addNewline();
		previewMd.addNewline();
		previewMd.addText(`本次分解：${previewResult.data.processCount} 件；剩余：${previewResult.data.remainingCount} 件`);
		previewMd.addNewline();
		previewMd.addBold("范围内品级分布：");
		previewMd.addNewline();
		for (const gb of previewResult.data.gradeBreakdown) {
			previewMd.addText(`• ${gb.gradeName} ×${gb.count}`);
			previewMd.addNewline();
		}
		previewMd.addNewline();
		previewMd.addText(`📦 预估获得 矿石精华 ×${previewResult.data.totalYield}`);
		previewMd.addNewline();
		previewMd.addNewline();
		previewMd.addText("确认有效期60秒");
		previewMd.addNewline().addText("确认时重新筛选当前范围；要保留的装备请先锁定");
		const confirmFooter = [{
			label: "确认分解",
			command: "确认分解"
		}, {
			label: "取消",
			command: "取消"
		}];
		previewMd.addNewline().addBlockquote(createQuoteMarkdown(["请在60秒内回复【确认分解】或【取消】。"], confirmFooter));
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "",
			content: previewMd,
			keyboard: [confirmFooter]
		}));
		const sub = subscribe.mount(async (event, next) => {
			const [msg] = useMessage$1();
			const choice = event.MessageText.trim();
			if (choice === "确认分解") {
				clearTimeout(timeout);
				const [, hookNext] = useEvent();
				const result = await runRobotBusiness(event, "equipment.batch-decompose", { gradeId }, parseBackendEquipmentBatchDecompose, () => {
					hookNext(true, true);
					subscribe.cancel(sub);
				}, feedback).catch(async () => {
					const text = "分解结果未获完整确认，请先核对当前装备与产出";
					await feedback({
						title: "",
						heading: "",
						text,
						buttons: [],
						advice: equipmentRecoveryTips("equipment.batch-decompose", text)
					});
					return { handled: true };
				});
				if (result.handled) return;
				/** 构建分解成功信息 */
				const okMd = Format.createMarkdown();
				okMd.addBold("✅ 分解成功");
				okMd.addNewline();
				okMd.addText(`分解范围：${selectedGrade.name}`);
				okMd.addNewline().addText(`分解数量：${result.data.decomposedCount} 件`);
				if (result.data.remainingCount > 0) okMd.addNewline().addText(`数量过多，本次已分解${result.data.decomposedCount}件，剩余${result.data.remainingCount}件可分解。`);
				okMd.addNewline();
				okMd.addNewline();
				const showDetails = result.data.details.slice(0, MAX_DETAIL_DISPLAY);
				okMd.addBold("分解明细");
				okMd.addNewline();
				for (const detail of showDetails) {
					okMd.addText(`• ${detail.name}(${detail.grade}) → 矿石精华 ×${detail.yield}`);
					okMd.addNewline();
				}
				if (result.data.details.length > MAX_DETAIL_DISPLAY) {
					okMd.addText(`...等共 ${result.data.details.length} 件装备`);
					okMd.addNewline();
				}
				okMd.addNewline();
				okMd.addText(`📦 共获得 矿石精华 ×${result.data.totalYield}`);
				okMd.addNewline();
				const okFooter = [{
					label: "继续分解",
					command: `/${COMMAND_KEYWORD} ${argPart}`
				}, {
					label: "查看储物袋",
					command: "/我的储物袋 装备"
				}];
				msg.send(FormatGui({
					isPrivate,
					bid,
					title: "",
					content: okMd,
					footer: okFooter
				}));
				return;
			}
			if (choice === "取消") {
				clearTimeout(timeout);
				const cancelMd = Format.createMarkdown();
				cancelMd.addText("已取消分解操作");
				appendMiddlewareAdvice(cancelMd, equipmentRecoveryTips("equipment.batch-decompose-query", "已取消分解"));
				cancelMd.addNewline();
				cancelMd.addText("💡 可以先锁定不想分解的装备，再使用一键分解");
				msg.send(FormatGui({
					isPrivate,
					bid,
					title: "",
					content: cancelMd,
					footer: [{
						label: `/${COMMAND_KEYWORD}`,
						command: `/${COMMAND_KEYWORD}`
					}]
				}));
				return;
			}
			/** 提示回复确认或取消 */
			const hintMd = Format.createMarkdown();
			const hintFooter = [{
				label: "确认分解",
				command: "确认分解"
			}, {
				label: "取消",
				command: "取消"
			}];
			hintMd.addText("请回复【确认分解】或【取消】");
			msg.send(FormatGui({
				isPrivate,
				bid,
				title: "",
				content: hintMd,
				footer: [hintFooter]
			}));
			next();
		}, ["UserId"]);
		const timeout = setTimeout(() => {
			try {
				subscribe.cancel(sub);
				const timeoutMd = Format.createMarkdown();
				timeoutMd.addText("⏰ 确认超时，分解操作已自动取消");
				appendMiddlewareAdvice(timeoutMd, equipmentRecoveryTips("equipment.batch-decompose-query", "确认超时"));
				message.send(FormatGui({
					isPrivate,
					bid,
					title: "",
					content: timeoutMd,
					footer: [{
						label: `/${COMMAND_KEYWORD}`,
						command: `/${COMMAND_KEYWORD}`
					}]
				}));
			} catch {}
		}, CONFIRM_TIMEOUT_MS);
	} catch (error) {
		logger.error("一键分解装备失败:", error);
		const md = Format.createMarkdown();
		md.addText("一键分解装备失败，请稍后再试或联系运营。");
		appendMiddlewareAdvice(md, equipmentRecoveryTips("equipment.batch-decompose-query", "结果未确认"));
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