import { parseAlchemyRanking } from './alchemy-ranking-queries';
import { presentAlchemyLeaderboard } from '@src/utils/alchemyQueryPresentation';
export const parseRobotAlchemyLeaderboard = (value: unknown, uid: number) => presentAlchemyLeaderboard(parseAlchemyRanking(value), uid).data;
