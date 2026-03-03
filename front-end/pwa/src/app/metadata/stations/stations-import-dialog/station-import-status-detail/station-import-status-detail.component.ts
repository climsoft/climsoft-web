import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FieldMappingModel } from '../../../models/metadata-import-preview.model';

@Component({
  selector: 'app-station-import-status-detail',
  templateUrl: './station-import-status-detail.component.html',
  styleUrls: ['./station-import-status-detail.component.scss']
})
export class StationImportStatusDetailComponent {
  @Input() public status: FieldMappingModel | undefined;
  @Output() public statusChange = new EventEmitter<FieldMappingModel | undefined>();

  protected onStatusSelection(selection: string): void {
    if (selection === 'Includes Status') {
      this.status = { columnPosition: undefined };
    } else {
      this.status = { defaultValue: '' };
    }
    this.statusChange.emit(this.status);
  }

  protected get isIncludes(): boolean {
    return this.status !== undefined && this.status.defaultValue === undefined;
  }

  protected get isNotIncludes(): boolean {
    return this.status !== undefined && this.status.defaultValue !== undefined;
  }

  protected onColumnPositionChange(value: number | null): void {
    if (this.status) {
      this.status.columnPosition = value ?? undefined;
      this.statusChange.emit(this.status);
    }
  }

  protected onFetchSpecificChange(fetch: boolean): void {
    if (this.status) {
      this.status.valueMappings = fetch ? [] : undefined;
      this.statusChange.emit(this.status);
    }
  }

  protected onAddMapping(): void {
    this.status?.valueMappings?.push({ sourceId: '', databaseId: '' });
  }

  protected onRemoveMapping(index: number): void {
    this.status?.valueMappings?.splice(index, 1);
    this.statusChange.emit(this.status);
  }

  protected onDefaultValueChange(value: string | undefined): void {
    if (this.status) {
      this.status.defaultValue = value || '';
      this.statusChange.emit(this.status);
    }
  }
}
