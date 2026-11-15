import { SDKError } from "../../api/core/error.js";
import { commandText } from "../../utils/commandPrefix.js";
import { markdownButtonLabel } from "../../utils/buttonLabel.js";
import { isPrivateEvent } from "../../utils/privateEvent.js";
import { FormatGui, addOptions, createQuoteMarkdown } from "../../utils/messageHelper.js";
import { section } from "../presentation/sections.js";
import { buildBubble } from "../presentation/bubble.js";
import { resultBubble } from "../presentation/presets.js";
import { createBackendRequestContext } from "../../api/bot/context.js";
import "../presentation/index.js";
import { useMessage as useMessage$1 } from "../../utils/useMessage.js";
import { isActualExplorationPityRulesVersion, mythicDispersionRulesVersion, parseDailyPackFreePreview, parseDailyPackFreeReceipt, parseRelicsOverview, parseSpiritVein, parseTreasureCatalog, parseTreasureConfirmation, parseTreasureDailyPacks, parseTreasureMerchant, parseTreasureOverview, parseTreasureReceipt, treasureMerchantSkus, validTreasureConfirmationRef } from "../../api/bot/treasures.js";
import { selects } from "../config.js";
import { adviceRenderer } from "../feedbackRenderer.js";
import { runRobotBusiness } from "../robotBusiness.js";
import { buildDailyPackProductPage, buildSpiritVeinProductBlock, dailyPackSku } from "../recharge/productView.js";
import { buildTreasureConfirmationView } from "./confirmationView.js";
import { buildOwnedTreasurePage, buildTreasureCatalogPage, buildTreasureDecompositionPage, buildTreasureDetailPage, buildTreasureEffectsPage, buildTreasureFortunePage, rarityNames } from "./treasurePages.js";
import { buildTreasureMerchantPage, treasureMerchantNavigation } from "./treasureMerchantPage.js";
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
function mergeExplorationRewards(rewards) {
	const displayed = [];
	const grouped = /* @__PURE__ */ new Map();
	for (const reward of rewards) {
		const key = `${reward.treasureId}:${reward.kind}`;
		const existing = grouped.get(key);
		if (existing) {
			existing.quantity += reward.quantity;
			existing.autoSynthesized += reward.autoSynthesized;
			existing.newlyOwned ||= reward.newlyOwned;
			existing.fragmentsRemaining = reward.fragmentsRemaining;
		} else {
			const entry = { ...reward };
			grouped.set(key, entry);
			displayed.push(entry);
		}
	}
	return displayed;
}
const explorationStory = (rarity) => {
	if (rarity === 6) return "你踏尽四海八荒，越过星陨之渊，终于抵达天地尽头的遗迹。九重古阵轰然洞开，沉寂万古的道音响彻诸天；赤霞自混沌深处升起，映得星河倒卷，万山俯首。";
	if (rarity === 5) return "你横渡沧海，攀过万仞绝壁，在雷雨中寻到隐于云海的上古仙阙。重重禁制渐次消散，千载不灭的金光破殿而出，照亮了半壁苍穹。";
	if (rarity === 4) return "你越过瘴雾深谷，穿行于残阵与断桥之间。几番惊险之后，终于循着一缕不灭灵光，叩开隐秘洞府；尘封多年的紫气自石匣中缓缓升起。";
	return "你踏过断碑荒径，循着石壁间断续的灵光深入古迹。数度迷途，几番涉险，终于在尘封的石门后，寻见了这一程的机缘。";
};
const treasureID = (value) => {
	if (value === void 0 || !/^\d{3}$/.test(value)) return;
	const id = Number(value);
	return id >= 101 && id <= 606 && id % 100 >= 1 && id % 100 <= 6 ? id : void 0;
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
const relicsFooter = [navigation[0]];
const cultivationCommand = "/宝物 批量培养";
const ownedFooter = [
	{
		label: "效果总览",
		command: "/宝物 效果"
	},
	{
		label: "批量培养",
		command: cultivationCommand
	},
	{
		label: "分解",
		command: "/宝物 分解"
	}
];
function decompositionOrigin(value) {
	const match = /^d([1-6])p([1-9]\d{0,8})$/.exec(value ?? "");
	return match ? {
		rarity: Number(match[1]),
		page: Number(match[2])
	} : void 0;
}
const decompositionReturn = ({ rarity, page }) => `/宝物 分解 品质 ${rarity}${page > 1 ? ` p${page}` : ""}`;
const parentCommands = {
	宝物: "/宝物",
	上古遗珍: "/上古遗珍",
	灵脉租契: "/我的权益 灵脉租契",
	确认宝物: "/宝物",
	确认礼包: "/充值 日礼包"
};
var res_default = onResponse(selects, async (event) => {
	const [message] = useMessage$1();
	const [, next] = useEvent();
	const match = /^\s*[/#＃]?(宝物|上古遗珍|灵脉租契|确认宝物|确认礼包)(?:\s+(.*?))?\s*$/.exec(event.MessageText ?? "");
	const command = match?.[1];
	const args = match?.[2]?.split(/\s+/).filter(Boolean) ?? [];
	let backCommand = command === "宝物" && !args.length ? "/属性面板" : command && (args.length || command.startsWith("确认")) ? parentCommands[command] : void 0;
	let title = command ?? "宝物";
	let content = Format.createMarkdown();
	let operation;
	let originalRef;
	let mutationConfirmed = false;
	let explorationSettled = false;
	let originalFreeRef;
	let dailyClaimConfirmed = false;
	const quote = (lines, buttons = []) => content.addBlockquote(createQuoteMarkdown(lines, manual(buttons)));
	const defaultFooter = command === "宝物" || command === "确认宝物" ? [] : command === "上古遗珍" ? relicsFooter : navigation;
	const send = (footer = defaultFooter, back = backCommand, nav) => {
		const actions = back ? [{
			label: "返回",
			command: back
		}, ...footer.filter((button) => button.command !== back)] : footer;
		const buttons = manual(actions);
		const rows = buttons.length > 4 ? [buttons.slice(0, 4), buttons.slice(4)] : buttons;
		const body = {
			bid: event.UserId,
			isPrivate: isPrivateEvent(event),
			title,
			content,
			nav,
			footer: rows
		};
		return message.send(FormatGui(body));
	};
	const requireSent = (receipts) => {
		if (!receipts.length || receipts.some((receipt) => receipt.code !== ResultCode.Ok)) throw new Error("消息未确认送达");
	};
	const call = async (name, input, decode, request) => {
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
		}), request);
		return response.handled ? void 0 : response.data;
	};
	const preview = async (kind, input = {}, view) => {
		const selectedRarity = typeof input.decomposeRarity === "number" ? input.decomposeRarity : void 0;
		switch (kind) {
			case "upgrade":
			case "promote":
				backCommand = `/宝物 详情 ${input.treasureId}`;
				break;
			case "batch-upgrade":
			case "batch-promote":
				backCommand = cultivationCommand;
				break;
			case "decompose":
				backCommand = view ? decompositionReturn(view) : selectedRarity === void 0 ? "/宝物 分解" : decompositionReturn({
					rarity: selectedRarity,
					page: 1
				});
				break;
			case "merchant-exchange":
				backCommand = "/上古遗珍 秘宝商人";
				break;
			case "select-mythic": backCommand = "/上古遗珍 自选";
		}
		const data = await call("treasures.preview", {
			kind,
			...input,
			...view ? { decompositionView: view } : {}
		}, parseTreasureConfirmation, kind === "merchant-exchange" ? createBackendRequestContext(event, "treasures.preview") : void 0);
		if (!data) return;
		if (!data.summary.length) throw new Error("确认说明暂未取得，请重新预览。");
		if (selectedRarity !== void 0) {
			const plan = data.decomposition;
			if (plan?.rarity !== selectedRarity) {
				title = "分解预览未完成";
				quote(["分解预览与所选品质不一致，请返回本档重新预览。"]);
				await send([]);
				return;
			}
			requireSent(await message.send(buildBubble({
				bid: event.UserId,
				isPrivate: isPrivateEvent(event),
				title: `确认分解 · ${rarityNames[plan.rarity - 1]}`,
				sections: [{
					title: "目标",
					lines: [
						`类型：${rarityNames[plan.rarity - 1]}档满品宝物，包含本档所有分页`,
						`数量：${plan.items.length} 种宝物 · ${number(plan.portions)} 份`,
						...plan.items.map((item) => `物品：${item.name} #${item.id} · ${number(item.quantity)} 份 · ${number(item.amount)} 仙蕴`)
					]
				}, {
					title: "代价",
					lines: [
						`消耗：重复本体 ×${number(plan.duplicates)} · 碎片 ×${number(plan.fragments)}`,
						`结果：预计获得 ${number(plan.xianYun)} 仙蕴`,
						"⚠️ 已激活的主宝物保留。分解后无法撤销。",
						"有效期：24 小时，库存变化后需重新预览。"
					],
					actions: manual([{
						label: "确认分解",
						command: `/确认宝物 ${data.confirmationRef}`
					}])
				}],
				footer: manual([{
					label: "取消并返回",
					command: backCommand ?? "/宝物 分解"
				}]),
				bar: false
			})));
			return;
		}
		originalRef = data.confirmationRef;
		const confirmation = buildTreasureConfirmationView(kind, data, backCommand);
		const relicsConfirmation = kind === "explore" || kind === "select-mythic" || kind === "merchant-exchange";
		title = kind === "merchant-exchange" ? "秘宝商人兑换确认" : kind === "explore" ? "上古遗珍探索确认" : kind === "select-mythic" ? "神话自选确认" : "宝物操作确认";
		content = confirmation.content;
		if (relicsConfirmation || command === "宝物") await send(confirmation.actions, "");
		else {
			addOptions(content, confirmation.actions);
			await send(navigation, "");
		}
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
			if (data.decompositionView) backCommand = decompositionReturn(data.decompositionView);
			if (data.decomposition) {
				const plan = data.decomposition;
				const view = data.decompositionView ?? {
					rarity: plan.rarity,
					page: 1
				};
				backCommand = decompositionReturn(view);
				requireSent(await message.send(resultBubble({
					bid: event.UserId,
					isPrivate: isPrivateEvent(event),
					title: `分解完成 · ${rarityNames[plan.rarity - 1]}`,
					status: "done",
					lines: [
						`结果：已分解 ${plan.items.length} 种宝物的 ${number(plan.portions)} 份库存`,
						`消耗：重复本体 ×${number(plan.duplicates)} · 碎片 ×${number(plan.fragments)}`,
						`物品：仙蕴 +${number(plan.xianYun)}`,
						`说明：操作编号 ${data.operationId}`
					],
					footer: manual([{
						label: `返回${rarityNames[plan.rarity - 1]}分解`,
						command: backCommand
					}, {
						label: "切换品质",
						command: `/宝物 分解 切换品质 ${plan.rarity}${view.page > 1 ? ` p${view.page}` : ""}`
					}])
				})));
				return;
			}
			if (data.kind === "merchant-exchange") {
				title = "秘宝商人兑换完成";
				quote([data.result.message, `操作编号 ${data.operationId}`]);
				requireSent(await send(treasureMerchantNavigation, ""));
				return;
			}
			if (data.kind === "explore" && data.result.rewards) {
				backCommand = "/上古遗珍";
				explorationSettled = true;
				const highestRarity = Math.max(1, ...data.result.rewards.filter((reward) => reward.kind === "body").map((reward) => reward.rarity));
				requireSent(await message.send(FormatGui({
					bid: event.UserId,
					isPrivate: isPrivateEvent(event),
					mention: false,
					title: "上古遗珍",
					content: Format.createMarkdown().addText(explorationStory(highestRarity))
				})));
				await new Promise((resolve) => setTimeout(resolve, 3e3));
				title = "上古遗珍探索完成";
				const unit = data.result.source ? sourceNames[data.result.source] : "";
				const linkedTreasureIds = /* @__PURE__ */ new Set();
				quote([`探索 ${data.result.count}次 · 消耗 ${data.result.paidAmount}${unit} · 宝物经验 +${data.result.experienceGranted}`]);
				for (const r of mergeExplorationRewards(data.result.rewards)) {
					const showDetails = !linkedTreasureIds.has(r.treasureId);
					content.addText(`${r.kind === "body" ? "⭐ " : ""}${r.name} · ${r.kind === "body" ? "本体" : "碎片"} ×${r.quantity}${r.newlyOwned ? " · 已激活" : ""}${showDetails ? " " : ""}`);
					if (showDetails) {
						content.addButton(markdownButtonLabel("查看"), {
							data: commandText(`宝物 详情 ${r.treasureId}`),
							autoEnter: false
						});
						linkedTreasureIds.add(r.treasureId);
					}
					content.addNewline();
					if (r.autoSynthesized) content.addText(`➥ 自动合成${r.autoSynthesized}本体，余片${r.fragmentsRemaining ?? 0}`).addNewline();
					content.addNewline();
				}
				quote([`操作编号 ${data.operationId}`]);
				requireSent(await send(relicsFooter));
				return;
			}
			title = "宝物操作回执";
			if (data.kind === "decompose" && !data.decompositionView) backCommand = "/宝物 分解";
			if (data.kind === "claimLease") backCommand = "/我的权益 灵脉租契";
			if (data.kind === "select-mythic") {
				backCommand = "/上古遗珍 自选";
				title = "神话自选领取完成";
			}
			if ((data.kind === "batch-upgrade" || data.kind === "batch-promote") && data.result.items) {
				backCommand = cultivationCommand;
				quote([`总结果：${data.result.message}`, `总消耗：宝物经验 ${data.result.experienceCost} · 重复本体 ${data.result.duplicatesCost} · 仙蕴 ${data.result.xianYunCost}`]);
				for (const item of data.result.items) quote([`${item.name} · ${data.kind === "batch-upgrade" ? `Lv.${item.fromLevel} → Lv.${item.toLevel}` : `${item.fromGradeName ?? `第${item.fromGrade}品`} → ${item.toGradeName ?? `第${item.toGrade}品`}`}`, `消耗：宝物经验 ${item.experienceCost} · 重复本体 ${item.duplicatesCost} · 仙蕴 ${item.xianYunCost}`], [{
					label: "详情与培养",
					command: `/宝物 详情 ${item.treasureId}`
				}]);
				quote([`操作编号 ${data.operationId}`]);
			} else quote([data.result.message, `操作编号 ${data.operationId}`]);
			if (data.kind === "claimLease") quote([`领取 ${data.result.days}收益日 · 灵晶 +${data.result.spiritCrystal}`]);
			await send(data.kind === "select-mythic" ? relicsFooter : data.kind === "claimLease" ? navigation : []);
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
			if (action === "一键分解") {
				const globalView = decompositionOrigin(args[1]);
				const scopedView = decompositionOrigin(args[3]);
				const rarity = Number(args[2]);
				if (args.length === 1 || args.length === 2 && globalView) await preview("decompose", { allMaxed: true }, globalView);
				else if (args[1] === "品质" && /^[1-6]$/.test(args[2]) && (args.length === 3 || args.length === 4 && scopedView?.rarity === rarity)) await preview("decompose", { decomposeRarity: rarity }, scopedView);
				else {
					quote(["参数错误：/宝物 一键分解 品质 <1-6>。"]);
					await send();
				}
				return;
			}
			if (action === "分解" && args[1] === "切换品质" && /^[1-6]$/.test(args[2]) && (args.length === 3 || args.length === 4 && /^p[1-9]\d{0,8}$/.test(args[3]))) {
				const origin = {
					rarity: Number(args[2]),
					page: Number(args[3]?.slice(1) ?? 1)
				};
				const qualities = manual(rarityNames.map((label, index) => ({
					label,
					command: `/宝物 分解 品质 ${index + 1}`
				})));
				await message.send(buildBubble({
					bid: event.UserId,
					isPrivate: isPrivateEvent(event),
					title: "宝物分解 · 切换品质",
					sections: [{ lines: ["说明：选择要查看的宝物品质。"] }],
					footer: [qualities.slice(0, 3), [...qualities.slice(3), {
						label: "取消并返回",
						command: decompositionReturn(origin),
						autoEnter: false
					}]]
				}));
				return;
			}
			if (action === "分解" && (args.length === 1 || args[1] === "品质")) {
				if (args.length !== 1 && (args.length < 3 || args.length > 4 || !/^[1-6]$/.test(args[2]) || args[3] !== void 0 && !/^p[1-9]\d{0,8}$/.test(args[3]))) {
					quote(["参数错误：/宝物 分解，或 /宝物 分解 品质 <1-6> [pN]。"]);
					await send();
					return;
				}
				const data = await call("treasures.overview", {}, parseTreasureOverview);
				if (data) {
					const page = buildTreasureDecompositionPage(data, {
						rarity: args[1] === "品质" ? Number(args[2]) : void 0,
						page: Number(args[3]?.slice(1) ?? 1)
					});
					title = `宝物分解 · ${rarityNames[page.rarity - 1]}`;
					content = page.content;
					await send([...page.actions, {
						label: "操作记录",
						command: `/宝物 记录 ${page.origin}`
					}], "/宝物", page.nav);
				}
				return;
			}
			if (action === "分解" && args.length > 1) {
				const id = treasureID(args[2]);
				const view = args.length === 5 ? decompositionOrigin(args[3]) : void 0;
				const quantityArg = args.at(-1) ?? "";
				const quantity = Number(quantityArg);
				if (args.length !== 4 && (args.length !== 5 || view?.rarity !== Math.floor((id ?? 0) / 100)) || ![
					"本体",
					"碎片",
					"份数"
				].includes(args[1]) || id === void 0 || !/^\d+$/.test(quantityArg) || !Number.isSafeInteger(quantity) || quantity < 1) {
					quote(["参数错误：/宝物 分解 份数 <编号> <份数>；旧本体|碎片单位仍可使用。"]);
					await send();
					return;
				}
				await preview("decompose", { items: [{
					treasureId: id,
					kind: args[1] === "本体" ? "body" : args[1] === "份数" ? "portion" : "fragment",
					quantity
				}] }, view);
				return;
			}
			if (action === "记录") {
				title = "宝物 · 操作记录";
				const view = decompositionOrigin(args[1]);
				const pageArg = args[view ? 2 : 1];
				backCommand = view ? decompositionReturn(view) : cultivationCommand;
				if (args.length > (view ? 3 : 2) || pageArg !== void 0 && !/^p[1-9]\d{0,8}$/.test(pageArg)) {
					quote(["参数错误：/宝物 记录 [pN]。"]);
					await send();
					return;
				}
				const data = await call("treasures.overview", {}, parseTreasureOverview);
				if (!data) return;
				const size = 5;
				const total = Math.max(1, Math.ceil(data.records.length / size));
				const current = Math.min(total, Number(pageArg?.slice(1) ?? 1));
				const nav = total > 1 ? {
					current,
					total,
					count: data.records.length,
					command: `/宝物 记录${view ? ` ${args[1]}` : ""} p{page}`,
					autoEnter: false
				} : void 0;
				for (const record of data.records.slice((current - 1) * size, current * size)) quote([
					`时间：${record.createdAt}`,
					record.message,
					`说明：操作编号 ${record.operationId}`
				]);
				if (!data.records.length) quote(["暂无宝物操作记录。"]);
				await send([], backCommand, nav);
				return;
			}
			if (action === "批量培养" && args.length === 1) {
				title = "宝物 · 批量培养";
				const data = await call("treasures.overview", {}, parseTreasureOverview);
				if (!data) return;
				const owned = data.items.filter((item) => item.owned);
				const actions = [...owned.some((item) => item.canUpgrade) ? [{
					label: "一键升级",
					command: "/宝物 一键升级"
				}] : [], ...owned.some((item) => item.canPromote) ? [{
					label: "一键突破",
					command: "/宝物 一键突破"
				}] : []];
				content.addBlockquote(section({
					lines: [
						`数量：已激活 ${owned.length} 件宝物`,
						`物品：宝物经验 ${number(data.experience)} · 仙蕴 ${number(data.xianYun)}`,
						actions.length ? "说明：先查看本次培养清单和消耗。" : "状态：当前没有满足培养条件的宝物。"
					],
					actions: manual(actions)
				}));
				await send([{
					label: "操作记录",
					command: "/宝物 记录"
				}]);
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
			const isLegacyCatalog = action === "图鉴";
			const isFiltered = action === "品质";
			const isDetail = action === "详情";
			const isFortune = action === "气运";
			const isEffects = action === "效果" || action === "效果总览";
			const detailRarity = isDetail && args[2] === "品质" ? args[3] ?? "" : void 0;
			const detailPageIndex = detailRarity === void 0 ? 2 : 4;
			const pageArg = isDetail ? args[detailPageIndex] : isFiltered ? args[2] : isLegacyCatalog || isEffects || isFortune ? args[1] : action;
			const validPage = pageArg === void 0 || /^p[1-9]\d{0,8}$/.test(pageArg);
			if (isDetail && (treasureID(args[1]) === void 0 || args.length > detailPageIndex + 1 || !validPage || detailRarity !== void 0 && !/^[1-6]$/.test(detailRarity)) || (isFortune || isEffects) && (args.length > 2 || !validPage) || isFiltered && (args.length < 2 || args.length > 3 || !/^[1-6]$/.test(args[1]) || !validPage) || !isDetail && !isFortune && !isEffects && !isFiltered && (args.length > (isLegacyCatalog ? 2 : 1) || !validPage)) {
				quote(["参数错误：/宝物 [pN]、/宝物 品质 <1-6> [pN]、/宝物 详情 <编号>、/宝物 气运、/宝物 效果。"]);
				await send();
				return;
			}
			if (isFortune) backCommand = pageArg ? `/宝物 效果 ${pageArg}` : "/宝物 效果";
			else if (isDetail) backCommand = [
				"/宝物",
				...detailRarity === void 0 ? [] : ["品质", detailRarity],
				...pageArg ? [pageArg] : []
			].join(" ");
			const data = await call("treasures.overview", {}, parseTreasureOverview);
			if (!data) return;
			if (isDetail) {
				title = "宝物详情";
				const item = data.items.find((item) => item.definition.id === Number(args[1]));
				if (item) showItem(item, data);
				else quote(["未找到该宝物，请返回宝物总览。"]);
				await send();
				return;
			}
			if (isFortune) {
				title = "宝物 · 鸿蒙气运";
				content = buildTreasureFortunePage(data);
				await send();
			} else if (isEffects) {
				title = "宝物 · 效果总览";
				const page = buildTreasureEffectsPage(data, Number(pageArg?.slice(1) ?? 1));
				content = page.content;
				const current = page.nav?.current ?? 1;
				await send([{
					label: "鸿蒙气运",
					command: current > 1 ? `/宝物 气运 p${current}` : "/宝物 气运"
				}], backCommand, page.nav);
			} else {
				title = "我的宝物";
				const page = buildOwnedTreasurePage(data, {
					rarity: isFiltered ? Number(args[1]) : void 0,
					page: Number(pageArg?.slice(1) ?? 1)
				});
				content = page.content;
				await send(ownedFooter, "/属性面板", page.nav);
			}
			return;
		}
		if (command === "上古遗珍") {
			if (args[0] === "秘宝商人" && args.length === 1) {
				const data = await call("treasures.merchant", {}, parseTreasureMerchant);
				if (!data) return;
				title = "秘宝商人";
				content = buildTreasureMerchantPage(data);
				await send(treasureMerchantNavigation, "");
				return;
			}
			if (args[0] === "兑换") {
				const sku = treasureMerchantSkus.find((sku) => sku === args[1]);
				const quantity = Number(args[2]);
				if (args.length !== 3 || !sku || !/^\d+$/.test(args[2] ?? "") || !Number.isSafeInteger(quantity) || quantity < 1) {
					quote(["参数错误，请从秘宝商人的兑换按钮选择商品，并填写正整数数量。"], [{
						label: "秘宝商人",
						command: "/上古遗珍 秘宝商人"
					}]);
					await send();
					return;
				}
				const merchant = await call("treasures.merchant", {}, parseTreasureMerchant);
				if (!merchant) return;
				const product = merchant.products.find((product) => product.sku === sku);
				if (!product || !product.available || quantity > product.maxQuantity) {
					title = "秘宝商人";
					const reason = product?.unavailableReason;
					quote([reason === void 0 || reason.length === 0 ? "本次数量超过当前商品可兑换份数，请核对剩余限购。" : reason]);
					content.absorb(buildTreasureMerchantPage(merchant));
					await send(treasureMerchantNavigation, "");
					return;
				}
				await preview("merchant-exchange", {
					sku,
					quantity,
					expectedUnitPrice: product.unitPrice,
					expectedPeriodKey: product.periodKey
				});
				return;
			}
			if (args[0] === "图鉴") {
				const filtered = args[1] === "品质";
				const pageArgument = filtered ? args[3] : args[1];
				if (!(pageArgument === void 0 || /^p[1-9]\d{0,8}$/.test(pageArgument)) || (filtered ? args.length < 3 || args.length > 4 || !/^[1-6]$/.test(args[2]) : args.length > 2)) {
					quote(["参数错误：/上古遗珍 图鉴，或 /上古遗珍 图鉴 品质 <1-6> [pN]。"]);
					await send();
					return;
				}
				const data = await call("treasures.catalog", {}, parseTreasureCatalog);
				if (data) {
					title = "宝物图鉴";
					const page = buildTreasureCatalogPage(data, filtered ? {
						rarity: Number(args[2]),
						page: Number(pageArgument?.slice(1) ?? 1)
					} : pageArgument === void 0 ? {} : Number(pageArgument.slice(1)));
					content = page.content;
					await send(relicsFooter, backCommand, page.nav);
				}
				return;
			}
			if (args[0] === "领取全包" && args.length === 1) {
				const data = await call("treasures.daily-pack-free-preview", {}, parseDailyPackFreePreview);
				if (!data) return;
				title = "每日礼包领取确认";
				const confirmation = buildTreasureConfirmationView("daily-pack-free", data);
				content = confirmation.content;
				addOptions(content, confirmation.actions);
				await send(navigation, "");
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
			const recordPage = args[0] === "记录" && args.length === 2 && /^p[1-9]\d{0,8}$/.test(args[1]) ? Number(args[1].slice(1)) : void 0;
			if (args.length > 1 && recordPage === void 0 || args.length && ![
				"概率",
				"记录",
				"自选"
			].includes(args[0])) {
				quote(["参数错误：/上古遗珍 [秘宝商人|图鉴|概率|记录|自选]，探索请选灵晶、道晶或藏宝图。"]);
				await send();
				return;
			}
			const data = await call("ancient-relics.overview", {}, parseRelicsOverview);
			if (!data) return;
			let nav;
			if (args[0] === "概率") {
				title = "上古遗珍 · 概率公示";
				const rates = data.wholeRates.filter((rate) => rate.rarity >= 4);
				const byMode = [
					"treasure-v7-v5-shape12-20261029",
					"treasure-v8-first-guards-20261029",
					"treasure-v10-exploration-pity-20261029",
					mythicDispersionRulesVersion
				].includes(data.rulesVersion ?? "");
				const actualPity = isActualExplorationPityRulesVersion(data.rulesVersion);
				const highPity = data.pity.filter((item) => item.rarity >= 4);
				if (![
					"treasure-v5-priority-20261029",
					"treasure-v6-shape12-20261029",
					"treasure-v7-v5-shape12-20261029",
					"treasure-v8-first-guards-20261029",
					"treasure-v9-first-guards-merge-20261029",
					"treasure-v10-exploration-pity-20261029",
					"treasure-v11-mythic-dispersion-20261108"
				].includes(data.rulesVersion ?? "") || rates.length !== 3 || new Set(rates.map((rate) => rate.rarity)).size !== 3 || actualPity && (highPity.length !== 3 || new Set(highPity.map((pity) => pity.rarity)).size !== 3 || highPity.some((pity) => pity.scope !== "actual_exploration" || pity.hardPity < 1 || pity.counter > pity.hardPity + 3)) || rates.some((rate) => rate.probability > 1 || (byMode ? rate.scope !== "all_explorations_by_mode" || rate.tenProbability === void 0 || rate.tenProbability > 1 : rate.scope !== "all_explorations"))) quote(["概率资料未同步，请稍后刷新。"], [{
					label: "刷新",
					command: "/上古遗珍 概率"
				}]);
				else if (!byMode) {
					quote(["综合概率"]);
					for (const rate of rates) quote([`${rate.name} 综合概率 ${probability(rate.probability)}`]);
				} else {
					content.addNewline();
					content.addText("综合概率").addNewline();
					content.addText(`${actualPity ? "非保底基础整品概率" : "单抽出整品概率"}${probability(data.shapeRates.singleComplete)}`).addNewline();
					content.addText(actualPity ? "十连至少一件整品" : "十连至少出一件整品").addNewline();
					if (data.poolVersion === "treasure-36-maxed-v3" || data.poolVersion === "treasure-36-dispersion-v4") content.addText("已满品宝物的抽取概率大幅降低").addNewline();
					if (actualPity) content.addText("保底按实际探索累计").addNewline().addNewline();
					else content.addNewline();
					for (const rate of rates) {
						const counters = data.pity.filter((item) => item.rarity === rate.rarity);
						const pity = counters.length === 1 ? counters[0] : void 0;
						const cap = pity && (data.rulesVersion === "treasure-v11-mythic-dispersion-20261108" ? pity.effectiveHardPity ?? pity.hardPity : pity.hardPity);
						const progress = pity && pity.hardPity > 0 && (actualPity ? pity.counter <= pity.hardPity + 3 : pity.counter < pity.hardPity) ? `保底(${pity.counter}/${cap})${actualPity && cap !== void 0 && pity.counter >= cap ? cap < pity.hardPity ? " · 已达当前保底" : " · 已到保底／高档优先待发" : ""}` : "保底信息暂未同步";
						const tenProbability = rate.tenProbability === void 0 ? "暂未同步" : probability(rate.tenProbability);
						const block = Format.createMarkdown().addBold(rate.name).addNewline().addText(`单抽综合概率 ${probability(rate.probability)}`).addNewline().addText(`十连综合概率 ${tenProbability}`).addNewline().addText(progress);
						content.addBlockquote(block);
					}
				}
			} else if (args[0] === "记录") {
				title = "上古遗珍 · 探索记录";
				const pageSize = 3;
				const total = Math.max(1, Math.ceil(data.records.length / pageSize));
				const current = Math.min(recordPage ?? 1, total);
				if (data.records.length) {
					nav = {
						current,
						total,
						count: data.records.length,
						command: "/上古遗珍 记录 p{page}",
						autoEnter: false
					};
					quote([`数量：近期探索记录 ${data.records.length} 笔`]);
				}
				for (const record of data.records.slice((current - 1) * pageSize, current * pageSize)) quote([
					`时间：${record.createdAt}`,
					`消耗：${record.source === "free" ? "免费探索次数" : `${number(record.paidAmount)}${sourceNames[record.source]}`} · 探索 ${record.count} 次`,
					...mergeExplorationRewards(record.rewards).flatMap((r) => [`${r.name}${r.kind === "body" ? "本体" : "碎片"} ×${r.quantity}${r.newlyOwned ? "；已激活" : ""}`, ...r.autoSynthesized ? [`自动合成${r.autoSynthesized}本体，余片${r.fragmentsRemaining ?? 0}`] : []]),
					`操作编号 ${record.operationId}`
				]);
				if (!data.records.length) quote(["暂无探索记录。"]);
			} else if (args[0] === "自选") {
				title = "上古遗珍 · 神话自选";
				quote([`进度：神话自选 ${data.milestoneProgress}/300`, `待领取：神话自选 ${data.pendingSelections}份`]);
				const treasures = await call("treasures.overview", {}, parseTreasureOverview, createBackendRequestContext(event, "treasures.overview"));
				if (!treasures) return;
				quote(["可选择任一神话，包括已拥有宝物；领取自选不会改变随机探索概率。"]);
				for (const item of treasures.items.filter((item) => item.definition.rarity === 6)) content.addBlockquote(section({
					title: item.definition.name,
					id: item.definition.id,
					lines: [`状态：${item.owned ? item.gradeName : "未拥有"}`],
					actions: data.pendingSelections > 0 ? manual([{
						label: "预览领取",
						command: `/上古遗珍 自选 ${item.definition.id}`
					}]) : []
				}));
			} else {
				const { spiritCrystal, daoCrystal, treasureMaps } = data.balances;
				content.addBlockquote(section({ lines: [
					`物品：灵晶 ${number(spiritCrystal)} · 道晶 ${number(daoCrystal)} · 藏宝图 ${treasureMaps}张`,
					`进度：神话自选 ${data.milestoneProgress}/300`,
					`状态：每日免费探索${data.freeAvailable ? "可用" : "已使用"}`,
					...data.pendingSelections ? [`待领取：神话自选 ${data.pendingSelections}份`] : [],
					`说明：${isActualExplorationPityRulesVersion(data.rulesVersion) ? "非保底基础整品概率" : "单发整品概率"}${probability(data.shapeRates.singleComplete)}，十连至少出一个整品`
				] })).addNewline().addNewline();
				const explorationActions = [...data.freeAvailable ? [{
					label: "每日免费探索",
					command: "/上古遗珍 免费探索"
				}] : [], ...data.pendingSelections ? [{
					label: "选择神话",
					command: "/上古遗珍 自选"
				}] : []];
				for (const button of explorationActions) content.addButton(markdownButtonLabel(button.label), {
					data: commandText(button.command),
					autoEnter: false
				});
				if (explorationActions.length) content.addNewline().addNewline();
				const spiritTenReady = data.spiritTenCost === (data.spiritTenDiscountAvailable ? 6e3 : 12e3);
				const daoTenReady = typeof data.daoTenDiscountAvailable === "boolean" && data.daoTenCost === (data.daoTenDiscountAvailable ? 60 : 108);
				for (const group of [
					{
						name: "灵晶",
						title: !spiritTenReady ? "灵晶探索 · 十连报价暂未取得" : data.spiritTenDiscountAvailable ? "灵晶探索 · 每日首次十连半价" : "灵晶探索 · 今日首十连半价已使用 · 后续原价",
						single: 1200,
						ten: spiritTenReady ? data.spiritTenCost : void 0,
						unavailableReason: void 0
					},
					{
						name: "道晶",
						title: !daoTenReady ? "道晶探索 · 十连报价暂未取得" : data.daoTenDiscountAvailable ? "道晶探索 · 每日首次十连半价" : "道晶探索 · 今日首十连半价已使用 · 后续9折",
						single: 12,
						ten: daoTenReady ? data.daoTenCost : void 0,
						unavailableReason: data.daoTenUnavailableReason
					},
					{
						name: "藏宝图",
						title: "藏宝图探索",
						single: 1,
						ten: 10
					}
				]) {
					content.addText(group.title).addNewline().addNewline();
					const block = Format.createMarkdown();
					for (const [index, option] of [{
						label: "单次探索",
						command: "探索",
						cost: group.single
					}, {
						label: "十连探索",
						command: "十连探索",
						cost: group.ten
					}].entries()) {
						if (index > 0) block.addNewline();
						if (option.cost === void 0 || option.cost <= 0) {
							block.addText(group.unavailableReason ?? "十连报价暂未取得，请刷新后再试。");
							continue;
						}
						block.addButton(markdownButtonLabel(option.label), {
							data: commandText(`上古遗珍 ${option.command} ${group.name}`),
							autoEnter: false
						});
						block.addText(` 消耗${option.cost}${group.name}`);
					}
					content.addBlockquote(block).addNewline();
				}
				await message.send(FormatGui({
					bid: event.UserId,
					isPrivate: isPrivateEvent(event),
					title,
					content,
					footer: [manual([
						navigation[0],
						{
							label: "宝物图鉴",
							command: "/上古遗珍 图鉴"
						},
						{
							label: "概率公示",
							command: "/上古遗珍 概率"
						},
						{
							label: "探索记录",
							command: "/上古遗珍 记录"
						}
					]), manual([
						{
							label: "秘宝商人",
							command: "/上古遗珍 秘宝商人"
						},
						{
							label: "日常活跃",
							command: "/日常活跃"
						},
						{
							label: "每日礼包",
							command: "/充值 日礼包"
						}
					])]
				}));
				return;
			}
			await send(relicsFooter, backCommand, nav);
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
		content.absorb(buildSpiritVeinProductBlock(lease));
		await send();
	} catch (error) {
		logger.error("宝物指令未完成", {
			operation,
			message: error instanceof Error ? error.message : "未知异常",
			...error instanceof SDKError ? {
				code: error.code,
				status: error.status,
				requestId: error.requestId
			} : {}
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