import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { ConnectorTypeEnum, ExportFileServerParametersModel, FileServerParametersModel, FileServerProtocolEnum, ImportFileServerParametersModel } from '../../models/create-connector-specification.model';
import { ViewConnectorSpecificationModel } from '../../models/view-connector-specification.model';

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

  @Input()
  public connector!: ViewConnectorSpecificationModel;

  /** Event emitted when validation errors occur */
  @Output()
  public validationError = new EventEmitter<string>();

  protected ConnectorTypeEnum = ConnectorTypeEnum;
  protected newPassword: string = '';
  protected confirmPassword: string = '';
  protected passwordErrormessage: string = '';

  constructor() {
  }

  ngOnChanges(changes: SimpleChanges): void {

    if (changes['connector'] && this.connector) {
      this.newPassword = this.connector.parameters.password;
      this.confirmPassword = this.connector.parameters.password;
    }
  }

  protected get importFileServerParameters(): ImportFileServerParametersModel {
    return this.connector.parameters as ImportFileServerParametersModel;
  }

  protected get exportFileServerParameters(): ExportFileServerParametersModel {
    return this.connector.parameters as ExportFileServerParametersModel;
  }

  /**
   * Handles password change validation.
   * Validates that both password fields are filled and match.
   * Emits validation errors to parent component for display.
   */
  protected onPasswordChange(): void {
    this.passwordErrormessage = '';
    this.connector.parameters.password = ''; // Reset password

    if (this.newPassword === '') {
      this.passwordErrormessage = 'Empty passwords not allowed';
    } else if (this.confirmPassword === '') {
      this.passwordErrormessage = 'Password NOT confirmed';
    } else if (this.newPassword !== this.confirmPassword) {
      this.passwordErrormessage = 'Passwords DO NOT match';
    }

    if (this.passwordErrormessage === '') {
      // Passwords match - update the metadata
      this.connector.parameters.password = this.newPassword;
    }

    this.validationError.emit(this.passwordErrormessage);
  }

  protected onFileProtocolSelection(protocol: FileServerProtocolEnum): void {
    this.connector.parameters.protocol = protocol;

    switch (this.connector.parameters.protocol) {
      case FileServerProtocolEnum.FTP:
        this.connector.parameters.port = 21;
        break;
      case FileServerProtocolEnum.FTPS:
        this.connector.parameters.port = 990;
        break;
      case FileServerProtocolEnum.SFTP:
        this.connector.parameters.port = 22;
        break;
      default:
        break;
    }
  }

}
