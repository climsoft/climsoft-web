import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FieldMappingModel } from '../../../models/metadata-import-preview.model';

@Component({
  selector: 'app-station-import-focus-detail',
  templateUrl: './station-import-focus-detail.component.html',
  styleUrls: ['./station-import-focus-detail.component.scss']
})
export class StationImportFocusDetailComponent {
  @Input() public obsFocus: FieldMappingModel | undefined;
  @Output() public obsFocusChange = new EventEmitter<FieldMappingModel | undefined>();

  protected onStatusSelection(selection: string): void {
    if (selection === 'Includes Obs Focus') {
      this.obsFocus = { columnPosition: undefined };
    } else {
      this.obsFocus = { defaultValue: '' };
    }
    this.obsFocusChange.emit(this.obsFocus);
  }

  protected get isIncludes(): boolean {
    return this.obsFocus !== undefined && this.obsFocus.defaultValue === undefined;
  }

  protected get isNotIncludes(): boolean {
    return this.obsFocus !== undefined && this.obsFocus.defaultValue !== undefined;
  }

  protected onColumnPositionChange(value: number | null): void {
    if (this.obsFocus) {
      this.obsFocus.columnPosition = value ?? undefined;
      this.obsFocusChange.emit(this.obsFocus);
    }
  }

  protected onFetchSpecificChange(fetch: boolean): void {
    if (this.obsFocus) {
      this.obsFocus.valueMappings = fetch ? [] : undefined;
      this.obsFocusChange.emit(this.obsFocus);
    }
  }

  protected onAddMapping(): void {
    this.obsFocus?.valueMappings?.push({ sourceId: '', databaseId: '' });
  }

  protected onRemoveMapping(index: number): void {
    this.obsFocus?.valueMappings?.splice(index, 1);
    this.obsFocusChange.emit(this.obsFocus);
  }

  protected onDefaultValueChange(value: number | undefined): void {
    if (this.obsFocus) {
      this.obsFocus.defaultValue = value?.toString() || '';
      this.obsFocusChange.emit(this.obsFocus);
    }
  }
}
