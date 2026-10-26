//#region src/response/adventureRecovery.ts
/** Refusal wording and reward codes are verified against storyline / dungeon services. */
function adventureRecoveryTips(operation, text) {
	const storyline = operation.startsWith("storyline.");
	const dungeon = operation.startsWith("dungeon.");
	if (!storyline && !dungeon) return [];
	const list = storyline ? "/查看主线" : "/查看秘境";
	if (operation === "dungeon.catalog" && text === "暂无秘境") return [{
		label: "先推进已开放主线",
		command: "/查看主线",
		description: "当前列表没有可展示秘境，可先推进已经开放的主线；不直接提交空列表的扫荡"
	}, {
		label: "查看开放条件",
		command: "/天书",
		description: "核对当前境界可以参与的内容；空列表本身不代表必定缺少某种材料"
	}];
	if (/页码超出范围|page 必须为正整数|该章节暂无关卡/.test(text)) return [{
		label: "返回列表首页",
		command: list,
		description: "先查看当前实际存在的页数与条目，再从有效入口选择内容"
	}];
	if (/精力不足/.test(text) || text === "mental_insufficient") return [{
		label: "核对精力",
		command: "/我的信息",
		description: "先核对当前精力与本次消耗，批量操作可减少次数；已结算部分不会重新计算"
	}, {
		label: "查看精力丹",
		command: "/储物袋 道具 丹药",
		description: "核对是否持有精力丹及可用数量，再决定服用多少，不直接按固定数量重复服用"
	}];
	if (/组队状态下无法.*扫荡|只有队长|只能单人进入|最低需要\d+人|队伍中没有可获得收益的成员|队伍成员境界不足|队伍成员境界超过/.test(text)) return [{
		label: "查看队伍",
		command: "/我的队伍",
		description: "核对队长、成员人数与本人的参与条件；由队长发起允许的挑战，单人或扫荡内容需先由你确认调整组队状态"
	}];
	if (text === "team_no_mental") return [{
		label: "查看个人设置",
		command: "/我的设置",
		description: "本人启用了组队秘境不消耗精力；个人免费次数用完后仍可参战，但该设置下本次不消耗也不结算收益，先核对再决定是否调整"
	}];
	if (/境界超过.*上限/.test(text)) return [{
		label: "选择适合境界的秘境",
		command: "/查看秘境",
		description: "当前境界已高于该秘境允许范围，应改选符合当前境界上下限的秘境，继续提升境界不能解除这个限制"
	}];
	if (/剩余次数不足/.test(text)) return [{
		label: "核对剩余次数",
		command: list,
		description: "按服务端提示的剩余次数减少本次请求，或选择仍有可用次数的其他关卡"
	}];
	if (/今日.*次数.*(?:用完|用尽|上限)/.test(text) || text === "daily_limit") return [{
		label: "选择其他关卡",
		command: list,
		description: "本关今日次数已用完；查看其他仍有次数的关卡，或等待次数恢复，补精力不会恢复已用完的次数"
	}];
	if (/免费次数已用尽|没有可用的秘境免费次数/.test(text)) return [{
		label: "查看秘境次数",
		command: "/查看秘境",
		description: "核对各秘境个人免费次数；需要消耗精力的次数由你另行查看消耗并决定，不自动转为消耗精力的扫荡"
	}];
	if (/三星通关后才能扫荡/.test(text)) return [{
		label: "先提高通关星级",
		command: "/查看主线",
		description: "先查看本关星级，挑战达到三星后才能扫荡；不要继续提交同一关扫荡"
	}, {
		label: "调整功法",
		command: "/我的功法",
		description: "查看已装备功法和培养状态，准备后再挑战，星级以服务端结算为准"
	}];
	if (/需要成功通关后才能扫荡/.test(text)) return [{
		label: "先查看秘境挑战",
		command: "/查看秘境",
		description: "查看该秘境的境界、人数和精力要求，满足后先成功通关，再使用扫荡"
	}];
	if (/需通关第\d+章|请先通关|关卡不存在或尚未解锁/.test(text)) return [{
		label: "推进前置关卡",
		command: "/查看主线",
		description: "对照提示先完成前一关或前一章精英关卡，再返回目标关卡；章节与星级以主线面板为准"
	}];
	if (/星数不足|暂无可领取的宝箱|当前没有可领取的宝箱|该宝箱已领取/.test(text)) return [{
		label: "查看章节宝箱",
		command: "/查看主线",
		description: "核对已领取状态与章节总星数；星数不足时提高该章未满星关卡的评价，再领取已解锁且未领取的宝箱"
	}];
	if (/战斗会话不存在或无权操作|战斗会话已被其他请求推进|技能当前不可用/.test(text)) return [{
		label: "返回主线确认状态",
		command: "/查看主线",
		description: "旧会话或选技已不可继续；先核对当前关卡状态和已有结算，不自动重新开战或重放选技"
	}];
	if (text === "战斗结果：未获胜") return [{
		label: "调整已装备功法",
		command: "/我的功法",
		description: "先查看功法搭配与培养状态，再决定是否重新挑战；已有战斗消耗与结果保留"
	}, {
		label: "核对境界提升条件",
		command: "/我的境界",
		description: "查看当前修为和突破材料，满足提升条件后再安排挑战"
	}];
	if (/本次扫荡未完成全部请求次数/.test(text)) return [{
		label: "核对秘境剩余次数",
		command: "/查看秘境",
		description: "按服务端实际完成次数结算，未完成原因可能涉及今日次数或精力；先核对剩余次数，不直接重复原批量请求"
	}, {
		label: "核对精力",
		command: "/我的信息",
		description: "查看当前精力，确认后再选择后续扫荡次数"
	}];
	if (/后续扫荡已停止/.test(text)) return [{
		label: "核对已完成秘境",
		command: "/查看秘境",
		description: "先核对已经结算的次数和奖励；服务恢复后再决定后续操作，不把本次当作全部失败重新扫荡"
	}];
	if (/格式错误|参数无效|须为正整数|次数过大|关卡范围|扫荡次数仅支持|请输入秘境名称|请指定秘境名称|用法：|未找到.*秘境|第\d+章不存在|关卡.*不存在|无效的宝箱序号/.test(text)) return [{
		label: "从列表选择有效入口",
		command: list,
		description: "核对当前有效名称、编号和允许次数，优先使用列表中的对应操作，避免照旧参数反复提交"
	}];
	return [];
}
function dungeonNoRewardText(reason) {
	switch (reason) {
		case "daily_limit": return "该秘境今日个人挑战次数已用完";
		case "team_no_mental": return "组队秘境不耗精力设置生效，免费次数用完后本次仅参战、不消耗也不结算收益";
		case "mental_insufficient": return "本人精力不足，本次参战无收益";
		default: return reason?.length ? reason : "服务端未返回本人的奖励资格";
	}
}

//#endregion
export { adventureRecoveryTips, dungeonNoRewardText };