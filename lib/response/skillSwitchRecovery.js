import { cultivationRecoveryTips } from "./cultivationRecovery.js";

//#region src/response/skillSwitchRecovery.ts
function skillSwitchRecoveryTips(text) {
	if (/格式错误/.test(text)) return [{
		label: "核对已学实例与原比较",
		command: "/我的功法",
		description: "从对应类型的切换列表选择功法实例编号；需要替换时回看原比较，仅追加“确认”，不附其他确认文字或多余参数，不自动提交选择"
	}];
	if (/您还没有已学习的.+类功法|当前列表为空/.test(text)) return [{
		label: "查看持有秘籍",
		command: "/储物袋 功法",
		description: "当前类型没有可显示的已学功法，先查看本人持有秘籍及学习条件；不同类型不能替代，不生成缺编号的学习操作"
	}, {
		label: "核对当前已学功法",
		command: "/我的功法",
		description: "核对类型、已学状态与隐藏状态；当前选择列表为空不代表全部功法丢失"
	}];
	const existing = cultivationRecoveryTips("skill-books.switch", text);
	if (existing.length) return existing;
	return [{
		label: "核对当前功法",
		command: "/我的功法",
		description: "核对当前使用与已学实例、原比较及回执；结果不明时不直接再次确认，失败提示不证明装备一定未切换，持续异常时保留原反馈联系运营"
	}, {
		label: "查看持有秘籍",
		command: "/储物袋 功法",
		description: "未学习秘籍不等于已学功法实例，先核对学习状态和类型，不把切换失败当作需要再次购买相同秘籍"
	}];
}

//#endregion
export { skillSwitchRecoveryTips };