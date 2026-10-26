import { getBackendTaskPanelView } from "../../api/bot/task-panel-view.js";

//#region src/response-apps/taskPanel/index.ts
const getAllTabs = (uid, bid, selectedTab) => {
	return getBackendTaskPanelView(bid, uid, selectedTab ? { tabKey: selectedTab } : {});
};

//#endregion
export { getAllTabs };