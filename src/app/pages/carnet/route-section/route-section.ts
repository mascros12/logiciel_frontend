import { Component, input } from '@angular/core';
import {
  RouteLine,
  TrajetHeading,
  trajetHeading,
  zonePair,
} from '../../../core/utils/carnet-document';
import { RichText } from '../rich-text/rich-text';

@Component({
  selector: 'app-route-section',
  standalone: true,
  imports: [RichText],
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

  establishmentRows(): RouteLine[] {
    return this.rows().filter((row) => row.tone !== 'zone');
  }

  pair(row: RouteLine): string {
    return zonePair(row);
  }

  headingOf(row: RouteLine): TrajetHeading {
    return trajetHeading(row);
  }
}
