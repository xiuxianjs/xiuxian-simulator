import { getConfig } from 'alemonjs';
import type { TestContext } from 'node:test';

export function mockBackendConfig(t: TestContext, backend: Record<string, unknown>, qq = { app_id: '100017' }) {
  t.mock.getter(getConfig(), 'value', () => ({ 'qq-bot': qq, 'xiuxian-game': { backend } }));
}
