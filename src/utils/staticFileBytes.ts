import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';

/** One static asset per instance; cache bytes, never platform media receipts. */
export class StaticFileBytesCache {
  private readonly path: string;
  private cached?: { signature: string; bytes: Buffer };
  private pending?: { signature: string; job: Promise<Buffer>; owner: symbol };

  constructor(path: string) {
    this.path = resolve(path);
  }

  protected async readBytes(): Promise<Buffer> {
    return await readFile(this.path);
  }

  private async signature(): Promise<string> {
    const value = await stat(this.path, { bigint: true });

    if (!value.isFile()) {
      throw new Error('Static image must be a regular file');
    }

    return [this.path, value.dev, value.ino, value.size, value.mtimeNs, value.ctimeNs, value.mode].join(':');
  }

  async load(): Promise<Buffer> {
    let signature: string;

    try {
      signature = await this.signature();
    } catch (error) {
      this.cached = undefined;
      throw error;
    }

    if (this.cached?.signature === signature) {
      return this.cached.bytes;
    }
    this.cached = undefined;

    if (this.pending?.signature === signature) {
      return await this.pending.job;
    }

    const owner = Symbol();
    const job = (async () => {
      const bytes = await this.readBytes();

      // A replaced asset or an older in-flight read must never populate the new version's cache.
      if ((await this.signature()) === signature && this.pending?.owner === owner) {
        this.cached = { signature, bytes };
      }

      return bytes;
    })();

    this.pending = { signature, job, owner };

    try {
      return await job;
    } finally {
      if (this.pending?.job === job) {
        this.pending = undefined;
      }
    }
  }
}
