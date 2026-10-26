//#region src/response/skillResetRecovery.ts
/** PreviewReset/ConfirmReset/CancelReset own the pending state and settlement. */
function skillResetRecoveryTips(text) {
	if (/你有一份功法重制结果待确认/.test(text)) return [
		{
			label: "核对原预览后决定",
			command: "/我的功法",
			description: "先核对上一条重制预览的功法、等级和返还，先回看原结果再决定；预览有效期为60秒，不要直接确认不明来源的旧预览"
		},
		{
			label: "确认原预览",
			command: "/确认重制功法",
			description: "仅在确认原预览内容且仍在有效期内时执行；会重置等级和词条，并按原预览返还资源"
		},
		{
			label: "放弃原预览",
			command: "/取消重制功法",
			description: "不接受原预览时取消，只删除待确认预览，不执行功法重制"
		}
	];
	if (/使用中的功法不能重制/.test(text)) return [{
		label: "核对当前功法",
		command: "/我的功法",
		description: "重制只接受本人已学且未在使用中的功法；先核对当前装备和已学实例，由你决定换下后再重新预览，不会自动换下功法"
	}];
	if (/当前没有待(?:确认|取消)的功法重制结果|重制结果已作废/.test(text)) return [{
		label: "核对当前功法后重新预览",
		command: "/我的功法",
		description: "旧预览可能已过期、已处理或状态已变化；先核对功法与原回执，需要新操作时从当前已学实例重新预览，不反复确认旧预览，失效结果不能继续确认，也不自动重新消耗材料"
	}];
	if (/没有可重制的词条或等级/.test(text)) return [{
		label: "查看其他已学功法",
		command: "/我的功法",
		description: "该实例当前状态没有可重制内容；选择其他已有词条或等级的实例，无需为重制先消耗资源升级"
	}];
	if (/参数错误|找不到ID为.+的已学功法/.test(text)) return [{
		label: "核对本人已学实例编号",
		command: "/我的功法",
		description: "从本人已学功法列表选择有效编号（实例编号），使用 /重制功法 功法ID 预览；模板编号和未学习秘籍不适用此入口"
	}];
	return [
		{
			label: "先核对功法状态",
			command: "/我的功法",
			description: "结果尚需核对，保留原预览和结算回执，先查看原功法等级与词条；结果尚未明确时不重复消耗材料或再次确认，失败提示不证明一定未执行，不自动重放"
		},
		{
			label: "核对返还灵石",
			command: "/我的信息",
			description: "若曾确认重制，核对当前资产与原回执，不把预览中的返还当作已到账；持续异常时保留原反馈联系运营"
		},
		{
			label: "核对返还残页",
			command: "/储物袋 材料 经验材料",
			description: "经验按功法残页返还，先核对当前经验材料；不足最低残页面额的尾差会舍弃，不重复确认来补领"
		}
	];
}

//#endregion
export { skillResetRecoveryTips };