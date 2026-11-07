import { BackendAPIError } from "./client.js";

//#region src/api/bot/fishing.ts
const fishingViews = [
	"boss",
	"boss-drops",
	"boss-battle",
	"boss-rewards",
	"contest",
	"contest-species",
	"contest-ranking",
	"contest-rewards",
	"contest-history",
	"sell-realm",
	"sell-range",
	"materials",
	"chum",
	"cast",
	"tools",
	"settings",
	"pending",
	"blessing",
	"overview",
	"probabilities",
	"start",
	"species",
	"bag-materials",
	"instances",
	"fish",
	"gear",
	"shop",
	"packages",
	"catalog",
	"history",
	"help",
	"operation"
];
const fishingKinds = [
	"boss-challenge",
	"sell-fish-range",
	"sell-material",
	"use-chum",
	"use-net",
	"settings",
	"build",
	"start-current",
	"stop-current",
	"start",
	"stop",
	"sell-fish",
	"pond-upgrade",
	"rod-switch",
	"rod-upgrade",
	"purchase",
	"cashout",
	"fish-lock",
	"blessing-unlock"
];
const fishingCurrencies = [
	"coin",
	"stone",
	"crystal",
	"dao"
];
const fishingShopCategories = [
	"all",
	"fish",
	"bait",
	"chum",
	"rod",
	"net",
	"material"
];
const fishingBaits = {
	素灵饵: "plain",
	定鳞饵: "steady",
	聚灵饵: "realm",
	引珍饵: "rare",
	唤王饵: "king"
};
const fishingChums = {
	聚鳞散: "basic",
	催鳞散: "advanced",
	引珍散: "attract",
	唤王散: "king",
	引灵散: "realm",
	升灵散: "deep_realm"
};
const invalid = () => {
	throw new BackendAPIError("垂钓响应不完整，请核对原操作结果。", "SDK_INVALID_RESPONSE");
};
const row = (value) => {
	if (!value || typeof value !== "object" || Array.isArray(value)) return invalid();
	return value;
};
const text = (value) => typeof value === "string" ? value : invalid();
const integer = (value, minimum = 0) => typeof value === "number" && Number.isSafeInteger(value) && value >= minimum ? value : invalid();
const array = (value, decode) => Array.isArray(value) ? value.map(decode) : invalid();
function validFishingReference(ref, kind = "y") {
	return ref.length <= 64 && /^r1_[1-9a-z][0-9a-z]*_[yz]_[1-9a-z][0-9a-z]*_[0-9a-f]{24}$/.test(ref) && ref.split("_", 3)[2] === kind;
}
function validFishingEventID(value) {
	return /^[A-Za-z0-9_.:-]{1,40}$/.test(value);
}
function fishingCalendarDate(value) {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return;
	const date = /* @__PURE__ */ new Date(value + "T00:00:00.000Z");
	return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? date : void 0;
}
function validFishingDate(value) {
	return fishingCalendarDate(value) !== void 0;
}
/** Absolute Shanghai week key; never reinterpret a previous week's claim. */
function validFishingWeek(value) {
	return fishingCalendarDate(value)?.getUTCDay() === 1;
}
function referenceOwner(ref) {
	return [...ref.split("_")[1]].reduce((total, character) => total * 36n + BigInt(parseInt(character, 36)), 0n);
}
/** Service commands remain manual. Never truncate an asset ID or confirmation. */
function validFishingCommand(command) {
	return command.startsWith("/") && !/[\r\n\0]/.test(command) && [...command].length <= 80;
}
const action = (value) => {
	const item = row(value);
	const label = text(item.label);
	const command = text(item.command);
	if (!label.trim() || !validFishingCommand(command)) return invalid();
	return {
		label,
		command
	};
};
const absent = (value) => value === void 0 || value === null;
/** One strict DTO for query, original preview and committed receipt. */
function parseFishingView(value, uid, referenceKind = "y") {
	const data = row(value);
	const rulesVersion = text(data.rulesVersion);
	const view = text(data.view);
	const title = text(data.title);
	if (!rulesVersion.trim() || !view.trim() || !title.trim()) return invalid();
	const sections = array(data.sections, (value, index) => {
		const section = row(value);
		const actions = absent(section.actions) ? [] : array(section.actions, action);
		if (actions.length > (view === "blessing" || view === "overview" && index === 1 ? 4 : 3)) return invalid();
		return {
			title: absent(section.title) ? "" : text(section.title),
			id: absent(section.id) ? "" : text(section.id),
			suffix: absent(section.suffix) ? "" : text(section.suffix),
			lines: array(section.lines, text),
			actions,
			...absent(section.quote) ? {} : { quote: typeof section.quote === "boolean" ? section.quote : invalid() }
		};
	});
	if ([
		"species",
		"bag-materials",
		"instances",
		"pending",
		"market-fish-species",
		"market-fish-instances"
	].includes(view) && sections.length > 5) return invalid();
	const footer = absent(data.footer) ? [] : array(data.footer, action);
	if (footer.length > 8) return invalid();
	const result = {
		rulesVersion,
		view,
		title,
		sections,
		footer,
		status: absent(data.status) ? "" : text(data.status)
	};
	if (!absent(data.emphasisNames)) result.emphasisNames = array(data.emphasisNames, text);
	if (!absent(data.navRows)) {
		const rows = array(data.navRows, (value) => array(value, action));
		const inventoryTabs = [
			"species",
			"bag-materials",
			"market-fish-species",
			"market-fish-instances"
		].includes(view);
		const maxRows = view === "blessing" || inventoryTabs ? 3 : 2;
		const maxColumns = view === "blessing" ? 4 : 6;
		if (rows.length > maxRows || rows.some((row) => row.length > maxColumns) || inventoryTabs && rows.flat().length > 12) return invalid();
		result.navRows = rows;
	}
	if (!absent(data.nav)) {
		const nav = row(data.nav);
		const page = integer(nav.page, 1);
		const totalPages = integer(nav.totalPages, 1);
		const total = integer(nav.total);
		const command = text(nav.command);
		if (page > totalPages || !command.includes("{page}") || !validFishingCommand(command.replace("{page}", String(2147483647)))) return invalid();
		result.nav = {
			page,
			totalPages,
			total,
			command
		};
	}
	if (!absent(data.confirmationRef) && data.confirmationRef !== "") {
		const ref = text(data.confirmationRef);
		if (!validFishingReference(ref, referenceKind) || uid !== void 0 && (!Number.isSafeInteger(uid) || uid < 1 || referenceOwner(ref) !== BigInt(uid))) return invalid();
		result.confirmationRef = ref;
	}
	if (!absent(data.operationId) && data.operationId !== "") result.operationId = text(data.operationId);
	if (!absent(data.expiresAt)) {
		const expiresAt = text(data.expiresAt);
		if (!Number.isFinite(Date.parse(expiresAt))) return invalid();
		result.expiresAt = expiresAt;
	}
	if (result.confirmationRef && (!result.operationId?.trim() || !result.expiresAt || !sections.length)) return invalid();
	return result;
}

//#endregion
export { fishingBaits, fishingChums, fishingCurrencies, fishingKinds, fishingShopCategories, fishingViews, parseFishingView, validFishingCommand, validFishingDate, validFishingEventID, validFishingReference, validFishingWeek };