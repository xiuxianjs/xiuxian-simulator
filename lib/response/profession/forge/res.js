import { FormatGui, createQuoteMarkdown } from "../../../utils/messageHelper.js";
import { formatGameTime } from "../../../utils/gameTime.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { withBusinessRecovery } from "../../businessRecovery.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { parseForgeHistory, parseForgeOrder, parseForgeOrderPreview, parseForgeOrders, parseForgeOverview, parseForgePreview, parseForgeResult } from "../../../api/schemas/forge.js";
import { forgeCatalogCommand, forgeRecipesForFilter, parseForgeCatalogArguments } from "./catalog.js";
import { Format, logger, onResponse, useEvent } from "alemonjs";

//#region src/response/profession/forge/res.ts
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const [, next] = useEvent();
	const [command, ...rest] = e.MessageText.trim().replace(/^[!！/#＃]/, "").split(/\s+/);
	const arg = rest.join(" ");
	const catalogQuery = command === "锻造图纸" ? parseForgeCatalogArguments(rest) : null;
	const content = Format.createMarkdown();
	let title = "锻造师";
	const orderCommand = command.includes("委托");
	const header = [
		{
			label: "工具",
			command: "/储物袋 天工"
		},
		{
			label: "切换工具",
			command: "/替换"
		},
		{
			label: "装备",
			command: "/储物袋 装备"
		}
	];
	const base = {
		bid: e.UserId,
		isPrivate: e.isPrivate ?? false
	};
	let pageHeader = command === "我的锻造" ? header : void 0;
	let nav;
	let footer = orderCommand ? [{
		label: "委托",
		command: "/锻造委托"
	}, {
		label: "锻造",
		command: "/我的锻造"
	}] : command === "我的锻造" ? [
		{
			label: "图纸",
			command: "/锻造图纸"
		},
		{
			label: "作品",
			command: "/锻造作品"
		},
		{
			label: "委托",
			command: "/锻造委托"
		},
		{
			label: "指引",
			command: "/锻造指引"
		}
	] : [{
		label: "图纸",
		command: "/锻造图纸"
	}, {
		label: "锻造",
		command: "/我的锻造"
	}];
	const send = () => message.send(FormatGui({
		...base,
		title,
		header: pageHeader,
		content,
		nav,
		footer
	}));
	const feedback = async (reply) => {
		await message.send(FormatGui({
			...base,
			title: reply.title,
			content: Format.createMarkdown().addBlockquote(createQuoteMarkdown([reply.text], orderCommand ? [{
				label: "查看委托",
				command: "/锻造委托"
			}] : [{
				label: "查看图纸",
				command: "/锻造图纸"
			}, {
				label: "我的锻造",
				command: "/我的锻造"
			}]))
		}));
	};
	function showResult(r, owned = true, record = false, commissioned = false) {
		content.addBlockquote(createQuoteMarkdown([
			`${r.name}${record || r.replayed ? " · 制作记录" : " · 打造完成"}`,
			...r.comparisons.filter((a) => a.value !== 0 || a.current !== 0).map((a) => `${a.name}：${a.value}${a.unit}${a.delta === 0 ? "" : `（${a.delta > 0 ? "+" : ""}${a.delta}${a.unit}）`}`),
			`对比：${r.currentEquipment}（制作时）`,
			`署名：${r.crafter}${r.equipment.permission & 2 ? " · 可交易" : " · 不可交易"}`
		], owned ? record || r.replayed ? [{
			label: "查看装备",
			command: "/储物袋 装备"
		}] : r.canEquip ? [{
			label: "装备",
			command: `/装备 ${r.equipment.id}`
		}] : [{
			label: "查看装备",
			command: "/储物袋 装备"
		}] : []));
		const costs = [...!commissioned ? [r.tutorial ? "免费教学 · 经验 +0" : `消耗：灵石 ${r.spiritStoneCost}`, ...!r.tutorial ? r.materials.map((m) => `${m.name} ×${m.required}`) : []] : [], ...!r.tutorial && (!commissioned || r.crafterId === e.uid) ? [`经验 +${r.expGained}${r.assessmentNew ? " · 首次考核完成 ✓" : ""}`] : []];
		if (costs.length) content.addBlockquote(createQuoteMarkdown(costs));
		if (r.tutorialTool) {
			const tool = r.tutorialTool;
			content.addBlockquote(createQuoteMarkdown([`${record || r.replayed ? "入门赠礼" : "获得工具"}：${tool.name} · ${tool.grade} · 绑定`, ...record || r.replayed ? [] : [tool.equipped ? "已启用" : "已存入天工背包"]], [{
				label: "查看工具",
				command: "/储物袋 天工"
			}, {
				label: "查看图纸",
				command: "/锻造图纸"
			}]));
		}
	}
	function showOrder(o, page) {
		const status = o.refundPending ? "已到期，待退款" : {
			pending: "待接单",
			delivered: "已交付",
			cancelled: "已取消并退款",
			expired: "已到期并退款"
		}[o.status];
		const summary = page !== void 0;
		const refunded = o.status === "cancelled" || o.status === "expired";
		const owner = o.ownerId === e.uid;
		content.addBlockquote(createQuoteMarkdown([
			`委托 ${o.id} · ${o.name} · ${status}`,
			owner ? `匠师：${o.crafterName}（${o.crafterId}）` : `委托者：${o.ownerName}（${o.ownerId}）`,
			refunded ? `${owner ? "已退回" : "已退回委托者"}：灵石 ${o.spiritStoneCost + o.fee}` : owner ? `${o.status === "delivered" ? "已支付" : "托管"}：灵石 ${o.spiritStoneCost + o.fee}（制作 ${o.spiritStoneCost} · 工费 ${o.fee}）` : `${o.status === "delivered" ? "获得工费" : "工费"}：灵石 ${o.fee}`,
			...!summary && o.status === "pending" ? [`到期：${formatGameTime(o.expiresAt * 1e3, "YYYY-MM-DD HH:mm")}`] : [],
			...!summary ? o.materials.map((m) => `${refunded ? "已退回" : o.status === "delivered" ? "已消耗" : "托管"}：${m.name} ×${m.required}`) : []
		], [
			...summary ? [{
				label: "详情",
				command: `/锻造委托详情 ${o.id} ${page}`
			}] : [],
			...!summary && o.canAccept ? [{
				label: "接单并交付",
				command: `/接取锻造委托 ${o.id}`
			}] : [],
			...!summary && o.canCancel ? [{
				label: o.refundPending ? "领取退款" : "取消并退款",
				command: `/取消锻造委托 ${o.id}`
			}] : [],
			...!summary && owner && o.result ? [{
				label: "查看装备",
				command: "/储物袋 装备"
			}] : []
		]));
		if (o.result && !summary) showResult(o.result, false, true, true);
	}
	function showRecipe(r, summary = false, origin = {
		filter: "全部",
		page: 1
	}) {
		if (!summary) footer = [{
			label: "返回图纸",
			command: forgeCatalogCommand(origin)
		}];
		const recovery = !summary && !r.canCraft ? withBusinessRecovery("forge.preview", {
			title: "",
			heading: "",
			text: r.reason,
			buttons: [],
			advice: []
		}).advice : [];
		content.addBlockquote(createQuoteMarkdown([
			`【${r.id}】${r.name} · ${r.grade} · ${r.type}`,
			`灵石 ${r.spiritStoneCost}${summary ? ` · 材料 ${r.materials.length} 种` : ""}`,
			...!summary ? [
				...r.attributes.filter((a) => a.max > 0).map((a) => `${a.name}：${a.min}～${a.max}${a.unit}`),
				`穿戴：${r.requiredRealm}${r.canEquip ? " ✓" : " · 未满足"} · ${r.tradeable ? "可交易" : "不可交易"}`,
				`锻造等级：${r.craftRequiredLevel ?? r.requiredLevel}${r.learned ? "" : " · 未学习"}`,
				...r.earlyCraft ? [`武器可提前制造 · 配方归属${r.requiredLevel}阶，穿戴门槛不变`] : [],
				...r.toolType ? [`工具：${r.toolType} · 品阶 ≥ ${r.toolGrade}`] : [],
				...r.materials.flatMap((m) => [`${m.name}：${m.available}/${m.required}${m.listed ? ` · 上架 ${m.listed}` : ""}${m.locked ? " · 已锁定" : ""}`, ...m.available < m.required && m.source ? [`来源：${m.source}`] : []])
			] : [],
			...r.assessment ? [r.completed ? "考核已完成 ✓" : "◇ 考核图纸"] : [],
			...r.reason ? [`🔒 ${r.reason}`] : [],
			...recovery.map((tip) => tip.description)
		], [
			...r.canCraft ? [{
				label: "打造",
				command: `/打造 ${r.id}`
			}] : [],
			...recovery.map((tip) => ({
				label: tip.command,
				command: tip.command
			})),
			...!summary && r.toolType && !r.canCraft && /缺少符合品阶的|缺少约定的锻造工具/.test(r.reason) ? [
				{
					label: "工具",
					command: "/储物袋 天工"
				},
				{
					label: "切换工具",
					command: "/替换"
				},
				{
					label: "工具交易",
					command: "/珍宝楼 筛选 天工 价格升序 1"
				}
			] : [],
			...summary ? [{
				label: "详情",
				command: `/锻造图纸详情 ${r.id} ${origin.filter} ${origin.page}`
			}] : []
		]));
	}
	function showOverview(v, query, compact = false) {
		if (!v.available) {
			content.addBlockquote(createQuoteMarkdown([v.reason.length ? v.reason : "当前锻造暂不可用"], [{
				label: "查看职业",
				command: "/我的职业"
			}]));
			return;
		}
		if (!query) {
			const reason = !v.joined && !v.canJoin ? `境界不足，需要达到${v.entryRealm}` : v.joined && !v.canAdvance ? v.advanceReason : "";
			const recovery = reason ? withBusinessRecovery("forge.advance", {
				title: "",
				heading: "",
				text: reason,
				buttons: [],
				advice: []
			}).advice : [];
			content.addBlockquote(createQuoteMarkdown(v.joined ? [
				`${v.title} · 等级 ${v.level}`,
				...v.nextTitle ? [`经验：${v.exp}/${v.expRequired}`, `考核：${v.assessmentDone}/${v.assessmentRequired}`] : ["已达最高阶段"],
				...v.canAdvance ? [`可晋升：${v.nextTitle}`] : v.nextTitle && v.advanceReason ? [v.advanceReason] : []
			] : [`入门境界：${v.entryRealm}${v.canJoin ? " ✓" : " · 未满足"}`, "免费教学 · 首件署名装备"], v.joined ? [...v.canAdvance ? [{
				label: "确认晋升",
				command: `/锻造进阶 ${v.level}`
			}] : [], ...v.recipes.some((r) => !r.learned && (r.craftRequiredLevel ?? r.requiredLevel) <= v.level) ? [{
				label: "学习图纸",
				command: "/学习锻造图纸"
			}] : []] : v.canJoin ? [{
				label: "免费入门",
				command: "/加入锻造师"
			}] : []));
			if (recovery.length) content.addBlockquote(createQuoteMarkdown(recovery.map((tip) => tip.description), recovery.map((tip) => ({
				label: tip.command,
				command: tip.command
			}))));
			if (compact) return;
			const ready = forgeRecipesForFilter(v, "可制作").length;
			const candidates = forgeRecipesForFilter(v, "考核").length;
			content.addBlockquote(createQuoteMarkdown([], [
				{
					label: `待考核 ${candidates}`,
					command: "/锻造图纸 考核"
				},
				{
					label: `可制作 ${ready}`,
					command: "/锻造图纸 可制作"
				},
				{
					label: "职业总览",
					command: "/我的职业"
				}
			]));
			return;
		}
		const { filter, page } = query;
		title = `锻造图纸 · ${filter === "考核" ? "待考核" : filter}`;
		pageHeader = [
			{
				label: "全部",
				selected: filter === "全部",
				command: "/锻造图纸"
			},
			{
				label: "待考核",
				selected: filter === "考核",
				command: "/锻造图纸 考核"
			},
			{
				label: "可制作",
				selected: filter === "可制作",
				command: "/锻造图纸 可制作"
			}
		];
		const recipes = forgeRecipesForFilter(v, filter);
		const totalPages = Math.max(1, Math.ceil(recipes.length / 5));
		if (page > totalPages) {
			content.addText(`没有第 ${page} 页图纸，共 ${totalPages} 页。`);
			return;
		}
		recipes.slice((page - 1) * 5, page * 5).forEach((r) => showRecipe(r, true, query));
		if (!recipes.length) content.addText(filter === "考核" ? v.joined ? "暂无待考核图纸" : "尚未入门" : filter === "可制作" ? "暂无可打造图纸" : "暂无图纸");
		nav = {
			current: page,
			total: totalPages,
			count: recipes.length,
			command: forgeCatalogCommand({
				filter,
				page
			}).replace(/\d+$/, "{page}")
		};
	}
	function showPreview(p) {
		title = "锻造预览";
		if ([...`/确认打造 ${p.token}`].length > 80) {
			content.addText("锻造确认服务暂不可用，请稍后重新预览。");
			return;
		}
		content.addBlockquote(createQuoteMarkdown([
			`${p.recipe.name} · ${p.tutorial || !p.recipe.tradeable ? "不可交易" : "可交易"}`,
			...p.recipe.attributes.filter((a) => a.max > 0).map((a) => `${a.name}：${a.min}～${a.max}${a.unit}`),
			p.tutorial ? "免费教学 · 经验 +0" : `消耗：灵石 ${p.recipe.spiritStoneCost}`,
			...!p.tutorial ? p.recipe.materials.map((m) => `${m.name} ×${m.required}（可用 ${m.available}）`) : [],
			...p.tutorialTool ? [`赠送：${p.tutorialTool.name} · ${p.tutorialTool.grade} · 绑定`] : [],
			...!p.tutorial ? [`经验 +${p.expGained}${p.assessmentNew ? " · 首次考核" : ""}`] : [],
			`穿戴：${p.recipe.requiredRealm}${p.recipe.canEquip ? " ✓" : " · 未满足"}`
		], [{
			label: "确认打造",
			command: `/确认打造 ${p.token}`
		}]));
	}
	try {
		if (command === "锻造指引") {
			title = "锻造指引";
			content.addBlockquote(createQuoteMarkdown(["亲手打造", "本阶图纸获得经验 · 不同考核图纸推进考核"], [
				{
					label: "我的锻造",
					command: "/我的锻造"
				},
				{
					label: "选图纸",
					command: "/锻造图纸"
				},
				...header.slice(0, 2),
				{
					label: "工具交易",
					command: "/珍宝楼 筛选 天工 价格升序 1"
				}
			]));
			content.addBlockquote(createQuoteMarkdown([
				"委托代工",
				"/委托锻造 匠师编号 图纸编号 灵石工费",
				"装备归委托者 · 工费与成长归匠师",
				"接单前可取消退款"
			], [{
				label: "查委托",
				command: "/锻造委托"
			}, {
				label: "我的编号",
				command: "/我的编号"
			}]));
			await send();
			return;
		}
		if (command === "锻造图纸详情" || command === "锻造委托详情" || command === "锻造作品详情") {
			const id = Number(rest[0]);
			const page = Number(rest[1]);
			const recipeDetail = command === "锻造图纸详情";
			const recipeQuery = recipeDetail ? parseForgeCatalogArguments(rest.slice(1)) : null;
			if (!Number.isSafeInteger(id) || id < 1 || (recipeDetail ? !recipeQuery || rest.length !== 1 && rest.length !== 3 : rest.length !== 2) || !recipeDetail && (!Number.isSafeInteger(page) || page < 1 || page > 1e5)) {
				content.addText("请从列表选择作品、图纸或委托。");
				await send();
				return;
			}
			if (recipeDetail) {
				const response = await runRobotBusiness(e, "forge.overview", {}, parseForgeOverview, next, feedback);
				if (response.handled) return;
				title = "图纸详情";
				const recipe = response.data.recipes.find((r) => r.id === id);
				if (recipe) showRecipe(recipe, false, recipeQuery ?? void 0);
				else content.addText("图纸暂不可查看");
			} else if (command === "锻造委托详情") {
				const response = await runRobotBusiness(e, "forge.orders", { page }, parseForgeOrders, next, feedback);
				if (response.handled) return;
				title = "委托详情";
				footer = [{
					label: "返回委托",
					command: `/锻造委托 ${page}`
				}];
				const order = response.data.items.find((o) => o.id === id);
				if (order) showOrder(order);
				else content.addText("委托列表已更新，请重新查看。");
			} else {
				const response = await runRobotBusiness(e, "forge.history", { page }, parseForgeHistory, next, feedback);
				if (response.handled) return;
				title = "作品详情";
				footer = [{
					label: "返回作品",
					command: `/锻造作品 ${page}`
				}];
				const item = response.data.items.find((item) => item.result.craftId === id);
				if (item) {
					showResult(item.result, item.owned && item.exists, true, item.result.equipment.userId !== item.result.crafterId);
					if (!item.exists || !item.owned) content.addText(!item.exists ? "装备已不存在" : "装备当前不属于你");
				} else content.addText("作品列表已更新，请重新查看。");
			}
			await send();
			return;
		}
		if (command === "锻造图纸" && !catalogQuery) {
			content.addText("请使用 /锻造图纸 [全部|考核|可制作] [正整数页码]");
			await send();
			return;
		}
		if ((command === "确认打造" || command === "确认锻造委托") && (rest.length !== 1 || !arg)) {
			content.addText("请重新选择图纸或委托，生成预览。");
			await send();
			return;
		}
		if (command === "委托锻造") {
			const [crafterId, recipeId, fee] = rest.map(Number);
			if (rest.length !== 3 || ![
				crafterId,
				recipeId,
				fee
			].every(Number.isSafeInteger) || crafterId <= 0 || recipeId <= 0 || fee < 0) {
				content.addText("请使用 /委托锻造 匠师编号 图纸编号 灵石工费");
				await send();
				return;
			}
			const response = await runRobotBusiness(e, "forge.order-preview", {
				crafterId,
				recipeId,
				fee
			}, parseForgeOrderPreview, next, feedback);
			if (response.handled) return;
			const p = response.data;
			title = "委托预览";
			if ([...`/确认锻造委托 ${p.token}`].length > 80) {
				content.addText("锻造确认服务暂不可用，请稍后重新预览。");
				await send();
				return;
			}
			content.addBlockquote(createQuoteMarkdown([
				`${p.recipe.equipment.name} · ${p.recipe.tradeable ? "可交易" : "不可交易"}`,
				`匠师：${p.crafterName}（${p.crafterId}）`,
				...p.recipe.attributes.filter((a) => a.max > 0).map((a) => `${a.name}：${a.min}～${a.max}${a.unit}`),
				`穿戴：${p.recipe.requiredRealm}${p.recipe.canEquip ? " ✓" : " · 未满足"}`,
				`托管：灵石 ${p.recipe.spiritStoneCost + p.fee}（制作 ${p.recipe.spiritStoneCost} · 工费 ${p.fee}）`,
				...p.recipe.materials.map((m) => `${m.name} ×${m.required}（可用 ${m.available}）`),
				`委托有效期：${p.lifetimeSeconds / 3600} 小时`,
				"接单前可取消退款"
			], [{
				label: "确认委托",
				command: `/确认锻造委托 ${p.token}`
			}]));
		} else if (command === "确认锻造委托" || command === "接取锻造委托" || command === "取消锻造委托") {
			const orderId = Number(arg);
			if (command !== "确认锻造委托" && (!Number.isSafeInteger(orderId) || orderId <= 0)) {
				content.addText("请指定委托编号。");
				await send();
				return;
			}
			const response = await runRobotBusiness(e, command === "确认锻造委托" ? "forge.order-create" : command === "接取锻造委托" ? "forge.order-accept" : "forge.order-cancel", command === "确认锻造委托" ? { token: arg } : { orderId }, parseForgeOrder, next, feedback);
			if (response.handled) return;
			title = "锻造委托";
			showOrder(response.data);
		} else if (command === "锻造委托") {
			const page = arg ? Number(arg) : 1;
			if (!Number.isSafeInteger(page) || page < 1) {
				content.addText("请指定正整数页码。");
				await send();
				return;
			}
			const response = await runRobotBusiness(e, "forge.orders", { page }, parseForgeOrders, next, feedback);
			if (response.handled) return;
			const data = response.data;
			title = "锻造委托";
			data.items.forEach((o) => showOrder(o, data.page));
			if (!data.items.length) content.addText("暂无委托");
			content.addBlockquote(createQuoteMarkdown([`第 ${data.page} 页`], [...data.page > 1 ? [{
				label: "上一页",
				command: `/锻造委托 ${data.page - 1}`
			}] : [], ...data.hasMore ? [{
				label: "下一页",
				command: `/锻造委托 ${data.page + 1}`
			}] : []]));
		} else if (command === "加入锻造师" || command === "打造") {
			const recipeId = Number(arg);
			if (command === "打造" && (!Number.isSafeInteger(recipeId) || recipeId <= 0)) {
				content.addText("请使用 /打造 图纸编号，或查看 /锻造图纸");
				await send();
				return;
			}
			const response = await runRobotBusiness(e, "forge.preview", {
				tutorial: command === "加入锻造师",
				recipeId: command === "打造" ? recipeId : 0
			}, parseForgePreview, next, feedback);
			if (response.handled) return;
			showPreview(response.data);
		} else if (command === "确认打造") {
			const response = await runRobotBusiness(e, "forge.confirm", { token: arg }, parseForgeResult, next, feedback);
			if (response.handled) return;
			title = "打造结果";
			footer = [{
				label: "作品",
				command: "/锻造作品"
			}, {
				label: "图纸",
				command: "/锻造图纸"
			}];
			showResult(response.data);
		} else if (command === "锻造作品") {
			const page = arg ? Number(arg) : 1;
			if (!Number.isSafeInteger(page) || page < 1) {
				content.addText("请使用 /锻造作品 正整数页码");
				await send();
				return;
			}
			const response = await runRobotBusiness(e, "forge.history", { page }, parseForgeHistory, next, feedback);
			if (response.handled) return;
			const v = response.data;
			title = "锻造作品";
			footer = [{
				label: "图纸",
				command: "/锻造图纸"
			}, {
				label: "锻造",
				command: "/我的锻造"
			}];
			v.items.forEach((item) => {
				content.addBlockquote(createQuoteMarkdown([
					`【${item.result.craftId}】${item.result.name}${item.result.tutorial ? " · 教学作品" : ""}`,
					`匠师：${item.result.crafter}${item.result.tutorial ? "" : ` · 经验 +${item.result.expGained}`}`,
					...!item.exists ? ["装备已不存在"] : !item.owned ? ["已转手"] : []
				], [{
					label: "详情",
					command: `/锻造作品详情 ${item.result.craftId} ${v.page}`
				}]));
			});
			if (!v.items.length) content.addText("尚无作品");
			content.addBlockquote(createQuoteMarkdown([`第 ${v.page} 页`], [...v.page > 1 ? [{
				label: "上一页",
				command: `/锻造作品 ${v.page - 1}`
			}] : [], ...v.hasMore ? [{
				label: "下一页",
				command: `/锻造作品 ${v.page + 1}`
			}] : []]));
		} else {
			const advancing = command === "锻造进阶";
			const expectedLevel = Number(arg);
			if (advancing && (!arg || !Number.isSafeInteger(expectedLevel) || expectedLevel < 0)) {
				content.addText("请先查看 /我的锻造 中的晋升条件。");
				await send();
				return;
			}
			const response = await runRobotBusiness(e, advancing ? "forge.advance" : command === "学习锻造图纸" ? "forge.learn" : "forge.overview", advancing ? { expectedLevel } : {}, parseForgeOverview, next, feedback);
			if (response.handled) return;
			if (advancing) {
				title = "锻造晋升";
				content.addBold("✨ 晋升成功").addNewline();
			} else if (command === "学习锻造图纸") {
				title = "锻造图纸";
				content.addText(`掌握图纸：${response.data.recipes.filter((recipe) => recipe.learned).length} 张`).addNewline();
			}
			showOverview(response.data, catalogQuery ?? void 0, advancing || command === "学习锻造图纸");
		}
		await send();
	} catch (error) {
		logger.error("锻造请求失败", error);
		await message.send(FormatGui({
			...base,
			title: "锻造提示",
			content: Format.createMarkdown().addText(orderCommand ? "未能获取委托结果，请查看委托状态。" : command === "确认打造" ? "未能获取打造结果，请查看作品。" : "暂时无法查看，请稍后重试。"),
			footer: orderCommand ? [{
				label: "查看委托",
				command: "/锻造委托"
			}] : [{
				label: "查看作品",
				command: "/锻造作品"
			}, {
				label: "我的锻造",
				command: "/我的锻造"
			}]
		}));
	}
});

//#endregion
export { res_default as default };