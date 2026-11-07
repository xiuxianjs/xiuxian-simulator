import { useMessage } from '@src/utils/useMessage';
import { parseBackendSecretRealmList } from '@src/api/bot/guild-secret-realm-war';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { selects } from '@src/response/config';
import { FormatGui } from '@src/utils/messageHelper';
import { listBubble } from '@src/response/presentation/index';
import { Format, onResponse, useEvent } from 'alemonjs';
export default onResponse(selects, async e => {
  const text = (e.MessageText || '').trim();
  const m = text.match(/^[!！/#＃]?(?:灵脉攻防战|秘境攻防)列表\s*(\d+)?\s*$/);

  if (!m) {
    return;
  }
  const [message] = useMessage();
  const bid = e?.UserId;
  const page = Math.max(1, Number(m[1] || 1));
  const [, next] = useEvent();
  const md = Format.createMarkdown();
  const sendFailure = (text: string) => message.send(
      FormatGui({
        isPrivate: e.isPrivate ?? false,
        bid,
        title: '灵脉攻防战列表',
        content: md.addText(text),
        footer: [{ label: '返回', command: '/灵脉攻防战', autoEnter: false }]
      })
    );
  let loaded;

  try {
    loaded = await runRobotBusiness(e, 'secret-realm.list', { page: String(page) }, parseBackendSecretRealmList, next, async reply => {
      await sendFailure(reply.text);
    });
  } catch (error: any) {
    await sendFailure(error?.message ?? '获取秘境列表失败');

    return;
  }
  if (loaded.handled) {
    return;
  }
  const items = (loaded.data.items as Array<Record<string, unknown>>).map(item => {
    const winner = typeof item.winnerGuildName === 'string' && item.winnerGuildName.length > 0 ? item.winnerGuildName : '无人占领';
    const points = typeof item.winnerPoints === 'number' ? item.winnerPoints : 0;

    return {
      title: String(item.name),
      id: String(item.realmNo),
      lines: [`类型：${item.tier}`, `领先：${winner} ${points}分`],
      actions: [{ label: '查看', command: `/灵脉攻防战查看 ${item.realmNo} 1`, autoEnter: false }]
    };
  });

  void message.send(
    listBubble({
      isPrivate: e.isPrivate ?? false,
      bid,
      title: '灵脉攻防战列表',
      items: items.length > 0 ? items : [{ lines: ['状态：本页暂无秘境'] }],
      nav: { current: page, hasNext: items.length === 5, command: '/灵脉攻防战列表 {page}' },
      footer: [{ label: '返回', command: '/灵脉攻防战', autoEnter: false }]
    })
  );
});
