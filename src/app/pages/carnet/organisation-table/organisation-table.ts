import { Component, input } from '@angular/core';
import { OrganisationRow } from '../../../core/utils/carnet-document';

@Component({
  selector: 'app-organisation-table',
  standalone: true,
  templateUrl: './organisation-table.html',
  styleUrl: './organisation-table.scss',
})
export class OrganisationTable {
  readonly heading = input('Organisation du voyage');
  readonly rows = input<OrganisationRow[]>([]);
}
