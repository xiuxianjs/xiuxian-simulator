import { measureTransportStage } from '@src/utils/transportTiming';
import { useMessage } from '@src/utils/useMessage';
import { createAvatar } from '@src/img/request';
import RightsPanel, { type RightsPanelData } from '@src/img/views/RightsPanel';
import { ImageCache } from '@src/utils/imageCdn';
import App from '@src/response-apps/monthCard/rights/app';
import { selects } from '@src/response/config';
import { FormatGui } from '@src/utils/messageHelper';
import { Format, logger, onResponse } from 'alemonjs';
import { renderComponentIsHtmlToBuffer } from 'jsxp';
import { createHash } from 'node:crypto';

/** 渲染权益面板图片并返回 URL */
async function renderRightsImage(uid: number, panelData: RightsPanelData): Promise<string | null> {
  const md5Key = createHash('md5').update(JSON.stringify(panelData)).digest('hex');
  const imageCache = ImageCache.create({ key: `rights-panel-${uid}`, md5Key });
  const cachedURL = await imageCache.getURL();

  if (cachedURL) {
    return cachedURL;
  }

  const imgBuf = await measureTransportStage('image.render', () => renderComponentIsHtmlToBuffer(RightsPanel, { data: panelData }));

  if (!imgBuf || typeof imgBuf === 'boolean') {
    return null;
  }

  return (await measureTransportStage('image.upload', () => imageCache.uploadImage({ img: imgBuf }))) ?? null;
}

/**
 * 我的权益指令
 * 展示当前用户的 VIP 信息与月卡权益详情
 */
export default onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e?.UserId;
  const uid = e.uid as number;
  const isPrivate = e.isPrivate ?? false;
  let navButtons = {
    header: [
      { label: '特权', command: '/我的特权' },
      { label: '权益', command: '/我的权益' }
    ],
    footer: [
      { label: '领取', command: '/月卡领取' },
      { label: '充值', command: '/充值' }
    ]
  };

  try {
    const avatarURL = await createAvatar(e.UserAvatar).catch(() => '');
    const result = await App({ uid, avatarURL, bid });
    const access = result.code === 'OK' ? result.access : { canUseMeridian: false, canUseSoulPath: false };

    navButtons = {
      header: [
        { label: '特权', command: '/我的特权' },
        { label: '权益', command: '/我的权益' },
        ...(access.canUseMeridian ? [{ label: '里程碑', command: '/里程碑' }] : []),
        ...(access.canUseSoulPath ? [{ label: '元婴道途', command: '/元婴道途' }] : []),
        { label: '我的主页', command: '/我' }
      ],
      footer: [
        { label: '领取', command: '/月卡领取' },
        { label: '充值', command: '/充值' }
      ]
    };
    const md = Format.createMarkdown();

    if (result.code === 'INVALID_USER') {
      md.addText('未找到用户信息，请稍后再试或联系运营。');

      void message.send(FormatGui({ isPrivate, bid, ...navButtons, content: md }));

      return;
    }

    if (result.code !== 'OK') {
      md.addText('查询失败，请稍后再试或联系运营。');

      void message.send(FormatGui({ isPrivate, bid, content: md, ...navButtons }));

      return;
    }

    const imageURL = await renderRightsImage(uid, result.data);

    if (imageURL) {
      md.addImage(imageURL);
    } else {
      md.addText('权益面板渲染失败，请稍后再试');
    }

    void message.send(FormatGui({ isPrivate, bid, content: md, ...navButtons }));
  } catch (error) {
    logger.error('我的权益查询失败:', error);
    const md = Format.createMarkdown();

    md.addText('查询失败，请稍后再试或联系运营。');

    void message.send(FormatGui({ isPrivate, bid, content: md, ...navButtons }));
  }
});
