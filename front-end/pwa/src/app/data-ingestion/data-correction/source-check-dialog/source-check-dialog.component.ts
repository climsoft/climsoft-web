import { Component, OnDestroy, ViewChild } from '@angular/core';
import { Subject, take } from 'rxjs';
import { ViewObservationQueryModel } from '../../models/view-observation-query.model';
import { SourceCheckDuplicateModel } from '../../models/source-check-duplicate.model';
import { SourceCheckService } from '../../services/source-check.service';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';
import { CachedMetadataService } from 'src/app/metadata/metadata-updates/cached-metadata.service';
import { PagingParameters } from 'src/app/shared/controls/page-input/paging-parameters';
import { IntervalsUtil } from 'src/app/shared/controls/interval-selector/Intervals.util';
import { DateUtils } from 'src/app/shared/utils/date.utils';
import { NumberUtils } from 'src/app/shared/utils/number.utils';
import { DataCorrectorDialogComponent } from '../data-corrector-dialog/data-corrector-dialog.component';

export interface SourceCheckViewModel extends SourceCheckDuplicateModel {
  stationName: string;
  elementAbbrv: string;
  formattedDatetime: string;
  intervalName: string;
}

@Component({
  selector: 'app-source-check-dialog',
  templateUrl: './source-check-dialog.component.html',
  styleUrls: ['./source-check-dialog.component.scss']
})
export class SourceCheckDialogComponent {
  @ViewChild('dlgDataCorrector') dlgDataCorrector!: DataCorrectorDialogComponent;

  protected open = false;
  protected loading = false;
  protected duplicateEntries: SourceCheckViewModel[] = [];
  protected pageInputDefinition: PagingParameters = new PagingParameters();

  private queryFilter!: ViewObservationQueryModel;

  constructor(
    private sourceCheckService: SourceCheckService,
    private pagesDataService: PagesDataService,
    private cachedMetadataSearchService: CachedMetadataService,
  ) {
  }

  public openDialog(filter: ViewObservationQueryModel): void {
    this.open = true;
    this.duplicateEntries = [];
    this.pageInputDefinition = new PagingParameters();
    this.queryFilter = { ...filter };
    this.loadData();
  }

  protected loadData(): void {
    this.loading = true;
    this.duplicateEntries = [];
    this.queryFilter.page = this.pageInputDefinition.page;
    this.queryFilter.pageSize = this.pageInputDefinition.pageSize;

    this.sourceCheckService.count(this.queryFilter).pipe(take(1)).subscribe({
      next: count => {
        this.pageInputDefinition.setTotalRowCount(count);
      },
      error: err => {
        this.pagesDataService.showToast({ title: 'Data Correction', message: err.error?.message || 'Something bad happened', type: ToastEventTypeEnum.ERROR });
      },
    });

    this.sourceCheckService.find(this.queryFilter).pipe(take(1)).subscribe({
      next: data => {
        this.loading = false;
        this.duplicateEntries = data.map(duplicate => {
          const stationMetadata = this.cachedMetadataSearchService.getStation(duplicate.stationId);
          const elementMetadata = this.cachedMetadataSearchService.getElement(duplicate.elementId);

          return {
            ...duplicate,
            stationName: stationMetadata.name,
            elementAbbrv: elementMetadata.name,
            formattedDatetime: DateUtils.getPresentableDatetime(duplicate.datetime, this.cachedMetadataSearchService.utcOffSet),
            intervalName: IntervalsUtil.getIntervalName(duplicate.interval),
          };
        });
      },
      error: err => {
        this.loading = false;
       this.pagesDataService.showToast({ title: 'Data Correction', message: err.error?.message || 'Something bad happened', type: ToastEventTypeEnum.ERROR });
      },
    });

  }

  protected onRowClick(entry: SourceCheckViewModel): void {
    const filter: ViewObservationQueryModel = {
      deleted: false,
      stationIds: [entry.stationId],
      elementIds: [entry.elementId],
      level: entry.level,
      intervals: [entry.interval],
      fromDate: entry.datetime,
      toDate: entry.datetime,
    };

    this.dlgDataCorrector.openDialog(filter);
  }

  protected getRowNumber(currentRowIndex: number): number {
    return NumberUtils.getRowNumber(this.pageInputDefinition.page, this.pageInputDefinition.pageSize, currentRowIndex);
  }
}
