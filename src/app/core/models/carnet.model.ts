/** Contrato de lectura del borrador. El guardado usa otro DTO, sin baselines. */

export type FieldOrigin = 'generated' | 'edited';

export type BlockType =
  | 'cover'
  | 'general'
  | 'day'
  | 'hotel'
  | 'activity'
  | 'transport'
  | 'route'
  | 'point_of_interest'
  | 'note'
  | 'warning'
  | 'free_text'
  | 'practical'
  | 'conditions';

export interface TrackedText {
  value: string | null;
  origin: FieldOrigin;
  generated_value: string | null;
}

export interface TrackedDate {
  value: string | null;
  origin: FieldOrigin;
  generated_value: string | null;
}

export interface TrackedInt {
  value: number;
  origin: FieldOrigin;
  generated_value: number | null;
}

export interface TrackedCoordinates {
  latitude: string | null;
  longitude: string | null;
  origin: FieldOrigin;
  generated_latitude: string | null;
  generated_longitude: string | null;
}

export interface TrackedList<T> {
  value: T[];
  origin: FieldOrigin;
  generated_value: T[];
}

export interface DayEntry {
  block_id: string;
  role: 'stay' | 'activity' | 'transport' | 'included';
}

export interface RoomLine {
  id: string;
  room_id: string | null;
  public_name: TrackedText;
  quantity: TrackedInt;
  description_fr: TrackedText;
  description_es: TrackedText;
  recommendation_fr: TrackedText;
  manual: boolean;
  removed: boolean;
}

export interface FlightLine {
  id: string;
  movement: 'arrival' | 'departure';
  flight_number: TrackedText;
  on_date: TrackedDate;
  at_time: TrackedText;
  manual: boolean;
  removed: boolean;
}

export interface CarnetBlock {
  id: string;
  type: BlockType;
  position: number;
  visible: boolean;
  removed: boolean;
  manual: boolean;
  source_detail_id: string | null;
  product_kind: 'hotel' | 'room' | 'activity' | 'vehicle' | null;
  product_id: string | null;
  template_section_id?: string | null;
  parent_id?: string | null;
  section_kind?:
    | 'cover'
    | 'table_of_contents'
    | 'itinerary_summary'
    | 'route_collection'
    | 'rich_text_section'
    | 'regional_recommendations'
    | 'questionnaire'
    | 'free_section'
    | 'conditions'
    | null;
  content: Record<string, unknown>;
}

export interface CarnetDocument {
  locale: 'fr';
  schema_version: 1;
  blocks: CarnetBlock[];
}

export interface CarnetWarning {
  code: string;
  message: string;
  source_detail_id?: string | null;
}

export interface CarnetDraftView {
  lock_version: number;
  source_fingerprint: string;
  updated_at: string;
  document: CarnetDocument;
  warnings: CarnetWarning[];
}

export interface PublicationView {
  revision_number: number | null;
  published_at: string | null;
  link_state: 'absent' | 'active' | 'revoked';
  draft_matches_current: boolean;
}

export interface RevisionItem {
  revision_number: number;
  created_at: string;
}

export interface PublicLinkView {
  state: 'absent' | 'active' | 'revoked';
  path: string | null;
}

export interface PublicRoom {
  public_name: string | null;
  quantity: number | null;
  description_fr: string | null;
  recommendation_fr: string | null;
}

export interface PublicFlight {
  movement: 'arrival' | 'departure';
  flight_number: string | null;
  on_date: string | null;
  at_time: string | null;
}

export interface PublicEntry {
  type: BlockType;
  role: 'stay' | 'activity' | 'transport' | 'included' | null;
  title: string | null;
  schedule: string | null;
  description_fr: string | null;
  short_description_fr: string | null;
  recommendation_fr: string | null;
  selling_points_fr: string[];
  highlights_fr: string[];
  address: string | null;
  phone: string | null;
  locality: string | null;
  check_in: string | null;
  check_out: string | null;
  dates: string[];
  departure_time: string | null;
  return_time: string | null;
  pickup_text: string | null;
  dropoff_text: string | null;
  origin_label: string | null;
  destination_label: string | null;
  latitude: string | null;
  longitude: string | null;
  origin_latitude: string | null;
  origin_longitude: string | null;
  destination_latitude: string | null;
  destination_longitude: string | null;
  reservation_number: string | null;
  link: string | null;
  notes: string | null;
  heading: string | null;
  body: string | null;
  visit_tips: string | null;
  rooms: PublicRoom[];
  section_kind?: string | null;
  organisation?: PublicOrganisationRow[] | null;
}

export interface PublicOrganisationRow {
  on_date: string | null;
  date_label: string;
  region: string | null;
  lodging: string[];
  included: string[];
}

export interface PublicDay {
  on_date: string | null;
  title: string | null;
  notes: string | null;
  entries: PublicEntry[];
}

export interface PublicCarnet {
  locale: 'fr';
  cover: { title: string | null; subtitle: string | null } | null;
  general: {
    trip_title: string | null;
    start_date: string | null;
    end_date: string | null;
    holder_name: string | null;
    adults: number | null;
    children: number | null;
    children_ages: number[];
    flights: PublicFlight[];
  } | null;
  preamble?: PublicEntry[];
  days: PublicDay[];
  rest: PublicEntry[];
}

export interface CarnetView {
  id: string;
  file_aa_id: string;
  status: string;
  created_at: string;
  updated_at: string;
  draft: CarnetDraftView;
  publication: PublicationView;
}

export interface SourceStatusView {
  status: 'unchanged' | 'changed' | 'unavailable';
}

export interface DraftWrite {
  lock_version: number;
  blocks: DraftBlockWrite[];
}

export interface DraftBlockWrite {
  id?: string;
  type: BlockType;
  visible: boolean;
  removed: boolean;
  content: Record<string, unknown>;
}

export interface SyncAction {
  id: string;
  kind: string;
  safe: boolean;
  state: string;
  title: string;
  field: string | null;
  block_id: string | null;
  source_detail_id: string | null;
  baseline: string | null;
  draft_value: string | null;
  source_value: string | null;
  note: string | null;
}

export interface SyncProposal {
  available: boolean;
  coverage: string;
  reason: string | null;
  source_fingerprint: string;
  actions: SyncAction[];
  kept: string[];
  warnings: string[];
}

export interface SyncPreview {
  changed: boolean;
  pending: number;
  document: CarnetDocument;
  source_fingerprint: string;
}

export interface SyncApply {
  lock_version: number;
  source_fingerprint: string;
  accept: string[];
  dry_run: boolean;
}
