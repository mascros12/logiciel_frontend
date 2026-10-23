import { Component, input } from '@angular/core';
import { RouteLine } from '../../../core/utils/carnet-document';

@Component({
  selector: 'app-route-section',
  standalone: true,
  templateUrl: './route-section.html',
  styleUrl: './route-section.scss',
})
export class RouteSection {
  readonly heading = input('Les trajets');
  readonly body = input('');
  readonly rows = input<RouteLine[]>([]);

  zoneRows(): RouteLine[] {
    return this.rows().filter((row) => row.tone === 'zone');
  }
}
