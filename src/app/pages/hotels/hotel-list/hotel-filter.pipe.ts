import { Pipe, PipeTransform } from '@angular/core';
import { Hotel } from '../../../core/models/hotel.model';

@Pipe({
  name: 'hotelFilter',
  standalone: true,
})
export class HotelFilterPipe implements PipeTransform {
  transform(hotels: Hotel[] | null | undefined, term: string | null | undefined): Hotel[] {
    if (!hotels) return [];
    const q = (term ?? '').trim().toLowerCase();
    if (!q) return hotels;

    return hotels.filter(h => {
      const name = h.name?.toLowerCase() ?? '';
      const province = h.province?.toLowerCase() ?? '';
      const address = h.address?.toLowerCase() ?? '';
      return name.includes(q) || province.includes(q) || address.includes(q);
    });
  }
}

