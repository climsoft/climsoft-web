import { Component, ViewChild } from '@angular/core';
import { take } from 'rxjs';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';
import { DeleteConfirmationDialogComponent } from 'src/app/shared/controls/delete-confirmation-dialog/delete-confirmation-dialog.component';
import { ToggleDisabledConfirmationDialogComponent } from 'src/app/shared/controls/toggle-disabled-confirmation-dialog/toggle-disabled-confirmation-dialog.component';
import { ExportSpecificationsService } from '../services/export-specifications.service';
import { ViewExportSpecificationModel } from '../models/view-export-specification.model';
import { ExportSpecificationInputDialogComponent } from '../export-specification-input-dialog/export-specification-input-dialog.component';
import { PagingParameters } from 'src/app/shared/controls/page-input/paging-parameters';

@Component({
  selector: 'app-view-export-specifications',
  templateUrl: './view-export-specifications.component.html',
  styleUrls: ['./view-export-specifications.component.scss']
})
export class ViewExportSpecificationsComponent {
  @ViewChild('dlgDeleteConfirm') dlgDeleteConfirm!: DeleteConfirmationDialogComponent;
  @ViewChild('dlgDeleteAllConfirm') dlgDeleteAllConfirm!: DeleteConfirmationDialogComponent;
  @ViewChild('dlgToggleDisabled') dlgToggleDisabled!: ToggleDisabledConfirmationDialogComponent;
  @ViewChild('dlgExportInput') dlgExportInput!: ExportSpecificationInputDialogComponent;

  protected exports: ViewExportSpecificationModel[] = [];
  protected selectedExport: ViewExportSpecificationModel | null = null;
  protected pageInputDefinition: PagingParameters = new PagingParameters();
  protected sortColumn: string = '';
  protected sortDirection: 'asc' | 'desc' = 'asc';

  constructor(
    private pagesDataService: PagesDataService,
    private exportsService: ExportSpecificationsService,) {
    this.pagesDataService.setPageHeader('Export Specifications');
    this.loadExportSpecifications();
  }

  protected loadExportSpecifications(): void {
    this.exportsService.findAll().pipe(
      take(1),
    ).subscribe((data) => {
      this.exports = data;
      this.applySort();
      this.updatePaging();
    });
  }

  protected onNewExport(): void {
    this.dlgExportInput.openDialog();
  }

  protected onOptionsClicked(option: 'Delete All') {
    switch (option) {
      case 'Delete All':
        this.dlgDeleteAllConfirm.openDialog();
        break;
      default:
        throw new Error('Developer Error. Option not supported');
    }
  }

  protected onEditExport(exportSpec: ViewExportSpecificationModel): void {
    this.dlgExportInput.openDialog(exportSpec.id);
  }

  protected onDeleteAllConfirm(): void {
    this.exportsService.deleteAll().pipe(
      take(1),
    ).subscribe(() => {
      this.pagesDataService.showToast({ title: "Export Specifications Deleted", message: `All export specifications deleted`, type: ToastEventTypeEnum.SUCCESS });
      this.loadExportSpecifications();
    });
  }

  protected onExportInput(): void {
    this.loadExportSpecifications();
  }

  protected onDeleteClick(exportSpec: ViewExportSpecificationModel, event: Event): void {
    event.stopPropagation();
    this.selectedExport = exportSpec;
    this.dlgDeleteConfirm.openDialog();
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
        this.selectedExport = null;
        this.loadExportSpecifications();
      },
      error: (err) => {
        this.pagesDataService.showToast({
          title: 'Export Specification',
          message: err.error.message || `Something bad happened`,
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

    this.exportsService.update(id, { ...updateDto, disabled: newDisabledState }).pipe(
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

  protected get pageStartIndex(): number {
    return (this.pageInputDefinition.page - 1) * this.pageInputDefinition.pageSize;
  }

  protected get pageItems(): ViewExportSpecificationModel[] {
    return this.exports.slice(this.pageStartIndex, this.pageStartIndex + this.pageInputDefinition.pageSize);
  }

  protected onSort(column: string): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
    this.applySort();
    this.pageInputDefinition.onFirst();
  }

  private applySort(): void {
    if (!this.sortColumn) return;
    const dir = this.sortDirection === 'asc' ? 1 : -1;
    this.exports.sort((a, b) => {
      const aVal = (a as any)[this.sortColumn];
      const bVal = (b as any)[this.sortColumn];
      if (typeof aVal === 'number' && typeof bVal === 'number') return (aVal - bVal) * dir;
      return String(aVal ?? '').localeCompare(String(bVal ?? '')) * dir;
    });
  }

  private updatePaging(): void {
    this.pageInputDefinition = new PagingParameters();
    this.pageInputDefinition.setPageSize(365);
    this.pageInputDefinition.setTotalRowCount(this.exports.length);
  }

}
