import { accountOperationDefinitions } from "./operations.js";

//#region src/api/domains/account/index.ts
function createAccountApi(client) {
	return { post_auth_roles_switch: (...args) => {
		return client.request("post_auth_roles_switch", ...args);
	} };
}

//#endregion
export { accountOperationDefinitions, createAccountApi };