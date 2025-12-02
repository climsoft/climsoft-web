import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ViewObservationQueryModel } from 'src/app/data-ingestion/models/view-observation-query.model';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';
import { Subject, take, takeUntil } from 'rxjs';
import { CreateObservationModel } from 'src/app/data-ingestion/models/create-observation.model';
import { IntervalsUtil } from 'src/app/shared/controls/period-input/Intervals.util';
import { NumberUtils } from 'src/app/shared/utils/number.utils';
import { PagingParameters } from 'src/app/shared/controls/page-input/paging-parameters';
import { DateUtils } from 'src/app/shared/utils/date.utils';
import { CachedMetadataService } from 'src/app/metadata/metadata-updates/cached-metadata.service';
import { HttpErrorResponse } from '@angular/common/http';
import { ObservationsService } from 'src/app/data-ingestion/services/observations.service';
import { QCAssessmentsService } from 'src/app/quality-control/services/qc-assessments.service';
import { QCStatusEnum } from 'src/app/data-ingestion/models/qc-status.enum';
import { DeleteObservationModel } from 'src/app/data-ingestion/models/delete-observation.model';
import { ObservationEntry } from 'src/app/observations/models/observation-entry.model';
import { AppAuthInterceptor } from 'src/app/app-auth.interceptor';
import { QuerySelectionComponent } from 'src/app/observations/query-selection/query-selection.component';
import { PerformQCDialogComponent } from './perform-qc-dialog/perform-qc-dialog.component';

@Component({
  selector: 'app-qc-assessment',
  templateUrl: './qc-assessment.component.html',
  styleUrls: ['./qc-assessment.component.scss']
})
export class QCAssessmentComponent implements OnInit, OnDestroy {
  @ViewChild('querySelection') querySelection!: QuerySelectionComponent;
  @ViewChild('performQCDialog') performQCDialog!: PerformQCDialogComponent;

  protected observationsEntries: ObservationEntry[] = [];
  protected pageInputDefinition: PagingParameters = new PagingParameters();
  protected enableSaveButton: boolean = false;
  protected enableQueryButton: boolean = true;
  protected enablePerformQCButton: boolean = true;
  protected allBoundariesIndices: number[] = [];

  protected queryFilter: ViewObservationQueryModel = { qcStatus: QCStatusEnum.FAILED };
  private allMetadataLoaded: boolean = false;
  protected useUnstackedViewer: boolean = false;
  protected numOfChanges: number = 0;

  private destroy$ = new Subject<void>();

