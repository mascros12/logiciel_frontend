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
  if (kind === 'route_add') return 'Trayecto aplicable';
  if (kind === 'route_exclude') return 'Trayecto que ya no corresponde';
  if (kind === 'recommendation_add') return 'Recomendación de la zona';
  if (kind === 'recommendation_exclude') return 'Recomendación que ya no corresponde';
  if (kind === 'recommendation_recolor') return 'Color según la Ficha AA';
  return 'Servicio modificado';
}
