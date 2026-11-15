import { errorBubble, listBubble } from "../../../presentation/presets.js";
import { isSearchReference } from "../../../../utils/searchReference.js";
import "../../../presentation/index.js";
import { useMessage as useMessage$1 } from "../../../../utils/useMessage.js";
import { CATEGORY_NAMES, SUBCATEGORY_NAMES } from "../../../../constants/newStorage.js";
import { selects } from "../../../config.js";
import { runRobotBusiness } from "../../../robotBusiness.js";
import { bagSearchButton } from "../tabs.js";
import { onResponse, useEvent } from "alemonjs";

//#region src/response/storage/newBag/search/res.ts
const categories = {
	...CATEGORY_NAMES,
	fish: "渔获"
};
const fishingSubtypes = {
	fishing_bait: "鱼饵",
	fishing_chum: "窝料",
	fishing_net: "渔网",
	fishing_material: "垂钓素材"
};
const footer = [{
	...bagSearchButton,
	label: "重新搜索"
}, {
	label: "返回储物袋",
	command: "/储物袋"
}];
const feedback = {
	name: "请输入 1 至 80 个字符的物品名称",
	page: "请输入有效的页码",
	expired: "搜索已失效，请重新输入关键词",
	unavailable: "储物袋搜索暂不可用，请稍后重试"
};
function parseArguments(text) {
	const command = /^(?:[!！/#＃]\s*)?(?:我的)?(?:储物袋|背包)\s*搜索(续)?(?:\s+([\s\S]*))?$/u.exec(text.trim());
	const tokens = (command?.[2] ?? "").split(/\s+/);
	const validPage = (page) => Number.isSafeInteger(page) && page >= 1;
	if (command?.[1]) {
		const [searchReference, rawPage] = tokens;
		const page = Number(rawPage);
		return tokens.length === 2 && isSearchReference(searchReference) && /^\d+$/.test(rawPage) && validPage(page) ? {
			page,
			searchReference
		} : { error: feedback.expired };
	}
	const last = tokens.at(-1) ?? "";
	const page = tokens.length > 1 && /^\d+$/.test(last) ? Number(tokens.pop()) : 1;
	const keyword = tokens.join(" ");
	if (!keyword || [...keyword].length > 80) return { error: feedback.name };
	return validPage(page) ? {
		page,
		keyword
	} : { error: feedback.page };
}
function parseResult(value) {
	const isObject = (data) => typeof data === "object" && data !== null && !Array.isArray(data);
	const isCount = (data) => typeof data === "number" && Number.isSafeInteger(data) && data >= 0;
	const isItem = (item) => isObject(item) && typeof item.name === "string" && item.name.length > 0 && typeof item.category === "string" && Object.hasOwn(categories, item.category) && typeof item.subtype === "string" && isCount(item.quantity) && item.quantity > 0 && isCount(item.id) && (item.category === "fish" ? typeof item.speciesId === "string" && /^[a-z0-9_-]+$/i.test(item.speciesId) : item.id > 0);
	if (!isObject(value) || !Array.isArray(value.items) || value.items.length > 5 || !value.items.every(isItem) || !isCount(value.page) || value.page < 1 || !isCount(value.totalPages) || value.totalPages < value.page || !isCount(value.total)) throw new Error(feedback.unavailable);
	const { items, page, totalPages, total, searchReference } = value;
	return {
		items,
		page,
		totalPages,
		total,
		searchReference: isSearchReference(searchReference) ? searchReference : void 0
	};
}
var res_default = onResponse(selects, async (event) => {
	const [, next] = useEvent();
	const [message] = useMessage$1();
	const common = {
		isPrivate: event.isPrivate ?? false,
		bid: event.UserId,
		title: "储物袋 · 搜索结果",
		footer
	};
	const sendError = async (reason) => {
		await message.send(errorBubble({
			...common,
			reason
		}));
	};
	const { error, ...args } = parseArguments(event.MessageText ?? "");
	if (error) {
		await sendError(error);
		return;
	}
	const result = await runRobotBusiness(event, "storage.search", args, parseResult, next, async (reply) => {
		await sendError(Object.values(feedback).includes(reply.text) ? reply.text : feedback.unavailable);
	}, void 0, async () => {
		await sendError(feedback.unavailable);
		return true;
	});
	if (result.handled) return;
	const { items, page, totalPages, total, searchReference } = result.data;
	const sections = items.map((item) => {
		const subtype = item.category === "prop" || item.category === "material" ? SUBCATEGORY_NAMES[item.subtype] ?? fishingSubtypes[item.subtype] : item.subtype;
		return {
			title: item.name,
			id: item.category === "fish" ? item.speciesId : item.id,
			lines: [`类型：${categories[item.category]}${subtype ? ` · ${subtype}` : ""}`, `数量：${item.quantity}`]
		};
	});
	if (!items.length) sections.push({
		title: "",
		id: void 0,
		lines: ["储物袋中没有匹配的物品"]
	});
	if (totalPages > 1 && !searchReference) sections.push({
		title: "",
		id: void 0,
		lines: ["搜索续查暂不可用，请重新输入关键词。"]
	});
	await message.send(listBubble({
		...common,
		items: sections,
		nav: totalPages > 1 && searchReference ? {
			current: page,
			total: totalPages,
			count: total,
			command: `/储物袋 搜索续 ${searchReference} {page}`
		} : void 0
	}));
});

//#endregion
export { res_default as default };