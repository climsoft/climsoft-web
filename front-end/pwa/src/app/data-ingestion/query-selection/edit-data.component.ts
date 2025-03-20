import { Component, OnDestroy } from '@angular/core';
import { ViewObservationQueryModel } from 'src/app/data-ingestion/models/view-observation-query.model';
import { ObservationsService } from '../services/observations.service';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';
import { Subject, take, takeUntil } from 'rxjs';
import { ViewSourceModel } from 'src/app/metadata/source-templates/models/view-source.model';
import { CreateObservationModel } from 'src/app/data-ingestion/models/create-observation.model';
import { DeleteObservationModel } from 'src/app/data-ingestion/models/delete-observation.model';
import { Interval, IntervalsUtil } from 'src/app/shared/controls/period-input/period-single-input/Intervals.util';
import { ObservationDefinition } from '../form-entry/defintitions/observation.definition';
import { NumberUtils } from 'src/app/shared/utils/number.utils';
import { PagingParameters } from 'src/app/shared/controls/page-input/paging-parameters';
import { SourceTemplatesCacheService } from 'src/app/metadata/source-templates/services/source-templates-cache.service';
import { ElementCacheModel, ElementsCacheService } from 'src/app/metadata/elements/services/elements-cache.service';
import { GeneralSettingsService } from 'src/app/admin/general-settings/services/general-settings.service';
import { ClimsoftDisplayTimeZoneModel } from 'src/app/admin/general-settings/models/settings/climsoft-display-timezone.model';
import { AppAuthService } from 'src/app/app-auth.service';
import { StationCacheModel, StationsCacheService } from 'src/app/metadata/stations/services/stations-cache.service';
import { UserPermissionModel } from 'src/app/admin/users/models/user-permission.model';
import { DateUtils } from 'src/app/shared/utils/date.utils';

interface ObservationEntry {
  obsDef: ObservationDefinition;
  delete: boolean;
  newStationId: string;
  newElementId: number;
  stationName: string;
  elementAbbrv: string;
  sourceName: string;
  formattedDatetime: string;
  intervalName: string;
}

@Component({
  selector: 'app-edit-data',
  templateUrl: './edit-data.component.html',
  styleUrls: ['./edit-data.component.scss']
})
export class EditDataComponent implements OnDestroy {
  protected stationIds: string[] = [];
  protected includeOnlyStationIds: string[] = [];
  protected sourceIds: number[] = [];
  protected elementIds: number[] = [];
  protected interval: number | null = null;
  protected level: number | null = null;
  protected fromDate: string | null = null;
  protected toDate: string | null = null;
  protected hour: number | null = null;
  protected useEntryDate: boolean = false;
  protected observationsEntries: ObservationEntry[] = [];
  private stationsMetadata: StationCacheModel[] = [];
  private elementsMetadata: ElementCacheModel[] = [];
  private sourcesMetadata: ViewSourceModel[] = [];
  private intervals: Interval[] = IntervalsUtil.possibleIntervals;
  protected pageInputDefinition: PagingParameters = new PagingParameters();
  private observationFilter!: ViewObservationQueryModel;
  protected enableSave: boolean = false;
  protected enableQueryButton: boolean = true;
  protected numOfChanges: number = 0;
  protected allBoundariesIndices: number[] = [];
  private utcOffset: number = 0;


  private destroy$ = new Subject<void>();

