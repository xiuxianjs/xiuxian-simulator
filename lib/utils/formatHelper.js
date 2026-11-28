//#region src/utils/formatHelper.ts
/**
* 通用格式化工具
*/
const formatFullNumber = new Intl.NumberFormat("en-US", { maximumSignificantDigits: 21 }).format;
const formatLargeNumber = new Intl.NumberFormat("zh-CN", {
	notation: "compact",
	maximumFractionDigits: 2
}).format;
/** 面板数值满万时使用中文单位，小数值保留原有精度与千位分隔。 */
function formatGameAmount(value) {
	const magnitude = Math.abs(value);
	if (magnitude < 1e4) return formatFullNumber(value);
	return magnitude <= Number.MAX_SAFE_INTEGER ? formatNumber(value) : formatLargeNumber(value);
}
/** 格式化大数字为中文可读形式（万 / 亿） */
function formatNumber(n) {
	if (typeof n === "number" && !Number.isInteger(n)) {
		if (!Number.isFinite(n) || Math.abs(n) > Number.MAX_SAFE_INTEGER) throw new Error("无法格式化非精确数值");
		if (Math.abs(n) < 1e4) return String(n);
		const units = [
			"",
			"万",
			"亿",
			"万亿",
			"亿亿"
		];
		let index = Math.min(4, Math.floor(Math.log10(Math.abs(n)) / 4));
		if (Number((Math.abs(n) / 1e4 ** index).toFixed(2)) >= 1e4 && index < 4) index++;
		return `${(n / 1e4 ** index).toFixed(2).replace(/\.?0+$/, "")}${units[index]}`;
	}
	return formatDamage(n);
}
/** Format exact integer damage without converting bigint to a lossy number. */
function formatDamage(value) {
	if (typeof value === "number" && !Number.isSafeInteger(value)) throw new Error("无法格式化已丢失精度的整数");
	if (value < 0) return `-${formatDamage(-value)}`;
	const amount = BigInt(value);
	const units = [
		"",
		"万",
		"亿",
		"万亿",
		"亿亿"
	];
	let index = 0;
	let divisor = 1n;
	while (index < units.length - 1 && amount >= divisor * 10000n) {
		divisor *= 10000n;
		index++;
	}
	if (index === 0) return amount.toString();
	let hundredths = (amount * 100n + divisor / 2n) / divisor;
	if (hundredths >= 1000000n && index < units.length - 1) {
		divisor *= 10000n;
		index++;
		hundredths = (amount * 100n + divisor / 2n) / divisor;
	}
	const fraction = (hundredths % 100n).toString().padStart(2, "0").replace(/0+$/, "");
	return `${hundredths / 100n}${fraction ? `.${fraction}` : ""}${units[index]}`;
}

//#endregion
export { formatDamage, formatFullNumber, formatGameAmount, formatNumber };