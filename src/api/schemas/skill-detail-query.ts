import type { LearnedBookQueryItem } from './learned-books-query';
export interface LearnedSkillFact {
  id: number;
  name: string;
  skillTypeId: number;
  module: number | null;
  damageType: string | null;
  multiplier: number | null;
  camp: string | null;
  cost: number | null;
  cooldown: number | null;
  triggerCondition: string | null;
  targetCount: number | null;
  defenseIgnorePercent: number | null;
}
export interface LearnedBuffFact {
  name: string;
  type: number;
  module: number;
  camp: string | null;
  applyTiming: number;
  effectTiming: number;
  removable: boolean | null;
  triggerScope: string | null;
  applyProbability: number;
  effectProbability: number;
  duration: number | null;
  multiplier: number | null;
  maxStacks: number;
  attributeModule: number;
}
export interface LearnedSkillDetailQuery {
  hasLearnedBooks: boolean;
  proficiencyPoints: number;
  book:
    | (LearnedBookQueryItem & {
        skillId: number | null;
        skill: LearnedSkillFact | null;
        skillBuffs: { probability: number | null; buff: LearnedBuffFact | null }[];
      })
    | null;
}
