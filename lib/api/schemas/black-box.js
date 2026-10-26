//#region src/api/schemas/black-box.ts
/** Public Go DTOs only. Select every displayed field; never forward opaque private payloads. */
function object(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw Error("黑盒拍卖数据不完整");
	return value;
}
function text(value) {
	if (typeof value !== "string") throw Error("黑盒拍卖文本不完整");
	return value;
}
function number(value) {
	if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) throw Error("黑盒拍卖数值无效");
	return value;
}
function boolean(value) {
	if (typeof value !== "boolean") throw Error("黑盒拍卖状态不完整");
	return value;
}
function array(value, parse) {
	if (!Array.isArray(value)) throw Error("黑盒拍卖列表不完整");
	return value.map(parse);
}
function date(value) {
	const s = text(value);
	if (!Number.isFinite(Date.parse(s))) throw Error("黑盒拍卖时间无效");
	return s;
}
function enumValue(value, values) {
	const s = text(value);
	if (!values.includes(s)) throw Error("黑盒拍卖状态无效");
	return s;
}
const currencies = [
	"ALLOWANCE",
	"SPIRIT_CRYSTAL",
	"SPIRIT_MILK"
];
const statuses = [
	"reserved",
	"cancelled",
	"unconfirmed",
	"ineligible",
	"unfunded",
	"expired",
	"admitted",
	"won",
	"lost",
	"passed",
	"waiting",
	"unfilled",
	"system_cancelled",
	"missed"
];
const currencyName = {
	ALLOWANCE: "普通额度",
	SPIRIT_CRYSTAL: "灵晶",
	SPIRIT_MILK: "道晶"
};
const statusName = {
	waiting: "等人中",
	unfilled: "流拍 · 人数不足",
	missed: "流拍 · 未入场",
	reserved: "已预约",
	cancelled: "已取消",
	system_cancelled: "系统取消",
	unconfirmed: "未确认",
	ineligible: "未通过资格检查",
	unfunded: "可用余额不足",
	expired: "系统取消",
	admitted: "已正式入场",
	won: "已竞得",
	lost: "未竞得",
	passed: "流拍"
};
const optionalText = (r, key) => r[key] === void 0 ? void 0 : text(r[key]);
const optionalNumber = (r, key) => r[key] === void 0 ? void 0 : number(r[key]);
function parseBlackBoxOverview(value) {
	const r = object(value);
	const schedule = r.schedule === void 0 ? void 0 : (() => {
		const s = object(r.schedule);
		return {
			admissionPolicy: s.admissionPolicy === void 0 ? void 0 : enumValue(s.admissionPolicy, ["click-window-v1"]),
			startsAt: s.startsAt === void 0 ? void 0 : date(s.startsAt),
			endsAt: s.endsAt === void 0 ? void 0 : date(s.endsAt),
			testWelfare: s.testWelfare === void 0 ? false : boolean(s.testWelfare),
			day: number(s.day),
			date: date(s.date),
			teaserNames: array(s.teaserNames, text),
			sessions: array(s.sessions, (v) => {
				const x = object(v);
				return {
					id: text(x.id),
					joinClosesAt: x.joinClosesAt === void 0 ? void 0 : date(x.joinClosesAt),
					opensAt: date(x.opensAt),
					type: enumValue(x.type, ["普通场", "高级场"]),
					rooms: array(x.rooms, (y) => {
						const z = object(y);
						return {
							status: z.status === void 0 ? void 0 : enumValue(z.status, [
								"pending",
								"grouped",
								"settled",
								"cancelled"
							]),
							id: text(z.id),
							label: text(z.label),
							currency: enumValue(z.currency, currencies),
							floor: number(z.floor),
							clue: text(z.clue)
						};
					})
				};
			})
		};
	})();
	return {
		enabled: boolean(r.enabled),
		state: r.state === void 0 ? void 0 : enumValue(r.state, [
			"active",
			"scheduled",
			"ended",
			"not_open"
		]),
		startsAt: r.startsAt === void 0 ? void 0 : date(r.startsAt),
		endsAt: r.endsAt === void 0 ? void 0 : date(r.endsAt),
		eventId: optionalNumber(r, "eventId"),
		title: optionalText(r, "title"),
		serverTime: date(r.serverTime),
		schedule,
		allowanceAvailable: number(r.allowanceAvailable),
		allowanceHeld: number(r.allowanceHeld),
		allowanceSpent: number(r.allowanceSpent),
		supplementGranted: boolean(r.supplementGranted),
		funds: array(r.funds, (v) => {
			const f = object(v);
			return {
				currency: enumValue(f.currency, currencies),
				available: number(f.available),
				held: number(f.held),
				total: number(f.total)
			};
		})
	};
}
function parseBlackBoxReservation(value) {
	const r = object(value);
	return {
		notificationEnabled: r.notificationEnabled === void 0 ? void 0 : boolean(r.notificationEnabled),
		serverTime: date(r.serverTime),
		roomId: text(r.roomId),
		sessionId: text(r.sessionId),
		opensAt: date(r.opensAt),
		status: enumValue(r.status, statuses),
		joinClosesAt: r.joinClosesAt === void 0 ? void 0 : date(r.joinClosesAt),
		groupStartsAt: r.groupStartsAt === void 0 ? void 0 : date(r.groupStartsAt),
		confirmed: boolean(r.confirmed)
	};
}
function parseBlackBoxHistory(value) {
	const r = object(value);
	return {
		serverTime: date(r.serverTime),
		page: number(r.page),
		hasMore: boolean(r.hasMore),
		items: array(r.items, (v) => {
			const x = object(v);
			return {
				admissionPolicy: x.admissionPolicy === void 0 ? void 0 : enumValue(x.admissionPolicy, ["click-window-v1"]),
				joinClosesAt: x.joinClosesAt === void 0 ? void 0 : date(x.joinClosesAt),
				groupStartsAt: x.groupStartsAt === void 0 ? void 0 : date(x.groupStartsAt),
				eventId: number(x.eventId),
				title: text(x.title),
				roomId: text(x.roomId),
				activityDay: number(x.activityDay),
				opensAt: date(x.opensAt),
				status: enumValue(x.status, statuses),
				statusReason: optionalText(x, "statusReason"),
				confirmed: boolean(x.confirmed),
				currency: enumValue(x.currency, currencies),
				ownBid: number(x.ownBid),
				ownHeld: number(x.ownHeld),
				charged: number(x.charged)
			};
		})
	};
}
function parseProbe(value) {
	const r = object(value);
	return {
		id: text(r.id),
		label: text(r.label),
		purpose: optionalText(r, "purpose"),
		answer: optionalText(r, "answer")
	};
}
function parseAsset(value) {
	const r = object(value);
	return {
		category: enumValue(r.category, [
			"item",
			"currency",
			"equipment",
			"skill_book",
			"soul_artifact"
		]),
		name: text(r.name),
		quantity: number(r.quantity),
		assetId: optionalNumber(r, "assetId"),
		templateId: optionalNumber(r, "templateId")
	};
}
function parseBlackBoxRoom(value) {
	const r = object(value), phase = enumValue(r.phase, [
		"appraisal",
		"bidding",
		"closed"
	]);
	const appraisal = r.appraisal === void 0 ? void 0 : (() => {
		const a = object(r.appraisal), d = object(a.disclosure);
		if (d.use_requirements_are_bid_eligibility !== false) throw Error("物品使用条件不能成为竞拍资格");
		const upgrade = d.upgrade_requirements === void 0 ? void 0 : (() => {
			const u = object(d.upgrade_requirements);
			return {
				materials: number(u.material_bodies),
				total: number(u.total_bodies_including_target),
				limit: number(u.per_instance_limit)
			};
		})();
		return {
			roomType: text(a.roomType),
			decisionGuide: optionalText(a, "decisionGuide"),
			remaining: number(a.remaining),
			canRevealAll: boolean(a.canRevealAll),
			probes: array(a.probes, parseProbe),
			disclosure: {
				type: text(d.main_item_type),
				grade: optionalText(d, "initial_grade") ?? optionalText(d, "grade"),
				slot: optionalText(d, "slot"),
				use: optionalText(d, "main_use"),
				conditions: array(d.use_requirements, text),
				quantity: optionalNumber(d, "fixed_main_quantity"),
				seeds: optionalNumber(d, "seed_type_count"),
				upgrade
			}
		};
	})();
	if (phase !== "closed" && (r.content !== void 0 || r.result !== void 0)) throw Error("黑盒揭晓时机无效");
	const content = r.content === void 0 ? void 0 : (() => {
		const c = object(r.content);
		return {
			title: text(c.title),
			combinationSummary: optionalText(c, "combinationSummary"),
			grade: text(c.grade),
			rewards: array(c.rewards, parseAsset),
			appraisals: c.appraisals === void 0 ? [] : array(c.appraisals, parseProbe)
		};
	})();
	const result = r.result === void 0 ? void 0 : (() => {
		const x = object(r.result);
		return {
			outcome: enumValue(x.outcome, [
				"won",
				"lost",
				"passed",
				"system_cancelled"
			]),
			explanation: optionalText(x, "explanation"),
			charged: number(x.charged),
			released: number(x.released),
			releaseExpired: boolean(x.releaseExpired),
			activityDay: number(x.activityDay),
			dailySupplementGranted: boolean(x.dailySupplementGranted),
			assets: array(x.assets, parseAsset)
		};
	})();
	return {
		revealsAt: r.revealsAt === void 0 ? void 0 : date(r.revealsAt),
		groupStartsAt: r.groupStartsAt === void 0 ? void 0 : date(r.groupStartsAt),
		serverTime: date(r.serverTime),
		opensAt: date(r.opensAt),
		roomId: text(r.roomId),
		status: enumValue(r.status, [
			"admitted",
			"won",
			"lost",
			"passed",
			"system_cancelled"
		]),
		phase,
		currency: enumValue(r.currency, currencies),
		floor: number(r.floor),
		ownBid: number(r.ownBid),
		ownHeld: number(r.ownHeld),
		available: number(r.available),
		appraisal,
		content,
		result
	};
}
function parseBlackBoxBidPreview(value) {
	const r = object(value);
	return {
		room: parseBlackBoxRoom(r.room),
		amount: number(r.amount)
	};
}

//#endregion
export { currencyName, parseBlackBoxBidPreview, parseBlackBoxHistory, parseBlackBoxOverview, parseBlackBoxReservation, parseBlackBoxRoom, statusName };