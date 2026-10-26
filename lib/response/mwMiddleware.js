import { sendMiddlewareReply } from "./middlewareReply.js";
import { selects } from "./config.js";
import mwBan_default from "./mwBan.js";
import { onResponse } from "alemonjs";

//#region src/response/mwMiddleware.ts
var mwMiddleware_default = onResponse(selects, (event, next) => {
	if (mwBan_default(event) === true) return next();
});

//#endregion
export { mwMiddleware_default as default, sendMiddlewareReply };