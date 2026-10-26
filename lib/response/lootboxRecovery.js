//#region src/response/lootboxRecovery.ts
/** Opening counts, inventory and available options are owned by LootboxService. */
function lootboxRecoveryTips(operation, text) {
	if (operation === "storage.lootboxes") {
		if (/暂无礼盒/.test(text)) return [{
			label: "核对邮件附件",
			command: "/我的邮件",
			description: "若该礼盒来自礼包或活动邮件，先核对附件是否已领取；领取后再查看礼盒列表，不自动重复兑换或领取"
		}];
		return [{
			label: "查看礼盒首页",
			command: "/储物袋 礼盒 1",
			description: "刷新当前数量与可用开启入口，空页或查询失败不代表持有礼盒消失；条目持续没有开启入口时保留反馈联系管理员，不手工绕过当前可用选项"
		}];
	}
	if (operation !== "lootboxes.open") return [];
	if (/配置|没有奖励|不支持.*奖励|货币类型不支持/.test(text)) return [{
		label: "核对当前礼盒",
		command: "/储物袋 礼盒",
		description: "保留原配置或奖励异常反馈并联系管理员；购买更多礼盒、提升境界或更换请求不能修复奖励配置，不自动重复开启"
	}];
	if (/未找到名为|你没有【|数量不足/.test(text)) return [{
		label: "刷新当前礼盒",
		command: "/储物袋 礼盒",
		description: "核对本人当前持有的礼盒名称、数量并使用列表开启按钮；库存或配置可能已变化，请求数量与实际开启数量以服务端回执为准，不自动补买或再次开启"
	}];
	if (/请输入礼盒名称|用户和礼盒必须为正整数|数量无法解析/.test(text)) return [{
		label: "选择持有礼盒",
		command: "/储物袋 礼盒",
		description: "从当前列表选择礼盒及开启数量，列表按钮使用礼盒ID；省略数量与输入无效数量不同，无效文本不会替你默认开启"
	}];
	return [{
		label: "先核对剩余礼盒",
		command: "/储物袋 礼盒",
		description: "本次开启未取得完整确认，先核对剩余礼盒和原回执，再查看实际奖励；失败不能证明礼盒未扣除或奖励未到账，不自动重开"
	}];
}

//#endregion
export { lootboxRecoveryTips };