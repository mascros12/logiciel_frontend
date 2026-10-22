import { Component, input } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import {
  PreviewModel,
  blockTitle,
  dateOf,
  entriesOf,
  pointsOf,
  previewOf,
  roomsOf,
  textOf,
} from '../../../core/utils/carnet-document';
import { CarnetBlock, CarnetDocument } from '../../../core/models/carnet.model';
import { NavigationView, navigationOf } from '../../../core/utils/carnet-navigation';
import { OrganisationTable } from '../organisation-table/organisation-table';

@Component({
  selector: 'app-carnet-preview',
  standalone: true,
  imports: [NgTemplateOutlet, OrganisationTable],
  templateUrl: './carnet-preview.html',
  styleUrl: './carnet-preview.scss',
})
export class CarnetPreview {
  readonly document = input.required<CarnetDocument>();
  readonly unsaved = input(false);
  readonly mode = input<'draft' | 'published'>('draft');

  preview(): PreviewModel {
    return previewOf(this.document());
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
