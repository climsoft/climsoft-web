import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { ObservationEntry } from '../../../models/observation-entry.model';
import { PagingParameters } from 'src/app/shared/controls/page-input/paging-parameters';

/**
 * ============================================================================
 * Pivot Data Viewer
 * ============================================================================
 *
 * Renders a list of `ObservationEntry` items as a "pivoted" (cross-tab) table:
 * the user picks ONE dimension to spread across the columns; every other
 * dimension is collapsed onto the rows.
 *
 * Background — long form vs wide form:
 *
 *   Source data is "long form": one row per observation, all dimensions
 *   side by side.
 *
 *      stationId | elementId | level | datetime | interval | source | value
 *      ---------------------------------------------------------------------
 *      ABC       | TEMP      | 0     | 2026-... | 60       | A      |  21.4
 *      ABC       | RAIN      | 0     | 2026-... | 60       | A      |   0.0
 *      DEF       | TEMP      | 0     | 2026-... | 60       | A      |  19.7
 *
 *   "Pivoting by element" rotates the element values into columns:
 *
 *      stationId | level | datetime | interval | source | TEMP  | RAIN
 *      -----------------------------------------------------------------
 *      ABC       | 0     | 2026-... | 60       | A      | 21.4  | 0.0
 *      DEF       | 0     | 2026-... | 60       | A      | 19.7  | (empty)
 *
 *   Pivoting by station, level, source, or datetime works the same way —
 *   whichever dimension you pivot on becomes the column axis, and every
 *   other dimension becomes part of the row identity.
 *
 * Why this is useful:
 *
 *   - Pivot by ELEMENT  → "what did this station report at this hour?"
 *                         (parameters side by side; classic synoptic form)
 *   - Pivot by STATION  → "what did every station report for this element?"
 *                         (cross-station comparison)
 *   - Pivot by SOURCE   → "is this same observation present from multiple
 *                         sources?" (visual source-conflict view)
 *   - Pivot by LEVEL    → "vertical profile" — soil temperature at multiple
 *                         depths, upper-air sondes, etc.
 *   - Pivot by DATETIME → time-series cross-tab — one column per timestamp.
 *
 * IMPORTANT design notes:
 *
 *   1. The cells in the pivot table render the SAME `<app-value-flag-input>`
 *      bound to the SAME `ObservationEntry` reference as the stacked viewer.
 *      Edits made here mutate the same array element the parent owns, so
 *      the parent's change tracking and submit logic don't need to know
 *      which view mode is active.
 *
 *   2. `interval` is intentionally NOT in the set of pivot-able dimensions.
 *      It is always a row dimension, because pivoting by interval would mix
 *      sub-hourly and daily observations side by side, which is rarely
 *      useful and would multiply the column count unhelpfully. If a future
 *      requirement justifies it, simply add 'interval' to the union, the
 *      DIMENSIONS map, and ROW_DIMENSION_ORDER — the rest is generic.
 *
 *   3. Adding a new pivot dimension is a localized change: extend the
 *      `PivotDimension` union, add an entry to `DIMENSIONS`, and add it to
 *      `ROW_DIMENSION_ORDER` at the position you want it to appear in the
 *      leading row metadata columns. Nothing in `buildPivot()` needs to
 *      change.
 * ============================================================================
 */

/**
 * Each value of this union represents a dimension of an observation that the
 * user can choose to pivot on. The same set is also used as the set of row
 * dimensions (whichever isn't being pivoted falls onto the rows).
 */
export type PivotDimension = 'element' | 'station' | 'level' | 'source' | 'datetime';

/**
 * Per-dimension configuration that tells `buildPivot()` how to extract and
 * render values for one dimension. There is exactly one entry per
 * `PivotDimension` member in the `DIMENSIONS` map below.
 */
interface PivotDimensionConfig {
  /**
   * Header text displayed in the leading row-metadata column when this
   * dimension is on the row axis (i.e. when it is NOT the pivot dimension).
   * Example: "Station", "Element", "Date Time".
   */
  rowHeader: string;

