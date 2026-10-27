/**
 * Ediciones locales del Carnet y el DTO que acepta C2.
 * No envía baselines, origen ni referencias: eso lo conserva el servidor.
 */
import type {
  BlockType,
  CarnetBlock,
  CarnetDocument,
  CarnetView,
  DayEntry,
  PublicCarnet,
  PublicEntry,
  PublicationView,
  DraftWrite,
  FlightLine,
  RoomLine,
  TrackedCoordinates,
  TrackedDate,
  TrackedInt,
  TrackedList,
  TrackedText,
} from '../models/carnet.model';

export interface EditorState {
  document: CarnetDocument;
  lockVersion: number;
  dirty: boolean;
  conflict: boolean;
  savedSnapshot: string;
}

export interface PreviewEntry {
  role: DayEntry['role'];
  block: CarnetBlock;
}

export interface PreviewDay {
  block: CarnetBlock;
  entries: PreviewEntry[];
}

export interface PreviewModel {
  title: string;
  cover: CarnetBlock | null;
  general: CarnetBlock | null;
  front: CarnetBlock[];
  lead: CarnetBlock[];
  days: PreviewDay[];
  rest: CarnetBlock[];
  organisation: OrganisationRow[] | null;
}

export interface OrganisationRow {
  onDate: string | null;
  dateLabel: string;
  region: string;
  lodging: string[];
  included: string[];
}

const COORDINATE = /^-?\d+\.\d{5,7}$/;

export const BLOCK_LABELS: Record<BlockType, string> = {
  cover: 'Portada',
  general: 'Información general',
  day: 'Día',
  hotel: 'Hotel',
  activity: 'Actividad',
  transport: 'Transporte',
  route: 'Trayecto',
  point_of_interest: 'Punto de interés',
  note: 'Nota',
  warning: 'Advertencia',
  free_text: 'Texto libre',
  practical: 'Información práctica',
  conditions: 'Condiciones',
  full_page_image: 'Página de imagen',
  itinerary_route: 'Trayecto del viaje',
  regional_recommendation: 'Recomendación regional',
};

export const RESTAURANTS_SECTION_ID = '642f2b2a-7f1f-513d-8b10-30ec17e370f2';

export const ADDABLE_TYPES: BlockType[] = [
  'hotel',
  'activity',
  'transport',
  'route',
  'point_of_interest',
  'note',
  'warning',
  'free_text',
  'practical',
  'conditions',
  'day',
];

const WARNING_TEXT: Record<string, string> = {
  trip_dates_missing: 'La ficha no tiene un rango de viaje utilizable.',
  coordinates_missing: 'Faltan coordenadas.',
  coordinates_invalid: 'Hay coordenadas inválidas en la fuente.',
  service_undated: 'Hay un servicio sin fecha.',
  catalog_product_missing: 'El producto de catálogo no existe.',
  catalog_link_missing: 'Falta el vínculo con el catálogo.',
  room_superseded_omitted: 'Se omitió una habitación sustituida.',
  replaced_detail_omitted: 'Se omitió un servicio sustituido.',
  deleted_detail_omitted: 'Se omitió un servicio eliminado.',
  dates_outside_trip: 'Hay fechas fuera del rango del viaje.',
  flight_snapshot_diverges: 'El vuelo de la ficha podría estar desactualizado.',
  flight_incomplete: 'El vuelo está incompleto.',
  flights_unavailable: 'No hay vuelos utilizables.',
  quotation_mismatch: 'La cotización no coincide con la ficha.',
  extras_unreadable: 'No se pudieron leer datos operativos.',
  included_anchor_missing: 'Un servicio incluido perdió su ancla.',
  content_fr_missing: 'Falta el contenido en francés.',
  content_attributes_ignored: 'Se ignoraron atributos no públicos.',
  traveler_names_absent: 'No hay nombres de viajeros.',
  private_contact_withheld: 'Se ocultó un contacto privado.',
};

export function canEditCarnet(role: string | null | undefined): boolean {
  return role === 'admin' || role === 'operaciones';
}

export function warningText(code: string, fallback: string): string {
  return WARNING_TEXT[code] ?? fallback;
}

export function sourceStatusLabel(status: string): string {
  if (status === 'changed') return 'Cambios detectados';
  if (status === 'unavailable') return 'Verificación no disponible';
  return 'Sin cambios';
}

export function blockTitle(block: CarnetBlock): string {
  const content = block.content;
  const label = content['label'];
  if (typeof label === 'string' && label.trim()) return label.trim();
  const named = textOf(content, 'public_name')
    || textOf(content, 'title')
    || textOf(content, 'name')
    || textOf(content, 'heading')
    || textOf(content, 'trip_title')
    || textOf(content, 'origin_label');
  if (named) return named;
  if (block.type === 'itinerary_route') {
    const origin = textOf(content, 'origin_zone');
    const destination = textOf(content, 'destination_zone');
    if (origin || destination) return `${origin} – ${destination}`;
  }
  if (block.type === 'day') {
    const date = dateOf(content, 'on_date');
    return date ? `Día ${date}` : 'Día';
  }
  return BLOCK_LABELS[block.type];
}

export function textOf(content: Record<string, unknown>, field: string): string {
  const tracked = content[field] as TrackedText | undefined;
  return tracked?.value ?? '';
}

const EDITORIAL_TYPES = new Set(['note', 'warning', 'free_text', 'practical', 'conditions']);
const STRUCTURAL_KINDS = new Set([
  'cover',
  'table_of_contents',
  'itinerary_summary',
  'route_collection',
  'regional_recommendations',
]);
export const ITINERARY_HEADING = 'Votre itinéraire';

export function pageAssetId(block: CarnetBlock): string | null {
  const value = block.content['asset_id'];
  return typeof value === 'string' && value ? value : null;
}

export function sectionPending(block: CarnetBlock): boolean {
  if (block.type === 'full_page_image') {
    if (block.removed || !block.visible) return false;
    return !pageAssetId(block);
  }
  if (block.template_section_id === RESTAURANTS_SECTION_ID) return false;
  if (block.section_kind && STRUCTURAL_KINDS.has(block.section_kind)) return false;
  if (block.removed || !block.visible || !EDITORIAL_TYPES.has(block.type)) return false;
  if (textOf(block.content, 'body').trim()) return false;
  return textOf(block.content, 'heading').trim() !== ITINERARY_HEADING;
}

