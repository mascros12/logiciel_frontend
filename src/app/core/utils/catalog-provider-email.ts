/** Operaciones: modal dedicado en listados de catálogo. */
export function canEditProviderReservationEmail(role: string | undefined | null): boolean {
  return role === 'operaciones';
}
