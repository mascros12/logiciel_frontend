import { Component, input, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import {
  PreviewDay,
  PreviewEntry,
  PreviewModel,
  blockTitle,
  dateOf,
  entriesOf,
  hideFromDayBreakdown,
  pointsOf,
  itineraryRoutes,
  previewOf,
  rentalNotices,
  recommendationLines,
  RESTAURANTS_SECTION_ID,
  roomsOf,
  textOf,
  transportDayCounts,
} from '../../../core/utils/carnet-document';
import { CarnetBlock, CarnetDocument } from '../../../core/models/carnet.model';
import { NavigationView, navigationOf } from '../../../core/utils/carnet-navigation';
import { OrganisationTable } from '../organisation-table/organisation-table';
import { QuestionnaireForm } from '../questionnaire-form/questionnaire-form';
import { RecommendationSection } from '../recommendation-section/recommendation-section';
import { RichText } from '../rich-text/rich-text';
import { RouteSection } from '../route-section/route-section';

type DigitalTab = 'organisation' | 'practical' | 'routes' | 'recommendations' | 'questionnaire';

@Component({
  selector: 'app-carnet-preview',
  standalone: true,
  imports: [
    NgTemplateOutlet,
    OrganisationTable,
    RouteSection,
    RecommendationSection,
    QuestionnaireForm,
    RichText,
  ],
  templateUrl: './carnet-preview.html',
  styleUrl: './carnet-preview.scss',
})
export class CarnetPreview {
  readonly document = input.required<CarnetDocument>();
  readonly rentalNotices = rentalNotices;
  readonly unsaved = input(false);
  readonly mode = input<'draft' | 'published'>('draft');
  readonly questionnaireMode = input<'public' | 'staff' | null>(null);
  readonly questionnaireKey = input('');
  readonly tab = signal<DigitalTab>('organisation');
  readonly recommendationTab = signal<'activities' | 'restaurants'>('activities');
  readonly scores = [1, 2, 3, 4, 5];
  readonly tabs: { id: DigitalTab; label: string; short: string }[] = [
    { id: 'organisation', label: 'Organisation du voyage', short: 'Organisation' },
    { id: 'practical', label: 'Informations pratiques', short: 'Pratique' },
    { id: 'routes', label: 'Les trajets', short: 'Trajets' },
    { id: 'recommendations', label: 'Recommandations', short: 'Conseils' },
    { id: 'questionnaire', label: 'Questionnaire', short: 'Questionnaire' },
  ];

  preview(): PreviewModel {
    return previewOf(this.document());
  }

  organisationBlock(): CarnetBlock | null {
    return [...this.preview().lead, ...this.preview().rest]
      .find((block) => block.section_kind === 'itinerary_summary') ?? null;
  }

  selectTab(tab: DigitalTab): void {
    this.tab.set(tab);
  }

  practicalView(): { body: string; sections: CarnetBlock[] } {
    const pool = [...this.preview().lead, ...this.preview().rest];
    const parent = pool.find((block) =>
      /informations pratiques/i.test(this.text(block, 'heading') || this.text(block, 'title')),
    );
    if (!parent) return { body: '', sections: [] };
    const children = pool.filter((block) => block.parent_id === parent.id);
    if (!children.length) return { body: '', sections: [parent] };
    return { body: this.text(parent, 'body'), sections: children };
  }

  routeBlock(): CarnetBlock | null {
    return [...this.preview().lead, ...this.preview().rest]
      .find((block) => block.section_kind === 'route_collection') ?? null;
  }

  activityBlock(): CarnetBlock | null {
    return [...this.preview().lead, ...this.preview().rest].find((block) =>
      block.section_kind === 'regional_recommendations'
      && this.recommendationKind(block) !== 'restaurants',
    ) ?? null;
  }

  restaurantBlock(): CarnetBlock | null {
    return [...this.preview().lead, ...this.preview().rest]
      .find((block) => this.recommendationKind(block) === 'restaurants' && this.isRecommendation(block))
      ?? null;
  }

  shownEntries(day: PreviewDay): PreviewEntry[] {
    const counts = transportDayCounts(this.document());
    return day.entries.filter(
      (entry) => !hideFromDayBreakdown(entry.block, counts.get(entry.block.id) ?? 0),
    );
  }

  isToday(block: CarnetBlock): boolean {
    const value = textOf(block.content, 'on_date').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return value === `${now.getFullYear()}-${month}-${day}`;
  }

  ratingGroups(): { title: string; labels: string[] }[] {
    const found = { hotel: [] as string[], activity: [] as string[], vehicle: [] as string[] };
    const seen = new Set<string>();
    for (const day of this.preview().days) {
      for (const entry of day.entries) {
        const category = entry.block.type === 'hotel'
          ? 'hotel'
          : entry.block.type === 'activity'
            ? 'activity'
            : entry.block.type === 'transport'
              ? 'vehicle'
              : null;
        const label = this.title(entry.block).trim();
        if (!category || !label) continue;
        const key = `${category}:${label.toLocaleLowerCase()}`;
        if (seen.has(key)) continue;
        seen.add(key);
        found[category].push(label);
      }
    }
    return [
      { title: 'Hôtels', labels: found.hotel },
      { title: 'Activités', labels: found.activity },
      { title: 'Véhicules', labels: found.vehicle },
    ].filter((group) => group.labels.length > 0);
  }

  recommendationKind(block: CarnetBlock): 'activities' | 'restaurants' {
    if (block.template_section_id === RESTAURANTS_SECTION_ID) return 'restaurants';
    return 'activities';
  }

  isRecommendation(block: CarnetBlock): boolean {
    return block.section_kind === 'regional_recommendations'
      || block.template_section_id === RESTAURANTS_SECTION_ID;
  }

  recommendationRows(block: CarnetBlock) {
    if (!this.isRecommendation(block)) return [];
    return recommendationLines(this.document(), block.id);
  }

  routeLines(block: CarnetBlock) {
    if (block.section_kind !== 'route_collection') return [];
    return itineraryRoutes(this.document(), block.id);
  }

  title(block: CarnetBlock): string {
    return blockTitle(block);
  }

  text(block: CarnetBlock, field: string): string {
    return textOf(block.content, field);
  }

  date(block: CarnetBlock, field: string): string {
    return dateOf(block.content, field);
  }

  points(block: CarnetBlock, field: string): string[] {
    return pointsOf(block.content, field).filter(Boolean);
  }

  rooms(block: CarnetBlock) {
    return roomsOf(block).filter((room) => !room.removed);
  }

  dayEntries(block: CarnetBlock) {
    return entriesOf(block);
  }

  nav(block: CarnetBlock): NavigationView {
    return navigationOf(block);
  }

  tel(block: CarnetBlock): string | null {
    const phone = textOf(block.content, 'phone').replace(/[^\d+]/g, '');
    const digits = phone.startsWith('+') ? phone.slice(1) : phone;
    if (!/^\d{6,15}$/.test(digits)) return null;
    return `tel:${phone}`;
  }
}
