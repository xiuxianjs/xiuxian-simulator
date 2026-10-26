import { useMessage } from '@src/utils/useMessage';
import { parseBackendSecretRealmView } from '@src/api/bot/guild-secret-realm-war';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { selects } from '@src/response/config';
import { FormatGui } from '@src/utils/messageHelper';
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
  const [, next] = useEvent();
  const md = Format.createMarkdown();
  const sendFailure = (text: string) => message.send(
      FormatGui({
        isPrivate: e.isPrivate ?? false,
        bid,
        title: '灵脉攻防战',
        content: md.addText(text),
        footer: [{ label: '攻防列表', command: '/灵脉攻防战列表 1' }]
      })
    );
  let loaded;

  try {
    loaded = await runRobotBusiness(
      e,
      'secret-realm.view',
      { realmNo: realmNo ? String(realmNo) : null, page: String(Number(m[2] || 1)) },
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
  for (const item of loaded.data.positions as Array<Record<string, unknown>>) {
    const owner = typeof item.occupiedUserName === 'string' && item.occupiedUserName.length > 0 ? item.occupiedUserName : `NPC#${item.npcId}`;

    md.addText(`${item.positionNo}号位｜${item.positionPoints}分｜${owner}\n挑战：/灵脉攻防战挑战 ${realmNo} ${item.positionNo}\n`);
  }
  void message.send(
    FormatGui({ isPrivate: e.isPrivate ?? false, bid, title: '灵脉攻防战', content: md, footer: [{ label: '攻防列表', command: '/灵脉攻防战列表 1' }] })
  );
});
