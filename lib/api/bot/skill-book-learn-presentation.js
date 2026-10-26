//#region src/api/bot/skill-book-learn-presentation.ts
const comparisonFields = [
	[
		"physicalAttack",
		"物攻",
		false
	],
	[
		"magicAttack",
		"法攻",
		false
	],
	[
		"physicalDefense",
		"物防",
		false
	],
	[
		"magicDefense",
		"法防",
		false
	],
	[
		"hp",
		"气血",
		false
	],
	[
		"physicalAttackPercent",
		"物攻加成",
		true
	],
	[
		"magicAttackPercent",
		"法攻加成",
		true
	],
	[
		"physicalDefensePercent",
		"物防加成",
		true
	],
	[
		"magicDefensePercent",
		"法防加成",
		true
	],
	[
		"hpPercent",
		"气血加成",
		true
	],
	[
		"speed",
		"速度",
		false
	],
	[
		"critRate",
		"暴击率",
		true
	],
	[
		"critDamage",
		"暴击伤害",
		true
	]
];
function comparison(oldMaximum, targetMaximum) {
	return comparisonFields.flatMap(([key, label, percent]) => {
		const oldValue = oldMaximum[key];
		const targetValue = targetMaximum[key];
		if (oldValue === 0 && targetValue === 0) return [];
		return [`${label}: ${oldValue}${percent ? "%" : ""} -> ${targetValue}${percent ? "%" : ""}（${targetValue > oldValue ? "↑" : targetValue < oldValue ? "↓" : "→"}）`];
	});
}
function summary(label, book) {
	return `${label}：${book.name ? `【${book.name}】` : "【未知功法】"}${book.grade ? `【${book.grade}】` : ""}${book.realm ? `【${book.realm}】` : ""}`;
}
function comparisonSection(lines) {
	return lines.length === 0 ? "" : `\n\n满级上限对比\n${lines.map((line) => `> ${line}`).join("\n")}`;
}
function skillBookLearnConfirmation(result) {
	const lines = comparison(result.oldMaximum, result.targetMaximum);
	return `检测到已学习相同技能的功法，是否替换？\n\n${summary("已学", result.oldSkillBook)}\n${summary("待学", result.skillBook)}${comparisonSection(lines)}\n\n熟练度继承：${result.oldSkillBook.proficiency}%`;
}

//#endregion
export { skillBookLearnConfirmation };