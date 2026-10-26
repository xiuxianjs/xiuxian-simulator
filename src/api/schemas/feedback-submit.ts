export interface FeedbackSubmitResult {
  outcome: 'submitted' | 'category_unavailable' | 'empty' | 'too_short' | 'too_long' | 'not_meaningful' | 'sensitive' | 'daily_limit';
  feedbackId: number | null;
  pendingCount: number | null;
}
