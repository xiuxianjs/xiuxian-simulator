import { ExposeError } from "alemonjs";

//#region src/expose/confirmation.ts
const confirmationReferenceSchema = {
	type: "string",
	minLength: 1,
	maxLength: 64
};
function validateConfirmationReference(value, kind) {
	if (!new RegExp(`^r1_[a-z0-9]+_${kind}_[a-z0-9]+_[a-f0-9]{24}$`).test(value)) throw new ExposeError("INVALID_INPUT", "请提供服务端原预览返回的完整确认引用");
}

//#endregion
export { confirmationReferenceSchema, validateConfirmationReference };