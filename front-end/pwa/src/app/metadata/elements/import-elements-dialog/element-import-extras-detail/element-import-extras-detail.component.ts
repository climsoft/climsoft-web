import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ElementColumnMappingModel } from '../../../models/metadata-import-preview.model';

@Component({
  selector: 'app-element-import-extras-detail',
  templateUrl: './element-import-extras-detail.component.html',
  styleUrls: ['./element-import-extras-detail.component.scss']
})
export class ElementImportExtrasDetailComponent {
  @Input() public mapping!: ElementColumnMappingModel;
  @Output() public mappingChange = new EventEmitter<ElementColumnMappingModel>();

  protected onEntryScaleFactorChange(value: number | null): void {
    this.mapping.entryScaleFactorColumnPosition = value ?? undefined;
    this.mappingChange.emit(this.mapping);
  }

  protected onCommentChange(value: number | null): void {
    this.mapping.commentColumnPosition = value ?? undefined;
    this.mappingChange.emit(this.mapping);
  }
}
