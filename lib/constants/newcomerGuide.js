//#region src/constants/newcomerGuide.ts
const NEWCOMER_PROLOGUE = "陨星荒野边缘，通往桃花镇的山径渐渐隐入夜色。你正辨认方向，一根幡杆忽然横在身前。\n\n黑袍修士扫过你空着的双手：“凡人？倒省了麻烦。”\n\n他转动幡杆，阴冷的黑雾贴着地面向你漫来。\n\n系统：先退开，别碰那团黑雾。";
const GUIDE_ACTION_BAR = [{
	label: "避开黑雾",
	command: "/继续"
}, {
	label: "跳过剧情",
	command: "/跳过引导"
}];
const newcomerGreeting = (name) => `接下来熟悉修行的基本玩法。${name}，你的仙途从此刻开始。`;
function guideActionBar(action) {
	const labels = {
		"step-3": "寻找破绽",
		"step-4": "引气入体",
		"promotion-failed": "核对后再试",
		"step-5": "领取起步资源"
	};
	return GUIDE_ACTION_BAR.map((button) => button.command === "/继续" && action && labels[action] ? {
		...button,
		label: labels[action]
	} : button);
}

//#endregion
export { GUIDE_ACTION_BAR, NEWCOMER_PROLOGUE, guideActionBar, newcomerGreeting };