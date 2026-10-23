import { Component, input } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import {
  PreviewModel,
  blockTitle,
  dateOf,
  entriesOf,
  pointsOf,
  itineraryRoutes,
  pageAssetId,
  previewOf,
  recommendationLines,
  RESTAURANTS_SECTION_ID,
  roomsOf,
  textOf,
} from '../../../core/utils/carnet-document';
import { CarnetBlock, CarnetDocument } from '../../../core/models/carnet.model';
import { NavigationView, navigationOf } from '../../../core/utils/carnet-navigation';
import { FullPageImage } from '../full-page-image/full-page-image';
import { OrganisationTable } from '../organisation-table/organisation-table';
import { RecommendationSection } from '../recommendation-section/recommendation-section';
import { RouteSection } from '../route-section/route-section';

@Component({
  selector: 'app-carnet-preview',
  standalone: true,
  imports: [
    NgTemplateOutlet,
    OrganisationTable,
    FullPageImage,
    RouteSection,
    RecommendationSection,
  ],
  templateUrl: './carnet-preview.html',
  styleUrl: './carnet-preview.scss',
})
export class CarnetPreview {
  readonly document = input.required<CarnetDocument>();
  readonly unsaved = input(false);
  readonly mode = input<'draft' | 'published'>('draft');
  readonly publicMediaBase = input<string | null>(null);
  readonly privateMediaBase = input<string | null>(null);

  preview(): PreviewModel {
    return previewOf(this.document());
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

  asset(block: CarnetBlock): string | null {
    return pageAssetId(block);
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
