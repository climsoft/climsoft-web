import { Component, ViewChild } from '@angular/core';
import { take } from 'rxjs';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';
import { PagingParameters } from 'src/app/shared/controls/page-input/paging-parameters';
import { DeleteConfirmationDialogComponent } from 'src/app/shared/controls/delete-confirmation-dialog/delete-confirmation-dialog.component';
import { AdaptersService } from '../services/adapters.service';
import { ViewAdapterSpecificationModel } from '../models/view-adapter-specification.model';
import { ADAPTER_LANGUAGE_LABELS } from '../models/adapter-language.enum';
import { AdapterDetailDialogComponent } from '../adapter-detail-dialog/adapter-detail-dialog.component';
import { ToggleDisabledConfirmationDialogComponent } from 'src/app/shared/controls/toggle-disabled-confirmation-dialog/toggle-disabled-confirmation-dialog.component';

interface View extends ViewAdapterSpecificationModel {
  languageLabel: string;
}

@Component({
  selector: 'app-view-adapters',
  templateUrl: './view-adapters.component.html',
  styleUrls: ['./view-adapters.component.scss'],
})
export class ViewAdaptersComponent {
  @ViewChild('dlgDeleteConfirm') dlgDeleteConfirm!: DeleteConfirmationDialogComponent;
  @ViewChild('dlgDeleteAllConfirm') dlgDeleteAllConfirm!: DeleteConfirmationDialogComponent;
  @ViewChild('dlgToggleDisabled') dlgToggleDisabled!: ToggleDisabledConfirmationDialogComponent;
  @ViewChild('dlgAdapterInput') dlgAdapterInput!: AdapterDetailDialogComponent;

  protected adapters: View[] = [];
  protected selectedAdapter: View | null = null;
  protected pageInputDefinition: PagingParameters = new PagingParameters();
  protected sortColumn: string = '';
  protected sortDirection: 'asc' | 'desc' = 'asc';

  constructor(
    private pagesDataService: PagesDataService,
    private adaptersService: AdaptersService,
  ) {
    this.pagesDataService.setPageHeader('Adapter Specifications');
    this.loadAdapters();
  }

  protected loadAdapters(): void {
    this.adaptersService.findAll().pipe(
      take(1),
    ).subscribe((adapters) => {
      this.adapters = adapters.map(item => {
        return {
          ...item, languageLabel: ADAPTER_LANGUAGE_LABELS[item.language] ?? item.language,
        };
      });
      this.applySort();
      this.updatePaging();
    });
  }

  protected onNewAdapter(): void {
    this.dlgAdapterInput.openDialog();
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

  protected onDeleteAll(sourceTypeName: 'Delete All') {
    switch (sourceTypeName) {
      case 'Delete All':
        this.dlgDeleteAllConfirm.openDialog();
        return;
      default:
        throw new Error('Developer error, option not supported');
    }
  }

  protected onDeleteAllConfirm(): void {
    this.adaptersService.deleteAll().pipe(
      take(1),
    ).subscribe(() => {
      this.pagesDataService.showToast({ title: "Export Specifications Deleted", message: `All export specifications deleted`, type: ToastEventTypeEnum.SUCCESS });
      this.loadAdapters();
    });
  }

  protected onEditAdapter(adapter: View): void {
    this.dlgAdapterInput.openDialog(adapter.id);
  }

  protected onDeleteClick(adapter: View, event: Event): void {
    event.stopPropagation();
    if (adapter.systemKey !== null) {
      this.pagesDataService.showToast({ title: 'Adapter Specification', message: 'System adapters cannot be deleted', type: ToastEventTypeEnum.ERROR });
      return;
    }
    this.selectedAdapter = adapter;
    this.dlgDeleteConfirm.openDialog();
  }

  protected onDeleteConfirm(): void {
    if (!this.selectedAdapter) return;
    this.adaptersService.delete(this.selectedAdapter.id).pipe(
      take(1),
    ).subscribe({
      next: () => {
        this.pagesDataService.showToast({ title: 'Adapter', message: 'Adapter deleted', type: ToastEventTypeEnum.SUCCESS, });
        this.selectedAdapter = null;
        this.loadAdapters();
      },
      error: (err) => {
        this.pagesDataService.showToast({ title: 'Adapter Specification', message: err.error?.message || `Something bad happened`, type: ToastEventTypeEnum.ERROR });
      },
    });
  }

  protected onToggleDisabledClick(adapter: View, event: Event): void {
    event.stopPropagation();
    this.selectedAdapter = adapter;
    this.dlgToggleDisabled.showDialog();
  }

  protected onToggleDisabledConfirm(): void {
    if (!this.selectedAdapter) return;
    const newDisabledState = !this.selectedAdapter.disabled;
    // Destructure to exclude 'id', 'languageLabel', and 'systemKey' since API does not expect them
    const { id, languageLabel, systemKey, ...updateDto } = this.selectedAdapter;
    this.adaptersService.update(id, { ...updateDto, disabled: newDisabledState }).pipe(
      take(1)
    ).subscribe({
      next: () => {
        const action = newDisabledState ? 'disabled' : 'enabled';
        this.pagesDataService.showToast({ title: 'Adapter Specification', message: `Adapter specification ${action}`, type: ToastEventTypeEnum.SUCCESS });
        this.selectedAdapter = null;
        this.loadAdapters();
      },
      error: (err) => {
        this.pagesDataService.showToast({ title: 'Adapter Specification', message: err.error?.message || `Something bad happened`, type: ToastEventTypeEnum.ERROR });
      }
    });
  }

  protected get pageStartIndex(): number {
    return (this.pageInputDefinition.page - 1) * this.pageInputDefinition.pageSize;
  }

  protected get pageItems(): View[] {
    return this.adapters.slice(this.pageStartIndex, this.pageStartIndex + this.pageInputDefinition.pageSize);
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
    this.adapters.sort((a, b) => {
      const aVal = (a as any)[this.sortColumn];
      const bVal = (b as any)[this.sortColumn];
      if (typeof aVal === 'number' && typeof bVal === 'number') return (aVal - bVal) * dir;
      return String(aVal ?? '').localeCompare(String(bVal ?? '')) * dir;
    });
  }

  private updatePaging(): void {
    this.pageInputDefinition = new PagingParameters();
    this.pageInputDefinition.setPageSize(365);
    this.pageInputDefinition.setTotalRowCount(this.adapters.length);
  }
}
