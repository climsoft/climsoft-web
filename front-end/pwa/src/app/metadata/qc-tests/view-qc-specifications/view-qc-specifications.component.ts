import { Component, OnDestroy, ViewChild } from '@angular/core';
import { Subject, take, takeUntil } from 'rxjs';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';
import { QCTestCacheModel, QCSpecificationsCacheService } from '../services/qc-specifications-cache.service';
import { QCSpecificationInputDialogComponent } from '../qc-test-input-dialog/qc-specification-input-dialog.component';
import { AppAuthService } from 'src/app/app-auth.service';
import { DeleteConfirmationDialogComponent } from 'src/app/shared/controls/delete-confirmation-dialog/delete-confirmation-dialog.component';
import { ToggleDisabledConfirmationDialogComponent } from 'src/app/shared/controls/toggle-disabled-confirmation-dialog/toggle-disabled-confirmation-dialog.component';
import { ElementsCacheService } from '../../elements/services/elements-cache.service';
import { PagingParameters } from 'src/app/shared/controls/page-input/paging-parameters';

interface ElementQCSpecView extends QCTestCacheModel {
  elementName: string;
}

@Component({
  selector: 'app-view-qc-specifications',
  templateUrl: './view-qc-specifications.component.html',
  styleUrls: ['./view-qc-specifications.component.scss']
})
export class ViewQCSpecificationsComponent implements OnDestroy {
  @ViewChild('dlgQcEdit') appQCEditDialog!: QCSpecificationInputDialogComponent;
  @ViewChild('dlgDeleteConfirm') dlgDeleteConfirm!: DeleteConfirmationDialogComponent;
  @ViewChild('dlgToggleDisabled') dlgToggleDisabled!: ToggleDisabledConfirmationDialogComponent;
  @ViewChild('dlgDeleteAllConfirm') dlgDeleteAllConfirm!: DeleteConfirmationDialogComponent;

  protected allQCSpecifications: ElementQCSpecView[] = [];
  protected qCSpecifications: ElementQCSpecView[] = [];
  protected searchedIds: number[] = [];
  protected selectedQcTest: ElementQCSpecView | null = null;

  protected dropDownItems: string[] = [];
  protected isSystemAdmin: boolean = false;
  protected pageInputDefinition: PagingParameters = new PagingParameters();
  protected sortColumn: string = '';
  protected sortDirection: 'asc' | 'desc' = 'asc';

  private destroy$ = new Subject<void>();

  constructor(
    private pagesDataService: PagesDataService,
    private appAuthService: AppAuthService,
    private elementsCacheService: ElementsCacheService,
    private qCTestsCacheService: QCSpecificationsCacheService,) {

    this.pagesDataService.setPageHeader('QC Specifications');

    // Check on allowed options
    this.appAuthService.user.pipe(
      takeUntil(this.destroy$),
    ).subscribe(user => {
      if (!user) return;
      this.isSystemAdmin = user.isSystemAdmin;
      if (this.isSystemAdmin) {
        this.dropDownItems = ['Delete All'];
      }
    });

    this.qCTestsCacheService.cachedQCTests.pipe(
      takeUntil(this.destroy$),
    ).subscribe(qcSPecs => {

      this.elementsCacheService.cachedElements.pipe(
        takeUntil(this.destroy$),
      ).subscribe(elements => {

        this.allQCSpecifications = qcSPecs.map(qcSPec => {
          const element = elements.find(item => item.id === qcSPec.elementId);
          return { ...qcSPec, elementName: element ? element.name : '' };
        });

        // Always call filtered search ids because when the caches refreshes, the selected ids will not be the ones shown
        this.filterSearchedIds();
      });
    });

  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  protected onSearchInput(searchedIds: number[]): void {
    this.searchedIds = searchedIds;
    this.filterSearchedIds();
  }

  private filterSearchedIds(): void {
    this.qCSpecifications = this.searchedIds && this.searchedIds.length > 0 ?
      this.allQCSpecifications.filter(item => this.searchedIds.includes(item.elementId)) : [...this.allQCSpecifications];
    this.applySort();
    this.updatePaging();
  }

  protected onOptionsClicked(option: string) {
    if (option === 'Delete All') {
      this.dlgDeleteAllConfirm.openDialog();
    }
  }

  protected onDeleteAllConfirm(): void {
    this.qCTestsCacheService.deleteAll().pipe(
      take(1),
    ).subscribe(() => {
      this.pagesDataService.showToast({ title: 'QC Specifications Deleted', message: 'All QC specifications deleted', type: ToastEventTypeEnum.SUCCESS });
    });
  }

  protected get pageStartIndex(): number {
    return (this.pageInputDefinition.page - 1) * this.pageInputDefinition.pageSize;
  }

  protected get pageItems(): ElementQCSpecView[] {
    return this.qCSpecifications.slice(this.pageStartIndex, this.pageStartIndex + this.pageInputDefinition.pageSize);
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
    this.qCSpecifications.sort((a, b) => {
      const aVal = (a as any)[this.sortColumn];
      const bVal = (b as any)[this.sortColumn];
      if (typeof aVal === 'number' && typeof bVal === 'number') return (aVal - bVal) * dir;
      return String(aVal ?? '').localeCompare(String(bVal ?? '')) * dir;
    });
  }

  private updatePaging(): void {
    this.pageInputDefinition = new PagingParameters();
    this.pageInputDefinition.setPageSize(30);
    this.pageInputDefinition.setTotalRowCount(this.qCSpecifications.length);
  }

  protected onDeleteClick(qcTest: ElementQCSpecView, event: Event): void {
    event.stopPropagation();
    this.selectedQcTest = qcTest;
    this.dlgDeleteConfirm.openDialog();
  }

  protected onDeleteConfirm(): void {
    if (!this.selectedQcTest) return;
    this.qCTestsCacheService.delete(this.selectedQcTest.id).pipe(
      take(1)
    ).subscribe(() => {
      this.pagesDataService.showToast({ title: 'QC Specification', message: 'QC specification deleted', type: ToastEventTypeEnum.SUCCESS });
      this.selectedQcTest = null;
    });
  }

  protected onToggleDisabledClick(qcTest: ElementQCSpecView, event: Event): void {
    event.stopPropagation();
    this.selectedQcTest = qcTest;
    this.dlgToggleDisabled.showDialog();
  }

  protected onToggleDisabledConfirm(): void {
    if (!this.selectedQcTest) return;
    const newDisabledState = !this.selectedQcTest.disabled;
    const { id, elementName, observationIntervalName, qcTestTypeName, formattedParameters, ...updateDto } = this.selectedQcTest;
    this.qCTestsCacheService.update(id, { ...updateDto, disabled: newDisabledState }).pipe(
      take(1)
    ).subscribe({
      next: () => {
        const action = newDisabledState ? 'disabled' : 'enabled';
        this.pagesDataService.showToast({ title: 'QC Specification', message: `QC specification ${action}`, type: ToastEventTypeEnum.SUCCESS });
        this.selectedQcTest = null;
      },
      error: err => {
        this.pagesDataService.showToast({ title: 'QC Specification', message: `Error updating QC specification - ${err.message}`, type: ToastEventTypeEnum.ERROR });
      }
    });
  }

}
