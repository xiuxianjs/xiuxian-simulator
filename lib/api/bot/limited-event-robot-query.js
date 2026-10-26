import { displayCurrencyText } from "../../constants/currency.js";
import { parseLimitedEventCheckin } from "./limited-event-checkin.js";

//#region src/api/bot/limited-event-robot-query.ts
function presentLimitedEventCheckin(result) {
	return {
		code: "OK",
		data: {
			success: true,
			results: result.results.map((row) => ({
				eventTitle: row.eventTitle,
				subTitle: row.subTitle,
				dayIndex: row.dayIndex,
				rewardText: row.issued.map((reward) => `${displayCurrencyText(reward.name)}×${reward.amount}`).join("\n")
			}))
		}
	};
}
const parseRobotLimitedEventCheckin = (value) => presentLimitedEventCheckin(parseLimitedEventCheckin(value));

//#endregion
export { parseRobotLimitedEventCheckin, presentLimitedEventCheckin };