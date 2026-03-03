import { Component, EventEmitter, Input, Output } from '@angular/core';
import { StationColumnMappingModel } from '../../../models/metadata-import-preview.model';

@Component({
  selector: 'app-station-import-basic-detail',
  templateUrl: './station-import-basic-detail.component.html',
  styleUrls: ['./station-import-basic-detail.component.scss']
})
export class StationImportBasicDetailComponent {
  @Input() public mapping!: StationColumnMappingModel;
  @Output() public mappingChange = new EventEmitter<StationColumnMappingModel>();

  @Input() public rawColumns: string[] = [];

  protected onDescriptionChange(value: number | null): void {
    this.mapping.descriptionColumnPosition = value ?? undefined;
    this.mappingChange.emit(this.mapping);
  }

  protected onLatitudeChange(value: number | null): void {
    this.mapping.latitudeColumnPosition = value ?? undefined;
    this.mappingChange.emit(this.mapping);
  }

  protected onLongitudeChange(value: number | null): void {
    this.mapping.longitudeColumnPosition = value ?? undefined;
    this.mappingChange.emit(this.mapping);
  }

  protected onElevationChange(value: number | null): void {
    this.mapping.elevationColumnPosition = value ?? undefined;
    this.mappingChange.emit(this.mapping);
  }
}
