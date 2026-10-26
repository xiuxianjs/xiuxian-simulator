//#region src/utils/masterCommand.ts
const parseTeachMasterCommand = (messageText) => (messageText?.trim() ?? "").match(/^[!！/#＃]?传功\s+(.+)$/)?.[1]?.trim() ?? null;
const parseBlessMasterCommand = (messageText) => (messageText?.trim() ?? "").match(/^[!！/#＃]?赐福\s+(.+)$/)?.[1]?.trim() ?? null;
const parseExpelMasterCommand = (messageText) => (messageText?.trim() ?? "").match(/^[!！/#＃]?逐出师门\s+(.+)$/)?.[1]?.trim() ?? null;
const parseApplyMasterCommand = (messageText) => (messageText?.trim() ?? "").match(/^[!！/#＃]?拜师\s+(.+)$/)?.[1]?.trim() ?? null;
const parseMasterGiftCommand = (messageText) => {
	const raw = (messageText?.trim() ?? "").match(/^[!！/#＃]?赐丹(?:\s+([\s\S]*))?$/)?.[1]?.trim() ?? "";
	if (!raw) return null;
	const parts = raw.split(/\s+/).filter(Boolean);
	const last = parts.at(-1);
	const pillType = last === "筑基丹" ? "zhuji" : last === "培元丹" ? "peiyuan" : void 0;
	if (pillType) parts.pop();
	const discipleArg = parts.join(" ").trim();
	return discipleArg ? {
		discipleArg,
		pillType
	} : null;
};
async function masterMentionBid(mention) {
	const user = await mention.findOne();
	return user?.count && user.data?.UserId ? user.data.UserId : void 0;
}

//#endregion
export { masterMentionBid, parseApplyMasterCommand, parseBlessMasterCommand, parseExpelMasterCommand, parseMasterGiftCommand, parseTeachMasterCommand };