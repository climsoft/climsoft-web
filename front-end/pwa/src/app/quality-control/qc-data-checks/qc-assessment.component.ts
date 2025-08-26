import { Component, OnDestroy, OnInit } from '@angular/core';
import { ViewObservationQueryModel } from 'src/app/data-ingestion/models/view-observation-query.model';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';
import { Subject, take, takeUntil } from 'rxjs';
import { CreateObservationModel } from 'src/app/data-ingestion/models/create-observation.model';
import { IntervalsUtil } from 'src/app/shared/controls/period-input/Intervals.util';
import { NumberUtils } from 'src/app/shared/utils/number.utils';
import { PagingParameters } from 'src/app/shared/controls/page-input/paging-parameters';
import { DateUtils } from 'src/app/shared/utils/date.utils';
import { CachedMetadataSearchService } from 'src/app/metadata/metadata-updates/cached-metadata-search.service';
import { HttpErrorResponse } from '@angular/common/http';
import { ObservationDefinition } from 'src/app/data-ingestion/form-entry/defintitions/observation.definition';
import { ObservationsService } from 'src/app/data-ingestion/services/observations.service';
import { QualityControlService } from 'src/app/data-ingestion/services/quality-control.service';
import { QCTestCacheModel } from 'src/app/metadata/qc-tests/services/qc-tests-cache.service';
import { QCStatusEnum } from 'src/app/data-ingestion/models/qc-status.enum';
import { DeleteObservationModel } from 'src/app/data-ingestion/models/delete-observation.model';

interface ObservationEntry {
  obsDef: ObservationDefinition;
  confirmAsCorrect: boolean;
  delete: boolean;
  stationName: string;
  elementAbbrv: string;
  sourceName: string;
  formattedDatetime: string;
  intervalName: string;
  qcTestLog: QCTestCacheModel[];
}

@Component({
  selector: 'app-qc-assessment',
  templateUrl: './qc-assessment.component.html',
  styleUrls: ['./qc-assessment.component.scss']
})
export class QCAssessmentComponent implements OnInit, OnDestroy {
  protected observationsEntries: ObservationEntry[] = [];
  protected pageInputDefinition: PagingParameters = new PagingParameters();
  protected enableSaveButton: boolean = false;
  protected enableQueryButton: boolean = true;
  protected enablePerformQCButton: boolean = true;
  protected numOfChanges: number = 0;
  protected allBoundariesIndices: number[] = [];
  private utcOffset: number = 0;

  protected queryFilter!: ViewObservationQueryModel;
  private allMetadataLoaded: boolean = false;
  protected useUnstackedViewer: boolean = false;

  private destroy$ = new Subject<void>();

  constructor(
    private pagesDataService: PagesDataService,
    private cachedMetadataSearchService: CachedMetadataSearchService,
    private observationService: ObservationsService,
    private qualityControlService: QualityControlService, 
  ) {
    this.pagesDataService.setPageHeader('QC Assessment');

    this.cachedMetadataSearchService.allMetadataLoaded.pipe(
      takeUntil(this.destroy$),
    ).subscribe(allMetadataLoaded => {
      this.allMetadataLoaded = allMetadataLoaded;
      if (allMetadataLoaded) {
        this.utcOffset = this.cachedMetadataSearchService.getUTCOffSet();
      }
      this.queryData();
    });
  }

