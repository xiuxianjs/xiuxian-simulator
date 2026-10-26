import { getConfig } from 'alemonjs';
import type { TestContext } from 'node:test';

export function mockBackendConfig(t: TestContext, backend: Record<string, unknown>) {
  t.mock.getter(getConfig(), 'value', () => ({ 'xiuxian-game': { backend } }));
}
