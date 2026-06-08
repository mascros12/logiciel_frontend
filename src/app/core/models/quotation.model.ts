interface QuotationVehicle {
  id: string;
  name: string;
  grade: string;
  net_price: number;
  rack_price: number;
  is_original: boolean;
  deleted: boolean;
  total?: number;
}

interface QuotationRoom {
  id: string;
  name: string;
  grade: string;
  net_price: number;
  rack_price: number;
  additional_adults: number;
  additional_children: number;
  recommendation?: string;
  is_original: boolean;
  deleted: boolean;
  total?: number;
  /** Gama del hotel (high / medium / low), API enriquecida desde Room → Hotel */
  hotel_category?: string | null;
}

interface QuotationActivity {
  id: string;
  name: string;
  recommendation: string;
  grade: string;
  adults: number;
  children: number;
  free: number;
  net_price: number;
  rack_price: number;
  is_original: boolean;
  deleted: boolean;
  total?: number;
}

export interface QuotationLine {
  id: string;
  date: string;
  vehicles: QuotationVehicle[];
  rooms: QuotationRoom[];
  activities: QuotationActivity[];
}

export interface QuotationVersion {
  id: string;
  version_number: number;
  notes: string | null;
  is_current: boolean;
  total: number;
  created_at: string;
  /** Nombre del usuario que creó la versión (API enriquecida). */
  created_by_name?: string | null;
}

export type FichaMemberRole = 'child' | 'adult';
export type FichaAdultCategory = 'young' | 'regular' | 'senior';
export type FichaRoomType = 'double' | 'triple' | 'quadruple' | 'quintuple' | 'mixed';

/** Fila UI / API para composición familiar (Ficha AA) */
export interface FichaFamilyMemberRow {
  role: FichaMemberRole;
  age?: number | null;
  adult_category?: FichaAdultCategory | null;
}

export interface FichaRoomRequirementRow {
  room_type: FichaRoomType;
  quantity: number;
}

export interface FileAAGenerateRequest {
  /** Itinerario a usar; si no se envía, el backend usa la versión actual. */
  version_id?: string;
  family_members: FichaFamilyMemberRow[];
  room_requirements: FichaRoomRequirementRow[];
}

export type FileAADetailCategory = 'vehicle' | 'room' | 'activity';
export type FileAARowStatus = 'normal' | 'yellow' | 'red';

/** Observaciones estructuradas en Ficha AA — filas categoría vehículo */
export interface FileAADetailVehicleObsState {
  luggage_cover: boolean;
  pickup_detail: string;
  dropoff_detail: string;
  notes: string;
  ficha_fecha?: string;
  ficha_hora?: string;
  ficha_fecha_ida?: string;
  ficha_hora_ida?: string;
  ficha_fecha_vuelta?: string;
  ficha_hora_vuelta?: string;
  ficha_fecha_recogida?: string;
  ficha_hora_recogida?: string;
  ficha_fecha_devolucion?: string;
  ficha_hora_devolucion?: string;
  /** Taxi Marítimo: texto opcional junto a la fecha de ida (columna Fechas). */
  ficha_pick_up?: string;
  /** Taxi Marítimo: texto opcional junto a la fecha de vuelta (columna Fechas). */
  ficha_drop_off?: string;
  /** Interbus: fechas por trayecto (una por línea, alineada con ``vehicle_ficha_aa_subtitle``). */
  ficha_interbus_fechas?: string;
}

/** Observaciones estructuradas en Ficha AA — filas categoría actividad */
export interface FileAADetailActivityObsState {
  pickup_detail: string;
  /** Hora para export Word/PDF (columna Service), texto libre p. ej. «9h30» o «14h00». */
  ficha_horario: string;
  /** Adultos para cobrar (cálculo de total). */
  activity_adults: number | null;
  /** Menores para cobrar (cálculo de total). */
  activity_children: number | null;
  /** Gratuitos para cobrar (cálculo de total). */
  activity_free: number | null;
  /** Adultos para asistencia (documento/correo al proveedor). */
  activity_assist_adults: number | null;
  /** Menores para asistencia (documento/correo al proveedor). */
  activity_assist_children: number | null;
  /** Edades de menores para asistencia, p. ej. «6 y 8». */
  activity_assist_ages: string;
  notes: string;
}

