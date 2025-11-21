import { Component, OnDestroy, OnInit } from '@angular/core';
import { ViewObservationQueryModel } from 'src/app/data-ingestion/models/view-observation-query.model';
import { ObservationsService } from '../services/observations.service';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';
import { Subject, take, takeUntil } from 'rxjs';
import { CreateObservationModel } from 'src/app/data-ingestion/models/create-observation.model';
import { DeleteObservationModel } from 'src/app/data-ingestion/models/delete-observation.model';
import { IntervalsUtil } from 'src/app/shared/controls/period-input/Intervals.util';
import { PagingParameters } from 'src/app/shared/controls/page-input/paging-parameters';
import { DateUtils } from 'src/app/shared/utils/date.utils';
import { CachedMetadataService } from 'src/app/metadata/metadata-updates/cached-metadata.service';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { ObservationEntry } from 'src/app/observations/models/observation-entry.model';
import { AppAuthInterceptor } from 'src/app/app-auth.interceptor';
import { ValueFlagInputComponent } from 'src/app/observations/value-flag-input/value-flag-input.component';
import { ViewObservationModel } from '../models/view-observation.model';



@Component({
  selector: 'app-data-correction',
  templateUrl: './data-correction.component.html',
  styleUrls: ['./data-correction.component.scss']
})
export class DataCorrectionComponent implements OnInit, OnDestroy {
  protected observationsEntries: ObservationEntry[] = [];
  protected pageInputDefinition: PagingParameters = new PagingParameters();
  protected enableSaveButton: boolean = false;
  protected enableQueryButton: boolean = true;


  protected queryFilter!: ViewObservationQueryModel;
  private allMetadataLoaded: boolean = false;
  protected useUnstackedViewer: boolean = false;
  protected numOfChanges: number = 0;


  private destroy$ = new Subject<void>();

  constructor(
    private pagesDataService: PagesDataService,
    private cachedMetadataSearchService: CachedMetadataService,
    private observationService: ObservationsService,
    private route: ActivatedRoute,
  ) {
    this.pagesDataService.setPageHeader('Data Correction');

    this.cachedMetadataSearchService.allMetadataLoaded.pipe(
      takeUntil(this.destroy$),
    ).subscribe(allMetadataLoaded => {
      if (!allMetadataLoaded) return;
      this.allMetadataLoaded = allMetadataLoaded;
      this.queryData();
    });

  }

