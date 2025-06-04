import { Component, OnDestroy, OnInit } from '@angular/core';
import { ViewObservationQueryModel } from 'src/app/data-ingestion/models/view-observation-query.model';
import { ObservationsService } from '../services/observations.service';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';
import { Subject, take, takeUntil } from 'rxjs';
import { CreateObservationModel } from 'src/app/data-ingestion/models/create-observation.model';
import { DeleteObservationModel } from 'src/app/data-ingestion/models/delete-observation.model';
import { IntervalsUtil } from 'src/app/shared/controls/period-input/Intervals.util';
import { ObservationDefinition } from '../form-entry/defintitions/observation.definition';
import { NumberUtils } from 'src/app/shared/utils/number.utils';
import { PagingParameters } from 'src/app/shared/controls/page-input/paging-parameters';
import { GeneralSettingsService } from 'src/app/admin/general-settings/services/general-settings.service';
import { ClimsoftDisplayTimeZoneModel } from 'src/app/admin/general-settings/models/settings/climsoft-display-timezone.model';
import { DateUtils } from 'src/app/shared/utils/date.utils';
import { CachedMetadataSearchService } from 'src/app/metadata/metadata-updates/cached-metadata-search.service';
import { HttpErrorResponse } from '@angular/common/http';
import { SettingIdEnum } from 'src/app/admin/general-settings/models/setting-id.enum';
import { ActivatedRoute } from '@angular/router';

interface ObservationEntry {
  obsDef: ObservationDefinition;
  delete: boolean;
  newStationId: string;
  newElementId: number;
  stationName: string;
  elementId: number;
  elementAbbrv: string;
  sourceName: string;
  formattedDatetime: string;
  intervalName: string;
}

@Component({
  selector: 'app-data-correction',
  templateUrl: './data-correction.component.html',
  styleUrls: ['./data-correction.component.scss']
})
export class DataCorrectionComponent implements OnInit, OnDestroy {
  protected observationsEntries: ObservationEntry[] = [];

  protected pageInputDefinition: PagingParameters = new PagingParameters();

  protected enableSave: boolean = false;
  protected enableQueryButton: boolean = true;
  protected numOfChanges: number = 0;
  protected allBoundariesIndices: number[] = [];
  private utcOffset: number = 0;

  private queryFilter!: ViewObservationQueryModel;
  private allMetadataLoaded: boolean = false;

  private destroy$ = new Subject<void>();

  constructor(
    private pagesDataService: PagesDataService,
    private cachedMetadataSearchService: CachedMetadataSearchService,
    private observationService: ObservationsService,
    private generalSettingsService: GeneralSettingsService,
    private route: ActivatedRoute,
  ) {
    this.pagesDataService.setPageHeader('Data Correction');

    // Set default dates to yesterday
    const toDate: Date = new Date();
    const fromDate: Date = new Date();
    fromDate.setDate(toDate.getDate() - 1);
    this.queryFilter = { deleted: false, fromDate: DateUtils.getDateOnlyAsString(fromDate), toDate: DateUtils.getDateOnlyAsString(toDate) }

    this.cachedMetadataSearchService.allMetadataLoaded.pipe(
      takeUntil(this.destroy$),
    ).subscribe(data => {
      this.allMetadataLoaded = data;
      this.queryData();
    });

    // Get the climsoft time zone display setting
    this.generalSettingsService.findOne(SettingIdEnum.DISPLAY_TIME_ZONE).pipe(
      takeUntil(this.destroy$),
    ).subscribe(data => {
      this.utcOffset = (data.parameters as ClimsoftDisplayTimeZoneModel).utcOffset;
      this.queryData();
    });
  }

