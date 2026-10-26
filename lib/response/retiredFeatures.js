//#region src/response/retiredFeatures.ts
/** 仅用于机器人展示；接口及服务端业务仍保持原样。 */
const mentionsRetiredFeature = (text) => /赞助|活动(?:商城|商店|购买|充值)|海外仙岛|海岛|(?:限时活动\s*|任务|特惠)商店|限时活动\s+(?:商店|任务|特惠)/.test(text);
const activeFeatureText = (text) => text.replaceAll("活动充值相关信息", "充值相关信息").split("\n").filter((line) => !mentionsRetiredFeature(line)).join("\n");

//#endregion
export { activeFeatureText, mentionsRetiredFeature };