import { rewardLine } from "./format.js";
import { buildBubble } from "./bubble.js";

//#region src/response/presentation/presets.ts
/** 列表页：每个条目一个引用块，页面级分页与页脚由调用方给出。 */
const listBubble = (input) => {
	return buildBubble({
		...input,
		sections: input.items
	});
};
/** 详情页：按分组拆引用块，页面级操作放页脚。 */
const detailBubble = (input) => {
	return buildBubble({
		...input,
		sections: input.groups
	});
};
/** 确认页：必须有「目标 / 代价」，确认与取消在同一引用块内，且必须可返回。 */
const confirmBubble = (input) => {
	const sections = [{
		title: "目标",
		lines: [...input.target, ...input.changes ?? []]
	}, {
		title: "代价",
		lines: (input.costs && input.costs.length > 0 ? input.costs : ["确认后立即结算，不可撤销"]).map((line) => `⚠️ ${line}`),
		actions: input.actions
	}];
	return buildBubble({
		isPrivate: input.isPrivate,
		bid: input.bid,
		mention: input.mention,
		title: input.title,
		sections,
		footer: [input.back]
	});
};
/** 结果页：状态徽章放标题，所得统一 `🎁 获得：` 行。 */
const resultBubble = (input) => {
	const lines = [...input.lines, ...input.rewards && input.rewards.length > 0 ? [rewardLine(input.rewards)] : []];
	return buildBubble({
		isPrivate: input.isPrivate,
		bid: input.bid,
		mention: input.mention,
		title: input.title,
		status: input.status,
		sections: [{
			lines,
			actions: input.actions
		}],
		footer: input.footer
	});
};
/** 错误/拒绝：徽章 ❌，一行原因，能安全重试时才给重试按钮。 */
const errorBubble = (input) => buildBubble({
	isPrivate: input.isPrivate,
	bid: input.bid,
	mention: input.mention,
	title: input.title,
	status: "fail",
	sections: [{
		lines: [input.reason],
		actions: input.actions
	}],
	footer: input.footer
});
/** 主动通知：正文原样，来源按钮 + 我的通知；不挂全局键盘。 */
const noticeBubble = (input) => buildBubble({
	isPrivate: input.isPrivate,
	bid: input.bid,
	mention: input.mention,
	title: input.title,
	sections: [{
		title: input.heading,
		lines: input.actions && input.actions.length > 0 && input.lines.length > 0 ? [...input.lines, ""] : input.lines,
		actions: input.actions
	}],
	bar: false
});

//#endregion
export { confirmBubble, detailBubble, errorBubble, listBubble, noticeBubble, resultBubble };