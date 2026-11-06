import { Component, input } from '@angular/core';
import { OrganisationRow } from '../../../core/utils/carnet-document';
import { RichText } from '../rich-text/rich-text';

@Component({
  selector: 'app-organisation-table',
  standalone: true,
  imports: [RichText],
  templateUrl: './organisation-table.html',
  styleUrl: './organisation-table.scss',
})
export class OrganisationTable {
  readonly heading = input('Organisation du voyage');
  readonly rows = input<OrganisationRow[]>([]);
  readonly notices = input<string[]>([]);
}
