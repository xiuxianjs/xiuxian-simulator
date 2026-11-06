import { commandText } from "../../../utils/commandPrefix.js";
import { markdownButtonLabel } from "../../../utils/buttonLabel.js";
import { createQuoteMarkdown } from "../../../utils/messageHelper.js";
import { section } from "../../presentation/sections.js";
import { formatGuildShopAutoRefreshHours } from "../../../response-apps/guild/autoRefreshShop/view.js";
import "../../presentation/index.js";
import { Format } from "alemonjs";

//#region src/response/guild/myGuild/view.ts
/** Visibility follows GuildPermissionAllowed and the existing home permission facts. */
function guildHomePermissions(data) {
	const member = data.membership;
	const reviewer = !!member && (member.isDeputy || [
		"宗主",
		"副宗主",
		"长老"
	].includes(member.roleName ?? ""));
	return {
		reviewer,
		appoint: !!member && (member.isDeputy || ["宗主", "副宗主"].includes(member.roleName ?? "")),
		leader: !!member?.isLeader && !member.isDeputy,
		upgrade: !!member?.canUpgrade,
		management: reviewer || !!member?.canUpgrade
	};
}
function buildGuildHomePage(data, section$1) {
	const { membership, guild, unlockLevels, storyline } = data;
	const md = Format.createMarkdown();
	const back = [{
		label: "返回宗门",
		command: "/我的宗门"
	}];
	if (!membership || !guild) return {
		title: "宗门",
		content: md.addText("获取宗门信息失败"),
		footer: back
	};
	const permissions = guildHomePermissions(data);
	const quote = (lines, buttons = []) => {
		const contentLines = section$1 && lines.length > 1 && /^【.+】$/.test(lines[0]) ? lines.slice(1) : lines;
		md.addBlockquote(createQuoteMarkdown(contentLines, buttons));
	};
	const upgrade = (kind) => {
		const name = {
			level: "宗门",
			vein: "灵脉",
			shop: "商店"
		}[kind];
		const command = {
			level: "/提升宗门等级",
			vein: "/提升宗门灵脉",
			shop: "/提升宗门商店"
		}[kind];
		const cost = guild.upgrades?.find((item) => item.kind === kind);
		const lines = !cost || cost.status === "unavailable" ? [`状态：${cost?.reason ?? "升级条件暂不可用，请稍后查看"}`] : [
			`等级：${cost.currentLevel} → ${cost.targetLevel}`,
			`消耗：宗门声望${cost.prestigeCost} · 当前${guild.prestige}`,
			`消耗：宗门灵石${cost.spiritStoneCost} · 当前${guild.spiritStone}`,
			...cost.prestigeMissing || cost.spiritStoneMissing ? [`还差：${[cost.prestigeMissing ? `声望${cost.prestigeMissing}` : "", cost.spiritStoneMissing ? `灵石${cost.spiritStoneMissing}` : ""].filter(Boolean).join("、")}`] : [],
			...cost.status === "blocked" ? [`条件：${cost.reason}`] : []
		];
		md.addBlockquote(section({
			title: `${name}升级`,
			lines,
			actions: permissions.upgrade && cost?.status === "ready" ? [{
				label: `升至${cost.targetLevel}级`,
				command
			}] : []
		}));
	};
	const currentCommand = section$1 ? `/我的宗门 ${section$1}` : "/我的宗门";
	const header = [
		{
			label: "宗门",
			command: "/我的宗门"
		},
		{
			label: "演武",
			command: "/我的宗门 活动"
		},
		{
			label: "宗门志",
			command: "/我的宗门 资料"
		},
		...permissions.management ? [{
			label: "议事",
			command: "/我的宗门 管理"
		}] : []
	].map((button) => ({
		...button,
		selected: button.command === currentCommand
	}));
	const guildName = membership.guildName ?? "";
	const position = membership.isDeputy ? "代理宗主" : membership.roleName ?? "未知";
	const storylineText = storyline.initialized ? storyline.allCleared ? "今日主线已全部通关" : `主线战况：第${storyline.stageIndex}关` : "主线战况：待查看";
	if (section$1) {
		md.addText(`${guild.level}级 · ID:${membership.guildId} · ${position}`);
		md.addNewline();
	}
	if (section$1 === "活动") {
		quote(["【宗门演武】", storylineText], [{
			label: "宗门主线",
			command: "/宗门主线"
		}, {
			label: "灵脉攻防战",
			command: "/灵脉攻防战"
		}]);
		quote(["【同门往来】", `同门：${guild.memberCount}/${guild.memberCapacity}`], [
			{
				label: "红包",
				command: "/宗门红包"
			},
			{
				label: "成员",
				command: "/宗门成员列表"
			},
			{
				label: "飞信",
				command: "/飞信 宗门"
			},
			{
				label: "精华",
				command: "/宗门精华"
			}
		]);
		return {
			title: `【${guildName}】宗门演武`,
			header,
			content: md,
			footer: back
		};
	}
	if (section$1 === "管理") {
		if (!permissions.management) {
			quote([
				"【宗门议事】",
				`当前身份：${position}`,
				"宗门事务由宗主、副宗主与长老主持。"
			]);
			return {
				title: `【${guildName}】宗门议事`,
				header,
				content: md,
				footer: back
			};
		}
		quote(["【宗门议事】", `当前身份：${position}`]);
		if (permissions.reviewer) quote(["【同门事务】", `同门：${guild.memberCount}/${guild.memberCapacity} · 待入宗申请：${data.pendingApplications}`], [
			{
				label: "审核",
				command: "/宗门审核"
			},
			{
				label: "成员",
				command: "/宗门成员列表"
			},
			{
				label: "移除成员",
				command: "/踢出成员"
			},
			{
				label: "精华",
				command: "/宗门精华"
			},
			...permissions.appoint ? [{
				label: "改职",
				command: "/宗门改职"
			}] : [],
			{
				label: "卸任",
				command: "/卸任"
			}
		]);
		if (permissions.upgrade) {
			upgrade("level");
			if (guild.veinLevel !== null) upgrade("vein");
			if (guild.shopLevel !== null) upgrade("shop");
			quote([], [{
				label: "战备",
				command: "/宗门战备"
			}]);
		}
		if (membership.isLeader && guild.shopLevel !== null) quote(["【宗门商店】", `${guild.shopLevel}级 · 自动刷新：${guild.shopAutoRefresh.enabled ? formatGuildShopAutoRefreshHours(guild.shopAutoRefresh.hours) : "未开启"}`], [{
			label: "自动刷新",
			command: "/宗门商店自动刷新"
		}]);
		if (permissions.leader) quote(["【宗主事务】", `宗主：${guild.leader.name ?? ""} · 宗门ID：${membership.guildId}`], [
			{
				label: "改名",
				command: "/宗门改名"
			},
			{
				label: "入宗门槛",
				command: "/设置申请宗门最低境界"
			},
			{
				label: "转让宗主",
				command: "/宗主转让"
			},
			{
				label: "宗主请假",
				command: "/宗主请假"
			},
			{
				label: "解散",
				command: "/解散宗门"
			}
		]);
		else if (membership.isDeputy) quote(["【入宗要求】", guild.minRealmName ? `${guild.minRealmName}及以上` : "无境界要求"], [{
			label: "入宗门槛",
			command: "/设置申请宗门最低境界"
		}]);
		return {
			title: `【${guildName}】宗门议事`,
			header,
			content: md,
			footer: back
		};
	}
	if (section$1 === "资料") {
		quote([
			"【宗门志】",
			`ID：${membership.guildId} · 宗主：${guild.leader.name ?? ""}(ID:${guild.leader.userId})`,
			`称号：${guild.titles.map((title) => title.trim()).filter(Boolean).join("、") || "无"}`
		]);
		quote([
			"【宗门底蕴】",
			`灵石：${guild.spiritStone}/${guild.spiritStoneCap} · 声望：${guild.prestige}/${guild.prestigeCap}`,
			`灵脉：${guild.veinLevel === null ? "未开放" : `${guild.veinLevel}级`}`
		]);
		quote(["【宗门商店】", `${guild.shopLevel === null ? unlockLevels.shop ? `${unlockLevels.shop}级开放` : "未开放" : `${guild.shopLevel}级`}${guild.shopAutoRefresh.enabled ? ` · 自动刷新：${formatGuildShopAutoRefreshHours(guild.shopAutoRefresh.hours)}` : ""}`]);
		quote([
			"【同门名册】",
			`成员：${guild.memberCount}/${guild.memberCapacity}`,
			guild.viceLeaderLimit > 0 ? `副宗主：${guild.viceLeaderCount}/${guild.viceLeaderLimit}` : `副宗主：${unlockLevels.viceLeader ? `${unlockLevels.viceLeader}级宗门开放` : "未开放"}`,
			guild.elderLimit > 0 ? `长老：${guild.elderCount}/${guild.elderLimit}` : `长老：${unlockLevels.elder ? `${unlockLevels.elder}级宗门开放` : "未开放"}`,
			guild.minRealmName ? `入宗要求：${guild.minRealmName}及以上` : "入宗要求：无"
		]);
		quote(["【宗门记事】", `宗门ID：${membership.guildId}`], [
			{
				label: "简介",
				command: "/宗门简介"
			},
			{
				label: "公告",
				command: "/宗门公告"
			},
			{
				label: "日志",
				command: "/宗门日志"
			},
			{
				label: "成员",
				command: "/宗门成员列表"
			}
		]);
		quote(["【同门去留】", `当前身份：${position}`], [{
			label: "退出宗门",
			command: "/退出宗门"
		}, {
			label: "弹劾宗主",
			command: "/弹劾宗主"
		}]);
		return {
			title: `【${guildName}】宗门志`,
			header,
			content: md,
			footer: back
		};
	}
	if (guild.notice) quote([`📢 ${guild.notice}`]);
	md.addBold(`【${guildName}】 ${guild.level}级(ID:${membership.guildId})`);
	if (permissions.upgrade) md.addText(" ").addButton(markdownButtonLabel("升级条件"), { data: commandText("/我的宗门 管理") });
	if (permissions.leader) md.addText(" ").addButton(markdownButtonLabel("改名"), { data: commandText("宗门改名") });
	md.addNewline();
	quote([`称号：${guild.titles.map((title) => title.trim()).filter(Boolean).join("、") || "无"}`]);
	quote([`宗主：${guild.leader.name ?? ""}(ID:${guild.leader.userId})`]);
	quote([`灵石：${guild.spiritStone}/${guild.spiritStoneCap}`]);
	quote([`声望：${guild.prestige}/${guild.prestigeCap}`]);
	quote([`灵脉：${guild.veinLevel === null ? "未开放" : `${guild.veinLevel}级`}`], permissions.upgrade && guild.veinLevel !== null ? [{
		label: "升级条件",
		command: "/我的宗门 管理"
	}] : []);
	quote([`商店：${guild.shopLevel === null ? unlockLevels.shop ? `${unlockLevels.shop}级开放` : "未开放" : `${guild.shopLevel}级`}${guild.shopAutoRefresh.enabled ? ` · 自动刷新：${formatGuildShopAutoRefreshHours(guild.shopAutoRefresh.hours)}` : ""}`], [
		...guild.shopLevel !== null ? [{
			label: "商店",
			command: "/宗门商店"
		}] : [],
		...permissions.upgrade && guild.shopLevel !== null ? [{
			label: "升级条件",
			command: "/我的宗门 管理"
		}] : [],
		...membership.isLeader && guild.shopLevel !== null ? [{
			label: "自动刷新",
			command: "/宗门商店自动刷新"
		}] : []
	]);
	quote([storylineText], [{
		label: "查看",
		command: "/宗门主线"
	}, {
		label: "战备",
		command: "/宗门战备"
	}]);
	quote([`副宗主人数：${guild.viceLeaderCount}/${guild.viceLeaderLimit}`]);
	quote([`长老人数：${guild.elderCount}/${guild.elderLimit}`]);
	quote([`成员人数：${guild.memberCount}/${guild.memberCapacity}`], permissions.reviewer ? [{
		label: data.pendingApplications > 0 ? `审核(${data.pendingApplications})` : "审核",
		command: "/宗门审核"
	}] : []);
	quote([guild.minRealmName ? `入宗要求：${guild.minRealmName}及以上` : "入宗要求：无"]);
	return {
		header,
		content: md,
		footer: [
			{
				label: "日常",
				command: "/宗门日常"
			},
			{
				label: "周常",
				command: "/宗门周常"
			},
			{
				label: "同门",
				command: "/宗门成员列表"
			},
			{
				label: "飞信",
				command: "/飞信 宗门"
			}
		]
	};
}

//#endregion
export { buildGuildHomePage, guildHomePermissions };