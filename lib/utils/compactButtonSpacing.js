import { Format } from "alemonjs";

//#region src/utils/compactButtonSpacing.ts
/** 只移除同一行相邻 Markdown 按钮之间的空白，保留正文间隔和换行。 */
function compactButtonSpacing(format) {
	const walk = (nodes) => nodes.flatMap((raw, index) => {
		if (!raw || typeof raw !== "object") return [raw];
		const node = raw;
		const isSpace = (value) => {
			const item = value;
			return item?.type === "MD.text" && typeof item.value === "string" && /^[ \t]*$/.test(item.value);
		};
		if (isSpace(node)) {
			let left = index - 1;
			let right = index + 1;
			while (left >= 0 && isSpace(nodes[left])) left--;
			while (right < nodes.length && isSpace(nodes[right])) right++;
			if (nodes[left]?.type === "MD.button" && nodes[right]?.type === "MD.button") return [];
		}
		return [{
			...node,
			...Array.isArray(node.value) ? { value: walk(node.value) } : {}
		}];
	});
	const result = Format.create();
	result.value.push(...walk(format.value));
	return result;
}

//#endregion
export { compactButtonSpacing };