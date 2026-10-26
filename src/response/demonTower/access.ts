import { FormatGui } from '@src/utils/messageHelper';
import { Format } from 'alemonjs';

export function sendDemonTowerLockedPage(params: {
  bid: string | number | undefined;
  isPrivate: boolean;
  message: { send: (...payload: any[]) => unknown };
  title?: string;
  realmName: string;
}) {
  const md = Format.createMarkdown();
  const targetBid = typeof params.bid === 'string' ? params.bid : params.bid === undefined ? undefined : String(params.bid);

  md.addText(`筑基及以上方可开启妖塔，当前境界：${params.realmName}`);

  const footer = [{ label: '我的境界', command: '/我的境界' }];

  void params.message.send(FormatGui({ isPrivate: params.isPrivate, bid: targetBid, title: params.title ?? '妖塔', content: md, footer }));
}
