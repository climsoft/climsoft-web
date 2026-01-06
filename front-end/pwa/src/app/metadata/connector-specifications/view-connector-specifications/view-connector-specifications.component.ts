import { Component, ViewChild } from '@angular/core';
import { take } from 'rxjs';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';
import { ViewConnectorSpecificationModel } from '../models/view-connector-specification.model';
import { ConnectorTypeEnum } from '../models/connector-type.enum';
import { ConnectorSpecificationsService } from '../services/connector-specifications.service';
import { ImportConnectorInputDialogComponent } from '../import-connector-input-dialog/import-connector-input-dialog.component';

@Component({
  selector: 'app-view-connectors',
  templateUrl: './view-connector-specifications.component.html',
  styleUrls: ['./view-connector-specifications.component.scss']
})
export class ViewConnectorSpecificationsComponent {

  @ViewChild('dlgImportConnectorInput') dlgImportConnectorInput!: ImportConnectorInputDialogComponent;

  protected connectors!: ViewConnectorSpecificationModel[];

  constructor(
    private pagesDataService: PagesDataService,
    private connectorSpecificationsService: ConnectorSpecificationsService,) {
    this.pagesDataService.setPageHeader('Connector Specifications');
    this.loadConnectorSpecifications();
  }

  private loadConnectorSpecifications(): void {
    this.connectorSpecificationsService.findAll().pipe(
      take(1),
    ).subscribe(data => {
      this.connectors = data;
    });
  }

  protected onOptionsClicked(sourceTypeName: 'Add Import Connector' | 'Add Export Connector' | 'Delete All') {
    switch (sourceTypeName) {
      case 'Add Import Connector':
        this.dlgImportConnectorInput.showDialog()
        break;
      case 'Add Export Connector':
        // TODO
        break;
      case 'Delete All':
        this.connectorSpecificationsService.deleteAll().pipe(
          take(1)
        ).subscribe(() => {
          this.pagesDataService.showToast({ title: "Sources Deleted", message: `All sources deleted`, type: ToastEventTypeEnum.SUCCESS });
          this.loadConnectorSpecifications();
        });
        break;
      default:
        break;
    }

  }

  protected onEditConnector(connector: ViewConnectorSpecificationModel): void {
    switch (connector.connectorType) {
      case ConnectorTypeEnum.IMPORT:
        this.dlgImportConnectorInput.showDialog(connector.id);
        break;
      case ConnectorTypeEnum.EXPORT:
        // TODO.
        break;
      default:
        throw new Error('Developer error: Connector type not supported');
    }

  }

  protected onConnectorInput(): void {
    this.loadConnectorSpecifications();
  }

}