  ngOnInit(): void {
    this.route.queryParamMap.subscribe(params => {
      if (params.keys.length === 0) return;

      const stationIds: string[] = params.getAll('stationIds');
      const elementIds: string[] = params.getAll('elementIds');
      const intervals: string[] = params.getAll('intervals');
      const level: string | null = params.get('level');
      const fromDate: string | null = params.get('fromDate');
      const toDate: string | null = params.get('toDate');

      const newQueryFilter: ViewObservationQueryModel = { deleted: false };

      if (stationIds.length > 0) newQueryFilter.stationIds = stationIds;
      if (elementIds.length > 0) newQueryFilter.elementIds = elementIds.map(Number);
      if (intervals.length > 0) newQueryFilter.intervals = intervals.map(Number);
      if (level) newQueryFilter.level = parseInt(level, 10);
      if (fromDate) newQueryFilter.fromDate = fromDate;
      if (toDate) newQueryFilter.toDate = toDate;

      this.queryFilter = newQueryFilter;
      this.queryData();
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  protected get componentName(): string {
    return DataCorrectionComponent.name;
  }

  protected onQueryClick(queryFilter: ViewObservationQueryModel): void {
    // Get the data based on the selection filter
    this.queryFilter = queryFilter;
    this.queryData();
  }

  private queryData(): void {
    if (!(this.allMetadataLoaded && this.queryFilter)) {
      return;
    }

    if (!this.enableQueryButton) return; // This means querying is still in progress. So no need to resend the request.

    console.log('querying data...');

    this.observationsEntries = [];
    this.numOfChanges = 0;
    this.enableSaveButton = false;
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
            this.pagesDataService.showToast({ title: 'Data Correction', message: 'No data', type: ToastEventTypeEnum.INFO });
            this.enableSaveButton = false;
          }
        },
        error: err => {
          this.enableQueryButton = true;
          this.pagesDataService.showToast({ title: 'Data Correction', message: err, type: ToastEventTypeEnum.ERROR });
        },
      });
  }

  protected loadData(): void {
    this.enableQueryButton = false;
    this.enableSaveButton = false;
    this.numOfChanges = 0;
    this.observationsEntries = [];
    this.queryFilter.page = this.pageInputDefinition.page;
    this.queryFilter.pageSize = this.pageInputDefinition.pageSize;

    this.observationService.findProcessed(this.queryFilter).pipe(
      take(1)
    ).subscribe({
      next: data => {
        this.enableQueryButton = true;
        const observationsEntries: ObservationEntry[] = data.map(observation => {
          const stationMetadata = this.cachedMetadataSearchService.getStation(observation.stationId);
          const elementMetadata = this.cachedMetadataSearchService.getElement(observation.elementId);
          const sourceMetadata = this.cachedMetadataSearchService.getSource(observation.sourceId);

          const entry: ObservationEntry = {
            observation: observation,
            confirmAsCorrect: false,
            delete: false,
            change: 'no_change',
            stationName: stationMetadata.name,
            elementAbbrv: elementMetadata.name,
            sourceName: sourceMetadata.name,
            formattedDatetime: DateUtils.getPresentableDatetime(observation.datetime, this.cachedMetadataSearchService.utcOffSet),
            intervalName: IntervalsUtil.getIntervalName(observation.interval),
          }
          return entry;

        });

        this.observationsEntries = observationsEntries;
        this.enableSaveButton = true;
      },
      error: err => {
        this.pagesDataService.showToast({ title: 'Data Correction', message: err, type: ToastEventTypeEnum.ERROR });
        this.enableQueryButton = true;
      },
    });
  }

  protected onOptionsSelected(optionSelected: 'Stack/Unstack' | 'Delete All'): void {
    switch (optionSelected) {
      case 'Stack/Unstack':
        this.useUnstackedViewer = !this.useUnstackedViewer;
        break;
      case 'Delete All':
        for (const entry of this.observationsEntries) {
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
      if (entry.delete || entry.change === 'valid_change' || entry.change === 'invalid_change')
        this.numOfChanges++;
    }
  }

  protected onUserDeleteClick(observationEntry: ObservationEntry) {
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
      } else if (obsEntry.change === 'valid_change') {
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

        // TODO. Show toast message
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
          title: 'Data Correction', message: `${deletedObs.length} observation${deletedObs.length === 1 ? '' : 's'} deleted`, type: ToastEventTypeEnum.SUCCESS
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
    this.observationService.bulkPutDataFromDataCorrection(changedObs).subscribe({
      next: () => {
        this.enableSaveButton = true;
        const obsMessage: string = `${changedObs.length} observation${changedObs.length === 1 ? '' : 's'}`;
        this.pagesDataService.showToast({ title: 'Data Correction', message: `${obsMessage} saved`, type: ToastEventTypeEnum.SUCCESS });
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
      this.pagesDataService.showToast({ title: 'Data Correction', message: `Application is offline`, type: ToastEventTypeEnum.WARNING });
    } else if (err.status === 400) {
      // If there is a bad request error then show the server message
      this.pagesDataService.showToast({ title: 'Data Correction', message: `${err.error.message}`, type: ToastEventTypeEnum.ERROR });
    } else {
      // Log the error for tracing purposes
      console.log('data entry error: ', err);
      this.pagesDataService.showToast({ title: 'Data Correction', message: `Something wrong happened. Contact admin.`, type: ToastEventTypeEnum.ERROR });
    }
  }

}
