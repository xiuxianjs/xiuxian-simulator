import { BackendAPIError } from "./client.js";

//#region src/api/bot/treasures.ts
function invalid() {
	throw new BackendAPIError("宝物业务响应不完整", "SDK_INVALID_RESPONSE");
}
function row(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) return invalid();
	return value;
}
function text(value) {
	if (typeof value !== "string") return invalid();
	return value;
}
function number(value) {
	if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return invalid();
	return value;
}
function integer(value) {
	const result = number(value);
	if (!Number.isSafeInteger(result)) return invalid();
	return result;
}
function bool(value) {
	if (typeof value !== "boolean") return invalid();
	return value;
}
function array(value, parse) {
	if (!Array.isArray(value)) return invalid();
	return value.map(parse);
}
function date(value) {
	const result = text(value);
	if (!Number.isFinite(Date.parse(result))) return invalid();
	return result;
}
function nullableDate(value) {
	return value === null ? null : date(value);
}
const treasureAttributeNames = {
	physicalAttack: "物攻",
	magicAttack: "法攻",
	physicalDefense: "物防",
	magicDefense: "法防",
	hp: "生命"
};
function attributes(value) {
	const item = row(value);
	return {
		physicalAttack: number(item.physicalAttack),
		magicAttack: number(item.magicAttack),
		physicalDefense: number(item.physicalDefense),
		magicDefense: number(item.magicDefense),
		hp: number(item.hp)
	};
}
function rarity(value) {
	const result = integer(value);
	if (result < 1 || result > 6) return invalid();
	return result;
}
function definition(value) {
	const item = row(value);
	return {
		id: integer(item.id),
		name: text(item.name),
		rarity: rarity(item.rarity),
		rarityName: text(item.rarityName),
		baseAttributes: attributes(item.baseAttributes),
		perLevelAttributes: attributes(item.perLevelAttributes),
		basePercentAttributes: attributes(item.basePercentAttributes),
		effectDescription: text(item.effectDescription),
		stageValues: array(item.stageValues, text),
		maxGrade: integer(item.maxGrade),
		weight: number(item.weight)
	};
}
function promotion(value) {
	if (value === null) return null;
	const item = row(value);
	return {
		duplicates: integer(item.duplicates),
		xianYun: integer(item.xianYun),
		requirements: array(item.requirements, text)
	};
}
function cultivationPreview(value) {
	const item = row(value);
	const grade = integer(item.grade);
	const level = integer(item.level);
	if (grade < 1 || grade > 24 || level < 1) return invalid();
	return {
		grade,
		gradeName: text(item.gradeName),
		level,
		attributes: attributes(item.attributes),
		percentAttributes: attributes(item.percentAttributes)
	};
}
function ownedTreasure(value) {
	const item = row(value);
	return {
		definition: definition(item.definition),
		owned: bool(item.owned),
		grade: integer(item.grade),
		gradeName: text(item.gradeName),
		level: integer(item.level),
		fragments: integer(item.fragments),
		duplicates: integer(item.duplicates),
		attributes: attributes(item.attributes),
		percentAttributes: attributes(item.percentAttributes),
		currentEffect: text(item.currentEffect),
		nextLevelCost: integer(item.nextLevelCost),
		promotion: promotion(item.promotion),
		canUpgrade: bool(item.canUpgrade),
		canPromote: bool(item.canPromote),
		...item.upgradePreview === void 0 ? {} : { upgradePreview: cultivationPreview(item.upgradePreview) },
		...item.promotionPreview === void 0 ? {} : { promotionPreview: cultivationPreview(item.promotionPreview) }
	};
}
function fortune(value) {
	const item = row(value);
	const bonus = row(item.bonus);
	return {
		score: number(item.score),
		level: integer(item.level),
		maxLevel: integer(item.maxLevel),
		nextThreshold: item.nextThreshold === null ? null : number(item.nextThreshold),
		bonus: {
			critRate: number(bonus.critRate),
			critDamage: number(bonus.critDamage),
			hitRate: number(bonus.hitRate),
			dodgeRate: number(bonus.dodgeRate)
		}
	};
}
function parseTreasureOverview(value) {
	const item = row(value);
	return {
		items: array(item.items, ownedTreasure),
		experience: integer(item.experience),
		xianYun: integer(item.xianYun),
		levelCap: integer(item.levelCap),
		fortune: fortune(item.fortune),
		version: integer(item.version),
		decompositionValues: array(item.decompositionValues, (value) => {
			const v = row(value);
			return {
				rarity: rarity(v.rarity),
				bodyXianYun: integer(v.bodyXianYun),
				fragmentXianYun: integer(v.fragmentXianYun)
			};
		}),
		records: array(item.records, (value) => {
			const v = row(value);
			return {
				operationId: text(v.operationId),
				kind: text(v.kind),
				createdAt: date(v.createdAt),
				message: text(v.message)
			};
		})
	};
}
function parseTreasureCatalog(value) {
	return array(value, definition);
}
const sources = [
	"free",
	"spirit_crystal",
	"dao_crystal",
	"treasure_map"
];
function source(value) {
	if (!sources.includes(value)) return invalid();
	return value;
}
function reward(value) {
	const item = row(value);
	if (!["fragment", "body"].includes(String(item.kind))) return invalid();
	const autoSynthesized = item.autoSynthesized === void 0 ? 0 : integer(item.autoSynthesized);
	const fragmentsRemaining = item.fragmentsRemaining === void 0 ? void 0 : integer(item.fragmentsRemaining);
	if (fragmentsRemaining !== void 0 && fragmentsRemaining > 9) return invalid();
	return {
		treasureId: integer(item.treasureId),
		name: text(item.name),
		rarity: rarity(item.rarity),
		kind: text(item.kind),
		quantity: integer(item.quantity),
		newlyOwned: bool(item.newlyOwned),
		autoSynthesized,
		fragmentsRemaining,
		...item.pullIndex === void 0 ? {} : { pullIndex: integer(item.pullIndex) },
		forcedComplete: item.forcedComplete === void 0 ? false : bool(item.forcedComplete)
	};
}
function validateIndependentRewards(rewards, count, priority = false) {
	if (priority && rewards.length !== count || rewards.length < count || rewards.length > count * 3) return invalid();
	const pulls = /* @__PURE__ */ new Map();
	for (const item of rewards) {
		if (item.pullIndex === void 0 || item.pullIndex < 1 || item.pullIndex > count || Math.floor(item.treasureId / 100) !== item.rarity || item.treasureId % 100 < 1 || item.treasureId % 100 > 4 || !item.name.trim()) return invalid();
		const group = pulls.get(item.pullIndex) ?? [];
		group.push(item);
		pulls.set(item.pullIndex, group);
	}
	let previousBody = false;
	for (let index = 1; index <= count; index++) {
		const group = pulls.get(index);
		if (!group?.length || group.length > (priority ? 1 : 3)) return invalid();
		if (group.length === 1 && group[0].kind === "fragment") {
			const item = group[0];
			if (item.quantity < 1 || item.quantity > 3 || item.autoSynthesized > 1 || item.forcedComplete) return invalid();
			continue;
		}
		if (group.some((item) => item.kind !== "body" || item.quantity !== 1 || item.autoSynthesized !== 0 || (item.fragmentsRemaining ?? 0) !== 0) || group.length > 1 && (group.some((item) => item.rarity < 4) || new Set(group.map((item) => item.rarity)).size !== group.length)) return invalid();
		const forced = count === 10 && index === 10 && !previousBody;
		if (group.some((item) => item.forcedComplete !== forced)) return invalid();
		previousBody = true;
	}
	if (count === 10 && !previousBody) return invalid();
}
function parseRelicsOverview(value) {
	const item = row(value);
	const balances = row(item.balances);
	const shape = row(item.shapeRates);
	return {
		...item.rulesVersion === void 0 ? {} : { rulesVersion: text(item.rulesVersion) },
		serverDate: date(item.serverDate),
		balances: {
			spiritCrystal: integer(balances.spiritCrystal),
			daoCrystal: integer(balances.daoCrystal),
			treasureMaps: integer(balances.treasureMaps)
		},
		freeAvailable: bool(item.freeAvailable),
		spiritTenDiscountAvailable: bool(item.spiritTenDiscountAvailable),
		totalExplorations: integer(item.totalExplorations),
		milestoneProgress: integer(item.milestoneProgress),
		pendingSelections: integer(item.pendingSelections),
		shapeRates: {
			singleComplete: number(shape.singleComplete),
			tenExpectedComplete: number(shape.tenExpectedComplete),
			tenAverageComplete: number(shape.tenAverageComplete)
		},
		pity: array(item.pity, (value) => {
			const p = row(value);
			return {
				rarity: rarity(p.rarity),
				name: text(p.name),
				counter: integer(p.counter),
				hardPity: integer(p.hardPity),
				nextProbability: number(p.nextProbability),
				...p.conditionalProbability === void 0 ? {} : { conditionalProbability: number(p.conditionalProbability) },
				...p.scope === void 0 ? {} : { scope: text(p.scope) }
			};
		}),
		wholeRates: array(item.wholeRates, (value) => {
			const p = row(value);
			return {
				rarity: rarity(p.rarity),
				name: text(p.name),
				probability: number(p.probability),
				...p.tenProbability === void 0 ? {} : { tenProbability: number(p.tenProbability) },
				...p.scope === void 0 ? {} : { scope: text(p.scope) }
			};
		}),
		rules: array(item.rules, text),
		records: array(item.records, (value) => {
			const record = row(value);
			return {
				operationId: text(record.operationId),
				createdAt: date(record.createdAt),
				source: source(record.source),
				count: integer(record.count),
				paidAmount: integer(record.paidAmount),
				rewards: array(record.rewards, reward)
			};
		})
	};
}
function parseSpiritVein(value) {
	const item = row(value);
	return {
		active: bool(item.active),
		startDate: nullableDate(item.startDate),
		endDate: nullableDate(item.endDate),
		remainingDays: integer(item.remainingDays),
		claimableDays: integer(item.claimableDays),
		claimableCrystal: integer(item.claimableCrystal),
		...item.claimedDays === void 0 ? {} : { claimedDays: integer(item.claimedDays) },
		...item.totalDays === void 0 ? {} : { totalDays: integer(item.totalDays) },
		...item.futureDays === void 0 ? {} : { futureDays: integer(item.futureDays) },
		...item.reservedDays === void 0 ? {} : { reservedDays: integer(item.reservedDays) },
		maxDays: integer(item.maxDays),
		packageId: item.packageId === null ? null : integer(item.packageId),
		priceAmount: integer(item.priceAmount),
		dailyCrystal: integer(item.dailyCrystal),
		immediateDaoCrystal: integer(item.immediateDaoCrystal),
		canPurchase: bool(item.canPurchase),
		purchaseUnavailableReason: item.purchaseUnavailableReason === void 0 ? void 0 : text(item.purchaseUnavailableReason)
	};
}
const kinds = [
	"explore",
	"synthesize",
	"upgrade",
	"promote",
	"select-mythic",
	"claimLease",
	"decompose",
	"batch-promote",
	"batch-upgrade"
];
function validTreasureConfirmationRef(value) {
	return /^r1_[0-9a-z]{1,13}_b_[0-9a-z]{1,13}_[0-9a-f]{24}$/.test(value) && [...`/确认宝物 ${value}`].length <= 80;
}
function parseTreasureConfirmation(value) {
	const item = row(value);
	if (!kinds.includes(item.kind)) return invalid();
	const confirmationRef = text(item.confirmationRef);
	if (!validTreasureConfirmationRef(confirmationRef)) return invalid();
	return {
		kind: item.kind,
		summary: array(item.summary, text),
		confirmationRef,
		expiresAt: date(item.expiresAt),
		operationId: text(item.operationId)
	};
}
function parseTreasureReceipt(value) {
	const item = row(value);
	if (!kinds.includes(item.kind)) return invalid();
	const result = row(item.result);
	if (result.operationId !== item.operationId) return invalid();
	if (item.kind === "explore" && (!Array.isArray(result.rewards) || result.rewards.length < integer(result.count))) return invalid();
	if (item.kind === "explore") {
		const count = integer(result.count);
		if (![1, 10].includes(count)) return invalid();
		if ([
			"treasure-v5-priority-20261029",
			"treasure-v6-shape12-20261029",
			"treasure-v7-v5-shape12-20261029",
			"treasure-v8-first-guards-20261029",
			"treasure-v9-first-guards-merge-20261029"
		].includes(String(result.rulesVersion))) {
			if (result.experienceGranted !== count * 100) return invalid();
			validateIndependentRewards(array(result.rewards, reward), count, true);
		} else if (result.rulesVersion === "treasure-v4-independent-20261029") {
			if (result.experienceGranted !== count * 100) return invalid();
			validateIndependentRewards(array(result.rewards, reward), count);
		} else if (result.rulesVersion === "treasure-v3-complete-20261027") {
			if (result.rewards.length !== count || result.experienceGranted !== count * 100) return invalid();
		} else if (!["treasure-v1-20261027", "treasure-v2-20261027-first-drop"].includes(String(result.rulesVersion))) return invalid();
	}
	const batchItems = item.kind === "batch-promote" || item.kind === "batch-upgrade" ? array(result.items, (value) => {
		const entry = row(value);
		return {
			treasureId: integer(entry.treasureId),
			name: text(entry.name),
			rarity: rarity(entry.rarity),
			fromLevel: integer(entry.fromLevel),
			toLevel: integer(entry.toLevel),
			fromGrade: integer(entry.fromGrade),
			toGrade: integer(entry.toGrade),
			experienceCost: integer(entry.experienceCost),
			duplicatesCost: integer(entry.duplicatesCost),
			xianYunCost: integer(entry.xianYunCost),
			...entry.fromGradeName === void 0 ? {} : { fromGradeName: text(entry.fromGradeName) },
			...entry.toGradeName === void 0 ? {} : { toGradeName: text(entry.toGradeName) }
		};
	}) : void 0;
	if (batchItems && !batchItems.length) return invalid();
	return {
		kind: item.kind,
		operationId: text(item.operationId),
		result: {
			operationId: text(result.operationId),
			message: text(result.message),
			...item.kind === "explore" ? {
				rewards: array(result.rewards, reward),
				rulesVersion: text(result.rulesVersion),
				source: source(result.source),
				count: integer(result.count),
				paidAmount: integer(result.paidAmount),
				experienceGranted: integer(result.experienceGranted)
			} : {},
			...item.kind === "claimLease" ? {
				days: integer(result.days),
				spiritCrystal: integer(result.spiritCrystal)
			} : {},
			...batchItems ? {
				items: batchItems,
				experienceCost: integer(result.experienceCost),
				duplicatesCost: integer(result.duplicatesCost),
				xianYunCost: integer(result.xianYunCost)
			} : {}
		}
	};
}
function parseTreasureDailyPacks(value) {
	const data = row(value);
	return {
		serverDate: date(data.serverDate),
		unresolvedOrderNo: data.unresolvedOrderNo === null ? null : text(data.unresolvedOrderNo),
		quotas: array(data.quotas, (value) => {
			const q = row(value);
			return {
				sku: text(q.sku),
				limit: integer(q.limit),
				successful: integer(q.successful),
				pending: integer(q.pending),
				remaining: integer(q.remaining)
			};
		}),
		products: array(data.products, (value) => {
			const p = row(value);
			return {
				sku: text(p.sku),
				name: text(p.name),
				packageId: p.packageId === null ? null : integer(p.packageId),
				priceAmount: integer(p.priceAmount),
				basePriceAmount: p.basePriceAmount === void 0 ? integer(p.priceAmount) : integer(p.basePriceAmount),
				creditedAmount: p.creditedAmount === void 0 ? 0 : integer(p.creditedAmount),
				canClaimFree: p.canClaimFree === void 0 ? false : bool(p.canClaimFree),
				limit: integer(p.limit),
				remaining: integer(p.remaining),
				available: bool(p.available),
				unavailableReason: text(p.unavailableReason),
				label: text(p.label),
				promotionTexts: array(p.promotionTexts, text),
				rewardParts: array(p.rewardParts, (value) => {
					const r = row(value);
					return {
						kind: text(r.kind),
						name: text(r.name),
						quantity: integer(r.quantity),
						independentRolls: r.independentRolls === void 0 ? void 0 : integer(r.independentRolls),
						perRoll: r.perRoll === void 0 ? void 0 : integer(r.perRoll)
					};
				})
			};
		})
	};
}
function parseDailyPackFreePreview(value) {
	const data = row(value);
	const confirmationRef = text(data.confirmationRef);
	const summary = array(data.summary, text);
	const operationId = text(data.operationId);
	if (data.kind !== "daily-pack-free" || !validTreasureConfirmationRef(confirmationRef) || !summary.length || summary.some((line) => !line.trim()) || !operationId.trim()) return invalid();
	return {
		kind: "daily-pack-free",
		confirmationRef,
		summary,
		expiresAt: date(data.expiresAt),
		operationId
	};
}
function parseDailyPackFreeReceipt(value) {
	const data = row(value);
	const result = row(data.result);
	const grant = row(result.dailyTreasurePack);
	if (data.kind !== "daily-pack-free" || result.operationId !== data.operationId || !text(data.operationId).trim() || grant.sku !== "all") return invalid();
	return {
		operationId: text(data.operationId),
		message: text(result.message),
		grant: {
			businessDate: date(grant.businessDate),
			spiritCrystal: integer(grant.spiritCrystal),
			daoCrystal: integer(grant.daoCrystal),
			treasureMaps: integer(grant.treasureMaps),
			fragments: array(grant.fragments, (value) => {
				const item = row(value);
				return {
					treasureId: integer(item.treasureId),
					name: text(item.name),
					rarity: rarity(item.rarity),
					quantity: integer(item.quantity)
				};
			}),
			promotionTexts: grant.promotionTexts === void 0 ? [] : array(grant.promotionTexts, text)
		}
	};
}
function parseSpiritVeinCalendar(value) {
	const data = row(value);
	const page = integer(data.page);
	const totalPages = integer(data.totalPages);
	const totalDays = integer(data.totalDays);
	const items = array(data.items, (value) => {
		const item = row(value);
		const day = integer(item.day);
		const rewardDate = text(item.rewardDate);
		const time = Date.parse(`${rewardDate}T00:00:00Z`);
		if (day < 1 || day > totalDays || !/^\d{4}-\d{2}-\d{2}$/.test(rewardDate) || !Number.isFinite(time) || new Date(time).toISOString().slice(0, 10) !== rewardDate || ![
			"claimed",
			"claimable",
			"upcoming"
		].includes(String(item.state))) return invalid();
		return {
			day,
			rewardDate,
			spiritCrystal: integer(item.spiritCrystal),
			state: item.state
		};
	});
	if (page < 1 || totalPages < 1 || page > totalPages || items.length > 7) return invalid();
	return {
		page,
		totalPages,
		totalDays,
		items
	};
}

//#endregion
export { parseDailyPackFreePreview, parseDailyPackFreeReceipt, parseRelicsOverview, parseSpiritVein, parseSpiritVeinCalendar, parseTreasureCatalog, parseTreasureConfirmation, parseTreasureDailyPacks, parseTreasureOverview, parseTreasureReceipt, treasureAttributeNames, validTreasureConfirmationRef };