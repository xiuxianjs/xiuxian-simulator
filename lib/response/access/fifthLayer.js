import { getBackendSocialAccess } from "../../api/bot/queries.js";
import { sendFifthLayerLockedPage } from "./fifthLayerView.js";

//#region src/response/access/fifthLayer.ts
function canAccessFifthLayerFeature(uid, bid) {
	return getBackendSocialAccess(bid, uid);
}

//#endregion
export { canAccessFifthLayerFeature, sendFifthLayerLockedPage };