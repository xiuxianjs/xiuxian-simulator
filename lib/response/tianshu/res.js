import { getCommandPrefix } from "../../utils/commandPrefix.js";
import { buildBubble } from "../presentation/bubble.js";
import { mentionsRetiredFeature } from "../retiredFeatures.js";
import "../presentation/index.js";
import { parseBackendTianshuContent } from "../../api/bot/tianshu-content.js";
import { useMessage as useMessage$1 } from "../../utils/useMessage.js";
import { selects } from "../config.js";
import { runRobotBusiness } from "../robotBusiness.js";
import { helpRealmName } from "../help-realm.js";
import { onResponse, useEvent } from "alemonjs";

//#region src/response/tianshu/res.ts
const pageSize = 6;
const normalizeRealm = (name) => name.replace(/^练气/u, "炼气").replace(/期$/u, "");
const realmHelp = (name) => {
	const realm = helpRealmName(name);
	return realm ? [{
		label: "怎么玩",
		command: `/帮助 ${realm}`
	}] : [];
};
const refiningLimits = {
	robbery: "打劫受元力、次数和目标状态限制",
	master: "拜师限至金丹圆满，师父须境界更高，出师后不可再拜",
	teams: "组队须符合队伍及副本境界要求",
	"team-mail": "队伍飞信须先入队",
	"battle-templates": "模板所用装备和功法须可用",
	companion: "双修、任务、赠礼和道侣商店须已有道侣",
	"tongtian-tower": "通天塔受开放日期、次数和消耗限制",
	"reputation-shop": "兑换须有足够声望并满足商品条件",
	herbalist: "种植须完成引导，并有种子和可用地块",
	"fishing-build": "开塘需 10,000 灵石",
	alchemy: "炼丹须完成入门，并有丹方、材料和工具"
};
function refiningSections(features) {
	const tiers = /* @__PURE__ */ new Map();
	for (const feature of features) {
		const tier = tiers.get(feature.realm) ?? [];
		tier.push(feature);
		tiers.set(feature.realm, tier);
	}
	return [...tiers].map(([title, tier]) => ({
		title,
		actions: realmHelp(title),
		lines: [`玩法：${tier.map((feature) => feature.name).join("、")}`, ...tier.flatMap((feature) => {
			const conditions = feature.conditions.filter((condition) => !mentionsRetiredFeature(condition));
			return conditions.length > 0 ? refiningLimits[feature.id] ? [refiningLimits[feature.id]] : conditions.map((condition) => feature.name + " · " + condition) : [];
		}).map((condition) => `条件：${condition}`)]
	}));
}
var res_default = onResponse(selects, async (e) => {
	const [, next] = useEvent();
	const raw = e.MessageText.trim();
	const prefix = getCommandPrefix();
	const match = (raw.startsWith(prefix) ? raw.slice(prefix.length).trimStart() : raw.replace(/^[!！/#＃]/u, "")).match(/^天书(?:\s+(\S+)(?:\s+([1-9]\d*))?)?$/u);
	if (!match) {
		next();
		return;
	}
	const [message] = useMessage$1();
	const context = {
		isPrivate: e.isPrivate ?? false,
		bid: e.UserId,
		bar: false
	};
	const back = {
		label: "下一个境界",
		command: "/天书"
	};
	const myHelp = {
		label: "我的进度",
		command: "/帮助"
	};
	const directory = {
		label: "境界目录",
		command: "/天书 目录"
	};
	try {
		const loaded = await runRobotBusiness(e, "tianshu.content", {}, parseBackendTianshuContent, next);
		if (loaded.handled) return;
		const content = loaded.data;
		const groups = [...content.featureCatalog ?? []].sort((a, b) => a.stageLevel - b.stageLevel);
		const stages = groups.filter((group) => group.stageLevel > 0);
		const name = match[1];
		if (!name) {
			const upcoming = content.upcoming;
			const fallback = content.currentStage?.unlocks.find((row) => !row.unlocked) ?? content.nextStage?.unlocks[0];
			const realm = upcoming?.realm ?? fallback?.realm ?? content.nextStage?.stageName;
			const names = (upcoming?.features ?? fallback?.features ?? []).filter((feature) => !mentionsRetiredFeature(feature));
			const current = groups.find((group) => group.stageLevel === content.currentStage?.stageLevel);
			await message.send(buildBubble({
				...context,
				title: realm ? "天书 · " + realm : "天书",
				sections: [{
					actions: realm ? realmHelp(realm) : [],
					lines: [...upcoming ? [] : realm ? ["说明：最近的已知解锁预告。"] : [], ...names.length ? [`玩法：${names.join("、")}`] : [realm ? "状态：暂无新增玩法。" : "状态：暂无下一境界资料。"]]
				}],
				footer: [
					directory,
					myHelp,
					...current ? [{
						label: current.stageName,
						command: "/天书 " + current.stageName
					}] : []
				]
			}));
			return;
		}
		const numbered = /^[1-9]\d*$/u.test(name) && match[2] === void 0;
		const page = numbered ? Math.min(Number(name), stages.length) : Number(match[2] ?? 1);
		const selected = numbered ? stages[page - 1] : groups.find((group) => normalizeRealm(group.stageName) === normalizeRealm(name));
		if (!selected) {
			const directoryPageSize = 3;
			const total = Math.max(1, Math.ceil(stages.length / directoryPageSize));
			const current = name === "目录" ? Math.min(page, total) : 1;
			await message.send(buildBubble({
				...context,
				title: "天书 · 境界目录",
				sections: [...name === "目录" ? [] : [{ lines: ["说明：请选择大境界，如「炼气」或「筑基」。"] }], ...stages.slice((current - 1) * directoryPageSize, current * directoryPageSize).map((group) => ({
					lines: [],
					actions: [{
						label: group.stageName,
						command: "/天书 " + group.stageName
					}, ...realmHelp(group.stageName)]
				}))],
				nav: total > 1 ? {
					current,
					total,
					command: "/天书 目录 {page}"
				} : void 0,
				footer: [back, {
					label: "通用",
					command: "/天书 通用"
				}]
			}));
			return;
		}
		const features = selected.features.filter((feature) => !mentionsRetiredFeature(feature.name));
		const refining = normalizeRealm(selected.stageName) === "炼气";
		const perPage = refining ? 2 : pageSize;
		const entries = refining ? refiningSections(features) : features.map((feature) => ({
			title: feature.name,
			lines: [`条件：${feature.realm}`, ...feature.conditions.filter((condition) => !mentionsRetiredFeature(condition)).map((condition) => `说明：${condition}`)]
		}));
		const total = Math.max(1, Math.ceil(entries.length / perPage));
		const current = numbered ? 1 : Math.min(page, total);
		const sections = entries.slice((current - 1) * perPage, current * perPage);
		await message.send(buildBubble({
			...context,
			title: "天书 · " + selected.stageName,
			sections: sections.length ? sections : [{ lines: ["状态：此境界暂无新增玩法。"] }],
			nav: total > 1 ? {
				current,
				total,
				command: "/天书 " + selected.stageName + " {page}"
			} : void 0,
			footer: [
				back,
				directory,
				...realmHelp(selected.stageName),
				...numbered && page < stages.length ? [{
					label: "下个大境界",
					command: "/天书 " + (page + 1)
				}] : []
			]
		}));
	} catch {
		await message.send(buildBubble({
			...context,
			title: "天书",
			status: "fail",
			sections: [{ lines: ["状态：天书暂时不可用，请稍后重试。"] }]
		}));
	}
});

//#endregion
export { res_default as default };