export function dateOf(content: Record<string, unknown>, field: string): string {
  const tracked = content[field] as TrackedDate | undefined;
  return tracked?.value ?? '';
}

export function intOf(content: Record<string, unknown>, field: string): number {
  const tracked = content[field] as TrackedInt | undefined;
  return tracked?.value ?? 0;
}

export function coordsOf(content: Record<string, unknown>, field: string): TrackedCoordinates {
  return (content[field] as TrackedCoordinates | undefined) ?? emptyCoords();
}

export function listOf(content: Record<string, unknown>, field: string): string[] {
  const tracked = content[field] as TrackedList<string> | TrackedText[] | undefined;
  if (tracked && 'value' in tracked && Array.isArray(tracked.value)) {
    return tracked.value.map((item) => String(item));
  }
  if (Array.isArray(tracked)) {
    return tracked.map((item) => item.value ?? '').filter((item) => item !== '');
  }
  return [];
}

export function pointsOf(content: Record<string, unknown>, field: string): string[] {
  const value = content[field];
  if (!Array.isArray(value)) return [];
  return value.map((item) => (item as TrackedText).value ?? '');
}

export function roomsOf(block: CarnetBlock): RoomLine[] {
  const rooms = block.content['rooms'];
  return Array.isArray(rooms) ? (rooms as RoomLine[]) : [];
}

export function flightsOf(block: CarnetBlock): FlightLine[] {
  const flights = block.content['flights'];
  return Array.isArray(flights) ? (flights as FlightLine[]) : [];
}

export function entriesOf(block: CarnetBlock): DayEntry[] {
  const entries = block.content['entries'];
  return Array.isArray(entries) ? (entries as DayEntry[]) : [];
}

export function isEditedField(content: Record<string, unknown>, field: string): boolean {
  const tracked = content[field] as { origin?: string } | undefined;
  return tracked?.origin === 'edited';
}

export function blockWasEdited(block: CarnetBlock): boolean {
  if (block.manual) return true;
  return containsEdited(block.content);
}

function containsEdited(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  if (Array.isArray(value)) return value.some(containsEdited);
  const record = value as Record<string, unknown>;
  if (record['origin'] === 'edited') return true;
  return Object.values(record).some(containsEdited);
}

