import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import customParseFormat from "dayjs/plugin/customParseFormat.js";

//#region src/utils/gameTime.ts
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);
const gameTimezone = "Asia/Shanghai";
/** 带时区值按真实时刻转换；无时区的后端日期按北京时间解释。 */
function parseGameTime(value) {
	if (value === null || value === void 0 || value === "") return null;
	if (typeof value === "number" && !Number.isFinite(value)) return null;
	if (typeof value === "string") {
		const raw = value.trim().replace(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/, (_, year, month, day) => `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`);
		const match = raw.match(/^(\d{4}-\d{2}-\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/);
		if (!match || !dayjs(match[1], "YYYY-MM-DD", true).isValid() || Number(match[2] ?? 0) > 23 || Number(match[3] ?? 0) > 59 || Number(match[4] ?? 0) > 59) return null;
		try {
			const parsed = match[5] ? dayjs(raw).tz(gameTimezone) : dayjs.tz(raw, gameTimezone);
			return parsed.isValid() ? parsed : null;
		} catch {
			return null;
		}
	}
	const parsed = dayjs(value);
	return parsed.isValid() ? parsed.tz(gameTimezone) : null;
}
/** mask 由展示层选择，接口参数和业务日期不使用此函数。 */
function formatGameTime(value, mask = "YYYY-MM-DD HH:mm:ss", missing = "暂无") {
	if (value === null || value === void 0 || value === "") return missing;
	return parseGameTime(value)?.format(mask) ?? "时间未知";
}
function formatGameDate(value, missing = "暂无") {
	return formatGameTime(value, "YYYY-MM-DD", missing);
}
/** 保留分钟、小时、天的展示阈值，缺失时间不伪装为刚刚。 */
function formatGameTimeAgo(value, useDays = true, now = Date.now()) {
	if (value === null || value === void 0 || value === "") return "暂无";
	const parsed = parseGameTime(value);
	const current = parseGameTime(now);
	if (!parsed || !current) return "时间未知";
	const minutes = current.diff(parsed, "minute");
	if (minutes < 1) return "刚刚";
	if (minutes < 60) return `${minutes}分钟前`;
	const hours = Math.floor(minutes / 60);
	if (!useDays || hours < 24) return `${hours}小时前`;
	return `${Math.floor(hours / 24)}天前`;
}

//#endregion
export { formatGameDate, formatGameTime, formatGameTimeAgo, parseGameTime };