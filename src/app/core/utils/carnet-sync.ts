import type { SyncAction } from '../models/carnet.model';

export function acceptIds(
  actions: readonly Pick<SyncAction, 'id' | 'safe'>[],
  picked: ReadonlySet<string>,
  includeSafeGroup: boolean,
): string[] {
  if (includeSafeGroup) {
    const extra = actions
      .filter((action) => picked.has(action.id) && !action.safe)
      .map((action) => action.id);
    return ['group:safe', ...extra];
  }
  return actions.filter((action) => picked.has(action.id)).map((action) => action.id);
}

export function syncKindLabel(kind: string): string {
  if (kind === 'add_service' || kind === 'add_room') return 'Servicio nuevo';
  if (kind === 'hide_service' || kind === 'remove_service' || kind === 'remove_room') {
    return 'Servicio eliminado';
  }
  if (kind === 'realign_days') return 'Cambio de fecha';
  return 'Servicio modificado';
}
