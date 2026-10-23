import { Component, input } from '@angular/core';
import { RecommendationLine } from '../../../core/utils/carnet-document';

@Component({
  selector: 'app-recommendation-section',
  standalone: true,
  templateUrl: './recommendation-section.html',
  styleUrl: './recommendation-section.scss',
})
export class RecommendationSection {
  readonly heading = input('Activités dans la région');
  readonly body = input('');
  readonly rows = input<RecommendationLine[]>([]);
  readonly kind = input<'activities' | 'restaurants'>('activities');

  groups(): { zone: string; rows: RecommendationLine[] }[] {
    const order: string[] = [];
    const buckets = new Map<string, RecommendationLine[]>();
    for (const row of this.rows()) {
      const zone = row.zoneName || '';
      const current = buckets.get(zone);
      if (!current) {
        order.push(zone);
        buckets.set(zone, [row]);
      } else {
        current.push(row);
      }
    }
    return order.map((zone) => ({ zone, rows: buckets.get(zone) ?? [] }));
  }

  maps(row: RecommendationLine): string | null {
    if (!row.latitude || !row.longitude) return null;
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${row.latitude},${row.longitude}`)}`;
  }
}
