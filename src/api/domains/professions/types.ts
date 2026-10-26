import type { ProfessionToolBagData } from '../../schemas/queries';
import type { ProfessionToolReplaceResponse } from '../../schemas/profession-tool-replace';
// Contract synchronized with Go docs/openapi.yaml.
// Unspecified domain payloads intentionally remain unknown.

export interface ProfessionsOperations {
  post_players_id_professions_lingzhi_guide_continue_current: {
    path: { id: number };
    query: never;
    headers: { 'X-Request-ID'?: string; 'Idempotency-Key': string; 'X-Repeat-Command'?: string };
    body: never;
    response: unknown;
  };

  get_players_id_professions_dashboard: { path: { id: number }; query: never; headers: never; body: never; response: unknown };
  get_players_id_profession_tools_bag: {
    path: { id: number };
    query: { typeName?: string; page?: number };
    headers: never;
    body: never;
    response: ProfessionToolBagData;
  };
  get_players_id_professions: { path: { id: number }; query: never; headers: { 'X-Request-ID'?: string }; body: never; response: unknown };
  get_profession_catalog: { path: never; query: never; headers: { 'X-Request-ID'?: string }; body: never; response: unknown };
  get_profession_catalog_by_code_code: { path: { code: string }; query: never; headers: { 'X-Request-ID'?: string }; body: never; response: unknown };
  get_profession_catalog_id: { path: { id: number }; query: never; headers: { 'X-Request-ID'?: string }; body: never; response: unknown };
  get_profession_levels: { path: never; query: { professionId: number }; headers: { 'X-Request-ID'?: string }; body: never; response: unknown };
  get_players_id_professions_summary: { path: { id: number }; query: never; headers: { 'X-Request-ID'?: string }; body: never; response: unknown };

  get_profession_tools: {
    path: never;
    query: { playerId: number; profession?: string; typeName?: string };
    headers: { 'X-Request-ID'?: string };
    body: never;
    response: unknown;
  };
  get_profession_tool_types: { path: never; query: never; headers: { 'X-Request-ID'?: string }; body: never; response: unknown };
  get_players_id_profession_tools: { path: { id: number }; query: never; headers: { 'X-Request-ID'?: string }; body: never; response: unknown };

  post_players_id_profession_tools_replace: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string; 'X-Repeat-Command'?: string };
    body: { identifier: string };
    response: ProfessionToolReplaceResponse;
  };
}
