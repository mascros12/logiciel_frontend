import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  addBlock,
  attachBlockToDay,
  canEditCarnet,
  keepLocalAfterConflict,
  keepLocalAfterNetworkError,
  loadEditor,
  markRemoved,
  moveDayEntry,
  documentFromPublic,
  previewOf,
  previewText,
  publicationLabel,
  reorderVisible,
  setCoords,
  setDate,
  setText,
  setVisible,
  shouldWarnOnLeave,
  sourceStatusLabel,
  toDraftWrite,
  validateDocument,
  warningText,
  withDocument,
} from './carnet-document.ts';
import type { CarnetDocument, CarnetView } from '../models/carnet.model.ts';

function text(value: string | null, generated: string | null = value) {
  return {
    value,
    generated_value: generated,
    origin: value === generated ? 'generated' as const : 'edited' as const,
  };
}

function sample(): CarnetDocument {
  return {
    locale: 'fr',
    schema_version: 1,
    blocks: [
      {
        id: 'cover-1',
        type: 'cover',
        position: 0,
        visible: true,
        removed: false,
        manual: false,
        source_detail_id: null,
        product_kind: null,
        product_id: null,
        content: { title: text('Voyage Martin'), subtitle: text('Jean') },
      },
      {
        id: 'day-1',
        type: 'day',
        position: 1,
        visible: true,
        removed: false,
        manual: false,
        source_detail_id: null,
        product_kind: null,
        product_id: null,
        content: {
          on_date: text('2026-03-20'),
          title: text(null),
          notes: text(null),
          entries: [
            { block_id: 'hotel-1', role: 'stay' },
            { block_id: 'act-included', role: 'included' },
          ],
          generated_entries: [
            { block_id: 'hotel-1', role: 'stay' },
            { block_id: 'act-included', role: 'included' },
          ],
          entries_origin: 'generated',
        },
      },
      {
        id: 'day-2',
        type: 'day',
        position: 2,
        visible: true,
        removed: false,
        manual: false,
        source_detail_id: null,
        product_kind: null,
        product_id: null,
        content: {
          on_date: text('2026-03-21'),
          title: text(null),
          notes: text(null),
          entries: [],
          generated_entries: [],
          entries_origin: 'generated',
        },
      },
      {
        id: 'hotel-1',
        type: 'hotel',
        position: 3,
        visible: true,
        removed: false,
        manual: false,
        source_detail_id: 'detail-hotel',
        product_kind: 'hotel',
        product_id: 'prod-1',
        content: {
          public_name: text('Hôtel Arco'),
          description_fr: text('Texte français'),
          description_es: text('Texto español'),
          check_in: text('2026-03-20'),
          schedule: text('9h30'),
          coordinates: {
            latitude: '10.12345',
            longitude: '-85.12345',
            origin: 'generated',
            generated_latitude: '10.12345',
            generated_longitude: '-85.12345',
          },
          link: text(null),
          notes: text(null),
          rooms: [{
            id: 'room-1',
            room_id: 'r1',
            public_name: text('Bungalow'),
            quantity: { value: 1, origin: 'generated', generated_value: 1 },
            description_fr: text('Chambre'),
            description_es: text('Habitación'),
            recommendation_fr: text(null),
            manual: false,
            removed: false,
          }],
        },
      },
      {
        id: 'act-included',
        type: 'activity',
        position: 4,
        visible: true,
        removed: false,
        manual: false,
        source_detail_id: 'detail-act',
        product_kind: 'activity',
        product_id: null,
        content: {
          public_name: text('Ponts'),
          description_fr: text('Inclus dans l\'hôtel'),
          description_es: text('Incluida'),
          schedule: text('9h30'),
        },
      },
      {
        id: 'note-hidden',
        type: 'note',
        position: 5,
        visible: false,
        removed: false,
        manual: true,
        source_detail_id: null,
        product_kind: null,
        product_id: null,
        content: { heading: text('Secret'), body: text('Ne pas montrer') },
      },
    ],
  };
}

