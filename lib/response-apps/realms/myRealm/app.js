import { getBackendRealmOverview } from "../../../api/bot/realm-overview.js";
import { formatFoundationProbability, formatRealmRequirementDetails } from "../../../utils/realmRequirements.js";

//#region src/response-apps/realms/myRealm/app.ts
async function App(params) {
	try {
		const x = await getBackendRealmOverview(params.bid, params.uid);
		const r = x.realm;
		const b = x.breakthrough;
		const p = x.promotion;
		return {
			code: "OK",
			data: {
				sections: [{
					title: "我的境界",
					lines: [
						`当前境界：${r.name}`,
						`当前修为：${x.experience} / ${r.experienceLimit}`,
						`突破：${b.message}`,
						`晋级：${p.message}`
					]
				}, ...[
					{
						title: "突破条件",
						lines: formatRealmRequirementDetails(b)
					},
					{
						title: "晋级条件",
						lines: p.materialsHidden ? ["开启渡劫后查看准备要求"] : formatRealmRequirementDetails(p, true)
					},
					{
						title: "筑基概率",
						lines: formatFoundationProbability(p.probability)
					}
				].filter((section) => section.lines.length > 0)],
				canUseSoulPath: Boolean(x.access?.canUseSoulPath),
				showBreakthrough: Boolean(b.canBreak),
				showPromotion: !x.tribulationPreparation && Boolean(p.canPromote),
				showTribulation: Boolean(x.tribulationPreparation)
			}
		};
	} catch {
		return { code: "LOAD_FAILED" };
	}
}

//#endregion
export { App as default };