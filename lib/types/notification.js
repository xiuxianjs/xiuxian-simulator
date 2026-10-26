//#region src/types/notification.ts
/** The platform may have accepted this send; switching groups could duplicate it. */
var NotificationDeliveryUncertainError = class extends Error {};
/** Another process owns this shared delivery; wait without switching targets. */
var NotificationDeliveryPendingError = class extends Error {};

//#endregion
export { NotificationDeliveryPendingError, NotificationDeliveryUncertainError };