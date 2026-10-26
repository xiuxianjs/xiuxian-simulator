import { cultivationRecoveryTips } from "./cultivationRecovery.js";

//#region src/response/soulCultivationRecovery.ts
function soulCultivationRecoveryTips(operation, text) {
	if (/格式错误/.test(text)) return [{
		label: "核对原操作",
		command: "/本命物信息",
		description: "升级只附正整数等级数，升品只附实例编号；分离使用 /分离 或 /分离 确认。先查看原目标与消耗，不把无法识别的参数当作默认操作"
	}];
	const existing = cultivationRecoveryTips(operation, text);
	if (existing.length) return existing;
	if (/请先炼化本命物|当前未装备本命物/.test(text)) return [{
		label: "核对持有与当前本命物",
		command: "/储物袋 本命",
		description: "核对本人持有实例及当前装备；没有装备时不能据此推断发生分离或返还，不自动炼化其他实例"
	}];
	if (/筑灵石不足/.test(text)) return [{
		label: "核对筑灵石",
		command: "/储物袋 材料 其它",
		description: "核对可用筑灵石，选择可负担的升级次数，不把持有总数当作全部可消耗"
	}, {
		label: "查询筑灵石",
		command: "/珍宝楼",
		description: "查询是否有需要的筑灵石出售，不保证当前有货，先核对数量和价格再决定"
	}];
	if (/上架中.*请先下架|上架中的本命物/.test(text)) return [{
		label: "核对本人上架",
		command: "/我的上架",
		description: "从本人挂单核对目标，再决定是否下架；不自动下架或重放原培养操作"
	}];
	return [
		{
			label: "先核对本命物状态",
			command: "/本命物信息",
			description: "结果尚需核对，先查看当前等级、品级、装备和原回执；失败提示不证明变更一定未执行，不直接重放"
		},
		{
			label: "核对材料与实例",
			command: "/储物袋 本命",
			description: "升品核对同名同品实例，分离核对原对象是否已回到背包；不把结果未知当作材料丢失或已完成返还"
		},
		{
			label: "核对筑灵石",
			command: "/储物袋 材料 其它",
			description: "核对当前筑灵石及原消耗/返还回执；分离返还以服务端结算为准，不重复提交补领，持续异常时保留原反馈联系运营"
		}
	];
}

//#endregion
export { soulCultivationRecoveryTips };