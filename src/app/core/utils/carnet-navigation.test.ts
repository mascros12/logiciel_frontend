import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { googleMapsUrl, navigationOf, wazeUrl } from './carnet-navigation.ts';

const origin = { latitude: '9.92810', longitude: '-84.09072' };
const destination = { latitude: '10.01625', longitude: '-84.21163' };
const place = { latitude: '9.43210', longitude: '-84.16170' };

describe('navegación del Carnet', () => {
  it('arma Google Maps y Waze sin invertir las coordenadas', () => {
    const route = navigationOf({
      type: 'route',
      content: { origin_coordinates: origin, destination_coordinates: destination },
    });
    assert.equal(
      route.mapsUrl,
      'https://www.google.com/maps/dir/?api=1&origin=9.92810,-84.09072&destination=10.01625,-84.21163&travelmode=driving',
    );
    assert.equal(route.wazeUrl, 'https://waze.com/ul?ll=10.01625,-84.21163&navigate=yes');
    assert.equal(route.origin, '9.92810, -84.09072');
    assert.equal(googleMapsUrl(null, '9.43210,-84.16170'), navigationOf({
      type: 'hotel',
      content: { coordinates: place },
    }).mapsUrl);
    assert.match(wazeUrl('9.43210,-84.16170') ?? '', /ll=9\.43210,-84\.16170/);
  });

  it('no publica un enlace si faltan o sobran las coordenadas', () => {
    const missing = navigationOf({
      type: 'route',
      content: { origin_coordinates: origin, destination_coordinates: { latitude: null, longitude: null } },
    });
    assert.equal(missing.mapsUrl, null);
    assert.equal(missing.wazeUrl, null);
    const invalid = navigationOf({
      type: 'activity',
      content: { coordinates: { latitude: '91.00000', longitude: '-84.09072' } },
    });
    assert.equal(invalid.mapsUrl, null);
    const transport = navigationOf({ type: 'transport', content: {} });
    assert.equal(transport.mapsUrl, null);
    const hotel = navigationOf({ type: 'hotel', content: { coordinates: place } });
    assert.equal(hotel.mapsUrl?.includes('10.01625'), false);
  });
});
