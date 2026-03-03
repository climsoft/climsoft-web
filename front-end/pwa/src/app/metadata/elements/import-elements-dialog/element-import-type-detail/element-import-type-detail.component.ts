import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FieldMappingModel } from '../../../models/metadata-import-preview.model';

@Component({
  selector: 'app-element-import-type-detail',
  templateUrl: './element-import-type-detail.component.html',
  styleUrls: ['./element-import-type-detail.component.scss']
})
export class ElementImportTypeDetailComponent {
  @Input() public elementType: FieldMappingModel | undefined;
  @Output() public elementTypeChange = new EventEmitter<FieldMappingModel | undefined>();

  protected onStatusSelection(selection: string): void {
    if (selection === 'Includes Element Type') {
      this.elementType = { columnPosition: undefined };
    } else {
      this.elementType = { defaultValue: '' };
    }
    this.elementTypeChange.emit(this.elementType);
  }

  protected get isIncludes(): boolean {
    return this.elementType !== undefined && this.elementType.defaultValue === undefined;
  }

  protected get isNotIncludes(): boolean {
    return this.elementType !== undefined && this.elementType.defaultValue !== undefined;
  }

  protected onColumnPositionChange(value: number | null): void {
    if (this.elementType) {
      this.elementType.columnPosition = value ?? undefined;
      this.elementTypeChange.emit(this.elementType);
    }
  }

  protected onFetchSpecificChange(fetch: boolean): void {
    if (this.elementType) {
      this.elementType.valueMappings = fetch ? [] : undefined;
      this.elementTypeChange.emit(this.elementType);
    }
  }

  protected onAddMapping(): void {
    this.elementType?.valueMappings?.push({ sourceId: '', databaseId: '' });
  }

  protected onRemoveMapping(index: number): void {
    this.elementType?.valueMappings?.splice(index, 1);
    this.elementTypeChange.emit(this.elementType);
  }

  protected onDefaultValueChange(value: number | undefined): void {
    if (this.elementType) {
      this.elementType.defaultValue = value !== undefined ? value.toString() : '';
      this.elementTypeChange.emit(this.elementType);
    }
  }
}