/** Observaciones estructuradas en Ficha AA — filas categoría hotel */
export interface FichaMergedRoomSlot {
  room_id: string;
  room_file_aa_name?: string;
  room_quantity: number | null;
}

export interface FileAADetailRoomObsState {
  room_quantity: number | null;
  /** Cantidades por tipología cuando la fila agrupa varias habitaciones del mismo hotel. */
  merged_slots?: FichaMergedRoomSlot[];
  /** Entradas (check-in), p. ej. «20/3 y 30/3» */
  ficha_entrada?: string;
  /** Salidas (día de checkout), p. ej. «26/3 y 2/4» */
  ficha_salida?: string;
  /** Noches por estadía, p. ej. «6 y 3» */
  ficha_noches_texto?: string;
  notes: string;
}

/** Línea de la Ficha AA generada (hotel / actividad / vehículo) */
export interface FileAADetailRow {
  id: string;
  file_id: string;
  quotation_id: string;
  category: FileAADetailCategory;
  name: string;
  observations: string | null;
  /** JSON backend: campos según categoría (vehículo: cobertor, recogida, devolución, notas) */
  observation_extras?: Record<string, unknown> | null;
  /** Gama del hotel en filas habitación (también en observation_extras.hotel_category) */
  hotel_category?: string | null;
  /** IDs del registro de catálogo origen (para actualizar file_aa_name). */
  catalogue_room_id?: string | null;
  catalogue_hotel_id?: string | null;
  catalogue_activity_id?: string | null;
  catalogue_vehicle_id?: string | null;
  /**
   * Líneas «Service» ya formateadas por el backend con las mismas reglas
   * que el export Word/PDF (hotel limitado al segmento entre el primer y
   * segundo `/`, tipo de habitación en minúsculas con abreviaciones,
   * vehículos con sufijo `(N jours)`, etc.). Calculado como
   * `computed_field` en `FileAADetailResponse`.
   */
  display_service_lines?: string[];
  dates: string;
  date_from: string;
  date_to: string;
  days: number;
  total_price: number | string;
  provider_price: number | string | null;
  confirmed: boolean;
  reserved: boolean;
  reservation_number: string | null;
  paid: boolean;
  send_message: boolean;
  send_email: boolean;
  /** Marca de tiempo del envío al proveedor (correo de reserva), si aplica */
  supplier_email_sent_at?: string | null;
  row_status: FileAARowStatus;
  evaluation: number;
  evaluation_notes: string | null;
  ville: string | null;
}

export interface FileAAWithDetails {
  id: string;
  quotation_id: string;
  version_id?: string | null;
  name: string;
  notes: string | null;
  family_description: string | null;
  /** Texto libre que se imprime al final del Word/PDF (debajo de los virements). */
  observations: string | null;
  /** Texto libre que se imprime al final del Word/PDF (sección «Recordatorios»). */
  reminder: string | null;
  from_date: string | null;
  to_date: string | null;
  quantity_adults: number;
  quantity_children: number;
  children_ages: string | null;
  need_booster: boolean;
  need_kid_seat: boolean;
  header_color: string;
  sent: boolean;
  created_at: string;
  details: FileAADetailRow[];
}

/** Opción de servicio del itinerario para añadir fila en Ficha AA (misma agregación que al generar la ficha). */
export interface FileAADetailSourceOption {
  name: string;
  dates: string;
  date_from: string;
  date_to: string;
  days: number;
  total_price: number | string;
}

/** Opción del catálogo maestro Hotel + Room (Ficha AA). */
export interface FileAARoomCatalogOption {
  room_id: string;
  label: string;
  /** Gama del hotel (high / medium / low). */
  hotel_category?: 'high' | 'medium' | 'low' | string | null;
}

export interface FileAAActivityCatalogOption {
  activity_id: string;
  label: string;
}

export interface FileAAVehicleCatalogOption {
  vehicle_id: string;
  label: string;
}

/** Crear fila Ficha AA: un id de catálogo o campos manuales (compat.). */
export interface FileAADetailCreateBody {
  category: FileAADetailCategory;
  copy_operational_from_detail_id: string;
  mark_anchor_row_red: boolean;
  replace_room_id?: string;
  room_id?: string;
  activity_id?: string;
  vehicle_id?: string;
  name?: string;
  dates?: string;
  date_from?: string;
  date_to?: string;
  days?: number;
  total_price?: number | string;
}