export function visibleBlocks(document: CarnetDocument): CarnetBlock[] {
  return document.blocks.filter((block) => !block.removed);
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function replaceBlock(document: CarnetDocument, blockId: string, next: CarnetBlock): CarnetDocument {
  return {
    ...document,
    blocks: document.blocks.map((block) => (block.id === blockId ? next : block)),
  };
}

function touchText(field: TrackedText | undefined, value: string): TrackedText {
  const next = value.trim() === '' ? null : value;
  const generated = field?.generated_value ?? null;
  return {
    value: next,
    generated_value: generated,
    origin: next === generated ? 'generated' : 'edited',
  };
}

export function setRouteIncluded(
  document: CarnetDocument,
  blockId: string,
  included: boolean,
): CarnetDocument {
  const block = document.blocks.find((item) => item.id === blockId);
  if (
    !block
    || (block.type !== 'itinerary_route' && block.type !== 'regional_recommendation')
  ) {
    return document;
  }
  return replaceBlock(document, blockId, {
    ...block,
    content: { ...block.content, included },
  });
}

export function setPageAsset(
  document: CarnetDocument,
  blockId: string,
  assetId: string | null,
): CarnetDocument {
  const block = document.blocks.find((item) => item.id === blockId);
  if (!block || block.type !== 'full_page_image') return document;
  return replaceBlock(document, blockId, {
    ...block,
    content: { ...block.content, asset_id: assetId },
  });
}

export function setText(
  document: CarnetDocument,
  blockId: string,
  field: string,
  value: string,
): CarnetDocument {
  const block = document.blocks.find((item) => item.id === blockId);
  if (!block) return document;
  const current = block.content[field] as TrackedText | undefined;
  return replaceBlock(document, blockId, {
    ...block,
    content: { ...block.content, [field]: touchText(current, value) },
  });
}

export function setDate(
  document: CarnetDocument,
  blockId: string,
  field: string,
  value: string,
): CarnetDocument {
  const block = document.blocks.find((item) => item.id === blockId);
  if (!block) return document;
  const current = block.content[field] as TrackedDate | undefined;
  const next = value.trim() === '' ? null : value;
  const generated = current?.generated_value ?? null;
  return replaceBlock(document, blockId, {
    ...block,
    content: {
      ...block.content,
      [field]: {
        value: next,
        generated_value: generated,
        origin: next === generated ? 'generated' : 'edited',
      },
    },
  });
}

export function setInt(
  document: CarnetDocument,
  blockId: string,
  field: string,
  value: number,
): CarnetDocument {
  const block = document.blocks.find((item) => item.id === blockId);
  if (!block) return document;
  const current = block.content[field] as TrackedInt | undefined;
  const generated = current?.generated_value ?? null;
  return replaceBlock(document, blockId, {
    ...block,
    content: {
      ...block.content,
      [field]: {
        value,
        generated_value: generated,
        origin: value === generated ? 'generated' : 'edited',
      },
    },
  });
}

export function setCoords(
  document: CarnetDocument,
  blockId: string,
  field: string,
  latitude: string,
  longitude: string,
): CarnetDocument {
  const block = document.blocks.find((item) => item.id === blockId);
  if (!block) return document;
  const current = coordsOf(block.content, field);
  const lat = latitude.trim() === '' ? null : latitude.trim();
  const lng = longitude.trim() === '' ? null : longitude.trim();
  const same = lat === current.generated_latitude && lng === current.generated_longitude;
  const next: TrackedCoordinates = {
    latitude: lat,
    longitude: lng,
    generated_latitude: current.generated_latitude,
    generated_longitude: current.generated_longitude,
    origin: same ? 'generated' : 'edited',
  };
  return replaceBlock(document, blockId, {
    ...block,
    content: { ...block.content, [field]: next },
  });
}

export function setPoints(
  document: CarnetDocument,
  blockId: string,
  field: string,
  values: string[],
): CarnetDocument {
  const block = document.blocks.find((item) => item.id === blockId);
  if (!block) return document;
  const current = Array.isArray(block.content[field])
    ? (block.content[field] as TrackedText[])
    : [];
  const next = values.map((value, index) => touchText(current[index], value));
  return replaceBlock(document, blockId, {
    ...block,
    content: { ...block.content, [field]: next },
  });
}

export function setAges(
  document: CarnetDocument,
  blockId: string,
  values: number[],
): CarnetDocument {
  const block = document.blocks.find((item) => item.id === blockId);
  if (!block) return document;
  const current = block.content['children_ages'] as TrackedList<number> | undefined;
  const generated = current?.generated_value ?? [];
  const same = values.join('|') === generated.join('|');
  return replaceBlock(document, blockId, {
    ...block,
    content: {
      ...block.content,
      children_ages: {
        value: values,
        generated_value: generated,
        origin: same ? 'generated' : 'edited',
      },
    },
  });
}

export function setDates(
  document: CarnetDocument,
  blockId: string,
  values: string[],
): CarnetDocument {
  const block = document.blocks.find((item) => item.id === blockId);
  if (!block) return document;
  const current = block.content['dates'] as TrackedList<string> | undefined;
  const generated = current?.generated_value ?? [];
  const same = values.join('|') === generated.join('|');
  return replaceBlock(document, blockId, {
    ...block,
    content: {
      ...block.content,
      dates: {
        value: values,
        generated_value: generated,
        origin: same ? 'generated' : 'edited',
      },
    },
  });
}

export function setRoomText(
  document: CarnetDocument,
  blockId: string,
  roomId: string,
  field: 'public_name' | 'description_fr' | 'description_es' | 'recommendation_fr',
  value: string,
): CarnetDocument {
  const block = document.blocks.find((item) => item.id === blockId);
  if (!block) return document;
  const rooms = roomsOf(block).map((room) => {
    if (room.id !== roomId) return room;
    return { ...room, [field]: touchText(room[field], value) };
  });
  return replaceBlock(document, blockId, {
    ...block,
    content: { ...block.content, rooms },
  });
}

export function setFlightText(
  document: CarnetDocument,
  blockId: string,
  flightId: string,
  field: 'flight_number' | 'at_time',
  value: string,
): CarnetDocument {
  const block = document.blocks.find((item) => item.id === blockId);
  if (!block) return document;
  const flights = flightsOf(block).map((flight) => {
    if (flight.id !== flightId) return flight;
    return { ...flight, [field]: touchText(flight[field], value) };
  });
  return replaceBlock(document, blockId, {
    ...block,
    content: { ...block.content, flights },
  });
}

export function setFlightDate(
  document: CarnetDocument,
  blockId: string,
  flightId: string,
  value: string,
): CarnetDocument {
  const block = document.blocks.find((item) => item.id === blockId);
  if (!block) return document;
  const flights = flightsOf(block).map((flight) => {
    if (flight.id !== flightId) return flight;
    const next = value.trim() === '' ? null : value;
    const generated = flight.on_date.generated_value;
    return {
      ...flight,
      on_date: {
        value: next,
        generated_value: generated,
        origin: next === generated ? 'generated' as const : 'edited' as const,
      },
    };
  });
  return replaceBlock(document, blockId, {
    ...block,
    content: { ...block.content, flights },
  });
}

export function setVisible(document: CarnetDocument, blockId: string, visible: boolean): CarnetDocument {
  const block = document.blocks.find((item) => item.id === blockId);
  if (!block) return document;
  return replaceBlock(document, blockId, { ...block, visible });
}

export function markRemoved(document: CarnetDocument, blockId: string): CarnetDocument {
  const block = document.blocks.find((item) => item.id === blockId);
  if (!block) return document;
  return replaceBlock(document, blockId, { ...block, removed: true });
}

export function reorderVisible(
  document: CarnetDocument,
  previousIndex: number,
  currentIndex: number,
): CarnetDocument {
  const visible = document.blocks.filter((block) => !block.removed);
  const removed = document.blocks.filter((block) => block.removed);
  const next = [...visible];
  const [moved] = next.splice(previousIndex, 1);
  if (!moved) return document;
  next.splice(currentIndex, 0, moved);
  const blocks = [...next, ...removed].map((block, position) => ({ ...block, position }));
  return { ...document, blocks };
}

export function addBlock(document: CarnetDocument, type: BlockType): { document: CarnetDocument; id: string } {
  const id = `new-${crypto.randomUUID()}`;
  const block: CarnetBlock = {
    id,
    type,
    position: document.blocks.length,
    visible: true,
    removed: false,
    manual: true,
    source_detail_id: null,
    product_kind: null,
    product_id: null,
    content: emptyContent(type),
  };
  return {
    id,
    document: { ...document, blocks: [...document.blocks, block] },
  };
}

export function moveDayEntry(
  document: CarnetDocument,
  fromDayId: string,
  fromIndex: number,
  toDayId: string,
  toIndex: number,
): CarnetDocument {
  const from = document.blocks.find((block) => block.id === fromDayId && block.type === 'day');
  const to = document.blocks.find((block) => block.id === toDayId && block.type === 'day');
  if (!from || !to) return document;
  const source = [...entriesOf(from)];
  const [entry] = source.splice(fromIndex, 1);
  if (!entry) return document;
  let target = fromDayId === toDayId ? source : [...entriesOf(to)];
  const index = Math.max(0, Math.min(toIndex, target.length));
  if (fromDayId === toDayId) {
    target = source;
    target.splice(index, 0, entry);
    return replaceBlock(document, fromDayId, {
      ...from,
      content: { ...from.content, entries: target },
    });
  }
  target.splice(index, 0, entry);
  const without = replaceBlock(document, fromDayId, {
    ...from,
    content: { ...from.content, entries: source },
  });
  return replaceBlock(without, toDayId, {
    ...to,
    content: { ...to.content, entries: target },
  });
}

export function attachBlockToDay(
  document: CarnetDocument,
  dayId: string,
  blockId: string,
): CarnetDocument {
  const day = document.blocks.find((block) => block.id === dayId && block.type === 'day');
  const target = document.blocks.find((block) => block.id === blockId);
  if (!day || !target || target.type === 'day') return document;
  const role = roleFor(target.type);
  const entries = entriesOf(day).filter((entry) => entry.block_id !== blockId);
  const cleared = document.blocks.map((block) => {
    if (block.type !== 'day' || block.id === dayId) return block;
    return {
      ...block,
      content: {
        ...block.content,
        entries: entriesOf(block).filter((entry) => entry.block_id !== blockId),
      },
    };
  });
  return replaceBlock(
    { ...document, blocks: cleared },
    dayId,
    { ...day, content: { ...day.content, entries: [...entries, { block_id: blockId, role }] } },
  );
}

function roleFor(type: BlockType): DayEntry['role'] {
  if (type === 'hotel') return 'stay';
  if (type === 'transport' || type === 'route') return 'transport';
  return 'activity';
}

function emptyText(): TrackedText {
  return { value: null, origin: 'edited', generated_value: null };
}

function emptyDate(): TrackedDate {
  return { value: null, origin: 'edited', generated_value: null };
}

function emptyInt(value = 0): TrackedInt {
  return { value, origin: 'edited', generated_value: null };
}

function emptyCoords(): TrackedCoordinates {
  return {
    latitude: null,
    longitude: null,
    origin: 'edited',
    generated_latitude: null,
    generated_longitude: null,
  };
}

function emptyLocale(): Record<string, unknown> {
  return {
    description_fr: emptyText(),
    short_description_fr: emptyText(),
    recommendation_fr: emptyText(),
    selling_points_fr: [],
    description_es: emptyText(),
    short_description_es: emptyText(),
    recommendation_es: emptyText(),
    selling_points_es: [],
    attributes: { values: {}, generated: {}, origins: {} },
  };
}

function emptyContent(type: BlockType): Record<string, unknown> {
  if (type === 'full_page_image') return { asset_id: null, label: '' };
  if (type === 'cover') return { title: emptyText(), subtitle: emptyText() };
  if (type === 'general') {
    return {
      trip_title: emptyText(),
      start_date: emptyDate(),
      end_date: emptyDate(),
      holder_name: emptyText(),
      adults: emptyInt(0),
      children: emptyInt(0),
      children_ages: { value: [], origin: 'edited', generated_value: [] },
      flights: [],
    };
  }
  if (type === 'day') {
    return {
      on_date: emptyDate(),
      title: emptyText(),
      notes: emptyText(),
      entries: [],
      generated_entries: [],
      entries_origin: 'edited',
    };
  }
  if (type === 'hotel') {
    return {
      ...emptyLocale(),
      public_name: emptyText(),
      address: emptyText(),
      phone: emptyText(),
      locality: emptyText(),
      check_in: emptyDate(),
      check_out: emptyDate(),
      coordinates: emptyCoords(),
      reservation_number: emptyText(),
      link: emptyText(),
      rooms: [],
      notes: emptyText(),
    };
  }
  if (type === 'activity') {
    return {
      ...emptyLocale(),
      public_name: emptyText(),
      schedule: emptyText(),
      address: emptyText(),
      phone: emptyText(),
      locality: emptyText(),
      provider_label: emptyText(),
      coordinates: emptyCoords(),
      dates: { value: [], origin: 'edited', generated_value: [] },
      reservation_number: emptyText(),
      link: emptyText(),
      notes: emptyText(),
    };
  }
  if (type === 'transport') {
    return {
      ...emptyLocale(),
      public_name: emptyText(),
      service_type: emptyText(),
      provider_label: emptyText(),
      pickup_text: emptyText(),
      dropoff_text: emptyText(),
      departure_time: emptyText(),
      return_time: emptyText(),
      dates: { value: [], origin: 'edited', generated_value: [] },
      reservation_number: emptyText(),
      link: emptyText(),
      notes: emptyText(),
    };
  }
  if (type === 'route') {
    return {
      title: emptyText(),
      origin_label: emptyText(),
      destination_label: emptyText(),
      origin_coordinates: emptyCoords(),
      destination_coordinates: emptyCoords(),
      notes: emptyText(),
      link: emptyText(),
    };
  }
  if (type === 'point_of_interest') {
    return {
      name: emptyText(),
      description_fr: emptyText(),
      visit_tips: emptyText(),
      notes: emptyText(),
      coordinates: emptyCoords(),
      link: emptyText(),
    };
  }
  return { heading: emptyText(), body: emptyText() };
}

function writeText(content: Record<string, unknown>, field: string): string | null {
  const tracked = content[field] as TrackedText | undefined;
  return tracked?.value ?? null;
}

function writeDate(content: Record<string, unknown>, field: string): string | null {
  const tracked = content[field] as TrackedDate | undefined;
  return tracked?.value ?? null;
}

function writeCoords(content: Record<string, unknown>, field: string) {
  const coords = coordsOf(content, field);
  return { latitude: coords.latitude, longitude: coords.longitude };
}

function writePoints(content: Record<string, unknown>, field: string): string[] {
  return pointsOf(content, field);
}

function writeLocale(content: Record<string, unknown>) {
  const attributes = content['attributes'] as { values?: Record<string, unknown> } | undefined;
  return {
    description_fr: writeText(content, 'description_fr'),
    short_description_fr: writeText(content, 'short_description_fr'),
    recommendation_fr: writeText(content, 'recommendation_fr'),
    selling_points_fr: writePoints(content, 'selling_points_fr'),
    description_es: writeText(content, 'description_es'),
    short_description_es: writeText(content, 'short_description_es'),
    recommendation_es: writeText(content, 'recommendation_es'),
    selling_points_es: writePoints(content, 'selling_points_es'),
    attributes: attributes?.values ?? {},
  };
}

function clientId(id: string): string | undefined {
  return id.startsWith('new-') ? undefined : id;
}

function writeContent(block: CarnetBlock): Record<string, unknown> {
  const content = block.content;
  if (block.type === 'full_page_image') {
    return { asset_id: pageAssetId(block) };
  }
  if (block.type === 'cover') {
    return { title: writeText(content, 'title'), subtitle: writeText(content, 'subtitle') };
  }
  if (block.type === 'general') {
    return {
      trip_title: writeText(content, 'trip_title'),
      start_date: writeDate(content, 'start_date'),
      end_date: writeDate(content, 'end_date'),
      holder_name: writeText(content, 'holder_name'),
      adults: intOf(content, 'adults'),
      children: intOf(content, 'children'),
      children_ages: listOf(content, 'children_ages').map((item) => Number(item)),
      flights: flightsOf(block).map((flight) => ({
        ...(clientId(flight.id) ? { id: flight.id } : {}),
        movement: flight.movement,
        flight_number: flight.flight_number.value,
        on_date: flight.on_date.value,
        at_time: flight.at_time.value,
        removed: flight.removed,
      })),
    };
  }
  if (block.type === 'day') {
    return {
      on_date: writeDate(content, 'on_date'),
      title: writeText(content, 'title'),
      notes: writeText(content, 'notes'),
      entries: entriesOf(block).map((entry) => ({
        block_id: entry.block_id,
        role: entry.role,
      })),
    };
  }
  if (block.type === 'hotel') {
    return {
      ...writeLocale(content),
      public_name: writeText(content, 'public_name'),
      address: writeText(content, 'address'),
      phone: writeText(content, 'phone'),
      locality: writeText(content, 'locality'),
      check_in: writeDate(content, 'check_in'),
      check_out: writeDate(content, 'check_out'),
      coordinates: writeCoords(content, 'coordinates'),
      reservation_number: writeText(content, 'reservation_number'),
      link: writeText(content, 'link'),
      notes: writeText(content, 'notes'),
      rooms: roomsOf(block).map((room) => ({
        ...(clientId(room.id) ? { id: room.id } : {}),
        public_name: room.public_name.value,
        quantity: room.quantity.value,
        description_fr: room.description_fr.value,
        description_es: room.description_es.value,
        recommendation_fr: room.recommendation_fr.value,
        removed: room.removed,
      })),
    };
  }
  if (block.type === 'activity') {
    return {
      ...writeLocale(content),
      public_name: writeText(content, 'public_name'),
      schedule: writeText(content, 'schedule'),
      address: writeText(content, 'address'),
      phone: writeText(content, 'phone'),
      locality: writeText(content, 'locality'),
      provider_label: writeText(content, 'provider_label'),
      coordinates: writeCoords(content, 'coordinates'),
      dates: listOf(content, 'dates'),
      reservation_number: writeText(content, 'reservation_number'),
      link: writeText(content, 'link'),
      notes: writeText(content, 'notes'),
    };
  }
  if (block.type === 'transport') {
    return {
      ...writeLocale(content),
      public_name: writeText(content, 'public_name'),
      service_type: writeText(content, 'service_type'),
      provider_label: writeText(content, 'provider_label'),
      pickup_text: writeText(content, 'pickup_text'),
      dropoff_text: writeText(content, 'dropoff_text'),
      departure_time: writeText(content, 'departure_time'),
      return_time: writeText(content, 'return_time'),
      dates: listOf(content, 'dates'),
      reservation_number: writeText(content, 'reservation_number'),
      link: writeText(content, 'link'),
      notes: writeText(content, 'notes'),
    };
  }
  if (block.type === 'regional_recommendation') {
    return {
      recommendation_id: block.content['recommendation_id'],
      category: block.content['category'],
      zone_id: block.content['zone_id'],
      activity_id: block.content['activity_id'] ?? null,
      identified: block.content['identified'] === true,
      included: block.content['included'] !== false,
      selection_origin: block.content['selection_origin'] ?? 'automatic',
      tone: block.content['tone'] ?? 'black',
      zone_name: writeText(content, 'zone_name'),
      name: writeText(content, 'name'),
      activity_type: writeText(content, 'activity_type'),
      opening_hours: writeText(content, 'opening_hours'),
      phone: writeText(content, 'phone'),
      latitude: writeText(content, 'latitude'),
      longitude: writeText(content, 'longitude'),
      url: writeText(content, 'url'),
      duration_text: writeText(content, 'duration_text'),
      difficulty_text: writeText(content, 'difficulty_text'),
      description: writeText(content, 'description'),
    };
  }
  if (block.type === 'itinerary_route') {
    return {
      catalog_route_id: block.content['catalog_route_id'],
      mode: block.content['mode'],
      tone: block.content['tone'],
      included: block.content['included'] !== false,
      origin_zone: writeText(content, 'origin_zone'),
      destination_zone: writeText(content, 'destination_zone'),
      origin_place: writeText(content, 'origin_place'),
      destination_place: writeText(content, 'destination_place'),
      distance_km: writeText(content, 'distance_km'),
      duration_minutes: intOf(content, 'duration_minutes'),
      instructions: writeText(content, 'instructions'),
    };
  }
  if (block.type === 'route') {
    return {
      title: writeText(content, 'title'),
      origin_label: writeText(content, 'origin_label'),
      destination_label: writeText(content, 'destination_label'),
      origin_coordinates: writeCoords(content, 'origin_coordinates'),
      destination_coordinates: writeCoords(content, 'destination_coordinates'),
      notes: writeText(content, 'notes'),
      link: writeText(content, 'link'),
    };
  }
  if (block.type === 'point_of_interest') {
    return {
      name: writeText(content, 'name'),
      description_fr: writeText(content, 'description_fr'),
      visit_tips: writeText(content, 'visit_tips'),
      notes: writeText(content, 'notes'),
      coordinates: writeCoords(content, 'coordinates'),
      link: writeText(content, 'link'),
    };
  }
  return {
    heading: writeText(content, 'heading'),
    body: writeText(content, 'body'),
  };
}

export function toDraftWrite(document: CarnetDocument, lockVersion: number): DraftWrite {
  return {
    lock_version: lockVersion,
    blocks: document.blocks.map((block) => {
      const id = clientId(block.id);
      return {
        ...(id ? { id } : {}),
        type: block.type,
        visible: block.visible,
        removed: block.removed,
        ...(block.parent_id ? { parent_id: block.parent_id } : {}),
        content: writeContent(block),
      };
    }),
  };
}

export function validateDocument(document: CarnetDocument): string[] {
  const errors: string[] = [];
  for (const block of document.blocks) {
    if (block.removed) continue;
    const label = blockTitle(block);
    for (const field of ['link', 'url']) {
      const link = textOf(block.content, field);
      if (link && !isHttpUrl(link)) {
        errors.push(`${label}: el enlace debe usar http o https.`);
      }
    }
    if (block.type === 'regional_recommendation') {
      const latitude = textOf(block.content, 'latitude');
      const longitude = textOf(block.content, 'longitude');
      const message = coordinateError(latitude, longitude);
      if (message) errors.push(`${label}: ${message}`);
      if (!latitude && !longitude && !textOf(block.content, 'url')) {
        errors.push(`${label}: indique coordenadas o un enlace http o https.`);
      }
    }
    for (const field of ['coordinates', 'origin_coordinates', 'destination_coordinates']) {
      if (!(field in block.content)) continue;
      const coords = coordsOf(block.content, field);
      const message = coordinateError(coords.latitude, coords.longitude);
      if (message) errors.push(`${label}: ${message}`);
    }
  }
  return errors;
}

export function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return (url.protocol === 'http:' || url.protocol === 'https:') && !!url.hostname;
  } catch {
    return false;
  }
}

