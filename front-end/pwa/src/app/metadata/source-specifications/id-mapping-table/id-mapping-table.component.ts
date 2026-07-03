import { Component, EventEmitter, Input, Output } from '@angular/core';

/**
 * Selector type for the database-id column. Determines which selector control is rendered
 * and whether `databaseId` is treated as `string` (stations) or `number` (elements, flags).
 */
export type IdMappingSelectorType = 'station' | 'element' | 'flag';

/**
 * A row in the source-id → database-id mapping table. `databaseId` is `string` for stations
 * (because station IDs are textual codes) and `number` for elements and flags.
 */
export interface IdMapping {
  sourceId: string;
  databaseId: string | number;
}

/**
 * Generic mapping-table control used by station, element, and flag detail panels.
 * Consolidates the three near-duplicate implementations into a single source of truth
 * with a uniform "Add Mapping" / "Trash" UX.
 *
 * Parent provides:
 *   - `selectorType`: 'station' | 'element' | 'flag' — picks the right selector for the database-id column
 *   - `defaultDatabaseId`: seed value for new rows (string for stations; number for elements/flags)
 *   - `mappings`: the array to display and mutate; mutations are emitted via `mappingsChange`
 */
@Component({
  selector: 'app-id-mapping-table',
  templateUrl: './id-mapping-table.component.html',
  styleUrls: ['./id-mapping-table.component.scss']
})
export class IdMappingTableComponent {
  @Input() public selectorType!: IdMappingSelectorType;
  @Input() public mappings: IdMapping[] = [];
  @Input() public defaultDatabaseId!: string | number;
  @Input() public sourceLabel: string = 'Source ID';
  @Input() public databaseLabel: string = 'Database ID';

  @Output() public mappingsChange = new EventEmitter<IdMapping[]>();

  protected onAdd(): void {
    this.mappings.push({ sourceId: '', databaseId: this.defaultDatabaseId });
    this.mappingsChange.emit(this.mappings);
  }

  protected onRemove(index: number): void {
    this.mappings.splice(index, 1);
    this.mappingsChange.emit(this.mappings);
  }

  protected onSourceIdChange(): void {
    this.mappingsChange.emit(this.mappings);
  }

  protected onDatabaseIdChange(index: number, value: string | number | null): void {
    if (value === null) return;
    this.mappings[index].databaseId = value;
    this.mappingsChange.emit(this.mappings);
  }
}
