import { markdownButtonLabel } from "../../utils/buttonLabel.js";
import { FormatGui } from "../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../utils/useMessage.js";
import { Format } from "alemonjs";

//#region src/response/task/views.ts
function normalizeTaskAlias(input) {
	return String(input ?? "").trim().replace(/\s+/g, " ");
}
function sendPage(e, title, content) {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	message.send(FormatGui({
		isPrivate,
		bid,
		title,
		content
	}));
}
function renderOverview(e, slots, options) {
	const md = Format.createMarkdown();
	md.addText(`你可以选择设置${options.slotCount}个连锁任务，`);
	md.addNewline();
	md.addText(`每个任务最多${options.maxSteps}个行为。`);
	if (options.isMonthCard) {
		md.addNewline();
		md.addText("✅月卡权益已生效。");
	}
	md.addNewline();
	md.addText("例：/任务设置 1 1 签到");
	md.addNewline();
	slots.slice(0, options.slotCount).forEach((slotData, index) => {
		const slot = index + 1;
		const title = normalizeTaskAlias(slotData.alias) || (slotData.steps.length > 0 ? `任务(${slotData.steps.length}个)` : "未设置");
		md.addText(`${slot}、${title}`);
		if (!slotData.alias || slotData.steps.length === 0) {
			md.addText(" ");
			md.addButton(markdownButtonLabel("设置"), { data: `/任务设置 ${slot}` });
		}
		if (slotData.steps.length > 0) {
			md.addText(" ");
			md.addButton(markdownButtonLabel("执行"), { data: `/任务执行 ${slot}` });
		}
		md.addNewline();
	});
	md.addNewline();
	md.addButton(markdownButtonLabel("任务设置"), { data: "/任务设置" });
	md.addText(" ");
	md.addButton(markdownButtonLabel("任务别名"), { data: "/任务别名" });
	sendPage(e, "任务设置", md);
}
function renderAliasOverview(e, slots) {
	const md = Format.createMarkdown();
	md.addText("请发送：/任务别名 <位置> <名称>");
	md.addNewline();
	md.addText("例：/任务别名 1 种田");
	md.addNewline();
	md.addText("清空：/任务别名 1 清空");
	md.addNewline();
	md.addNewline();
	slots.forEach((slot, index) => {
		md.addText(`${index + 1}、${slot.alias ? slot.alias : "未设置别名"}`);
		md.addNewline();
	});
	sendPage(e, "任务别名", md);
}
function renderSlot(e, slot, steps, maxSteps, alias = "") {
	const md = Format.createMarkdown();
	const nextStep = Math.min(steps.length + 1, maxSteps);
	if (alias) {
		md.addText(`当前别名：${alias}`);
		md.addNewline();
		md.addText(`修改别名：/任务别名 ${slot} 新名称`);
		md.addNewline();
		md.addNewline();
	}
	md.addText("请@机器人 并输入任务指令");
	md.addNewline();
	md.addText("例：/任务设置 <位置> <任务> <指令>");
	md.addNewline();
	md.addText(`当前建议输入：/任务设置 ${slot} ${nextStep} 指令内容`);
	if (steps.length > 0) {
		md.addNewline();
		md.addNewline();
		md.addText("当前任务：");
		md.addNewline();
		steps.forEach((step, index) => {
			md.addText(`${index + 1}. ${step}`);
			md.addNewline();
		});
	} else {
		md.addNewline();
		md.addNewline();
		md.addText("当前未设置任何步骤");
	}
	if (steps.length < maxSteps) {
		md.addNewline();
		md.addNewline();
		md.addButton(markdownButtonLabel(`填写第${nextStep}步`), { data: `/任务设置 ${slot} ${nextStep} ` });
	}
	sendPage(e, `任务设置 ${slot}`, md);
}
function sendShortcut(_e, command, leadText = "请点击以继续你的任务内容") {
	const [message] = useMessage$1();
	const md = Format.createMarkdown();
	const taskCommand = `/任务 ${command}`;
	const skipCommand = "/任务跳过";
	md.addText(leadText);
	{
		const format = Format.create();
		const buttonGroup = Format.createButtonGroup();
		md.addNewline();
		buttonGroup.addRow();
		buttonGroup.addButton("取消", "/任务取消");
		buttonGroup.addButton("跳过", skipCommand);
		buttonGroup.addButton(command, taskCommand);
		format.addMarkdown(md);
		format.addButtonGroup(buttonGroup);
		message.send({ format });
	}
}

//#endregion
export { renderAliasOverview, renderOverview, renderSlot, sendPage, sendShortcut };