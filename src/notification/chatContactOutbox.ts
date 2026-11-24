import type { ChatContactObservation } from '@src/api/bot/chat';
import { randomUUID } from 'node:crypto';
import { mkdir, open, readdir, readFile, rename, rm } from 'node:fs/promises';
import { join } from 'node:path';

export const observationKey = (item: ChatContactObservation) => JSON.stringify([
    item.botId,
    item.kind.startsWith('group') ? 'group' : 'friend',
    item.kind.startsWith('group') ? (item.groupId ?? '') : '',
    ['group_allow', 'group_block'].includes(item.kind) ? 'permission' : ['group_join', 'group_exit'].includes(item.kind) ? 'presence' : 'member',
    ['group_join', 'group_exit', 'group_allow', 'group_block'].includes(item.kind) ? '' : (item.memberId ?? item.openId),
    // Explicit identity links must survive later member-only traffic/departures.
    item.aliasId ? item.openId : ''
  ]);
const negative = (item: ChatContactObservation) => ['removed', 'group_leave', 'group_exit', 'group_block'].includes(item.kind);

export const newerObservation = (a: ChatContactObservation, b: ChatContactObservation) => {
  return a.occurredAt > b.occurredAt || (a.occurredAt === b.occurredAt && (negative(a) || (!negative(b) && !!a.aliasId)));
};

type PendingObservation = { item: ChatContactObservation; paths: string[] };
const OUTBOX_READ_CONCURRENCY = 8;

async function readObservation(path: string): Promise<{ item: ChatContactObservation; path: string } | undefined> {
  let content: string;

  try {
    content = await readFile(path, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }

    return undefined;
  }
  try {
    return { item: JSON.parse(content), path };
  } catch {
    throw new Error('通讯录待同步文件不是有效 JSON');
  }
}

/** Durable transport spool, not a relationship authority. Immutable filenames
 * make acknowledgements safe when another process writes to the same volume. */
export class ChatContactOutbox {
  private writes: Promise<void> = Promise.resolve();
  private latest = new Map<string, { item: ChatContactObservation; path: string }>();

  constructor(readonly directory: string) {}

  put(item: ChatContactObservation): Promise<void> {
    const operation = this.writes.then(async () => {
      const key = observationKey(item);
      const previous = this.latest.get(key);

      if (previous && !newerObservation(item, previous.item)) {
        return;
      }
      await mkdir(this.directory, { recursive: true, mode: 0o700 });
      const path = join(this.directory, `${randomUUID()}.json`);
      const temporary = `${path}.tmp`;
      const file = await open(temporary, 'wx', 0o600);

      try {
        await file.writeFile(JSON.stringify(item));
        await file.sync();
      } finally {
        await file.close();
      }
      await rename(temporary, path);
      // Windows does not support syncing a directory handle.
      if (process.platform !== 'win32') {
        const directory = await open(this.directory, 'r');

        try {
          await directory.sync();
        } finally {
          await directory.close();
        }
      }
      this.latest.delete(key);
      this.latest.set(key, { item, path });
      while (this.latest.size > 5000) {
        this.latest.delete(this.latest.keys().next().value!);
      }
      // Retire the old revision only after the replacement is installed.
      if (previous) {
        await rm(previous.path, { force: true });
      }
    });

    this.writes = operation.catch(() => {});

    return operation;
  }

  async batch(): Promise<{ entries: PendingObservation[]; fileCount: number }> {
    await this.writes;
    await mkdir(this.directory, { recursive: true, mode: 0o700 });
    const selected = new Map<string, PendingObservation>();
    const names = (await readdir(this.directory)).filter(name => name.endsWith('.json')).sort();

    for (let offset = 0; offset < names.length; offset += OUTBOX_READ_CONCURRENCY) {
      const results = await Promise.allSettled(names.slice(offset, offset + OUTBOX_READ_CONCURRENCY).map(name => readObservation(join(this.directory, name))));

      for (const result of results) {
        if (result.status === 'rejected') {
          throw result.reason;
        }
        if (!result.value) {
          continue;
        }
        const { item, path } = result.value;
        const key = observationKey(item);
        const previous = selected.get(key);

        if (previous) {
          previous.paths.push(path);
          if (newerObservation(item, previous.item)) {
            previous.item = item;
          }
        } else if (selected.size < 100) {
          selected.set(key, { item, paths: [path] });
        }
      }
    }

    return { entries: [...selected.values()], fileCount: names.length };
  }

  async acknowledge(batch: PendingObservation[]): Promise<void> {
    for (const entry of batch) {
      for (const path of entry.paths) {
        await rm(path, { force: true });
      }
      const key = observationKey(entry.item);
      const latest = this.latest.get(key);

      if (latest && entry.paths.includes(latest.path)) {
        this.latest.delete(key);
      }
    }
  }

  async idle(): Promise<void> {
    await this.writes;
  }
}
