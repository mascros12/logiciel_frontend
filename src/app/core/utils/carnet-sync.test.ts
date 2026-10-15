import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { acceptIds, syncKindLabel } from './carnet-sync.ts';

describe('selección de sincronización', () => {
  const actions = [
    { id: 'field:1:name', safe: true },
    { id: 'hide:1', safe: false },
  ];

  it('respeta la selección individual', () => {
    const picked = new Set(['field:1:name']);
    assert.deepEqual(acceptIds(actions, picked, false), ['field:1:name']);
  });

  it('agrupa los cambios seguros y conserva los conflictos elegidos', () => {
    const picked = new Set(['field:1:name', 'hide:1']);
    assert.deepEqual(acceptIds(actions, picked, true), ['group:safe', 'hide:1']);
  });

  it('no convierte un conflicto en cambio seguro', () => {
    assert.equal(syncKindLabel('hide_service'), 'Servicio eliminado');
    assert.equal(syncKindLabel('update_field'), 'Servicio modificado');
  });
});
