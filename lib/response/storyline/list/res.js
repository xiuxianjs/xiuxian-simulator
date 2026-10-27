import { getCommandErrorMessage } from "../../../utils/commandError.js";
import { measureTransportStageSync } from "../../../utils/transportTiming.js";
import { parseStorylineListArgs } from "../../../api/bot/catalog-query-reuse.js";
import { projectStorylineCatalog } from "../../../api/bot/storyline-catalog-queries.js";
import { markdownButtonLabel } from "../../../utils/buttonLabel.js";
import { FormatGui, addOptions, createQuoteMarkdown } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/storyline/list/res.ts
/**
* 查看主线 / 副本列表 指令响应
* 指令格式：
*   /副本列表       → 章节总览（等同 /查看主线）
*   /查看主线       → 章节总览（第1页，倒序）
*   /查看主线 p2    → 章节总览第2页
*   /查看主线 5     → 第 5 章详情（关卡列表）
*/
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const [, parentNext] = useEvent();
	let result;
	try {
		const response = await runRobotBusiness(e, "storyline.catalog", { input: e.MessageText }, projectStorylineCatalog, parentNext, async (reply) => {
			await message.send(FormatGui({
				isPrivate: e.isPrivate ?? false,
				bid,
				title: reply.title,
				header: reply.buttons,
				content: Format.createMarkdown().addText(reply.text)
			}));
		});
		if (response.handled) return;
		result = response.data;
	} catch (error) {
		const detail = parseStorylineListArgs(e.MessageText).chapterArg !== null;
		await message.send(FormatGui({
			isPrivate: e.isPrivate ?? false,
			bid,
			title: "副本",
			header: [
				...detail ? [{
					label: "返回",
					command: "/查看主线"
				}] : [],
				{
					label: "秘境",
					command: "/查看秘境"
				},
				{
					label: "凶兽",
					command: "/凶兽"
				}
			],
			content: Format.createMarkdown().addText(getCommandErrorMessage(error))
		}));
		return;
	}
	const response = measureTransportStageSync("response.build", () => {
		const dungeonEntryButtons = [
			{
				label: "秘境",
				command: "/查看秘境"
			},
			{
				label: "凶兽",
				command: "/凶兽"
			},
			...result.access.canUseMeridian ? [{
				label: "妖塔",
				command: "/妖塔"
			}] : []
		];
		if (result.code === "OVERVIEW") {
			const contentMd = Format.createMarkdown();
			contentMd.addBlockquote(createQuoteMarkdown([`精力：${result.data.mentalValue}`], [{
				label: "✛",
				command: "/服用 精力丹 1"
			}]));
			contentMd.addBlockquote(createQuoteMarkdown([`主线累计: ${result.data.milestoneTotalStars}⭐ `], [{
				label: result.data.achievementLabel,
				command: "/成就 主线"
			}]));
			contentMd.addNewline();
			contentMd.addNewline();
			for (const arcData of result.data.arcs) {
				const chs = arcData.chapters;
				if (chs.length === 0) continue;
				contentMd.addText(`${arcData.arc}篇`);
				contentMd.addNewline();
				for (const ch of chs) contentMd.addBlockquote(createQuoteMarkdown([`${ch.chestIcon}第${ch.chapterNumber}章 ${ch.name} ${ch.starsText} ${ch.progressText} `], [{
					label: "详情",
					command: `/查看主线 ${ch.chapterNumber}`
				}]));
				contentMd.addNewline();
			}
			if (result.data.showClaimAllChests) {
				contentMd.addText(`📦 可领取宝箱：${result.data.totalClaimableChests}个 `);
				addOptions(contentMd, [{
					label: "一键领取",
					command: "/一键领取宝箱"
				}]);
				contentMd.addNewline();
			}
			return FormatGui({
				isPrivate: e.isPrivate ?? false,
				bid,
				title: "副本",
				header: [...dungeonEntryButtons],
				content: contentMd,
				nav: result.data.totalPages > 1 ? {
					current: result.data.currentPage,
					total: result.data.totalPages,
					count: result.data.totalCount,
					command: "/查看主线 p{page}"
				} : void 0
			});
		}
		const chapter = result.data;
		const stageList = result.data.stages;
		const detailMd = Format.createMarkdown();
		detailMd.addBlockquote(Format.createMarkdown().addText(`精力：${result.data.mentalValue}`).addNewline().addText(`星级进度：${chapter.totalStars}/${chapter.maxStars}⭐`));
		for (const [_, s] of stageList.entries()) {
			const eliteTag = s.isElite ? "(精英)" : "";
			const stageButtons = [];
			if (s.canSweep) {
				stageButtons.push({
					label: "扫荡",
					command: `/主线扫荡 ${s.stageLabel}`
				});
				if (s.showBulkSweep) stageButtons.push({
					label: `×${s.maxSweepTimes}`,
					command: `/主线扫荡 ${s.stageLabel} ${s.maxSweepTimes}`
				});
			} else stageButtons.push({
				label: "挑战",
				command: `/主线挑战 ${s.stageLabel}`
			});
			if (s.canMatch) stageButtons.push({
				label: "匹配",
				command: `/匹配主线 ${s.stageLabel}`
			});
			detailMd.addBlockquote(createQuoteMarkdown([
				`【${s.stageLabel}】${s.monsterDisplayName}${eliteTag}`,
				`消耗：精力${s.spiritCost}`,
				s.rewardText,
				`今日：${s.dailyUsed}/${s.dailyLimit}，星级：${s.starsDisplay}`
			], stageButtons));
		}
		if (result.data.chests.length > 0) {
			detailMd.addText(`宝箱（${chapter.totalStars}/${chapter.maxStars}⭐）`);
			detailMd.addNewline();
			for (const chest of result.data.chests) if (chest.claimed) {
				detailMd.addText(`🎁(${chest.requiredStars}⭐)灵晶×${chest.reward} ✅`);
				detailMd.addNewline();
			} else if (chest.unlocked) {
				detailMd.addText(`🎁(${chest.requiredStars}⭐)灵晶×${chest.reward} `);
				addOptions(detailMd, [{
					label: "领取",
					command: `/领取宝箱 ${chapter.chapterNumber} ${chest.index}`
				}]);
			} else {
				detailMd.addText(`🎁(${chest.requiredStars}⭐)灵晶×${chest.reward} 🔒`);
				detailMd.addNewline();
			}
			detailMd.addNewline();
			if (result.data.canClaimChestCount > 1 && true) {
				detailMd.addButton(markdownButtonLabel("一键领取"), { data: `/领取宝箱 ${chapter.chapterNumber}` });
				detailMd.addText(" ");
			}
		}
		if (result.data.showPrevChapter && true) {
			detailMd.addButton(markdownButtonLabel("上一章"), { data: `/查看主线 ${chapter.chapterNumber - 1}` });
			detailMd.addText("  ");
		}
		if (result.data.showNextChapter && true) {
			detailMd.addButton(markdownButtonLabel("下一章"), { data: `/查看主线 ${chapter.chapterNumber + 1}` });
			detailMd.addText("  ");
		}
		detailMd.addNewline();
		return FormatGui({
			isPrivate: e.isPrivate ?? false,
			bid,
			title: `${chapter.arc}篇 - 第${chapter.chapterNumber}章 ${chapter.chapterName}`,
			header: [{
				label: "返回",
				command: "/查看主线"
			}, ...dungeonEntryButtons],
			content: detailMd
		});
	}, e);
	if (response) message.send(response);
});

//#endregion
export { res_default as default };