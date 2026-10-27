import { formatGameTime, parseGameTime } from "../../utils/gameTime.js";
import { markdownButtonLabel } from "../../utils/buttonLabel.js";
import { FormatGui } from "../../utils/messageHelper.js";
import { presentationCommandFilter } from "../../utils/featureVisibility.js";
import { useMessage as useMessage$1 } from "../../utils/useMessage.js";
import { selects } from "../config.js";
import { runRobotBusiness } from "../robotBusiness.js";
import { parseRobotActivityHub } from "../../api/bot/activity-hub.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/activity/res.ts
/**
* 产品定位：/我的活动 是机器人的「玩法大厅」，同时承载常驻玩法与运营活动。
* 下列入口按服务端当前境界规则展示；未开放玩法在天书中预告。
* 入口可见不代表允许参与：境界、开放时间、次数等资格由目标玩法的服务端校验，
* 本菜单不复制准入规则。新增同类公共玩法时，也应在大厅提供可发现的入口。
*/
const PERSONAL_ROWS = [
	{
		label: "活跃任务",
		command: "/日常活跃",
		introduction: "完成活跃任务，查看进度与奖励"
	},
	{
		label: "成就",
		command: "/成就",
		introduction: "查看成就目标与进度，领取已达成的奖励"
	},
	{
		label: "新人狂欢",
		command: "/新人狂欢",
		introduction: "初入仙途，修行任务与签到"
	},
	{
		label: "通天塔",
		command: "/通天塔",
		introduction: "登塔闯关，挑战更高层"
	},
	{
		label: "镇妖塔",
		command: "/妖塔",
		introduction: "逐层镇妖，磨砺战力"
	},
	{
		label: "登天梯",
		command: "/登天梯",
		introduction: "挑战天骄，争夺排名"
	},
	{
		label: "悬赏",
		command: "/悬赏榜",
		introduction: "接取悬赏，追缉目标"
	},
	{
		label: "劫云榜",
		command: "/劫云榜",
		introduction: "观望道友渡劫，参与劫云互动"
	},
	{
		label: "稻草人",
		command: "/挑战稻草人",
		introduction: "测试伤害，检验战力"
	},
	{
		label: "邀请奖励",
		command: "/邀请奖励",
		introduction: "邀请道友，查看邀请奖励"
	},
	{
		label: "珍宝楼",
		command: "/珍宝楼",
		introduction: "道友摆摊，交易珍宝"
	},
	{
		label: "杀神榜",
		command: "/杀神榜",
		introduction: "群雄争锋，查看杀神排名"
	},
	{
		label: "人气榜",
		command: "/人气排行榜",
		introduction: "道友点赞，人气争锋"
	}
];
const GUILD_ROWS = [
	{
		label: "宗门活跃",
		command: "/宗门日常",
		introduction: "完成宗门任务，查看活跃奖励"
	},
	{
		label: "宗门挖矿",
		command: "/宗门挖矿",
		introduction: "参与宗门采矿"
	},
	{
		label: "宗门祭祖",
		command: "/祭祀祖师",
		introduction: "祭祀祖师，查看供奉与奖励"
	},
	{
		label: "宗门主线",
		command: "/宗门主线",
		introduction: "推进宗门主线，挑战关卡"
	},
	{
		label: "宗门战备",
		command: "/宗门战备",
		introduction: "查看宗门战备，提升团队与个人属性"
	},
	{
		label: "灵脉攻防战",
		command: "/灵脉攻防战",
		introduction: "争夺秘境，为宗门拓土"
	},
	{
		label: "宗门商店",
		command: "/宗门商店",
		introduction: "查看宗门商店，兑换所需物品"
	}
];
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	const [, next] = useEvent();
	const loaded = await runRobotBusiness(e, "activity.hub", {}, parseRobotActivityHub, next, async (reply) => {
		await message.send(FormatGui({
			isPrivate,
			bid,
			title: "",
			content: Format.createMarkdown().addText(reply.text)
		}));
	});
	if (loaded.handled) return;
	const md = Format.createMarkdown();
	const isGuild = /^[!！/#＃]?宗门活动$/.test((e.MessageText ?? "").trim());
	const allowed = await presentationCommandFilter(e);
	const entries = (isGuild ? GUILD_ROWS : PERSONAL_ROWS).filter((entry) => allowed(entry.command));
	for (const entry of entries) {
		const row = Format.createMarkdown().addButton(markdownButtonLabel(`${entry.label}`), { data: entry.command }).addText(` — ${entry.introduction}`);
		if (entry.command === "/灵脉攻防战") {
			const { activeStartAt, activeEndAt } = loaded.data.guildSecretRealmWar;
			const start = parseGameTime(activeStartAt);
			const end = parseGameTime(activeEndAt);
			if (start && end && start.year() > 1 && end.isAfter(start)) row.addNewline().addText(`开放：${formatGameTime(activeStartAt)} ~ ${formatGameTime(activeEndAt)}`);
		}
		md.addBlockquote(row);
	}
	if (!entries.length) md.addText("当前暂无已开放入口，可查阅天书了解解锁条件。");
	message.send(FormatGui({
		isPrivate,
		bid,
		title: "修仙界风云",
		header: [{
			label: "个人",
			selected: !isGuild,
			command: "/个人活动"
		}, ...GUILD_ROWS.some((entry) => allowed(entry.command)) ? [{
			label: "宗门",
			selected: isGuild,
			command: "/宗门活动"
		}] : []],
		content: md
	}));
});

//#endregion
export { res_default as default };