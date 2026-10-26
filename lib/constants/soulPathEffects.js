//#region src/constants/soulPathEffects.ts
const SOUL_EFFECT_CONFIG = {
	xuan_fa: {
		minor: { magicAttack: 4 },
		complete: {
			magicAttack: 8,
			magicDefense: 3
		}
	},
	lian_ti: {
		minor: {
			hp: 5,
			physicalDefense: 2,
			magicDefense: 2
		},
		complete: {
			hp: 8,
			physicalDefense: 4,
			magicDefense: 4
		}
	},
	yu_qi: {
		minor: {
			speed: 2,
			artifact: 15,
			cap: 3
		},
		complete: {
			speed: 4,
			artifact: 25,
			cap: 5
		}
	}
};
/** 玩家说明与结算共用系数，避免修改数值后文案仍显示旧值。 */
function describeSoulNode(path, stage) {
	let description;
	if (path === "xuan_fa") {
		const value = SOUL_EFFECT_CONFIG.xuan_fa[stage];
		description = `法攻+${value.magicAttack}%${"magicDefense" in value ? ` · 法防+${value.magicDefense}%` : ""}`;
	} else if (path === "lian_ti") {
		const value = SOUL_EFFECT_CONFIG.lian_ti[stage];
		description = `生命+${value.hp}% · 双防+${value.physicalDefense}%`;
	} else {
		const value = SOUL_EFFECT_CONFIG.yu_qi[stage];
		description = `速度+${value.speed}% · 本命物攻防、生命贡献+${value.artifact}%（各项增量上限：原最终值${value.cap}%）`;
	}
	return `${description}${stage === "complete" ? "；替代小成加成" : ""}。`;
}

//#endregion
export { SOUL_EFFECT_CONFIG, describeSoulNode };