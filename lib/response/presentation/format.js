import { formatNumber } from "../../utils/formatHelper.js";
import { displayCurrencyText } from "../../constants/currency.js";
import { KV_SEPARATOR, PROGRESS_CELLS, QUANTITY_MARK, REWARD_PREFIX, STATUS_SYMBOL, VALUE_SEPARATOR } from "./tokens.js";

//#region src/response/presentation/format.ts
/** 键值行：`标签：值`。 */
const kvLine = (label, value) => `${label}${"："}${value}`;
/** 同类多值合并：`值 · 值 · 值`，空值不占位。 */
const joinValues = (...values) => values.filter((value) => value !== void 0 && value !== null && value !== "").join(VALUE_SEPARATOR);
/** 数量：`名称 ×N`。 */
const quantityText = (name, count) => `${name} ${"×"}${count}`;
/** 奖励行：`🎁 获得：名称 ×1、名称 ×2`。 */
const rewardLine = (rewards) => `${REWARD_PREFIX}${rewards.join("、")}`;
/** 状态行：符号固定在行首；none 时保持原文本。 */
const statusLine = (status, text) => status === "none" ? text : `${STATUS_SYMBOL[status]}${text ? ` ${text}` : ""}`;
/**
* 进度条：统一 10 格 `▓▓▓░░░░░░ 42%`。
* 上限为 0 或非正数时按 0% 处理，超过上限按 100% 显示。
*/
const progressBar = (current, max) => {
	const ratio = max > 0 ? Math.max(0, Math.min(1, current / max)) : 0;
	const filled = Math.floor(ratio * 10);
	const percent = Math.floor(ratio * 100);
	return `${"▓".repeat(filled)}${"░".repeat(10 - filled)} ${percent}%`;
};
/** 大数字统一万/亿显示。 */
const bigNumber = (value) => formatNumber(value);
/** 货币文案统一走既有映射。 */
const currencyText = (value) => displayCurrencyText(value);
/** 标题追加状态徽章；无标题或无状态时保持原样。 */
const titleWithStatus = (title, status = "none") => status === "none" || !title ? title : `${title} ${STATUS_SYMBOL[status]}`;
/** 主动通知标题：统一追加 ` · 通知`，已包含时不重复。 */
const noticeTitle = (title) => title.includes("通知") ? title : `${title} · 通知`;

//#endregion
export { bigNumber, currencyText, joinValues, kvLine, noticeTitle, progressBar, quantityText, rewardLine, statusLine, titleWithStatus };