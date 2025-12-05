import { Component, OnDestroy } from '@angular/core';
import { ViewObservationQueryModel } from 'src/app/data-ingestion/models/view-observation-query.model';
import { ViewObservationModel } from 'src/app/data-ingestion/models/view-observation.model';
import { ObservationsService } from '../services/observations.service';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';
import { Subject, take, takeUntil } from 'rxjs';
import { DeleteObservationModel } from 'src/app/data-ingestion/models/delete-observation.model';
import { IntervalsUtil } from 'src/app/shared/controls/period-input/Intervals.util';
import { PagingParameters } from 'src/app/shared/controls/page-input/paging-parameters';
import { DateUtils } from 'src/app/shared/utils/date.utils';
import { CachedMetadataService } from 'src/app/metadata/metadata-updates/cached-metadata.service';
import { ObservationEntry } from 'src/app/observations/models/observation-entry.model';
import { AppAuthInterceptor } from 'src/app/app-auth.interceptor';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-deleted-data',
  templateUrl: './deleted-data.component.html',
  styleUrls: ['./deleted-data.component.scss']
})
export class DeletedDataComponent implements OnDestroy {
  protected stationId: string | null = null;
  protected sourceId: number | null = null;
  protected elementId: number | null = null;
  protected interval: number | null = null;
  protected level: number | null = null;
  protected fromDate: string | null = null;
  protected toDate: string | null = null;
  protected hour: number | null = null;
  protected useEntryDate: boolean = false;
  protected observationsEntries: ObservationEntry[] = [];

  protected pageInputDefinition: PagingParameters = new PagingParameters();
  private queryFilter!: ViewObservationQueryModel;
  protected enableSaveButton: boolean = false;
  protected enableQueryButton: boolean = true;
  protected numOfChanges: number = 0;
  protected allBoundariesIndices: number[] = [];
  private utcOffset: number = 0;
  private destroy$ = new Subject<void>();

