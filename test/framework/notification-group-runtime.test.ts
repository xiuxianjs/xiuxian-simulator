import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';
import axios from 'axios';
import { createTestApp } from 'alemonjs/testing';

test('ordinary group messages still sync contacts without writing notification activity candidates', async t => {
  const previousDirectory = process.cwd();
  const directory = await mkdtemp(join(tmpdir(), 'notification-group-runtime-'));
  process.chdir(directory);
  t.after(async () => {
    process.chdir(previousDirectory);
    await rm(directory, { recursive: true, force: true });
  });
  const app = createTestApp({
    config: { 'qq-bot': { app_id: '100017' }, 'xiuxian-game': { backend: { api_url: 'https://synthetic.test', worker_token: 'fixture' } } }
  });
  t.after(() => app.dispose());
  const artifact = process.env.XIUXIAN_GROUP_EVENT_RUNTIME_ARTIFACT;
  const { default: plugin } = artifact
    ? await import(pathToFileURL(artifact).href) as typeof import('../../src/index')
    : await import('../../src/index');
  const lifecycle = typeof plugin.callback === 'function' ? await plugin.callback() : plugin.callback;
  const contacts = Promise.withResolvers<void>();
  const paths: string[] = [];
  t.mock.method(axios, 'create', () => ({
    post: async (path: string, body: { items?: { groupId: string }[] }) => {
      paths.push(path);
      if (path.endsWith('/contacts/observe')) {
        assert.deepEqual(body.items?.map(item => item.groupId), ['group']);
        contacts.resolve();
        return { data: { items: [{}] } };
      }
      return { data: { data: { ok: true } } };
    }
  }));
  const event = {
    ...app.events.groupMessage({ platform: 'qq-bot', botId: '100017', userId: 'player' }),
    Target: { platform: 'qq-bot', BotId: '100017', scope: 'group', targetId: 'group' } as const
  };
  const result = await app.runHandler(async () => {
    const timer = setTimeout(() => contacts.reject(new Error('contacts/observe 未收到群消息观察')), 3000);
    try {
      await lifecycle.onCreated?.();
      await lifecycle.onEventStart?.({ event, name: event.name });
      await contacts.promise;
      assert.equal(paths.some(path => path.endsWith('/activity/remember')), false);
    } finally {
      clearTimeout(timer);
      await lifecycle.onDispose?.();
    }
  }, event);
  assert.deepEqual(result.errors, []);
});
