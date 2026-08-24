import { Component, EventEmitter, Output, ViewChild } from '@angular/core';
import { Observable, take } from 'rxjs';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';
import { DeleteConfirmationDialogComponent } from 'src/app/shared/controls/delete-confirmation-dialog/delete-confirmation-dialog.component';
import { ConnectorSpecificationsService } from '../services/connector-specifications.service';
import { ViewConnectorSpecificationModel } from '../models/view-connector-specification.model';
import { ConnectorTypeEnum } from '../models/connector-type.enum';
import {
  ConnectorParameters,
  CreateConnectorSpecificationModel,
  ServerTypeEnum,
  ExportFileServerParametersModel,
  FileServerProtocolEnum,
  ImportFileServerParametersModel,
  ObservationWindowDateFieldEnum,
} from '../models/create-connector-specification.model';
import { FileServerParametersInputComponent } from './file-server-params/file-server-parameters-input.component';

@Component({
  selector: 'app-connector-specification-input-dialog',
  templateUrl: './connector-specification-input-dialog.component.html',
  styleUrls: ['./connector-specification-input-dialog.component.scss']
})
export class ConnectorSpecificationInputDialogComponent {
  @ViewChild('dlgDeleteConfirm') private dlgDeleteConfirm!: DeleteConfirmationDialogComponent;
  @ViewChild('fileServerParams ') private fileServerParams?: FileServerParametersInputComponent;

  @Output()
  public ok = new EventEmitter<void>();

  protected open: boolean = false;
  protected title: string = '';
  protected connector?: ViewConnectorSpecificationModel;
  protected parametersErrorMessage: string = '';
  protected readonly ServerTypeEnum = ServerTypeEnum;

  constructor(
    private connectorSpecificationsService: ConnectorSpecificationsService,
    private pagesDataService: PagesDataService) { }

  public showDialog(connectorId?: number): void {
    this.parametersErrorMessage = '';

    if (connectorId) {
      this.title = 'Edit Connector Specification';
      this.connector = undefined;
      this.open = true;
      this.connectorSpecificationsService.findOne(connectorId).pipe(
        take(1),
      ).subscribe(data => {
        this.connector = { ...data };
      });
    } else {
      this.title = 'New Connector Specification';
      this.connector = this.buildDefaultConnector();
      this.open = true;
    }
  }

  protected onSubmitClick(): void {
    if (!this.connector) return;

    if (!this.connector.name) {
      this.showValidationError('Connector name required');
      return;
    }

    if (!this.connector.description) {
      this.showValidationError('Connector description required');
      return;
    }

    if (!this.connector.hostName) {
      this.showValidationError('Connector host name required');
      return;
    }

    if (!this.connector.cronSchedule) {
      this.showValidationError('Cron schedule required');
      return;
    }

    // Late-binding validation from the parameters sub-tree — currently
    // covers the "directory-shaped filePattern without recursive" case
    // in the import file-server params.
    const paramsError = this.fileServerParams?.validate() ?? null;
    if (paramsError) {
      this.showValidationError(paramsError);
      return;
    }

    if (this.parametersErrorMessage) {
      this.showValidationError(this.parametersErrorMessage);
      return;
    }

    // View model carries server-only fields (id, entryUserId, log) that aren't
    // part of the create payload — pick exactly the fields the API expects.
    const createConnector: CreateConnectorSpecificationModel = {
      name: this.connector.name,
      description: this.connector.description,
      connectorType: this.connector.connectorType,
      serverType: this.connector.serverType,
      hostName: this.connector.hostName,
      timeout: this.connector.timeout,
      retryAttempts: this.connector.retryAttempts,
      cronSchedule: this.connector.cronSchedule,
      parameters: this.connector.parameters,
      disabled: this.connector.disabled,
      comment: this.connector.comment || null,
    };

    const isUpdate: boolean = this.connector.id > 0;
    const saveSubscription: Observable<ViewConnectorSpecificationModel> = isUpdate
      ? this.connectorSpecificationsService.update(this.connector.id, createConnector)
      : this.connectorSpecificationsService.add(createConnector);

    saveSubscription.pipe(
      take(1)
    ).subscribe({
      next: () => {
        this.open = false;
        this.pagesDataService.showToast({
          title: 'Connector Specification',
          message: isUpdate ? 'Connector specification updated' : 'Connector specification created',
          type: ToastEventTypeEnum.SUCCESS,
        });
        this.ok.emit();
      },
      error: err => {
        console.error(err);
        this.pagesDataService.showToast({
          title: 'Connector Specification',
          message: err.error?.message || 'Request failed',
          type: ToastEventTypeEnum.ERROR,
          timeout: 8000,
        });
      }
    });
  }

