import { Component, EventEmitter, Input, Output } from '@angular/core';
import { StationColumnMappingModel } from '../../../models/metadata-import-preview.model';

@Component({
  selector: 'app-station-import-external-ids-detail',
  templateUrl: './station-import-external-ids-detail.component.html',
  styleUrls: ['./station-import-external-ids-detail.component.scss']
})
export class StationImportExternalIdsDetailComponent {
  @Input() public mapping!: StationColumnMappingModel;
  @Output() public mappingChange = new EventEmitter<StationColumnMappingModel>();

  protected onWmoIdChange(value: number | null): void {
    this.mapping.wmoIdColumnPosition = value ?? undefined;
    this.mappingChange.emit(this.mapping);
  }

  protected onWigosIdChange(value: number | null): void {
    this.mapping.wigosIdColumnPosition = value ?? undefined;
    this.mappingChange.emit(this.mapping);
  }

  protected onIcaoIdChange(value: number | null): void {
    this.mapping.icaoIdColumnPosition = value ?? undefined;
    this.mappingChange.emit(this.mapping);
  }
}
