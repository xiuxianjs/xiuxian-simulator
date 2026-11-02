import { registerExpose } from 'alemonjs';
import { conversationLifecycle } from '../../src/agent-play/lifecycle';
import handler from '../../../alemonjs-agent-link/lib/response/dsh/plugin-conversation.js';
export default async () => {
  registerExpose('xiuxian-game', [conversationLifecycle]);
  await handler();
};