  ngOnInit(): void {
    this.route.queryParamMap.subscribe(params => {
      const stationIds: string[] = params.getAll('stationIds');
      const elementIds: string[] = params.getAll('elementIds');
      const intervals: string[] = params.getAll('intervals');
      const level: string | null = params.get('level');
      const fromDate: string | null = params.get('fromDate');
      const toDate: string | null = params.get('toDate');

      if (stationIds.length > 0) this.queryFilter.stationIds = stationIds;
      if (elementIds.length > 0) this.queryFilter.elementIds = elementIds.map(Number);
      if (intervals.length > 0) this.queryFilter.intervals = intervals.map(Number);
      if (level) this.queryFilter.level = parseInt(level, 10);
      if (fromDate) this.queryFilter.fromDate = fromDate;
      if (toDate) this.queryFilter.toDate = toDate;

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

  protected onQueryClick(observationFilter: ViewObservationQueryModel): void {
    // Get the data based on the selection filter
    this.queryFilter = observationFilter;
    this.queryData();
  }

  private queryData(): void {
    if (!(this.allMetadataLoaded && this.utcOffset !== undefined)) {
      return;
    }

    console.log('querying data...');
    console.log('metadata: ', this.allMetadataLoaded)

    this.observationsEntries = [];
    this.pageInputDefinition.setTotalRowCount(0);
    this.enableQueryButton = false;
    this.observationService.countCorrectionData(this.queryFilter).pipe(take(1)).subscribe(
      {
        next: count => {
          this.pageInputDefinition.setTotalRowCount(count);
          if (count > 0) {
            this.loadData();
          } else {
            this.pagesDataService.showToast({ title: 'Data Correction', message: 'No data', type: ToastEventTypeEnum.INFO });
            this.enableSave = false;
          }
          this.enableQueryButton = true;
        },
        error: err => {
          this.pagesDataService.showToast({ title: 'Data Correction', message: err, type: ToastEventTypeEnum.ERROR });
          this.enableQueryButton = true;
        },
      });
  }

  protected loadData(): void {
    this.enableQueryButton = false;
    this.enableSave = false;
    this.numOfChanges = 0;
    this.allBoundariesIndices = [];
    this.observationsEntries = [];
    this.queryFilter.page = this.pageInputDefinition.page;
    this.queryFilter.pageSize = this.pageInputDefinition.pageSize;

    this.observationService.findCorrectionData(this.queryFilter).pipe(
      take(1)
    ).subscribe({
      next: data => {
        const observationsEntries: ObservationEntry[] = data.map(observation => {
          const stationMetadata = this.cachedMetadataSearchService.getStation(observation.stationId);
          const elementMetadata = this.cachedMetadataSearchService.getElement(observation.elementId);
          const sourceMetadata = this.cachedMetadataSearchService.getSource(observation.sourceId);

          const entry: ObservationEntry = {
            obsDef: new ObservationDefinition(observation,
              elementMetadata,
              sourceMetadata.allowMissingValue,
              false,
              undefined,
              this.utcOffset,
              false),
            newStationId: '',
            newElementId: 0,
            delete: false,
            stationName: stationMetadata.name,
            elementId: elementMetadata.id,
            elementAbbrv: elementMetadata.name,
            sourceName: sourceMetadata.name,
            formattedDatetime: DateUtils.getPresentableDatetime(observation.datetime, this.utcOffset),
            intervalName: IntervalsUtil.getIntervalName(observation.interval)
          }
          return entry;

        });

        this.setRowBoundaryLineSettings(observationsEntries);
        this.observationsEntries = observationsEntries;
        this.enableQueryButton = true;
        this.enableSave = true;
      },
      error: err => {
        this.pagesDataService.showToast({ title: 'Data Correction', message: err, type: ToastEventTypeEnum.ERROR });
        this.enableQueryButton = true;
      },

    });
  }

  protected setRowBoundaryLineSettings(observationsEntries: ObservationEntry[]): void {
    const obsIdentifierMap = new Map<string, number>();

    for (let i = 0; i < observationsEntries.length; i++) {
      const obs = observationsEntries[i].obsDef.observation;
      const obsIdentifier = `${obs.stationId}-${obs.elementId}-${obs.level}-${obs.interval}-${obs.datetime}`;
      // Update the map with the latest index for each unique identifier
      obsIdentifierMap.set(obsIdentifier, i);
    }

    // set all last occurrence indices as boundaries
    this.allBoundariesIndices = Array.from(obsIdentifierMap.values());
    // If length indices array is the same as entries, then no need to show boundaries
    if (observationsEntries.length === this.allBoundariesIndices.length) {
      this.allBoundariesIndices = [];
    }
  }

  protected includeLowerBoundaryLine(index: number): boolean {
    return this.allBoundariesIndices.includes(index);
  }

  protected onOptionsSelected(optionSlected: 'Delete All'): void {
    switch (optionSlected) {
      case 'Delete All':
        this.observationsEntries.forEach(item => { item.delete = true });
        break;
      default:
        throw new Error("Developer error. Option not supported");
    }

    this.onUserInput();
  }

  protected onUserInput() {
    this.numOfChanges = 0;
    for (const obsEntry of this.observationsEntries) {
      if (obsEntry.delete || obsEntry.newElementId || obsEntry.newStationId || obsEntry.obsDef.observationChanged) {
        this.numOfChanges++;
      }
    }
  }

  protected onSave(): void {
    this.deleteObservations();
    this.updatedObservations();
  }

  private updatedObservations(): void {
    // Create required observation dtos 
    const changedObs: CreateObservationModel[] = [];
    for (const obsEntry of this.observationsEntries) {
      // Get observation entries that have not been deleted nor tehir station or or element id changed.
      if (!obsEntry.delete && !obsEntry.newStationId && !obsEntry.newElementId && obsEntry.obsDef.observationChanged) {
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

    this.enableSave = false;
    // Send to server for saving
    this.observationService.bulkPutDataFromDataCorrection(changedObs).subscribe({
      next: response => {
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
        // Important to log the error for tracing purposes
        console.log('error logged: ', err);

        if (err instanceof HttpErrorResponse) {
          if (err.status === 0) {
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
              title: 'Data Correction', message: `Something wrong happened. Contact admin.`, type: ToastEventTypeEnum.ERROR
            });
          }
        } else {
          this.pagesDataService.showToast({
            title: 'Data Entry', message: `Unknown server error. Contact admin.`, type: ToastEventTypeEnum.ERROR
          });
        }
      },
      complete: () => {
        this.enableSave = true;
      }
    });
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

    this.enableSave = false;
    // Send to server for saving
    this.observationService.softDelete(deletedObs).subscribe({
      next: data => {
        this.enableSave = true;
        if (data) {
          this.pagesDataService.showToast({
            title: 'Observations', message: `${deletedObs.length} observation${deletedObs.length === 1 ? '' : 's'} deleted`, type: ToastEventTypeEnum.SUCCESS
          });

          this.queryData();
        } else {
          this.pagesDataService.showToast({
            title: 'Observations', message: `${deletedObs.length} observation${deletedObs.length === 1 ? '' : 's'} NOT deleted`, type: ToastEventTypeEnum.ERROR
          });
        }
      },
      error: err => {
        this.pagesDataService.showToast({ title: 'Data Correction', message: err, type: ToastEventTypeEnum.ERROR });
      },
      complete: () => {
        this.enableSave = true;
      }
    });
  }

  protected getRowNumber(currentRowIndex: number): number {
    return NumberUtils.getRowNumber(this.pageInputDefinition.page, this.pageInputDefinition.pageSize, currentRowIndex);
  }
}
