import type { AxiosAdapter, AxiosRequestConfig } from 'axios';
import type { operationDefinitions, OperationId, Operations } from '../registry';

export type Identity = { kind: 'public' } | { kind: 'user'; token: string } | { kind: 'robot'; token: string; bid: string } | { kind: 'worker'; token: string };

export interface ClientOptions {
  /** Server origin, without /api/v1 (paths already contain their server prefix). */
  baseUrl: string;
  identity?: Identity;
  /** Optional transport adapter for tests or custom runtimes. */
  adapter?: AxiosAdapter;
  timeoutMs?: number;
  /** Node socket pools; identity and request headers remain scoped to this client. */
  connectionPools?: Pick<AxiosRequestConfig, 'httpAgent' | 'httpsAgent'>;
  /** Local diagnostic intervals; never transmitted or included in game data. */
  onTiming?: (stage: string, startedAt: number, finishedAt: number, outcome: 'fulfilled' | 'rejected') => void;
  /** Optional transport facts; they never replace the business data. */
  onPresentation?: (value: unknown) => void;
}

type EmptyShape = Record<never, never>;
type ParameterOption<K extends string, T> = [T] extends [never] ? { [P in K]?: never } : EmptyShape extends T ? { [P in K]?: T } : { [P in K]: T };
type IdempotencyOption<I extends OperationId> = [Operations[I]['headers']] extends [never]
  ? { idempotencyKey?: string }
  : 'Idempotency-Key' extends keyof Operations[I]['headers']
    ? EmptyShape extends Pick<Operations[I]['headers'], 'Idempotency-Key'>
      ? { idempotencyKey?: string }
      : { idempotencyKey: string }
    : { idempotencyKey?: string };
export type RequestOptions<I extends OperationId> = {
  requestId?: string;
  signal?: AbortSignal;
  timeoutMs?: number;
  /** Additional non-security headers only. */
  headers?: HeadersInit;
} & ParameterOption<'path', Operations[I]['path']> &
  ParameterOption<'query', Operations[I]['query']> &
  ((typeof operationDefinitions)[I]['bodyRequired'] extends true ? { body: Operations[I]['body'] } : { body?: Operations[I]['body'] }) &
  IdempotencyOption<I>;

export type RequestArguments<I extends OperationId> = EmptyShape extends RequestOptions<I> ? [options?: RequestOptions<I>] : [options: RequestOptions<I>];