  /**
   * Returns a value that uniquely identifies this dimension on the given
   * entry. Used both for grouping rows and for grouping columns:
   *
   *   - When this dimension is part of the row axis, its key contributes
   *     to the composite row identity.
   *   - When this dimension IS the pivot, its key identifies which column
   *     the entry belongs in.
   *
   * Should be cheap and stable. The result is coerced to a string before
   * being used as a Map key.
   */
  getKey: (entry: ObservationEntry) => string | number;

  /**
   * Returns a sortable value used to order COLUMN headers when this
   * dimension is the pivot. Numeric values sort numerically, strings sort
   * lexicographically. For datetime, the raw ISO string is used because
   * ISO 8601 ordering equals chronological ordering.
   *
   * (Sorting only matters for the column axis — rows arrive in the order
   * the backend returned them and that order is preserved.)
   */
  getSortKey: (entry: ObservationEntry) => string | number;

  /**
   * Returns the human-readable label rendered to the user for this
   * dimension's value on the given entry. Used in two places:
   *
   *   - As the COLUMN header label, when this dimension is the pivot.
   *   - As the row metadata cell text, when this dimension is on the rows.
   *
   * Examples: "10 - PRECIP", "ABC - Nairobi Airport", "2026-04-10 06:00".
   */
  getDisplay: (entry: ObservationEntry) => string;
}

/**
 * Single source of truth for "what dimensions exist and how to render each
 * one". The TypeScript `Record<PivotDimension, ...>` constraint ensures every
 * member of the union has exactly one config entry — adding a new dimension
 * to the union without adding a config here is a compile error.
 *
 * Notice that `getKey` and `getSortKey` may differ:
 *
 *   - For `element`, both are the numeric `elementId` (sorts numerically).
 *   - For `station`, the key is `stationId` (a string ID like "ABC") — same
 *     value used for both keying and sorting, giving alphabetical column
 *     order.
 *   - For `datetime`, both are the raw ISO string, which sorts chronologically.
 *
 * Splitting key vs sort-key gives us the freedom to (later) sort columns by
 * a friendlier label without breaking the cell-grouping identity.
 */
const DIMENSIONS: Record<PivotDimension, PivotDimensionConfig> = {
  element: {
    rowHeader: 'Element',
    getKey: e => e.observation.elementId,
    getSortKey: e => e.observation.elementId,
    getDisplay: e => `${e.observation.elementId} - ${e.elementAbbrv ?? ''}`,
  },
  station: {
    rowHeader: 'Station',
    getKey: e => e.observation.stationId,
    getSortKey: e => e.observation.stationId,
    getDisplay: e => `${e.observation.stationId} - ${e.stationName ?? ''}`,
  },
  level: {
    rowHeader: 'Level',
    getKey: e => e.observation.level,
    getSortKey: e => e.observation.level,
    getDisplay: e => `${e.observation.level}`,
  },
  source: {
    rowHeader: 'Source',
    getKey: e => e.observation.sourceId,
    getSortKey: e => e.observation.sourceId,
    getDisplay: e => `${e.sourceName ?? e.observation.sourceId}`,
  },
  datetime: {
    rowHeader: 'Date Time',
    // Sort and key by the raw ISO datetime so ordering is chronological
    // regardless of how the value is formatted for display.
    getKey: e => e.observation.datetime,
    getSortKey: e => e.observation.datetime,
    getDisplay: e => e.formattedDatetime ?? e.observation.datetime,
  },
};

/**
 * Order in which row metadata columns appear in the rendered table, AFTER
 * removing whichever dimension is currently being pivoted on.
 *
 * Example: if the user pivots by `element`, the leading columns become:
 *   Station | Level | Source | Date Time
 *
 * The "Interval" column is added separately by the template (it is always a
 * row dimension and is intentionally not pivot-able — see file header).
 */
const ROW_DIMENSION_ORDER: PivotDimension[] = ['station', 'element', 'level', 'source', 'datetime'];

/**
 * One column in the rendered pivot table. There is one `PivotColumn` per
 * distinct value of the pivot dimension found in the input entries.
 */
interface PivotColumn {
  /** Stringified pivot-dimension key. Used as the lookup key in `PivotRow.cells`. */
  key: string;
  /** Human-readable label rendered in the table header. */
  label: string;
  /** Value used to determine column order. Numeric or string. */
  sortKey: string | number;
}

