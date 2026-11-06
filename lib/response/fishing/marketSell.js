import { isPrivateEvent } from "../../utils/privateEvent.js";
import { buildBubble } from "../presentation/bubble.js";
import { errorBubble } from "../presentation/presets.js";
import { createBackendReadRequestContext, createBackendRequestContext } from "../../api/bot/context.js";
import { useMessage as useMessage$1 } from "../../utils/useMessage.js";
import { validFishingReference } from "../../api/bot/fishing.js";
import { parseRobotMarketSell } from "../../api/bot/market-sell-query.js";
import "../presentation/index.js";
import { runRobotBusiness } from "../robotBusiness.js";
import { fishInventoryRealms } from "./commands.js";
import { fishingBubble } from "./view.js";
import { ResultCode } from "alemonjs";

//#region src/response/fishing/marketSell.ts
const kg = (g) => `${Math.trunc(g / 1e3)}.${String(g % 1e3).padStart(3, "0")} kg`;
const manual = (label, command) => ({
	label,
	command,
	autoEnter: false
});
const pageNumber = (raw = "1") => {
	const page = Number(raw);
	return /^\d+$/.test(raw) && page >= 1 && page <= 2147483647 ? String(page) : void 0;
};
function parseFishPicker(parts, suffix) {
	const [target, first, second, third, last] = parts;
	const input = {
		mode: "fish-picker",
		category: "fish"
	};
	if (target === "鱼种") {
		const page = pageNumber(second);
		const returnPage = pageNumber(third);
		const fishRealm = last === void 0 || last === "全部" ? void 0 : fishInventoryRealms.indexOf(last);
		if (suffix || parts.length > 5 || !first || !/^fishing_r[0-9]_[a-e]$/.test(first) || !page || !returnPage || fishRealm !== void 0 && fishRealm < 0) return null;
		return {
			...input,
			speciesId: first,
			page,
			returnPage,
			...fishRealm === void 0 ? {} : { fishRealm }
		};
	}
	const fishRealm = target === void 0 || target === "全部" ? void 0 : fishInventoryRealms.indexOf(target);
	if (fishRealm === -1) return;
	const page = pageNumber(first ?? suffix);
	return page && parts.length <= 2 && (!suffix || target === void 0) ? {
		...input,
		page,
		...fishRealm === void 0 ? {} : { fishRealm }
	} : null;
}
function parseFishMarketArguments(parts, suffix) {
	const picker = parseFishPicker(parts, suffix);
	if (picker !== void 0) return picker;
	const [catchId, argument] = parts;
	if (parts.length > 2 || !pageNumber(suffix)) return null;
	if (catchId === "确认") return argument && validFishingReference(argument, "z") ? {
		mode: "confirm",
		reference: argument
	} : null;
	if (!/^[A-Za-z0-9_.:-]{1,40}$/.test(catchId)) return null;
	const price = argument === void 0 ? null : Number(argument);
	if (price !== null && (!/^[1-9]\d*$/.test(argument) || !Number.isSafeInteger(price) || price > 1e8)) return null;
	return {
		mode: price === null ? "start" : "direct",
		category: "fish",
		catchId,
		firstNumber: price,
		secondNumber: null
	};
}
/** Preserve the original market workflow while keeping catch IDs as strings. */
async function handleFishingMarketSell(event, next) {
	const match = /^\s*[/#＃!！]?交易上架\s+(?:鱼类|渔获|fish)(\d+)?(?:\s+(.*?))?\s*$/.exec(event.MessageText ?? "");
	if (!match) return false;
	const [message] = useMessage$1();
	const common = {
		bid: event.UserId,
		isPrivate: isPrivateEvent(event)
	};
	const footer = [manual("返回渔获", "/储物袋 渔获"), manual("我的上架", "/我的上架")];
	const send = async (body) => {
		const receipts = await message.send(body);
		if (!receipts.length || receipts.some((receipt) => receipt.code !== ResultCode.Ok)) throw new Error("鱼交易消息未确认送达");
	};
	const parts = match[2]?.split(/\s+/).filter(Boolean) ?? [];
	const args = [...event.MessageText ?? ""].length <= 80 ? parseFishMarketArguments(parts, match[1]) : null;
	if (!args) {
		await send(errorBubble({
			...common,
			title: "交易上架 · 未完成",
			reason: "说明：/交易上架 鱼类 [境界 [页码]]，或 /交易上架 鱼类 完整鱼编号 [整尾灵晶单价]。数量固定1。",
			footer
		}));
		return true;
	}
	const { mode } = args;
	try {
		const response = await runRobotBusiness(event, "market.sell", args, (data, uid) => parseRobotMarketSell(data, mode === "direct" ? "receipt" : mode, "fish", uid), next, async (reply) => {
			await send(buildBubble({
				...common,
				title: reply.title || "交易上架 · 未完成",
				sections: [{
					lines: [reply.text],
					actions: reply.buttons.map((button) => manual(button.label, button.command))
				}],
				footer
			}));
		}, mode === "confirm" || mode === "direct" ? createBackendRequestContext(event, "market.sell.fish") : createBackendReadRequestContext());
		if (response.handled) return true;
		const data = response.data;
		if (data.mode === "confirm") {
			const confirmation = data.fishConfirmation;
			await send(fishingBubble(confirmation, event, confirmation.confirmationRef ? `/交易上架 鱼类 确认 ${confirmation.confirmationRef}` : void 0));
			return true;
		}
		if (data.mode === "fish-picker") {
			const expected = "speciesId" in args ? "market-fish-instances" : "market-fish-species";
			if (data.view.view !== expected) throw new Error("可上架鱼类列表与筛选条件不一致");
			await send(fishingBubble(data.view, event));
			return true;
		}
		if (data.mode === "receipt") {
			await send(fishingBubble(data.receipt, event));
			return true;
		}
		if (data.mode !== "start" || args.mode !== "start" || data.fishConfirmation || !data.range.fixedQuantity || data.range.maxListingQuantity !== 1) throw new Error("鱼单尾交易规则不匹配");
		const { catchId } = args;
		const range = data.range;
		const referenceText = range.referencePrice >= range.minPrice && range.referencePrice <= range.maxPrice ? `（参考价 ${range.referencePrice} 灵晶）` : "";
		const actions = [];
		for (const [label, amount] of [
			["最低价", range.minPrice],
			["最高价", range.maxPrice],
			["参考价", range.referencePrice]
		]) {
			const command = `/交易上架 鱼类 ${catchId} ${amount}`;
			if (amount >= range.minPrice && amount <= range.maxPrice && !actions.some((action) => action.command === command)) actions.push(manual(label, command));
		}
		await send(buildBubble({
			...common,
			title: "交易上架",
			sections: [{
				title: data.itemName ?? "原渔获",
				id: catchId,
				lines: [
					...data.weightG === void 0 ? [] : [`重量：${kg(data.weightG)}`],
					"数量：1尾",
					...data.listingId ? [...data.message ? [data.message] : [], `上架ID：${data.listingId}`] : [`单价区间：${range.minPrice}~${range.maxPrice} 灵晶${referenceText}`, "说明：可修改快捷指令里的单价，发送后直接上架。"]
				],
				actions: data.listingId ? [] : actions
			}],
			footer
		}));
	} catch {
		await send(errorBubble({
			...common,
			title: "交易上架 · 结果待核对",
			reason: "说明：本次市场结果尚未核实，请查看我的上架；不要重新选择另一尾鱼代替原操作。",
			footer
		}));
	}
	return true;
}

//#endregion
export { handleFishingMarketSell };