  constructor(
    private pagesDataService: PagesDataService,
    private cachedMetadataSearchService: CachedMetadataService,
    private observationService: ObservationsService,
    private qcAssessmentsService: QCAssessmentsService,
  ) {
    this.pagesDataService.setPageHeader('QC Assessment');

    this.cachedMetadataSearchService.allMetadataLoaded.pipe(
      takeUntil(this.destroy$),
    ).subscribe(allMetadataLoaded => {
      if (!allMetadataLoaded) return;
      this.allMetadataLoaded = allMetadataLoaded;
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
    this.queryFilter = this.querySelection.getFilter(); // TODO. Temporary
    this.queryData();
  }

  protected onShowPerformQCDialog(): void {
    this.queryFilter = this.querySelection.getFilter(); // TODO. Temporary
    this.performQCDialog.showDialog(this.queryFilter)
  }

  protected onQCPerformedClick(): void {
    this.queryData();
  }

  private queryData(): void {
    if (!(this.allMetadataLoaded && this.queryFilter)) {
      return;
    }

    console.log('querying data...');

    this.observationsEntries = [];
    this.numOfChanges = 0;
    this.enableSaveButton = false;
    this.pageInputDefinition.setTotalRowCount(0);
    this.enableQueryButton = false;
    this.enableSaveButton = false;
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
          this.enableSaveButton = true;
          this.pagesDataService.showToast({ title: 'QC Data Checks', message: err, type: ToastEventTypeEnum.ERROR });
        },
      });
  }

  protected loadData(): void {
    this.enableQueryButton = false;
    this.enableSaveButton = false;
    this.observationsEntries = [];
    this.numOfChanges = 0;
    this.allBoundariesIndices = [];
    this.observationsEntries = [];
    this.queryFilter.page = this.pageInputDefinition.page;
    this.queryFilter.pageSize = this.pageInputDefinition.pageSize;

    this.observationService.findProcessed(this.queryFilter).pipe(
      take(1)
    ).subscribe({
      next: data => {
        this.enableQueryButton = true;
        this.enableSaveButton = true;
        const observationsEntries: ObservationEntry[] = data.map(observation => {
          const stationMetadata = this.cachedMetadataSearchService.getStation(observation.stationId);
          const elementMetadata = this.cachedMetadataSearchService.getElement(observation.elementId);
          const sourceMetadata = this.cachedMetadataSearchService.getSource(observation.sourceId);
          const qcTestLogMetadata = observation.qcTestLog ?
            observation.qcTestLog.filter(qcLogItem => qcLogItem.qcStatus == QCStatusEnum.FAILED).map(qcLogItem => {
              return this.cachedMetadataSearchService.getQCTest(qcLogItem.qcTestId);
            }) : [];

          const entry: ObservationEntry = {
            observation: observation,
            confirmAsCorrect: false,
            delete: false,
            change: 'no_change',
            hardDelete: false,
            restore: false,
            stationName: stationMetadata.name,
            elementAbbrv: elementMetadata.name,
            sourceName: sourceMetadata.name,
            formattedDatetime: DateUtils.getPresentableDatetime(observation.datetime, this.cachedMetadataSearchService.utcOffSet),
            intervalName: IntervalsUtil.getIntervalName(observation.interval),
            qcTestsFailed: qcTestLogMetadata,
          }
          return entry;

        });

        this.observationsEntries = observationsEntries;

      },
      error: err => {
        this.pagesDataService.showToast({ title: 'Data Correction', message: err, type: ToastEventTypeEnum.ERROR });
        this.enableQueryButton = true;
        this.enableSaveButton = true;
      },

    });
  }


  protected onOptionsSelected(optionSlected: 'Stack/Unstack' | 'Confirm All' | 'Delete All'): void {
    switch (optionSlected) {
      case 'Stack/Unstack':
        this.useUnstackedViewer = !this.useUnstackedViewer;
        break;
      case 'Confirm All':
        for (const entry of this.observationsEntries) {
          entry.confirmAsCorrect = true;
          entry.delete = false;
        }
        this.numOfChanges = this.observationsEntries.length;
        break;
      case 'Delete All':
        for (const entry of this.observationsEntries) {
          entry.confirmAsCorrect = false;
          entry.delete = true;
        }
        this.numOfChanges = this.observationsEntries.length;
        break;
      default:
        throw new Error("Developer error. Option not supported");
    }
  }

  protected onUserInput() {
    this.numOfChanges = 0;
    for (const entry of this.observationsEntries) {
      if (entry.delete || entry.confirmAsCorrect || entry.change === 'valid_change' || entry.change === 'invalid_change')
        this.numOfChanges++;
    }
  }

  protected onUserDeleteClick(observationEntry: ObservationEntry) {
    observationEntry.delete = !observationEntry.delete;
    this.onUserInput();
  }

  protected onUserConfirmAsCorrectClick(observationEntry: ObservationEntry) {
    observationEntry.delete = !observationEntry.delete;
    this.onUserInput();
  }

  protected onSave(): void {
    const deletedObs: DeleteObservationModel[] = [];
    const changedObs: CreateObservationModel[] = [];
    for (const obsEntry of this.observationsEntries) {
      if (obsEntry.delete) {
        deletedObs.push({
          stationId: obsEntry.observation.stationId,
          elementId: obsEntry.observation.elementId,
          sourceId: obsEntry.observation.sourceId,
          level: obsEntry.observation.level,
          datetime: obsEntry.observation.datetime,
          interval: obsEntry.observation.interval
        });
      } else if (obsEntry.change === 'valid_change' || obsEntry.confirmAsCorrect) {
        changedObs.push({
          stationId: obsEntry.observation.stationId,
          elementId: obsEntry.observation.elementId,
          sourceId: obsEntry.observation.sourceId,
          level: obsEntry.observation.level,
          datetime: obsEntry.observation.datetime,
          interval: obsEntry.observation.interval,
          value: obsEntry.observation.value,
          flag: obsEntry.observation.flag,
          comment: obsEntry.observation.comment
        });
      } else if (obsEntry.change === 'invalid_change') {
        this.pagesDataService.showToast({ title: 'Observations', message: 'Invalid observations detected', type: ToastEventTypeEnum.ERROR });
        return;
      }
    }

    if (deletedObs.length > 0) {
      // Requery data only if there are no observation changes. This prevents mutliple requerying.
      this.deleteObservations(deletedObs, changedObs);
    } else if (changedObs.length > 0) {
      this.updatedObservations(changedObs);
    }
  }

  private deleteObservations(deletedObs: DeleteObservationModel[], changedObs: CreateObservationModel[]): void {
    this.enableSaveButton = false;
    // Send to server for saving
    this.observationService.softDelete(deletedObs).subscribe({
      next: () => {
        this.enableSaveButton = true;
        this.pagesDataService.showToast({
          title: 'QC Assessment', message: `${deletedObs.length} observation${deletedObs.length === 1 ? '' : 's'} deleted`, type: ToastEventTypeEnum.SUCCESS
        });

        if (changedObs.length > 0) {
          this.updatedObservations(changedObs);
        } else {
          this.queryData();
        }
      },
      error: err => {
        this.enableSaveButton = true;
        this.handleError(err);
      },
    });
  }

  private updatedObservations(changedObs: CreateObservationModel[]): void {
    this.enableSaveButton = false;
    // Send to server for saving
    this.observationService.bulkPutDataFromQCAssessment(changedObs).subscribe({
      next: () => {
        this.enableSaveButton = true;
        const obsMessage: string = `${changedObs.length} observation${changedObs.length === 1 ? '' : 's'}`;
        this.pagesDataService.showToast({ title: 'QC Assessment', message: `${obsMessage} saved`, type: ToastEventTypeEnum.SUCCESS });
        this.queryData();
      },
      error: err => {
        this.enableSaveButton = true;
        this.handleError(err);
      },
    });
  }

  private handleError(err: HttpErrorResponse): void {
    if (AppAuthInterceptor.isKnownNetworkError(err)) {
      // If there is network error then save observations as unsynchronised and no need to send data to server
      this.pagesDataService.showToast({ title: 'QC Assessment', message: `Application is offline`, type: ToastEventTypeEnum.WARNING });
    } else if (err.status === 400) {
      // If there is a bad request error then show the server message
      this.pagesDataService.showToast({ title: 'QC Assessment', message: `${err.error.message}`, type: ToastEventTypeEnum.ERROR });
    } else {
      // Log the error for tracing purposes
      console.log('data entry error: ', err);
      this.pagesDataService.showToast({ title: 'QC Assessment', message: `Something wrong happened. Contact admin.`, type: ToastEventTypeEnum.ERROR });
    }
  }

  protected getRowNumber(currentRowIndex: number): number {
    return NumberUtils.getRowNumber(this.pageInputDefinition.page, this.pageInputDefinition.pageSize, currentRowIndex);
  }
}
