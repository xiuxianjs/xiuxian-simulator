import { selects } from '@src/response/config';
import { buildBubble, errorBubble } from '@src/response/presentation';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { useMessage } from '@src/utils/useMessage';
import { onResponse, useEvent } from 'alemonjs';
import { encounterBubble, encounterReceiptBubble, parseEncounter, parseEncounterReceipt } from './view';

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const [, next] = useEvent();
  const command = (e.MessageText ?? '').trim().replace(/^[!！/#＃]/, '');
  const identity = { isPrivate: e.isPrivate, bid: e.UserId };

  try {
    if (command === '我的奇遇') {
      const result = await runRobotBusiness(e, 'online-encounter.pending', {}, data => parseEncounter((data as { pending: unknown }).pending), next);

      if (!result.handled) {
        await message.send(
          result.data
            ? encounterBubble(e, result.data)
            : buildBubble({
                ...identity,
                title: '我的奇遇',
                sections: [{ lines: ['状态：当前没有待选择的奇遇。'] }]
              })
        );
      }

      return;
    }
    const match = /^奇遇选择\s+([1-9]\d{0,19})\s+([12])$/.exec(command);

    if (!match) {
      await message.send(errorBubble({ ...identity, title: '奇遇选择', reason: '请从原奇遇气泡或「我的奇遇」中选择。' }));

      return;
    }
    const result = await runRobotBusiness(e, 'online-encounter.claim', { id: match[1], choice: Number(match[2]) }, parseEncounterReceipt, next);

    if (!result.handled) {
      await message.send(encounterReceiptBubble(e, result.data));
    }
  } catch {
    await message.send(errorBubble({ ...identity, title: '奇遇', reason: '奇遇暂时无法处理，请稍后再试。' }));
  }
});
