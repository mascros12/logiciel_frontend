export type LayoutKind =
  | 'cover'
  | 'table_of_contents'
  | 'itinerary_summary'
  | 'route_collection'
  | 'rich_text_section'
  | 'regional_recommendations'
  | 'questionnaire'
  | 'free_section'
  | 'conditions';

export interface LayoutNode {
  id: string;
  kind: LayoutKind;
  title: string;
  position: number;
  visible: boolean;
  body: string;
  config: { source: string };
  children: LayoutNode[];
}

export interface LayoutVersion {
  id: string;
  version_number: number;
  published_at: string;
  published_by_id: string | null;
  active: boolean;
}

export interface LayoutState {
  template_id: string;
  name: string;
  lock_version: number;
  draft_lock_version: number;
  draft_updated_at: string;
  active_version_id: string | null;
  active_version_number: number | null;
  nodes: LayoutNode[];
  versions: LayoutVersion[];
}

export interface LayoutDraftWrite {
  lock_version: number;
  nodes: LayoutNode[];
}

export const LAYOUT_KINDS: { id: LayoutKind; label: string; anchor: boolean }[] = [
  { id: 'cover', label: 'Portada', anchor: true },
  { id: 'table_of_contents', label: 'Índice', anchor: true },
  { id: 'itinerary_summary', label: 'Organización del viaje', anchor: true },
  { id: 'route_collection', label: 'Trayectos', anchor: true },
  { id: 'rich_text_section', label: 'Texto', anchor: false },
  { id: 'regional_recommendations', label: 'Recomendaciones por región', anchor: true },
  { id: 'questionnaire', label: 'Cuestionario', anchor: false },
  { id: 'free_section', label: 'Sección libre', anchor: false },
  { id: 'conditions', label: 'Condiciones', anchor: false },
];

export const LAYOUT_SOURCES: Record<string, string> = {
  none: 'Texto editorial de la plantilla',
  file_aa_cover: 'Portada de la Ficha AA, sin copiar servicios',
  visible_sections: 'Índice calculado con las secciones visibles',
  file_aa_days: 'Días y servicios de la Ficha AA, sin duplicarlos',
  file_aa_routes: 'Trayectos del documento, sin distancias inventadas',
  regional_groups: 'Grupos de recomendación, distintos de la reserva',
};