export function coordinateError(latitude: string | null, longitude: string | null): string | null {
  const lat = (latitude ?? '').trim();
  const lng = (longitude ?? '').trim();
  if (!lat && !lng) return null;
  if (!lat || !lng) return 'latitud y longitud van juntas.';
  if (!COORDINATE.test(lat) || Number(lat) < -90 || Number(lat) > 90) {
    return 'la latitud debe tener entre 5 y 7 decimales y estar entre -90 y 90.';
  }
  if (!COORDINATE.test(lng) || Number(lng) < -180 || Number(lng) > 180) {
    return 'la longitud debe tener entre 5 y 7 decimales y estar entre -180 y 180.';
  }
  return null;
}

const MONTHS_FR = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];
const INCLUDED_ROLES = new Set(['activity', 'transport', 'included']);
const INCLUDED_TYPES = new Set(['activity', 'transport']);

export function formatDuration(minutes: number): string {
  const value = Number.isFinite(minutes) ? Math.max(0, Math.trunc(minutes)) : 0;
  if (value < 60) return `${value} min`;
  const hours = Math.floor(value / 60);
  const rest = value % 60;
  return `${hours}H${String(rest).padStart(2, '0')}`;
}

export function formatDistance(value: string | number | null | undefined): string {
  if (value == null || value === '') return '';
  const number = Number(value);
  if (!Number.isFinite(number)) return String(value);
  const rounded = Math.round(number * 10) / 10;
  const shown = Number.isInteger(rounded)
    ? String(rounded)
    : rounded.toFixed(1).replace('.', ',');
  return `${shown} km`;
}

