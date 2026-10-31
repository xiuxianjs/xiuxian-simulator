import { Format } from "alemonjs";

//#region src/utils/manualCommandLinks.ts
/** QQ command links fill the input; sending remains an explicit user action. */
function manualCommandLinks(format) {
	const walk = (nodes) => nodes.map((raw) => {
		if (!raw || typeof raw !== "object") return raw;
		const node = raw;
		const options = node.type === "MD.button" ? {
			...node.options,
			autoEnter: false
		} : void 0;
		if (options) delete options.show;
		return {
			...node,
			...options ? { options } : {},
			...Array.isArray(node.value) ? { value: walk(node.value) } : {}
		};
	});
	const result = Format.create();
	result.value.push(...walk(format.value));
	return result;
}

//#endregion
export { manualCommandLinks };