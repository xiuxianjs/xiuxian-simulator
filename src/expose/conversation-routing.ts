import { Expose } from 'alemonjs';
import { authorizedEvent } from './access';
import { boolean, list, object, text } from './schema';

type Continuation = { active: boolean; flow?: string; hasNameDraft?: boolean; choices?: string[] };

export const conversationRoutingActions = {
  route_conversation: Expose.action<Continuation, unknown>({
    description: '只判断当前原始消息是否属于修仙对话，不读取账号、不注册、不推进。历史会话仅供识别短回答，不构成执行授权；ambiguous表示须结合上下文或澄清。',
    effect: 'read',
    inputSchema: object({ active: boolean, flow: text, hasNameDraft: boolean, choices: list(text) }, ['flow', 'hasNameDraft', 'choices']),
    outputSchema: object({
      protocol: { type: 'string', enum: ['plugin-conversation-route.v1'] },
      decision: { type: 'string', enum: ['matched', 'unmatched', 'ambiguous'] }
    }),
    authorize: (_input, context) => {
      authorizedEvent(context);

      return true;
    },
    handler: (input, context) => {
      const message = authorizedEvent(context).MessageText?.trim() ?? '';
      let decision: 'matched' | 'unmatched' | 'ambiguous' = 'unmatched';

      if (message && !/^[/#!！＃]/u.test(message)) {
        if (/修仙|道号|序章|新手引导|登记角色|注册角色|带我修行|炼丹|锻造|秘境|宗门|洞府|灵根|经脉|神魂|渡劫|功法|灵石/u.test(message)) {
          decision = 'matched';
        } else if (input.active && input.flow === 'registration' && input.hasNameDraft && /^(?:男修|女修|男|女)$/u.test(message)) {
          decision = 'matched';
        } else if (input.active && input.choices?.includes(message)) {
          decision = 'matched';
        } else if (input.active && !/天气|吃什么|晚饭|午饭|早饭|新闻|写代码|翻译|播放音乐/u.test(message) && [...message].length <= 12) {
          decision = 'ambiguous';
        }
      }

      return { protocol: 'plugin-conversation-route.v1', decision };
    }
  })
};
