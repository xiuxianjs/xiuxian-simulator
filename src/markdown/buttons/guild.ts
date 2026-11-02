import { markdownButtonLabel } from '@src/utils/buttonLabel';
/**
 * 宗门相关按钮组
 */
import type { GuiButton } from '@src/utils/messageHelper';
import { Format } from 'alemonjs';

/**
 * 宗门商店按钮
 */
export const createGuildShopButtons = () => {
  const bt = Format.createMarkdown();

  bt.addNewline();
  bt.addNewline();
  bt.addButton(markdownButtonLabel('返回宗门'), { data: '/我的宗门' });
  bt.addText(' ');
  bt.addButton(markdownButtonLabel('刷新'), { data: '/宗门商店 刷新' });

  return bt;
};

/**
 * 宗门商店兑换按钮
 */
export const createGuildShopExchangeButtons = (): GuiButton[][] => {
  return [
    [
      { label: '商店', command: '/宗门商店' },
      { label: '返回宗门', command: '/我的宗门' }
    ]
  ];
};

/**
 * 宗门红包列表翻页按钮
 */
export const createGuildRedPacketButtons = (_page: number, _totalPages: number): GuiButton[][] => {
  return [
    [
      { label: '发红包', command: '/发红包' },
      { label: '我发的红包', command: '/我发的红包' },
      { label: '返回宗门', command: '/我的宗门' }
    ]
  ];
};

/**
 * 宗门精华翻页按钮
 */
export const createGuildEssenceButtons = (_page: number, _totalPages: number): GuiButton[][] => {
  return [
    [
      { label: '添加精华', command: '/添加精华' },
      { label: '返回宗门', command: '/我的宗门' }
    ]
  ];
};

/**
 * 宗门日志翻页按钮
 */
export const createGuildLogButtons = (_page: number, _totalPages: number): GuiButton[][] => {
  return [[{ label: '返回宗门', command: '/我的宗门' }]];
};