export interface RouteLine {
  tone: 'zone' | 'excursion';
  originZone: string;
  destinationZone: string;
  originPlace: string;
  destinationPlace: string;
  distanceLabel: string;
  durationLabel: string;
  instructions: string;
}

export function itineraryRoutes(document: CarnetDocument, parentId?: string): RouteLine[] {
  return document.blocks
    .filter((block) => {
      if (block.type !== 'itinerary_route' || block.removed || !block.visible) return false;
      if (parentId && block.parent_id !== parentId) return false;
      return block.content['included'] !== false;
    })
    .sort((left, right) => left.position - right.position)
    .map((block) => ({
      tone: block.content['tone'] === 'excursion' ? 'excursion' : 'zone',
      originZone: textOf(block.content, 'origin_zone'),
      destinationZone: textOf(block.content, 'destination_zone'),
      originPlace: textOf(block.content, 'origin_place'),
      destinationPlace: textOf(block.content, 'destination_place'),
      distanceLabel: formatDistance(textOf(block.content, 'distance_km')),
      durationLabel:
        block.content['mode'] === 'place_to_place'
          ? ''
          : formatDuration(intOf(block.content, 'duration_minutes')),
      instructions: textOf(block.content, 'instructions'),
    }));
}

export interface RecommendationLine {
  category: 'activity' | 'restaurant';
  zoneName: string;
  name: string;
  activityType: string;
  openingHours: string;
  phone: string;
  latitude: string;
  longitude: string;
  url: string;
  durationText: string;
  difficultyText: string;
  description: string;
  tone: 'black' | 'red' | 'purple';
}

