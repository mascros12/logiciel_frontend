/** Etiqueta UI: v1 → «Programme», v2 → «Modif 1», v3 → «Modif 2», … */
export function formatQuotationVersionLabel(
  versionNumber: number,
  options?: { current?: boolean },
): string {
  const base =
    versionNumber <= 1 ? 'Programme' : `Modif ${versionNumber - 1}`;
  return options?.current ? `${base} (actual)` : base;
}