  constructor(
    private pagesDataService: PagesDataService,
    private cachedMetadataSearchService: CachedMetadataService,
    private observationService: ObservationsService,
  ) {
    this.pagesDataService.setPageHeader('Deleted Data');

    this.cachedMetadataSearchService.allMetadataLoaded.pipe(
      takeUntil(this.destroy$),
    ).subscribe(data => {
      //console.log('cached: ', data)
      if (!data) return;
      this.utcOffset = this.cachedMetadataSearchService.utcOffSet;
      this.queryData();
    });

  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  protected get componentName(): string {
    return DeletedDataComponent.name;
  }

  protected onQueryClick(observationFilter: ViewObservationQueryModel): void {
    // Get the data based on the selection filter
    this.queryFilter = observationFilter;
    this.queryFilter.deleted = true;
    this.queryData();
  }

  private queryData(): void {
    if (!(this.queryFilter && this.utcOffset !== undefined)) {
      return;
    }
    this.observationsEntries = [];
    this.pageInputDefinition.setTotalRowCount(0);
    this.enableQueryButton = false;
    this.observationService.count(this.queryFilter).pipe(
      take(1)
    ).subscribe({
      next: count => {
        this.pageInputDefinition.setTotalRowCount(count);
        if (count > 0) {
          this.loadData();
        } else {
          this.pagesDataService.showToast({ title: 'Delete Data', message: 'No data', type: ToastEventTypeEnum.INFO });
          this.enableSaveButton = false;
        }
      },
      error: err => {
        this.pagesDataService.showToast({ title: 'Delete Data', message: err, type: ToastEventTypeEnum.ERROR });
      },
      complete: () => {
        this.enableQueryButton = true;
      }
    });

  }

  protected loadData(): void {
    this.enableQueryButton = false;
    this.enableSaveButton = false;
    this.numOfChanges = 0;
    this.allBoundariesIndices = [];
    this.observationsEntries = [];
    this.queryFilter.deleted = true;
    this.queryFilter.page = this.pageInputDefinition.page;
    this.queryFilter.pageSize = this.pageInputDefinition.pageSize;
    this.observationService.findProcessed(this.queryFilter).pipe(
      take(1)
    ).subscribe({
      next: data => {
        this.observationsEntries = data.map(observation => {
          const stationMetadata = this.cachedMetadataSearchService.getStation(observation.stationId);
          const elementMetadata = this.cachedMetadataSearchService.getElement(observation.elementId);
          const sourceMetadata = this.cachedMetadataSearchService.getSource(observation.sourceId);

          const entry: ObservationEntry = {
            observation: observation,
            change: 'no_change',
            confirmAsCorrect: false,
            delete: false,
            restore: false,
            hardDelete: false,
            stationName: stationMetadata.name,
            elementAbbrv: elementMetadata.name,
            sourceName: sourceMetadata.name,
            formattedDatetime: DateUtils.getPresentableDatetime(observation.datetime, this.utcOffset),
            intervalName: IntervalsUtil.getIntervalName(observation.interval),
          }

          return entry;
        });

      },
      error: err => {
        this.pagesDataService.showToast({ title: 'Delete Data', message: err, type: ToastEventTypeEnum.ERROR });
      },
      complete: () => {
        this.enableQueryButton = true;
        this.enableSaveButton = true;
      }
    });
  }

  protected onOptionsSelected(optionSlected: 'Restore All' | 'Hard Delete All'): void {
    switch (optionSlected) {
      case 'Restore All':
        this.observationsEntries.forEach(item => { item.restore = true });
        break;
      case 'Hard Delete All':
        this.observationsEntries.forEach(item => { item.hardDelete = true });
        break;
      default:
        throw new Error("Developer error. Option not supported");
    }

    this.onUserInput();
  }

  protected onUserInput() {
    this.numOfChanges = 0;
    for (const obsEntry of this.observationsEntries) {
      if (obsEntry.restore || obsEntry.hardDelete) {
        this.numOfChanges++;
      }
    }
  }

  protected onSave(): void {
    const deletedObs: DeleteObservationModel[] = [];
    const restoredObs: DeleteObservationModel[] = [];
    for (const obsEntry of this.observationsEntries) {
      if (obsEntry.hardDelete) {
        deletedObs.push({
          stationId: obsEntry.observation.stationId,
          elementId: obsEntry.observation.elementId,
          sourceId: obsEntry.observation.sourceId,
          level: obsEntry.observation.level,
          datetime: obsEntry.observation.datetime,
          interval: obsEntry.observation.interval
        });
      } else if (obsEntry.restore) {
        restoredObs.push({
          stationId: obsEntry.observation.stationId,
          elementId: obsEntry.observation.elementId,
          sourceId: obsEntry.observation.sourceId,
          level: obsEntry.observation.level,
          datetime: obsEntry.observation.datetime,
          interval: obsEntry.observation.interval
        });
      }
    }

    if (deletedObs.length > 0) {
      // Requery data only if there are no observation changes. This prevents mutliple requerying.
      this.hardDeleteObservations(deletedObs, restoredObs);
    } else if (restoredObs.length > 0) {
      this.restoreObservations(restoredObs);
    }
  }


  private hardDeleteObservations(deletedObs: DeleteObservationModel[], changedObs: DeleteObservationModel[]): void {
    this.enableSaveButton = false;
    // Send to server for saving
    this.observationService.hardDelete(deletedObs).subscribe({
      next: () => {
        this.enableSaveButton = true;
        this.pagesDataService.showToast({
          title: 'Delete Data', message: `${deletedObs.length} observation${deletedObs.length === 1 ? '' : 's'} hard deleted`, type: ToastEventTypeEnum.SUCCESS
        });

        if (changedObs.length > 0) {
          this.restoreObservations(changedObs);
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

  private restoreObservations(restoredObs: DeleteObservationModel[]): void {
    this.enableSaveButton = false;
    // Send to server for saving
    this.observationService.restore(restoredObs).subscribe({
      next: () => {
        this.enableSaveButton = true;
        const obsMessage: string = `${restoredObs.length} observation${restoredObs.length === 1 ? '' : 's'}`;
        this.pagesDataService.showToast({ title: 'Delete Data', message: `${obsMessage} restored`, type: ToastEventTypeEnum.SUCCESS });
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
      this.pagesDataService.showToast({ title: 'Delete Data', message: `Application is offline`, type: ToastEventTypeEnum.WARNING });
    } else if (err.status === 400) {
      // If there is a bad request error then show the server message
      this.pagesDataService.showToast({ title: 'Delete Data', message: `${err.error.message}`, type: ToastEventTypeEnum.ERROR });
    } else {
      // Log the error for tracing purposes
      console.log('data entry error: ', err);
      this.pagesDataService.showToast({ title: 'Delete Data', message: `Something wrong happened. Contact admin.`, type: ToastEventTypeEnum.ERROR });
    }
  }


}
