import { Component, Input } from '@angular/core';
import {
  ExportFileServerParametersModel,
  ObservationWindowDateFieldEnum,
} from '../../../models/create-connector-specification.model';

interface DateFieldOption {
  id: ObservationWindowDateFieldEnum;
  label: string;
}

@Component({
  selector: 'app-export-file-server-params',
  templateUrl: './export-file-server-params.component.html',
  styleUrls: ['./export-file-server-params.component.scss']
})
export class ExportFileServerParamsComponent {

  @Input()
  public exportFileServerParameters!: ExportFileServerParametersModel;

  protected readonly dateFieldOptions: DateFieldOption[] = [
    { id: ObservationWindowDateFieldEnum.OBSERVATION, label: 'Observation date' },
    { id: ObservationWindowDateFieldEnum.ENTRY, label: 'Entry date' },
  ];

  protected get selectedDateFieldOption(): DateFieldOption | null {
    return this.dateFieldOptions.find(o => o.id === this.exportFileServerParameters.observationWindow.dateField) ?? null;
  }

  protected onDateFieldChange(option: DateFieldOption | null): void {
    if (!option) return;
    this.exportFileServerParameters.observationWindow.dateField = option.id;
  }

  protected dateFieldDisplay(option: DateFieldOption): string {
    return option.label;
  }

  protected onAddSpecification(): void {
    if (!this.exportFileServerParameters.specifications) {
      this.exportFileServerParameters.specifications = [];
    }
    this.exportFileServerParameters.specifications.push({
      specificationId: 0,
      stationId: '',
    });
  }

  protected onRemoveSpecification(index: number): void {
    this.exportFileServerParameters.specifications.splice(index, 1);
  }

  protected onSpecificationIdChange(index: number, specificationId: number | null): void {
    this.exportFileServerParameters.specifications[index].specificationId = specificationId ?? 0;
  }

  protected onStationIdChange(index: number, stationId: string | null): void {
    this.exportFileServerParameters.specifications[index].stationId = stationId ?? '';
  }
}
