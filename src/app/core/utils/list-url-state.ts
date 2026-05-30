import { ActivatedRoute, Router } from '@angular/router';
import { TablePageEvent } from 'primeng/table';

export const CATALOG_LIST_DEFAULT_ROWS = 25;
export const CATALOG_LIST_ROWS_OPTIONS = [25, 50, 100];

export interface CatalogListState {
  searchTerm: string;
  first: number;
  rows: number;
}

export function readListStateFromRoute(
  route: ActivatedRoute,
  defaultRows = CATALOG_LIST_DEFAULT_ROWS,
): CatalogListState {
  const params = route.snapshot.queryParamMap;
  const searchTerm = params.get('q') ?? '';
  const rowsRaw = Number(params.get('rows'));
  const rows = CATALOG_LIST_ROWS_OPTIONS.includes(rowsRaw) ? rowsRaw : defaultRows;
  const pageRaw = Number(params.get('page'));
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;
  return {
    searchTerm,
    first: (page - 1) * rows,
    rows,
  };
}

export function buildListQueryParams(state: CatalogListState): Record<string, string | number | null> {
  const page = Math.floor(state.first / state.rows) + 1;
  return {
    q: state.searchTerm.trim() || null,
    page: page > 1 ? page : null,
    rows: state.rows !== CATALOG_LIST_DEFAULT_ROWS ? state.rows : null,
  };
}

export function syncListStateToUrl(
  router: Router,
  route: ActivatedRoute,
  state: CatalogListState,
): void {
  void router.navigate([], {
    relativeTo: route,
    queryParams: buildListQueryParams(state),
    queryParamsHandling: 'merge',
    replaceUrl: true,
  });
}

/** Left click, Ctrl/Cmd+click o clic central (rueda) → navegación normal o nueva pestaña. */
export function handleCatalogRowNav(
  event: MouseEvent,
  router: Router,
  commands: unknown[],
): boolean {
  if (event.defaultPrevented) return false;

  const target = event.target as HTMLElement;
  if (target.closest('button, a, input, textarea, select, .p-checkbox, .p-button, [data-row-action]')) {
    return false;
  }

  const openInNewTab = event.button === 1 || event.ctrlKey || event.metaKey;
  if (openInNewTab) {
    event.preventDefault();
    event.stopPropagation();
    const url = router.serializeUrl(router.createUrlTree(commands));
    window.open(url, '_blank');
    return true;
  }

  if (event.button !== 0) return false;

  event.preventDefault();
  void router.navigate(commands);
  return true;
}

export function onCatalogTablePage(
  event: TablePageEvent,
  state: CatalogListState,
  router: Router,
  route: ActivatedRoute,
): CatalogListState {
  const next: CatalogListState = {
    ...state,
    first: event.first ?? 0,
    rows: event.rows ?? state.rows,
  };
  syncListStateToUrl(router, route, next);
  return next;
}

export function onCatalogSearchChange(
  searchTerm: string,
  state: CatalogListState,
  router: Router,
  route: ActivatedRoute,
): CatalogListState {
  const next: CatalogListState = {
    ...state,
    searchTerm,
    first: 0,
  };
  syncListStateToUrl(router, route, next);
  return next;
}

/** Si el filtro reduce resultados, evita quedar en una página vacía. */
export function clampCatalogListFirst(first: number, totalItems: number, rows: number): number {
  if (totalItems === 0) return 0;
  const maxFirst = Math.max(0, Math.ceil(totalItems / rows) - 1) * rows;
  return Math.min(first, maxFirst);
}

export function normalizeListStateAfterLoad(
  state: CatalogListState,
  totalItems: number,
  router: Router,
  route: ActivatedRoute,
): CatalogListState {
  const first = clampCatalogListFirst(state.first, totalItems, state.rows);
  if (first === state.first) return state;
  const next = { ...state, first };
  syncListStateToUrl(router, route, next);
  return next;
}