export interface FileAADetailPatch {
  name?: string;
  observations?: string | null;
  observation_extras?: Record<string, unknown> | null;
  dates?: string;
  date_from?: string;
  date_to?: string;
  days?: number;
  total_price?: number | null;
  provider_price?: number | null;
  confirmed?: boolean;
  reserved?: boolean;
  reservation_number?: string | null;
  paid?: boolean;
  send_message?: boolean;
  row_status?: FileAARowStatus;
  evaluation?: number;
  evaluation_notes?: string | null;
  ville?: string | null;
}

export interface Quotation {
  id: string;
  name: string;
  notes: string | null;
  family_description: string | null;
  from_date: string | null;
  to_date: string | null;
  arrival_date: string | null;
  departure_date: string | null;
  arrival_time: string | null;
  departure_time: string | null;
  flight_number_arrival: string | null;
  flight_number_departure: string | null;
  commission: number;
  total: number;
  shared: boolean;
  contact_id: string | null;
  contact_source?: string | null;
  contact_budget?: string | null;
  contact_traveller_type?: string | null;
  contact_ritm?: string | null;
  created_by_id: string | null;
  created_by_name?: string | null;
  created_at: string;
  updated_at: string;
  versions: QuotationVersion[];
  ficha_family_members?: FichaFamilyMemberRow[] | null;
  ficha_room_requirements?: FichaRoomRequirementRow[] | null;
}

export interface QuotationFull extends Quotation {
  current_version: QuotationVersion | null;
  lines: QuotationLine[];
}

export interface QuotationListResponse {
  items: Quotation[];
  total: number;
  page: number;
  page_size: number;
}

export interface QuotationCreate {
  name: string;
  from_date: string;
  to_date: string;
  arrival_date?: string;
  departure_date?: string;
  notes?: string;
  commission?: number;
  contact_id?: string;
}

export interface QuotationUpdate {
  name?: string;
  notes?: string;
  family_description?: string;
  from_date?: string;
  to_date?: string;
  arrival_date?: string;
  departure_date?: string;
  arrival_time?: string;
  departure_time?: string;
  flight_number_arrival?: string;
  flight_number_departure?: string;
  commission?: number;
  contact_id?: string;
  shared?: boolean;
  ficha_family_members?: FichaFamilyMemberRow[];
  ficha_room_requirements?: FichaRoomRequirementRow[];
}

export interface AddVehicleRequest {
  vehicle_id: string;
  date: string;
}

export interface AddRoomRequest {
  room_id: string;
  date: string;
  additional_adults?: number;
  additional_children?: number;
  recommendation?: string;
}

export interface AddActivityRequest {
  activity_id: string;
  date: string;
  adults?: number;
  children?: number;
  free?: number;
  recommendation?: string;
}

export interface ServiceSummaryLine {
  name: string;
  qty: number;
  total: number;
}

export interface QuotationSummary {
  // Para versión v1 (cotización base)
  rooms: ServiceSummaryLine[];
  activities: ServiceSummaryLine[];
  vehicles: ServiceSummaryLine[];
  rooms_total: number;
  activities_total: number;
  vehicles_total: number;
  subtotal: number;
  commission: number;
  commission_rate: number;
  total: number;

  // Solo para versiones posteriores (equivalente a copied=True)
  is_version: boolean;
  base_total: number | null;
  // Originales
  original_rooms: ServiceSummaryLine[];
  original_activities: ServiceSummaryLine[];
  original_vehicles: ServiceSummaryLine[];
  // Eliminados
  deleted_rooms: ServiceSummaryLine[];
  deleted_activities: ServiceSummaryLine[];
  deleted_vehicles: ServiceSummaryLine[];
  deleted_subtotal: number;
  // Nuevos
  new_rooms: ServiceSummaryLine[];
  new_activities: ServiceSummaryLine[];
  new_vehicles: ServiceSummaryLine[];
  new_subtotal: number;
  /** v2+: diferencia entre (base − elim + nuevos) y el total real (agenda × comisión); suele ~redondeos. */
  legacy_breakdown_gap?: number | null;
}