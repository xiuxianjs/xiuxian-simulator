import { getCommandBusinessErrorMessage } from "../../../utils/commandError.js";
import { measureTransportStage, measureTransportStageSync, transportCheckpoint } from "../../../utils/transportTiming.js";
import { getRobotHomeOverview } from "../../../api/bot/robot-business.js";
import { markdownButtonLabel } from "../../../utils/buttonLabel.js";
import { FormatGui, addOptions } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { selects } from "../../config.js";
import mwBan_default from "../../mwBan.js";
import { finishRobotBusiness, interceptTaskCompatibility } from "../../robotBusiness.js";
import App from "../../../response-apps/message/me/app.js";
import { Format, logger, onResponse, useEvent } from "alemonjs";
import { QQMarkdown } from "@alemonjs/qq-bot/markdown";

//#region src/response/message/me/res.ts
const monthCardNameColors = [
	"#FF3333",
	"#FF5533",
	"#FF7733",
	"#FF9933",
	"#FFBB33",
	"#FFDD33",
	"#FFFF33",
	"#AAFF33"
];
const coloredMonthCardName = (name) => {
	const letters = [...new Intl.Segmenter("zh-CN", { granularity: "grapheme" }).segment(name)].map((part) => part.segment);
	return QQMarkdown.math(letters.map((letter, index) => {
		const color = monthCardNameColors[Math.round(index * (monthCardNameColors.length - 1) / Math.max(1, letters.length - 1))];
		return QQMarkdown.color(letter, color).slice(1, -1);
	}).join(""));
};
const notificationButtonMap = {
	UNREAD_EMAIL: {
		label: "📬待处理邮件",
		command: "/我的邮件"
	},
	PENDING_FRIEND: {
		label: "🤝新好友",
		command: "/好友申请"
	},
	PENDING_TEAM: {
		label: "⚔️新组队",
		command: "/队伍申请"
	},
	PENDING_GUILD: {
		label: "🏯新申请",
		command: "/宗门审核"
	},
	PENDING_COMPANION: {
		label: "💕新道侣",
		command: "/我的道侣"
	},
	UNREAD_ROBBERY: {
		label: "⚔️被打劫",
		command: "/打劫记录"
	},
	UNREAD_COUNTER_ATTACK: {
		label: "🔄被反击",
		command: "/打劫记录"
	},
	ACTIVE_BOUNTY_ON_ME: {
		label: "🎯被悬赏",
		command: "/悬赏榜"
	},
	MATURE_CAVE_PLOT: {
		label: "🌿成熟",
		command: "/灵田"
	},
	KILL_GOD: {
		label: "☠️杀神榜",
		command: "/煞气"
	},
	UNREAD_FLYMAIL: {
		label: "✉️未读飞信",
		command: "/飞信"
	},
	UNDELIVERED_NOTIFICATION: {
		label: "🔔未送达通知",
		command: "/我的通知"
	}
};
const appendButtons = (md, buttons) => {
	buttons.forEach((button, index) => {
		if (index > 0) md.addText(" ");
		md.addButton(markdownButtonLabel(`${button.label}`), { data: button.command });
	});
};
const toNotificationButton = (notification, canUseFifthLayerFeature) => {
	if (notification.type === "UNREAD_NOTICE" || notification.count <= 0) return [];
	const button = notificationButtonMap[notification.type];
	return [{
		...button,
		...notification.type === "UNREAD_FLYMAIL" && !canUseFifthLayerFeature ? { command: "/飞信 队伍" } : {},
		label: `${button.label} ${notification.type === "KILL_GOD" ? "煞气" : ""}${notification.count}`
	}];
};
/**
* /我 — 游戏主页
* 中文函数注释：
* - 精准匹配后只请求一次，准入和主页业务都在后端完成。
* - 无角色：静默结束。
* - 有角色：展示角色概览与快捷操作按钮。
*/
var res_default = onResponse(selects, (e) => measureTransportStage("home.handler", async () => {
	transportCheckpoint("home.route.enter", e);
	const [message] = useMessage$1();
	const bid = e.UserId;
	const [, next] = useEvent();
	if (await measureTransportStage("home.task.compatibility", () => interceptTaskCompatibility(e, next), e) || measureTransportStageSync("home.platform.compatibility", () => mwBan_default(e), e) !== true) return;
	if (!measureTransportStageSync("home.identity.input", () => typeof bid === "string" && bid.length > 0 && bid.trim() === bid, e)) {
		logger.error("平台身份缺失，无法加载个人信息");
		return;
	}
	try {
		const result = await measureTransportStage("home.api.total", () => getRobotHomeOverview(e), e);
		const response = await measureTransportStage("home.branch.dispatch", () => finishRobotBusiness(e, result, next), e);
		if (response.handled) return;
		const res = measureTransportStageSync("home.view.model", () => App(response.data), e);
		const contentMd = Format.createMarkdown();
		const isPrivate = e.isPrivate ?? false;
		if (res.code !== "OK") {
			contentMd.addText(res.code === "USER_NOT_FOUND" ? "未找到角色数据，请重新创建角色。" : "加载个人信息失败，请稍后再试。");
			message.send(measureTransportStageSync("home.bubble.error", () => FormatGui({
				isPrivate,
				bid,
				title: "主页 - 我的信息",
				content: contentMd,
				footer: [{
					label: "踏入仙途",
					command: "/踏入仙途"
				}]
			}), e));
			return;
		}
		const payload = measureTransportStageSync("home.bubble.build", () => {
			const { data } = res;
			const isEarlyStarter = data.actions.isEarlyStarter;
			const hasSignature = data.profile.signature.length > 0;
			const pageTitle = data.profile.title !== "无" ? `主页 - ${data.profile.title}` : "主页 - 我的信息";
			const noticeButtons = [];
			noticeButtons.push(...data.notifications.flatMap((notification) => toNotificationButton(notification, data.actions.canUseFifthLayerFeature)));
			if (data.bannerImageUrl) {
				contentMd.addImage(data.bannerImageUrl, {
					width: 430,
					height: 100
				});
				contentMd.addNewline();
			}
			if (noticeButtons.length > 0) {
				const noticeMd = Format.createMarkdown();
				appendButtons(noticeMd, noticeButtons);
				contentMd.addBlockquote(noticeMd);
			}
			const atmosphere = data.atmosphere;
			if (atmosphere.text) {
				contentMd.addText(`${atmosphere.kind === "absence" ? "📜 " : ""}${atmosphere.text}`);
				contentMd.addNewline();
			}
			if (e.Platform === "qq-bot" && data.profile.hasMonthCard) {
				contentMd.addText("UID: ");
				contentMd.addContent(coloredMonthCardName(String(data.profile.uid)));
			} else contentMd.addText(`UID: ${data.profile.uid} `);
			const socialButtons = [];
			if (data.actions.canAcceptApprentice) socialButtons.push({
				label: "拜师",
				command: `/拜师 ${data.actions.socialTargetUid}`
			});
			if (!isEarlyStarter && data.actions.canUseMeridian) socialButtons.push({
				label: "比试",
				command: `/比试 ${data.actions.socialTargetUid}`
			});
			if (data.actions.canUseRobberyLikePvp) socialButtons.push({
				label: "打劫",
				command: `/打劫 ${data.actions.socialTargetUid}`
			});
			appendButtons(contentMd, socialButtons);
			contentMd.addNewline();
			if (e.Platform === "qq-bot" && data.profile.hasMonthCard) {
				contentMd.addText("道号：");
				contentMd.addContent(coloredMonthCardName(data.profile.name));
			} else contentMd.addText(`道号：${data.profile.name} `);
			if (data.actions.canUseFifthLayerFeature) socialButtons.push({
				label: "结交",
				command: `/结交 ${data.actions.socialTargetUid}`
			});
			addOptions(contentMd, [{
				label: "改名",
				command: `/改名 ${data.actions.renameValue}`
			}]);
			contentMd.addText(`性别：${data.profile.genderText} `);
			appendButtons(contentMd, [{
				label: "改性",
				command: `/改性 ${data.profile.nextGenderText}`
			}]);
			contentMd.addNewline();
			if (data.guildName !== void 0) {
				contentMd.addText(`宗门：${data.guildName ?? "无"}`);
				contentMd.addNewline();
			}
			if (!isEarlyStarter && hasSignature) contentMd.addBlockquote(Format.createMarkdown().addText(data.profile.signature));
			else contentMd.addNewline();
			contentMd.addText(`战力：${data.stats.combatPower} ✊`);
			appendButtons(contentMd, [{
				label: "天赋",
				command: "/天赋"
			}]);
			contentMd.addNewline();
			contentMd.addText(`境界：${data.stats.realmName} `);
			addOptions(contentMd, [{
				label: "升级",
				command: "/我的境界"
			}, ...data.actions.canUseSoulPath ? [{
				label: "道途",
				command: "/元婴道途"
			}] : []]);
			contentMd.addText(`灵根：${data.stats.spiritRootTitle} `);
			addOptions(contentMd, [{
				label: "升品",
				command: "/我的灵根"
			}]);
			const expBtns = [{
				label: "✛",
				command: "/服用 聚灵丹 1"
			}];
			if (data.actions.canStoreGreenBottle) expBtns.push({
				label: "存储",
				command: "/小绿瓶存储"
			});
			contentMd.addText(`修为：${data.stats.experienceText} `);
			addOptions(contentMd, expBtns);
			contentMd.addText(`元力：${data.stats.qi.current}/${data.stats.qi.cap} ${data.stats.qi.recoverText} `);
			addOptions(contentMd, [{
				label: "✛",
				command: "/服用 元力丹 1"
			}]);
			contentMd.addText(`精力：${data.stats.mental.current}/${data.stats.mental.cap} ${data.stats.mental.recoverText} `);
			addOptions(contentMd, [{
				label: "✛",
				command: "/服用 精力丹 1"
			}]);
			const header = [
				{
					label: "签到",
					command: "/签到"
				},
				{
					label: "任务",
					command: "/任务面板"
				},
				{
					label: "天书",
					command: "/天书"
				},
				{
					label: "帮助",
					command: "/帮助"
				}
			];
			const footer = [
				...data.actions.isNewcomer ? [[{
					label: "新人狂欢",
					command: "/新人狂欢"
				}]] : [],
				...!isEarlyStarter ? [[
					{
						label: "权限",
						command: "/权限"
					},
					{
						label: "改签名",
						command: "/改签名 新内容"
					},
					{
						label: "改称号",
						command: "/我的称号"
					}
				]] : [],
				[
					{
						label: "宗门",
						command: "/我的宗门"
					},
					{
						label: "洞府",
						command: "/我的洞府"
					},
					{
						label: "师门",
						command: "/我的师门"
					},
					{
						label: "道侣",
						command: "/我的道侣"
					}
				],
				[
					{
						label: "背包",
						command: "/储物袋"
					},
					{
						label: "好友",
						command: "/我的好友"
					},
					{
						label: "组队",
						command: "/我的队伍"
					},
					{
						label: "更多",
						command: "/更多"
					}
				]
			];
			return FormatGui({
				isPrivate,
				bid,
				title: pageTitle,
				header,
				content: contentMd,
				footer
			});
		}, e);
		message.send(payload);
	} catch (error) {
		logger.error(error);
		const md = Format.createMarkdown();
		md.addText(getCommandBusinessErrorMessage(error) ?? "加载个人信息失败，请稍后再试。");
		message.send(measureTransportStageSync("home.bubble.error", () => FormatGui({
			isPrivate: e.isPrivate ?? false,
			bid,
			title: "主页 - 我的信息",
			content: md,
			footer: [{
				label: "踏入仙途",
				command: "/踏入仙途"
			}]
		}), e));
	}
}, e));

//#endregion
export { res_default as default };