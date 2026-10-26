import { loadFinalBusiness } from '@src/response/finalBusiness';
import { parsePublicTribulationEvent, parsePublicTribulationList } from '@src/api/schemas/public-tribulation';
import { useMessage } from '@src/utils/useMessage';
import { useEvent, onResponse } from 'alemonjs';
import { selects } from '@src/response/config';
import { runPublicTribulationCommand, parsePublicTribulationCommand } from '@src/response-apps/tribulation/public';
import { renderTribulationPanel } from './render';

export default onResponse(selects, async e => {
  const [, next] = useEvent();
  const [message] = useMessage();
  const command = parsePublicTribulationCommand(e.MessageText ?? '');
  const args =
    command?.kind === 'observe'
      ? command
      : command?.kind === 'list'
        ? { kind: 'list', ...command.filter, offset: (command.page - 1) * 5, limit: 6 }
        : { kind: 'invalid' };
  const business = await loadFinalBusiness(e, next, 'tribulation.public', args, value => value);

  if (business.handled) {
    return;
  }
  const panel = await runPublicTribulationCommand(
    e.MessageText ?? '',
    e.UserId,
    {
      list: async () => parsePublicTribulationList(await business.load()),
      observe: async () => parsePublicTribulationEvent(await business.load())
    },
    e.uid
  );

  await message.send(renderTribulationPanel(panel, { isPrivate: e.isPrivate ?? false, bid: e.UserId }));
});
