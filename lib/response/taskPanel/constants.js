//#region src/response/taskPanel/constants.ts
/** Tab 注册表 */
const TAB_REGISTRY = [
	{
		key: "checkin",
		name: "签到",
		commandAlias: ["签到", "checkin"],
		sortOrder: 1
	},
	{
		key: "cultivation",
		name: "修炼",
		commandAlias: ["修炼", "cultivation"],
		sortOrder: 2
	},
	{
		key: "activity",
		name: "活跃",
		commandAlias: ["活跃", "activity"],
		sortOrder: 3
	},
	{
		key: "dungeon",
		name: "副本",
		commandAlias: ["副本", "dungeon"],
		sortOrder: 4
	},
	{
		key: "guild",
		name: "宗门",
		commandAlias: ["宗门", "guild"],
		sortOrder: 5
	},
	{
		key: "master",
		name: "师门",
		commandAlias: ["师门", "master"],
		sortOrder: 6
	},
	{
		key: "companion",
		name: "道侣",
		commandAlias: ["道侣", "companion"],
		sortOrder: 7
	},
	{
		key: "event",
		name: "活动",
		commandAlias: ["活动", "event"],
		sortOrder: 8
	}
];
/** Tab key → 注册项映射 */
const TAB_KEY_MAP = new Map(TAB_REGISTRY.map((tab) => [tab.key, tab]));

//#endregion
export { TAB_KEY_MAP, TAB_REGISTRY };