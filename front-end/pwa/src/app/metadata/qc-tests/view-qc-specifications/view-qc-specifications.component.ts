import { Component, OnDestroy, ViewChild } from '@angular/core';
import { Subject, take, takeUntil } from 'rxjs';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';
import { QCTestCacheModel, QCTestsCacheService } from '../services/qc-tests-cache.service';
import { QCSpecificationInputDialogComponent } from '../qc-test-input-dialog/qc-specification-input-dialog.component';
import { AppAuthService } from 'src/app/app-auth.service';
import { CachedMetadataService } from '../../metadata-updates/cached-metadata.service';
import { DeleteConfirmationDialogComponent } from 'src/app/shared/controls/delete-confirmation-dialog/delete-confirmation-dialog.component';
import { ToggleDisabledConfirmationDialogComponent } from 'src/app/shared/controls/toggle-disabled-confirmation-dialog/toggle-disabled-confirmation-dialog.component';

interface ElementQCTestView extends QCTestCacheModel {
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

  protected qCTestParams!: ElementQCTestView[];
  protected searchedIds: number[] = [];
  protected selectedQcTest: ElementQCTestView | null = null;

  protected dropDownItems: OptionEnum[] = [];
  protected optionTypeEnum: typeof OptionEnum = OptionEnum;
  protected isSystemAdmin: boolean = false;

  private destroy$ = new Subject<void>();

  constructor(
    private pagesDataService: PagesDataService,
    private appAuthService: AppAuthService,
    private cachedMetadataService: CachedMetadataService,
    private elementsQCTestsCacheService: QCTestsCacheService,) {

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

    this.cachedMetadataService.allMetadataLoaded.pipe(
      takeUntil(this.destroy$),
    ).subscribe(allMetadataLoaded => {
      if (!allMetadataLoaded) return;
      this.filterSearchedIds();
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
    const qcTestsCache = this.searchedIds && this.searchedIds.length > 0 ?
      this.cachedMetadataService.qcTestsMetadata.filter(item => this.searchedIds.includes(item.elementId)) : this.cachedMetadataService.qcTestsMetadata;

    this.qCTestParams = qcTestsCache.map(qcTest => {
      const element = this.cachedMetadataService.elementsMetadata.find(item => item.id === qcTest.elementId);
      return { ...qcTest, elementName: element ? element.name : '' };
    });
  }

  protected onOptionsClicked(option: OptionEnum) {
    switch (option) {
      case OptionEnum.SORT_BY_QC_NAME:
        this.qCTestParams.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case OptionEnum.SORT_BY_ELEMENT_ID:
        this.qCTestParams.sort((a, b) => a.elementId - b.elementId);
        break;
      case OptionEnum.SORT_BY_ELEMENT_NAME:
        this.qCTestParams.sort((a, b) => a.elementName.localeCompare(b.elementName));
        break;
      case OptionEnum.SORT_BY_QC_TYPE:
        this.qCTestParams.sort((a, b) => a.qcTestTypeName.localeCompare(b.qcTestTypeName));
        break;
      case OptionEnum.DELETE_ALL:
        this.elementsQCTestsCacheService.deleteAll().pipe(
          take(1),
        ).subscribe(() => {
          this.pagesDataService.showToast({ title: 'QC Tests Deleted', message: 'All QC tests deleted', type: ToastEventTypeEnum.SUCCESS });
        });
        return;
      default:
        throw new Error('Developer error, option not supported');
    }

  }

  protected onDeleteClick(qcTest: ElementQCTestView, event: Event): void {
    event.stopPropagation();
    this.selectedQcTest = qcTest;
    this.dlgDeleteConfirm.showDialog();
  }

  protected onDeleteConfirm(): void {
    if (!this.selectedQcTest) return;
    this.elementsQCTestsCacheService.delete(this.selectedQcTest.id).pipe(
      take(1)
    ).subscribe(() => {
      this.pagesDataService.showToast({ title: 'QC Specification', message: 'QC specification deleted', type: ToastEventTypeEnum.SUCCESS });
      this.selectedQcTest = null;
    });
  }

  protected onToggleDisabledClick(qcTest: ElementQCTestView, event: Event): void {
    event.stopPropagation();
    this.selectedQcTest = qcTest;
    this.dlgToggleDisabled.showDialog();
  }

  protected onToggleDisabledConfirm(): void {
    if (!this.selectedQcTest) return;
    const newDisabledState = !this.selectedQcTest.disabled;
    const { id, elementName, observationIntervalName, qcTestTypeName, formattedParameters, ...updateDto } = this.selectedQcTest;
    this.elementsQCTestsCacheService.update(id, { ...updateDto, disabled: newDisabledState }).pipe(
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
