import { requestBackend, writeContext } from './client';
import type { BackendRequestContext } from './context';

type Book = { name: string; skillType: string };
export type BatchLearnCandidates = {
  candidates: Array<Book & { userSkillBookId: number; skillId: number; gradeLevel: number }>;
  skippedConflicts: Array<Book & { reason: string }>;
};
export type BatchLearnResult = Array<{ userSkillBookId: number; success: boolean; message: string; skillBook?: Book }>;

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('一键学习功法接口响应不完整');
  }

  return value as Record<string, unknown>;
}
function integer(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`一键学习功法接口字段无效: ${field}`);
  }

  return value;
}
function text(value: unknown, field: string): string {
  if (typeof value !== 'string') {
    throw new Error(`一键学习功法接口字段无效: ${field}`);
  }

  return value;
}
function book(value: unknown): Book {
  const row = record(value);

  return { name: text(row.name, 'book.name'), skillType: text(row.skillType, 'book.skillType') };
}

export async function getBackendSkillBookBatchLearnCandidates(bid: string | undefined, uid: number): Promise<BatchLearnCandidates> {
  if (!bid) {
    throw new Error('缺少平台身份');
  }
  const data = record(await requestBackend(bid, 'get_players_id_skill_books_batch_learn_candidates', { path: { id: uid } }));

  return parseCandidates(data);
}

function parseCandidates(value: unknown): BatchLearnCandidates {
  const data = record(value);

  if (!Array.isArray(data.candidates) || !Array.isArray(data.skippedConflicts)) {
    throw new Error('一键学习功法接口响应不完整');
  }

  return {
    candidates: data.candidates.map(value => {
      const row = record(value);

      return {
        ...book(row),
        userSkillBookId: integer(row.userSkillBookId, 'candidate.userSkillBookId'),
        skillId: integer(row.skillId, 'candidate.skillId'),
        gradeLevel: integer(row.gradeLevel, 'candidate.gradeLevel')
      };
    }),
    skippedConflicts: data.skippedConflicts.map(value => {
      const row = record(value);

      return { ...book(row), reason: text(row.reason, 'skipped.reason') };
    })
  };
}

function parseResults(data: unknown): BatchLearnResult {
  if (!Array.isArray(data)) {
    throw new Error('一键学习功法接口响应不完整');
  }

  return data.map(value => {
    const row = record(value);

    if (typeof row.success !== 'boolean') {
      throw new Error('一键学习功法接口字段无效: result.success');
    }

    return {
      userSkillBookId: integer(row.userSkillBookId, 'result.userSkillBookId'),
      success: row.success,
      message: text(row.message, 'result.message'),
      skillBook: row.skillBook === undefined ? undefined : book(row.skillBook)
    };
  });
}

export async function batchLearnCurrentBackendSkillBooks(
  bid: string | undefined,
  uid: number,
  request?: BackendRequestContext
): Promise<{ selection: BatchLearnCandidates; results: BatchLearnResult }> {
  if (!bid) {
    throw new Error('缺少平台身份');
  }
  const data = record(await requestBackend(bid, 'post_players_id_skill_books_batch_learn_current', { path: { id: uid }, ...writeContext(request) }));

  return { selection: parseCandidates(data.selection), results: parseResults(data.results) };
}

export function parseRobotSkillBookBatchLearn(value: unknown): { mode: 'preview' | 'execute'; selection: BatchLearnCandidates; results: BatchLearnResult } {
  const row = record(value);

  if (row.mode !== 'preview' && row.mode !== 'execute') {
    throw new Error('一键学习功法接口响应不完整');
  }

  return { mode: row.mode, selection: parseCandidates(row.selection), results: parseResults(row.results) };
}