  protected onDeleteButtonClick(): void {
    this.dlgDeleteConfirm.openDialog();
  }

  protected onDeleteConfirm(): void {
    if (!this.connector) return;
    this.connectorSpecificationsService.delete(this.connector.id).pipe(
      take(1)
    ).subscribe(() => {
      this.open = false;
      this.pagesDataService.showToast({ title: "Connector Specification", message: 'Connector specification deleted', type: ToastEventTypeEnum.SUCCESS });
      this.ok.emit();
    });
  }

  protected onValidationError(errorMessage: string): void {
    this.parametersErrorMessage = errorMessage;
  }

  /**
   * Resets `parameters` to a sensible default whenever the connector type
   * or server type changes — otherwise import-shaped params would
   * leak into an export connector (and vice versa).
   */
  protected onConnectorTypeChange(connectorType: ConnectorTypeEnum): void {
    if (!this.connector || this.connector.connectorType === connectorType) return;
    this.connector.connectorType = connectorType;
    this.connector.parameters = this.buildDefaultParameters(connectorType, this.connector.serverType);
    this.parametersErrorMessage = '';
  }

  protected onServerTypeChange(serverType: ServerTypeEnum): void {
    if (!this.connector || this.connector.serverType === serverType) return;
    this.connector.serverType = serverType;
    this.connector.parameters = this.buildDefaultParameters(this.connector.connectorType, serverType);
    this.parametersErrorMessage = '';
  }

  private buildDefaultConnector(): ViewConnectorSpecificationModel {
    const connectorType = ConnectorTypeEnum.IMPORT;
    const serverType = ServerTypeEnum.FILE_SERVER;
    return {
      id: 0,
      name: '',
      description: '',
      connectorType,
      serverType,
      hostName: '',
      timeout: 300,
      retryAttempts: 0,
      cronSchedule: '',
      parameters: this.buildDefaultParameters(connectorType, serverType),
      // New connectors are forced-disabled; the form hides the toggle until
      // the spec is saved at least once, so the user only enables it once
      // the connection has been verified.
      disabled: true,
      comment: null,
      entryUserId: 0,
      log: null,
    };
  }

  private buildDefaultParameters(connectorType: ConnectorTypeEnum, serverType: ServerTypeEnum): ConnectorParameters {
    if (serverType !== ServerTypeEnum.FILE_SERVER) {
      // Web-server isn't implemented yet; return an empty file-server shape so
      // the form stays usable if the user toggles back.
      return this.buildDefaultFileServerParameters(connectorType);
    }
    return this.buildDefaultFileServerParameters(connectorType);
  }

  private buildDefaultFileServerParameters(connectorType: ConnectorTypeEnum): ConnectorParameters {
    const base = {
      protocol: FileServerProtocolEnum.FTP,
      port: 21,
      username: '',
      password: '',
      remotePath: '/',
    };
    if (connectorType === ConnectorTypeEnum.EXPORT) {
      const exportParams: ExportFileServerParametersModel = {
        ...base,
        observationWindow: {
          durationMinutes: 60,
          dateField: ObservationWindowDateFieldEnum.OBSERVATION,
        },
        specifications: [],
      };
      return exportParams;
    }
    const importParams: ImportFileServerParametersModel = {
      ...base,
      recursive: false,
      specifications: [],
    };
    return importParams;
  }

  private showValidationError(message: string): void {
    this.pagesDataService.showToast({
      title: 'Connector Specification',
      message,
      type: ToastEventTypeEnum.ERROR,
    });
  }

}
