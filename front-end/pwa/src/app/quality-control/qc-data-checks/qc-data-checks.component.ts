import { Component, OnDestroy, OnInit } from '@angular/core';
import { ViewObservationQueryModel } from 'src/app/data-ingestion/models/view-observation-query.model';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';
import { Subject, take, takeUntil } from 'rxjs';
import { CreateObservationModel } from 'src/app/data-ingestion/models/create-observation.model';
import { IntervalsUtil } from 'src/app/shared/controls/period-input/Intervals.util';
import { NumberUtils } from 'src/app/shared/utils/number.utils';
import { PagingParameters } from 'src/app/shared/controls/page-input/paging-parameters';
import { GeneralSettingsService } from 'src/app/admin/general-settings/services/general-settings.service';
import { ClimsoftDisplayTimeZoneModel } from 'src/app/admin/general-settings/models/settings/climsoft-display-timezone.model';
import { DateUtils } from 'src/app/shared/utils/date.utils';
import { CachedMetadataSearchService } from 'src/app/metadata/metadata-updates/cached-metadata-search.service';
import { HttpErrorResponse } from '@angular/common/http';
import { SettingIdEnum } from 'src/app/admin/general-settings/models/setting-id.enum';
import { ActivatedRoute } from '@angular/router';
import { ObservationDefinition } from 'src/app/data-ingestion/form-entry/defintitions/observation.definition';
import { ObservationsService } from 'src/app/data-ingestion/services/observations.service';
import { ElementsCacheService } from 'src/app/metadata/elements/services/elements-cache.service';
import { QCQueryModel } from '../qc-query.model';
import { QCStatusEnum } from 'src/app/data-ingestion/models/qc-status.enum';

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
  selector: 'app-qc-data-checks',
  templateUrl: './qc-data-checks.component.html',
  styleUrls: ['./qc-data-checks.component.scss']
})
export class QCDataChecksComponent implements OnInit, OnDestroy {
  protected observationsEntries: ObservationEntry[] = [];

  protected pageInputDefinition: PagingParameters = new PagingParameters();

  protected enableSave: boolean = false;
  protected enableQueryButton: boolean = true;
  protected numOfChanges: number = 0;
  protected allBoundariesIndices: number[] = [];
  private utcOffset: number = 0;

  protected queryFilter!: ViewObservationQueryModel;
  protected qcParameters!: QCQueryModel;
  private allMetadataLoaded: boolean = false;
 
  private destroy$ = new Subject<void>();

  constructor(
    private pagesDataService: PagesDataService,
    private elementsCacheService: ElementsCacheService,
    private cachedMetadataSearchService: CachedMetadataSearchService,
    private observationService: ObservationsService,
    private generalSettingsService: GeneralSettingsService,
    private route: ActivatedRoute,
  ) {
    this.pagesDataService.setPageHeader('QC Data Checks');

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
  
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  protected get componentName(): string {
    return QCDataChecksComponent.name;
  }

  protected onQueryQCClick(performQcParams: QCQueryModel): void {
    // Get the data based on the selection filter
    //this.queryFilter = observationFilter;
    //this.queryData();
  }

   protected onPerformQCClick(performQcParams: QCQueryModel): void {

   }

  private queryData(): void {
    if (!(this.allMetadataLoaded && this.queryFilter && this.utcOffset !== undefined)) {
      return;
    }

    console.log('querying data...');

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

    //this.updatedObservations();
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




  protected getRowNumber(currentRowIndex: number): number {
    return NumberUtils.getRowNumber(this.pageInputDefinition.page, this.pageInputDefinition.pageSize, currentRowIndex);
  }
}
