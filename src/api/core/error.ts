export class SDKError extends Error {
  readonly code: string;
  readonly status?: number;
  readonly requestId?: string;
  readonly details?: unknown;

  constructor(message: string, options: { code: string; status?: number; requestId?: string; details?: unknown }) {
    super(message);
    this.name = 'SDKError';
    this.code = options.code;
    this.status = options.status;
    this.requestId = options.requestId;
    this.details = options.details;
  }
}
