import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ViewObservationQueryModel } from 'src/app/data-ingestion/models/view-observation-query.model';
import { ObservationsService } from '../services/observations.service';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';
import { Subject, take, takeUntil } from 'rxjs';
import { DeleteObservationModel } from 'src/app/data-ingestion/models/delete-observation.model';
import { IntervalsUtil } from 'src/app/shared/controls/interval-selector/Intervals.util';
import { PagingParameters } from 'src/app/shared/controls/page-input/paging-parameters';
import { DateUtils } from 'src/app/shared/utils/date.utils';
import { CachedMetadataService } from 'src/app/metadata/metadata-updates/cached-metadata.service';
import { ObservationEntry } from 'src/app/observations/models/observation-entry.model';
import { AppAuthInterceptor } from 'src/app/app-auth.interceptor';
import { HttpErrorResponse } from '@angular/common/http';
import { DeleteConfirmationDialogComponent } from 'src/app/shared/controls/delete-confirmation-dialog/delete-confirmation-dialog.component';

@Component({
  selector: 'app-deleted-data',
  templateUrl: './deleted-data.component.html',
  styleUrls: ['./deleted-data.component.scss']
})
export class DeletedDataComponent implements OnInit, OnDestroy {
  @ViewChild('dlgHardDeleteAllConfirm') dlgHardDeleteAllConfirm!: DeleteConfirmationDialogComponent;

  protected observationsEntries: ObservationEntry[] = [];
  protected pageInputDefinition: PagingParameters = new PagingParameters();
  protected enableSaveButton: boolean = false;
  protected enableQueryButton: boolean = true;
  protected loading: boolean = false;
  protected changedCount: number = 0;
  protected restoreAllConfirmOpen: boolean = false;
  protected saveConfirmOpen: boolean = false;
  protected saveSummary: { restoredCount: number; hardDeletedCount: number } = { restoredCount: 0, hardDeletedCount: 0 };

  protected queryFilter!: ViewObservationQueryModel;
  private allMetadataLoaded: boolean = false;
  private destroy$ = new Subject<void>();

  constructor(
    private pagesDataService: PagesDataService,
    private cachedMetadataSearchService: CachedMetadataService,
    private observationService: ObservationsService,
  ) {
    this.pagesDataService.setPageHeader('Deleted Data');
  }

