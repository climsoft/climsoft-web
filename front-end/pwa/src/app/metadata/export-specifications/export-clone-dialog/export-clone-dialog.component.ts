import { Component, EventEmitter, Output, ViewChild } from '@angular/core';
import { take } from 'rxjs';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';
import { ConfirmationDialogComponent } from 'src/app/shared/controls/confirmation-dialog/confirmation-dialog.component';
import { ViewExportSpecificationModel } from '../models/view-export-specification.model';
import { CreateExportSpecificationModel } from '../models/create-export-specification.model';
import { ExportSpecificationsService } from '../services/export-specifications.service';

@Component({
  selector: 'app-export-clone-dialog',
  templateUrl: './export-clone-dialog.component.html',
  styleUrls: ['./export-clone-dialog.component.scss']
})
export class ExportCloneDialogComponent {
  @ViewChild('dlgSaveConfirm') dlgSaveConfirm!: ConfirmationDialogComponent;

  @Output() public ok = new EventEmitter<void>();

  protected open: boolean = false;
  protected title: string = '';
  protected exportToClone!: ViewExportSpecificationModel;

  protected newName: string = '';
  protected newDescription: string = '';

  protected saving: boolean = false;

  constructor(
    private pagesDataService: PagesDataService,
    private exportsService: ExportSpecificationsService,
  ) { }

  public openDialog(exportSpec: ViewExportSpecificationModel): void {
    this.exportToClone = structuredClone(exportSpec);
    this.title = 'Clone Export Specification';
    this.newName = `${exportSpec.name} (copy)`;
    this.newDescription = exportSpec.description;
    this.saving = false;
    this.open = true;
  }

  protected onSave(): void {
    if (!this.newName.trim()) {
      this.pagesDataService.showToast({ title: 'Clone Export', message: 'Enter a name', type: ToastEventTypeEnum.ERROR });
      return;
    }
    if (!this.newDescription.trim()) {
      this.pagesDataService.showToast({ title: 'Clone Export', message: 'Enter a description', type: ToastEventTypeEnum.ERROR });
      return;
    }

    this.dlgSaveConfirm.openDialog();
  }

  protected onSaveConfirm(): void {
    const payload: CreateExportSpecificationModel = {
      name: this.newName.trim(),
      description: this.newDescription.trim(),
      exportType: this.exportToClone.exportType,
      parameters: this.exportToClone.parameters,
      adapterId: this.exportToClone.adapterId,
      disabled: this.exportToClone.disabled,
      comment: null,
    };

    this.saving = true;
    this.exportsService.add(payload).pipe(take(1)).subscribe({
      next: () => {
        this.saving = false;
        this.pagesDataService.showToast({
          title: 'Clone Export',
          message: `Export ${payload.name} created`,
          type: ToastEventTypeEnum.SUCCESS,
        });
        this.open = false;
        this.ok.emit();
      },
      error: err => {
        this.saving = false;
        console.error(err);
        this.pagesDataService.showToast({
          title: 'Clone Export',
          message: err.error?.message || 'Something bad happened',
          type: ToastEventTypeEnum.ERROR,
        });
      },
    });
  }
}
