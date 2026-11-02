//#region src/response/presentation/tokens.ts
const STATUS_SYMBOL = {
	done: "✅",
	fail: "❌",
	skip: "·",
	warn: "⚠️"
};
/** 同类多值之间的分隔符，前后各一个空格。 */
const VALUE_SEPARATOR = " · ";
/** 键值分隔符：统一全角冒号。 */
const KV_SEPARATOR = "：";
/** 数量标记：统一乘号，禁止 x / *。 */
const QUANTITY_MARK = "×";
/** 奖励行前缀。 */
const REWARD_PREFIX = "🎁 获得：";
/** 锁定/未解锁入口前缀。 */
const LOCK_MARK = "🔒";
/** 主页通知入口图标（沿用既有语义）。 */
const NOTICE_ICON = {
	mail: "📬",
	friend: "🤝",
	team: "⚔️",
	guild: "🏯",
	companion: "💕",
	cave: "🌿",
	killGod: "☠️",
	flyMail: "✉️",
	notice: "🔔"
};
/** 进度条格数。 */
const PROGRESS_CELLS = 10;
/** 按钮与文案预算。 */
const BUBBLE_LIMITS = {
	headerButtons: 3,
	sectionButtons: 3,
	footerButtonsPerRow: 4,
	footerRows: 2,
	totalButtons: 10,
	homeTotalButtons: 18,
	commandCharacters: 80
};

//#endregion
export { BUBBLE_LIMITS, KV_SEPARATOR, LOCK_MARK, NOTICE_ICON, PROGRESS_CELLS, QUANTITY_MARK, REWARD_PREFIX, STATUS_SYMBOL, VALUE_SEPARATOR };