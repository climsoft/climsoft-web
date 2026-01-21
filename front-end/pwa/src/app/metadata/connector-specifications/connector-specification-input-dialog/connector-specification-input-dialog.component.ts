import { Component, EventEmitter, Output } from '@angular/core';
import { Observable, take } from 'rxjs';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';
import { ConnectorSpecificationsService } from '../services/connector-specifications.service';
import { ViewConnectorSpecificationModel } from '../models/view-connector-specification.model';
import { ConnectorTypeEnum } from '../models/connector-type.enum';
import { CreateConnectorSpecificationModel, EndPointTypeEnum, FileServerProtocolEnum, ImportFileServerParametersModel } from '../models/create-connector-specification.model';

@Component({
  selector: 'app-connector-specification-input-dialog',
  templateUrl: './connector-specification-input-dialog.component.html',
  styleUrls: ['./connector-specification-input-dialog.component.scss']
})
export class ConnectorSpecificationInputDialogComponent {
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

    if (connectorId) {
      this.title = 'Edit Connector Specification';
      this.connectorSpecificationsService.findOne(connectorId).pipe(
        take(1),
      ).subscribe(data => {
        this.connector = data;
      });
    } else {
      this.title = 'New Connector Specification';
      const ftpMetadata: ImportFileServerParametersModel = {
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
        timeout: 300,
        maxAttempts: 1,
        cronSchedule: '',
        orderNumber: 0,
        parameters: ftpMetadata,
        disabled: false,
        comment: '',
      };

    }
  }

  protected onSubmitClick(): void {
    if (!this.connector.name) {
      this.pagesDataService.showToast({ title: 'Connector Specification', message: 'Connector name required', type: ToastEventTypeEnum.ERROR });
      return;
    }

     if (!this.connector.description) {
      this.pagesDataService.showToast({ title: 'Connector Specification', message: 'Connector description required', type: ToastEventTypeEnum.ERROR });
      return;
    }

    if (!this.connector.hostName) {
      this.pagesDataService.showToast({ title: 'Connector Specification', message: 'Connector host name required', type: ToastEventTypeEnum.ERROR });
      return;
    }

    if (!this.connector.cronSchedule) {
      this.pagesDataService.showToast({ title: 'Connector Specification', message: 'Cron schedule required', type: ToastEventTypeEnum.ERROR });
      return;
    }

    if (!this.connector.parameters.password) {
      this.pagesDataService.showToast({ title: 'Connector Specification', message: 'Password required', type: ToastEventTypeEnum.ERROR });
      return;
    }

    if (this.parametersErrormMessage) {
      this.pagesDataService.showToast({ title: 'Connector Specification', message: this.parametersErrormMessage, type: ToastEventTypeEnum.ERROR });
      return;
    }

    const createConnector: CreateConnectorSpecificationModel = {
      name: this.connector.name,
      description: this.connector.description ? this.connector.description : undefined,
      connectorType: this.connector.connectorType,
      endPointType: this.connector.endPointType,
      hostName: this.connector.hostName,
      timeout: this.connector.timeout,
      maxAttempts: this.connector.maxAttempts,
      cronSchedule: this.connector.cronSchedule,
      orderNumber: this.connector.orderNumber ? this.connector.orderNumber : undefined,
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
        this.pagesDataService.showToast({ title: 'Connector Specification', message: this.connector.id > 0 ? `Connector specification updated` : `Connector specification created`, type: ToastEventTypeEnum.SUCCESS });
        this.ok.emit();
      },
      error: err => {
        this.open = false;
        console.log('error: ', err);
        this.pagesDataService.showToast({ title: 'Connector Specification', message: `Error in saving connector cpecification - ${err.message}`, type: ToastEventTypeEnum.ERROR, timeout: 8000 });
      }
    });
  }

  protected onOrderNumberChange(value: number | null) {
    if (value) this.connector.orderNumber = value;
  }

  protected onDeleteClick(): void {
    this.connectorSpecificationsService.delete(this.connector.id).pipe(
      take(1)
    ).subscribe(() => {
      this.open = false;
      this.pagesDataService.showToast({ title: "Connector Specification", message: 'Connector specification deleted', type: ToastEventTypeEnum.SUCCESS });
      this.ok.emit();
    });
  }

  protected onValidationError(errorMessage: string): void {
    this.parametersErrormMessage = errorMessage;
  }

}
