import { commandText } from "../../utils/commandPrefix.js";
import { markdownButtonLabel } from "../../utils/buttonLabel.js";
import { createQuoteMarkdown } from "../../utils/messageHelper.js";
import { section } from "../presentation/sections.js";
import "../presentation/index.js";
import { treasureAttributeNames } from "../../api/bot/treasures.js";
import { Format } from "alemonjs";

//#region src/response/treasures/treasurePages.ts
const rarityNames = [
	"普通",
	"优秀",
	"精良",
	"稀有",
	"史诗",
	"神话"
];
const pageSize = 6;
const number = (value) => new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 2 }).format(value);
const gradeName = (value) => value.replace(/阶$/, "");
function addButtons(content, buttons) {
	for (const [index, button] of buttons.entries()) {
		if (index > 0) content.addText(" ");
		content.addButton(markdownButtonLabel(button.label, button.selected), {
			data: commandText(button.command),
			autoEnter: false
		});
	}
	content.addNewline();
}
function buildOwnedTreasurePage(data, options = {}) {
	const content = Format.createMarkdown();
	const owned = data.items.filter((item) => item.owned).sort((a, b) => a.definition.id - b.definition.id);
	const availableRarities = [...new Set(owned.map((item) => item.definition.rarity))].sort((a, b) => a - b);
	const items = owned.filter((item) => options.rarity === void 0 || item.definition.rarity === options.rarity);
	const size = options.rarity === void 0 ? 5 : pageSize;
	const total = Math.max(1, Math.ceil(items.length / size));
	const current = Math.min(total, Math.max(1, options.page ?? 1));
	const nav = total > 1 ? {
		current,
		total,
		count: items.length,
		command: options.rarity === void 0 ? "/宝物 p{page}" : `/宝物 品质 ${options.rarity} p{page}`,
		autoEnter: false
	} : void 0;
	content.addBlockquote(section({ lines: [
		`数量：已激活 ${owned.length} 件宝物`,
		`物品：宝物经验 ${number(data.experience)} · 仙蕴 ${number(data.xianYun)}`,
		`等级：当前境界上限 Lv.${data.levelCap}`
	] }));
	if (availableRarities.length > 1) {
		const filters = [{
			label: "全部",
			command: "/宝物",
			selected: options.rarity === void 0
		}, ...availableRarities.map((rarity) => ({
			label: rarityNames[rarity - 1],
			command: `/宝物 品质 ${rarity}`,
			selected: rarity === options.rarity
		}))];
		addButtons(content, filters.slice(0, 4));
		if (filters.length > 4) addButtons(content, filters.slice(4));
	}
	if (!items.length) content.addBlockquote(section({
		lines: [owned.length ? `状态：尚未拥有${rarityNames[(options.rarity ?? 1) - 1]}宝物。` : "状态：尚未拥有宝物。"],
		actions: !owned.length ? [{
			label: "前往上古遗珍",
			command: "/上古遗珍",
			autoEnter: false
		}] : availableRarities.length <= 1 ? [{
			label: "查看全部",
			command: "/宝物",
			autoEnter: false
		}] : []
	}));
	const detailOrigin = [...options.rarity === void 0 ? [] : ["品质", String(options.rarity)], ...current > 1 ? [`p${current}`] : []];
	for (const item of items.slice((current - 1) * size, current * size)) content.addBlockquote(section({
		title: item.definition.name,
		id: item.definition.id,
		suffix: item.definition.rarityName,
		lines: [`品级：${gradeName(item.gradeName)} · Lv.${item.level}`],
		actions: [{
			label: "详情",
			command: [`/宝物 详情 ${item.definition.id}`, ...detailOrigin].join(" "),
			autoEnter: false
		}]
	}));
	return {
		content,
		nav
	};
}
function catalogEffectDescription(description) {
	return description.replace(/[＋+－-]?(?:\d+(?:\.\d+)?|[xX])\s*[%％](?:\s*[／/、]\s*[＋+－-]?(?:\d+(?:\.\d+)?|[xX])\s*[%％])*/g, (value, offset) => description.slice(offset + value.length).trimStart().startsWith("概率") ? "一定" : "相应比例");
}
function buildTreasureCatalogPage(items, options = {}) {
	const content = Format.createMarkdown();
	const sorted = [...items].sort((a, b) => a.id - b.id);
	let selectedRarity;
	let requestedPage;
	if (typeof options === "number") {
		const legacyPages = Math.max(1, Math.ceil(sorted.length / pageSize));
		const firstIndex = (Math.min(legacyPages, Math.max(1, Number.isSafeInteger(options) ? options : 1)) - 1) * pageSize;
		selectedRarity = sorted[firstIndex]?.rarity ?? 1;
		requestedPage = Math.floor(sorted.slice(0, firstIndex).filter((item) => item.rarity === selectedRarity).length / pageSize) + 1;
	} else {
		selectedRarity = options.rarity ?? 1;
		requestedPage = options.page;
	}
	const selectedItems = sorted.filter((item) => item.rarity === selectedRarity);
	const pages = Math.max(1, Math.ceil(selectedItems.length / pageSize));
	const page = Math.min(pages, Math.max(1, Number.isSafeInteger(requestedPage) ? requestedPage : 1));
	const nav = pages > 1 ? {
		current: page,
		total: pages,
		count: selectedItems.length,
		command: `/上古遗珍 图鉴 品质 ${selectedRarity} p{page}`,
		autoEnter: false
	} : void 0;
	content.addBlockquote(section({ lines: [`数量：共 ${sorted.length} 件宝物 · ${rarityNames[selectedRarity - 1]} ${selectedItems.length} 件`] }));
	addButtons(content, rarityNames.map((label, index) => ({
		label,
		command: `/上古遗珍 图鉴 品质 ${index + 1}`,
		selected: index + 1 === selectedRarity
	})));
	if (!sorted.length) {
		content.addBlockquote(createQuoteMarkdown(["暂无宝物图鉴资料。"]));
		return {
			content,
			nav
		};
	}
	for (const item of selectedItems.slice((page - 1) * pageSize, page * pageSize)) {
		const stats = battleAttributes({
			attributes: item.baseAttributes,
			percentAttributes: item.basePercentAttributes
		});
		content.addBlockquote(section({
			title: item.name,
			id: item.id,
			suffix: item.rarityName,
			lines: [`属性：${stats.length ? stats.join(" · ") : "暂无基础属性"}`, `说明：${catalogEffectDescription(item.effectDescription) || "暂无特殊效果。"}`]
		}));
	}
	if (!selectedItems.length) content.addBlockquote(createQuoteMarkdown(["该稀有度暂无宝物资料。"]));
	return {
		content,
		nav
	};
}
function buildTreasureDecompositionPage(data, options = {}) {
	const content = Format.createMarkdown();
	const stock = data.items.filter((item) => item.duplicates > 0 || item.fragments > 0).sort((a, b) => a.definition.id - b.definition.id);
	const selectedRarity = options.rarity ?? stock[0]?.definition.rarity ?? 1;
	const items = stock.filter((item) => item.definition.rarity === selectedRarity);
	const decompositionPageSize = 4;
	const pages = Math.max(1, Math.ceil(items.length / decompositionPageSize));
	const page = Math.min(pages, Math.max(1, Number.isSafeInteger(options.page) ? options.page : 1));
	const origin = `d${selectedRarity}p${page}`;
	content.addBlockquote(createQuoteMarkdown([`仙蕴 ${number(data.xianYun)} · 1份等于1碎片，1件重复本体折合10份。`, "本体仅计重复库存，已激活主宝物保留；确认分解后不能撤销。"]));
	for (const item of items.slice((page - 1) * decompositionPageSize, page * decompositionPageSize)) {
		const rate = data.decompositionValues.find((value) => value.rarity === item.definition.rarity);
		const portions = item.duplicates * 10 + item.fragments;
		const available = Number.isSafeInteger(portions) && portions > 0 && rate !== void 0;
		const maxed = item.owned && item.grade === item.definition.maxGrade;
		content.addBlockquote(section({
			title: item.definition.name,
			id: item.definition.id,
			lines: [
				`品级：${maxed ? "已满品" : item.owned ? "未满品" : "未激活"}`,
				`物品：本体${number(item.duplicates)} · 碎片${number(item.fragments)}`,
				Number.isSafeInteger(portions) ? `数量：可分解${number(portions)}份，${rate ? `每份${number(rate.fragmentXianYun)}仙蕴` : "分解价值暂未同步"}` : "状态：库存份数暂不可用，请核对后重试。"
			],
			actions: available ? [{
				label: "输入份数预览",
				command: `/宝物 分解 份数 ${item.definition.id} ${origin} 1`,
				autoEnter: false
			}] : []
		}));
	}
	const canBatch = (item) => item.owned && item.grade === item.definition.maxGrade;
	const hasBatchStock = stock.some(canBatch);
	const actions = [];
	if (!items.length) content.addBlockquote(section({ lines: [stock.length ? "状态：本品质暂无可分解库存。" : "状态：暂无可分解库存。"] }));
	if (items.some(canBatch)) actions.push({
		label: "一键分解本档满品",
		command: `/宝物 一键分解 品质 ${selectedRarity} ${origin}`
	});
	if (hasBatchStock) {
		content.addBlockquote(section({ lines: ["说明：一键只处理满品宝物的全部重复本体与碎片；未满品材料须手动指定。", "范围：全部满品覆盖所有稀有度。"] }));
		actions.push({
			label: "一键分解全部满品",
			command: `/宝物 一键分解 ${origin}`
		});
	}
	const nav = pages > 1 ? {
		current: page,
		total: pages,
		command: `/宝物 分解 品质 ${selectedRarity} p{page}`,
		autoEnter: false
	} : void 0;
	actions.push({
		label: "切换品质",
		command: `/宝物 分解 切换品质 ${selectedRarity}${page > 1 ? ` p${page}` : ""}`
	});
	return {
		content,
		nav,
		actions,
		rarity: selectedRarity,
		origin
	};
}
function buildTreasureFortunePage(data) {
	const content = Format.createMarkdown();
	const f = data.fortune;
	content.addText("根据宝物培养程度，气运会逐渐累积").addNewline();
	content.addNewline().addBold(`鸿蒙气运 · Lv.${f.level}`).addNewline();
	content.addBlockquote(createQuoteMarkdown([`当前进度 ${number(f.score)}`, f.nextThreshold === null ? "已达最高气运等级，积分继续保留" : `下级累计 ${number(f.nextThreshold)} · 还差 ${number(Math.max(0, f.nextThreshold - f.score))}`]));
	content.addText("当前效果").addNewline();
	content.addBlockquote(createQuoteMarkdown([`命中率 +${number(f.bonus.hitRate)}% · 闪避率 +${number(f.bonus.dodgeRate)}%`, `暴击率 +${number(f.bonus.critRate)}% · 暴伤 +${number(f.bonus.critDamage)}%`]));
	return content;
}
function buildTreasureEffectsPage(data, requestedPage = 1) {
	const content = Format.createMarkdown();
	const owned = data.items.filter((item) => item.owned);
	const stats = [];
	for (const key of Object.keys(treasureAttributeNames)) {
		const fixed = owned.reduce((total, item) => total + item.attributes[key], 0);
		const percent = owned.reduce((total, item) => total + item.percentAttributes[key], 0);
		if (fixed) stats.push(`${treasureAttributeNames[key]} +${number(fixed)}`);
		if (percent) stats.push(`${treasureAttributeNames[key]} +${number(percent)}%`);
	}
	content.addBlockquote(Format.createMarkdown().addBold("宝物战斗属性").addNewline().absorb(createQuoteMarkdown(stats.length ? stats : ["暂无已激活宝物属性。"])));
	const effects = owned.filter((item) => item.definition.effectDescription && item.currentEffect);
	const total = Math.max(1, Math.ceil(effects.length / pageSize));
	const current = Math.min(total, Math.max(1, requestedPage));
	const nav = total > 1 ? {
		current,
		total,
		count: effects.length,
		command: "/宝物 效果 p{page}",
		autoEnter: false
	} : void 0;
	for (const item of effects.slice((current - 1) * pageSize, current * pageSize)) content.addBlockquote(section({
		title: item.definition.name,
		id: item.definition.id,
		lines: [item.currentEffect]
	}));
	if (!effects.length) content.addBlockquote(section({ lines: ["状态：暂无已激活宝物生活效果。"] }));
	return {
		content,
		nav
	};
}
function battleAttributes(item) {
	const values = [];
	for (const key of Object.keys(treasureAttributeNames)) {
		if (item.attributes[key]) values.push(`${treasureAttributeNames[key]} +${number(item.attributes[key])}`);
		if (item.percentAttributes[key]) values.push(`${treasureAttributeNames[key]} +${number(item.percentAttributes[key])}%`);
	}
	return values;
}
function specialAttribute(item) {
	if (!item.currentEffect) return "暂无特殊属性。";
	const effect = /^[^\p{Script=Han}]+$/u.test(item.currentEffect) && item.definition.effectDescription ? `${item.definition.effectDescription}（${item.currentEffect}）` : item.currentEffect;
	const probability = /^(.*)（(\d+(?:\.\d+)?)%）$/.exec(effect);
	if (probability && probability[1].includes("命中") && !probability[1].includes("修为")) return probability[1].replace(/命中概率|命中/, `${probability[2]}%概率`);
	return effect;
}
function buildTreasureDetailPage(item, data) {
	const content = Format.createMarkdown();
	const d = item.definition;
	content.addBlockquote(createQuoteMarkdown([`当前拥有：经验 ${data.experience} · 仙蕴 ${data.xianYun}`]));
	content.addText(`【${d.rarityName}】${d.name}`).addNewline();
	const status = Format.createMarkdown();
	if (item.owned) status.addBold(`${gradeName(item.gradeName)} · 等级 ${item.level}/${data.levelCap}`);
	else status.addText("尚未拥有");
	status.addNewline().addText(`碎片 ${item.fragments}/10 · 多余本体 ${item.duplicates}`);
	content.addBlockquote(status);
	if (!item.owned) return content;
	const stats = battleAttributes(item);
	content.addText("战斗属性").addNewline();
	content.addBlockquote(createQuoteMarkdown(stats.length ? stats : ["暂无战斗属性。"]));
	content.addText("特殊属性").addNewline();
	content.addBlockquote(createQuoteMarkdown([specialAttribute(item)]));
	const actions = [];
	if (item.grade < d.maxGrade) actions.push({
		label: "升品",
		command: `/宝物 升品 ${d.id}`
	});
	if (item.level < data.levelCap) actions.push({
		label: "升级",
		command: `/宝物 升级 ${d.id}`
	});
	if (item.grade >= d.maxGrade) content.addBlockquote(section({ lines: ["状态：品级已达上限。"] }));
	if (item.level >= data.levelCap) content.addBlockquote(section({ lines: ["状态：等级已达当前境界上限。"] }));
	if (actions.length) addButtons(content, actions);
	return content;
}

//#endregion
export { buildOwnedTreasurePage, buildTreasureCatalogPage, buildTreasureDecompositionPage, buildTreasureDetailPage, buildTreasureEffectsPage, buildTreasureFortunePage, rarityNames };