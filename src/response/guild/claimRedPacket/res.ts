import { useMessage } from '@src/utils/useMessage';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { parseGuildRedPacketSettlement } from '@src/api/bot/guild-red-packet-mutations';
import { selects } from '@src/response/config';
import { FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse, useEvent } from 'alemonjs';

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? false;
  const [, next] = useEvent();
  const match = (e.MessageText ?? '').match(/^[!！/#＃]?领红包\s+(\d+)\s*$/);

  const parsedPacketId = Number(match?.[1] ?? 0);
  const packetId = Number.isFinite(parsedPacketId) ? parsedPacketId : null;
  const send = async (text: string) => {
    await message.send(
      FormatGui({ isPrivate, bid, title: '', content: Format.createMarkdown().addText(text), footer: [{ label: '宗门红包', command: '/宗门红包' }] })
    );
  };
  const loaded = await runRobotBusiness(
    e,
    'guild.red-packet-claim',
    { packetId },
    value => parseGuildRedPacketSettlement(value, '领取'),
    next,
    async reply => {
      await send(reply.text);
    }
  ).catch(async error => {
    await send(error instanceof Error ? error.message : '领取红包失败，请稍后再试或联系运营。');

    return { handled: true as const };
  });

  if (loaded.handled) {
    return;
  }
  await send(loaded.data.message);
});
