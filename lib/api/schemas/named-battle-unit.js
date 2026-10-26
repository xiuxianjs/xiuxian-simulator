//#region src/api/schemas/named-battle-unit.ts
function parseNamedBattleUnit(value, errorMessage) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(errorMessage);
	const unit = value;
	const name = unit.Name === void 0 ? unit.name : unit.Name;
	const hp = unit.HP === void 0 ? unit.hp : unit.HP;
	const maxHp = unit.MaxHP === void 0 ? unit.maxHp : unit.MaxHP;
	const dead = unit.Dead === void 0 ? unit.dead : unit.Dead;
	if (typeof name !== "string" || typeof hp !== "number" || !Number.isSafeInteger(hp) || typeof maxHp !== "number" || !Number.isSafeInteger(maxHp) || typeof dead !== "boolean") throw new Error(errorMessage);
	return {
		name,
		hp,
		maxHp,
		isDead: dead || hp <= 0
	};
}

//#endregion
export { parseNamedBattleUnit };