import axios, { type AxiosInstance } from 'axios';
import { operationDefinitions, type OperationId, type Operations } from '../registry';
import type { ClientOptions, Identity, RequestArguments } from './types';
import type { RuntimeDefinition } from './runtime';
import { SDKError } from './error';
import { fail, headerValue, isRecord, isParameterRecord, isValidTimeout, parameterScalar, protectedHeaders, redact, validateParameter } from './helpers';

export class APIClient {
  private readonly origin: string;
  private readonly identity: Identity;
  private readonly http: AxiosInstance;
  private readonly timeoutMs: number;
  private readonly onTiming?: ClientOptions['onTiming'];
  private readonly onPresentation?: (value: unknown) => void;

  constructor(options: ClientOptions) {
    let url: URL;

    try {
      url = new URL(options.baseUrl);
    } catch {
      fail('baseUrl must be an HTTP(S) origin');
    }
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash || url.pathname !== '/') {
      fail('baseUrl must be an HTTP(S) origin without credentials, path, query or fragment');
    }
    this.origin = url.origin;
    this.onTiming = options.onTiming;
    this.onPresentation = options.onPresentation;
    this.identity = { ...(options.identity ?? { kind: 'public' }) };
    this.http = axios.create({
      ...options.connectionPools,
      adapter: options.adapter ?? ['http', 'fetch'],
      maxRedirects: 0,
      fetchOptions: { redirect: 'error', credentials: 'omit' },
      withCredentials: false,
      validateStatus: () => true,
      responseType: 'text',
      transformResponse: []
    });
    this.timeoutMs = options.timeoutMs ?? 10_000;
    if (!isValidTimeout(this.timeoutMs)) {
      fail('timeoutMs must be between 1 and 2147483647 milliseconds');
    }
  }

  async request<I extends OperationId>(operationId: I, ...args: RequestArguments<I>): Promise<Operations[I]['response']> {
    let stage = 'api.sdk.prepare';
    let stageStartedAt = performance.now();
    let stageOutcome: 'fulfilled' | 'rejected' = 'rejected';
    const finishStage = () => {
      const finishedAt = performance.now();

      try {
        this.onTiming?.(stage, stageStartedAt, finishedAt, stageOutcome);
      } catch {
        /* Diagnostics never change the HTTP result. */
      }
    };
    const nextStage = (name: string) => {
      stageOutcome = 'fulfilled';
      finishStage();
      stage = name;
      stageStartedAt = performance.now();
      stageOutcome = 'rejected';
    };

    try {
      if (args[0] !== undefined && !isParameterRecord(args[0])) {
        fail('Request options must be an object');
      }
      const options = (args[0] ?? {}) as {
        path?: Record<string, unknown>;
        query?: Record<string, unknown>;
        body?: unknown;
        headers?: HeadersInit;
        requestId?: string;
        idempotencyKey?: string;
        signal?: AbortSignal;
        timeoutMs?: number;
      };
      const requestId = headerValue(options.requestId ?? globalThis.crypto?.randomUUID?.() ?? '', 'requestId');

      if (!Object.prototype.hasOwnProperty.call(operationDefinitions, operationId)) {
        fail('Unknown operation', requestId);
      }
      const definition: RuntimeDefinition = operationDefinitions[operationId];

      for (const [kind, value, parameters] of [
        ['path', options.path, definition.pathParams],
        ['query', options.query, definition.queryParams]
      ] as const) {
        if (value === undefined) {
          continue;
        }
        if (!isParameterRecord(value)) {
          fail(`${kind} parameters must be an object`, requestId);
        }
        for (const name of Object.keys(value)) {
          if (!parameters.some(parameter => parameter.name === name)) {
            fail(`Unknown ${kind} parameter ${name}`, requestId);
          }
        }
      }
      let headers: Headers;

      try {
        headers = new Headers(options.headers);
      } catch {
        fail('Invalid request headers', requestId);
      }
      for (const name of headers.keys()) {
        if (protectedHeaders.has(name.toLowerCase())) {
          fail(`Header ${name} is managed by the SDK`, requestId);
        }
      }
      headers.set('X-Request-ID', requestId);
      const security: readonly Record<string, readonly unknown[]>[] = definition.security;
      const isPublic = security.length === 0 || security.some(requirement => Object.keys(requirement).length === 0);

      if (!isPublic) {
        const names =
          this.identity.kind === 'robot'
            ? ['RobotBearer', 'RobotBid']
            : this.identity.kind === 'user'
              ? ['UserBearer']
              : this.identity.kind === 'worker'
                ? ['WorkerToken']
                : [];

        if (!security.some(requirement => Object.keys(requirement).every(name => names.includes(name)))) {
          throw new SDKError('Identity is not permitted for this operation', { code: 'SDK_AUTH_REQUIRED', requestId });
        }
        if (
          this.identity.kind === 'public' ||
          typeof this.identity.token !== 'string' ||
          !this.identity.token.trim() ||
          /[^\x20-\x7e]/.test(this.identity.token)
        ) {
          fail('A non-empty printable ASCII token is required', requestId);
        }
        if (this.identity.kind === 'worker') {
          headers.set('X-Worker-Token', this.identity.token);
        } else {
          headers.set('Authorization', `Bearer ${this.identity.token}`);
        }
        if (this.identity.kind === 'robot') {
          if (
            typeof this.identity.bid !== 'string' ||
            this.identity.bid.length === 0 ||
            this.identity.bid.trim() !== this.identity.bid ||
            this.identity.bid.length > 255 ||
            this.identity.bid.includes(',') ||
            /[^\x20-\x7e]/.test(this.identity.bid)
          ) {
            fail('A single printable ASCII robot bid of 1 to 255 bytes without surrounding whitespace is required', requestId);
          }
          headers.set('X-Bid', this.identity.bid);
        }
      }
      if (
        options.idempotencyKey !== undefined ||
        definition.headerParams.some(parameter => parameter.name.toLowerCase() === 'idempotency-key' && parameter.required)
      ) {
        headers.set('Idempotency-Key', headerValue(options.idempotencyKey ?? '', 'idempotencyKey', requestId));
      }
      let path: string = definition.path;

      for (const parameter of definition.pathParams) {
        const value = options.path?.[parameter.name];

        if ((typeof value !== 'string' && typeof value !== 'number') || String(value) === '' || (typeof value === 'number' && !Number.isFinite(value))) {
          fail(`Missing or invalid path parameter ${parameter.name}`, requestId);
        }
        validateParameter(value, parameter.schema, parameter.name, requestId);
        // URL normalizes dot segments even when percent encoded; reject them explicitly.
        if (value === '.' || value === '..') {
          fail(`Invalid path parameter ${parameter.name}`, requestId);
        }
        path = path.replace(`{${parameter.name}}`, encodeURIComponent(String(value)));
      }
      const url = new URL(path, this.origin);

      for (const parameter of definition.queryParams) {
        const value = options.query?.[parameter.name];

        if (value === undefined || value === null) {
          if (parameter.required) {
            fail(`Missing query parameter ${parameter.name}`, requestId);
          }
          continue;
        }
        validateParameter(value, parameter.schema, parameter.name, requestId);
        // Current OpenAPI query parameters are scalar. Reject nested data instead of
        // turning object keys into undeclared query parameters.
        url.searchParams.set(parameter.name, parameterScalar(value, parameter.name, requestId));
      }

      for (const parameter of definition.headerParams) {
        if (parameter.required && !headers.has(parameter.name)) {
          fail(`Missing header ${parameter.name}`, requestId);
        }
      }
      if (definition.bodyRequired && options.body === undefined) {
        fail('Request body is required', requestId);
      }
      let body: string | undefined;

      if (options.body !== undefined) {
        const contentType = definition.requestContentType;

        if (!contentType) {
          fail('This operation does not accept a body', requestId);
        }
        headers.set('Content-Type', contentType);
        if (contentType === 'application/x-www-form-urlencoded') {
          if (!isRecord(options.body)) {
            fail('Form body must be an object', requestId);
          }
          const form = new URLSearchParams();

          for (const [key, value] of Object.entries(options.body)) {
            if (value !== undefined && value !== null) {
              form.set(key, String(value));
            }
          }
          body = form.toString();
        } else if (contentType.includes('json')) {
          try {
            body = JSON.stringify(options.body, (_key, value: unknown) => {
              if (typeof value === 'number' && !Number.isFinite(value)) {
                fail('JSON body must not contain non-finite numbers', requestId);
              }

              return value;
            });
          } catch {
            fail('Body is not JSON serializable', requestId);
          }
          if (body === undefined) {
            fail('Body is not JSON serializable', requestId);
          }
        } else if (typeof options.body === 'string') {
          body = options.body;
        } else {
          fail('Unsupported request body content type', requestId);
        }
      }
      const timeoutMs = options.timeoutMs ?? this.timeoutMs;

      if (!isValidTimeout(timeoutMs)) {
        fail('timeoutMs must be between 1 and 2147483647 milliseconds', requestId);
      }
      const controller = new AbortController();
      let timedOut = false;
      const onAbort = () => controller.abort();

      options.signal?.addEventListener('abort', onAbort, { once: true });
      if (options.signal?.aborted) {
        controller.abort();
      }
      const timer = setTimeout(() => {
        if (!controller.signal.aborted) {
          timedOut = true;
          controller.abort();
        }
      }, timeoutMs);

      try {
        if (controller.signal.aborted) {
          throw new SDKError('Request aborted', { code: 'SDK_ABORTED', requestId });
        }
        nextStage('api.http.wait');
        const response = await this.http.request<string>({
          url: url.toString(),
          method: definition.method,
          headers: Object.fromEntries(headers.entries()),
          data: body,
          signal: controller.signal,
          transformRequest: [(value: unknown) => value]
        });

        nextStage('api.sdk.response');
        const ok = response.status >= 200 && response.status < 300;
        const serverRequestId = response.headers['x-request-id'];
        const responseRequestId = redact(
          typeof serverRequestId === 'string' && serverRequestId.length ? serverRequestId : requestId,
          this.identity.kind === 'public' ? undefined : this.identity.token
        ) as string;
        const text = response.data;
        let payload: unknown;

        nextStage('api.json.parse');
        if (text && (definition.responseKind === 'json' || !ok)) {
          try {
            payload = JSON.parse(text);
          } catch {
            if (ok) {
              throw new SDKError('Invalid JSON response', { code: 'SDK_INVALID_RESPONSE', status: response.status, requestId: responseRequestId });
            }
          }
        }
        nextStage('api.sdk.envelope');
        if (!ok) {
          if (isRecord(payload) && payload.presentation !== undefined) {
            try {
              this.onPresentation?.(payload.presentation);
            } catch {
              /* Preserve the original HTTP failure. */
            }
          }
          const error = isRecord(payload) && isRecord(payload.error) ? payload.error : undefined;
          const secret = this.identity.kind === 'public' ? undefined : this.identity.token;

          throw new SDKError(redact(typeof error?.message === 'string' ? error.message : `HTTP ${response.status}`, secret) as string, {
            code: redact(typeof error?.code === 'string' ? error.code : 'SDK_HTTP_ERROR', secret) as string,
            status: response.status,
            requestId: redact(responseRequestId, secret) as string,
            details: redact(error?.details, secret)
          });
        }
        if (definition.responseKind === 'void') {
          stageOutcome = 'fulfilled';

          return undefined;
        }
        if (definition.responseKind === 'text') {
          stageOutcome = 'fulfilled';

          return text;
        }
        if (!text) {
          throw new SDKError('Expected a JSON response body', { code: 'SDK_INVALID_RESPONSE', status: response.status, requestId: responseRequestId });
        }
        if (definition.responseEnvelope) {
          if (!isRecord(payload) || !Object.prototype.hasOwnProperty.call(payload, 'data')) {
            throw new SDKError('Response is missing data', { code: 'SDK_INVALID_RESPONSE', status: response.status, requestId: responseRequestId });
          }
          // The Go API uses mutually exclusive data/error envelopes. A proxy or
          // incompatible server must not turn a failed game action into success.
          if (payload.error !== undefined && payload.error !== null) {
            throw new SDKError('Response contains an error', { code: 'SDK_INVALID_RESPONSE', status: response.status, requestId: responseRequestId });
          }

          if (payload.presentation !== undefined) {
            try {
              this.onPresentation?.(payload.presentation);
            } catch {
              // Optional presentation must not hide a committed business result.
            }
          }

          stageOutcome = 'fulfilled';

          return payload.data;
        }

        stageOutcome = 'fulfilled';

        return payload;
      } catch (error) {
        if (error instanceof SDKError) {
          throw error;
        }
        throw new SDKError(timedOut ? 'Request timed out' : controller.signal.aborted ? 'Request aborted' : 'Network request failed', {
          code: timedOut ? 'SDK_TIMEOUT' : controller.signal.aborted ? 'SDK_ABORTED' : 'SDK_NETWORK_ERROR',
          requestId
        });
      } finally {
        clearTimeout(timer);
        options.signal?.removeEventListener('abort', onAbort);
      }
    } finally {
      finishStage();
    }
  }
}

export function createClient(options: ClientOptions): APIClient {
  return new APIClient(options);
}
