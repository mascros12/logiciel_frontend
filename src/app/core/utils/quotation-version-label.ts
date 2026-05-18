/** Etiqueta UI: v1 → «Programme», v2+ → «Modif N». */
export function formatQuotationVersionLabel(
  versionNumber: number,
  options?: { current?: boolean },
): string {
  const base = versionNumber <= 1 ? 'Programme' : `Modif ${versionNumber}`;
  return options?.current ? `${base} (actual)` : base;
}
