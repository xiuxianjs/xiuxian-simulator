import { getBackendFriendAccess } from '@src/api/bot/queries';
import { FormatGui } from '@src/utils/messageHelper';
import { Format } from 'alemonjs';

export async function canAccessSpar(uid?: number | null, bid?: string) {
  if (!bid || typeof uid !== 'number' || !Number.isSafeInteger(uid) || uid <= 0) {
    return {
      ok: false,
      realmName: '未知'
    };
  }

  const [, sparAccess] = await getBackendFriendAccess(bid, uid);

  return {
    ok: sparAccess.ok,
    realmName: sparAccess.realmName
  };
}

export function sendSparLockedPage(params: {
  bid: string | number | undefined;
  isPrivate: boolean;
  message: { send: (...payload: any[]) => unknown };
  title?: string;
  realmName: string;
}) {
  const md = Format.createMarkdown();
  const targetBid = typeof params.bid === 'string' ? params.bid : params.bid === undefined ? undefined : String(params.bid);

  md.addText(`筑基初期及以上方可发起比试，当前境界：${params.realmName}`);

  void params.message.send(
    FormatGui({
      isPrivate: params.isPrivate,
      bid: targetBid,
      title: params.title ?? '比试',
      content: md,
      footer: [{ label: '我的境界', command: '/我的境界' }]
    })
  );
}
