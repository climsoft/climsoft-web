import { Component, ViewChild } from '@angular/core';
import { take } from 'rxjs';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';
import { DeleteConfirmationDialogComponent } from 'src/app/shared/controls/delete-confirmation-dialog/delete-confirmation-dialog.component';
import { ToggleDisabledConfirmationDialogComponent } from 'src/app/shared/controls/toggle-disabled-confirmation-dialog/toggle-disabled-confirmation-dialog.component';
import { ViewConnectorSpecificationModel } from '../models/view-connector-specification.model';
import { ConnectorSpecificationsService } from '../services/connector-specifications.service';
import { ConnectorSpecificationInputDialogComponent } from '../connector-specification-input-dialog/connector-specification-input-dialog.component';

@Component({
  selector: 'app-view-connectors',
  templateUrl: './view-connector-specifications.component.html',
  styleUrls: ['./view-connector-specifications.component.scss']
})
export class ViewConnectorSpecificationsComponent {
  @ViewChild('dlgConnectorInput') dlgConnectorInput!: ConnectorSpecificationInputDialogComponent;
  @ViewChild('dlgDeleteConfirm') dlgDeleteConfirm!: DeleteConfirmationDialogComponent;
  @ViewChild('dlgDeleteAllConfirm') dlgDeleteAllConfirm!: DeleteConfirmationDialogComponent;
  @ViewChild('dlgToggleDisabled') dlgToggleDisabled!: ToggleDisabledConfirmationDialogComponent;

  protected connectors!: ViewConnectorSpecificationModel[];

  // Selected connector for actions
  protected selectedConnector: ViewConnectorSpecificationModel | null = null;

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

  protected onOptionsClicked(option: 'Delete All') {
    switch (option) {
      case 'Delete All':
        this.dlgDeleteAllConfirm.openDialog();
        break;
      default:
        break;
    }

  }

  protected onDeleteAllConfirm(): void {
    this.connectorSpecificationsService.deleteAll().pipe(
      take(1)
    ).subscribe(() => {
      this.pagesDataService.showToast({ title: "Source Specifications Deleted", message: `All source specifications deleted`, type: ToastEventTypeEnum.SUCCESS });
      this.loadConnectorSpecifications();
    });
  }

  protected onConnectorInput(): void {
    this.loadConnectorSpecifications();
  }

  protected onDeleteClick(connector: ViewConnectorSpecificationModel, event: Event): void {
    event.stopPropagation();
    this.selectedConnector = connector;
    this.dlgDeleteConfirm.openDialog();
  }

  protected onDeleteConfirm(): void {
    if (!this.selectedConnector) return;

    this.connectorSpecificationsService.delete(this.selectedConnector.id).pipe(
      take(1)
    ).subscribe({
      next: () => {
        this.pagesDataService.showToast({
          title: 'Connector Specification',
          message: `Connector "${this.selectedConnector!.name}" deleted`,
          type: ToastEventTypeEnum.SUCCESS
        });
        this.loadConnectorSpecifications();
        this.selectedConnector = null;
      },
      error: (err) => {
        this.pagesDataService.showToast({
          title: 'Connector Specification',
          message: `Error deleting connector: ${err.message}`,
          type: ToastEventTypeEnum.ERROR
        });
      }
    });
  }

  protected onAddConnectorClick(): void {
    this.dlgConnectorInput.showDialog();
  }

  protected onConnectorClick(connectorId: number, event: Event): void {
    event.stopPropagation();
    this.dlgConnectorInput.showDialog(connectorId);
  }

  protected onToggleDisabledClick(connector: ViewConnectorSpecificationModel, event: Event): void {
    event.stopPropagation();
    this.selectedConnector = connector;
    this.dlgToggleDisabled.showDialog();
  }

  protected onToggleDisabledConfirm(): void {
    if (!this.selectedConnector) return;

    const newDisabledState = !this.selectedConnector.disabled;
    const action = newDisabledState ? 'disabled' : 'enabled';

    // Destructure to exclude 'id', 'entryUserId' and 'log' since API expects CreateConnectorSpecificationModel
    const { id, entryUserId, log, ...updateDto } = this.selectedConnector;

    this.connectorSpecificationsService.update(id, {
      ...updateDto,
      disabled: newDisabledState
    }).pipe(
      take(1)
    ).subscribe({
      next: () => {
        this.pagesDataService.showToast({
          title: 'Connector Specification',
          message: `Connector "${this.selectedConnector!.name}" ${action}`,
          type: ToastEventTypeEnum.SUCCESS
        });
        this.loadConnectorSpecifications();
        this.selectedConnector = null;
      },
      error: (err) => {
        console.error('Error updating connector: ', err);
        this.pagesDataService.showToast({
          title: 'Connector Specification',
          message: `Error updating connector: ${err.message}`,
          type: ToastEventTypeEnum.ERROR
        });
      }
    });
  }

}
