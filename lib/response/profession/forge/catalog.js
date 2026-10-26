//#region src/response/profession/forge/catalog.ts
function parseForgeCatalogArguments(args) {
	const filtered = [
		"全部",
		"考核",
		"可制作"
	].some((filter) => filter === args[0]);
	const filter = filtered ? args[0] : "全部";
	const pages = filtered ? args.slice(1) : args;
	if (pages.length > 1 || pages.length === 1 && !/^\d+$/.test(pages[0])) return null;
	const page = pages.length ? Number(pages[0]) : 1;
	return Number.isSafeInteger(page) && page > 0 ? {
		filter,
		page
	} : null;
}
function forgeRecipesForFilter(overview, filter) {
	if (filter === "可制作") return overview.recipes.filter((recipe) => recipe.canCraft);
	if (filter === "考核") return overview.joined ? overview.recipes.filter((recipe) => recipe.requiredLevel === overview.level && recipe.assessment && !recipe.completed) : [];
	return overview.recipes;
}
function forgeCatalogCommand(query) {
	return `/锻造图纸 ${query.filter} ${query.page}`;
}

//#endregion
export { forgeCatalogCommand, forgeRecipesForFilter, parseForgeCatalogArguments };