  constructor(
    private pagesDataService: PagesDataService,
    private appAuthService: AppAuthService,
    private stationsCacheService: StationsCacheService,
    private elementService: ElementsCacheService,
    private sourcesService: SourceTemplatesCacheService,
    private observationService: ObservationsService,
    private generalSettingsService: GeneralSettingsService,
  ) {
    this.pagesDataService.setPageHeader('Data Correction');

    this.appAuthService.user.pipe(
      takeUntil(this.destroy$),
    ).subscribe(user => {
      if (!user) {
        throw new Error('User not logged in');
      }

      if (user.isSystemAdmin) {
        this.includeOnlyStationIds = [];
        return;
      }

      if (!user.permissions) {
        throw new Error('Developer error. Permissions NOT set.');
      }

      // Set stations permitted
      if (user.permissions.entryPermissions) {
        this.includeOnlyStationIds = user.permissions.entryPermissions.stationIds ? user.permissions.entryPermissions.stationIds : [];
      } else {
        throw new Error('Data entry not allowed');
      }
    });

    this.stationsCacheService.cachedStations.pipe(
      takeUntil(this.destroy$),
    ).subscribe(data => {
      this.stationsMetadata = data;
    });

    this.elementService.cachedElements.pipe(
      takeUntil(this.destroy$),
    ).subscribe(data => {
      this.elementsMetadata = data;
    });

    this.sourcesService.cachedSources.pipe(
      takeUntil(this.destroy$),
    ).subscribe(data => {
      this.sourcesMetadata = data;
    });

    // Get the climsoft time zone display setting
    this.generalSettingsService.findOne(2).pipe(
      takeUntil(this.destroy$),
    ).subscribe((data) => {
      this.utcOffset = (data.parameters as ClimsoftDisplayTimeZoneModel).utcOffset;
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  protected onDateToUseSelection(selection: string): void {
    this.useEntryDate = selection === 'Entry Date';
  }

  protected onQueryClick(): void {
    // Get the data based on the selection filter
    this.observationFilter = { deleted: false };

    if (this.stationIds.length > 0) {
      this.observationFilter.stationIds = this.stationIds;
    }

    if (this.elementIds.length > 0) {
      this.observationFilter.elementIds = this.elementIds;
    }

    if (this.interval !== null) {
      this.observationFilter.interval = this.interval;
    }

    if (this.level !== null) {
      this.observationFilter.level = this.level;
    }

    if (this.sourceIds.length > 0) {
      this.observationFilter.sourceIds = this.sourceIds;
    }

    // TODO. Investigate. If this is set to false, the dto sets it true for some reasons
    // So only setting to true (making it to defined) when its to be set to true.
    // When this.useEntryDate is false then don't define it, to avoid the bug defined above.
    if (this.useEntryDate) {
      this.observationFilter.useEntryDate = true;
    }

    if (this.fromDate !== null) {
      this.observationFilter.fromDate = `${this.fromDate}T00:00:00Z`;
    }

    if (this.toDate !== null) {
      this.observationFilter.toDate = `${this.toDate}T23:00:00Z`;
    }

    this.observationsEntries = [];
    this.pageInputDefinition.setTotalRowCount(0);
    this.enableQueryButton = false;
    this.observationService.count(this.observationFilter).pipe(take(1)).subscribe(
      {
        next: count => {
          this.pageInputDefinition.setTotalRowCount(count);
          if (count > 0) {
            this.loadData();
          }
        },
        error: err => {
          this.pagesDataService.showToast({ title: 'Data Correction', message: err, type: ToastEventTypeEnum.ERROR });
        },
        complete: () => {
          this.enableQueryButton = true;
        }
      });

  }

  protected loadData(): void {
    this.enableSave = false;
    this.numOfChanges = 0;
    this.allBoundariesIndices = [];
    this.observationsEntries = [];
    this.observationFilter.deleted = false;
    this.observationFilter.page = this.pageInputDefinition.page;
    this.observationFilter.pageSize = this.pageInputDefinition.pageSize;

    this.observationService.findCorrectionData(this.observationFilter).pipe(take(1)).subscribe(data => {
      this.enableSave = true;
      const observationsEntries: ObservationEntry[] = data.map(observation => {

        const stationMetadata = this.stationsMetadata.find(item => item.id === observation.stationId);
        if (!stationMetadata) {
          throw new Error("Developer error: Station not found.");
        }

        const elementMetadata = this.elementsMetadata.find(item => item.id === observation.elementId);
        if (!elementMetadata) {
          throw new Error("Developer error: Element not found.");
        }

        const sourceMetadata = this.sourcesMetadata.find(item => item.id === observation.sourceId);
        if (!sourceMetadata) {
          throw new Error("Developer error: Source not found.");
        }

        return {
          obsDef: new ObservationDefinition(observation, elementMetadata, sourceMetadata.allowMissingValue, false, undefined),
          newStationId: '',
          newElementId: 0,
          delete: false,
          stationName: stationMetadata.name,
          elementAbbrv: elementMetadata.name,
          sourceName: sourceMetadata.name,
          formattedDatetime: DateUtils.getPresentableDatetime(observation.datetime, this.utcOffset),
          intervalName: this.getIntervalName(observation.interval)
        }

      });

      this.setRowBoundaryLineSettings(observationsEntries);
      this.observationsEntries = observationsEntries;

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



  private getIntervalName(minutes: number): string {
    const intervalFound = this.intervals.find(item => item.id === minutes);
    return intervalFound ? intervalFound.name : minutes + 'mins';
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
    this.observationService.bulkPutDataFromEntryForm(changedObs).subscribe({
      next: data => {
        if (data) {
          this.pagesDataService.showToast({
            title: 'Observations', message: `${changedObs.length} observation${changedObs.length === 1 ? '' : 's'} saved`, type: ToastEventTypeEnum.SUCCESS
          });

          this.onQueryClick();
        } else {
          this.pagesDataService.showToast({
            title: 'Observations', message: `${changedObs.length} observation${changedObs.length === 1 ? '' : 's'} NOT saved`, type: ToastEventTypeEnum.ERROR
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

          this.onQueryClick();
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
