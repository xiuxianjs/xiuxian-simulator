import { getBackendCompanionTasks } from '@src/api/bot/companion-tasks-queries';
import { presentCompanionTasks } from '@src/utils/companionQueryPresentation';
export default async function App(params: { uid: number; bid?: string; args: string }) {
  return presentCompanionTasks(await getBackendCompanionTasks(params.bid, params.uid), params.args);
}
