/**
 * Exportación Excel (SpreadsheetML .xls) para catálogos.
 * Añadir columnas: pasar más entradas en `columns`.
 */

export interface CatalogExcelColumn<T> {
  header: string;
  value: (row: T) => string | number | null | undefined;
}

/** Quita marcadores *negrita* _cursiva_ ~tachado~ del nombre de catálogo. */
export function stripRichTextMarkers(value: string | null | undefined): string {
  return String(value ?? '')
    .replace(/[*_~]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function cellXml(raw: string | number | null | undefined): string {
  const text = raw == null ? '' : String(raw);
  const isNumber = typeof raw === 'number' && Number.isFinite(raw);
  if (isNumber) {
    return `<Cell><Data ss:Type="Number">${raw}</Data></Cell>`;
  }
  return `<Cell><Data ss:Type="String">${escapeXml(text)}</Data></Cell>`;
}

/**
 * Descarga un .xls abrible en Excel.
 * Por defecto basta con una columna Nombre; se pueden añadir más en `columns`.
 */
export function downloadCatalogExcel<T>(options: {
  filename: string;
  sheetName?: string;
  columns: CatalogExcelColumn<T>[];
  rows: T[];
}): void {
  const { filename, columns, rows } = options;
  const sheetName = (options.sheetName ?? 'Datos').slice(0, 31);
  if (!columns.length) return;

  const header = `<Row>${columns.map((c) => cellXml(c.header)).join('')}</Row>`;
  const body = rows
    .map((row) => `<Row>${columns.map((c) => cellXml(c.value(row))).join('')}</Row>`)
    .join('');

  const xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Worksheet ss:Name="${escapeXml(sheetName)}">
  <Table>
${header}
${body}
  </Table>
 </Worksheet>
</Workbook>`;

  const blob = new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeName = filename.replace(/[^\w\-À-ÿ.]+/gi, '_').replace(/\.+$/, '');
  a.href = url;
  a.download = `${safeName || 'export'}.xls`;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