/**
 * One row in the rendered pivot table. Multiple `ObservationEntry` items
 * can collapse into the same `PivotRow` — specifically, all entries that
 * share the same values for every NON-pivoted dimension end up in the same
 * row, with their pivot-dimension value deciding which cell they occupy.
 */
interface PivotRow {
  /**
   * Stable composite identifier of this row, derived from the row dimensions
   * (in `ROW_DIMENSION_ORDER` minus the pivot dimension) plus interval.
   * Used both for de-duplication during build and as Angular's `trackBy`.
   */
  rowKey: string;

  /**
   * Pre-resolved leading metadata cell text, in the same order as
   * `rowDimensions`. The template just iterates over this with `*ngFor` —
   * it doesn't need to know which dimensions are present.
   */
  leading: string[];

  /** Always-present interval column. Rendered after the leading dimensions. */
  intervalDisplay: string;

  /**
   * Map from `PivotColumn.key` to the observation entry that occupies the
   * (this row, that column) cell. Built once per pivot rebuild so per-cell
   * lookup is O(1) — no `Array.find` per cell during template rendering.
   *
   * If a row has no observation for some column, that column key is simply
   * absent from the map, and the template renders an empty cell.
   */
  cells: Map<string, ObservationEntry>;
}

let nextPivotViewerInstanceId = 0;

@Component({
  selector: 'app-pivot-data-viewer',
  templateUrl: './pivot-data-viewer.component.html',
  styleUrls: ['./pivot-data-viewer.component.scss']
})
export class PivotDataViewerComponent implements OnChanges {
  /** When false, the underlying `<app-value-flag-input>` is disabled. */
  @Input() public allowDataEdits: boolean = true;

  /**
   * The flat list of observations to render. Each item carries its own
   * editing state (`change`, `delete`) which is shared by reference with
   * the parent — edits made through this viewer mutate the parent's array.
   */
  @Input() public observationsEntries: ObservationEntry[] = [];

  /**
   * Which dimension to spread across the columns. Changing this triggers a
   * full pivot rebuild via `ngOnChanges`.
   */
  @Input() public pivotBy: PivotDimension = 'element';

  /** Used to compute the row number column. */
  @Input() public pageInputDefinition: PagingParameters = new PagingParameters();

  /**
   * Bubbled up from the value-flag input inside each cell so the parent can
   * recount pending changes. The emitted reference is the same
   * `ObservationEntry` instance that lives in `observationsEntries`.
   */
  @Output() public entryChanged = new EventEmitter<ObservationEntry>();

  /** Per-instance prefix so cell ids stay unique if multiple viewers coexist on the same page. */
  protected readonly instanceId: number = ++nextPivotViewerInstanceId;

  /** Pre-computed `(page - 1) * pageSize`; the template adds `rowIndex + 1`. */
  protected startingRowNumber: number = 0;

  /**
   * Row dimensions in display order — i.e. `ROW_DIMENSION_ORDER` with the
   * current `pivotBy` removed. Recomputed on every rebuild.
   */
  protected rowDimensions: PivotDimension[] = [];

  /**
   * Header labels for the leading row-metadata columns, parallel to
   * `rowDimensions`. Pre-resolved so the template doesn't need to look up
   * the DIMENSIONS map at render time.
   */
  protected rowDimensionHeaders: string[] = [];

  /** Sorted list of distinct pivot-dimension columns built from the input entries. */
  protected columns: PivotColumn[] = [];

  /** Final list of pivoted rows ready for the template to iterate. */
  protected rows: PivotRow[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    // Rebuild whenever the data OR the pivot dimension changes. Note: the
    // change is a full rebuild rather than an incremental update — input
    // sets are typically a single page (≤100 rows) so this is fast enough
    // and keeps the logic simple.
    if (changes['observationsEntries'] || changes['pivotBy']) {
      this.buildPivot();
    }
    if (changes['pageInputDefinition']) {
      this.startingRowNumber = (this.pageInputDefinition.page - 1) * this.pageInputDefinition.pageSize;
    }
  }

