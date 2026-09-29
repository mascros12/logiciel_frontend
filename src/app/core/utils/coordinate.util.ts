import { AbstractControl, ValidationErrors } from '@angular/forms';

const COORDINATE = /^-?\d+\.\d{5,7}$/;

/** Vacío, o número con entre 5 y 7 decimales dentro del rango. */
export function coordinateValidator(min: number, max: number) {
  return (control: AbstractControl): ValidationErrors | null => {
    const text = String(control.value ?? '').trim().replace(',', '.');
    if (!text) return null;
    if (!COORDINATE.test(text)) return { coordinateDecimals: true };
    const value = Number(text);
    if (value < min) return { min: { min } };
    if (value > max) return { max: { max } };
    return null;
  };
}

export const longitudeValidator = coordinateValidator(-180, 180);
export const latitudeValidator = coordinateValidator(-90, 90);

/** Longitud y latitud van juntas, o las dos vacías. */
export function coordinatePairValidator(group: AbstractControl): ValidationErrors | null {
  const longitude = String(group.get('longitude')?.value ?? '').trim();
  const latitude = String(group.get('latitude')?.value ?? '').trim();
  if ((!longitude && latitude) || (longitude && !latitude)) {
    return { coordinatePair: true };
  }
  return null;
}

/** Conserva al menos 5 decimales al reabrir un valor guardado. */
export function formatCoordinate(value: string | number | null | undefined): string {
  if (value == null || value === '') return '';
  const text = String(value).trim();
  if (!text.includes('.')) return `${text}.00000`;
  const [whole, frac = ''] = text.split('.');
  const trimmed = frac.replace(/0+$/, '');
  return `${whole}.${trimmed.padEnd(5, '0')}`;
}
