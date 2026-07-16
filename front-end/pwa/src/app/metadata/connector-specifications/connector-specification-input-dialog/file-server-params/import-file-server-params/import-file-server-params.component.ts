import { Component, Input } from '@angular/core';
import { SourceTypeEnum } from 'src/app/metadata/source-specifications/models/source-type.enum';
import { ImportFileServerParametersModel } from '../../../models/create-connector-specification.model';

@Component({
  selector: 'app-import-file-server-params',
  templateUrl: './import-file-server-params.component.html',
  styleUrls: ['./import-file-server-params.component.scss']
})
export class ImportFileServerParamsComponent {

  @Input()
  public importFileServerParameters!: ImportFileServerParametersModel;

  protected importSourceTypeEnum: SourceTypeEnum = SourceTypeEnum.IMPORT;

  protected onAddSpecification(): void {
    if (!this.importFileServerParameters.specifications) {
      this.importFileServerParameters.specifications = [];
    }
    this.importFileServerParameters.specifications.push({
      filePattern: '',
      specificationId: 0,
      stationId: null
    });
  }

  protected onRemoveSpecification(index: number): void {
    this.importFileServerParameters.specifications.splice(index, 1);
  }

  protected getStationId(index: number): string | null {
    const stationId = this.importFileServerParameters.specifications[index].stationId;
    return stationId ?? null;
  }

  protected onStationIdChange(index: number, stationId: string): void {
    this.importFileServerParameters.specifications[index].stationId = stationId || null;
  }

  protected onSpecificationIdChange(index: number, specificationId: number | null): void {
    this.importFileServerParameters.specifications[index].specificationId = specificationId ?? 0;
  }

  /**
   * Called by the parent dialog at submit time. Returns an error message
   * if any spec's `filePattern` targets a subdirectory (contains "/")
   * while `recursive` is off — that combination silently matches nothing
   * at runtime, so we catch it here at authoring time.
   */
  public validate(): string | null {
    const specs = this.importFileServerParameters?.specifications;
    if (!specs || specs.length === 0) return null;
    if (this.importFileServerParameters.recursive) return null;

    const offending = specs.find(s => s.filePattern && s.filePattern.includes('/'));
    if (offending) {
      return `Pattern "${offending.filePattern}" targets a subdirectory but "Recursive" is off. Enable Recursive or drop the "/" from the pattern.`;
    }
    return null;
  }
}
