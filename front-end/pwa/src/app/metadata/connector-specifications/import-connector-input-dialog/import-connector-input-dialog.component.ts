import { Component, EventEmitter, Output } from '@angular/core';
import { Observable, take } from 'rxjs';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';
import { ConnectorSpecificationsService } from '../services/connector-specifications.service';
import { ViewConnectorSpecificationModel } from '../models/view-connector-specification.model';
import { ConnectorTypeEnum } from '../models/connector-type.enum';
import { CreateConnectorSpecificationModel, FTPMetadataModel } from '../models/create-connector-specification.model';
import { ConnectorProtocolEnum } from '../models/connector-protocol.enum';

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
      const ftpMetadata: FTPMetadataModel = { serverIPAddress: '', port: 0, username: '', password: '', remotePath: '', specifications: [] };
      this.connector = {
        id: 0,
        name: '',
        description: '',
        connectorType: ConnectorTypeEnum.IMPORT,
        protocol: ConnectorProtocolEnum.FTP,
        timeout: 5,
        maximumRetries: 1,
        cronSchedule: '',
        parameters: ftpMetadata,
        disabled: false,
        comment: null
      };

    }
  }

  protected onOkClick(): void {
    if (!this.connector.name) {
      this.pagesDataService.showToast({ title: "QC Tests", message: 'Connector name required', type: ToastEventTypeEnum.ERROR });
      return;
    }
    if (!this.connector.cronSchedule) {
      this.pagesDataService.showToast({ title: "QC Tests", message: 'Cron schedule required', type: ToastEventTypeEnum.ERROR });
      return;
    }

    const createConnector: CreateConnectorSpecificationModel = {
      name: this.connector.name,
      description: this.connector.description ? this.connector.description : undefined,
      connectorType: this.connector.connectorType,
      protocol: this.connector.protocol,
      timeout: this.connector.timeout,
      maximumRetries: this.connector.maximumRetries,
      cronSchedule: this.connector.cronSchedule,
      parameters: this.connector.parameters,
      disabled: this.connector.disabled,
      comment: this.connector.comment ? this.connector.comment : undefined,
    };

    let saveSubscription: Observable<ViewConnectorSpecificationModel>;
    if (this.connector.id > 0) {
      saveSubscription = this.connectorSpecificationsService.update(this.connector.id, createConnector);
    } else {
      saveSubscription = this.connectorSpecificationsService.put(createConnector);
    }

    saveSubscription.pipe(
      take(1)
    ).subscribe({
      next: () => {
        this.open = false;
        this.pagesDataService.showToast({ title: "QC Tests", message: this.connector.id > 0 ? `QC test updated` : `QC test created`, type: ToastEventTypeEnum.SUCCESS });
        this.ok.emit();
      },
      error: err => {
        this.open = false;
        this.pagesDataService.showToast({ title: "QC Tests", message: `Error in saving qc test - ${err}`, type: ToastEventTypeEnum.ERROR, timeout: 8000 });
      }
    });
  }

  protected onConnectorProtocolSelected(connectorProtocol : ConnectorProtocolEnum | null ): void{
    if(connectorProtocol){
      this.connector.protocol = connectorProtocol;
    }

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

}
