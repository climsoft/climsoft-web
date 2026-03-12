import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ViewObservationQueryModel } from 'src/app/data-ingestion/models/view-observation-query.model';
import { ObservationsService } from '../services/observations.service';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';
import { Subject, take, takeUntil } from 'rxjs';
import { CreateObservationModel } from 'src/app/data-ingestion/models/create-observation.model';
import { DeleteObservationModel } from 'src/app/data-ingestion/models/delete-observation.model';
import { IntervalsUtil } from 'src/app/shared/controls/interval-selector/Intervals.util';
import { PagingParameters } from 'src/app/shared/controls/page-input/paging-parameters';
import { DateUtils } from 'src/app/shared/utils/date.utils';
import { CachedMetadataService } from 'src/app/metadata/metadata-updates/cached-metadata.service';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { ObservationEntry } from 'src/app/observations/models/observation-entry.model';
import { AppAuthInterceptor } from 'src/app/app-auth.interceptor';
import { DeleteConfirmationDialogComponent } from 'src/app/shared/controls/delete-confirmation-dialog/delete-confirmation-dialog.component';

@Component({
  selector: 'app-data-correction',
  templateUrl: './data-correction.component.html',
  styleUrls: ['./data-correction.component.scss']
})
export class DataCorrectionComponent implements OnInit, OnDestroy {
  @ViewChild('dlgDeleteAllConfirm') dlgDeleteAllConfirm!: DeleteConfirmationDialogComponent;

  protected observationsEntries: ObservationEntry[] = [];
  protected pageInputDefinition: PagingParameters = new PagingParameters();
  protected enableSaveButton: boolean = false;
  protected enableQueryButton: boolean = true;
  protected loading: boolean = false;
  protected saveConfirmOpen: boolean = false;
  protected saveSummary: { updatedCount: number; deletedCount: number } = { updatedCount: 0, deletedCount: 0 };

  protected queryFilter!: ViewObservationQueryModel;
  private allMetadataLoaded: boolean = false;
  protected useUnstackedViewer: boolean = false;
  protected changedCount: number = 0;

  private destroy$ = new Subject<void>();

  constructor(
    private pagesDataService: PagesDataService,
    private cachedMetadataSearchService: CachedMetadataService,
    private observationService: ObservationsService,
    private route: ActivatedRoute,
  ) {
    this.pagesDataService.setPageHeader('Data Correction');
  }

  ngOnInit(): void {
    this.route.queryParamMap.subscribe(params => {

      this.cachedMetadataSearchService.allMetadataLoaded.pipe(
        takeUntil(this.destroy$),
      ).subscribe(allMetadataLoaded => {
        if (!allMetadataLoaded) return;
        this.allMetadataLoaded = allMetadataLoaded;

        const newQueryFilter: ViewObservationQueryModel = { deleted: false };

        if (params.keys.length > 0) {
          const stationIds: string[] = params.getAll('stationIds');
          const elementIds: string[] = params.getAll('elementIds');
          const intervals: string[] = params.getAll('intervals');
          const level: string | null = params.get('level');
          const fromDate: string | null = params.get('fromDate');
          const toDate: string | null = params.get('toDate');

          if (stationIds.length > 0) newQueryFilter.stationIds = stationIds;
          if (elementIds.length > 0) newQueryFilter.elementIds = elementIds.map(Number);
          if (intervals.length > 0) newQueryFilter.intervals = intervals.map(Number);
          if (level) newQueryFilter.level = parseInt(level, 10);
          if (fromDate) newQueryFilter.fromDate = fromDate;
          if (toDate) newQueryFilter.toDate = toDate;
        } else {
          const toDate: Date = new Date();
          const fromDate: Date = new Date();
          fromDate.setDate(toDate.getDate() - 1);

          newQueryFilter.level = 0;
          newQueryFilter.fromDate = DateUtils.getDatetimesBasedOnUTCOffset(fromDate.toISOString(), this.cachedMetadataSearchService.utcOffSet, 'subtract');
          newQueryFilter.toDate = DateUtils.getDatetimesBasedOnUTCOffset(toDate.toISOString(), this.cachedMetadataSearchService.utcOffSet, 'subtract');
        }

        this.queryFilter = newQueryFilter;
        this.loadData();
      });

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
    this.loadData();
  }

  protected loadData(): void {
    if (!(this.allMetadataLoaded && this.queryFilter)) {
      return;
    }

    this.enableQueryButton = false;
    this.enableSaveButton = false;
    this.changedCount = 0;
    this.observationsEntries = [];
    this.loading = true;
    this.queryFilter.page = this.pageInputDefinition.page;
    this.queryFilter.pageSize = this.pageInputDefinition.pageSize;

    this.observationService.count(this.queryFilter).pipe(
      take(1)
    ).subscribe(
      {
        next: count => {
          this.enableQueryButton = true;
          this.pageInputDefinition.setTotalRowCount(count);
        },
        error: err => {
          this.enableQueryButton = true;
          this.pagesDataService.showToast({ title: 'Data Correction', message: err.error?.message || 'Something bad happened', type: ToastEventTypeEnum.ERROR });
        },
      });

    this.observationService.findProcessed(this.queryFilter).pipe(
      take(1)
    ).subscribe({
      next: data => {
        this.loading = false;
        this.enableQueryButton = true;
        this.enableSaveButton = true;
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

      },
      error: err => {
        this.loading = false;
        this.enableQueryButton = true;
        this.enableSaveButton = false;
        this.pagesDataService.showToast({ title: 'Data Correction', message: err.error?.message || 'Something bad happened', type: ToastEventTypeEnum.ERROR });
      },
    });
  }

  protected stackToggle(): void {
    this.useUnstackedViewer = !this.useUnstackedViewer;
  }

  protected deleteAll(): void {
    this.dlgDeleteAllConfirm.openDialog();
  }

  protected onDeleteAllConfirm(): void {
    for (const entry of this.observationsEntries) {
      entry.delete = true;
    }
    this.changedCount = this.observationsEntries.length;
  }

  protected onUserInput() {
    this.changedCount = 0;
    for (const entry of this.observationsEntries) {
      if (entry.delete || entry.change === 'valid_change' || entry.change === 'invalid_change')
        this.changedCount++;
    }
  }

  protected onUserDeleteClick(observationEntry: ObservationEntry) {
    observationEntry.delete = !observationEntry.delete;
    this.onUserInput();
  }

  protected onSave(): void {
    // Check for invalid changes first
    for (const obsEntry of this.observationsEntries) {
      if (obsEntry.change === 'invalid_change') {
        this.pagesDataService.showToast({ title: 'Data Correction', message: 'Some entries have invalid changes. Please fix them before submitting.', type: ToastEventTypeEnum.ERROR });
        return;
      }
    }

    let updatedCount = 0;
    let deletedCount = 0;
    for (const obsEntry of this.observationsEntries) {
      if (obsEntry.delete) deletedCount++;
      else if (obsEntry.change === 'valid_change') updatedCount++;
    }

    if (updatedCount === 0 && deletedCount === 0) {
      this.pagesDataService.showToast({ title: 'Data Correction', message: 'No changes to submit', type: ToastEventTypeEnum.INFO });
      return;
    }

    this.saveSummary = { updatedCount, deletedCount };
    this.saveConfirmOpen = true;
  }

  protected onSaveConfirm(): void {
    this.saveConfirmOpen = false;
    this.doSave();
  }

  private doSave(): void {
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
          flagId: obsEntry.observation.flagId,
          comment: obsEntry.observation.comment
        });
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
          this.loadData();
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
        this.loadData();
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
