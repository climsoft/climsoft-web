import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { SourceTypeEnum } from 'src/app/metadata/source-specifications/models/source-type.enum';
import { ExportFileServerParametersModel } from '../../../models/create-connector-specification.model';

/**
 * View model for internal UI state management of FTP specifications.
 * Allows handling of partially filled rows before they are committed to ftpMetadata.
 */
interface ViewModel {
  filePattern: string ;
  specificationId: number;
}

@Component({
  selector: 'app-export-file-server-params',
  templateUrl: './export-file-server-params.component.html',
  styleUrls: ['./export-file-server-params.component.scss']
})
export class ExportFileServerParamsComponent implements OnChanges {

  /** Export server parameters model bound from parent component */
  @Input()
  public exportFileServerParameters!: ExportFileServerParametersModel;

  /** Event emitted when validation errors occur */
  @Output()
  public validationError = new EventEmitter<string>();

  /** Source type filter for import source selector */
  protected importSourceTypeEnum: SourceTypeEnum = SourceTypeEnum.IMPORT;

  /** Internal array for managing specification rows in the UI */
  protected ftpSpecifications: ViewModel[] = [];


  constructor() {
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['exportFileServerParameters'] && this.exportFileServerParameters) {

      this.ftpSpecifications = [];
      for (const spec of this.exportFileServerParameters.specifications) {
        this.ftpSpecifications.push({ filePattern: spec.filePattern, specificationId: spec.specificationId });
      }

      // always initialise the array with 2 empty specification rows.
      for (let i = 1; i <= 2; i++) {
        this.ftpSpecifications.push({ filePattern: '', specificationId: 0 });
      }
    }
  }


  /**
   * Handles file pattern input changes.
   * Updates the specification at the given index and triggers validation.
   *
   * @param filePattern - The file pattern value (e.g., "*.csv", "data_*.txt")
   * @param index - Index of the specification row being updated
   */
  protected onFileSourcePatternInput(filePattern: string, index: number): void {
    this.ftpSpecifications[index].filePattern = filePattern;
    this.checkAndAddNewSpecification();
  }

  /**
   * Handles import database source selection changes.
   * Updates the specificationId at the given index and triggers validation.
   *
   * @param exportSpecificationId - The selected source specification ID
   * @param index - Index of the specification row being updated
   */
  protected onExportSpecificationInput(exportSpecificationId: number, index: number): void {
    this.ftpSpecifications[index].specificationId = exportSpecificationId;
    this.checkAndAddNewSpecification();
  }



  /**
   * Checks if all specifications have  specificationId filled.
   * If yes, adds a new empty specification row for user convenience.
   * Also synchronizes ftpMetadata.specifications with valid entries.
   *
   * This creates a spreadsheet-like UX where new rows appear automatically.
   */
  private checkAndAddNewSpecification(): void {
    this.updateFtpMetadataSpecifications();

    const allFilled = this.ftpSpecifications.every(
      spec => spec.filePattern && spec.filePattern.trim() && spec.specificationId
    );

    if (allFilled) {
      this.ftpSpecifications.push({ filePattern: 'yyyymmddhhmmss', specificationId: 0 });
    }
  }

  /**
   * Handles removal of a specification row.
   * Only allows removal if:
   * - More than 1 row exists (minimum enforcement)
   * - The row has both filePattern and specificationId filled
   *
   * Empty rows cannot be removed as they serve as input placeholders.
   *
   * @param index - Index of the specification row to remove
   */
  protected onRemoveSpecification(index: number): void {
    const spec = this.ftpSpecifications[index];
    const isFilled =  spec.filePattern && spec.filePattern.trim() && spec.specificationId ;

    if (this.ftpSpecifications.length > 1 && isFilled) {
      this.ftpSpecifications.splice(index, 1);
      this.updateFtpMetadataSpecifications();
    }
  }

  /**
   * Synchronizes ftpMetadata.specifications array with only fully filled specifications.
   * Filters out incomplete rows (missing filePattern or specificationId).
   *
   * This ensures the parent ftpMetadata always contains valid, complete specifications
   * ready for submission to the backend.
   */
  private updateFtpMetadataSpecifications(): void {
    this.exportFileServerParameters.specifications = [];

    for (const spec of this.ftpSpecifications) {
      if (spec.specificationId ) {
        this.exportFileServerParameters.specifications.push({
          filePattern: spec.filePattern  ? 'yyyymmddhhmmss'  : 'yyyymmddhhmmss',
          specificationId: spec.specificationId, 
        });
      }
    }
  }

}
