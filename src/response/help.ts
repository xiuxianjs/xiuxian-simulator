import { helpRealmName, helpRealmStage, realmHelpBubble } from '@src/response/help-realm';
import { helpNextStep, helpTopic, parsePersonalHelp, personalHelpBubble } from '@src/response/help-personal';
import { selects } from '@src/response/config';
import { buildBubble, errorBubble } from '@src/response/presentation';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { useMessage } from '@src/utils/useMessage';
import { onResponse, useEvent } from 'alemonjs';

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const [, next] = useEvent();
  const context = { isPrivate: e.isPrivate ?? false, bid: e.UserId };
  const argument =
    e.MessageText.trim()
      .match(/(?:修仙)?帮助(?:\s+(.*))?$/u)?.[1]
      ?.trim() ?? '';
  const realm = helpRealmName(argument);
  const topic = /^\d+$/.test(argument) ? 'overview' : helpTopic(argument);
  let access;

  try {
    const result = await runRobotBusiness(e, 'navigation.help', { topic: realm || topic === 'unknown' ? 'overview' : topic }, parsePersonalHelp, next);

    if (result.handled) {
      return;
    }
    access = result.data;
  } catch {
    await message.send(errorBubble({ ...context, title: '修仙帮助', reason: '帮助暂时无法打开，请稍后再试。' }));

    return;
  }

  if (realm) {
    const progress = access.progress;
    const actualRealm = progress && helpRealmName(progress.realm);
    const ownRealm = actualRealm && (realm === actualRealm || realm === helpRealmStage(actualRealm));

    await message.send(realmHelpBubble(context, ownRealm ? actualRealm : realm, ownRealm && progress ? helpNextStep(progress) : undefined));

    return;
  }

  await message.send(
    access.registered
      ? personalHelpBubble(context, topic, access.progress)
      : buildBubble({
          ...context,
          title: '修仙帮助',
          bar: false,
          sections: [{ title: '开始修仙', lines: ['说明：踏入仙途后，即可查看自己的进度和下一步。'] }],
          footer: [{ label: '踏入仙途', command: '/踏入仙途' }]
        })
  );
});
