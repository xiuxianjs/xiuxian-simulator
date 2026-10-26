export type SkillBookDecomposeItem = {
  itemId: number;
  name: string;
  quantity: number;
  expValue: number;
};

export type SkillBookDecomposeResponse = {
  instanceId: number;
  name: string;
  skillType: string;
  grade: string;
  realm: string;
  refundExp: number;
  baseExp: number;
  refundedItems: SkillBookDecomposeItem[];
};
