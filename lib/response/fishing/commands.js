import { fishingBaits, fishingChums, validFishingEventID, validFishingReference, validFishingWeek } from "../../api/bot/fishing.js";

//#region src/response/fishing/commands.ts
const currencies = {
	灵鳞钱: "coin",
	灵石: "stone",
	灵晶: "crystal",
	道晶: "dao",
	coin: "coin",
	stone: "stone",
	crystal: "crystal",
	dao: "dao"
};
const id = (value) => value !== void 0 && /^[A-Za-z0-9_.:-]{1,64}$/.test(value);
const fishInstanceID = (value) => /^ff_[0-9a-f]{32}$/.test(value ?? "");
const fishInventoryRealms = [
	"凡物",
	"炼气",
	"筑基",
	"金丹",
	"元婴",
	"化神",
	"洞虚",
	"合体",
	"大乘",
	"仙"
];
const fishInventoryFilter = (value) => {
	if (value === void 0 || value === "全部") return {};
	const fishRealm = fishInventoryRealms.indexOf(value);
	return fishRealm >= 0 ? { fishRealm } : void 0;
};
const fishSpecies = (value) => {
	if (/^fishing_r[0-9]_[a-e]$/.test(value)) return { speciesId: value };
	return /^\p{Script=Han}{1,20}$/u.test(value) ? { speciesName: value } : void 0;
};
const packNames = {
	稳如老狗: "steady_6",
	乘风逐浪: "swift_18",
	潜渊寻珍: "treasure_30",
	我全都要: "all_50",
	筑基水域补给: "pond_supply_2",
	金丹水域补给: "pond_supply_3",
	元婴水域补给: "pond_supply_4",
	化神水域补给: "pond_supply_5",
	洞虚水域补给: "pond_supply_6",
	合体水域补给: "pond_supply_7",
	大乘水域补给: "pond_supply_8",
	仙境水域补给: "pond_supply_9"
};
const n = (value, minimum = 1, maximum = 2147483647) => {
	if (value === void 0 || !/^[1-9]\d*$/.test(value)) return;
	const parsed = Number(value);
	return Number.isSafeInteger(parsed) && parsed >= minimum && parsed <= maximum ? parsed : void 0;
};
const error = (example = "/垂钓 帮助") => ({ error: `参数错误，请使用 ${example}。` });
/** Parse decimal kilograms without binary floating point or silent rounding. */
function fishingWeightGrams(value) {
	const match = /^(0|[1-9]\d*)(?:\.(\d{1,3}))?$/.exec(value ?? "");
	if (!match) return;
	const grams = BigInt(match[1]) * 1000n + BigInt((match[2] ?? "").padEnd(3, "0"));
	return grams <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(grams) : void 0;
}
function isFishingInventoryCommand(message) {
	return /^\s*[/#＃]?(储物袋|物品详情|锁定|解锁|出售)\s+渔获(?:\s|$)/.test(message);
}
/** Only our exact domain entry is terminal; other packages keep their event. */
function parseFishingCommand(message) {
	const match = /^\s*[/#＃]?(垂钓|(?:储物袋|物品详情|锁定|解锁|出售)\s+渔获|渔获|钓具|渔市)(?:\s+(.*?))?\s*$/.exec(message);
	if (!match) return;
	if ([...message.trim()].length > 80) return error("长度不超过80字符的完整指令；确认凭据不得截断，请重新预览");
	const [entry] = match[1].split(/\s+/);
	const args = match[2]?.split(/\s+/).filter(Boolean) ?? [];
	const [verb, ...values] = entry === "垂钓" ? args : [entry === "储物袋" ? "渔获" : entry, ...args];
	const query = (view, input = {}) => ({
		operation: "fishing.query",
		input: {
			view,
			...input
		}
	});
	const preview = (kind, input = {}) => ({
		operation: kind === "settings" || kind === "use-chum" ? "fishing.configure" : "fishing.preview",
		input: {
			kind,
			...input
		}
	});
	if (entry === "物品详情") {
		const [catchId, rawPage, rawReturnPage, rawRealm] = args;
		const page = rawPage === void 0 ? 1 : n(rawPage);
		const returnPage = rawReturnPage === void 0 ? 1 : n(rawReturnPage);
		const filter = fishInventoryFilter(rawRealm);
		return args.length <= 4 && fishInstanceID(catchId) && page && returnPage && filter ? query("fish", {
			catchId,
			page,
			returnPage,
			...filter
		}) : error("/物品详情 渔获 <完整鱼编号> [单尾列表页] [鱼种榜页] [原境界]");
	}
	if (entry === "锁定" || entry === "解锁") return args.length === 1 && fishInstanceID(args[0]) ? preview("fish-lock", {
		catchId: args[0],
		lock: entry === "锁定"
	}) : error(`/${entry} 渔获 <完整鱼编号>`);
	if (entry === "出售") {
		const [target, rawMin, rawMax] = args;
		if (args.length === 1 && fishInstanceID(target)) return preview("sell-fish", {
			fishIds: [target],
			preserveUpgrade: false
		});
		const species = target === void 0 || target === "全部" ? {} : fishSpecies(target);
		if (species && args.length <= 1) return query("sell-range", species);
		const minWeightG = fishingWeightGrams(rawMin);
		const maxWeightG = fishingWeightGrams(rawMax);
		return species && args.length === 3 && minWeightG !== void 0 && maxWeightG !== void 0 && minWeightG <= maxWeightG ? preview("sell-fish-range", {
			...species,
			minWeightG,
			maxWeightG
		}) : error("/出售 渔获 <完整鱼编号>，或 /出售 渔获 [鱼种或全部] [最低kg 最高kg]");
	}
	if (verb === "渔获") {
		const [target, rawPage, rawReturnPage, rawRealm] = values;
		const usage = "/储物袋 渔获 [页码]，或 /储物袋 渔获 <境界或鱼种> [页码]";
		if (target === void 0) return query("species", { page: 1 });
		if (target === "素材") return values.length === 1 ? query("bag-materials") : error("/储物袋 渔获 素材");
		const legacyPage = n(target);
		if (legacyPage !== void 0) return values.length === 1 ? query("species", { page: legacyPage }) : error(usage);
		const page = rawPage === void 0 ? 1 : n(rawPage);
		const realm = fishInventoryFilter(target);
		if (realm) return values.length <= 2 && page ? query("species", {
			page,
			...realm
		}) : error(usage);
		const species = fishSpecies(target);
		const returnPage = rawReturnPage === void 0 ? 1 : n(rawReturnPage);
		const filter = fishInventoryFilter(rawRealm);
		return species && values.length <= 4 && page && returnPage && filter ? query("instances", {
			...species,
			page,
			returnPage,
			...filter
		}) : error(usage);
	}
	if (verb === "奇遇" || verb === "奇遇掉落") return values.length === 0 ? query(verb === "奇遇" ? "boss" : "boss-drops") : values.length === 1 && validFishingEventID(values[0]) ? query(verb === "奇遇" ? "boss" : "boss-drops", { eventId: values[0] }) : error(`/垂钓 ${verb} [奇遇编号]`);
	if (verb === "奇遇奖励") return values.length === 1 && validFishingEventID(values[0]) ? query("boss-rewards", { eventId: values[0] }) : error("/垂钓 奇遇奖励 <奇遇编号>");
	if (verb === "奇遇战报") {
		const page = values[1] === void 0 ? 1 : n(values[1]);
		return values.length >= 1 && values.length <= 2 && validFishingEventID(values[0]) && page ? query("boss-battle", {
			battleId: values[0],
			page
		}) : error("/垂钓 奇遇战报 <战斗编号> [页码]");
	}
	if (verb === "挑战") return values.length === 1 && validFishingEventID(values[0]) ? {
		operation: "fishing.preview",
		input: {
			kind: "boss-challenge",
			eventId: values[0]
		}
	} : error("/垂钓 挑战 <奇遇编号>");
	if (verb === "大赛" || verb === "赛奖") {
		const view = verb === "大赛" ? "contest" : "contest-rewards";
		return values.length === 0 ? query(view) : values.length === 1 && validFishingWeek(values[0]) ? query(view, { week: values[0] }) : error(`/垂钓 ${verb} [周一日期YYYY-MM-DD]`);
	}
	if (verb === "鱼榜" || verb === "积分榜") {
		const species = verb === "鱼榜";
		const offset = species ? 1 : 0;
		const page = values[offset] === void 0 ? 1 : n(values[offset]);
		const week = values[offset + 1];
		return values.length >= offset && values.length <= offset + 2 && (!species || id(values[0])) && page && (week === void 0 || validFishingWeek(week)) ? query(species ? "contest-species" : "contest-ranking", {
			...species ? { speciesId: values[0] } : {},
			page,
			...week ? { week } : {}
		}) : error(`/垂钓 ${verb} ${species ? "<鱼种编号> " : ""}[页码] [周一日期YYYY-MM-DD]`);
	}
	if (verb === "赛史") {
		const page = values[0] === void 0 ? 1 : n(values[0]);
		return values.length <= 1 && page ? query("contest-history", { page }) : error("/垂钓 赛史 [页码]");
	}
	if (verb === "赛领奖") return values.length === 1 && validFishingWeek(values[0]) ? {
		operation: "fishing.contest-claim",
		input: { week: values[0] }
	} : error("/垂钓 赛领奖 <周一日期YYYY-MM-DD>");
	if (!verb) return query("overview");
	if (verb === "确认") return values.length === 1 && validFishingReference(values[0]) ? {
		operation: "fishing.confirm",
		input: { ref: values[0] }
	} : error("/垂钓 确认 <原预览的完整引用>");
	if (verb === "状态") return values.length === 0 ? query("overview") : error();
	if (verb === "材料" || verb === "回收材料") {
		if (values.length === 0) return query("materials");
		if (verb === "材料") {
			const page = n(values[0]);
			return values.length === 1 && page ? query("materials", { page }) : error("/垂钓 材料 [页码]");
		}
		const material = {
			水灵砂: "water_sand",
			凝波晶: "wave_crystal",
			镇海髓: "sea_marrow"
		}[values[0]];
		const sku = material ? `material:${material}` : /^material:(water_sand|wave_crystal|sea_marrow)$/.test(values[0]) ? values[0] : void 0;
		if (sku && values.length === 1) return query("materials", { sku });
		const quantity = n(values[1], 1, Number.MAX_SAFE_INTEGER);
		return sku && values.length === 2 && quantity ? preview("sell-material", {
			sku,
			quantity
		}) : error("/垂钓 回收材料 <水灵砂|凝波晶|镇海髓> [份数]");
	}
	if (verb === "战报" && /^fc_[0-9a-f]{32}$/.test(values[0] ?? "")) {
		const page = values[1] === void 0 ? void 0 : n(values[1]);
		return values.length <= 2 && (values[1] === void 0 || page !== void 0) ? query("cast", {
			castId: values[0],
			...page === void 0 ? {} : { page }
		}) : error("/垂钓 战报 <原竿次编号> [页码]");
	}
	if (verb === "渔获记录") {
		const page = values[0] === void 0 ? 1 : n(values[0]);
		const sessionId = values[1];
		return values.length <= 2 && page && (sessionId === void 0 || /^[A-Za-z0-9_.:-]{1,40}$/.test(sessionId)) ? query("history", {
			sku: "fish",
			page,
			...sessionId === void 0 ? {} : { sessionId }
		}) : error("/垂钓 渔获记录 [页码] [原会话编号]");
	}
	if (verb === "渔具" || verb === "用网") {
		const waterLevel = values.length === 0 || [
			"当前",
			"默认",
			"0"
		].includes(values[0]) ? 0 : n(values[0], 1, 9);
		return values.length <= 1 && waterLevel !== void 0 ? verb === "渔具" ? query("tools", { waterLevel }) : preview("use-net", {
			waterLevel,
			quantity: 1
		}) : error(`/垂钓 ${verb} [水域1-9]`);
	}
	if (verb === "赐福") {
		if (values.length === 0) return query("blessing");
		if (values.length === 1 && ["总览", "overview"].includes(values[0])) return query("blessing", { sku: "overview" });
		const realm = /^[0-9]$/.test(values[0]) ? Number(values[0]) : [
			"凡物",
			"炼气",
			"筑基",
			"金丹",
			"元婴",
			"化神",
			"洞虚",
			"合体",
			"大乘",
			"仙"
		].indexOf(values[0]);
		return values.length === 1 && realm >= 0 && realm <= 9 ? query("blessing", { blessingRealm: realm }) : error("/垂钓 赐福 [总览|境界0-9]");
	}
	if ([
		"待入袋",
		"钓具",
		"鱼谱",
		"战报",
		"杂获"
	].includes(verb)) {
		const page = values[0] === void 0 ? 1 : n(values[0]);
		if (values.length > 1 || page === void 0) return error(`/垂钓 ${verb} <页码>`);
		const view = {
			待入袋: "pending",
			钓具: "gear",
			鱼谱: "catalog",
			战报: "history",
			杂获: "history"
		}[verb];
		return query(view, {
			page,
			...verb === "杂获" ? { sku: "loot" } : {}
		});
	}
	if (verb === "鱼种") {
		const page = values[1] === void 0 ? 1 : n(values[1]);
		const returnPage = values[2] === void 0 ? 1 : n(values[2]);
		return values.length >= 1 && values.length <= 3 && id(values[0]) && page && returnPage ? query("instances", {
			speciesId: values[0],
			page,
			returnPage
		}) : error("/垂钓 鱼种 <鱼种编号> [实例页] [鱼种页]");
	}
	if (verb === "鱼") {
		const page = values[1] === void 0 ? 1 : n(values[1]);
		const returnPage = values[2] === void 0 ? 1 : n(values[2]);
		return values.length >= 1 && values.length <= 3 && id(values[0]) && page && returnPage ? query("fish", {
			catchId: values[0],
			page,
			returnPage
		}) : error("/垂钓 鱼 <完整编号> [实例页] [鱼种页]");
	}
	if (verb === "钓竿") return values.length === 1 && id(values[0]) ? query("gear", { rodId: values[0] }) : error("/垂钓 钓竿 <原竿编号>");
	if (verb === "渔市") {
		const types = {
			鱼类: "fish",
			饵料: "bait",
			窝料: "chum",
			钓具: "rod",
			渔具: "net",
			素材: "material",
			fish: "fish",
			bait: "bait",
			chum: "chum",
			rod: "rod",
			net: "net",
			material: "material",
			全部: "all",
			all: "all"
		};
		const mode = {
			购买: "buy",
			出售: "sell",
			buy: "buy",
			sell: "sell"
		}[values[0]];
		if (mode) {
			const category = values[1] === void 0 ? mode === "sell" ? "fish" : "bait" : types[values[1]];
			const page = values[2] === void 0 ? 1 : n(values[2]);
			const allowed = mode === "sell" ? ["fish", "material"] : [
				"bait",
				"chum",
				"rod",
				"net",
				"material"
			];
			return values.length <= 3 && category && allowed.includes(category) && page ? query("shop", {
				shopMode: mode,
				shopCategory: category,
				page
			}) : error("/渔市 <购买|出售> <类别> [页码]");
		}
		if (values.length === 0) return query("shop", {
			shopCategory: "bait",
			page: 1
		});
		const category = types[values[0]];
		if (category) {
			const page = values[1] === void 0 ? 1 : n(values[1]);
			return values.length <= 2 && page ? query("shop", {
				shopCategory: category,
				page
			}) : error("/渔市 <饵料|窝料|钓具|渔具|素材> [页码]");
		}
		const currency = currencies[values[0]];
		const legacyCategory = types[values[1]];
		const page = legacyCategory ? values[2] === void 0 ? 1 : n(values[2]) : values[1] === void 0 ? 1 : n(values[1]);
		return currency && page && values.length <= (legacyCategory ? 3 : 2) ? query("shop", {
			currency,
			page,
			...legacyCategory ? { shopCategory: legacyCategory } : {}
		}) : error("/渔市 <饵料|窝料|钓具|渔具|素材> [页码]");
	}
	if (verb === "礼包") {
		const sku = packNames[values[0]] ?? values[0];
		return values.length === 0 ? query("packages") : values.length === 1 && id(sku) ? query("packages", { sku }) : error("/垂钓 礼包 [礼包编号或名称]");
	}
	if (verb === "礼包购买") return values.length === 1 && id(values[0]) ? {
		operation: "fishing.pack-checkout",
		input: { sku: values[0] }
	} : error("/垂钓 礼包购买 <礼包编号>");
	if (verb === "献鱼") return values.length >= 1 && values.length <= 14 && values.every(id) ? preview("blessing-unlock", { fishIds: values }) : error("/垂钓 献鱼 <本阶所需的具体鱼编号>");
	if (verb === "赐福预览") return values.length === 1 && id(values[0]) ? preview("blessing-unlock", { speciesId: values[0] }) : error("/垂钓 赐福预览 <鱼种编号>");
	if (verb === "打窝") {
		if (values.length === 0) return query("chum");
		const chumType = fishingChums[values[0]] ?? (Object.values(fishingChums).includes(values[0]) ? values[0] : void 0);
		const quantity = n(values[1], 1, Number.MAX_SAFE_INTEGER);
		return values.length === 2 && chumType && quantity ? preview("use-chum", {
			chumType,
			quantity
		}) : error("/垂钓 打窝 <散名> <原始份数>");
	}
	if (verb === "设置" || verb === "饵料") {
		if (verb !== "设置") return values.length === 0 ? query("settings", { sku: verb === "饵料" ? "bait" : "chum" }) : error();
		if (values.length === 0) return query("settings");
		if (values.length === 1 && [
			"窝料",
			"阶位",
			"主饵",
			"饵序"
		].includes(values[0])) return query("settings", { sku: {
			窝料: "chum",
			阶位: "tier",
			主饵: "bait",
			饵序: "order"
		}[values[0]] });
		const [option, ...parameters] = values;
		if (option === "主饵" && parameters.length === 1) {
			const primaryBaitType = fishingBaits[parameters[0]] ?? (Object.values(fishingBaits).includes(parameters[0]) ? parameters[0] : void 0);
			return primaryBaitType ? preview("settings", { settings: { primaryBaitType } }) : error("/垂钓 设置 主饵 <饵名>");
		}
		if ((option === "稀有通知" || option === "鱼王通知") && parameters.length === 1 && ["开", "关"].includes(parameters[0])) return preview("settings", { settings: option === "稀有通知" ? { pushRareFish: parameters[0] === "开" } : { pushFishKing: parameters[0] === "开" } });
		if ((option === "持续打窝" || option === "换饵") && parameters.length === 1 && ["开", "关"].includes(parameters[0])) return preview("settings", { settings: option === "持续打窝" ? { autoChum: parameters[0] === "开" } : { autoBaitSwitch: parameters[0] === "开" } });
		if (option === "窝料" && (parameters.length === 1 || parameters.length === 2)) {
			const chumType = fishingChums[parameters[0]] ?? (Object.values(fishingChums).includes(parameters[0]) ? parameters[0] : void 0);
			const chumTier = parameters[1] === void 0 ? void 0 : ["自动", "0"].includes(parameters[1]) ? 0 : void 0;
			return chumType && (parameters[1] === void 0 || chumTier !== void 0) ? preview("settings", { settings: {
				chumType,
				...chumTier !== void 0 ? { chumTier } : {}
			} }) : error("/垂钓 设置 窝料 <散名>（窝料已取消等级）");
		}
		if (option === "阶位" && parameters.length === 1) {
			const chumTier = ["自动", "0"].includes(parameters[0]) ? 0 : void 0;
			return chumTier !== void 0 ? preview("settings", { settings: { chumTier } }) : error("/垂钓 设置 窝料 <散名>（窝料已取消等级）");
		}
		if (option === "饵序" && parameters.length >= 1 && parameters.length <= 5) {
			if (parameters.length === 1 && parameters[0] === "清空") return preview("settings", { settings: { baitOrder: [] } });
			const baitOrder = parameters.map((value) => fishingBaits[value] ?? (Object.values(fishingBaits).includes(value) ? value : void 0));
			return baitOrder.every((value) => value !== void 0) && new Set(baitOrder).size === baitOrder.length ? preview("settings", { settings: { baitOrder } }) : error("/垂钓 设置 饵序 <备用饵> [备用饵 ...]");
		}
		return error("/垂钓 设置");
	}
	if (verb === "帮助") return values.length === 0 ? query("help") : error();
	if (verb === "操作") {
		const page = values[1] === void 0 ? void 0 : n(values[1]);
		return values.length <= 2 && id(values[0]) && (values[1] === void 0 || page !== void 0) ? query("operation", {
			operationId: values[0],
			...page === void 0 ? {} : { page }
		}) : error("/垂钓 操作 <原操作编号> [页码]");
	}
	if (verb === "建塘") return values.length === 0 ? preview("build") : error();
	if (verb === "收竿" || verb === "收杆") return values.length === 0 ? {
		operation: "fishing.stop-current",
		input: { kind: "stop-current" }
	} : error();
	if (verb === "升塘") return values.length === 0 ? preview("pond-upgrade") : error();
	if (verb === "升竿") return values.length === 1 && id(values[0]) ? preview("rod-upgrade", { rodId: values[0] }) : error("/垂钓 升竿 <原竿编号>");
	if (verb === "售鱼") {
		if (values.length === 0) return preview("sell-fish");
		return values.every(id) && values.length <= 10 ? preview("sell-fish", {
			fishIds: values,
			preserveUpgrade: false
		}) : error("/垂钓 售鱼 [完整鱼编号]");
	}
	if (verb === "区间售鱼") {
		if (values.length === 0) return query("sell-range");
		if (values.length === 1 && id(values[0])) return query("sell-range", { speciesId: values[0] });
		const minWeightG = fishingWeightGrams(values[0]);
		const maxWeightG = fishingWeightGrams(values[1]);
		const speciesId = values[2];
		return values.length >= 2 && values.length <= 3 && minWeightG !== void 0 && maxWeightG !== void 0 && minWeightG <= maxWeightG && (speciesId === void 0 || id(speciesId)) ? preview("sell-fish-range", {
			minWeightG,
			maxWeightG,
			...speciesId ? { speciesId } : {}
		}) : error("/垂钓 区间售鱼 <最低kg> <最高kg> [鱼种编号]（最多3位小数，闭区间）");
	}
	if (verb === "锁鱼" || verb === "解锁鱼") return values.length === 1 && id(values[0]) ? preview("fish-lock", {
		catchId: values[0],
		lock: verb === "锁鱼"
	}) : error(`/垂钓 ${verb} <完整鱼编号>`);
	if (verb === "购买") {
		const hasCurrency = values.length === 3;
		const currency = hasCurrency ? currencies[values[0]] : void 0;
		const sku = values[hasCurrency ? 1 : 0];
		const quantity = n(values[hasCurrency ? 2 : 1], 1, Number.MAX_SAFE_INTEGER);
		if (/^chum:[^:]+:\d+$/.test(sku ?? "")) return error("/垂钓 渔市（窝料已取消等级，请重新选择）");
		if (sku?.startsWith("bait:") && ["crystal", "dao"].includes(currency ?? "")) return error("鱼饵仅在灵石或灵鳞钱页出售");
		return (values.length === 2 || hasCurrency && currency) && id(sku) && quantity ? {
			operation: "fishing.purchase",
			input: {
				kind: "purchase",
				sku,
				quantity,
				...currency ? { currency } : {}
			}
		} : error("/垂钓 购买 [支付币种] <商品编号> <整包份数>");
	}
	if (verb === "兑换") {
		const currency = currencies[values[0]];
		const quantity = n(values[1], 1, Number.MAX_SAFE_INTEGER);
		return values.length === 2 && ["crystal", "stone"].includes(currency) && quantity ? preview("cashout", {
			currency,
			quantity
		}) : error("/垂钓 兑换 <灵晶|灵石> <数量>");
	}
	if (verb === "开钓") {
		if (!values.length) return {
			operation: "fishing.start-current",
			input: { kind: "start-current" }
		};
		if (values.length === 1) return id(values[0]) ? {
			operation: "fishing.start-current",
			input: {
				kind: "start-current",
				rodId: values[0]
			}
		} : error("/垂钓 开钓 [原竿编号]");
		const waterLevel = n(values[0], 1, 9);
		const hours = n(values[1], 1, 12);
		const baitType = fishingBaits[values[3]] ?? (Object.values(fishingBaits).includes(values[3]) ? values[3] : void 0);
		const baitCount = n(values[4], 1, 1e6);
		const chumType = ["none", "无窝"].includes(values[5]) ? "none" : fishingChums[values[5]] ?? (Object.values(fishingChums).includes(values[5]) ? values[5] : void 0);
		const chumCount = values[6] === void 0 || values[6] === "0" ? 0 : n(values[6], 1, 1e3);
		const chumTier = values[7] === void 0 || values[7] === "0" ? 0 : void 0;
		if (![
			5,
			7,
			8
		].includes(values.length) || !waterLevel || !hours || ![
			1,
			4,
			6,
			8,
			12
		].includes(hours) || !id(values[2]) || !baitType || !baitCount || values.length > 5 && (!chumType || chumCount === void 0 || chumTier === void 0)) return error("/垂钓 开钓 <水域1-9> <小时> <竿编号> <饵名> <份数> [散名 原始份数]");
		return preview("start", {
			waterLevel,
			hours,
			rodId: values[2],
			baitType,
			baitCount,
			...values.length > 5 && chumType ? {
				chumType,
				chumCount,
				chumTier
			} : {}
		});
	}
	if (verb === "开钓配置") return values.length === 1 && id(values[0]) ? query("start", { rodId: values[0] }) : error("/垂钓 开钓配置 <原竿编号>");
	return error();
}

//#endregion
export { fishingWeightGrams, isFishingInventoryCommand, parseFishingCommand };