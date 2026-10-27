import { ExposeError } from "alemonjs";

//#region src/expose/schema.ts
const text = { type: "string" };
const number = { type: "number" };
const integer = { type: "integer" };
const boolean = { type: "boolean" };
const page = {
	type: "integer",
	minimum: 1,
	maximum: 2147483647
};
const list = (items) => ({
	type: "array",
	items
});
const object = (properties, optional = []) => ({
	type: "object",
	properties,
	required: Object.keys(properties).filter((key) => !optional.includes(key)),
	additionalProperties: false
});
const fields = (schema, names) => Object.fromEntries(names.split(" ").map((name) => [name, schema]));
/** Only contract fields leave the bot. Optional null/undefined means unavailable; no invented zero or empty value. */
function project(schema, value) {
	if (schema.type === "object") {
		if (!value || typeof value !== "object" || Array.isArray(value)) throw new ExposeError("INVALID_OUTPUT", "查询对象响应不完整");
		const row = value;
		const result = {};
		for (const [key, child] of Object.entries(schema.properties)) if (row[key] === void 0 || row[key] === null) {
			if (schema.required?.includes(key)) throw new ExposeError("INVALID_OUTPUT", "查询必填字段缺失");
		} else result[key] = project(child, row[key]);
		return result;
	}
	if (schema.type === "array") {
		if (!Array.isArray(value)) throw new ExposeError("INVALID_OUTPUT", "查询列表响应不完整");
		return value.map((item) => project(schema.items, item));
	}
	return value;
}

//#endregion
export { boolean, fields, integer, list, number, object, page, project, text };