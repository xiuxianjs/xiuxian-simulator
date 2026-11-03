//#region src/agent-play/play-planning.ts
const foundations = {
	purpose: "核对规则与角色",
	actions: ["get_tianshu", "get_profile"],
	instruction: "先读取服务端天书与角色状态。天书说明当前玩法设计与境界开放条件，不能用历史知识替代；未注册时转插件注册流程，不能编造角色或跳过序章。"
};
const plans = [
	{
		id: "fast-growth",
		title: "快速升级",
		topic: "cultivation",
		matches: /快速升级|怎么升级|如何升级|提升修为|升级快|快速修炼/u,
		steps: [
			foundations,
			{
				purpose: "找出成长瓶颈",
				actions: [
					"get_realm",
					"get_meditation_progress",
					"get_meditation_boost_options"
				],
				instruction: "区分修为不足、材料不足与可突破；比较服务端返回的闭关收益、时长和加速费用。预估不等于入账，快不等于无限消费，缺少收益数据时不宣称最优。"
			},
			{
				purpose: "比较主动历练与闭关",
				actions: [
					"get_dungeons",
					"get_dungeon_detail_by_id",
					"get_pk_targets"
				],
				instruction: "不要只凭闭关资料把闭关说成最快。按当前天书的开放条件，比较秘境和夺宝等主动成长途径：先查目录，再用实际编号查秘境详情；精力与元力分别核对，保留免费次数、队伍要求、每日与同目标限制。单位精力修为=基础修为÷每场精力；相同比值不能说其中一项更高。达标场次=向上取整(修为缺口÷每次胜利修为)，所需精力=场次×每场精力，剩余精力=当前精力−所需精力；先算再判断是否够用。以上仅是同一收益和消耗不变、全部胜利的条件估算，不能外推到未读取的关卡。额外货币、免费次数、组队条件分别说明，不混称为单位精力收益更高。目标列表不代表胜算或保证收益，缺少修为收益时明确无法定量比较。玩家排除的玩法不继续查询或推荐；不要为了比较自动挑战或选择其他玩家发起争夺。"
			},
			{
				purpose: "选择本次修行",
				actions: [
					"start_meditation",
					"end_meditation",
					"get_tasks",
					"get_checkin_status",
					"challenge_dungeon_by_id",
					"rob_player"
				],
				instruction: "先给出有实时数据支持的下一步。咨询只提供方案与原指令去掉前缀的选择；获得玩家明确选择与授权后才执行对应的一步，不把“如何快速升级”当作战斗授权。已有闭关先核对进度；开始与出关可能涉及自动加速费用，要说明原设置并取得相应授权。秘境沿用查到的编号，夺宝须明确目标及风险，不能擅自挑选玩家。介绍任务或签到不等于已完成或领取。不要为了快速升级连续自动花费。"
			}
		]
	},
	{
		id: "raise-realm",
		title: "提升境界",
		topic: "cultivation",
		matches: /提升境界|提高境界|境界.{0,6}(?:突破|晋级|晋升)|^(?:帮我|我要|我想)?(?:突破|晋级|晋升)$/u,
		steps: [
			foundations,
			{
				purpose: "核对下一境界条件",
				actions: ["get_realm"],
				instruction: "分别读取突破与晋升资格、所需修为、材料缺口和服务端成功率。条件不足时解释真实缺口，查询获取途径，不能为了凑材料自行购买或消耗。"
			},
			{
				purpose: "执行玩家选定的一步",
				actions: [
					"breakthrough_realm",
					"promote_realm",
					"get_tribulation_preparation"
				],
				instruction: "只按当前服务端阶段选择突破或晋级，不能两个都调用试错。晋级可能实际结算，也可能返回渡劫准备；按回执分支继续。开劫、心魔等使用原预览与确认，不因总目标而跳过风险说明。"
			},
			{
				purpose: "核对结果与新玩法",
				actions: ["get_realm", "get_onboarding"],
				instruction: "用实际回执与最新境界说明成功或失败；新境界有分支目录时交给玩家选择，保留跨境界回看，不把全部教学一次推进。"
			}
		]
	},
	{
		id: "claim-rewards",
		title: "领取奖励",
		topic: "daily",
		matches: /(?:领|收取|领取).{0,6}(?:奖励|补给)|奖励.{0,4}(?:领取|领)|(?=.*主线)(?=.*宝箱)(?=.*领)/u,
		steps: [
			foundations,
			{
				purpose: "查询可领取项",
				actions: [
					"get_checkin_status",
					"get_tasks",
					"get_daily_activity",
					"get_weekly_activity",
					"get_achievement_overview",
					"get_emails"
				],
				instruction: "按玩家指定范围查询，未指定时先查看日常状态并列出可领项。区分已领取、未达成、已达成未领取与锁定；分页资料未查完不能说全部奖励已领完。"
			},
			{
				purpose: "领取并核对",
				actions: [
					"checkin_all",
					"claim_all_daily_activity",
					"claim_all_weekly_activity",
					"claim_all_achievements",
					"claim_email",
					"claim_all_emails"
				],
				instruction: "从运行时目录发现对应领取能力，按已授权范围执行。只领奖不包含购买、开付费宝箱、充值或付费补签。逐项保留实际成功、已领取、失败和未处理结果；不确定先核对原回执，不换编号重复领。"
			}
		]
	},
	{
		id: "scheduled-harvest",
		title: "定时采收灵田",
		topic: "cave",
		matches: /(?=.*(?:定时|每隔|每天|每晚|小时后|分钟后|点|明天|今晚))(?=.*(?:灵田|灵药|采收|收割))/u,
		steps: [
			foundations,
			{
				purpose: "确认采收范围与时间",
				actions: ["get_cave"],
				instruction: "读取本人灵田和成熟状态。明确一次还是重复、时间与时区、地块范围；不把玩家自己的灵田扩展为道侣或其他玩家。只采收不包含播种、加速、升级或照料。"
			},
			{
				purpose: "预约并执行采收",
				actions: ["harvest_cave_plots"],
				instruction: "发现插件独立的agent.scheduled-action.v1预约协议和支持持久化业务执行的宿主能力；prepare只签发限定授权，不代表已保存或已收割，取得宿主保存成功回执才可说已预约。固定文字通知和聊天自主唤醒不能替代定时采收。能力缺失时如实说尚未安排，不冒充定时成功。到期重新查本人灵田，只尝试已授权范围的成熟作物；未成熟是本轮未收获，不保证收益。每次执行沿用该轮操作编号核对或重试，不能重放成新操作。"
			}
		]
	}
];
function affirmativeRequest(request) {
	const prohibition = new RegExp("^(?:(?:但|也|并|请|先|暂时|现在|本次|本轮|我)\\s*)*(?:不要|不能|不许|不想|不需要|不必|无需|别|禁止|不购买|不领奖|不领取|不突破|不晋级|不提升|不修炼|不采收)", "u");
	return request.split(/[。！？!?；;，,\n]|(?=不要|不领取|不领奖|不提升|不突破|但要)/u).filter((clause) => !prohibition.test(clause.trim())).join("。");
}
const isStorylineRewardRequest = (request) => /主线/u.test(affirmativeRequest(request)) && /宝箱/u.test(affirmativeRequest(request));
/** Limits planning observations, never grants permission to execute a route. */
function allowsGrowthDungeonComparison(request) {
	return !/(?:不考虑|不推荐|别推荐|不要推荐|不想玩|不走|不要)\s*秘境/u.test(request);
}
function playGoal(request) {
	const affirmative = affirmativeRequest(request);
	const plan = [...plans].reverse().find((item) => item.matches.test(affirmative) && (!(item.id === "fast-growth" || item.id === "raise-realm") || !/功法|装备|宝物|灵田|誓约|建筑|丹炉/u.test(affirmative)));
	return plan && {
		id: plan.id,
		title: plan.title,
		topic: plan.topic
	};
}
function playPlanning(request, availableActions) {
	const goal = playGoal(request);
	const plan = plans.find((item) => item.id === goal?.id);
	const steps = plan?.id === "claim-rewards" && isStorylineRewardRequest(request) ? [
		foundations,
		{
			purpose: "核对指定主线宝箱",
			actions: ["get_storyline_chapters", "get_storyline_chapter"],
			instruction: "先按玩家指定章节和宝箱编号核对星数、是否解锁及是否已领取。章节目录可能分页，不要把未查到当作不存在。不要改查日常任务或其他奖励来替代指定宝箱。"
		},
		{
			purpose: "领取指定宝箱并核对",
			actions: ["claim_storyline_chest", "claim_storyline_chapter_chests"],
			instruction: "指定一只宝箱只用单箱能力；明确要求整章才可领取该章全部可领宝箱。已领过直接说明，不重复请求结算；不得扩大到其他章节、签到、任务或付费宝箱。"
		}
	] : plan?.steps;
	return plan ? [{
		id: plan.id,
		title: plan.title,
		steps: (steps ?? []).map((step) => ({
			purpose: step.purpose,
			actions: step.actions.filter((action) => availableActions.has(action) && (plan.id !== "fast-growth" || allowsGrowthDungeonComparison(request) || !/dungeon/u.test(action))),
			missingActions: step.actions.filter((action) => !availableActions.has(action) && (plan.id !== "fast-growth" || allowsGrowthDungeonComparison(request) || !/dungeon/u.test(action))),
			instruction: step.instruction
		}))
	}] : [];
}

//#endregion
export { allowsGrowthDungeonComparison, isStorylineRewardRequest, playGoal, playPlanning };