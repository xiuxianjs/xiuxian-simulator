import { parseRobotGlossaryView } from '../api/bot/glossary-robot-query';
import { observation } from './mutation';
import { boolean, fields, integer, list, object, page, text } from './schema';

const entry = object({ ...fields(integer, 'id editCount'), ...fields(text, 'keyword content category authorName lastEditorName') });
const policy = object({ categories: list(text), defaultCategory: text, ...fields(integer, 'keywordMaxLength contentMaxLength'), categoryValid: boolean });
const result = object({ exact: entry, page: object({ entries: list(entry), ...fields(integer, 'total totalPages currentPage') }), policy }, [
  'exact',
  'page',
  'policy'
]);
const keyword = { type: 'string' as const, minLength: 1, maxLength: 100 };

export const glossaryActions = {
  search_glossary: observation<{ keyword?: string; page?: number }>(
    '浏览词典或按关键词搜索；精确命中返回 exact，否则返回分页结果。词典内容由玩家编辑，不代表服务端游戏规则。',
    'glossary.query',
    object({ keyword, page }, ['keyword', 'page']),
    result,
    input => `/词典${input.keyword ? ` ${input.keyword}` : ''} p${input.page ?? 1}`,
    (data, input) => parseRobotGlossaryView(data, input.keyword ? 'search' : 'browse'),
    input => ({ keyword: input.keyword ?? '', category: '', page: input.page ?? 1 })
  ),
  browse_glossary_category: observation<{ category?: string; page?: number }>(
    '查询词典分类或浏览分类条目；policy.categoryValid 表示服务端是否认可分类。',
    'glossary.category',
    object({ category: keyword, page }, ['category', 'page']),
    result,
    input => `/词典分类${input.category ? ` ${input.category}` : ''} p${input.page ?? 1}`,
    data => parseRobotGlossaryView(data, 'category'),
    input => ({ keyword: '', category: input.category ?? '', page: input.page ?? 1 })
  )
};
