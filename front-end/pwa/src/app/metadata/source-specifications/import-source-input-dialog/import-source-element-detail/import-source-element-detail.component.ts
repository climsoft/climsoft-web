import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ElementDefinition } from '../../models/import-source-tabular-params.model';
import { IdMapping } from '../../id-mapping-table/id-mapping-table.component';

type ElementMode = 'noElement' | 'singleColumn' | 'multipleColumns';

// Inclusion-control rule: this step uses a radio because each branch has its own
// sub-config (default element id vs single column vs wide multiple columns).
// Steps whose "off" state literally means nothing use a checkbox instead.
@Component({
  selector: 'app-import-source-element-detail',
  templateUrl: './import-source-element-detail.component.html',
  styleUrls: ['./import-source-element-detail.component.scss']
})
export class ImportSourceElementDetailComponent {
  @Input() public elementDefinition!: ElementDefinition;
  @Output() public elementDefinitionChange = new EventEmitter<ElementDefinition>();

  protected getMode(): ElementMode | null {
    if (this.elementDefinition.noElement) return 'noElement';
    if (this.elementDefinition.singleColumn) return 'singleColumn';
    if (this.elementDefinition.multipleColumns) return 'multipleColumns';
    return null;
  }

  protected onModeSelection(mode: string): void {
    this.elementDefinition.noElement = undefined;
    this.elementDefinition.singleColumn = undefined;
    this.elementDefinition.multipleColumns = undefined;

    if (mode === 'No Element Column') {
      this.elementDefinition.noElement = { databaseId: 0 };
    } else if (mode === 'In Single Column') {
      this.elementDefinition.singleColumn = { columnPosition: 0 };
    } else if (mode === 'In Multiple Columns (wide)') {
      this.elementDefinition.multipleColumns = { columnsMapping: [] };
    }
    this.elementDefinitionChange.emit(this.elementDefinition);
  }

  // ─── Single column: elements to fetch ──────────────────────────────────

  protected onFetchElementsChange(fetch: boolean): void {
    if (!this.elementDefinition.singleColumn) return;
    this.elementDefinition.singleColumn.elementsToFetch = fetch ? [] : undefined;
    this.elementDefinitionChange.emit(this.elementDefinition);
  }

  protected onElementsToFetchChange(mappings: IdMapping[]): void {
    if (!this.elementDefinition.singleColumn) return;
    this.elementDefinition.singleColumn.elementsToFetch = mappings.map(m => ({
      sourceId: m.sourceId,
      databaseId: Number(m.databaseId),
    }));
    this.elementDefinitionChange.emit(this.elementDefinition);
  }

  // ─── Multiple columns mapping (wide pivot) ─────────────────────────────

  protected onAddColumnMapping(): void {
    this.elementDefinition.multipleColumns?.columnsMapping.push({ columnPosition: 0, databaseId: 0 });
    this.elementDefinitionChange.emit(this.elementDefinition);
  }

  protected onRemoveColumnMapping(index: number): void {
    this.elementDefinition.multipleColumns?.columnsMapping.splice(index, 1);
    this.elementDefinitionChange.emit(this.elementDefinition);
  }

  protected onColumnMappingChange(): void {
    this.elementDefinitionChange.emit(this.elementDefinition);
  }
}
