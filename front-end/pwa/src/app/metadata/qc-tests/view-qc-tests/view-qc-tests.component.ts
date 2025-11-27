import { Component, OnDestroy, ViewChild } from '@angular/core';
import { Subject, take, takeUntil } from 'rxjs';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';
import { QCTestCacheModel, QCTestsCacheService } from '../services/qc-tests-cache.service';
import { QCTestParameterInputDialogComponent } from '../qc-test-input-dialog/qc-test-input-dialog.component';
import { AppAuthService } from 'src/app/app-auth.service';
import { CachedMetadataService } from '../../metadata-updates/cached-metadata.service';

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
  selector: 'app-view-qc-tests',
  templateUrl: './view-qc-tests.component.html',
  styleUrls: ['./view-qc-tests.component.scss']
})
export class ViewQCTestsComponent implements OnDestroy {
  @ViewChild('dlgQcEdit') appQCEditDialog!: QCTestParameterInputDialogComponent;

  protected elementQCTestParams!: ElementQCTestView[];
  protected searchedIds!: number[];

  protected dropDownItems: OptionEnum[] = [];
  protected optionTypeEnum: typeof OptionEnum = OptionEnum;
  protected isSystemAdmin: boolean = false;

  private destroy$ = new Subject<void>();

  constructor(
    private pagesDataService: PagesDataService,
    private appAuthService: AppAuthService,
    private cachedMetadataService: CachedMetadataService,
    private elementsQCTestsCacheService: QCTestsCacheService,) {

    this.pagesDataService.setPageHeader('QC Tests');

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
      this.elementQCTestParams = this.cachedMetadataService.qcTestsMetadata.map(qcTest => {
        const element = this.cachedMetadataService.elementsMetadata.find(item => item.id === qcTest.elementId);
        return { ...qcTest, elementName: element ? element.name : '' };
      });
    });

  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  protected onSearchInput(searchedIds: number[]): void {
    this.searchedIds = searchedIds;
    const qcTestsCache = this.searchedIds && this.searchedIds.length > 0 ?
      this.cachedMetadataService.qcTestsMetadata.filter(item => this.searchedIds.includes(item.id)) : this.cachedMetadataService.qcTestsMetadata;

    this.elementQCTestParams = qcTestsCache.map(qcTest => {
      const element = this.cachedMetadataService.elementsMetadata.find(item => item.id === qcTest.elementId);
      return { ...qcTest, elementName: element ? element.name : '' };
    });
  }

  protected onOptionsClicked(option: OptionEnum) {
    switch (option) {
      case OptionEnum.SORT_BY_QC_NAME:
        this.elementQCTestParams.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case OptionEnum.SORT_BY_ELEMENT_ID:
        this.elementQCTestParams.sort((a, b) => a.elementId - b.elementId);
        break;
      case OptionEnum.SORT_BY_ELEMENT_NAME:
        this.elementQCTestParams.sort((a, b) => a.elementName.localeCompare(b.elementName));
        break;
      case OptionEnum.SORT_BY_QC_TYPE:
        this.elementQCTestParams.sort((a, b) => a.qcTestTypeName.localeCompare(b.qcTestTypeName));
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




}
