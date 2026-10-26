import { presentAlchemyLeaderboard } from "../../utils/alchemyQueryPresentation.js";
import { parseAlchemyRanking } from "./alchemy-ranking-queries.js";

//#region src/api/bot/alchemy-robot-query.ts
const parseRobotAlchemyLeaderboard = (value, uid) => presentAlchemyLeaderboard(parseAlchemyRanking(value), uid).data;

//#endregion
export { parseRobotAlchemyLeaderboard };