import { useMessage } from '@src/utils/useMessage';
import UpdateApp from '@src/response-apps/message/config/update/app';
import SettingsApp from '@src/response-apps/message/settings/app';
import { selects } from '@src/response/config';
import { FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse, useEvent } from 'alemonjs';

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e?.UserId;
  const [, next] = useEvent();
  const isPrivate = e.isPrivate ?? false;

  const text = (e.MessageText ?? '').trim();

  // 判断是灵晶还是道晶
  const isCrystal = /灵晶确认/.test(text);
  const isDao = /道晶确认/.test(text);

  if (!isCrystal && !isDao) {
    return;
  }

  const currencyLabel = isCrystal ? '灵晶' : '道晶';
  const actionType = isCrystal ? 'CONFIRM_SPIRIT_CRYSTAL' : 'CONFIRM_DAO_CRYSTAL';

  const renderThresholdText = (threshold: number) => `${currencyLabel}购买确认阈值已设置为：${threshold > 0 ? `≥${threshold} 触发确认` : '已关闭'}`;

  // 检查是否直接带了数字参数
  const directMatch = text.match(/(\d+)\s*$/);

  if (directMatch) {
    const threshold = Number(directMatch[1]);
    const md = Format.createMarkdown();

    const result = await UpdateApp({
      event: e,
      next,
      action: {
        type: actionType,
        threshold
      }
    });

    if (!result) {
      return;
    }

    if (result.code !== 'OK') {
      md.addText('设置配置失败');

      void message.send(FormatGui({ isPrivate, bid, title: '我的设置', content: md }));

      return;
    }

    if (result.data.type !== actionType) {
      md.addText('设置配置失败');

      void message.send(FormatGui({ isPrivate, bid, title: '我的设置', content: md }));

      return;
    }

    md.addText(renderThresholdText(result.data.threshold));

    void message.send(FormatGui({ isPrivate, bid, title: '我的设置', content: md }));

    return;
  }

  // 无参数，交互式引导
  const settingsResult = await SettingsApp({ event: e, next });

  if (!settingsResult) {
    return;
  }

  if (settingsResult.code !== 'OK') {
    const md = Format.createMarkdown();

    md.addText('读取配置失败');

    void message.send(FormatGui({ isPrivate, bid, title: '我的设置', content: md }));

    return;
  }

  const current = isCrystal ? settingsResult.data.confirmSpiritCrystal : settingsResult.data.confirmDaoCrystal;

  const md = Format.createMarkdown();
  const cmdName = isCrystal ? '配置灵晶确认' : '配置道晶确认';

  md.addText(`当前${currencyLabel}确认阈值：${current > 0 ? current : '已关闭'}`);
  md.addNewline();
  md.addText(`请发送：/${cmdName} 金额（0=关闭确认）`);

  const presetFooter = [
    { label: '关闭', command: `/${cmdName} 0` },
    { label: '10000', command: `/${cmdName} 10000` },
    { label: '100000', command: `/${cmdName} 100000` }
  ];

  void message.send(FormatGui({ isPrivate, bid, title: '我的设置', content: md, footer: presetFooter }));
});
