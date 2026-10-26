// HTTP contract aligned with Go docs/openapi.yaml. Update alongside OpenAPI and verify with yarn test:contracts.
// Unspecified domain payloads intentionally remain unknown.

export interface InternalOperations {
  get_internal_v1_task_config: {
    path: never;
    query: never;
    headers: { 'X-Request-ID'?: string };
    body: never;
    response: { task: Record<string, string>; schedulerReady: boolean; autonomousTasks: string[]; invalidAutonomousTasks: string[] };
  };
  get_internal_v1_jobs: { path: never; query: never; headers: { 'X-Request-ID'?: string }; body: never; response: unknown };
  post_internal_v1_jobs_name_run: {
    path: { name: string };
    query: never;
    headers: { 'Idempotency-Key': string; 'X-Request-ID'?: string };
    body: { reason: string };
    response: unknown;
  };
  post_internal_v1_jobs_name_compensate: {
    path: { name: string };
    query: never;
    headers: { 'Idempotency-Key': string; 'X-Request-ID'?: string };
    body: { reason: string };
    response: unknown;
  };
  post_internal_v1_workers_name_run: {
    path: {
      name:
        | 'scheduled-email'
        | 'red-packet-expiry'
        | 'sha-qi-decay'
        | 'native-comeback-active-flush'
        | 'comeback-gift-recovery'
        | 'test-gift-recovery'
        | 'custom-gift-recovery'
        | 'bounty-expiry'
        | 'guild-shop-auto-refresh'
        | 'market-listing-expiry'
        | 'cave-plot-maturity'
        | 'guild-secret-realm-war-reset'
        | 'companion-anniversary'
        | 'team-match'
        | 'tower-daily-check'
        | 'guild-competition-phase'
        | 'guild-competition-odds-refresh'
        | 'push-message-relay';
    };
    query: never;
    headers: { 'X-Request-ID'?: string };
    body: { runKey?: string };
    response: unknown;
  };
  post_internal_v1_workers_name_compensate: {
    path: {
      name:
        | 'scheduled-email'
        | 'red-packet-expiry'
        | 'sha-qi-decay'
        | 'native-comeback-active-flush'
        | 'comeback-gift-recovery'
        | 'test-gift-recovery'
        | 'custom-gift-recovery'
        | 'bounty-expiry'
        | 'guild-shop-auto-refresh'
        | 'market-listing-expiry'
        | 'cave-plot-maturity'
        | 'guild-secret-realm-war-reset'
        | 'companion-anniversary'
        | 'team-match'
        | 'tower-daily-check'
        | 'guild-competition-phase'
        | 'guild-competition-odds-refresh'
        | 'push-message-relay';
    };
    query: never;
    headers: { 'X-Request-ID'?: string };
    body: { runKey?: string };
    response: unknown;
  };
}
