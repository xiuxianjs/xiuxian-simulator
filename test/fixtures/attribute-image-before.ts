import { createAvatar } from '../../src/img/request';
import AttributePanel, { type AttributePanelData } from '../../src/img/views/AttributePanel';
import App from '../../src/response-apps/attributes/update/app';
import { selects } from '../../src/response/config';
import { ImageCache } from '../../src/utils/imageCdn';
import { addOptions, FormatGui } from '../../src/utils/messageHelper';
import { recoverySummaryMarkdown } from '../../src/utils/resourceRecoveryDisplay';
import { measureTransportStage } from '../../src/utils/transportTiming';
import { useMessage } from '../../src/utils/useMessage';
import { Format, onResponse } from 'alemonjs';
import { createHash } from 'crypto';
import { renderComponentIsHtmlToBuffer } from 'jsxp';

function renderAttributeImage(uid: number, panelData: AttributePanelData): Promise<string | null> {
  const md5Key = createHash('md5').update(JSON.stringify(panelData)).digest('hex');
  const imageCache = ImageCache.create({
    key: `attribute-panel-${uid}`,
    md5Key
  });

  return imageCache.getOrCreate(async () => {
    const imgBuf = await measureTransportStage('image.render', () => renderComponentIsHtmlToBuffer(AttributePanel, { data: panelData }));

    if (!imgBuf || typeof imgBuf === 'boolean') {
      return null;
    }

    return (await measureTransportStage('image.upload', () => imageCache.uploadImage({ img: imgBuf }))) ?? null;
  });
}

/**
 * 展示道号、境界、五维属性、自由属性点及战斗属性
 */
const response = onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? false;

  if (!e.UserId) {
    const md = Format.createMarkdown();

    md.addText('未找到用户信息，请先踏入仙途');

    void message.send(FormatGui({ isPrivate, bid, content: md }));

    return;
  }

  const result = await App({ bid: e.UserId, uid: e.uid });

  if (result.code === 'FAIL') {
    const md = Format.createMarkdown();

    md.addText(result.data.message);

    const footerButtons = [
      { label: '装备', command: '/我的装备' },
      { label: '功法', command: '/我的功法' }
    ];

    md.addNewline();
    md.addText('属性分配');
    addOptions(md, [
      { label: '✛1', command: '/服用 培元丹 1' },
      { label: '✛3', command: '/服用 培元丹 3' },
      { label: '✛5', command: '/服用 培元丹 5' }
    ]);
    void message.send(
      FormatGui({
        isPrivate,
        bid,
        content: md,
        footer: footerButtons
      })
    );

    return;
  }

  const d = result.data;
  const footerButtons = [
    { label: '装备', command: '/我的装备' },
    { label: '功法', command: '/我的功法' },
    { label: '宝录', command: '/天师宝录' },
    ...(d.access.canUseSoulArtifact ? [{ label: '本命', command: '/我的本命物' }] : []),
    ...(d.access.canUseSoulPath ? [{ label: '道途印证', command: '/道途印证' }] : []),
    { label: '我的主页', command: '/我' },
    ...(d.access.canUseMeridian ? [{ label: '经络', command: '/经络' }] : [{ label: '打坐', command: '/打坐' }])
  ];
  const avatarURL = await createAvatar(e.UserAvatar).catch(() => '');
  const panelData: AttributePanelData = {
    ...d,
    avatarURL,
    theme: d.theme
  };
  const imageURL = await renderAttributeImage(d.uid, panelData);

  {
    const contentMd = Format.createMarkdown();

    if (imageURL) {
      contentMd.addImage(imageURL);
    } else {
      contentMd.addText('面板图片渲染失败，请稍后再试');
    }
    contentMd.addNewline();
    if (d.resourceRecovery) {
      contentMd.addBlockquote(recoverySummaryMarkdown(d.resourceRecovery));
      contentMd.addNewline();
    }
    contentMd.addText('属性分配');
    addOptions(contentMd, [
      { label: '✛1', command: '/服用 培元丹 1' },
      { label: '✛3', command: '/服用 培元丹 3' },
      { label: '✛5', command: '/服用 培元丹 5' }
    ]);
    void message.send(
      FormatGui({
        isPrivate,
        bid,
        content: contentMd,
        footer: footerButtons
      })
    );
  }
});

export default response;
