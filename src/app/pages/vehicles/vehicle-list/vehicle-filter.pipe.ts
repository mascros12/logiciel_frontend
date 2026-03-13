import { Pipe, PipeTransform } from '@angular/core';
import { Vehicle } from '../../../core/models/vehicle.model';

@Pipe({
  name: 'vehicleFilter',
  standalone: true,
})
export class VehicleFilterPipe implements PipeTransform {
  transform(vehicles: Vehicle[] | null | undefined, term: string | null | undefined): Vehicle[] {
    if (!vehicles) return [];
    const q = (term ?? '').trim().toLowerCase();
    if (!q) return vehicles;

    return vehicles.filter(v => {
      const name = v.name?.toLowerCase() ?? '';
      const brand = v.brand?.toLowerCase() ?? '';
      const category = v.category?.toLowerCase() ?? '';
      return (
        name.includes(q) ||
        brand.includes(q) ||
        category.includes(q)
      );
    });
  }
}

