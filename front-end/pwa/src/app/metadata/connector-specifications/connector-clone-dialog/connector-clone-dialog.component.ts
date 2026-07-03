import { Component, EventEmitter, Output, ViewChild } from '@angular/core';
import { take } from 'rxjs';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';
import { ConfirmationDialogComponent } from 'src/app/shared/controls/confirmation-dialog/confirmation-dialog.component';
import { ViewConnectorSpecificationModel } from '../models/view-connector-specification.model';
import { CreateConnectorSpecificationModel } from '../models/create-connector-specification.model';
import { ConnectorSpecificationsService } from '../services/connector-specifications.service';

@Component({
  selector: 'app-connector-clone-dialog',
  templateUrl: './connector-clone-dialog.component.html',
  styleUrls: ['./connector-clone-dialog.component.scss']
})
export class ConnectorCloneDialogComponent {
  @ViewChild('dlgSaveConfirm') dlgSaveConfirm!: ConfirmationDialogComponent;

  @Output() public ok = new EventEmitter<void>();

  protected open: boolean = false;
  protected title: string = '';
  protected connectorToClone!: ViewConnectorSpecificationModel;

  protected newName: string = '';
  protected newDescription: string = '';
  protected newPassword: string = '';
  protected confirmPassword: string = '';
  protected passwordErrorMessage: string = '';

  protected saving: boolean = false;

  constructor(
    private pagesDataService: PagesDataService,
    private connectorsService: ConnectorSpecificationsService,
  ) { }

  public openDialog(connector: ViewConnectorSpecificationModel): void {
    this.connectorToClone = structuredClone(connector);
    this.title = 'Clone Connector Specification';
    this.newName = `${connector.name} (copy)`;
    this.newDescription = connector.description;
    this.newPassword = '';
    this.confirmPassword = '';
    this.passwordErrorMessage = '';
    this.saving = false;
    this.open = true;
  }

  /**
   * Mirrors the validation used by the file-server params input: both fields
   * non-empty and matching. Cloning always requires a fresh password because
   * the API masks passwords on GET (`***ENCRYPTED***`) and rejects that marker
   * on create.
   */
  protected onPasswordChange(): void {
    if (this.newPassword === '') {
      this.passwordErrorMessage = 'Empty passwords not allowed';
    } else if (this.confirmPassword === '') {
      this.passwordErrorMessage = 'Password NOT confirmed';
    } else if (this.newPassword !== this.confirmPassword) {
      this.passwordErrorMessage = 'Passwords DO NOT match';
    } else {
      this.passwordErrorMessage = '';
    }
  }

  protected onSave(): void {
    if (!this.newName.trim()) {
      this.pagesDataService.showToast({ title: 'Clone Connector', message: 'Enter a name', type: ToastEventTypeEnum.ERROR });
      return;
    }
    if (!this.newDescription.trim()) {
      this.pagesDataService.showToast({ title: 'Clone Connector', message: 'Enter a description', type: ToastEventTypeEnum.ERROR });
      return;
    }
    this.onPasswordChange();
    if (this.passwordErrorMessage !== '') {
      this.pagesDataService.showToast({ title: 'Clone Connector', message: this.passwordErrorMessage, type: ToastEventTypeEnum.ERROR });
      return;
    }

    this.dlgSaveConfirm.openDialog();
  }

  protected onSaveConfirm(): void {
    const payload: CreateConnectorSpecificationModel = {
      name: this.newName.trim(),
      description: this.newDescription.trim(),
      connectorType: this.connectorToClone.connectorType,
      serverType: this.connectorToClone.serverType,
      hostName: this.connectorToClone.hostName,
      timeout: this.connectorToClone.timeout,
      retryAttempts: this.connectorToClone.retryAttempts,
      cronSchedule: this.connectorToClone.cronSchedule,
      parameters: { ...this.connectorToClone.parameters, password: this.newPassword },
      disabled: this.connectorToClone.disabled,
      comment: null,
    };

    this.saving = true;
    this.connectorsService.add(payload).pipe(take(1)).subscribe({
      next: () => {
        this.saving = false;
        this.pagesDataService.showToast({
          title: 'Clone Connector',
          message: `Connector ${payload.name} created`,
          type: ToastEventTypeEnum.SUCCESS,
        });
        this.open = false;
        this.ok.emit();
      },
      error: (err) => {
        console.error(err);
        this.saving = false;
        this.pagesDataService.showToast({
          title: 'Clone Connector',
          message: err.error?.message || 'Something bad happened',
          type: ToastEventTypeEnum.ERROR,
        });
      },
    });
  }
}
