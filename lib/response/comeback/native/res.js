import { parseNativeComebackOverview } from "../../../api/bot/native-comeback.js";
import { FormatGui } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/comeback/native/res.ts
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	const md = Format.createMarkdown();
	const [, next] = useEvent();
	const renderFailure = async (text) => {
		const content = Format.createMarkdown();
		content.addText(text);
		await message.send(FormatGui({
			isPrivate,
			bid,
			title: "回归活动",
			content,
			footer: [{
				label: "我的信息",
				command: "/我的信息"
			}]
		}));
	};
	let data;
	try {
		const loaded = await runRobotBusiness(e, "native-comeback.overview", {}, parseNativeComebackOverview, next, (reply) => renderFailure(reply.text));
		if (loaded.handled) return;
		data = loaded.data;
	} catch (error) {
		await renderFailure(error instanceof Error ? error.message : "加载本服回归奖励失败");
		return;
	}
	if (!data.enabled) md.addText("本服回归活动暂未开启。");
	else if (!data.current) {
		md.addText("当前未触发本服回归活动。");
		md.addNewline();
		md.addText(`小回归：沉默${data.rules.smallSilentDays}天及以上`);
		md.addNewline();
		md.addText(`大回归：沉默${data.rules.largeSilentDays}天及以上`);
	} else {
		const current = data.current;
		md.addText(`回归类型：${current.comebackTypeText}`);
		md.addNewline();
		md.addText(`触发沉默：${current.silentDays}天`);
		md.addNewline();
		md.addText(`有效剩余：${current.remainingText}`);
		md.addNewline();
		md.addText(`回归加成：修为获取 +${current.expBonusPercent}%`);
		md.addNewline();
		md.addText(`周期时长：${data.rules.expireDays}天`);
		md.addNewline();
		md.addNewline();
		md.addText(`7日签到（今日第${current.signIn.currentDayIndex}天）`);
		md.addNewline();
		current.signIn.days.forEach((day) => {
			md.addText(`第${day.dayIndex}天【${day.statusText}】${day.rewardsPreviewText}`);
			md.addNewline();
		});
	}
	const footer = [];
	if (data.current?.signIn.canClaimToday) footer.push({
		label: "回归签到",
		command: "/回归签到"
	});
	footer.push({
		label: "我的信息",
		command: "/我的信息"
	});
	message.send(FormatGui({
		isPrivate,
		bid,
		title: "回归活动",
		content: md,
		footer
	}));
});

//#endregion
export { res_default as default };