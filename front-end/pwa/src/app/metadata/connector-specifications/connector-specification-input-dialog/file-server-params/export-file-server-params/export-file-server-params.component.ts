import { Component, Input } from '@angular/core';
import { ExportFileServerParametersModel } from '../../../models/create-connector-specification.model';

@Component({
  selector: 'app-export-file-server-params',
  templateUrl: './export-file-server-params.component.html',
  styleUrls: ['./export-file-server-params.component.scss']
})
export class ExportFileServerParamsComponent {

  @Input()
  public exportFileServerParameters!: ExportFileServerParametersModel;

  protected onAddSpecification(): void {
    if (!this.exportFileServerParameters.specifications) {
      this.exportFileServerParameters.specifications = [];
    }
    this.exportFileServerParameters.specifications.push({
      filePattern: 'yyyymmddhhmmss',
      specificationId: 0
    });
  }

  protected onRemoveSpecification(index: number): void {
    this.exportFileServerParameters.specifications.splice(index, 1);
  }

  protected onSpecificationIdChange(index: number, specificationId: number | null): void {
    this.exportFileServerParameters.specifications[index].specificationId = specificationId ?? 0;
  }
}
