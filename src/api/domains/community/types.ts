import type { GlossaryViewResult } from '../../schemas/market-community-views';
import type { EncyclopediaListPage, EncyclopediaListCursor } from '../../schemas/encyclopedia';
import type { GlossaryEditQuotaData, GlossaryPolicy, GlossaryUpsertResult } from '../../schemas/glossary-upsert';
import type { FeedbackCategoryQueryItem } from '../../schemas/feedback-categories';
import type { FeedbackSubmitResult } from '../../schemas/feedback-submit';
import type { GlossaryEditPermissionData, GlossaryDeleteResult } from '../../schemas/glossary-delete';
import type { GlossaryApplyResult } from '../../schemas/glossary-apply';
import type { NoticeDetailData } from '../../schemas/notice-detail';
import type { ItemDetailQueryData } from '../../schemas/item-detail-query';
import type { GlossaryQueryEntry, GlossaryQueryPage, GlossaryQueryCursor } from '../../schemas/glossary-query';
import type { PlayerNoticePage } from '../../schemas/notice-query';
import type { MemoryData, StoryData, FeedbackQueryPage, FeedbackQueryCursor, FeedbackQueryDetail } from '../../schemas/queries';
import type { TianshiBaoluUnlockSyncResult } from '../../schemas/tianshi-baolu-unlock-sync';
// Reviewed DTO contracts; keep operations metadata aligned with Go docs/openapi.yaml.
// Unspecified domain payloads intentionally remain unknown.

export interface CommunityOperations {
  post_players_id_glossary_edit_context: {
    path: { id: number };
    query: never;
    headers: { 'X-Repeat-Command'?: string };
    body: never;
    response: GlossaryViewResult;
  };
  get_glossary_view: {
    path: never;
    query: { action: 'browse' | 'search' | 'category' | 'edit_context'; page?: number; keyword?: string; category?: string };
    headers: { 'X-Request-ID'?: string; 'Idempotency-Key'?: string };
    body: never;
    response: GlossaryViewResult;
  };
  get_glossary_edit_quota: { path: never; query: never; headers: never; body: never; response: GlossaryEditQuotaData };
  get_glossary_edit_permission: { path: never; query: never; headers: never; body: never; response: GlossaryEditPermissionData };
  get_players_id_catalog_item_detail: {
    path: { id: number };
    query: { category?: 'item' | 'equipment' | 'profession_tool' | 'skill_book'; entryId?: number; name?: string };
    headers: never;
    body: never;
    response: ItemDetailQueryData;
  };
  get_glossary_entry: { path: never; query: { keyword: string }; headers: never; body: never; response: GlossaryQueryEntry | null };
  get_feedback_feedbackId: { path: { feedbackId: number }; query: never; headers: never; body: never; response: FeedbackQueryDetail };
  get_players_id_notices: { path: { id: number }; query: { page?: number; pageSize?: number }; headers: never; body: never; response: PlayerNoticePage };
  post_players_id_notices_noticeId_read: {
    path: { id: number; noticeId: number };
    query: never;
    headers: { 'Idempotency-Key'?: string };
    body: never;
    response: { read: boolean };
  };
  get_encyclopedia_categories: { path: never; query: never; headers: never; body: never; response: unknown };
  get_encyclopedia: {
    path: never;
    query: { cursor?: string; category: string; subCategory?: string; page?: number; pageSize?: number };
    headers: never;
    body: never;
    response: EncyclopediaListPage | EncyclopediaListCursor;
  };
  get_encyclopedia_category_entryId: { path: { category: string; entryId: number }; query: never; headers: never; body: never; response: unknown };
  get_content_tianshu: { path: never; query: { view?: 'access' }; headers: never; body: never; response: unknown };
  get_players_id_memories: { path: { id: number }; query: never; headers: never; body: never; response: MemoryData };
  get_players_id_story: { path: { id: number }; query: never; headers: never; body: never; response: StoryData };
  get_notices: { path: never; query: { page?: number; pageSize?: number }; headers: never; body: never; response: unknown };
  get_notices_noticeId: { path: { noticeId: number }; query: never; headers: never; body: never; response: NoticeDetailData };
  get_feedback_categories: { path: never; query: never; headers: never; body: never; response: FeedbackCategoryQueryItem[] };
  get_feedback_mine: {
    path: never;
    query: { page?: number; pageSize?: number; cursor?: string };
    headers: never;
    body: never;
    response: FeedbackQueryPage | FeedbackQueryCursor;
  };
  post_feedback: {
    path: never;
    query: never;
    headers: { 'Idempotency-Key'?: string };
    body: { categoryId: number; content: string };
    response: FeedbackSubmitResult;
  };
  get_glossary: {
    path: never;
    query: { keyword?: string; category?: string; page?: number; pageSize?: number; cursor?: string };
    headers: never;
    body: never;
    response: GlossaryQueryPage | GlossaryQueryCursor;
  };
  get_glossary_categories: { path: never; query: never; headers: never; body: never; response: unknown };
  get_glossary_policy: { path: never; query: { category?: string }; headers: never; body: never; response: GlossaryPolicy };
  get_glossary_edit_applications_mine: { path: never; query: never; headers: never; body: never; response: unknown };
  post_glossary_edit_applications: {
    path: never;
    query: never;
    headers: { 'Idempotency-Key'?: string };
    body: { reason?: string };
    response: GlossaryApplyResult;
  };
  put_glossary_keyword: {
    path: { keyword: string };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Repeat-Command'?: string };
    body: { content: string; category?: string; commandContent?: true };
    response: GlossaryUpsertResult;
  };
  delete_glossary_keyword: {
    path: { keyword: string };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Repeat-Command'?: string };
    body: never;
    response: GlossaryDeleteResult;
  };
  get_tianshi_baolu: {
    path: never;
    query: { type?: string; page?: number; pageSize?: number; cursor?: string };
    headers: never;
    body: never;
    response: unknown;
  };
  post_players_id_tianshi_baolu_unlocks_sync: { path: { id: number }; query: never; headers: never; body: never; response: TianshiBaoluUnlockSyncResult };
}