export function recommendationLines(
  document: CarnetDocument,
  parentId?: string,
): RecommendationLine[] {
  return document.blocks
    .filter((block) => {
      if (block.type !== 'regional_recommendation' || block.removed || !block.visible) {
        return false;
      }
      if (parentId && block.parent_id !== parentId) return false;
      return block.content['included'] !== false;
    })
    .sort((left, right) => left.position - right.position)
    .map((block) => ({
      category: block.content['category'] === 'restaurant' ? 'restaurant' : 'activity',
      zoneName: textOf(block.content, 'zone_name'),
      name: textOf(block.content, 'name'),
      activityType: textOf(block.content, 'activity_type'),
      openingHours: textOf(block.content, 'opening_hours'),
      phone: textOf(block.content, 'phone'),
      latitude: textOf(block.content, 'latitude'),
      longitude: textOf(block.content, 'longitude'),
      url: textOf(block.content, 'url'),
      durationText: textOf(block.content, 'duration_text'),
      difficultyText: textOf(block.content, 'difficulty_text'),
      description: textOf(block.content, 'description'),
      tone: block.content['tone'] === 'red' || block.content['tone'] === 'purple'
        ? block.content['tone']
        : 'black',
    }));
}

export function formatDateFr(value: string | null | undefined): string {
  if (!value) return '';
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return value;
  const month = MONTHS_FR[Number(match[2]) - 1];
  if (!month) return value;
  return `${Number(match[3])} ${month} ${match[1]}`;
}

export function organisationRows(document: CarnetDocument): OrganisationRow[] | null {
  const marker = document.blocks.find(
    (block) =>
      block.section_kind === 'itinerary_summary' && block.visible && !block.removed,
  );
  if (!marker) return null;
  const byId = new Map(document.blocks.map((block) => [block.id, block]));
  const days = document.blocks
    .filter((block) => block.type === 'day' && block.visible && !block.removed)
    .sort((left, right) => {
      const a = textOf(left.content, 'on_date');
      const b = textOf(right.content, 'on_date');
      if (!a && !b) return left.position - right.position;
      if (!a) return 1;
      if (!b) return -1;
      if (a === b) return left.position - right.position;
      return a < b ? -1 : 1;
    });
  return days.map((day) => {
    const onDate = textOf(day.content, 'on_date') || null;
    const lodging: string[] = [];
    const included: string[] = [];
    const seen = new Set<string>();
    for (const entry of entriesOf(day)) {
      if (seen.has(entry.block_id)) continue;
      const block = byId.get(entry.block_id);
      if (!block || block.removed || !block.visible) continue;
      if (checkedOut(block, onDate)) continue;
      const name = serviceName(block);
      if (!name) continue;
      if (entry.role === 'stay' && block.type === 'hotel') {
        seen.add(block.id);
        lodging.push(name);
      } else if (INCLUDED_ROLES.has(entry.role) && INCLUDED_TYPES.has(block.type)) {
        seen.add(block.id);
        included.push(name);
      }
    }
    return {
      onDate,
      dateLabel: formatDateFr(onDate),
      region: textOf(day.content, 'title').trim(),
      lodging,
      included,
    };
  });
}

