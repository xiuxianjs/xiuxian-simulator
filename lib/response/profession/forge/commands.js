//#region src/response/profession/forge/commands.ts
const forgeReadEntries = ["我的锻造", "锻造指引"];
const forgeReadCommands = [
	"锻造图纸详情",
	"锻造作品详情",
	"锻造委托详情",
	"锻造图纸",
	"锻造作品",
	"锻造委托"
];
const forgeReadRoutes = forgeReadCommands.map((path) => ({
	path,
	schema: { args: [{
		name: "arguments",
		rules: [{ type: "rest" }]
	}] }
}));

//#endregion
export { forgeReadCommands, forgeReadEntries, forgeReadRoutes };