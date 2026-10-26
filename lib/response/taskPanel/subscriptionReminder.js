import { requestBackend } from "../../api/bot/client.js";
import { isPrivateEvent } from "../../utils/privateEvent.js";
import { markdownButtonLabel } from "../../utils/buttonLabel.js";
import { FormatGui } from "../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../utils/useMessage.js";
import { validateGroupSubscription } from "../../api/bot/group-subscription-queries.js";
import { Format, logger } from "alemonjs";

//#region src/response/taskPanel/subscriptionReminder.ts
const SUBSCRIPTION_CHECK_PROBABILITY = .1;
async function sendTaskPanelSubscriptionReminder(event) {
	const uid = event.uid;
	if (!event.UserId || !Number.isInteger(uid) || uid <= 0 || Math.random() >= SUBSCRIPTION_CHECK_PROBABILITY) return;
	try {
		if (validateGroupSubscription(await requestBackend(event.UserId, "get_players_id_notifications_group_subscription", { path: { id: uid } }))?.isEnabled) return;
		const [message] = useMessage$1(event);
		const canEnableHere = !isPrivateEvent(event) && !!event.ChannelId;
		const quote = Format.createMarkdown().addText(canEnableHere ? "尚未开启群通知。" : "尚未开启群通知，可在常用群开启订阅。");
		quote.addText(" ").addButton(markdownButtonLabel(canEnableHere ? "开启群通知" : "我的设置"), { data: canEnableHere ? "/开启群订阅" : "/我的设置" });
		await message.send(FormatGui({
			isPrivate: isPrivateEvent(event),
			bid: event.UserId,
			title: "修行提醒",
			content: Format.createMarkdown().addBlockquote(quote)
		}));
	} catch (error) {
		logger.warn("任务面板群订阅提醒未完成:", error);
	}
}

//#endregion
export { sendTaskPanelSubscriptionReminder };