function checkedOut(block: CarnetBlock, onDate: string | null): boolean {
  if (block.type !== 'hotel' || !onDate) return false;
  const checkOut = textOf(block.content, 'check_out');
  return !!checkOut && onDate >= checkOut;
}

function serviceName(block: CarnetBlock): string {
  return (
    textOf(block.content, 'public_name').trim()
    || textOf(block.content, 'title').trim()
    || textOf(block.content, 'name').trim()
  );
}

export function previewOf(document: CarnetDocument): PreviewModel {
  const shown = new Set<string>();
  const usable = (block: CarnetBlock | undefined): block is CarnetBlock =>
    !!block && block.visible && !block.removed;
  const cover = document.blocks.find((block) => block.type === 'cover' && usable(block)) ?? null;
  const general = document.blocks.find((block) => block.type === 'general' && usable(block)) ?? null;
  if (cover) shown.add(cover.id);
  if (general) shown.add(general.id);
  const days: PreviewDay[] = [];
  for (const block of document.blocks) {
    if (block.type !== 'day' || !usable(block)) continue;
    shown.add(block.id);
    const entries: PreviewEntry[] = [];
    const dayIds = new Set<string>();
    for (const entry of entriesOf(block)) {
      const child = document.blocks.find((item) => item.id === entry.block_id);
      if (!usable(child) || dayIds.has(child.id)) continue;
      dayIds.add(child.id);
      shown.add(child.id);
      entries.push({ role: entry.role, block: child });
    }
    days.push({ block, entries });
  }
  const coverIndex = document.blocks.findIndex(
    (block) => block.type === 'cover' && usable(block),
  );
  const front: CarnetBlock[] = [];
  const lead: CarnetBlock[] = [];
  const rest: CarnetBlock[] = [];
  let itineraryStarted = false;
  document.blocks.forEach((block, index) => {
    if (block.type === 'day' && usable(block)) {
      itineraryStarted = true;
      return;
    }
    if (block.type === 'itinerary_route' || block.type === 'regional_recommendation') return;
    if (!usable(block) || shown.has(block.id)) return;
    if (block.type === 'full_page_image' && coverIndex >= 0 && index < coverIndex) {
      front.push(block);
      return;
    }
    (itineraryStarted ? rest : lead).push(block);
  });
  const title = cover ? textOf(cover.content, 'title') : general ? textOf(general.content, 'trip_title') : '';
  return {
    title,
    cover,
    general,
    front,
    lead,
    days,
    rest,
    organisation: organisationRows(document),
  };
}

export function previewText(document: CarnetDocument): string {
  const preview = previewOf(document);
  const chunks: string[] = [];
  const pushBlock = (block: CarnetBlock) => {
    chunks.push(textOf(block.content, 'title'));
    chunks.push(textOf(block.content, 'public_name'));
    chunks.push(textOf(block.content, 'name'));
    chunks.push(textOf(block.content, 'description_fr'));
    chunks.push(textOf(block.content, 'visit_tips'));
    chunks.push(textOf(block.content, 'heading'));
    chunks.push(textOf(block.content, 'body'));
    chunks.push(textOf(block.content, 'notes'));
  };
  if (preview.cover) pushBlock(preview.cover);
  if (preview.general) pushBlock(preview.general);
  for (const block of preview.lead) pushBlock(block);
  for (const day of preview.days) {
    pushBlock(day.block);
    for (const entry of day.entries) pushBlock(entry.block);
  }
  for (const block of preview.rest) pushBlock(block);
  return chunks.filter(Boolean).join('\n');
}

function snapshot(document: CarnetDocument, lockVersion: number): string {
  return JSON.stringify(toDraftWrite(document, lockVersion));
}

export function loadEditor(view: CarnetView): EditorState {
  const document = clone(view.draft.document);
  const lockVersion = view.draft.lock_version;
  return {
    document,
    lockVersion,
    dirty: false,
    conflict: false,
    savedSnapshot: snapshot(document, lockVersion),
  };
}

export function withDocument(state: EditorState, document: CarnetDocument): EditorState {
  return {
    ...state,
    document,
    dirty: snapshot(document, state.lockVersion) !== state.savedSnapshot,
  };
}

export function keepLocalAfterConflict(state: EditorState): EditorState {
  return { ...state, conflict: true, dirty: true };
}

export function keepLocalAfterNetworkError(state: EditorState): EditorState {
  return state;
}

export function adoptServer(view: CarnetView): EditorState {
  return loadEditor(view);
}

export function shouldWarnOnLeave(state: EditorState): boolean {
  return state.dirty;
}

export function blockById(document: CarnetDocument, id: string | null): CarnetBlock | null {
  if (!id) return null;
  return document.blocks.find((block) => block.id === id) ?? null;
}

export function publicationLabel(
  dirty: boolean,
  publication: PublicationView | null,
): string {
  if (dirty) return 'Borrador con cambios sin guardar';
  if (!publication?.revision_number) return 'Borrador guardado, aún no publicado';
  if (!publication.draft_matches_current) {
    return `Borrador guardado. El viajero sigue viendo la revisión ${publication.revision_number}`;
  }
  return `Versión publicada vigente · revisión ${publication.revision_number}`;
}

function displayText(value: string | null | undefined): TrackedText {
  const next = value ?? null;
  return { value: next, origin: 'generated', generated_value: next };
}

function displayDate(value: string | null | undefined): TrackedDate {
  return displayText(value);
}

let publicSeq = 0;

function publicBlock(
  type: BlockType,
  content: Record<string, unknown>,
  sectionKind?: string | null,
): CarnetBlock {
  publicSeq += 1;
  return {
    id: `public-${publicSeq}`,
    type,
    position: publicSeq,
    visible: true,
    removed: false,
    manual: false,
    source_detail_id: null,
    product_kind: null,
    product_id: null,
    section_kind:
      sectionKind === 'itinerary_summary'
      || sectionKind === 'route_collection'
      || sectionKind === 'regional_recommendations'
        ? sectionKind
        : null,
    content,
  };
}

function coordPair(latitude: string | null, longitude: string | null): TrackedCoordinates {
  return {
    latitude,
    longitude,
    origin: 'generated',
    generated_latitude: latitude,
    generated_longitude: longitude,
  };
}

