import { consumeRepeatPresentation } from "../api/bot/repeat-presentation.js";
import { updateBackendRepeatRecord } from "../api/bot/repeat-record.js";

//#region src/utils/backendRepeatDetector.ts
async function withBackendRepeatDetection(bid, uid, command, message, request) {
	try {
		const presentation = consumeRepeatPresentation(bid, uid, command, message);
		if (presentation && !presentation.data) return message;
		const { suffix } = presentation?.data ?? await updateBackendRepeatRecord(bid, uid, command, message, request);
		if (suffix) return `${message}\n\n${suffix}`;
		return message;
	} catch {
		return message;
	}
}

//#endregion
export { withBackendRepeatDetection };