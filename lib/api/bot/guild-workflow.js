import { repeatPresentationHeaders } from "./repeat-presentation.js";
import { requestBackend, writeContext } from "./client.js";

//#region src/api/bot/guild-workflow.ts
/** One guild capability round trip; the backend preserves each operation's authorization and side effects. */
async function requestGuildWorkflow(bid, uid, body, request, repeatCommand) {
	if (!bid) throw new Error("操作缺少平台身份");
	const readOnly = [
		"content",
		"essences",
		"resignation_options"
	].includes(body.action);
	let context = request?.requestId ? { requestId: request.requestId } : {};
	if (!readOnly) try {
		context = writeContext(request);
	} catch (error) {
		if (body.action !== "role_appoint" && body.action !== "role_resign") throw error;
		body = {
			...body,
			previewOnly: true
		};
	}
	const data = await requestBackend(bid, "post_players_id_guild_workflow", {
		path: { id: uid },
		body,
		...context,
		headers: repeatPresentationHeaders(repeatCommand)
	});
	return parseGuildWorkflow(body, uid, data);
}
function parseGuildWorkflow(body, uid, data) {
	if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("宗门业务响应不完整");
	const row = data;
	const numeric = (value) => typeof value === "number" && Number.isFinite(value);
	const integer = (value) => numeric(value) && Number.isSafeInteger(value);
	const nullableString = (value) => value === null || typeof value === "string";
	const outcome = (values) => typeof row.outcome === "string" && values.includes(row.outcome);
	const mutation = (value = row) => typeof value.message === "string" && integer(value.guildId) && typeof value.guildName === "string" && typeof value.confirmationRequired === "boolean";
	let valid = false;
	const input = body;
	switch (input.action) {
		case "resignation_options":
			valid = typeof row.membershipStatus === "string" && [
				"not_joined",
				"guild_missing",
				"members_missing",
				"operator_missing",
				"joined"
			].includes(row.membershipStatus) && (row.operatorUserId === null || integer(row.operatorUserId)) && nullableString(row.operatorRoleName) && typeof row.isDeputy === "boolean" && Array.isArray(row.members) && row.members.every((member) => member && integer(member.userId) && integer(member.roleId) && [
				"name",
				"realmName",
				"roleName"
			].every((key) => nullableString(member[key])) && typeof member.userExists === "boolean" && typeof member.isDeputy === "boolean" && typeof member.canDemote === "boolean") && (row.membershipStatus !== "joined" || row.operatorUserId === uid && row.members.some((member) => member.userId === uid));
			break;
		case "content":
			valid = typeof row.hasMembership === "boolean" && [
				"guildName",
				"intro",
				"notice"
			].every((key) => nullableString(row[key]));
			break;
		case "content_update":
			valid = row.field === input.field && outcome([
				"updated",
				"too_long",
				"empty",
				"inappropriate",
				"not_joined",
				"permission_denied",
				"permission_check_failed"
			]);
			break;
		case "essence_add":
			valid = outcome([
				"added",
				"too_long",
				"empty",
				"inappropriate",
				"not_joined",
				"limit_reached",
				"permission_denied",
				"permission_check_failed"
			]) && (row.id === null || integer(row.id) && Number(row.id) > 0) && (row.outcome !== "added" || row.id !== null);
			break;
		case "essence_remove":
			valid = outcome([
				"removed",
				"not_joined",
				"permission_denied",
				"permission_check_failed",
				"not_found",
				"not_own",
				"busy"
			]);
			break;
		case "essences":
			valid = typeof row.hasMembership === "boolean" && nullableString(row.guildName) && integer(row.page) && integer(row.total) && integer(row.totalPages) && Array.isArray(row.items) && row.items.every((item) => item && integer(item.id) && typeof item.content === "string" && nullableString(item.creatorName) && nullableString(item.createdAt));
			break;
		case "min_realm":
			valid = outcome(["input_required", "not_found"]) || outcome([
				"updated",
				"not_joined",
				"denied",
				"permission_failed",
				"realm_missing"
			]) && (row.minRealmId === null || integer(row.minRealmId)) && nullableString(row.realmName) && (row.matchedRealmName === void 0 || typeof row.matchedRealmName === "string");
			break;
		case "role_appoint":
			valid = outcome(["role_missing"]) || outcome(["target_missing"]) && Array.isArray(row.roles) && row.roles.every((role) => role && integer(role.id) && typeof role.name === "string") || typeof row.outcome === "string" && mutation();
			break;
		case "role_resign": {
			const result = row.result;
			const options = row.options;
			valid = row.kind === "role_missing" || (row.kind === "resign" || row.kind === "demote") && !!result && typeof result === "object" && typeof result.outcome === "string" && mutation(result) || row.kind === "options" && !!options && typeof options === "object" && typeof options.membershipStatus === "string" && [
				"not_joined",
				"guild_missing",
				"members_missing",
				"operator_missing",
				"joined"
			].includes(options.membershipStatus) && (options.operatorUserId === null || integer(options.operatorUserId)) && nullableString(options.operatorRoleName) && typeof options.isDeputy === "boolean" && Array.isArray(options.members) && options.members.every((member) => member && integer(member.userId) && integer(member.roleId) && [
				"name",
				"realmName",
				"roleName"
			].every((key) => nullableString(member[key])) && typeof member.userExists === "boolean" && typeof member.isDeputy === "boolean" && typeof member.canDemote === "boolean") && (options.membershipStatus !== "joined" || options.operatorUserId === uid && options.members.some((member) => member.userId === uid));
			break;
		}
		case "auto_refresh":
			valid = outcome(["hours_required", "invalid_parameter"]) && typeof row.isLeader === "boolean" && typeof row.isViceLeader === "boolean" || outcome([
				"not_joined",
				"denied",
				"shop_missing",
				"ready",
				"updated"
			]) && typeof row.enabled === "boolean" && Array.isArray(row.hours) && row.hours.every(numeric) && typeof row.version === "string" && typeof row.isLeader === "boolean" && typeof row.isViceLeader === "boolean";
			break;
		case "dissolve":
			valid = outcome(["not_joined"]) || outcome(["confirmation_required", "dissolved"]) && mutation() && integer(row.memberCount) && integer(row.refundPerMember) && (row.confirmationExpiresInSeconds === void 0 || integer(row.confirmationExpiresInSeconds));
			break;
		case "shop_refresh": {
			const receipt = row.receipt;
			const page = row.page;
			valid = !!receipt && [
				"guildId",
				"cost",
				"remaining",
				"itemCount"
			].every((key) => integer(receipt[key])) && (typeof row.pageError === "string" || !!page && numeric(page.contributionPoints) && typeof page.autoRefreshEnabled === "boolean" && Array.isArray(page.autoRefreshHours) && page.autoRefreshHours.every(numeric) && typeof page.autoRefreshStatusText === "string" && integer(page.refreshDailyLimit) && Number(page.refreshDailyLimit) > 0 && typeof page.isLeader === "boolean" && Array.isArray(page.items) && page.items.every((item) => item && integer(item.id) && integer(item.index) && Number(item.index) > 0 && integer(item.itemId) && typeof item.name === "string" && typeof item.category === "string" && numeric(item.quantity) && numeric(item.priceContribution) && typeof item.purchased === "boolean" && typeof item.statusText === "string" && typeof item.canExchange === "boolean" && nullableString(item.itemType) && nullableString(item.itemSubtype)));
			break;
		}
		case "storyline_claim": valid = integer(row.stageIndex) && numeric(row.spiritCrystal) && (row.partial === void 0 || row.partial === true && Array.isArray(row.claimedStages) && row.claimedStages.length > 0 && row.claimedStages.every((stage) => integer(stage) && stage >= 1 && stage <= 4) && new Set(row.claimedStages).size === row.claimedStages.length && row.claimedStages.at(-1) === row.stageIndex && integer(row.failedStage) && Number(row.failedStage) >= 1 && Number(row.failedStage) <= 4 && !row.claimedStages.includes(row.failedStage) && typeof row.failureReason === "string" && row.failureReason.length > 0);
	}
	if (!valid) throw new Error("宗门业务响应不完整");
	return data;
}

//#endregion
export { parseGuildWorkflow, requestGuildWorkflow };