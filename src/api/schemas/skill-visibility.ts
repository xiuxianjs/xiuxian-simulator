export interface LearnedSkillVisibilityResult {
  code: 'UPDATED' | 'NOT_FOUND' | 'IN_USE' | 'UNCHANGED';
  bookId: number;
  name: string | null;
  isHidden: boolean;
  message: string;
}
