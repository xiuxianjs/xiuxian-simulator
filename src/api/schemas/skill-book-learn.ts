import type { SkillBookMaximum } from './skill-book-switch';

export type SkillBookLearnSummary = {
  id: number;
  name: string;
  skillType: '战技' | '被动技' | '神通';
  grade: string;
  realm: string;
  gradeLevel: number;
  proficiency: number;
};

export type SkillBookLearnRefund = {
  totalExp: number;
  baseExp: number;
  upgradeExp: number;
  upgradeCount: number;
  transferredProficiency: number;
  items: Array<{ itemId: number; name: string; quantity: number; expValue: number }>;
};

export type SkillBookLearnResponse = {
  outcome: 'learned' | 'confirmation_required' | 'empty_bag' | 'not_found' | 'unidentified' | 'already_learned' | 'locked' | 'in_use_conflict' | 'lower_grade';
  skillBook?: SkillBookLearnSummary;
  oldSkillBook?: SkillBookLearnSummary;
  targetMaximum?: SkillBookMaximum;
  oldMaximum?: SkillBookMaximum;
  refundInfo?: SkillBookLearnRefund;
};
