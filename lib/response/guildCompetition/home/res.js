import { formatGameTime } from "../../../utils/gameTime.js";
import { markdownButtonLabel } from "../../../utils/buttonLabel.js";
import { FormatGui, addOptions, createQuoteMarkdown } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { parseCompetitionHome } from "../../../api/bot/competition-read-projections.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/guildCompetition/home/res.ts
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	const [, next] = useEvent();
	const sendFailure = async (text) => {
		await message.send(FormatGui({
			isPrivate,
			bid,
			title: "",
			content: Format.createMarkdown().addText(text)
		}));
	};
	const loaded = await runRobotBusiness(e, "competition.home", {}, parseCompetitionHome, next, async (reply) => {
		await sendFailure(reply.text);
	}).catch(async (error) => {
		await sendFailure(error instanceof Error ? error.message : "获取宗门大比信息失败");
		return { handled: true };
	});
	if (loaded.handled) return;
	const appResult = {
		code: loaded.data.hasGuild ? "OK" : "NO_GUILD",
		data: loaded.data
	};
	const { config, view } = appResult.data;
	const md = Format.createMarkdown();
	md.addBlockquote(Format.createMarkdown().addText(`当前阶段：${view.phaseName}`));
	const cfg = config;
	if (appResult.data.previousSeason) {
		const previous = appResult.data.previousSeason;
		const history = Format.createMarkdown();
		history.addText(`上一届（${previous.competitionId}）：${previous.message}`);
		history.addNewline();
		history.addText(`参赛状态：${previous.teamStatusName}｜积分：${previous.score}`);
		for (const slot of previous.slots) {
			history.addNewline();
			history.addText(`${slot.position}号位：${slot.name}`);
		}
		md.addBlockquote(history);
		md.addNewline();
		md.addText("下一届赛程");
		md.addNewline();
	}
	if (view.showSignupCount && appResult.code === "OK") md.addBlockquote(Format.createMarkdown().addText(`报名宗门数：${appResult.data.signupGuildCount}`));
	md.addNewline();
	md.addText("报名");
	md.addNewline();
	md.addBlockquote(Format.createMarkdown().addText(`${formatGameTime(cfg.registrationStartTime)} ~ ${formatGameTime(cfg.registrationEndTime)}`));
	md.addText("淘汰赛");
	md.addNewline();
	md.addBlockquote(Format.createMarkdown().addText(`${formatGameTime(cfg.knockoutStartTime)} ~ ${formatGameTime(cfg.knockoutEndTime)}`));
	md.addText("晋级赛");
	md.addNewline();
	md.addBlockquote(Format.createMarkdown().addText(`${formatGameTime(cfg.promotionStartTime)} ~ ${formatGameTime(cfg.bettingEndTime)}`));
	md.addText("结算");
	md.addNewline();
	md.addBlockquote(Format.createMarkdown().addText(`${formatGameTime(cfg.settlementTime)}`));
	if (appResult.code === "NO_GUILD") {
		md.addText("你还未加入宗门");
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "宗门大比",
			header: [{
				label: "灵脉攻防战",
				command: "/灵脉攻防战"
			}, {
				label: "通天塔",
				command: "/通天塔"
			}],
			content: md
		}));
		return;
	}
	const { guildId, guildName, guildLevel, team, teamStatusName, roster, knockoutInfo, oddsInfo, topTeams } = appResult.data;
	const viewOptions = [];
	const moveUpOptions = [];
	const moveDownOptions = [];
	const removeOptions = [];
	md.addText("我的宗门");
	md.addNewline();
	md.addBlockquote(Format.createMarkdown().addText(`${guildName}（等级${guildLevel}）`));
	if (!team) md.addBlockquote(Format.createMarkdown().addText(appResult.data.previousSeason ? "下一届状态：未报名" : "状态：未报名"));
	else {
		md.addBlockquote(Format.createMarkdown().addText(`状态：${teamStatusName}`));
		if (view.showRoster && roster) {
			md.addNewline();
			md.addText("参赛成员");
			if (roster.canAdd) {
				md.addText(" ");
				md.addButton(markdownButtonLabel("添加"), { data: "/添加宗门大比成员" });
			}
			if (roster.canClear) {
				md.addText(" ");
				md.addButton(markdownButtonLabel("清空"), { data: "/清空宗门大比队伍" });
			}
			md.addNewline();
			for (let i = 0; i < 6; i++) {
				const position = i + 1;
				const slot = roster.slots[i];
				if (slot) {
					const slotDisplayName = slot.optionName;
					const homeBtns = [{
						label: "查看",
						command: `/查看信息 ${slot.userId}`
					}];
					if (slot.canMoveUp) homeBtns.push({
						label: "上移",
						command: `/调整宗门大比位置 ${position} ${position - 1}`
					});
					if (slot.canMoveDown) homeBtns.push({
						label: "下移",
						command: `/调整宗门大比位置 ${position} ${position + 1}`
					});
					if (slot.canRemove) homeBtns.push({
						label: "移除",
						command: `/移除宗门大比成员 ${position}`
					});
					viewOptions.push({
						label: `查看 ${slotDisplayName}`,
						value: `/查看信息 ${slot.userId}`
					});
					if (slot.canMoveUp) moveUpOptions.push({
						label: `上移 ${slotDisplayName}`,
						value: `/调整宗门大比位置 ${position} ${position - 1}`
					});
					if (slot.canMoveDown) moveDownOptions.push({
						label: `下移 ${slotDisplayName}`,
						value: `/调整宗门大比位置 ${position} ${position + 1}`
					});
					if (slot.canRemove) removeOptions.push({
						label: `移除 ${slotDisplayName}`,
						value: `/移除宗门大比成员 ${position}`
					});
					md.addText(`${position} ${slot.name}`);
					addOptions(md, homeBtns);
				} else {
					md.addText(`${position} 空`);
					md.addNewline();
				}
			}
			md.addNewline();
		}
		if (view.showResults && topTeams) {
			md.addText("晋级赛结果");
			md.addNewline();
			if (topTeams.length === 0) md.addBlockquote(Format.createMarkdown().addText("暂无晋级赛结果"));
			else for (const t of topTeams) md.addBlockquote(Format.createMarkdown().addText(`第${t.rank}名：${t.guildName}（胜场：${t.wins}）`));
			md.addNewline();
		}
		if (view.showKnockout && knockoutInfo) md.addBlockquote(addOptions(Format.createMarkdown().addText(`当前积分：${knockoutInfo.score}，剩余挑战次数：${knockoutInfo.remain}`).addNewline().addText(`当前排名：第${knockoutInfo.rank}名`).addNewline().addText(knockoutInfo.diffToPrevText), view.canChallenge ? [{
			label: "参与挑战",
			command: "/可挑战宗门列表"
		}] : []));
		if (view.showOdds && oddsInfo) {
			const { items: oddsItems } = oddsInfo;
			if (oddsItems.length > 0) {
				md.addNewline();
				md.addText("当前赔率");
				md.addNewline();
				for (const item of oddsItems) {
					const it = item;
					const actions = it.action === "BET" ? [{
						label: "押注",
						command: `/押注宗门大比 ${it.guildId}`
					}] : it.action === "FOLLOW" ? [{
						label: "追投",
						command: "/追投宗门大比"
					}] : [];
					md.addBlockquote(createQuoteMarkdown([`${it.guildName}(${it.guildId}): ${Number(it.odds).toFixed(2)}`], actions));
				}
				md.addNewline();
			}
		}
	}
	const footer = [];
	md.addNewline();
	if (view.canApply) footer.push({
		label: "报名",
		command: "/宗门大比报名"
	});
	if (view.showPromotionTeams) footer.push({
		label: "晋级赛队伍",
		command: "/查看晋级赛队伍"
	});
	footer.push({
		label: "战斗记录",
		command: "/宗门大比战斗记录 1"
	});
	md.addNewline();
	footer.push({
		label: "押注记录",
		command: "/查看押注记录"
	});
	footer.push({
		label: "领取奖励",
		command: "/领取宗门大比奖励"
	});
	message.send(FormatGui({
		isPrivate,
		bid,
		title: "宗门大比",
		header: [
			{
				label: "灵脉攻防战",
				command: "/灵脉攻防战"
			},
			{
				label: "通天塔",
				command: "/通天塔"
			},
			{
				label: "妖塔",
				command: "/妖塔"
			}
		],
		content: md,
		footer
	}));
});

//#endregion
export { res_default as default };