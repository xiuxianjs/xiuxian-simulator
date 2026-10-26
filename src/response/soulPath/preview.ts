import { withBusinessRecovery } from '@src/response/businessRecovery';
import { withoutSoulConfirmationActions } from '@src/response/soulPathRecovery';
import { adviceRenderer } from '@src/response/feedbackRenderer';
import { sendMiddlewareReply } from '@src/response/middlewareReply';
import { useMessage } from '@src/utils/useMessage';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { parseSoulChoosePreview } from '@src/api/bot/soul-path-choose';
import { parseSoulActionPreview } from '@src/api/bot/soul-path-action';
import { selects } from '@src/response/config';
import { Format, onResponse, useEvent, logger } from 'alemonjs';
import { addSoulQuote, getCommandArgument, isSoulConfirmationToken, sendSoulGui } from './shared';

export const createSoulPreviewHandler = (action: 'choose' | 'switch' | 'advance' | 'reroll', command: string) => onResponse(selects, async e => {
    const [message] = useMessage();
    const [, parentNext] = useEvent();
    const input = getCommandArgument(e.MessageText, command);
    const failure = adviceRenderer(reply => sendMiddlewareReply(
        e,
        withBusinessRecovery(`soul-path.${action}-preview`, withoutSoulConfirmationActions({ ...reply, title: reply.title || `${command}·确认` })),
        'footer'
      )
    );
    const normalized = (e.MessageText ?? '')
      .trim()
      .replace(/^[!！/#＃]/, '')
      .trim();

    if ((action === 'advance' || action === 'reroll') && normalized !== command) {
      await failure({ title: '', heading: '', text: `参数错误：/${command} 不附道途名、确认文字或其他参数，请先核对当前状态。`, buttons: [], advice: [] });

      return;
    }
    const sendPreview = async (result: { token: string; message: string }) => {
      const md = Format.createMarkdown();

      for (const [index, line] of result.message.split('\n').entries()) {
        if (index === 0) {
          md.addBold(line);
          md.addNewline();
        } else {
          addSoulQuote(md, line);
        }
      }
      md.addNewline();
      addSoulQuote(md, '尚未执行 · 确认后生效');
      await message.send(
        sendSoulGui(e, `${command}·确认`, md, [
          { label: '确认执行', command: `/确认神魂 ${action === 'choose' ? `choose:${result.token}` : result.token}` },
          { label: '返回道途', command: '/元婴道途' },
          { label: '材料来源', command: '/神魂材料来源' }
        ])
      );
    };
    const response = await runRobotBusiness(
      e,
      `soul-path.${action}-preview`,
      { input },
      value => {
        const data = action === 'choose' ? parseSoulChoosePreview(value) : parseSoulActionPreview(value);

        if (!isSoulConfirmationToken(data.token) || !data.message.trim()) {
          throw new Error('神魂预览响应不完整');
        }

        return data;
      },
      parentNext,
      failure
    ).catch(async error => {
      logger.error('[神魂预览] 失败:', error);
      await failure({ title: '', heading: '', text: '神魂操作预览未获完整确认，请先核对当前状态与原反馈。', buttons: [], advice: [] });

      return { handled: true as const };
    });

    if (response.handled) {
      return;
    }
    await sendPreview(response.data);
  });
