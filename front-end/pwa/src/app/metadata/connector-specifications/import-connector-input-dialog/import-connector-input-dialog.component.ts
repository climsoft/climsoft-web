import { Component, EventEmitter, Output } from '@angular/core';
import { Observable, take } from 'rxjs';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';
import { ConnectorSpecificationsService } from '../services/connector-specifications.service';
import { ViewConnectorSpecificationModel } from '../models/view-connector-specification.model';
import { ConnectorTypeEnum } from '../models/connector-type.enum';
import { CreateConnectorSpecificationModel, EndPointTypeEnum, FileServerProtocolEnum, FileServerParametersModel } from '../models/create-connector-specification.model';

@Component({
  selector: 'app-connector-specification-input-dialog',
  templateUrl: './import-connector-input-dialog.component.html',
  styleUrls: ['./import-connector-input-dialog.component.scss']
})
export class ImportConnectorInputDialogComponent {
  @Output()
  public ok = new EventEmitter<void>();

  protected open: boolean = false;
  protected title: string = '';
  protected connector!: ViewConnectorSpecificationModel;
  protected parametersErrormMessage: string = '';

  constructor(
    private connectorSpecificationsService: ConnectorSpecificationsService,
    private pagesDataService: PagesDataService) { }

  public showDialog(connectorId?: number): void {
    this.open = true;
    this.title = connectorId ? 'Edit Connector Specification' : 'New Connector Specification';

    if (connectorId) {
      this.connectorSpecificationsService.findOne(connectorId).pipe(
        take(1),
      ).subscribe(data => {
        this.connector = data;
      });
    } else {
      const ftpMetadata: FileServerParametersModel = {
        protocol: FileServerProtocolEnum.FTP,
        port: 21,
        username: '',
        password: '',
        remotePath: '/',
        specifications: [],
      };

      this.connector = {
        id: 0,
        name: '',
        description: '',
        connectorType: ConnectorTypeEnum.IMPORT,
        endPointType: EndPointTypeEnum.FILE_SERVER,
        hostName: '',
        timeout: 5,
        maximumRetries: 1,
        cronSchedule: '',
        orderNumber: 0,
        parameters: ftpMetadata,
        disabled: false,
        comment: undefined,
      };

    }
  }

  protected onOkClick(): void {
    if (!this.connector.name) {
      this.pagesDataService.showToast({ title: 'Import Connector', message: 'Connector name required', type: ToastEventTypeEnum.ERROR });
      return;
    }
    if (!this.connector.hostName) {
      this.pagesDataService.showToast({ title: 'Import Connector', message: 'Connector name required', type: ToastEventTypeEnum.ERROR });
      return;
    }

    if (!this.connector.cronSchedule) {
      this.pagesDataService.showToast({ title: 'Import Connector', message: 'Cron schedule required', type: ToastEventTypeEnum.ERROR });
      return;
    }

    if (!this.connector.parameters.password) {
      this.pagesDataService.showToast({ title: 'Import Connector', message: 'Password required', type: ToastEventTypeEnum.ERROR });
      return;
    }

    if (this.parametersErrormMessage) {
      this.pagesDataService.showToast({ title: 'Import Connector', message: this.parametersErrormMessage, type: ToastEventTypeEnum.ERROR });
      return;
    }

    const createConnector: CreateConnectorSpecificationModel = {
      name: this.connector.name,
      description: this.connector.description ? this.connector.description : undefined,
      connectorType: this.connector.connectorType,
      endPointType: this.connector.endPointType,
      hostName: this.connector.hostName,
      timeout: this.connector.timeout,
      maximumRetries: this.connector.maximumRetries,
      cronSchedule: this.connector.cronSchedule,
      orderNumber: this.connector.orderNumber? this.connector.orderNumber: undefined,
      parameters: this.connector.parameters,
      disabled: this.connector.disabled,
      comment: this.connector.comment ? this.connector.comment : undefined,
    };

    let saveSubscription: Observable<ViewConnectorSpecificationModel>;
    if (this.connector.id > 0) { 
      saveSubscription = this.connectorSpecificationsService.update(this.connector.id, createConnector);
    } else {
      saveSubscription = this.connectorSpecificationsService.add(createConnector);
    }

    saveSubscription.pipe(
      take(1)
    ).subscribe({
      next: () => {
        this.open = false;
        this.pagesDataService.showToast({ title: 'Import Connector', message: this.connector.id > 0 ? `Import connector updated` : `Import connector created`, type: ToastEventTypeEnum.SUCCESS });
        this.ok.emit();
      },
      error: err => {
        this.open = false;
        console.log('error: ', err);
        this.pagesDataService.showToast({ title: 'Import Connector', message: `Error in saving import connector - ${err.message}`, type: ToastEventTypeEnum.ERROR, timeout: 8000 });
      }
    });
  }

  protected onDeleteClick(): void {
    this.connectorSpecificationsService.delete(this.connector.id).pipe(
      take(1)
    ).subscribe(() => {
      this.open = false;
      this.pagesDataService.showToast({ title: "QC Tests", message: 'Connector Deleted', type: ToastEventTypeEnum.SUCCESS });
      this.ok.emit();
    });
  }

  protected onValidationError(errorMessage: string): void {
    this.parametersErrormMessage = errorMessage;
  }

}
