//#region src/response-apps/tribulation/recovery.ts
/** Keep the original event on refusal paths; only offer reads, never replay writes. */
function withTribulationRecovery(operation, args, reply) {
	if (!["tribulation.command", "tribulation.public"].includes(operation) || reply.rawLines) return reply;
	const eventId = Number(args.eventId);
	const hasEvent = Number.isSafeInteger(eventId) && eventId > 0;
	const offset = Number(args.offset);
	const listPage = Number.isSafeInteger(offset) && offset >= 0 && offset % 5 === 0 ? offset / 5 + 1 : 1;
	const listFilter = Number.isSafeInteger(args.playerId) && Number(args.playerId) > 0 ? ` UID ${String(args.playerId)}` : typeof args.name === "string" && args.name ? ` 道号 ${args.name}` : "";
	const buttons = [
		...operation === "tribulation.public" && args.kind === "list" ? [{
			label: "重查原列表",
			command: `/劫云榜 ${listPage}${listFilter}`
		}] : [],
		...hasEvent ? [{
			label: "查看原劫云",
			command: `/观望渡劫 ${eventId}`
		}] : [],
		...hasEvent && ["receipt", "start"].includes(String(args.kind)) ? [{
			label: "取回本次状态",
			command: `/渡劫结算 ${eventId}`
		}] : [],
		...hasEvent && args.kind === "confirm" && [
			"low",
			"standard",
			"high"
		].includes(String(args.grade)) ? [{
			label: "刷新原评级",
			command: `/渡劫评级 ${eventId} ${String(args.grade)}`
		}] : [],
		{
			label: "我的劫云",
			command: "/我的渡劫"
		},
		{
			label: "劫云榜",
			command: "/劫云榜"
		}
	];
	return {
		...reply,
		buttons: [...reply.buttons, ...buttons.filter((button) => !reply.buttons.some((existing) => existing.command === button.command))]
	};
}

//#endregion
export { withTribulationRecovery };