  ngOnInit(): void {
    this.cachedMetadataSearchService.allMetadataLoaded.pipe(
      takeUntil(this.destroy$),
    ).subscribe(allMetadataLoaded => {
      if (!allMetadataLoaded) return;
      this.allMetadataLoaded = allMetadataLoaded;

      if (!this.queryFilter) {
        const toDate: Date = new Date();
        const fromDate: Date = new Date();
        fromDate.setDate(toDate.getDate() - 1);

        this.queryFilter = {
          deleted: true,
          level: 0,
          fromDate: DateUtils.getDatetimesBasedOnUTCOffset(fromDate.toISOString(), this.cachedMetadataSearchService.utcOffSet, 'subtract'),
          toDate: DateUtils.getDatetimesBasedOnUTCOffset(toDate.toISOString(), this.cachedMetadataSearchService.utcOffSet, 'subtract'),
        };
      }

      this.loadData();
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
    this.queryFilter = observationFilter;
    this.queryFilter.deleted = true;
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
    this.queryFilter.deleted = true;
    this.queryFilter.page = this.pageInputDefinition.page;
    this.queryFilter.pageSize = this.pageInputDefinition.pageSize;

    this.observationService.count(this.queryFilter).pipe(
      take(1)
    ).subscribe({
      next: count => {
        this.enableQueryButton = true;
        this.pageInputDefinition.setTotalRowCount(count);
      },
      error: err => {
        this.enableQueryButton = true;
        this.pagesDataService.showToast({ title: 'Deleted Data', message: err.error?.message || 'Something bad happened', type: ToastEventTypeEnum.ERROR });
      },
    });

    this.observationService.findProcessed(this.queryFilter).pipe(
      take(1)
    ).subscribe({
      next: data => {
        this.loading = false;
        this.enableQueryButton = true;
        this.enableSaveButton = true;
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
            formattedDatetime: DateUtils.getPresentableDatetime(observation.datetime, this.cachedMetadataSearchService.utcOffSet),
            intervalName: IntervalsUtil.getIntervalName(observation.interval),
          }

          return entry;
        });

      },
      error: err => {
        this.loading = false;
        this.enableQueryButton = true;
        this.enableSaveButton = false;
        this.pagesDataService.showToast({ title: 'Deleted Data', message: err.error?.message || 'Something bad happened', type: ToastEventTypeEnum.ERROR });
      },
    });
  }

  protected restore(obsEntry: ObservationEntry): void {
    obsEntry.restore = !obsEntry.restore;
    this.onUserInput();
  }

  protected hardDelete(obsEntry: ObservationEntry): void {
    obsEntry.hardDelete = !obsEntry.hardDelete;
    this.onUserInput();
  }

  protected restoreAll(): void {
    this.restoreAllConfirmOpen = true;
  }

  protected hardDeleteAll(): void {
    this.dlgHardDeleteAllConfirm.openDialog();
  }

  protected onRestoreAllConfirm(): void {
    this.restoreAllConfirmOpen = false;
    this.observationsEntries.forEach(item => { item.restore = true });
    this.onUserInput();
  }

  protected onHardDeleteAllConfirm(): void {
    this.observationsEntries.forEach(item => { item.hardDelete = true });
    this.onUserInput();
  }

  protected onUserInput() {
    this.changedCount = 0;
    for (const obsEntry of this.observationsEntries) {
      if (obsEntry.restore || obsEntry.hardDelete) {
        this.changedCount++;
      }
    }
  }

  protected onSave(): void {
    let restoredCount = 0;
    let hardDeletedCount = 0;
    for (const obsEntry of this.observationsEntries) {
      if (obsEntry.hardDelete) hardDeletedCount++;
      else if (obsEntry.restore) restoredCount++;
    }

    if (restoredCount === 0 && hardDeletedCount === 0) {
      this.pagesDataService.showToast({ title: 'Deleted Data', message: 'No changes to submit', type: ToastEventTypeEnum.INFO });
      return;
    }

    this.saveSummary = { restoredCount, hardDeletedCount };
    this.saveConfirmOpen = true;
  }

  protected onSaveConfirm(): void {
    this.saveConfirmOpen = false;
    this.doSave();
  }

  private doSave(): void {
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
    this.observationService.hardDelete(deletedObs).subscribe({
      next: () => {
        this.enableSaveButton = true;
        this.pagesDataService.showToast({
          title: 'Deleted Data', message: `${deletedObs.length} observation${deletedObs.length === 1 ? '' : 's'} permanently deleted`, type: ToastEventTypeEnum.SUCCESS
        });

        if (changedObs.length > 0) {
          this.restoreObservations(changedObs);
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

  private restoreObservations(restoredObs: DeleteObservationModel[]): void {
    this.enableSaveButton = false;
    this.observationService.restore(restoredObs).subscribe({
      next: () => {
        this.enableSaveButton = true;
        const obsMessage: string = `${restoredObs.length} observation${restoredObs.length === 1 ? '' : 's'}`;
        this.pagesDataService.showToast({ title: 'Deleted Data', message: `${obsMessage} restored`, type: ToastEventTypeEnum.SUCCESS });
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
      this.pagesDataService.showToast({ title: 'Deleted Data', message: `Application is offline`, type: ToastEventTypeEnum.WARNING });
    } else if (err.status === 400) {
      this.pagesDataService.showToast({ title: 'Deleted Data', message: `${err.error.message}`, type: ToastEventTypeEnum.ERROR });
    } else {
      console.log('deleted data error: ', err);
      this.pagesDataService.showToast({ title: 'Deleted Data', message: `Something wrong happened. Contact admin.`, type: ToastEventTypeEnum.ERROR });
    }
  }

}
