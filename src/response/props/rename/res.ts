import { useMessage } from '@src/utils/useMessage';
import { validateBackendPlayerProfileAction } from '@src/api/bot/player-profile-action';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { selects } from '@src/response/config';
import { FormatGui } from '@src/utils/messageHelper';
import { Format, logger, onResponse, useEvent } from 'alemonjs';

type CmdType = 'rename' | 'gender' | 'signature';
type ParsedCmd = { type: CmdType; value: string };
const PREFIX = /^(!|！|\/|#|＃)?/;

function parseCommand(msg: string): ParsedCmd | null {
  const raw = String(msg ?? '').trim();
  const sigMatch = raw.match(new RegExp(`${PREFIX.source}改签名(\\s+([\\s\\S]*))?$`));

  if (sigMatch) {
    return { type: 'signature', value: String(sigMatch[3] ?? '').trim() };
  }
  const genderMatch = raw.match(new RegExp(`${PREFIX.source}改性(\\s+([\\s\\S]*))?$`));

  if (genderMatch) {
    const value = String(genderMatch[3] ?? '').trim();

    return { type: 'gender', value: value === 'male' ? '男' : value === 'female' ? '女' : value };
  }
  const nameMatch = raw.match(new RegExp(`${PREFIX.source}改名(\\s+([\\s\\S]*))?$`));

  if (nameMatch) {
    return { type: 'rename', value: String(nameMatch[3] ?? '').trim() };
  }

  return null;
}

/** 原资料修改规则由后端执行；失败反馈及重复提示也由同次请求返回。 */
export default onResponse(selects, async e => {
  const parsed = parseCommand(e.MessageText ?? '');

  if (!parsed) {
    return;
  }
  const [message] = useMessage();
  const [, next] = useEvent();
  const bid = e.UserId;
  const isPrivate = e.isPrivate ?? false;
  const action = parsed.type === 'rename' ? '改名' : parsed.type === 'gender' ? '改性' : '改签名';
  const md = Format.createMarkdown();

  try {
    const result = await runRobotBusiness(
      e,
      `profile.${parsed.type}`,
      { value: parsed.value },
      data => validateBackendPlayerProfileAction(data, parsed.type),
      next
    );

    if (result.handled) {
      return;
    }
    const data = result.data;
    const text =
      parsed.type === 'signature'
        ? data.cleared
          ? '签名已清空'
          : `签名已更新为：${data.value}`
        : parsed.type === 'gender'
          ? `性别已更改为：${data.value}`
          : `改名成功，道号已更新为：${data.value}`;

    md.addText(text);
  } catch (error) {
    logger.error(`${action}失败:`, error);
    md.addText(parsed.type === 'signature' ? '修改签名失败，请稍后再试' : `${action}失败，请稍后再试`);
  }
  void message.send(FormatGui({ isPrivate, bid, title: '', content: md }));
});
