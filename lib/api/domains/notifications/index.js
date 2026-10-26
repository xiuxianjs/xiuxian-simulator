import { notificationsOperationDefinitions } from "./operations.js";

//#region src/api/domains/notifications/index.ts
function createNotificationsApi(client) {
	return {
		get_players_id_notifications_group_subscription: (...args) => {
			return client.request("get_players_id_notifications_group_subscription", ...args);
		},
		get_players_id_notifications: (...args) => {
			return client.request("get_players_id_notifications", ...args);
		},
		get_players_id_notification_subscription: (...args) => {
			return client.request("get_players_id_notification_subscription", ...args);
		},
		put_players_id_notification_subscription: (...args) => {
			return client.request("put_players_id_notification_subscription", ...args);
		},
		delete_players_id_notification_subscription: (...args) => {
			return client.request("delete_players_id_notification_subscription", ...args);
		}
	};
}

//#endregion
export { createNotificationsApi, notificationsOperationDefinitions };