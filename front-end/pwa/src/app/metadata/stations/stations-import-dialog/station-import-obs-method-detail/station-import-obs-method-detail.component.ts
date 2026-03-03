import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FieldMappingModel, ValueMappingModel } from '../../../models/metadata-import-preview.model';

@Component({
  selector: 'app-station-import-obs-method-detail',
  templateUrl: './station-import-obs-method-detail.component.html',
  styleUrls: ['./station-import-obs-method-detail.component.scss']
})
export class StationImportObsMethodDetailComponent {
  @Input() public obsProcMethod: FieldMappingModel | undefined;
  @Output() public obsProcMethodChange = new EventEmitter<FieldMappingModel | undefined>();

  protected onStatusSelection(selection: string): void {
    if (selection === 'Includes Obs Method') {
      this.obsProcMethod = { columnPosition: undefined };
    } else {
      this.obsProcMethod = { defaultValue: '' };
    }
    this.obsProcMethodChange.emit(this.obsProcMethod);
  }

  protected get isIncludes(): boolean {
    return this.obsProcMethod !== undefined && this.obsProcMethod.defaultValue === undefined;
  }

  protected get isNotIncludes(): boolean {
    return this.obsProcMethod !== undefined && this.obsProcMethod.defaultValue !== undefined;
  }

  protected onColumnPositionChange(value: number | null): void {
    if (this.obsProcMethod) {
      this.obsProcMethod.columnPosition = value ?? undefined;
      this.obsProcMethodChange.emit(this.obsProcMethod);
    }
  }

  protected onFetchSpecificChange(fetch: boolean): void {
    if (this.obsProcMethod) {
      this.obsProcMethod.valueMappings = fetch ? [] : undefined;
      this.obsProcMethodChange.emit(this.obsProcMethod);
    }
  }

  protected onAddMapping(): void {
    this.obsProcMethod?.valueMappings?.push({ sourceId: '', databaseId: '' });
  }

  protected onRemoveMapping(index: number): void {
    this.obsProcMethod?.valueMappings?.splice(index, 1);
    this.obsProcMethodChange.emit(this.obsProcMethod);
  }

  protected onDefaultValueChange(value: string | null): void {
    if (this.obsProcMethod) {
      this.obsProcMethod.defaultValue = value || '';
      this.obsProcMethodChange.emit(this.obsProcMethod);
    }
  }
}