  /**
   * Core pivot algorithm. Walks the input entries once and produces:
   *
   *   - `rowDimensions` / `rowDimensionHeaders` — which dimensions are on the
   *     row axis (everything except the pivot dimension), in display order.
   *   - `columns` — distinct values of the pivot dimension, sorted.
   *   - `rows` — one entry per distinct combination of row dimensions, each
   *     with a `cells` map keyed by column key.
   *
   * Walk-through, in plain English:
   *
   *   1. For each input entry, compute its ROW key by concatenating the keys
   *      of every non-pivoted dimension (plus interval). Two entries with the
   *      same row key share a row.
   *
   *   2. For each input entry, compute its COLUMN key from the pivot
   *      dimension. The first time we see a given column key, we register a
   *      new `PivotColumn`. Subsequent entries with the same column key
   *      reuse it.
   *
   *   3. Place the entry in `row.cells.set(colKey, entry)`. If two entries
   *      collide on the same (row, column) cell — meaning the data has true
   *      duplicates on the chosen pivot — last write wins. Resolving such
   *      conflicts is the job of the source-check feature, not this view.
   *
   *   4. After the walk, sort the columns deterministically so the layout
   *      doesn't reshuffle when paging or when entries arrive in a
   *      different order.
   */
  private buildPivot(): void {
    // Get row dimensions excluding the pivotBy
    this.rowDimensions = ROW_DIMENSION_ORDER.filter(d => d !== this.pivotBy);
    this.rowDimensionHeaders = this.rowDimensions.map(d => DIMENSIONS[d].rowHeader);

    const pivotCfg: PivotDimensionConfig = DIMENSIONS[this.pivotBy];
    const rowsByKey: Map<string, PivotRow> = new Map<string, PivotRow>();
    const columnsByKey: Map<string, PivotColumn> = new Map<string, PivotColumn>();

    for (const entry of this.observationsEntries) {
      // Step 1: row key — concatenate the non-pivoted dimension keys plus
      // interval (which is always a row dimension and is not in the pivot set). 
      // The exact separator does not matter as long as it cannot appear inside any individual key.
      const rowDimKeys: string[] = this.rowDimensions.map(d => `${DIMENSIONS[d].getKey(entry)}`);
      const rowKey: string = `${rowDimKeys.join('|')}|${entry.observation.interval}`;

      // Find or create the row this entry belongs to.
      let row: PivotRow | undefined = rowsByKey.get(rowKey);
      if (!row) {
        row = {
          rowKey,
          leading: this.rowDimensions.map(d => DIMENSIONS[d].getDisplay(entry)),
          intervalDisplay: entry.intervalName ?? `${entry.observation.interval}`,
          cells: new Map<string, ObservationEntry>(),
        };
        rowsByKey.set(rowKey, row);
      }

      // Step 2: column key — register a new PivotColumn the first time we
      // see this pivot-dimension value, otherwise reuse the existing one.
      const colKey: string = `${pivotCfg.getKey(entry)}`;
      if (!columnsByKey.has(colKey)) {
        columnsByKey.set(colKey, {
          key: colKey,
          label: pivotCfg.getDisplay(entry),
          sortKey: pivotCfg.getSortKey(entry),
        });
      }

      // Step 3: place the entry in its (row, column) cell. If a previous
      // entry had already claimed this cell, it is overwritten — see the
      // doc comment above for the rationale.
      row.cells.set(colKey, entry);
    }

    // Step 4: stable, deterministic column order across pages and reloads.
    // Without this the columns would appear in whatever order they first
    // showed up in the input, which can change between pages.
    this.columns = Array.from(columnsByKey.values()).sort((a, b) => {
      if (a.sortKey < b.sortKey) return -1;
      if (a.sortKey > b.sortKey) return 1;
      return 0;
    });

    // Rows preserve the order they were inserted in (= the backend's order).
    this.rows = Array.from(rowsByKey.values());
  }

  /** Angular `trackBy` for the row `*ngFor`, so DOM nodes survive rebuilds. */
  protected trackByRowKey(_index: number, row: PivotRow): string {
    return row.rowKey;
  }

  /** Angular `trackBy` for the column `*ngFor`, so DOM nodes survive rebuilds. */
  protected trackByColumnKey(_index: number, column: PivotColumn): string {
    return column.key;
  }
}
