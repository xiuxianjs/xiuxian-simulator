//#region src/response/alchemy/v2/commands.ts
const alchemyRoutes = [
	"丹方详情",
	"丹方列表",
	"查看丹方",
	"丹方",
	"加入炼丹师",
	"成为炼丹师",
	"继续炼丹指引",
	"看向元师叔",
	"一键炼丹",
	"炼制",
	"炼丹师进阶",
	"炼丹进阶",
	"新手融臣结束",
	"新手融臣",
	"新手凝丹",
	"融臣结束",
	"融臣",
	"凝丹",
	"炼丹"
];
function normalizeAlchemyCommand(text) {
	const [root, ...args] = text.trim().replace(/^[/#＃]/, "").trim().split(/\s+/);
	const suffix = args.length ? ` ${args.join(" ")}` : "";
	if ([
		"丹方",
		"丹方列表",
		"查看丹方"
	].includes(root)) return `/炼丹 丹方${suffix}`;
	if (root === "丹方详情") return `/炼丹 预览${suffix} 1`;
	if ([
		"加入炼丹师",
		"成为炼丹师",
		"继续炼丹指引",
		"看向元师叔"
	].includes(root)) return "/炼丹 入门";
	if (["炼制", "一键炼丹"].includes(root)) return `/炼丹 炼制${suffix}`;
	if (["炼丹师进阶", "炼丹进阶"].includes(root)) return `/炼丹 进阶${suffix}`;
	if (alchemyRoutes.includes(root) && root !== "炼丹") return "/炼丹";
	if (root === "炼丹") return `/炼丹${suffix}`;
	return text;
}

//#endregion
export { alchemyRoutes, normalizeAlchemyCommand };