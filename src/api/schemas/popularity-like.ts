export type PopularityLikeResult = {
  message: string;
  remainingLikes: number;
  currentPopularity: number;
  boardType: 'battle' | 'realm' | 'storyline' | 'demonTower' | 'regionBattle' | 'regionRealm' | 'alchemy';
  boardLabel: string;
};
