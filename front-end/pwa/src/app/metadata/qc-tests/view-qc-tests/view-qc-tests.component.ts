import { Component, OnDestroy, ViewChild } from '@angular/core';
import { Subject, take, takeUntil } from 'rxjs';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';
import { QCTestCacheModel, QCTestsCacheService } from '../services/qc-tests-cache.service';
import { ElementCacheModel, ElementsCacheService } from '../../elements/services/elements-cache.service';
import { QCTestParameterInputDialogComponent } from '../qc-test-input-dialog/qc-test-parameter-input-dialog.component';

interface ElementQCTestView extends QCTestCacheModel {
  elementName: string;
}

@Component({
  selector: 'app-view-qc-tests',
  templateUrl: './view-qc-tests.component.html',
  styleUrls: ['./view-qc-tests.component.scss']
})
export class ViewQCTestsComponent implements OnDestroy {
  @ViewChild('dlgQcEdit') appQCEditDialog!: QCTestParameterInputDialogComponent;

  protected elementQCTestParams!: ElementQCTestView[];
  protected elements!: ElementCacheModel[];

  private destroy$ = new Subject<void>();

  constructor(
    private pagesDataService: PagesDataService,
    private elementsQCTestsCacheService: QCTestsCacheService,
    private elementsCacheService: ElementsCacheService) {

    this.pagesDataService.setPageHeader('QC Tests');

    this.elementsCacheService.cachedElements.pipe(
      takeUntil(this.destroy$),
    ).subscribe(data => {
      this.elements = data;
      this.setElementNames();
    });

    // Get all sources 
    this.elementsQCTestsCacheService.cachedElementsQcTests.pipe(
      takeUntil(this.destroy$),
    ).subscribe(data => {
      this.elementQCTestParams = data.map(item => { return { ...item, elementName: '' } });
      this.setElementNames();
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setElementNames(): void {
    if (!this.elements || !this.elementQCTestParams) return;
    this.elementQCTestParams.forEach(elementQCTestParam => {
      const element = this.elements.find(item => item.id === elementQCTestParam.elementId);
      if (element) elementQCTestParam.elementName = element.name;
    });
  }

  protected onOptionsClicked(option: 'Add' | 'Order By Name' | 'Order By Element Id' | 'Order By Element Name' | 'Delete All') {
    switch (option) {
      case 'Add':
        this.appQCEditDialog.openDialog();
        break;
      case 'Order By Name':
        this.elementQCTestParams = [...this.elementQCTestParams].sort((a, b) => a.name.localeCompare(b.name));
        break; 
      case 'Order By Element Id':
        this.elementQCTestParams = [...this.elementQCTestParams].sort((a, b) => a.elementId - b.elementId);
        break;
      case 'Order By Element Name':
        this.elementQCTestParams = [...this.elementQCTestParams].sort((a, b) => a.elementName.localeCompare(b.elementName));
        break;
      case 'Delete All':
        this.elementsQCTestsCacheService.deleteAll().pipe(
          take(1)
        ).subscribe(data => {
          this.pagesDataService.showToast({ title: "QC Tests Deleted", message: `All QC tests deleted`, type: ToastEventTypeEnum.SUCCESS });
        });
        return;
      default:
        throw new Error('Developer error, option not supported');
    }

  }




}
