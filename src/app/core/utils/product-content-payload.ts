import {
  CapacityType,
  ContentLocale,
  ProductContentView,
  ProductContentWrite,
  RoomClassificationWrite,
} from '../models/product-content.model';
import { ATTRIBUTE_FIELDS, AttributeKind } from './product-content-labels';

export interface LocaleDraft {
  short_description: string;
  description: string;
  recommendation: string;
  selling_points: string[];
}

export interface ContentDraft {
  es: LocaleDraft;
  fr: LocaleDraft;
  attributes: Record<string, string>;
}

export interface ClassificationDraft {
  capacity_type: string;
  room_class: string;
}

const TEXT_FIELDS = ['short_description', 'description', 'recommendation'] as const;
const CAPACITY_VALUES: readonly CapacityType[] = [
  'single',
  'double',
  'triple',
  'quadruple',
  'quintuple',
  'mixed',
];

export function emptyLocale(): LocaleDraft {
  return {
    short_description: '',
    description: '',
    recommendation: '',
    selling_points: [],
  };
}

export function localeFromView(locale: ContentLocale | null | undefined): LocaleDraft {
  return {
    short_description: locale?.short_description ?? '',
    description: locale?.description ?? '',
    recommendation: locale?.recommendation ?? '',
    selling_points: [...(locale?.selling_points ?? [])],
  };
}

export function attributesFromView(
  kind: AttributeKind,
  attributes: ProductContentView['attributes'] | undefined,
): Record<string, string> {
  if (kind === 'none') return {};
  const values: Record<string, string> = {};
  for (const field of ATTRIBUTE_FIELDS[kind]) {
    const raw = attributes?.[field.key];
    if (raw === true) values[field.key] = 'true';
    else if (raw === false) values[field.key] = 'false';
    else if (typeof raw === 'string' && raw.length > 0) values[field.key] = raw;
    else values[field.key] = 'unknown';
  }
  return values;
}

export function draftFromContent(
  kind: AttributeKind,
  content: ProductContentView | null | undefined,
): ContentDraft {
  return normalizeDraft(
    {
      es: localeFromView(content?.es),
      fr: localeFromView(content?.fr),
      attributes: attributesFromView(kind, content?.attributes),
    },
    kind,
  );
}

export function normalizeDraft(draft: ContentDraft, kind: AttributeKind): ContentDraft {
  return {
    es: normalizeLocale(draft.es),
    fr: normalizeLocale(draft.fr),
    attributes: attributesFromView(kind, uiAttributes(draft.attributes)),
  };
}

export function contentDraftsDiffer(
  before: ContentDraft,
  after: ContentDraft,
  kind: AttributeKind,
): boolean {
  return JSON.stringify(normalizeDraft(before, kind)) !== JSON.stringify(normalizeDraft(after, kind));
}

export function buildContentWrite(
  before: ContentDraft,
  after: ContentDraft,
  kind: AttributeKind,
): { body: ProductContentWrite | null; error: string | null } {
  const left = normalizeDraft(before, kind);
  const right = normalizeDraft(after, kind);
  const es = localeWrite(left.es, right.es);
  if (es.error) return { body: null, error: es.error };
  const fr = localeWrite(left.fr, right.fr);
  if (fr.error) return { body: null, error: fr.error };

  const body: ProductContentWrite = {};
  if (es.write) body.es = es.write;
  if (fr.write) body.fr = fr.write;

  if (kind !== 'none') {
    const set: Record<string, string | boolean> = {};
    const unset: string[] = [];
    for (const field of ATTRIBUTE_FIELDS[kind]) {
      const previous = left.attributes[field.key] ?? 'unknown';
      const next = right.attributes[field.key] ?? 'unknown';
      if (previous === next) continue;
      if (next === 'unknown') {
        unset.push(field.key);
      } else if (next === 'true') {
        set[field.key] = true;
      } else if (next === 'false') {
        set[field.key] = false;
      } else {
        set[field.key] = next;
      }
    }
    if (Object.keys(set).length > 0) body.attributes_set = set;
    if (unset.length > 0) body.attributes_unset = unset;
  }

  return { body: Object.keys(body).length > 0 ? body : null, error: null };
}

export function buildClassificationWrite(
  before: ClassificationDraft,
  after: ClassificationDraft,
): RoomClassificationWrite | null {
  const body: RoomClassificationWrite = {};
  if (before.capacity_type !== after.capacity_type) {
    body.capacity_type = asCapacity(after.capacity_type);
  }
  const previousClass = before.room_class.trim();
  const nextClass = after.room_class.trim();
  if (previousClass !== nextClass) {
    body.room_class = nextClass || null;
  }
  return Object.keys(body).length > 0 ? body : null;
}

function localeWrite(
  before: LocaleDraft,
  after: LocaleDraft,
): { write: ProductContentWrite['es'] | null; error: string | null } {
  const write: NonNullable<ProductContentWrite['es']> = {};
  for (const key of TEXT_FIELDS) {
    if (before[key] === after[key]) continue;
    write[key] = after[key];
  }
  const samePoints = JSON.stringify(before.selling_points) === JSON.stringify(after.selling_points);
  if (!samePoints) {
    if (after.selling_points.some((point) => point.length === 0)) {
      return { write: null, error: 'Los puntos destacados no pueden quedar vacíos.' };
    }
    write.selling_points = after.selling_points;
  }
  return { write: Object.keys(write).length > 0 ? write : null, error: null };
}

function normalizeLocale(locale: LocaleDraft): LocaleDraft {
  return {
    short_description: locale.short_description.trim(),
    description: locale.description.trim(),
    recommendation: locale.recommendation.trim(),
    selling_points: locale.selling_points.map((point) => point.trim()),
  };
}

function uiAttributes(values: Record<string, string>): Record<string, string | boolean> {
  const encoded: Record<string, string | boolean> = {};
  for (const [key, value] of Object.entries(values)) {
    if (value === 'true') encoded[key] = true;
    else if (value === 'false') encoded[key] = false;
    else if (value !== 'unknown' && value !== '') encoded[key] = value;
  }
  return encoded;
}

function asCapacity(value: string): CapacityType | null {
  return CAPACITY_VALUES.includes(value as CapacityType) ? (value as CapacityType) : null;
}
