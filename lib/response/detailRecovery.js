//#region src/response/detailRecovery.ts
/** Template IDs and instance IDs differ; learned detail also requires learned state. */
function detailRecoveryTips(operation, text) {
	if (operation === "items.detail") return [{
		label: "从背包核对详情入口",
		command: "/储物袋",
		description: "按完整名称查询，重名时使用详情入口提供的分类与模板编号；模板编号不等于背包实例编号。未找到模板或查询失败不证明持有物品丢失"
	}];
	if (operation === "skill-books.detail") {
		if (/暂无已学习的功法/.test(text)) return [{
			label: "查看持有秘籍",
			command: "/储物袋 功法",
			description: "此详情入口查看已学功法；先核对持有秘籍和学习条件，未学习的秘籍不适用此已学详情入口"
		}];
		return [{
			label: "核对已学功法编号",
			command: "/我的功法",
			description: "从本人当前已学功法列表选择编号查看详情，不使用模板编号，未学习的秘籍不适用此入口；查询失败不证明功法已被卸下或丢失，持续失败时保留原反馈联系运营"
		}];
	}
	if (operation === "soul-artifacts.info") return [{
		label: "核对本人持有实例",
		command: "/储物袋 本命",
		description: "查询未获完整确认，先核对本人持有实例；不能据此判断没有本命物、未炼化或需要购买，不自动炼化或重复培养"
	}, {
		label: "核对人物与原回执",
		command: "/我的信息",
		description: "核对当前人物状态及原操作回执，稍后重新查看本命物；持续异常保留原反馈联系运营，不根据查询失败推断发生分离或返还"
	}];
	if (operation === "soul-artifacts.detail") return [{
		label: "核对背包实例编号",
		command: "/储物袋 本命",
		description: "从本人当前背包详情入口选择实例编号，模板编号和页内序号不能替代实例编号；未找到或查询失败不证明实例已被消耗，不自动炼化或解锁"
	}, {
		label: "核对当前本命物",
		command: "/我的本命物",
		description: "已炼化的本命物不在未炼化背包显示，可从当前本命物面板核对详情；持续查询失败时保留原反馈联系运营"
	}];
	return [];
}

//#endregion
export { detailRecoveryTips };