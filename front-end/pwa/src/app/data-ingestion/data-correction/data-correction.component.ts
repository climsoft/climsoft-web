import { Component, OnDestroy, OnInit } from '@angular/core';
import { ViewObservationQueryModel } from 'src/app/data-ingestion/models/view-observation-query.model';
import { ObservationsService } from '../services/observations.service';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';
import { Subject, take, takeUntil } from 'rxjs';
import { CreateObservationModel } from 'src/app/data-ingestion/models/create-observation.model';
import { DeleteObservationModel } from 'src/app/data-ingestion/models/delete-observation.model';
import { IntervalsUtil } from 'src/app/shared/controls/period-input/Intervals.util';
import { ObservationDefinition } from '../form-entry/defintitions/observation.definition';
import { PagingParameters } from 'src/app/shared/controls/page-input/paging-parameters';
import { DateUtils } from 'src/app/shared/utils/date.utils';
import { CachedMetadataSearchService } from 'src/app/metadata/metadata-updates/cached-metadata-search.service';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { ObservationEntry } from 'src/app/observations/models/observation-entry.model';



@Component({
  selector: 'app-data-correction',
  templateUrl: './data-correction.component.html',
  styleUrls: ['./data-correction.component.scss']
})
export class DataCorrectionComponent implements OnInit, OnDestroy {
  protected observationsEntries: ObservationEntry[] = [];
  protected observations!: CreateObservationModel[];

  protected pageInputDefinition: PagingParameters = new PagingParameters();

  protected enableSaveButton: boolean = false;
  protected enableQueryButton: boolean = true;
  protected numOfChanges: number = 0;
  protected utcOffset: number = 0;

  protected queryFilter!: ViewObservationQueryModel;
  private allMetadataLoaded: boolean = false;
  protected useUnstackedViewer: boolean = false;

  private destroy$ = new Subject<void>();

  constructor(
    private pagesDataService: PagesDataService,
    private cachedMetadataSearchService: CachedMetadataSearchService,
    private observationService: ObservationsService,
    private route: ActivatedRoute,
  ) {
    this.pagesDataService.setPageHeader('Data Correction');

    this.cachedMetadataSearchService.allMetadataLoaded.pipe(
      takeUntil(this.destroy$),
    ).subscribe(allMetadataLoaded => {
      if (!allMetadataLoaded) return;
      // Get the climsoft time zone display setting
      this.utcOffset = this.cachedMetadataSearchService.getUTCOffSet();
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
    if (!(this.allMetadataLoaded && this.queryFilter && this.utcOffset !== undefined)) {
      return;
    }

    if (!this.enableQueryButton) return; // This means querying is still in progress. So no need to resend the request.

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
        this.observations = data;
        const observationsEntries: ObservationEntry[] = data.map(observation => {
          const stationMetadata = this.cachedMetadataSearchService.getStation(observation.stationId);
          const elementMetadata = this.cachedMetadataSearchService.getElement(observation.elementId);
          const sourceMetadata = this.cachedMetadataSearchService.getSource(observation.sourceId);

          const entry: ObservationEntry = {
            obsDef: new ObservationDefinition(this.cachedMetadataSearchService, observation, false),
            delete: false,
            stationName: stationMetadata.name,
            elementAbbrv: elementMetadata.name,
            sourceName: sourceMetadata.name,
            formattedDatetime: DateUtils.getPresentableDatetime(observation.datetime, this.utcOffset),
            intervalName: IntervalsUtil.getIntervalName(observation.interval)
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
        this.observationsEntries.forEach(item => { item.delete = true; });
        this.onUserInput();
        break;
      default:
        throw new Error("Developer error. Option not supported");
    }
  }

  protected onUserInput(): void {
    this.numOfChanges = 0;
    for (const obsEntry of this.observationsEntries) {
      if (obsEntry.delete || obsEntry.obsDef.observationChanged) this.numOfChanges++;
    }
  }

  protected onSave(): void {
    const deletedObs: DeleteObservationModel[] = [];
    const changedObs: CreateObservationModel[] = [];
    for (const obsEntry of this.observationsEntries) {
      const obsModel = obsEntry.obsDef.observation;
      if (obsEntry.delete) {
        deletedObs.push({
          stationId: obsModel.stationId,
          elementId: obsModel.elementId,
          sourceId: obsModel.sourceId,
          level: obsModel.level,
          datetime: obsModel.datetime,
          interval: obsModel.interval
        });
      } else if (obsEntry.obsDef.observationChanged) {
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
        });
      }
    }

    if (deletedObs.length > 0) {
      // Requery data only if there are no observation changes. This prevents mutliple requerying.
      this.deleteObservations(deletedObs, changedObs.length === 0);
    }

    if (changedObs.length > 0) {
      this.updatedObservations(changedObs);
    }

  }

  private deleteObservations(deletedObs: DeleteObservationModel[], reQueryData: boolean): void {
    this.enableSaveButton = false;
    // Send to server for saving
    this.observationService.softDelete(deletedObs).subscribe({
      next: data => {
        this.enableSaveButton = true;
        if (data) {
          this.pagesDataService.showToast({
            title: 'Data Correction', message: `${deletedObs.length} observation${deletedObs.length === 1 ? '' : 's'} deleted`, type: ToastEventTypeEnum.SUCCESS
          });

          if (reQueryData) this.queryData();

        } else {
          this.pagesDataService.showToast({
            title: 'Data Correction', message: `${deletedObs.length} observation${deletedObs.length === 1 ? '' : 's'} NOT deleted`, type: ToastEventTypeEnum.ERROR
          });
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
      next: response => {
        this.enableSaveButton = true;
        const obsMessage: string = `${changedObs.length} observation${changedObs.length === 1 ? '' : 's'}`;
        if (response.message === 'success') {
          this.pagesDataService.showToast({
            title: 'Data Correction', message: `${obsMessage} saved`, type: ToastEventTypeEnum.SUCCESS
          });

          this.queryData();
        } else {
          this.pagesDataService.showToast({
            title: 'Data Correction', message: `Something wrong happened. ${obsMessage} NOT saved`, type: ToastEventTypeEnum.ERROR
          });
        }

      },
      error: err => {
        this.enableSaveButton = true;
        this.handleError(err);
      },
    });
  }

  private handleError(err: HttpErrorResponse): void {
    if (err.status === 0 || err.status === 504) {
      // If there is network error then save observations as unsynchronised and no need to send data to server
      this.pagesDataService.showToast({
        title: 'Data Correction', message: `Application is offline`, type: ToastEventTypeEnum.WARNING
      });
    } else if (err.status === 400) {
      // If there is a bad request error then show the server message
      this.pagesDataService.showToast({
        title: 'Data Correction', message: `Invalid data. ${err.error.message}`, type: ToastEventTypeEnum.ERROR
      });
    } else {
      this.pagesDataService.showToast({
        title: 'Data Correction', message: `Something wrong happened. Contact admin. ${err}`, type: ToastEventTypeEnum.ERROR
      });
    }
  }

}
