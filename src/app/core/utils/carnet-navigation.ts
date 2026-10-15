/** URLs oficiales. La latitud va primero; no se inventan coordenadas. */

const COORDINATE = /^-?\d+\.\d{5,7}$/;
const MAPS = 'https://www.google.com/maps/dir/';
const WAZE = 'https://waze.com/ul';
const PLACE_TYPES = new Set(['hotel', 'activity', 'point_of_interest', 'transport']);

export interface NavigationView {
  mapsUrl: string | null;
  wazeUrl: string | null;
  place: string | null;
  origin: string | null;
  destination: string | null;
}

const EMPTY: NavigationView = {
  mapsUrl: null,
  wazeUrl: null,
  place: null,
  origin: null,
  destination: null,
};

export function googleMapsUrl(origin: string | null, destination: string | null): string | null {
  if (!destination) return null;
  const items: [string, string][] = [['api', '1']];
  if (origin) items.push(['origin', origin]);
  items.push(['destination', destination], ['travelmode', 'driving']);
  return `${MAPS}?${query(items)}`;
}

export function wazeUrl(destination: string | null): string | null {
  if (!destination) return null;
  return `${WAZE}?${query([
    ['ll', destination],
    ['navigate', 'yes'],
  ])}`;
}

export function navigationOf(block: { type: string; content: object }): NavigationView {
  const content = block.content as Record<string, unknown>;
  if (block.type === 'route') {
    const origin = readPair(content, 'origin_coordinates');
    const destination = readPair(content, 'destination_coordinates');
    const destinationPair = join(destination);
    return {
      mapsUrl: googleMapsUrl(join(origin), destinationPair),
      wazeUrl: wazeUrl(destinationPair),
      place: null,
      origin: spaced(origin),
      destination: spaced(destination),
    };
  }
  if (!PLACE_TYPES.has(block.type)) return EMPTY;
  const place = readPair(content, 'coordinates');
  const pair = join(place);
  return {
    mapsUrl: googleMapsUrl(null, pair),
    wazeUrl: wazeUrl(pair),
    place: spaced(place),
    origin: null,
    destination: null,
  };
}

function readPair(content: Record<string, unknown>, key: string): [string, string] | null {
  const value = content[key];
  if (!value || typeof value !== 'object') return null;
  const pair = value as { latitude?: string | null; longitude?: string | null };
  return validPair(pair.latitude ?? null, pair.longitude ?? null);
}

export function validPair(latitude: string | null, longitude: string | null): [string, string] | null {
  const lat = (latitude ?? '').trim();
  const lng = (longitude ?? '').trim();
  if (!COORDINATE.test(lat) || !COORDINATE.test(lng)) return null;
  const latN = Number(lat);
  const lngN = Number(lng);
  if (latN < -90 || latN > 90 || lngN < -180 || lngN > 180) return null;
  return [lat, lng];
}

function join(pair: [string, string] | null): string | null {
  return pair ? `${pair[0]},${pair[1]}` : null;
}

function spaced(pair: [string, string] | null): string | null {
  return pair ? `${pair[0]}, ${pair[1]}` : null;
}

function query(items: [string, string][]): string {
  return items
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value).replace(/%2C/g, ',')}`)
    .join('&');
}
