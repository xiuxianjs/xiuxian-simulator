import { useMessage } from '@src/utils/useMessage';
import { parseBackendSecretRealmView } from '@src/api/bot/guild-secret-realm-war';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { selects } from '@src/response/config';
import { FormatGui } from '@src/utils/messageHelper';
import { listBubble } from '@src/response/presentation/index';
import { Format, onResponse, useEvent } from 'alemonjs';
export default onResponse(selects, async e => {
  const text = (e.MessageText || '').trim();
  const m = text.match(/^[!！/#＃]?(?:灵脉攻防战|秘境攻防)查看(?:\s+(\d+)(?:\s+(\d+))?)?\s*$/);

  if (!m) {
    return;
  }
  const [message] = useMessage();
  const bid = e?.UserId;
  const realmNo = m[1] ? Number(m[1]) : null;
  const page = Math.max(1, Number(m[2] || 1));
  const [, next] = useEvent();
  const md = Format.createMarkdown();
  const sendFailure = (text: string) => message.send(
      FormatGui({
        isPrivate: e.isPrivate ?? false,
        bid,
        title: '灵脉攻防战',
        content: md.addText(text),
        footer: [{ label: '攻防列表', command: '/灵脉攻防战列表 1', autoEnter: false }]
      })
    );
  let loaded;

  try {
    loaded = await runRobotBusiness(
      e,
      'secret-realm.view',
      { realmNo: realmNo ? String(realmNo) : null, page: String(page) },
      parseBackendSecretRealmView,
      next,
      async reply => {
        await sendFailure(reply.text);
      }
    );
  } catch (error: any) {
    await sendFailure(error?.message ?? '查看秘境失败');

    return;
  }
  if (loaded.handled) {
    return;
  }
  const items = (loaded.data.positions as Array<Record<string, unknown>>).map(item => {
    const owner = typeof item.occupiedUserName === 'string' && item.occupiedUserName.length > 0 ? item.occupiedUserName : `NPC#${item.npcId}`;

    return {
      title: `${item.positionNo}号位`,
      lines: [`积分：${item.positionPoints}分`, `占领：${owner}`],
      actions: realmNo ? [{ label: '挑战', command: `/灵脉攻防战挑战 ${realmNo} ${item.positionNo}`, autoEnter: false }] : []
    };
  });

  void message.send(
    listBubble({
      isPrivate: e.isPrivate ?? false,
      bid,
      title: '灵脉攻防战',
      items: items.length > 0 ? items : [{ lines: ['状态：本页暂无阵位'] }],
      nav: realmNo ? { current: page, hasNext: items.length === 5, command: `/灵脉攻防战查看 ${realmNo} {page}` } : undefined,
      footer: [{ label: '攻防列表', command: '/灵脉攻防战列表 1', autoEnter: false }]
    })
  );
});
