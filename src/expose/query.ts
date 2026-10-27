import { Expose, type ExposeCallContext, type ExposeValueSchema } from 'alemonjs';
import { authorize, currentPlayer } from './access';
import { object, project } from './schema';

type Player = Awaited<ReturnType<typeof currentPlayer>>;
type Input = {
  eventId?: number;
  plotIndex?: number;
  sessionId?: string;
  page?: number;
  chapterNumber?: number;
  visibility?: 'visible' | 'hidden';
  shopCode?: string;
  equipmentType?: string;
  skillType?: string;
  typeName?: string;
};
// Each request is selected in source, never by model-supplied URL, operation or actor ID.
export function query(
  description: string,
  output: ExposeValueSchema,
  run: (player: Player, input: Input, context: ExposeCallContext) => Promise<unknown>,
  input = object({})
) {
  return Expose.action<Input, unknown>({
    description,
    effect: 'unknown',
    inputSchema: input,
    outputSchema: output,
    authorize,
    handler: async (args, context) => {
      const player = await currentPlayer(context);
      const data = await run(player, args, context);

      context.signal.throwIfAborted();

      return project(output, data);
    }
  });
}
