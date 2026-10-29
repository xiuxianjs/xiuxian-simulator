import { markdownButtonLabel } from "../../utils/buttonLabel.js";
import { isPrivateEvent } from "../../utils/privateEvent.js";
import { FormatGui, createQuoteMarkdown } from "../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../utils/useMessage.js";
import { parseDailyPackFreePreview, parseDailyPackFreeReceipt, parseRelicsOverview, parseSpiritVein, parseTreasureConfirmation, parseTreasureDailyPacks, parseTreasureOverview, parseTreasureReceipt, validTreasureConfirmationRef } from "../../api/bot/treasures.js";
import { selects } from "../config.js";
import { adviceRenderer } from "../feedbackRenderer.js";
import { runRobotBusiness } from "../robotBusiness.js";
import { buildDailyPackProductPage, buildSpiritVeinProductBlock, dailyPackSku } from "../recharge/productView.js";
import { buildOwnedTreasurePage, buildTreasureDetailPage, buildTreasureEffectsPage, buildTreasureFortunePage } from "./treasurePages.js";
import { Format, ResultCode, logger, onResponse, setTimeout, useEvent } from "alemonjs";

//#region src/response/treasures/res.ts
const number = (value) => new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 2 }).format(value);
const probability = (value) => `${Number((value * 100).toFixed(3))}%`;
const manual = (buttons) => buttons.map((button) => ({
	...button,
	autoEnter: false
}));
const sources = {
	灵晶: "spirit_crystal",
	道晶: "dao_crystal",
	藏宝图: "treasure_map"
};
const sourceNames = {
	free: "每日免费",
	spirit_crystal: "灵晶",
	dao_crystal: "道晶",
	treasure_map: "藏宝图"
};
const explorationStory = (rarity) => {
	if (rarity === 6) return "你踏尽四海八荒，越过星陨之渊，终于抵达天地尽头的遗迹。九重古阵轰然洞开，沉寂万古的道音响彻诸天；赤霞自混沌深处升起，映得星河倒卷，万山俯首。";
	if (rarity === 5) return "你横渡沧海，攀过万仞绝壁，在雷雨中寻到隐于云海的上古仙阙。重重禁制渐次消散，千载不灭的金光破殿而出，照亮了半壁苍穹。";
	if (rarity === 4) return "你越过瘴雾深谷，穿行于残阵与断桥之间。几番惊险之后，终于循着一缕不灭灵光，叩开隐秘洞府；尘封多年的紫气自石匣中缓缓升起。";
	return "你踏过断碑荒径，循着石壁间断续的灵光深入古迹。数度迷途，几番涉险，终于在尘封的石门后，寻见了这一程的机缘。";
};
const pageSize = 6;
const treasureID = (value) => {
	if (value === void 0 || !/^\d{3}$/.test(value)) return;
	const id = Number(value);
	return id >= 101 && id <= 604 && id % 100 >= 1 && id % 100 <= 4 ? id : void 0;
};
const navigation = [
	{
		label: "宝物",
		command: "/宝物"
	},
	{
		label: "上古遗珍",
		command: "/上古遗珍"
	},
	{
		label: "灵脉租契",
		command: "/充值 灵脉租契"
	}
];
var res_default = onResponse(selects, async (event) => {
	const [message] = useMessage$1();
	const [, next] = useEvent();
	const match = /^\s*[/#＃]?(宝物|上古遗珍|灵脉租契|确认宝物|确认礼包)(?:\s+(.*?))?\s*$/.exec(event.MessageText ?? "");
	const command = match?.[1];
	const args = match?.[2]?.split(/\s+/).filter(Boolean) ?? [];
	let title = command ?? "宝物";
	let content = Format.createMarkdown();
	let operation;
	let originalRef;
	let mutationConfirmed = false;
	let explorationSettled = false;
	let originalFreeRef;
	let dailyClaimConfirmed = false;
	const quote = (lines, buttons = []) => content.addBlockquote(createQuoteMarkdown(lines, manual(buttons)));
	const send = (footer = navigation) => {
		const body = {
			bid: event.UserId,
			isPrivate: isPrivateEvent(event),
			title,
			content,
			footer: manual(footer),
			bar: false
		};
		return message.send(FormatGui(body));
	};
	const requireSent = (receipts) => {
		if (!receipts.length || receipts.some((receipt) => receipt.code !== ResultCode.Ok)) throw new Error("消息未确认送达");
	};
	const call = async (name, input, decode) => {
		operation = name;
		const response = await runRobotBusiness(event, name, input, decode, next, adviceRenderer(async (reply) => {
			title = reply.title || "操作未完成";
			content = Format.createMarkdown();
			quote([
				reply.heading,
				reply.text,
				reply.quote ?? "",
				...reply.rawLines ?? []
			].filter(Boolean), reply.buttons);
			for (const block of reply.blocks ?? []) quote([block.text], block.inlineButtons ?? []);
			for (const tip of reply.advice) quote([tip.description], [{
				label: tip.command,
				command: tip.command
			}]);
			await send();
		}));
		return response.handled ? void 0 : response.data;
	};
	const preview = async (kind, input = {}) => {
		const data = await call("treasures.preview", {
			kind,
			...input
		}, parseTreasureConfirmation);
		if (!data) return;
		if (kind === "explore" && !data.summary.length) throw new Error("探索确认说明暂未取得，请重新预览。");
		originalRef = data.confirmationRef;
		title = kind === "explore" ? "操作确认" : "宝物操作确认";
		quote(kind === "explore" ? [data.summary[0]] : [
			...data.summary,
			`有效至 ${data.expiresAt.replace("T", " ").replace(/\.\d+Z$/, "Z")}`,
			"确认后按本次预览结算；重复确认只返回原操作结果。"
		], [{
			label: "确认",
			command: `/确认宝物 ${data.confirmationRef}`
		}, {
			label: "取消并返回",
			command: kind === "explore" || kind === "select-mythic" ? "/上古遗珍" : kind === "claimLease" ? "/我的权益 灵脉租契" : "/宝物"
		}]);
		await send();
	};
	const showFortune = (data) => {
		const f = data.fortune;
		quote([
			`鸿蒙气运 ${f.level}/${f.maxLevel}级 · 积分 ${number(f.score)}`,
			f.nextThreshold === null ? "已达最高气运等级，积分继续保留" : `下级累计 ${number(f.nextThreshold)} 分 · 还差 ${number(Math.max(0, f.nextThreshold - f.score))} 分`,
			`暴击率 +${f.bonus.critRate}% · 暴伤 +${f.bonus.critDamage}%`,
			`命中率 +${f.bonus.hitRate}% · 闪避率 +${f.bonus.dodgeRate}%`
		]);
	};
	const showItem = (item, data) => {
		content = buildTreasureDetailPage(item, data);
	};
	try {
		if (!isPrivateEvent(event) && (command === "确认礼包" || command === "上古遗珍" && ["礼包", "领取全包"].includes(args[0]))) {
			title = "每日礼包";
			quote(["日礼包仅支持私聊，请在私聊中发送 /充值 日礼包。"]);
			await send([]);
			return;
		}
		if (!command || !match) {
			quote(["参数错误，请使用 /宝物、/上古遗珍 或 /灵脉租契。"]);
			await send();
			return;
		}
		if (command === "确认礼包") {
			if (args.length !== 1 || !validTreasureConfirmationRef(args[0])) {
				quote(["领取确认凭据不完整，请在私聊中重新查看日礼包。"]);
				await send();
				return;
			}
			originalFreeRef = args[0];
			const data = await call("treasures.daily-pack-free-confirm", { confirmationRef: originalFreeRef }, parseDailyPackFreeReceipt);
			if (!data) return;
			dailyClaimConfirmed = true;
			title = "每日礼包领取完成";
			quote([
				data.message,
				`操作编号 ${data.operationId}`,
				`收益归属 ${data.grant.businessDate}`
			]);
			quote([`灵晶 +${data.grant.spiritCrystal} · 道晶 +${data.grant.daoCrystal} · 藏宝图 +${data.grant.treasureMaps}`]);
			for (const fragment of data.grant.fragments) quote([`${fragment.name}碎片 ×${fragment.quantity}`]);
			if (data.grant.promotionTexts.length) quote(data.grant.promotionTexts);
			requireSent(await send());
			return;
		}
		if (command === "确认宝物") {
			if (args.length !== 1 || !validTreasureConfirmationRef(args[0])) {
				quote(["确认凭据不完整或指令超长，请核对原结果后重新预览。"]);
				await send();
				return;
			}
			originalRef = args[0];
			const data = await call("treasures.confirm", { confirmationRef: originalRef }, parseTreasureReceipt);
			if (!data) return;
			mutationConfirmed = true;
			if (data.kind === "explore" && data.result.rewards) {
				explorationSettled = true;
				const highestRarity = Math.max(...data.result.rewards.map((reward) => reward.rarity));
				requireSent(await message.send(FormatGui({
					bid: event.UserId,
					isPrivate: isPrivateEvent(event),
					mention: false,
					title: "上古遗珍",
					content: Format.createMarkdown().addText(explorationStory(highestRarity)),
					bar: false
				})));
				await new Promise((resolve) => setTimeout(resolve, 3e3));
				title = "上古遗珍探索完成";
				quote([`操作编号 ${data.operationId}`]);
				const unit = data.result.source ? sourceNames[data.result.source] : "";
				quote([`探索 ${data.result.count}次 · 消耗 ${data.result.paidAmount}${unit} · 宝物经验 +${data.result.experienceGranted}`]);
				for (const r of data.result.rewards) quote([
					`${r.kind === "body" ? "⭐ " : ""}${r.name} · ${r.kind === "body" ? "本体" : "碎片"} ×${r.quantity}${r.newlyOwned ? " · 已激活" : ""}`,
					...r.autoSynthesized ? [`⭐ 自动合成${r.autoSynthesized}本体，余片${r.fragmentsRemaining ?? 0}；不计直接完整结果。`] : [],
					...r.forcedComplete ? ["本笔十连形态保证"] : []
				], [{
					label: "查看",
					command: `/宝物 详情 ${r.treasureId}`
				}]);
				requireSent(await send());
				return;
			}
			title = "宝物操作回执";
			quote([data.result.message, `操作编号 ${data.operationId}`]);
			if ((data.kind === "batch-upgrade" || data.kind === "batch-promote") && data.result.items) {
				quote([`总消耗：宝物经验 ${data.result.experienceCost} · 重复本体 ${data.result.duplicatesCost} · 仙蕴 ${data.result.xianYunCost}`]);
				for (const item of data.result.items) quote([`${item.name} · ${data.kind === "batch-upgrade" ? `Lv.${item.fromLevel} → Lv.${item.toLevel}` : `${item.fromGradeName ?? `第${item.fromGrade}品`} → ${item.toGradeName ?? `第${item.toGrade}品`}`}`, `消耗：宝物经验 ${item.experienceCost} · 重复本体 ${item.duplicatesCost} · 仙蕴 ${item.xianYunCost}`], [{
					label: "详情与培养",
					command: `/宝物 详情 ${item.treasureId}`
				}]);
			}
			if (data.kind === "claimLease") quote([`领取 ${data.result.days}收益日 · 灵晶 +${data.result.spiritCrystal}`]);
			await send();
			return;
		}
		if (command === "宝物") {
			const action = args[0];
			if (["一键突破", "一键升级"].includes(action) && args.length === 1) {
				await preview(action === "一键突破" ? "batch-promote" : "batch-upgrade");
				return;
			}
			if (action === "合成") {
				quote(["同名碎片每满10枚自动合成，首次本体自动激活，不需要手动合成。"]);
				await send();
				return;
			}
			if (action === "一键分解" && args.length === 1) {
				await preview("decompose", { allMaxed: true });
				return;
			}
			if (action === "分解" && args.length > 1) {
				const id = treasureID(args[2]);
				const quantity = Number(args[3]);
				if (args.length !== 4 || !["本体", "碎片"].includes(args[1]) || id === void 0 || !/^\d+$/.test(args[3]) || !Number.isSafeInteger(quantity) || quantity < 1) {
					quote(["参数错误：/宝物 分解 本体|碎片 <编号> <数量>。"]);
					await send();
					return;
				}
				await preview("decompose", { items: [{
					treasureId: id,
					kind: args[1] === "本体" ? "body" : "fragment",
					quantity
				}] });
				return;
			}
			if ((action === "分解" || action === "记录") && args.length === 1) {
				const data = await call("treasures.overview", {}, parseTreasureOverview);
				if (!data) return;
				if (action === "记录") {
					for (const record of data.records) quote([
						record.createdAt,
						record.message,
						`操作编号 ${record.operationId}`
					]);
					if (!data.records.length) quote(["暂无宝物操作记录。"]);
				} else {
					quote(["主宝物不可分解；只消耗重复本体或余片。仙蕴分解无每日或每周获取上限，确认后不能撤销。", "一键只处理满阶主宝物的重复本体，不处理碎片；未满阶材料须手动指定。"], [{
						label: "一键清单预览",
						command: "/宝物 一键分解"
					}]);
					for (const item of data.items) {
						const rate = data.decompositionValues.find((v) => v.rarity === item.definition.rarity);
						if (!rate) continue;
						for (const kind of ["本体", "碎片"]) {
							const available = kind === "本体" ? item.duplicates : item.fragments;
							if (!available) continue;
							quote([`${item.definition.id} ${item.definition.name} ${kind} · 库存${available} · 每份${kind === "本体" ? rate.bodyXianYun : rate.fragmentXianYun}仙蕴`], [{
								label: "输入数量预览",
								command: `/宝物 分解 ${kind} ${item.definition.id} 1`
							}]);
						}
					}
				}
				await send();
				return;
			}
			if (["升级", "升品"].includes(action)) {
				const id = treasureID(args[1]);
				if (args.length !== 2 || id === void 0) {
					quote(["参数错误：/宝物 升级|升品 <宝物编号>。"]);
					await send();
					return;
				}
				await preview({
					升级: "upgrade",
					升品: "promote"
				}[action], { treasureId: id });
				return;
			}
			const isCatalog = action === "图鉴";
			const isFiltered = action === "品质";
			const pageArg = isFiltered ? args[2] : isCatalog ? args[1] : action;
			const isDetail = action === "详情";
			const isFortune = action === "气运";
			const isEffects = action === "效果" || action === "效果总览";
			const validPage = pageArg === void 0 || /^p[1-9]\d{0,8}$/.test(pageArg);
			if (isDetail && (args.length !== 2 || treasureID(args[1]) === void 0) || isFortune && args.length !== 1 || isEffects && args.length !== 1 || isFiltered && (args.length < 2 || args.length > 3 || !/^[1-6]$/.test(args[1]) || !validPage) || !isDetail && !isFortune && !isEffects && !isFiltered && (args.length > (isCatalog ? 2 : 1) || !validPage)) {
				quote(["参数错误：/宝物 [pN]、/宝物 品质 <1-6> [pN]、/宝物 图鉴 [pN]、/宝物 详情 <编号>、/宝物 气运、/宝物 效果。"]);
				await send();
				return;
			}
			const data = await call("treasures.overview", {}, parseTreasureOverview);
			if (!data) return;
			if (isDetail) {
				const item = data.items.find((item) => item.definition.id === Number(args[1]));
				if (item) showItem(item, data);
				else quote(["未找到该宝物，请查看图鉴。"]);
				await send();
				return;
			}
			if (isFortune || isEffects || !isCatalog) {
				content = isFortune ? buildTreasureFortunePage(data) : isEffects ? buildTreasureEffectsPage(data) : buildOwnedTreasurePage(data, {
					rarity: isFiltered ? Number(args[1]) : void 0,
					page: Number(pageArg?.slice(1) ?? 1)
				});
				await send();
				return;
			}
			showFortune(data);
			if (!isFortune) {
				quote([`宝物经验 ${data.experience} · 仙蕴 ${data.xianYun} · 境界等级上限 ${data.levelCap}`], [
					{
						label: "持有",
						command: "/宝物"
					},
					{
						label: "全部图鉴",
						command: "/宝物 图鉴"
					},
					{
						label: "分解与仙蕴",
						command: "/宝物 分解"
					},
					{
						label: "操作记录",
						command: "/宝物 记录"
					}
				]);
				const all = data.items.filter((item) => isCatalog || item.owned || item.fragments > 0);
				const page = Math.min(Number(pageArg?.slice(1) ?? 1), Math.max(1, Math.ceil(all.length / pageSize)));
				const items = all.slice((page - 1) * pageSize, page * pageSize);
				for (const item of items) quote([`${item.definition.id} [${item.definition.rarityName}] ${item.definition.name}`, item.owned ? `${item.gradeName} · ${item.level}级 · 本体 ${item.duplicates}` : `未拥有 · 碎片 ${item.fragments}/10`], [{
					label: "详情与培养",
					command: `/宝物 详情 ${item.definition.id}`
				}]);
				if (!items.length) quote(["尚无宝物或碎片，可在上古遗珍每日免费探索一次。"]);
				const prefix = isCatalog ? "/宝物 图鉴" : "/宝物";
				quote([`第 ${page}/${Math.max(1, Math.ceil(all.length / pageSize))} 页`], [...page > 1 ? [{
					label: "上一页",
					command: `${prefix} p${page - 1}`
				}] : [], ...page * pageSize < all.length ? [{
					label: "下一页",
					command: `${prefix} p${page + 1}`
				}] : []]);
			}
			await send();
			return;
		}
		if (command === "上古遗珍") {
			if (args[0] === "领取全包" && args.length === 1) {
				const data = await call("treasures.daily-pack-free-preview", {}, parseDailyPackFreePreview);
				if (!data) return;
				title = "每日礼包领取确认";
				quote([...data.summary, `有效至 ${data.expiresAt.replace("T", " ")}`], [{
					label: "确认",
					command: `/确认礼包 ${data.confirmationRef}`
				}, {
					label: "取消并返回",
					command: "/充值 日礼包 30元全包"
				}]);
				await send();
				return;
			}
			if (args[0] === "礼包" && args.length <= 2) {
				const data = await call("treasures.daily-packs", {}, parseTreasureDailyPacks);
				if (!data) return;
				title = "每日礼包";
				content = buildDailyPackProductPage(data, dailyPackSku(args[1]));
				await send();
				return;
			}
			if (args[0] === "周活" && args.length === 1) {
				quote(["五个周活门槛领取后额外得到2／3／5／5／5张藏宝图。原档奖励保留，本周已领取原奖励但未发图可在周活入口补领。"], [{
					label: "查看周活与补图",
					command: "/周常活跃"
				}]);
				await send();
				return;
			}
			if (args[0] === "免费探索" && args.length === 1) {
				await preview("explore", {
					source: "free",
					count: 1
				});
				return;
			}
			if (["探索", "十连探索"].includes(args[0]) && args.length === 2 && sources[args[1]]) {
				await preview("explore", {
					source: sources[args[1]],
					count: args[0] === "探索" ? 1 : 10
				});
				return;
			}
			if (args[0] === "自选" && args.length === 2 && treasureID(args[1]) !== void 0 && Number(args[1]) >= 601) {
				await preview("select-mythic", { treasureId: Number(args[1]) });
				return;
			}
			if (args.length > 1 || args.length && ![
				"概率",
				"记录",
				"自选"
			].includes(args[0])) {
				quote(["参数错误：/上古遗珍 [概率|记录|自选]，探索请选灵晶、道晶或藏宝图。"]);
				await send();
				return;
			}
			const data = await call("ancient-relics.overview", {}, parseRelicsOverview);
			if (!data) return;
			if (args.length) quote([`累计探索 ${data.totalExplorations}次 · 本轮 ${data.milestoneProgress}/300`, `可领取神话自选 ${data.pendingSelections}份 · 每300次额外获得一份`]);
			if (args[0] === "概率") {
				for (const pity of data.pity) {
					const exactName = [
						"普通",
						"优秀",
						"精良",
						"稀有",
						"史诗",
						"神话"
					][pity.rarity - 1];
					quote([`${pity.name}保底 ${pity.counter}/${pity.hardPity}次直接完整结果`, `下一次完整结果恰好${exactName}概率 ${probability(pity.nextProbability)}`]);
				}
				quote([`单次直接完整率${probability(data.shapeRates.singleComplete)}`, `每笔十连期望直接完整${number(data.shapeRates.tenExpectedComplete)}件，平均每个子探索${probability(data.shapeRates.tenAverageComplete)}`]);
				for (const rate of data.wholeRates) quote([
					`${rate.name}完整池内综合概率 ${probability(rate.probability)}`,
					`单次探索直出${probability(rate.probability * data.shapeRates.singleComplete)}`,
					`十连子探索平均直出${probability(rate.probability * data.shapeRates.tenAverageComplete)}`
				]);
				quote(data.rules);
			} else if (args[0] === "记录") {
				for (const record of data.records.slice(0, 10)) quote([
					`${record.createdAt} · ${sourceNames[record.source]}探索 ${record.count}次 · 消耗 ${record.paidAmount}`,
					...record.rewards.flatMap((r) => [`${r.name}${r.kind === "body" ? "直接完整本体" : "碎片"} ×${r.quantity}${r.newlyOwned ? "；已激活" : ""}`, ...r.autoSynthesized ? [`自动合成${r.autoSynthesized}本体，余片${r.fragmentsRemaining ?? 0}；不计直接完整结果。`] : []]),
					`操作编号 ${record.operationId}`
				]);
				if (!data.records.length) quote(["暂无探索记录。"]);
			} else if (args[0] === "自选") {
				const treasures = await call("treasures.overview", {}, parseTreasureOverview);
				if (!treasures) return;
				quote(["可选择任一神话，包括已拥有宝物；领取自选不会改变随机探索概率。"]);
				for (const item of treasures.items.filter((item) => item.definition.rarity === 6)) quote([`${item.definition.id} ${item.definition.name} · ${item.owned ? item.gradeName : "未拥有"}`], data.pendingSelections > 0 ? [{
					label: "预览领取",
					command: `/上古遗珍 自选 ${item.definition.id}`
				}] : []);
			} else {
				for (const row of [[{
					label: "概率公示",
					command: "/上古遗珍 概率"
				}, {
					label: "探索记录",
					command: "/上古遗珍 记录"
				}], [{
					label: "周活藏宝图",
					command: "/上古遗珍 周活"
				}, {
					label: "每日礼包",
					command: "/充值 日礼包"
				}]]) {
					for (const button of row) content.addButton(markdownButtonLabel(button.label), {
						data: button.command,
						autoEnter: false
					});
					content.addNewline();
				}
				quote([`累计探索 ${data.totalExplorations}次 · 本轮 ${data.milestoneProgress}/300`]);
				if (data.pendingSelections) quote([`神话自选待领取 ${data.pendingSelections}份`], [{
					label: "选择神话",
					command: "/上古遗珍 自选"
				}]);
				if (data.freeAvailable) content.addButton(markdownButtonLabel("每日免费探索"), {
					data: "/上古遗珍 免费探索",
					autoEnter: false
				});
				else content.addText("每日免费探索：已使用");
				content.addNewline();
				for (const group of [
					{
						name: "灵晶",
						title: data.spiritTenDiscountAvailable ? "灵晶探索 · 每日首发9折" : "灵晶探索 · 今日首发9折已使用，十连原价",
						single: 1200,
						ten: data.spiritTenDiscountAvailable ? 10800 : 12e3
					},
					{
						name: "道晶",
						title: "道晶探索 · 十连9折",
						single: 12,
						ten: 108
					},
					{
						name: "藏宝图",
						title: "藏宝图探索",
						single: 1,
						ten: 10
					}
				]) {
					const block = Format.createMarkdown().addText(group.title);
					for (const option of [{
						label: "单次探索",
						command: "探索",
						cost: group.single
					}, {
						label: "十连探索",
						command: "十连探索",
						cost: group.ten
					}]) {
						block.addNewline().addButton(markdownButtonLabel(option.label), {
							data: `/上古遗珍 ${option.command} ${group.name}`,
							autoEnter: false
						});
						block.addText(` 消耗${option.cost}${group.name}`);
					}
					content.addBlockquote(block);
				}
				quote(["当前账户", `灵晶 ${number(data.balances.spiritCrystal)} · 道晶 ${number(data.balances.daoCrystal)} · 藏宝图 ${data.balances.treasureMaps}张`]);
				await send(navigation.slice(0, 2));
				return;
			}
			await send();
			return;
		}
		if (args.length === 1 && args[0] === "领取") {
			await preview("claimLease");
			return;
		}
		if (args.length) {
			quote(["参数错误：/灵脉租契 或 /灵脉租契 领取。"]);
			await send();
			return;
		}
		const lease = await call("spirit-vein.overview", {}, parseSpiritVein);
		if (!lease) return;
		quote([
			lease.active ? `生效中 · 剩余 ${lease.remainingDays}收益日` : "当前未生效",
			...lease.endDate ? [`权益截止 ${lease.endDate}`] : [],
			`可领取 ${lease.claimableDays}收益日 · ${lease.claimableCrystal}灵晶`,
			`续订延长收益日，每日金额不叠加；最多预存 ${lease.maxDays}日。`,
			...lease.purchaseUnavailableReason ? [lease.purchaseUnavailableReason] : []
		], [...lease.claimableDays > 0 ? [{
			label: "预览领取",
			command: "/灵脉租契 领取"
		}] : [], {
			label: "我的订单",
			command: "/我的订单"
		}]);
		content.addBlockquote(buildSpiritVeinProductBlock(lease));
		await send();
	} catch (error) {
		logger.error("宝物指令未完成", {
			operation,
			message: error instanceof Error ? error.message : "未知异常"
		});
		content = Format.createMarkdown();
		if (originalFreeRef) {
			quote([dailyClaimConfirmed ? "礼包已领取，消息未确认送达。请重试原确认恢复展示。" : "领取结果尚未确认，请重试原确认，不要重新领取。"], [{
				label: "核对并重试原领取",
				command: `/确认礼包 ${originalFreeRef}`
			}]);
			await send();
			return;
		}
		quote([explorationSettled ? "探索已结算，消息未确认送达。请核对并重试原操作恢复展示，不要重新探索。" : mutationConfirmed ? "回执已确认，展示异常。请查询宝物、探索记录或租契领取状态。" : originalRef && operation === "treasures.confirm" ? "操作结果尚未获完整确认，请重试原确认；不要另开一次探索或培养。" : "暂未取得完整预览或数据，请刷新；未自动提交新的培养或探索。"], (explorationSettled || !mutationConfirmed) && originalRef && operation === "treasures.confirm" ? [{
			label: "核对并重试原操作",
			command: `/确认宝物 ${originalRef}`
		}] : []);
		await send();
	}
});

//#endregion
export { res_default as default };