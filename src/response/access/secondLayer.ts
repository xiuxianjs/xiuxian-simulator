import { realmGrowthTips } from '@src/response/businessRecovery';
import { appendMiddlewareAdvice } from '@src/response/middlewareReply';
import { FormatGui } from '@src/utils/messageHelper';
import { Format } from 'alemonjs';

export function sendSecondLayerLockedPage(params: {
  bid: string | number | undefined;
  isPrivate: boolean;
  message: { send: (...payload: any[]) => unknown };
  title: string;
  realmName: string;
}) {
  const md = Format.createMarkdown();
  const targetBid = typeof params.bid === 'string' ? params.bid : params.bid === undefined ? undefined : String(params.bid);

  md.addText(`练气二层及以上方可开启该功能，当前境界：${params.realmName}`);
  appendMiddlewareAdvice(md, realmGrowthTips());

  void params.message.send(
    FormatGui({
      isPrivate: params.isPrivate,
      bid: targetBid,
      title: params.title,
      content: md,
      footer: [{ label: '我的境界', command: '/我的境界' }]
    })
  );
}
