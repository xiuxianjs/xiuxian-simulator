import { getBackendEquipmentDetail } from "../../../api/bot/equipment-detail-queries.js";

//#region src/response-apps/equipment/equipmentDetail/app.ts
const TYPE_NAME_MAP = {
	饰品: "头饰",
	法袍: "衣服",
	鞋: "鞋子"
};
function resolveTypeName(typeName) {
	return TYPE_NAME_MAP[typeName] ?? typeName;
}
async function getEquipmentDetail(bid, uid, typeName) {
	const result = await getBackendEquipmentDetail(bid, uid, typeName);
	return {
		playerName: result.playerName === "" ? "未知玩家" : result.playerName ?? "未知玩家",
		item: result.item ? {
			...result.item,
			equipment: {
				name: result.item.name,
				grade: { name: result.item.gradeName }
			}
		} : null
	};
}

//#endregion
export { TYPE_NAME_MAP, getEquipmentDetail, resolveTypeName };