//#region src/response/retiredFeatures.ts
/** 过滤机器人展示中的已下架功能。 */
const retiredGift = /回归礼包|测试礼包|凡人修仙礼包码|回归兑换码|测试兑换码|老玩家签发回归码/;
const retiredOther = /赞助|活动(?:商城|商店|购买|充值)|海外仙岛|海岛|(?:限时活动\s*|任务|特惠)商店|限时活动\s+(?:商店|任务|特惠)/;
const mentionsRetiredFeature = (text) => retiredGift.test(text) || retiredOther.test(text);
const activeFeatureText = (text) => text.replaceAll("活动充值相关信息", "充值相关信息").split("\n").filter((line) => !mentionsRetiredFeature(line)).join("\n");

//#endregion
export { activeFeatureText, mentionsRetiredFeature };