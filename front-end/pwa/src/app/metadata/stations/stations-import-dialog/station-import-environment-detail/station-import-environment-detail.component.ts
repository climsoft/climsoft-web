import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FieldMappingModel } from '../../../models/metadata-import-preview.model';

@Component({
  selector: 'app-station-import-environment-detail',
  templateUrl: './station-import-environment-detail.component.html',
  styleUrls: ['./station-import-environment-detail.component.scss']
})
export class StationImportEnvironmentDetailComponent {
  @Input() public obsEnvironment: FieldMappingModel | undefined;
  @Output() public obsEnvironmentChange = new EventEmitter<FieldMappingModel | undefined>();

  protected onStatusSelection(selection: string): void {
    if (selection === 'Includes Environment') {
      this.obsEnvironment = { columnPosition: undefined };
    } else {
      this.obsEnvironment = { defaultValue: '' };
    }
    this.obsEnvironmentChange.emit(this.obsEnvironment);
  }

  protected get isIncludes(): boolean {
    return this.obsEnvironment !== undefined && this.obsEnvironment.defaultValue === undefined;
  }

  protected get isNotIncludes(): boolean {
    return this.obsEnvironment !== undefined && this.obsEnvironment.defaultValue !== undefined;
  }

  protected onColumnPositionChange(value: number | null): void {
    if (this.obsEnvironment) {
      this.obsEnvironment.columnPosition = value ?? undefined;
      this.obsEnvironmentChange.emit(this.obsEnvironment);
    }
  }

  protected onFetchSpecificChange(fetch: boolean): void {
    if (this.obsEnvironment) {
      this.obsEnvironment.valueMappings = fetch ? [] : undefined;
      this.obsEnvironmentChange.emit(this.obsEnvironment);
    }
  }

  protected onAddMapping(): void {
    this.obsEnvironment?.valueMappings?.push({ sourceId: '', databaseId: '' });
  }

  protected onRemoveMapping(index: number): void {
    this.obsEnvironment?.valueMappings?.splice(index, 1);
    this.obsEnvironmentChange.emit(this.obsEnvironment);
  }

  protected onDefaultValueChange(value: number | undefined): void {
    if (this.obsEnvironment) {
      this.obsEnvironment.defaultValue = value?.toString() || '';
      this.obsEnvironmentChange.emit(this.obsEnvironment);
    }
  }
}
