//#region src/api/bot/tianshi-baolu-command.ts
const TIANSHI_BAOLU_CATEGORY_MAP = {
	全部: "all",
	装备: "equipment_set",
	功法: "skill_book",
	本命: "soul_artifact"
};
const parseTianshiBaoluCommand = (messageText) => {
	const match = (messageText ?? "").trim().match(/^(!|！|\/|#|＃)?天师宝录(?:\s+(\S+))?(?:\s+p(\d+))?$/);
	const rawCategory = match?.[2] ?? "";
	const pageFromCategory = rawCategory.match(/^p(\d+)$/);
	const categoryLabel = pageFromCategory ? "全部" : rawCategory || "全部";
	const category = TIANSHI_BAOLU_CATEGORY_MAP[categoryLabel] ?? "all";
	const page = Math.max(1, Number(match?.[3] ?? pageFromCategory?.[1] ?? 1));
	return {
		category,
		categoryLabel: category === "all" ? "全部" : categoryLabel,
		page
	};
};

//#endregion
export { TIANSHI_BAOLU_CATEGORY_MAP, parseTianshiBaoluCommand };