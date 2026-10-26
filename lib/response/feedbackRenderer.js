//#region src/response/feedbackRenderer.ts
/** Opt in only after the custom renderer displays every structured advice item. */
function adviceRenderer(render) {
	return Object.assign(render, { preservesAdvice: true });
}

//#endregion
export { adviceRenderer };