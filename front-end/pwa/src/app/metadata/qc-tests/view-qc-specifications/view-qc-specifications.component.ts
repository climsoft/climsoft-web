import { Component, OnDestroy, ViewChild } from '@angular/core';
import { Subject, take, takeUntil } from 'rxjs';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';
import { QCTestCacheModel, QCTestsCacheService } from '../services/qc-tests-cache.service';
import { QCSpecificationInputDialogComponent } from '../qc-test-input-dialog/qc-specification-input-dialog.component';
import { AppAuthService } from 'src/app/app-auth.service';
import { DeleteConfirmationDialogComponent } from 'src/app/shared/controls/delete-confirmation-dialog/delete-confirmation-dialog.component';
import { ToggleDisabledConfirmationDialogComponent } from 'src/app/shared/controls/toggle-disabled-confirmation-dialog/toggle-disabled-confirmation-dialog.component';
import { ElementsCacheService } from '../../elements/services/elements-cache.service';
import { CreateViewElementModel } from '../../elements/models/create-view-element.model';

interface ElementQCSpecView extends QCTestCacheModel {
  elementName: string;
}

enum OptionEnum {
  SORT_BY_QC_NAME = 'Sort by QC Name',
  SORT_BY_ELEMENT_ID = 'Sort by Element Id',
  SORT_BY_ELEMENT_NAME = 'Sort by Element Name',
  SORT_BY_QC_TYPE = 'Sort by QC Type',
  DELETE_ALL = 'Delete All',
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


  protected allQCSpecifications: ElementQCSpecView[] = [];
  protected qCSpecifications: ElementQCSpecView[] = [];
  protected searchedIds: number[] = [];
  protected selectedQcTest: ElementQCSpecView | null = null;

  protected dropDownItems: OptionEnum[] = [];
  protected optionTypeEnum: typeof OptionEnum = OptionEnum;
  protected isSystemAdmin: boolean = false;

  private destroy$ = new Subject<void>();

  constructor(
    private pagesDataService: PagesDataService,
    private appAuthService: AppAuthService,
    private elementsCacheService: ElementsCacheService,
    private qCTestsCacheService: QCTestsCacheService,) {

    this.pagesDataService.setPageHeader('QC Specifications');

    // Check on allowed options
    this.appAuthService.user.pipe(
      takeUntil(this.destroy$),
    ).subscribe(user => {
      if (!user) return;
      this.isSystemAdmin = user.isSystemAdmin;
      this.dropDownItems = [OptionEnum.SORT_BY_QC_NAME, OptionEnum.SORT_BY_ELEMENT_ID, OptionEnum.SORT_BY_ELEMENT_NAME, OptionEnum.SORT_BY_QC_TYPE];
      if (this.isSystemAdmin) {
        this.dropDownItems.push(OptionEnum.DELETE_ALL)
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
  }

  protected onOptionsClicked(option: OptionEnum) {
    switch (option) {
      case OptionEnum.SORT_BY_QC_NAME:
        this.qCSpecifications.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case OptionEnum.SORT_BY_ELEMENT_ID:
        this.qCSpecifications.sort((a, b) => a.elementId - b.elementId);
        break;
      case OptionEnum.SORT_BY_ELEMENT_NAME:
        this.qCSpecifications.sort((a, b) => a.elementName.localeCompare(b.elementName));
        break;
      case OptionEnum.SORT_BY_QC_TYPE:
        this.qCSpecifications.sort((a, b) => a.qcTestTypeName.localeCompare(b.qcTestTypeName));
        break;
      case OptionEnum.DELETE_ALL:
        this.qCTestsCacheService.deleteAll().pipe(
          take(1),
        ).subscribe(() => {
          this.pagesDataService.showToast({ title: 'QC Tests Deleted', message: 'All QC tests deleted', type: ToastEventTypeEnum.SUCCESS });
        });
        return;
      default:
        throw new Error('Developer error, option not supported');
    }

  }

  protected onDeleteClick(qcTest: ElementQCSpecView, event: Event): void {
    event.stopPropagation();
    this.selectedQcTest = qcTest;
    this.dlgDeleteConfirm.showDialog();
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
