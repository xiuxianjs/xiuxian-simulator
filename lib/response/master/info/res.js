import { formatGameDate, formatGameTime } from "../../../utils/gameTime.js";
import { FormatGui, createQuoteMarkdown } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { appendMiddlewareAdvice } from "../../middlewareReply.js";
import { parseMasterInfo } from "../../../api/bot/master-info-queries.js";
import { masterRecoveryTips } from "../../masterRecovery.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { sendSecondLayerLockedPage } from "../../access/secondLayer.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/master/info/res.ts
const TABS = [
	"总览",
	"日常",
	"师父",
	"徒弟",
	"履历",
	"管理"
];
const HISTORY_GROUP_ORDER = [
	"已出师",
	"已叛离",
	"已逐出"
];
const PAGE_SIZE = 5;
const relationLines = (relation) => {
	const progress = relation.graduationProgress;
	const direction = (label, value) => `${label}：互动${value.interactionCount}次 · 活跃${value.activeDays}天 · 最近${formatGameDate(value.lastInteractionDate)} · 连续未互动${value.inactiveDays}天`;
	return [
		`拜师 ${formatGameDate(relation.startedAt)} · 互动 ${relation.interactionCount} 次 · 活跃 ${relation.activeDays} 天`,
		`出师：${progress.statusText}`,
		`关系 ${progress.relationDays}/${progress.requiredRelationDays} 天 · 活跃 ${progress.activeDays}/${progress.requiredActiveDays} 天`,
		`互动 ${progress.interactionCount}/${progress.requiredInteractionCount} 次 · 冲丹${progress.reachedGoldenCore ? "已完成" : "未完成"}`,
		direction("师父扶持", relation.masterSupportProgress),
		direction("徒弟回应", relation.discipleResponseProgress)
	];
};
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const [, next] = useEvent();
	const bid = e.UserId;
	const isPrivate = e.isPrivate ?? false;
	let result;
	try {
		const loaded = await runRobotBusiness(e, "master.info", {}, parseMasterInfo, next);
		if (loaded.handled) return;
		result = loaded.data;
	} catch {
		const md = Format.createMarkdown().addText("获取师门信息失败，请稍后重试");
		appendMiddlewareAdvice(md, masterRecoveryTips("master.info", "获取师门信息失败"));
		await message.send(FormatGui({
			isPrivate,
			bid,
			title: "我的师门",
			content: md
		}));
		return;
	}
	if (!result.access.allowed) {
		sendSecondLayerLockedPage({
			bid,
			isPrivate,
			message,
			title: "我的师门",
			realmName: result.access.realmName ?? "未知"
		});
		return;
	}
	const args = e.MessageText.trim().replace(/^[!！/#＃]?(?:我的师门|师门)\s*/, "").split(/\s+/);
	const detailUid = args[0] === "徒弟详情" ? Number(args[1]) : void 0;
	const tab = detailUid !== void 0 ? "徒弟" : TABS.find((value) => value === args[0]) ?? "总览";
	const rawPage = Number(args[1] ?? 1);
	const requestedPage = Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 1;
	const md = Format.createMarkdown();
	const block = (lines, buttons = []) => md.addBlockquote(createQuoteMarkdown(lines, buttons));
	const teacher = result.discipleSide;
	const master = result.masterSide;
	const disciples = master?.disciples ?? [];
	const historyCount = result.discipleHistory.length + (master?.history.length ?? 0);
	let nav;
	const paged = (items, command) => {
		const total = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
		const page = Math.min(total, requestedPage);
		if (total > 1) nav = {
			current: page,
			total,
			count: items.length,
			command
		};
		return items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
	};
	const virtueLine = master ? `师德 ${master.virtueProgress.progressExp}${master.virtueProgress.progressRequired === null ? "" : `/${master.virtueProgress.progressRequired}`} · ${master.virtueTitle}` : "";
	if (tab === "总览") {
		if (teacher) block([`师父 · ${teacher.displayMasterName} · ${teacher.displayMasterRealm}`, teacher.graduationProgress.statusText], [{
			label: "师承详情",
			command: "/我的师门 师父"
		}]);
		if (master) block([
			virtueLine,
			`门下 ${master.stats.activeDiscipleCount}/${master.stats.discipleCap}`,
			`累计收徒 ${master.stats.totalAcceptedDiscipleCount} · 出师 ${master.stats.totalGraduatedCount}`
		], [{
			label: "我的徒弟",
			command: "/我的师门 徒弟"
		}]);
		if (teacher || disciples.length) block(["今日培养"], [{
			label: "师门日常",
			command: "/我的师门 日常"
		}]);
		if (historyCount) block([`师承履历 ${result.discipleHistory.length} 段 · 收徒履历 ${master?.history.length ?? 0} 段`], [{
			label: "查看履历",
			command: "/我的师门 履历"
		}]);
		if (!teacher && !master && !historyCount) block(["暂无师承关系"], [{
			label: "圣人榜",
			command: "/圣人榜"
		}, {
			label: "我的信息",
			command: "/我的信息"
		}]);
	} else if (tab === "师父") {
		if (!teacher) md.addText("当前没有师父");
		else {
			block([`${teacher.displayMasterName} · ${teacher.displayMasterRealm}`, ...relationLines(teacher)]);
			if (teacher.blessing) block([`赐福 · 修为获取 +${teacher.blessing.percent}%`, `持续至 ${formatGameTime(teacher.blessing.expireAt)}`]);
			block([teacher.graduationProgress.canGraduate ? "已满足出师条件" : "继续修行，与师父共同完成培养"], [{
				label: "今日培养",
				command: "/我的师门 日常"
			}, ...teacher.graduationProgress.canGraduate ? [{
				label: "申请出师",
				command: "/申请出师"
			}] : []]);
		}
	} else if (tab === "徒弟") {
		if (detailUid !== void 0) {
			const index = disciples.findIndex((item) => item.discipleUserId === detailUid);
			const disciple = disciples[index];
			if (!disciple) block(["当前徒弟中没有这位道友"], [{
				label: "徒弟列表",
				command: "/我的师门 徒弟"
			}]);
			else {
				const page = Math.floor(index / PAGE_SIZE) + 1;
				block([`${disciple.displayDiscipleName} · ${disciple.displayDiscipleRealm}`, ...relationLines(disciple)], [{
					label: "今日培养",
					command: `/我的师门 日常 ${page}`
				}, {
					label: "管理",
					command: `/我的师门 管理 ${page}`
				}]);
				block([`培养收益 · ${disciple.dailyProgress.rewardClosed ? "已关闭" : "未关闭"}`], [{
					label: "徒弟列表",
					command: `/我的师门 徒弟 ${page}`
				}]);
			}
		} else {
			if (master) md.addText(`门下 ${master.stats.activeDiscipleCount}/${master.stats.discipleCap}`).addNewline();
			if (!disciples.length) md.addText("当前没有在培养的徒弟");
			for (const disciple of paged(disciples, "/我的师门 徒弟 {page}")) block([`${disciple.displayDiscipleName} · ${disciple.displayDiscipleRealm}`, disciple.graduationProgress.statusText], [{
				label: "详情",
				command: `/我的师门 徒弟详情 ${disciple.discipleUserId}`
			}]);
		}
	} else if (tab === "日常") {
		if (teacher) {
			const daily = teacher.dailyProgress;
			block([`师父 · ${teacher.displayMasterName}`, ...daily.rewardClosed ? ["培养收益已关闭"] : [`今日传功 ${daily.teachCount}/${daily.teachLimit} · 赐福 ${daily.blessCount}/${daily.blessLimit} · 赐丹 ${daily.giftCount}/${daily.giftLimit}`, `有效互动 · ${daily.hasAnyActionToday ? "已完成" : "未完成"}`]]);
		}
		if (disciples.some((item) => !item.dailyProgress.rewardClosed)) block(["门下培养"], [
			{
				label: "一键传功",
				command: "/一键传功"
			},
			{
				label: "一键赐福",
				command: "/一键赐福"
			},
			{
				label: "一键赐丹",
				command: "/一键赐丹"
			}
		]);
		for (const disciple of paged(disciples, "/我的师门 日常 {page}")) {
			const daily = disciple.dailyProgress;
			const buttons = [];
			if (!daily.rewardClosed) {
				if (daily.teachCount < daily.teachLimit) buttons.push({
					label: "传功",
					command: `/传功 ${disciple.discipleUserId}`
				});
				if (daily.blessCount < daily.blessLimit) buttons.push({
					label: "赐福",
					command: `/赐福 ${disciple.discipleUserId}`
				});
				if (daily.giftCount < daily.giftLimit) buttons.push({
					label: "培元丹×2",
					command: `/赐丹 ${disciple.discipleUserId} 培元丹`
				}, {
					label: "筑基丹×1",
					command: `/赐丹 ${disciple.discipleUserId} 筑基丹`
				});
			}
			block([`${disciple.displayDiscipleName} · ${disciple.displayDiscipleRealm}`, ...daily.rewardClosed ? ["培养收益已关闭"] : [
				`传功 ${daily.teachCount}/${daily.teachLimit}`,
				`赐福 ${daily.blessCount}/${daily.blessLimit} · 消耗元力丹×1`,
				`赐丹 ${daily.giftCount}/${daily.giftLimit} · 消耗培元丹×2／筑基丹×1`,
				...buttons.length ? [] : ["今日培养已完成"]
			]], buttons);
		}
		if (!teacher && !disciples.length) md.addText("当前没有师门日常");
	} else if (tab === "履历") {
		const histories = [...result.discipleHistory.map((item) => ({
			...item,
			role: "师父"
		})), ...(master?.history ?? []).map((item) => ({
			...item,
			role: "徒弟"
		}))].sort((a, b) => {
			const order = (status) => {
				const index = HISTORY_GROUP_ORDER.indexOf(status);
				return index < 0 ? HISTORY_GROUP_ORDER.length : index;
			};
			return order(a.statusText) - order(b.statusText);
		});
		if (!histories.length) md.addText("暂无师门履历");
		for (const history of paged(histories, "/我的师门 履历 {page}")) block([
			`${history.role} · ${history.displayTargetName} · ${history.displayTargetRealm}`,
			history.statusText,
			`拜师 ${formatGameDate(history.startedAt)} · 结束 ${formatGameDate(history.finishedAt, "--")}`
		]);
	} else if (tab === "管理") {
		block(["申请处理"], [{
			label: "拜师申请",
			command: "/同意拜师"
		}, {
			label: "出师申请",
			command: "/同意出师"
		}]);
		if (master?.titleReward) {
			const reward = master.titleReward;
			block([`师门称号 · ${reward.displayTitleName}`, `累计出师 ${master.stats.totalGraduatedCount}/${reward.requiredGraduatedCount} 人 · ${reward.owned ? "已获得" : reward.canClaim ? "可领取" : "未达成"}`], reward.canClaim ? [{
				label: "领取称号",
				command: "/领取师门称号"
			}] : []);
		}
		if (teacher) {
			const support = teacher.masterSupportProgress;
			block([`师父 · ${teacher.displayMasterName}`, ...support.canLeaveWithoutPenalty ? [`连续 ${support.inactiveDays} 天未扶持 · 可无损叛离`] : []], [...teacher.graduationProgress.canGraduate ? [{
				label: "申请出师",
				command: "/申请出师"
			}] : [], {
				label: support.canLeaveWithoutPenalty ? "无损叛离" : "叛离师门",
				command: "/叛离师门"
			}]);
		}
		for (const disciple of paged(disciples, "/我的师门 管理 {page}")) {
			const canClear = disciple.discipleResponseProgress.canLeaveWithoutPenalty;
			block([
				`${disciple.displayDiscipleName} · ${disciple.displayDiscipleRealm}`,
				disciple.graduationProgress.statusText,
				...canClear ? [`连续 ${disciple.discipleResponseProgress.inactiveDays} 天未回应 · 可清退`] : []
			], [...disciple.graduationProgress.canGraduate ? [{
				label: "出师",
				command: `/同意出师 ${disciple.discipleUserId}`
			}] : [], {
				label: canClear ? "清退" : "逐出",
				command: `/逐出师门 ${disciple.discipleUserId}`
			}]);
		}
	}
	await message.send(FormatGui({
		isPrivate,
		bid,
		title: "我的师门",
		header: TABS.map((label) => ({
			label,
			selected: label === tab,
			command: label === "总览" ? "/我的师门" : `/我的师门 ${label}`
		})),
		content: md,
		nav,
		footer: [{
			label: "师谱",
			command: "/师谱"
		}, {
			label: "圣人榜",
			command: "/圣人排行榜"
		}]
	}));
});

//#endregion
export { res_default as default };