function view(document: CarnetDocument): CarnetView {
  return {
    id: 'carnet-1',
    file_aa_id: 'file-1',
    status: 'draft',
    created_at: '2026-10-14T12:00:00Z',
    updated_at: '2026-10-14T12:00:00Z',
    draft: {
      lock_version: 3,
      source_fingerprint: 'abc',
      updated_at: '2026-10-14T12:00:00Z',
      document,
      warnings: [{ code: 'content_fr_missing', message: 'interno', source_detail_id: null }],
    },
    publication: {
      revision_number: null,
      published_at: null,
      link_state: 'absent',
      draft_matches_current: false,
    },
  };
}

describe('carnet editor document', () => {
  it('muestra la acción solo a admin y operaciones', () => {
    assert.equal(canEditCarnet('admin'), true);
    assert.equal(canEditCarnet('operaciones'), true);
    assert.equal(canEditCarnet('comercial'), false);
    assert.equal(canEditCarnet('admin_proveedores'), false);
    assert.equal(canEditCarnet(null), false);
  });

  it('edita textos, fechas y horarios conservando la referencia', () => {
    let document = setText(sample(), 'hotel-1', 'public_name', 'Nouveau nom');
    document = setDate(document, 'hotel-1', 'check_in', '2026-04-02');
    document = setText(document, 'act-included', 'schedule', '10h00');
    const hotel = document.blocks.find((block) => block.id === 'hotel-1')!;
    assert.equal((hotel.content['public_name'] as { value: string }).value, 'Nouveau nom');
    assert.equal((hotel.content['public_name'] as { origin: string }).origin, 'edited');
    assert.equal((hotel.content['public_name'] as { generated_value: string }).generated_value, 'Hôtel Arco');
    assert.equal(hotel.source_detail_id, 'detail-hotel');
    assert.equal((hotel.content['check_in'] as { value: string }).value, '2026-04-02');
    const activity = document.blocks.find((block) => block.id === 'act-included')!;
    assert.equal((activity.content['schedule'] as { value: string }).value, '10h00');
    document = setText(document, 'hotel-1', 'public_name', 'Hôtel Arco');
    const restored = document.blocks.find((block) => block.id === 'hotel-1')!;
    assert.equal((restored.content['public_name'] as { origin: string }).origin, 'generated');
  });

  it('edita coordenadas y rechaza pares inválidos o enlaces peligrosos', () => {
    const document = setCoords(sample(), 'hotel-1', 'coordinates', '9.09238', '-83.67693');
    const coords = document.blocks.find((block) => block.id === 'hotel-1')!.content['coordinates'] as {
      latitude: string;
      origin: string;
    };
    assert.equal(coords.latitude, '9.09238');
    assert.equal(coords.origin, 'edited');
    const broken = setCoords(sample(), 'hotel-1', 'coordinates', '95.12345', '-85.12345');
    assert.ok(validateDocument(broken).length > 0);
    const partial = setCoords(sample(), 'hotel-1', 'coordinates', '10.12345', '');
    assert.match(validateDocument(partial).join(' '), /juntas/);
    const linked = setText(sample(), 'hotel-1', 'link', 'javascript:alert(1)');
    assert.match(validateDocument(linked).join(' '), /http/);
    const ok = setText(sample(), 'hotel-1', 'link', 'https://example.com/playa');
    assert.equal(validateDocument(ok).length, 0);
  });

  it('añade, oculta, elimina y reordena sin perder el id de origen', () => {
    const added = addBlock(sample(), 'point_of_interest');
    assert.equal(added.document.blocks.at(-1)?.manual, true);
    assert.equal(added.document.blocks.at(-1)?.type, 'point_of_interest');
    const hidden = setVisible(sample(), 'hotel-1', false);
    assert.equal(hidden.blocks.find((block) => block.id === 'hotel-1')?.visible, false);
    assert.equal(hidden.blocks.find((block) => block.id === 'hotel-1')?.source_detail_id, 'detail-hotel');
    const removed = markRemoved(sample(), 'note-hidden');
    assert.equal(removed.blocks.find((block) => block.id === 'note-hidden')?.removed, true);
    const reordered = reorderVisible(sample(), 0, 1);
    assert.equal(reordered.blocks[0].id, 'day-1');
    assert.equal(reordered.blocks.find((block) => block.id === 'hotel-1')?.source_detail_id, 'detail-hotel');
  });

  it('mueve un servicio entre días sin duplicar la reserva', () => {
    const moved = moveDayEntry(sample(), 'day-1', 0, 'day-2', 0);
    const first = moved.blocks.find((block) => block.id === 'day-1')!.content['entries'] as { block_id: string }[];
    const second = moved.blocks.find((block) => block.id === 'day-2')!.content['entries'] as { block_id: string }[];
    assert.deepEqual(first.map((entry) => entry.block_id), ['act-included']);
    assert.deepEqual(second.map((entry) => entry.block_id), ['hotel-1']);
    const hotels = moved.blocks.filter((block) => block.id === 'hotel-1');
    assert.equal(hotels.length, 1);
  });

  it('guarda el contrato de C2 sin baselines ni datos internos', () => {
    const edited = setText(sample(), 'hotel-1', 'public_name', 'Nom édité');
    const payload = toDraftWrite(edited, 3);
    assert.equal(payload.lock_version, 3);
    const raw = JSON.stringify(payload);
    assert.equal(raw.includes('generated_value'), false);
    assert.equal(raw.includes('"origin"'), false);
    assert.equal(raw.includes('source_detail_id'), false);
    assert.equal(raw.includes('content_fr_missing'), false);
    assert.equal(raw.includes('total_price'), false);
    assert.equal(raw.includes('warnings'), false);
    const hotel = payload.blocks.find((block) => block.id === 'hotel-1')!;
    assert.equal(hotel.content['public_name'], 'Nom édité');
    assert.equal((hotel.content['coordinates'] as { latitude: string }).latitude, '10.12345');
    const day = payload.blocks.find((block) => block.id === 'day-1')!;
    assert.deepEqual(day.content['entries'], [
      { block_id: 'hotel-1', role: 'stay' },
      { block_id: 'act-included', role: 'included' },
    ]);
    assert.equal('generated_entries' in (day.content as object), false);
  });

  it('conserva el borrador local ante un conflicto y advierte si hay cambios', () => {
    const loaded = loadEditor(view(sample()));
    assert.equal(loaded.dirty, false);
    assert.equal(shouldWarnOnLeave(loaded), false);
    const dirty = withDocument(loaded, setText(loaded.document, 'cover-1', 'title', 'Autre titre'));
    assert.equal(dirty.dirty, true);
    assert.equal(shouldWarnOnLeave(dirty), true);
    const conflict = keepLocalAfterConflict(dirty);
    assert.equal(conflict.conflict, true);
    assert.equal(conflict.document.blocks[0].content['title'] &&
      (conflict.document.blocks[0].content['title'] as { value: string }).value, 'Autre titre');
    assert.equal(conflict.lockVersion, 3);
  });

  it('la vista previa oculta bloques y datos internos y prioriza el francés', () => {
    const removed = markRemoved(setVisible(sample(), 'hotel-1', false), 'note-hidden');
    const preview = previewOf(removed);
    const ids = [
      preview.cover?.id,
      ...preview.days.flatMap((day) => day.entries.map((entry) => entry.block.id)),
      ...preview.rest.map((block) => block.id),
    ];
    assert.equal(ids.includes('hotel-1'), false);
    assert.equal(ids.includes('note-hidden'), false);
    const included = preview.days[0].entries.find((entry) => entry.block.id === 'act-included');
    assert.equal(included?.role, 'included');
    const text = previewText(sample());
    assert.match(text, /Texte français/);
    assert.equal(text.includes('Texto español'), false);
    assert.equal(text.includes('content_fr_missing'), false);
    assert.equal(text.includes('total_price'), false);
    assert.equal(text.includes('Ne pas montrer'), false);
    const placed = attachBlockToDay(sample(), 'day-2', 'hotel-1');
    const again = previewOf(placed);
    const hotelDays = again.days.filter((day) =>
      day.entries.some((entry) => entry.block.id === 'hotel-1'),
    );
    assert.equal(hotelDays.length, 1);
    assert.equal(hotelDays[0].block.id, 'day-2');
  });

  it('omite el id temporal y no envía la referencia de origen', () => {
    const added = addBlock(sample(), 'point_of_interest');
    const named = setText(added.document, added.id, 'name', 'Playa Ventanas');
    const described = setText(named, added.id, 'description_fr', 'Plage au sud.');
    const tipped = setText(described, added.id, 'visit_tips', 'Marée basse.');
    const located = setCoords(tipped, added.id, 'coordinates', '9.09238', '-83.67693');
    const payload = toDraftWrite(located, 3);
    const poi = payload.blocks.find((block) => block.type === 'point_of_interest')!;
    assert.equal('id' in poi, false);
    assert.equal(poi.content['name'], 'Playa Ventanas');
    assert.equal(poi.content['description_fr'], 'Plage au sud.');
    assert.equal(poi.content['visit_tips'], 'Marée basse.');
    assert.deepEqual(poi.content['coordinates'], { latitude: '9.09238', longitude: '-83.67693' });
    const hotel = located.blocks.find((block) => block.id === 'hotel-1')!;
    assert.equal(hotel.source_detail_id, 'detail-hotel');
    assert.equal(JSON.stringify(payload).includes('detail-hotel'), false);
  });

  it('conserva el texto local si el guardado no llega al servidor', () => {
    const loaded = loadEditor(view(sample()));
    const dirty = withDocument(loaded, setText(loaded.document, 'cover-1', 'title', 'Titre local'));
    const kept = keepLocalAfterNetworkError(dirty);
    assert.equal((kept.document.blocks[0].content['title'] as { value: string }).value, 'Titre local');
    assert.equal(kept.dirty, true);
    assert.equal(kept.lockVersion, 3);
  });

  it('traduce el estado de la fuente y deja los warnings fuera de la vista previa', () => {
    assert.equal(sourceStatusLabel('unchanged'), 'Sin cambios');
    assert.equal(sourceStatusLabel('changed'), 'Cambios detectados');
    assert.equal(sourceStatusLabel('unavailable'), 'Verificación no disponible');
    assert.match(warningText('coordinates_missing', 'x'), /coordenadas/i);
    assert.equal(previewText(sample()).includes('content_fr_missing'), false);
    assert.equal(previewText(sample()).includes('interno'), false);
  });

  it('distingue borrador, publicación y la vista pública en francés', () => {
    const absent = {
      revision_number: null,
      published_at: null,
      link_state: 'absent' as const,
      draft_matches_current: false,
    };
    assert.match(publicationLabel(true, absent), /sin guardar/);
    assert.match(publicationLabel(false, absent), /aún no publicado/);
    assert.match(publicationLabel(false, {
      ...absent,
      revision_number: 2,
      draft_matches_current: true,
    }), /vigente/);
    assert.match(publicationLabel(false, {
      ...absent,
      revision_number: 2,
      draft_matches_current: false,
    }), /sigue viendo la revisión 2/);
    const document = documentFromPublic({
      locale: 'fr',
      cover: { title: 'Voyage', subtitle: null },
      general: null,
      days: [{
        on_date: '2026-03-20',
        title: 'Jour 1',
        notes: null,
        entries: [{
          type: 'hotel',
          role: 'included',
          title: 'Hôtel Vu',
          schedule: null,
          description_fr: 'Texte français',
          short_description_fr: null,
          recommendation_fr: null,
          selling_points_fr: [],
          highlights_fr: [],
          address: null,
          phone: '2222-0000',
          locality: null,
          check_in: null,
          check_out: null,
          dates: [],
          departure_time: null,
          return_time: null,
          pickup_text: null,
          dropoff_text: null,
          origin_label: null,
          destination_label: null,
          latitude: null,
          longitude: null,
          origin_latitude: null,
          origin_longitude: null,
          destination_latitude: null,
          destination_longitude: null,
          reservation_number: 'RES-9',
          link: null,
          notes: null,
          heading: null,
          body: null,
          visit_tips: null,
          rooms: [],
        }],
      }],
      rest: [],
    });
    const preview = previewOf(document);
    assert.equal(preview.days[0].entries[0].role, 'included');
    const text = previewText(document);
    assert.match(text, /Texte français/);
    assert.match(text, /Hôtel Vu/);
    assert.equal(text.includes('generated_value'), false);
    assert.equal(text.includes('content_fr_missing'), false);
  });
});
