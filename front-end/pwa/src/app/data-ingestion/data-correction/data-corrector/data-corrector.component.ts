import { Component, EventEmitter, OnDestroy, Output, ViewChild } from '@angular/core';
import { ViewObservationQueryModel } from 'src/app/data-ingestion/models/view-observation-query.model';
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
import { AppAuthService } from 'src/app/app-auth.service';
import { ConfirmationDialogComponent } from 'src/app/shared/controls/confirmation-dialog/confirmation-dialog.component';
import { BulkPkUpdateDialogComponent } from '../bulk-pk-update-dialog/bulk-pk-update-dialog.component';
import { BulkDeleteDialogComponent } from '../bulk-delete-dialog/bulk-delete-dialog.component';
import { SourceCheckDialogComponent } from '../source-check-dialog/source-check-dialog.component';
import { ObservationsService } from '../../services/observations.service';
import { SourceCheckService } from '../../services/source-check.service';

@Component({
  selector: 'app-data-corrector',
  templateUrl: './data-corrector.component.html',
  styleUrls: ['./data-corrector.component.scss']
})
export class DataCorrectorComponent implements OnDestroy {
  @ViewChild('dlgSaveConfirm') dlgSaveConfirm!: ConfirmationDialogComponent;
  @ViewChild('dlgBulkPkUpdate') dlgBulkPkUpdate!: BulkPkUpdateDialogComponent;
  @ViewChild('dlgBulkDelete') dlgBulkDelete!: BulkDeleteDialogComponent;
  @ViewChild('dlgSourceCheck') dlgSourceCheck!: SourceCheckDialogComponent;

  @Output() public loadingInProgress = new EventEmitter<boolean>();
  @Output() public userChanges = new EventEmitter<number>();

  private queryFilter: ViewObservationQueryModel = {};

  protected loading: boolean = false;

  protected observationsEntries: ObservationEntry[] = [];
  protected pageInputDefinition: PagingParameters = new PagingParameters();

  protected saveSummary: { updatedCount: number; deletedCount: number } = { updatedCount: 0, deletedCount: 0 };

  protected useUnstackedViewer: boolean = false;
  protected changedCount: number = 0;
  protected isSystemAdmin: boolean = false;
  protected hasSourceDuplicates: boolean = false;
  protected allowDataEdits: boolean = true;

  private destroy$ = new Subject<void>();

  constructor(
    private pagesDataService: PagesDataService,
    private cachedMetadataSearchService: CachedMetadataService,
    private observationService: ObservationsService,
    private sourceCheckService: SourceCheckService,
    private appAuthService: AppAuthService,
  ) {

    // Check on allowed options
    this.appAuthService.user.pipe(
      takeUntil(this.destroy$),
    ).subscribe(user => {
      if (!user) return;
      this.isSystemAdmin = user.isSystemAdmin;
      this.allowDataEdits = user.isSystemAdmin || user.permissions?.entryPermissions ? true : false;
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  public query(queryFilter: ViewObservationQueryModel): void {
    this.queryFilter = queryFilter;
    this.loadData();
  }

  protected loadData(): void {

    this.setLoadingStatus(true);

    this.changedCount = 0;
    this.userChanges.emit(this.changedCount)
    this.observationsEntries = [];
    this.hasSourceDuplicates = false;
    this.queryFilter.page = this.pageInputDefinition.page;
    this.queryFilter.pageSize = this.pageInputDefinition.pageSize;

    this.observationService.count(this.queryFilter).pipe(
      take(1)
    ).subscribe(
      {
        next: count => {
          this.pageInputDefinition.setTotalRowCount(count);
        },
        error: err => {
          this.pagesDataService.showToast({ title: 'Data Correction', message: err.error?.message || 'Something bad happened', type: ToastEventTypeEnum.ERROR });
        },
      });

    this.sourceCheckService.exists(this.queryFilter).pipe(take(1)).subscribe({
      next: exists => this.hasSourceDuplicates = exists,
    });

    this.observationService.findProcessed(this.queryFilter).pipe(
      take(1)
    ).subscribe({
      next: data => {
        this.setLoadingStatus(false);
        this.observationsEntries = data.map(observation => {
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
      },
      error: err => {
        this.setLoadingStatus(false);
        this.pagesDataService.showToast({ title: 'Data Correction', message: err.error?.message || 'Something bad happened', type: ToastEventTypeEnum.ERROR });
      },
    });
  }

  protected stackToggle(): void {
    this.useUnstackedViewer = !this.useUnstackedViewer;
  }

  protected onBulkUpdate(): void {
    this.dlgBulkPkUpdate.openDialog(this.queryFilter);
  }

  protected onBulkDelete(): void {
    this.dlgBulkDelete.openDialog(this.queryFilter);
  }

  protected onSourceCheck(): void {
    this.dlgSourceCheck.openDialog(this.queryFilter);
  }

  protected onUserCorrectInput() {
    this.changedCount = 0;
    for (const entry of this.observationsEntries) {
      if (entry.delete || entry.change === 'valid_change' || entry.change === 'invalid_change')
        this.changedCount++;
    }
    this.userChanges.emit(this.changedCount)
  }

  protected onUserDeleteClick(observationEntry: ObservationEntry) {
    observationEntry.delete = !observationEntry.delete;
    this.onUserCorrectInput();
  }

  public submit(): void {
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
    this.dlgSaveConfirm.openDialog();
  }

  protected onSubmitConfirm(): void {
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
    this.setLoadingStatus(true);
    this.observationService.delete(deletedObs).subscribe({
      next: () => {
        this.setLoadingStatus(false);
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
        this.setLoadingStatus(false);
        this.handleError(err);
      },
    });
  }

  private updatedObservations(changedObs: CreateObservationModel[]): void {
    this.setLoadingStatus(true);
    this.observationService.bulkPutDataFromDataCorrection(changedObs).subscribe({
      next: () => {
        this.setLoadingStatus(false);
        const obsMessage: string = `${changedObs.length} observation${changedObs.length === 1 ? '' : 's'}`;
        this.pagesDataService.showToast({ title: 'Data Correction', message: `${obsMessage} saved`, type: ToastEventTypeEnum.SUCCESS });
        this.loadData();
      },
      error: err => {
        this.setLoadingStatus(false);
        this.handleError(err);
      },
    });
  }

  private setLoadingStatus(loading: boolean): void {
    this.loading = loading;
    this.loadingInProgress.emit(loading);
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
