import { Component, ViewChild } from '@angular/core';
import { take } from 'rxjs';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';
import { DeleteConfirmationDialogComponent } from 'src/app/shared/controls/delete-confirmation-dialog/delete-confirmation-dialog.component';
import { ToggleDisabledConfirmationDialogComponent } from 'src/app/shared/controls/toggle-disabled-confirmation-dialog/toggle-disabled-confirmation-dialog.component';
import { ExportSpecificationsService } from '../services/export-specifications.service';
import { ViewExportSpecificationModel } from '../models/view-export-specification.model';

@Component({
  selector: 'app-view-export-specifications',
  templateUrl: './view-export-specifications.component.html',
  styleUrls: ['./view-export-specifications.component.scss']
})
export class ViewExportSpecificationsComponent {
  @ViewChild('dlgDeleteConfirm') dlgDeleteConfirm!: DeleteConfirmationDialogComponent;
  @ViewChild('dlgToggleDisabled') dlgToggleDisabled!: ToggleDisabledConfirmationDialogComponent;

  protected exports!: ViewExportSpecificationModel[];
  protected selectedExport: ViewExportSpecificationModel | null = null;

  constructor(
    private pagesDataService: PagesDataService,
    private exportsService: ExportSpecificationsService,) {
    this.pagesDataService.setPageHeader('Export Specifications');
    this.loadExportSpecifications();
  }

  private loadExportSpecifications(): void {
    this.exportsService.findAll().pipe(
      take(1),
    ).subscribe((data) => {
      this.exports = data;
    });
  }

  protected onOptionsClicked(option: 'Delete All') {
    switch (option) {
      case 'Delete All':
        this.exportsService.deleteAll().pipe(
          take(1),
        ).subscribe(() => {
          this.pagesDataService.showToast({ title: "Exports Deleted", message: `All exports deleted`, type: ToastEventTypeEnum.SUCCESS });
          this.loadExportSpecifications();
        });
        break;
      default:
        throw new Error('Developer Error. Option not supported');
    }
  }

  protected onExportInput(): void {
    this.loadExportSpecifications();
  }

  protected onDeleteClick(exportSpec: ViewExportSpecificationModel, event: Event): void {
    event.stopPropagation();
    this.selectedExport = exportSpec;
    this.dlgDeleteConfirm.showDialog();
  }

  protected onDeleteConfirm(): void {
    if (!this.selectedExport) return;

    this.exportsService.delete(this.selectedExport.id).pipe(
      take(1)
    ).subscribe({
      next: () => {
        this.pagesDataService.showToast({
          title: 'Export Specification',
          message: `Export "${this.selectedExport!.name}" deleted`,
          type: ToastEventTypeEnum.SUCCESS
        });
        this.loadExportSpecifications();
        this.selectedExport = null;
      },
      error: (err) => {
        this.pagesDataService.showToast({
          title: 'Export Specification',
          message: `Error deleting export: ${err.message}`,
          type: ToastEventTypeEnum.ERROR
        });
      }
    });
  }

  protected onToggleDisabledClick(exportSpec: ViewExportSpecificationModel, event: Event): void {
    event.stopPropagation();
    this.selectedExport = exportSpec;
    this.dlgToggleDisabled.showDialog();
  }

  protected onToggleDisabledConfirm(): void {
    if (!this.selectedExport) return;

    const newDisabledState = !this.selectedExport.disabled;
    const action = newDisabledState ? 'disabled' : 'enabled';

    // Destructure to exclude 'id' since API expects CreateExportSpecificationModel
    const { id, ...updateDto } = this.selectedExport;

    this.exportsService.update(id, {
      ...updateDto,
      disabled: newDisabledState
    }).pipe(
      take(1)
    ).subscribe({
      next: () => {
        this.pagesDataService.showToast({
          title: 'Export Specification',
          message: `Export "${this.selectedExport!.name}" ${action}`,
          type: ToastEventTypeEnum.SUCCESS
        });
        this.loadExportSpecifications();
        this.selectedExport = null;
      },
      error: (err) => {
        this.pagesDataService.showToast({
          title: 'Export Specification',
          message: `Error updating export: ${err.message}`,
          type: ToastEventTypeEnum.ERROR
        });
      }
    });
  }

}
