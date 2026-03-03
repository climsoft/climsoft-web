import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ElementColumnMappingModel } from '../../../models/metadata-import-preview.model';

@Component({
  selector: 'app-element-import-basic-detail',
  templateUrl: './element-import-basic-detail.component.html',
  styleUrls: ['./element-import-basic-detail.component.scss']
})
export class ElementImportBasicDetailComponent {
  @Input() public mapping!: ElementColumnMappingModel;
  @Output() public mappingChange = new EventEmitter<ElementColumnMappingModel>();

  protected onDescriptionChange(value: number | null): void {
    this.mapping.descriptionColumnPosition = value ?? undefined;
    this.mappingChange.emit(this.mapping);
  }

  protected onUnitsChange(value: number | null): void {
    this.mapping.unitsColumnPosition = value ?? undefined;
    this.mappingChange.emit(this.mapping);
  }
}
