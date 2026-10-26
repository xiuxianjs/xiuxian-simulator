import { useMessage } from '@src/utils/useMessage';
import { parseBackendSecretRealmList } from '@src/api/bot/guild-secret-realm-war';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { selects } from '@src/response/config';
import { FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse, useEvent } from 'alemonjs';
export default onResponse(selects, async e => {
  const text = (e.MessageText || '').trim();
  const m = text.match(/^[!！/#＃]?(?:灵脉攻防战|秘境攻防)列表\s*(\d+)?\s*$/);

  if (!m) {
    return;
  }
  const [message] = useMessage();
  const bid = e?.UserId;
  const [, next] = useEvent();
  const md = Format.createMarkdown();
  const sendFailure = (text: string) => message.send(
      FormatGui({
        isPrivate: e.isPrivate ?? false,
        bid,
        title: '灵脉攻防战列表',
        content: md.addText(text),
        footer: [{ label: '返回', command: '/灵脉攻防战' }]
      })
    );
  let loaded;

  try {
    loaded = await runRobotBusiness(e, 'secret-realm.list', { page: String(Number(m[1] || 1)) }, parseBackendSecretRealmList, next, async reply => {
      await sendFailure(reply.text);
    });
  } catch (error: any) {
    await sendFailure(error?.message ?? '获取秘境列表失败');

    return;
  }
  if (loaded.handled) {
    return;
  }
  for (const item of loaded.data.items as Array<Record<string, unknown>>) {
    const winner = typeof item.winnerGuildName === 'string' && item.winnerGuildName.length > 0 ? item.winnerGuildName : '无人占领';
    const points = typeof item.winnerPoints === 'number' ? item.winnerPoints : 0;

    md.addText(`【${item.realmNo}】${item.name}（${item.tier}）\n领先：${winner} ${points}分\n查看：/灵脉攻防战查看 ${item.realmNo} 1\n`);
  }
  void message.send(
    FormatGui({ isPrivate: e.isPrivate ?? false, bid, title: '灵脉攻防战列表', content: md, footer: [{ label: '返回', command: '/灵脉攻防战' }] })
  );
});