function entryContent(entry: PublicEntry): Record<string, unknown> {
  const points = [...entry.selling_points_fr, ...entry.highlights_fr];
  return {
    public_name: displayText(entry.title),
    title: displayText(entry.title),
    name: displayText(entry.title),
    heading: displayText(entry.heading),
    body: displayText(entry.body),
    asset_id: entry.asset_id ?? null,
    schedule: displayText(entry.schedule),
    description_fr: displayText(entry.description_fr),
    short_description_fr: displayText(entry.short_description_fr),
    recommendation_fr: displayText(entry.recommendation_fr),
    selling_points_fr: points.map((value) => displayText(value)),
    address: displayText(entry.address),
    phone: displayText(entry.phone),
    locality: displayText(entry.locality),
    check_in: displayDate(entry.check_in),
    check_out: displayDate(entry.check_out),
    dates: {
      value: entry.dates,
      origin: 'generated',
      generated_value: entry.dates,
    },
    departure_time: displayText(entry.departure_time),
    return_time: displayText(entry.return_time),
    pickup_text: displayText(entry.pickup_text),
    dropoff_text: displayText(entry.dropoff_text),
    origin_label: displayText(entry.origin_label),
    destination_label: displayText(entry.destination_label),
    coordinates: coordPair(entry.latitude, entry.longitude),
    origin_coordinates: coordPair(entry.origin_latitude, entry.origin_longitude),
    destination_coordinates: coordPair(
      entry.destination_latitude,
      entry.destination_longitude,
    ),
    reservation_number: displayText(entry.reservation_number),
    link: displayText(entry.link),
    notes: displayText(entry.notes),
    visit_tips: displayText(entry.visit_tips),
    rooms: entry.rooms.map((room, index) => ({
      id: `public-room-${publicSeq}-${index}`,
      room_id: null,
      public_name: displayText(room.public_name),
      quantity: {
        value: room.quantity ?? 1,
        origin: 'generated' as const,
        generated_value: room.quantity ?? 1,
      },
      description_fr: displayText(room.description_fr),
      description_es: displayText(null),
      recommendation_fr: displayText(room.recommendation_fr),
      manual: false,
      removed: false,
    })),
  };
}

export function documentFromPublic(view: PublicCarnet): CarnetDocument {
  publicSeq = 0;
  const blocks: CarnetBlock[] = [];
  if (view.cover) {
    blocks.push(publicBlock('cover', {
      title: displayText(view.cover.title),
      subtitle: displayText(view.cover.subtitle),
    }));
  }
  if (view.general) {
    const general = view.general;
    blocks.push(publicBlock('general', {
      trip_title: displayText(general.trip_title),
      start_date: displayDate(general.start_date),
      end_date: displayDate(general.end_date),
      holder_name: displayText(general.holder_name),
      adults: {
        value: general.adults ?? 0,
        origin: 'generated',
        generated_value: general.adults ?? 0,
      },
      children: {
        value: general.children ?? 0,
        origin: 'generated',
        generated_value: general.children ?? 0,
      },
      children_ages: {
        value: general.children_ages,
        origin: 'generated',
        generated_value: general.children_ages,
      },
      flights: general.flights.map((flight, index) => ({
        id: `public-flight-${index}`,
        movement: flight.movement,
        flight_number: displayText(flight.flight_number),
        on_date: displayDate(flight.on_date),
        at_time: displayText(flight.at_time),
        manual: false,
        removed: false,
      })),
    }));
  }
  const pushEntry = (entry: PublicEntry) => {
    const block = publicBlock(entry.type, entryContent(entry), entry.section_kind);
    blocks.push(block);
    if (entry.recommendation_section === 'restaurants') {
      block.template_section_id = RESTAURANTS_SECTION_ID;
      block.section_kind = 'free_section';
    }
    for (const item of entry.recommendations ?? []) {
      publicSeq += 1;
      const tracked = (value: string | null) => displayText(value);
      blocks.push({
        id: `public-${publicSeq}`,
        type: 'regional_recommendation',
        position: publicSeq,
        visible: true,
        removed: false,
        manual: false,
        source_detail_id: null,
        product_kind: null,
        product_id: null,
        parent_id: block.id,
        content: {
          recommendation_id: '00000000-0000-0000-0000-000000000000',
          category: item.category,
          zone_id: '00000000-0000-0000-0000-000000000000',
          zone_name: tracked(item.zone_name),
          activity_id: null,
          identified: item.tone === 'red' || item.tone === 'purple',
          included: true,
          selection_origin: 'automatic',
          tone: item.tone,
          tone_origin: 'generated',
          name: tracked(item.name),
          activity_type: tracked(item.activity_type),
          opening_hours: tracked(item.opening_hours),
          phone: tracked(item.phone),
          latitude: tracked(item.latitude),
          longitude: tracked(item.longitude),
          url: tracked(item.url),
          duration_text: tracked(item.duration_text),
          difficulty_text: tracked(item.difficulty_text),
          description: tracked(item.description),
        },
      });
    }
    for (const route of entry.routes ?? []) {
      publicSeq += 1;
      blocks.push({
        id: `public-${publicSeq}`,
        type: 'itinerary_route',
        position: publicSeq,
        visible: true,
        removed: false,
        manual: false,
        source_detail_id: null,
        product_kind: null,
        product_id: null,
        parent_id: block.id,
        content: {
          catalog_route_id: '00000000-0000-0000-0000-000000000000',
          mode: route.mode,
          tone: route.tone,
          included: true,
          origin_zone: displayText(route.origin_zone),
          destination_zone: displayText(route.destination_zone),
          origin_place: displayText(route.origin_place),
          destination_place: displayText(route.destination_place),
          distance_km: displayText(route.distance_km),
          duration_minutes: {
            value: route.duration_minutes,
            origin: 'generated',
            generated_value: route.duration_minutes,
          },
          instructions: displayText(route.instructions),
        },
      });
    }
  };
  for (const entry of view.front ?? []) pushEntry(entry);
  for (const entry of view.preamble ?? []) pushEntry(entry);
  for (const day of view.days) {
    const entries = day.entries.map((entry) => {
      const child = publicBlock(entry.type, entryContent(entry));
      blocks.push(child);
      return { block_id: child.id, role: entry.role ?? 'activity' as const };
    });
    blocks.push(publicBlock('day', {
      on_date: displayDate(day.on_date),
      title: displayText(day.title),
      notes: displayText(day.notes),
      entries,
      generated_entries: entries,
      entries_origin: 'generated',
    }));
  }
  for (const entry of view.rest) pushEntry(entry);
  return { locale: 'fr', schema_version: 1, blocks };
}
