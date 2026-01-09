import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { SourceTypeEnum } from 'src/app/metadata/source-specifications/models/source-type.enum';
import { FileServerParametersModel } from '../../models/create-connector-specification.model';

/**
 * View model for internal UI state management of FTP specifications.
 * Allows handling of partially filled rows before they are committed to ftpMetadata.
 */
interface ViewModel {
  filePattern: string;
  specificationId: number | null;
  stationId: string | null;
}

/**
 * Component for managing FTP/SFTP/FTPS connector parameters input.
 * Handles dynamic addition/removal of file specifications with real-time validation.
 *
 * Features:
 * - Dynamic row management (auto-adds new row when all filled)
 * - Real-time synchronization with parent ftpMetadata
 * - Validates required fields (filePattern, specificationId)
 * - Prevents removal of empty or last remaining row
 */
@Component({
  selector: 'app-file-server-parameters-input',
  templateUrl: './file-server-parameters-input.component.html',
  styleUrls: ['./file-server-parameters-input.component.scss']
})
export class FileServerParametersInputComponent implements OnChanges {

  /** FTP metadata model bound from parent component */
  @Input() public ftpMetadata!: FileServerParametersModel;

  /** Event emitted when validation errors occur */
  @Output() public validationError = new EventEmitter<string>();

  /** Source type filter for import source selector */
  protected importSourceTypeEnum: SourceTypeEnum = SourceTypeEnum.IMPORT;

  /** Internal array for managing specification rows in the UI */
  protected ftpSpecifications: ViewModel[] = [];

  protected newPassword: string = '';
  protected confirmPassword: string = '';
  protected passwordErrormessage: string = '';

  constructor() {
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.ftpMetadata) {
      this.newPassword = this.ftpMetadata.password;
      this.confirmPassword = this.ftpMetadata.password;
      this.ftpSpecifications = [];
      for (const spec of this.ftpMetadata.specifications) {
        this.ftpSpecifications.push({ filePattern: spec.filePattern, specificationId: spec.specificationId, stationId: spec.stationId ? spec.stationId : null });
      }

      // always initialise the array with 2 empty specification rows.
      for (let i = 1; i <= 2; i++) {
        this.ftpSpecifications.push({ filePattern: '', specificationId: null, stationId: null });
      }
    }
  }

  /**
   * Handles password change validation.
   * Validates that both password fields are filled and match.
   * Emits validation errors to parent component for display.
   */
  protected onPasswordChange(): void {
    this.passwordErrormessage = '';
    this.ftpMetadata.password = ''; // Reset passowrd

    if (this.newPassword === '') {
      this.passwordErrormessage = 'Empty passwords not allowed';
    } else if (this.confirmPassword === '') {
      this.passwordErrormessage = 'Password NOT confirmed';
    } else if (this.newPassword !== this.confirmPassword) {
      this.passwordErrormessage = 'Passwords DO NOT match';
    }

    if (this.passwordErrormessage === '') {
      // Passwords match - update the metadata
      this.ftpMetadata.password = this.newPassword;
    }

    this.validationError.emit(this.passwordErrormessage);
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
   * @param importDBSource - The selected source specification ID
   * @param index - Index of the specification row being updated
   */
  protected onImportDBSourceInput(importDBSource: number | null, index: number): void {
    this.ftpSpecifications[index].specificationId = importDBSource;
    this.checkAndAddNewSpecification();
  }

  /**
   * Handles station selection changes.
   * Updates the stationId at the given index (optional field).
   *
   * @param stationId - The selected station ID
   * @param index - Index of the specification row being updated
   */
  protected onStationInput(stationId: string | null, index: number): void {
    this.ftpSpecifications[index].stationId = stationId;
    this.checkAndAddNewSpecification();
  }

  /**
   * Checks if all specifications have both filePattern and specificationId filled.
   * If yes, adds a new empty specification row for user convenience.
   * Also synchronizes ftpMetadata.specifications with valid entries.
   *
   * This creates a spreadsheet-like UX where new rows appear automatically.
   */
  private checkAndAddNewSpecification(): void {
    this.updateFtpMetadataSpecifications();

    const allFilled = this.ftpSpecifications.every(
      spec => spec.filePattern && spec.filePattern.trim() !== '' && spec.specificationId !== null
    );

    if (allFilled) {
      this.ftpSpecifications.push({ filePattern: '', specificationId: null, stationId: null });
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
    const isFilled = spec.filePattern && spec.filePattern.trim() !== '' && spec.specificationId !== null;

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
    this.ftpMetadata.specifications = [];

    for (const spec of this.ftpSpecifications) {
      if (spec.filePattern && spec.filePattern.trim() !== '' && spec.specificationId !== null) {
        this.ftpMetadata.specifications.push({
          filePattern: spec.filePattern,
          specificationId: spec.specificationId,
          stationId: spec.stationId ? spec.stationId : undefined
        });
      }
    }
  }

}
