import { parsePeiyuanConfirm } from '@src/api/bot/peiyuan-confirm';
import { sendMiddlewareReply } from '@src/response/middlewareReply';
import { withBusinessRecovery } from '@src/response/businessRecovery';
import { loadFinalBusiness } from '@src/response/finalBusiness';
import { useEvent } from 'alemonjs';
import { useMessage } from '@src/utils/useMessage';
/**
 * 确认培元丹效果
 * 指令：/确认培元丹
 */
import App from '@src/response-apps/peiyuanDan/confirm/app';
import { createBackendRequestContext } from '@src/api/bot/context';
import { selects } from '@src/response/config';
import { FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse } from 'alemonjs';
export default onResponse(selects, async e => {
  const [, next] = useEvent();
  const [message] = useMessage();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? e.name.startsWith('private.');
  const failure = (text: string) => sendMiddlewareReply(e, withBusinessRecovery('peiyuan.confirm', { title: '', heading: '', text, buttons: [], advice: [] }));

  if (!/^[!！/#＃]?确认培元丹$/.test((e.MessageText ?? '').trim())) {
    await failure('参数错误：确认培元丹不接收额外参数，请先核对原预览。');

    return;
  }
  const business = await loadFinalBusiness(e, next, 'peiyuan.confirm', {}, parsePeiyuanConfirm);

  if (business.handled) {
    return;
  }
  const result = await App({ load: business.load, bid: String(e.UserId), uid: e.uid as number, request: createBackendRequestContext(e) });

  if (result.code === 'CONFIRM_FAILED') {
    await failure('培元丹确认结果未获完整确认，请先核对属性、原预览与持有数量。');

    return;
  }

  const md = Format.createMarkdown();

  md.addText('✅ 培元丹确认已处理');
  md.addNewline();
  md.addNewline();

  if (result.data.changes.length > 0) {
    md.addText('原预览变化回执（当前属性以属性面板为准）：').addNewline();
    for (const c of result.data.changes) {
      const sign = c.change >= 0 ? `+${c.change}` : `${c.change}`;
      const icon = c.change > 0 ? '↑' : c.change < 0 ? '↓' : '—';

      md.addText(`${icon} ${c.attributeName}：${c.oldValue} → ${c.newValue}（${sign}）`);
      md.addNewline();
    }
  } else {
    md.addText('本次没有属性变化；请核对属性面板，丹药不会因此返还。');
  }

  md.addNewline();

  void message.send(
    FormatGui({
      isPrivate,
      bid,
      title: '',
      content: md,
      footer: [{ label: '查看属性', command: '/属性面板' }, ...(result.data.changes.length ? [{ label: '继续服用', command: '/服用 培元丹 1' }] : [])]
    })
  );
});
