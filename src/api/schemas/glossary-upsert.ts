export interface GlossaryEditQuotaData {
  allowed: boolean;
  dailyLimit: number | null;
  used: number | null;
  withinLimit: boolean;
}
export interface GlossaryPolicy {
  categories: string[];
  defaultCategory: string;
  keywordMaxLength: number;
  contentMaxLength: number;
  categoryValid: boolean;
}
export interface GlossaryUpsertResult {
  outcome:
    'created' | 'updated' | 'forbidden' | 'daily_limit' | 'keyword_too_long' | 'content_too_long' | 'keyword_sensitive' | 'content_sensitive' | 'write_failed';
  category: string;
  reason: string;
  entryId: number | null;
  isNew: boolean | null;
  matchedWords: string[];
  dailyLimit: number | null;
  used: number | null;
  completedStage: 'none' | 'entry' | 'log' | 'contribution';
  failedStage: 'entry' | 'log' | 'contribution' | null;
  commitUnknown: boolean;
}
