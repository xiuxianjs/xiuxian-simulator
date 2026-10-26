import { getBackendLimitedEventCheckinStatus } from "../../../api/bot/limited-event-checkin-status.js";
import { postBackendLimitedEventCheckin } from "../../../api/bot/limited-event-checkin.js";
import { presentLimitedEventCheckin } from "../../../api/bot/limited-event-robot-query.js";

//#region src/response-apps/limitedEvent/checkin/app.ts
async function App(params) {
	try {
		const result = await postBackendLimitedEventCheckin(params.bid, params.uid, params.request);
		return presentLimitedEventCheckin(result);
	} catch (error) {
		if (error?.status === 409 || error?.code === "CONFLICT") try {
			const status = await getBackendLimitedEventCheckinStatus(params.bid, params.uid);
			return {
				code: "FAIL",
				data: {
					message: error?.message ?? "当前没有可签到的限时活动",
					status: status.map((row) => ({
						...row,
						startTime: new Date(row.startTime)
					}))
				}
			};
		} catch (statusError) {
			return {
				code: "LOAD_FAILED",
				data: { message: statusError?.message ?? "活动签到失败，请稍后再试" }
			};
		}
		return {
			code: "LOAD_FAILED",
			data: { message: error?.message ?? "活动签到失败，请稍后再试" }
		};
	}
}

//#endregion
export { App as default };