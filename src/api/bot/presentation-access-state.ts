// A presentation snapshot belongs to one platform event, never a player cache.
const snapshots = new WeakMap<object, { bid: string | undefined; pending: Promise<Record<string, boolean>> }>();

export function presentationAccessFor(event: object & { UserId?: string }, read: () => Promise<Record<string, boolean>>) {
  let snapshot = snapshots.get(event);

  if (!snapshot || snapshot.bid !== event.UserId) {
    snapshot = { bid: event.UserId, pending: read() };
    snapshots.set(event, snapshot);
  }

  return snapshot.pending;
}
export function invalidatePresentationAccess(event: object): void {
  snapshots.delete(event);
}
