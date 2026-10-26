import { useMessage } from '@src/utils/useMessage';
import { parseBackendSecretRealmClaim } from '@src/api/bot/guild-secret-realm-war';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { selects } from '@src/response/config';
import { FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse, useEvent } from 'alemonjs';
export default onResponse(selects, async e => {
  if (!/^[!！/#＃]?(?:灵脉攻防战|秘境攻防)领取奖励\s*$/.test((e.MessageText || '').trim())) {
    return;
  }
  const [message] = useMessage();
  const bid = e?.UserId;
  const [, next] = useEvent();
  const md = Format.createMarkdown();
  const sendFailure = (text: string) => message.send(
      FormatGui({ isPrivate: e.isPrivate ?? false, bid, title: '灵脉攻防战', content: md.addText(text), footer: [{ label: '返回', command: '/灵脉攻防战' }] })
    );
  let loaded;

  try {
    loaded = await runRobotBusiness(e, 'secret-realm.claim', {}, parseBackendSecretRealmClaim, next, async reply => {
      await sendFailure(reply.text);
    });
  } catch (error: any) {
    await sendFailure(error?.message ?? '领取奖励失败');

    return;
  }
  if (loaded.handled) {
    return;
  }
  md.addText(`领取成功：灵晶${loaded.data.spiritCrystal} ｜ 贡献${loaded.data.contribution} ｜ 宗门声望${loaded.data.reputation}`);
  void message.send(FormatGui({ isPrivate: e.isPrivate ?? false, bid, title: '灵脉攻防战', content: md, footer: [{ label: '返回', command: '/灵脉攻防战' }] }));
});
