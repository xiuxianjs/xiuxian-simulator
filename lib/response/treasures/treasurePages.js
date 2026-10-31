import { markdownButtonLabel } from "../../utils/buttonLabel.js";
import { createQuoteMarkdown } from "../../utils/messageHelper.js";
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
			data: button.command,
			autoEnter: false
		});
	}
	content.addNewline();
}
function addNavigation(content, selected) {
	addButtons(content, [
		{
			label: "我的宝物",
			command: "/宝物",
			selected: selected === "owned"
		},
		{
			label: "鸿蒙气运",
			command: "/宝物 气运"
		},
		{
			label: "效果总览",
			command: "/宝物 效果",
			selected: selected === "effects"
		},
		{
			label: "分解",
			command: "/宝物 分解",
			selected: selected === "decomposition"
		},
		{
			label: "操作记录",
			command: "/宝物 记录"
		}
	]);
}
function addCultivation(content) {
	content.addNewline();
	addButtons(content, [{
		label: "一键突破",
		command: "/宝物 一键突破"
	}, {
		label: "一键升级",
		command: "/宝物 一键升级"
	}]);
}
function buildOwnedTreasurePage(data, options = {}) {
	const content = Format.createMarkdown();
	addNavigation(content, "owned");
	content.addBlockquote(createQuoteMarkdown([`宝物经验 ${data.experience} · 仙蕴 ${data.xianYun} · 境界等级上限 ${data.levelCap}`]));
	const owned = data.items.filter((item) => item.owned).sort((a, b) => a.definition.id - b.definition.id);
	const availableRarities = [...new Set(owned.map((item) => item.definition.rarity))].sort((a, b) => a - b);
	const selectedRarity = options.rarity ?? availableRarities[0] ?? 1;
	if (availableRarities.length) addButtons(content, availableRarities.map((rarity) => ({
		label: rarityNames[rarity - 1],
		command: `/宝物 品质 ${rarity}`,
		selected: rarity === selectedRarity
	})));
	const items = owned.filter((item) => item.definition.rarity === selectedRarity);
	const pages = Math.max(1, Math.ceil(items.length / pageSize));
	const page = Math.min(pages, Math.max(1, Number.isSafeInteger(options.page) ? options.page : 1));
	if (!items.length) {
		content.addBlockquote(createQuoteMarkdown([owned.length ? `尚未拥有${rarityNames[selectedRarity - 1] ?? "该品质"}宝物。` : "尚未拥有宝物，前往上古遗珍探索后可在此培养。"]));
		if (owned.length) addCultivation(content);
		return content;
	}
	for (const item of items.slice((page - 1) * pageSize, page * pageSize)) {
		content.addText(item.definition.name).addNewline();
		content.addBlockquote(createQuoteMarkdown([`${gradeName(item.gradeName)} · Lv.${item.level}`], [{
			label: "详情与培养",
			command: `/宝物 详情 ${item.definition.id}`,
			autoEnter: false
		}]));
	}
	if (pages > 1) content.addBlockquote(createQuoteMarkdown([`第 ${page}/${pages} 页`], [...page > 1 ? [{
		label: "上一页",
		command: `/宝物 品质 ${selectedRarity} p${page - 1}`,
		autoEnter: false
	}] : [], ...page < pages ? [{
		label: "下一页",
		command: `/宝物 品质 ${selectedRarity} p${page + 1}`,
		autoEnter: false
	}] : []]));
	addCultivation(content);
	return content;
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
	addButtons(content, [{
		label: "上古遗珍",
		command: "/上古遗珍"
	}, {
		label: "宝物图鉴",
		command: "/上古遗珍 图鉴",
		selected: true
	}]);
	content.addBlockquote(createQuoteMarkdown([`共 ${sorted.length} 件宝物 · ${rarityNames[selectedRarity - 1]} ${selectedItems.length} 件 · 第 ${page}/${pages} 页`]));
	addButtons(content, rarityNames.map((label, index) => ({
		label,
		command: `/上古遗珍 图鉴 品质 ${index + 1}`,
		selected: index + 1 === selectedRarity
	})));
	if (!sorted.length) {
		content.addBlockquote(createQuoteMarkdown(["暂无宝物图鉴资料。"]));
		return content;
	}
	for (const item of selectedItems.slice((page - 1) * pageSize, page * pageSize)) {
		const stats = battleAttributes({
			attributes: item.baseAttributes,
			percentAttributes: item.basePercentAttributes
		});
		content.addText(`【${item.rarityName}】${item.name}`).addNewline();
		content.addBlockquote(createQuoteMarkdown([`基础属性：${stats.length ? stats.join(" · ") : "暂无基础属性。"}`, catalogEffectDescription(item.effectDescription) || "暂无特殊效果。"]));
	}
	if (!selectedItems.length) content.addBlockquote(createQuoteMarkdown(["该稀有度暂无宝物资料。"]));
	if (pages > 1) addButtons(content, [...page > 1 ? [{
		label: "上一页",
		command: `/上古遗珍 图鉴 品质 ${selectedRarity} p${page - 1}`
	}] : [], ...page < pages ? [{
		label: "下一页",
		command: `/上古遗珍 图鉴 品质 ${selectedRarity} p${page + 1}`
	}] : []]);
	return content;
}
function buildTreasureDecompositionPage(data, options = {}) {
	const content = Format.createMarkdown();
	const sorted = [...data.items].sort((a, b) => a.definition.id - b.definition.id);
	const selectedRarity = options.rarity ?? sorted.find((item) => item.duplicates > 0 || item.fragments > 0)?.definition.rarity ?? 1;
	const items = sorted.filter((item) => item.definition.rarity === selectedRarity);
	const pages = Math.max(1, Math.ceil(items.length / pageSize));
	const page = Math.min(pages, Math.max(1, Number.isSafeInteger(options.page) ? options.page : 1));
	addNavigation(content, "decomposition");
	content.addBlockquote(createQuoteMarkdown([`仙蕴 ${number(data.xianYun)} · 1份等于1碎片，1件重复本体折合10份。`, "本体仅计重复库存，已激活主宝物保留；确认分解后不能撤销。"]));
	addButtons(content, rarityNames.map((label, index) => ({
		label,
		command: `/宝物 分解 品质 ${index + 1}`,
		selected: index + 1 === selectedRarity
	})));
	for (const item of items.slice((page - 1) * pageSize, page * pageSize)) {
		const rate = data.decompositionValues.find((value) => value.rarity === item.definition.rarity);
		const portions = item.duplicates * 10 + item.fragments;
		const available = Number.isSafeInteger(portions) && portions > 0 && rate !== void 0;
		const maxed = item.owned && item.grade === item.definition.maxGrade;
		content.addText(`${item.definition.name}${maxed ? " · 已满品" : ""}`).addNewline();
		content.addBlockquote(createQuoteMarkdown([`本体${number(item.duplicates)} · 碎片${number(item.fragments)}`, Number.isSafeInteger(portions) ? `可分解${number(portions)}份，${rate ? `每份${number(rate.fragmentXianYun)}仙蕴` : "分解价值暂未同步"}` : "库存份数暂不可用，请核对后重试。"], available ? [{
			label: "输入份数预览",
			command: `/宝物 分解 份数 ${item.definition.id} 1`,
			autoEnter: false
		}] : []));
	}
	if (!items.length) content.addBlockquote(createQuoteMarkdown(["该稀有度暂无宝物资料。"]));
	if (pages > 1) addButtons(content, [...page > 1 ? [{
		label: "上一页",
		command: `/宝物 分解 品质 ${selectedRarity} p${page - 1}`
	}] : [], ...page < pages ? [{
		label: "下一页",
		command: `/宝物 分解 品质 ${selectedRarity} p${page + 1}`
	}] : []]);
	content.addBlockquote(createQuoteMarkdown(["一键只处理满品宝物的全部重复本体与碎片；未满品材料须手动指定。范围为全部稀有度，先预览再确认。"]));
	if (sorted.some((item) => item.owned && item.grade === item.definition.maxGrade && (item.duplicates > 0 || item.fragments > 0))) addButtons(content, [{
		label: "一键分解满品宝物",
		command: "/宝物 一键分解"
	}]);
	else content.addBlockquote(createQuoteMarkdown(["暂无可一键分解的满品宝物库存。"]));
	return content;
}
function buildTreasureFortunePage(data) {
	const content = Format.createMarkdown();
	const f = data.fortune;
	addButtons(content, [{
		label: "宝物总览",
		command: "/宝物"
	}, {
		label: "鸿蒙气运",
		command: "/宝物 气运",
		selected: true
	}]);
	content.addText("根据宝物培养程度，气运会逐渐累积").addNewline();
	content.addNewline().addBold(`鸿蒙气运 · Lv.${f.level}`).addNewline();
	content.addBlockquote(createQuoteMarkdown([`当前进度 ${number(f.score)}`, f.nextThreshold === null ? "已达最高气运等级，积分继续保留" : `下级累计 ${number(f.nextThreshold)} · 还差 ${number(Math.max(0, f.nextThreshold - f.score))}`]));
	content.addText("当前效果").addNewline();
	content.addBlockquote(createQuoteMarkdown([`命中率 +${number(f.bonus.hitRate)}% · 闪避率 +${number(f.bonus.dodgeRate)}%`, `暴击率 +${number(f.bonus.critRate)}% · 暴伤 +${number(f.bonus.critDamage)}%`]));
	return content;
}
function buildTreasureEffectsPage(data) {
	const content = Format.createMarkdown();
	const owned = data.items.filter((item) => item.owned);
	const stats = [];
	addNavigation(content, "effects");
	for (const key of Object.keys(treasureAttributeNames)) {
		const fixed = owned.reduce((total, item) => total + item.attributes[key], 0);
		const percent = owned.reduce((total, item) => total + item.percentAttributes[key], 0);
		if (fixed) stats.push(`${treasureAttributeNames[key]} +${number(fixed)}`);
		if (percent) stats.push(`${treasureAttributeNames[key]} +${number(percent)}%`);
	}
	content.addBlockquote(Format.createMarkdown().addBold("宝物战斗属性").addNewline().absorb(createQuoteMarkdown(stats.length ? stats : ["暂无已激活宝物属性。"])));
	const effects = owned.filter((item) => item.definition.effectDescription && item.currentEffect);
	if (effects.length) for (const item of effects) content.addBlockquote(Format.createMarkdown().addBold(item.definition.name).addNewline().addText(item.currentEffect));
	else content.addBlockquote(createQuoteMarkdown(["暂无已激活宝物生活效果。"]));
	content.addBlockquote(createQuoteMarkdown(["鸿蒙气运额外效果单独查看。"], [{
		label: "鸿蒙气运",
		command: "/宝物 气运",
		autoEnter: false
	}]));
	return content;
}
function battleAttributes(item) {
	const values = [];
	for (const key of Object.keys(treasureAttributeNames)) {
		if (item.attributes[key]) values.push(`${treasureAttributeNames[key]} +${number(item.attributes[key])}`);
		if (item.percentAttributes[key]) values.push(`${treasureAttributeNames[key]} +${number(item.percentAttributes[key])}%`);
	}
	return values;
}
function battleChanges(item, next) {
	const changes = [];
	for (const key of Object.keys(treasureAttributeNames)) {
		const label = treasureAttributeNames[key];
		if (item.attributes[key] !== next.attributes[key]) changes.push(`${label} +${number(item.attributes[key])} → ${label} +${number(next.attributes[key])}`);
		if (item.percentAttributes[key] !== next.percentAttributes[key]) changes.push(`${label} +${number(item.percentAttributes[key])}% → ${label} +${number(next.percentAttributes[key])}%`);
	}
	return changes.length ? changes : ["战斗属性不变"];
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
	if (item.promotionPreview && item.promotion) {
		content.addText(`升品至 ${gradeName(item.promotionPreview.gradeName)} `);
		addButtons(content, [{
			label: "升品",
			command: `/宝物 升品 ${d.id}`
		}]);
		const block = Format.createMarkdown();
		for (const change of battleChanges(item, item.promotionPreview)) block.addBold(change).addNewline();
		block.addText(`需要本体 ${item.promotion.duplicates} · 仙蕴 ${item.promotion.xianYun}`);
		for (const requirement of item.promotion.requirements) block.addNewline().addText(requirement);
		content.addBlockquote(block);
	} else content.addBlockquote(createQuoteMarkdown([item.grade >= d.maxGrade ? "品级已达上限。" : "升品：刷新后查看下一阶属性。"]));
	if (item.upgradePreview) {
		content.addText(`升级至 Lv.${item.upgradePreview.level} `);
		addButtons(content, [{
			label: "升级",
			command: `/宝物 升级 ${d.id}`
		}]);
		const block = Format.createMarkdown();
		for (const change of battleChanges(item, item.upgradePreview)) block.addBold(change).addNewline();
		block.addText(`需要经验 ${item.nextLevelCost}`);
		content.addBlockquote(block);
	} else content.addBlockquote(createQuoteMarkdown([item.level >= data.levelCap ? "等级已达当前境界上限。" : "升级：刷新后查看下一阶属性。"]));
	return content;
}

//#endregion
export { buildOwnedTreasurePage, buildTreasureCatalogPage, buildTreasureDecompositionPage, buildTreasureDetailPage, buildTreasureEffectsPage, buildTreasureFortunePage };