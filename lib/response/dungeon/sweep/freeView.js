import { displayCurrencyText } from "../../../constants/currency.js";
import { withBusinessRecovery } from "../../businessRecovery.js";
import { dungeonSweepView } from "./view.js";
import { dungeonExperienceBonusLines } from "../experienceBonus.js";

//#region src/response/dungeon/sweep/freeView.ts
function treasureRewardLines({ name, benefits }) {
	const gains = /* @__PURE__ */ new Map();
	const other = [];
	for (const benefit of benefits) {
		const match = /^额外获得 ([^\r\n]+)×([1-9]\d*)$/.exec(benefit);
		if (match) {
			const [, reward, amount] = match;
			gains.set(reward, (gains.get(reward) ?? 0n) + BigInt(amount));
		} else other.push(benefit);
	}
	const experience = gains.get("修为");
	gains.delete("修为");
	const drops = [...gains].map(([reward, amount]) => `${reward}×${amount}`);
	return [
		...experience ? [`奖励：${name} · 修为 +${experience}`] : [],
		...drops.length ? [`掉落：${name} · ${drops.join("、")}`] : [],
		...other.map((benefit) => `说明：${name} · ${benefit}`)
	];
}
function freeSweepSections(data) {
	const currencies = /* @__PURE__ */ new Map();
	for (const dungeon of data.sweptDungeons) for (const reward of dungeon.currency) {
		const name = displayCurrencyText(reward.name);
		currencies.set(name, (currencies.get(name) ?? 0n) + BigInt(reward.amount));
	}
	const treasureExperience = data.totalExp - (data.normalExperienceGained ?? data.totalExp);
	const rewards = [`修为 +${data.totalExp}${treasureExperience > 0 ? `（含宝物 +${treasureExperience}）` : ""}`, ...[...currencies].map(([name, amount]) => `${name} +${amount}`)];
	const sections = [{ lines: [`结果：${data.sweptDungeons.length} 个秘境 · 免费扫荡 ${data.totalTimes} 次`, `奖励：${rewards.join(" · ")}`] }];
	for (const dungeon of data.sweptDungeons) {
		const item = dungeonSweepView(dungeon);
		const koi = /^锦鲤赐福\+([1-9]\d*)$/.exec(item.experienceBonusText?.trim() ?? "");
		const experience = `修为 +${item.totalExp}${koi ? `（含锦鲤赐福 +${koi[1]}）` : ""}`;
		const result = [
			`扫荡 ${item.times} 次`,
			experience,
			item.totalCurrencyText.replaceAll(" | ", " · ")
		];
		sections.push({
			title: item.dungeonName,
			lines: [
				`结果：${result.filter(Boolean).join(" · ")}`,
				...item.totalItemsText ? [`掉落：${item.totalItemsText}`] : [],
				...koi ? [] : dungeonExperienceBonusLines(item.experienceBonusText).map((note) => `说明：${note}`)
			]
		});
	}
	if (data.treasureEffects?.length) sections.push({
		title: "宝物加成",
		lines: data.treasureEffects.flatMap(treasureRewardLines)
	});
	for (const item of data.skippedDungeons) {
		const recovery = withBusinessRecovery("dungeon.sweep", {
			title: "",
			heading: "",
			text: item.message,
			buttons: [],
			advice: []
		});
		sections.push({
			title: item.dungeonName,
			suffix: " · 未完成",
			lines: [`结果：${item.message}`, ...recovery.advice.map((tip) => `说明：${tip.description}`)],
			actions: recovery.advice.map((tip) => ({
				label: tip.command,
				command: tip.command
			}))
		});
	}
	return sections;
}

//#endregion
export { freeSweepSections };