  ngOnInit(): void {

  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  protected get componentName(): string {
    return QCAssessmentComponent.name;
  }

  protected onQueryQCClick(queryFilter: ViewObservationQueryModel): void {
    // Get the data based on the selection filter
    this.queryFilter = queryFilter;
    this.queryData();
  }

  protected onPerformQCClick(qcSelection: ViewObservationQueryModel): void {
    if (!qcSelection.fromDate) {
      this.pagesDataService.showToast({ title: 'QC Assessment', message: 'From date selection required', type: ToastEventTypeEnum.ERROR });
      return;
    }

    if (!qcSelection.toDate) {
      this.pagesDataService.showToast({ title: 'QC Assessment', message: 'To date selection required', type: ToastEventTypeEnum.ERROR });
      return;
    }

    if (this.isMoreThanTenCalendarYears(new Date(qcSelection.fromDate), new Date(qcSelection.toDate))) {
      this.pagesDataService.showToast({ title: 'QC Assessment', message: 'Date range exceeds 10 years', type: ToastEventTypeEnum.ERROR });
      return;
    }

    this.enablePerformQCButton = false;
    this.qualityControlService.performQC(qcSelection).pipe(take(1)).subscribe({
      next: data => {
        this.enablePerformQCButton = true;

        if (data.qcFails > 0) {
          this.pagesDataService.showToast({ title: 'QC Assessment', message: `${data.qcFails} observations failed qc tests`, type: ToastEventTypeEnum.WARNING });
        } else {
          // Note. The message here is deliberate because it could be there are observations that have failed qc but the new perform may have skipped
          // them because of the selection criteria
          this.pagesDataService.showToast({ title: 'QC Assessment', message: `No observation failed qc tests`, type: ToastEventTypeEnum.SUCCESS });
        }
      }, error: err => {
        this.enablePerformQCButton = true;
        if (err instanceof HttpErrorResponse) {
          this.pagesDataService.showToast({ title: 'QC Assessment', message: err.error.message, type: ToastEventTypeEnum.ERROR });
        } else {
          this.pagesDataService.showToast({ title: 'QC Assessment', message: 'Something bad happened', type: ToastEventTypeEnum.ERROR });
        }

      }
    });
  }

  private isMoreThanTenCalendarYears(fromDate: Date, toDate: Date): boolean {
    const tenYearsLater = new Date(fromDate);
    tenYearsLater.setFullYear(tenYearsLater.getFullYear() + 11);
    return toDate > tenYearsLater;
  }

  private queryData(): void {
    if (!(this.allMetadataLoaded && this.queryFilter && this.utcOffset !== undefined)) {
      return;
    }

    console.log('querying data...');

    this.observationsEntries = [];
    this.pageInputDefinition.setTotalRowCount(0);
    this.enableQueryButton = false;
    this.observationService.count(this.queryFilter).pipe(take(1)).subscribe(
      {
        next: count => {
          this.enableQueryButton = true;
          this.pageInputDefinition.setTotalRowCount(count);
          if (count > 0) {
            this.loadData();
          } else {
            this.enableSaveButton = false;
            this.pagesDataService.showToast({ title: 'QC Data Checks', message: 'No data', type: ToastEventTypeEnum.INFO });
          }

        },
        error: err => {
          this.enableQueryButton = true;
          this.pagesDataService.showToast({ title: 'QC Data Checks', message: err, type: ToastEventTypeEnum.ERROR });
        },
      });
  }

  protected loadData(): void {
    this.enableQueryButton = false;
    this.enableSaveButton = false;
    this.numOfChanges = 0;
    this.allBoundariesIndices = [];
    this.observationsEntries = [];
    this.queryFilter.page = this.pageInputDefinition.page;
    this.queryFilter.pageSize = this.pageInputDefinition.pageSize;

    this.observationService.findProcessed(this.queryFilter).pipe(
      take(1)
    ).subscribe({
      next: data => {
        const observationsEntries: ObservationEntry[] = data.map(observation => {
          const stationMetadata = this.cachedMetadataSearchService.getStation(observation.stationId);
          const elementMetadata = this.cachedMetadataSearchService.getElement(observation.elementId);
          const sourceMetadata = this.cachedMetadataSearchService.getSource(observation.sourceId);
          const qcTestLogMetadata = observation.qcTestLog ?
            observation.qcTestLog.filter(qcLogItem => qcLogItem.qcStatus == QCStatusEnum.FAILED).map(qcLogItem => {
              return this.cachedMetadataSearchService.getQCTest(qcLogItem.qcTestId);
            }) : [];

          const entry: ObservationEntry = {
            obsDef: new ObservationDefinition(this.cachedMetadataSearchService, observation, false),
            confirmAsCorrect: false,
            delete: false,
            stationName: stationMetadata.name,
            elementAbbrv: elementMetadata.name,
            sourceName: sourceMetadata.name,
            formattedDatetime: DateUtils.getPresentableDatetime(observation.datetime, this.utcOffset),
            intervalName: IntervalsUtil.getIntervalName(observation.interval),
            qcTestLog: qcTestLogMetadata,
          }
          return entry;

        });

        this.observationsEntries = observationsEntries;
        this.enableQueryButton = true;
        this.enableSaveButton = true;
      },
      error: err => {
        this.pagesDataService.showToast({ title: 'Data Correction', message: err, type: ToastEventTypeEnum.ERROR });
        this.enableQueryButton = true;
      },

    });
  }


  protected onOptionsSelected(optionSlected: 'Stack/Unstack' | 'Confirm All' | 'Delete All'): void {
    switch (optionSlected) {
      case 'Stack/Unstack':
        this.useUnstackedViewer = !this.useUnstackedViewer;
        break;
      case 'Confirm All':
        this.observationsEntries.forEach(item => { item.confirmAsCorrect = true; });
        this.onUserInput();
        break;
      case 'Delete All':
        this.observationsEntries.forEach(item => { item.delete = true; });
        this.onUserInput();
        break;
      default:
        throw new Error("Developer error. Option not supported");
    }
  }

  protected onUserInput() {
    this.numOfChanges = 0;
    for (const obsEntry of this.observationsEntries) {
      if (obsEntry.confirmAsCorrect || obsEntry.delete || obsEntry.obsDef.observationChanged) {
        this.numOfChanges++;
      }
    }
  }

  protected onSave(): void {
    this.deleteObservations();
    this.updatedObservations();
  }

  private deleteObservations(): void {
    // Create required observation dtos 
    const deletedObs: DeleteObservationModel[] = [];
    for (const obsEntry of this.observationsEntries) {
      if (obsEntry.delete) {
        const obsModel = obsEntry.obsDef.observation;
        deletedObs.push({
          stationId: obsModel.stationId,
          elementId: obsModel.elementId,
          sourceId: obsModel.sourceId,
          level: obsModel.level,
          datetime: obsModel.datetime,
          interval: obsModel.interval
        })
      }
    }


    if (deletedObs.length === 0) {
      return;
    }

    this.enableSaveButton = false;
    // Send to server for saving
    this.observationService.softDelete(deletedObs).subscribe({
      next: data => {
        this.enableSaveButton = true;
        if (data) {
          this.pagesDataService.showToast({
            title: 'QC Assessment', message: `${deletedObs.length} observation${deletedObs.length === 1 ? '' : 's'} deleted`, type: ToastEventTypeEnum.SUCCESS
          });

          this.queryData();
        } else {
          this.pagesDataService.showToast({
            title: 'QC Assessment', message: `${deletedObs.length} observation${deletedObs.length === 1 ? '' : 's'} NOT deleted`, type: ToastEventTypeEnum.ERROR
          });
        }
      },
      error: err => {
        this.enableSaveButton = true;
        // Important to log the error for tracing purposes
        console.log('error logged: ', err);
        this.pagesDataService.showToast({ title: 'QC Assessment', message: err, type: ToastEventTypeEnum.ERROR });
      },
    });
  }

  private updatedObservations(): void {
    // Create required observation dtos 
    const changedObs: CreateObservationModel[] = [];
    for (const obsEntry of this.observationsEntries) {
      // Get observation entries that have not been deleted  or whose value has been changed or confirmed as correct
      if (!obsEntry.delete && (obsEntry.confirmAsCorrect || obsEntry.obsDef.observationChanged)) {
        const obsModel = obsEntry.obsDef.observation;
        changedObs.push({
          stationId: obsModel.stationId,
          elementId: obsModel.elementId,
          sourceId: obsModel.sourceId,
          level: obsModel.level,
          datetime: obsModel.datetime,
          interval: obsModel.interval,
          value: obsModel.value,
          flag: obsModel.flag,
          comment: obsModel.comment
        })
      }
    }


    if (changedObs.length === 0) {
      return;
    }

    this.enableSaveButton = false;
    // Send to server for saving
    this.observationService.bulkPutDataFromQCAssessment(changedObs).subscribe({
      next: response => {
        const obsMessage: string = `${changedObs.length} observation${changedObs.length === 1 ? '' : 's'}`;
        if (response.message === 'success') {
          this.pagesDataService.showToast({
            title: 'QC Assessment', message: `${obsMessage} saved`, type: ToastEventTypeEnum.SUCCESS
          });

          this.queryData();
        } else {
          this.pagesDataService.showToast({
            title: 'QC Assessment', message: `Something wrong happened. ${obsMessage} NOT saved`, type: ToastEventTypeEnum.ERROR
          });
        }

      },
      error: err => {
        this.enableSaveButton = true;
        // Important to log the error for tracing purposes
        console.log('error logged: ', err);

        if (err instanceof HttpErrorResponse) {
          if (err.status === 0) {
            // If there is network error then save observations as unsynchronised and no need to send data to server
            this.pagesDataService.showToast({
              title: 'QC Assessment', message: `Application is offline`, type: ToastEventTypeEnum.WARNING
            });
          } else if (err.status === 400) {
            // If there is a bad request error then show the server message
            this.pagesDataService.showToast({
              title: 'QC Assessment', message: `Invalid data. ${err.error.message}`, type: ToastEventTypeEnum.ERROR
            });
          } else {
            this.pagesDataService.showToast({
              title: 'QC Assessment', message: `Something wrong happened. Contact admin.`, type: ToastEventTypeEnum.ERROR
            });
          }
        } else {
          this.pagesDataService.showToast({
            title: 'QC Assessment', message: `Unknown server error. Contact admin.`, type: ToastEventTypeEnum.ERROR
          });
        }

      },
    });
  }

  protected getRowNumber(currentRowIndex: number): number {
    return NumberUtils.getRowNumber(this.pageInputDefinition.page, this.pageInputDefinition.pageSize, currentRowIndex);
  }
}
