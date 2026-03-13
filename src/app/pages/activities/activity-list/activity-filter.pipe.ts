import { Pipe, PipeTransform } from '@angular/core';
import { Activity } from '../../../core/models/activity.model';

@Pipe({
  name: 'activityFilter',
  standalone: true,
})
export class ActivityFilterPipe implements PipeTransform {
  transform(activities: Activity[] | null | undefined, term: string | null | undefined): Activity[] {
    if (!activities) return [];
    const q = (term ?? '').trim().toLowerCase();
    if (!q) return activities;

    return activities.filter(a => {
      const name = a.name?.toLowerCase() ?? '';
      const nameEs = a.name_es?.toLowerCase() ?? '';
      const province = a.province?.toLowerCase() ?? '';
      const category = a.category?.toLowerCase() ?? '';
      return (
        name.includes(q) ||
        nameEs.includes(q) ||
        province.includes(q) ||
        category.includes(q)
      );
    });
  }
}

