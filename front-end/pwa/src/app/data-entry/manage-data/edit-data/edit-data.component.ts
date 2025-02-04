import { Component, OnDestroy } from '@angular/core';
import { ViewObservationQueryModel } from 'src/app/core/models/observations/view-observation-query.model';
import { ViewObservationModel } from 'src/app/core/models/observations/view-observation.model';
import { ObservationsService } from 'src/app/data-entry/services/observations.service';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';
import { Subject, take, takeUntil } from 'rxjs';
import { ViewSourceModel } from 'src/app/metadata/sources/models/view-source.model';
import { CreateObservationModel } from 'src/app/core/models/observations/create-observation.model';
import { DeleteObservationModel } from 'src/app/core/models/observations/delete-observation.model';
import { Period, PeriodsUtil } from 'src/app/shared/controls/period-input/period-single-input/Periods.util';
import { ObservationDefinition } from '../../form-entry/defintions/observation.definition';
import { NumberUtils } from 'src/app/shared/utils/number.utils';
import { PagingParameters } from 'src/app/shared/controls/page-input/paging-parameters';
import { SourcesCacheService } from 'src/app/metadata/sources/services/sources-cache.service';
import { ElementCacheModel, ElementsCacheService } from 'src/app/metadata/elements/services/elements-cache.service';
import { GeneralSettingsService } from 'src/app/admin/general-settings/services/general-settings.service';
import { ClimsoftDisplayTimeZoneModel } from 'src/app/admin/general-settings/models/settings/climsoft-display-timezone.model';

interface ObservationEntry {
  obsDef: ObservationDefinition;
  delete: boolean;
  newStationId: string;
  newElementId: number;
}

@Component({
  selector: 'app-edit-data',
  templateUrl: './edit-data.component.html',
  styleUrls: ['./edit-data.component.scss']
})
export class EditDataComponent implements OnDestroy {
  protected stationId: string | null = null;
  protected sourceId: number | null = null;
  protected elementId: number | null = null;
  protected period: number | null = null;
  protected elevation: number | null = null;
  protected fromDate: string | null = null;
  protected toDate: string | null = null;
  protected hour: number | null = null;
  protected useEntryDate: boolean = false;
  protected observationsEntries: ObservationEntry[] = [];
  private elementsMetadata: ElementCacheModel[] = [];
  private sourcessMetadata: ViewSourceModel[] = [];
  private periods: Period[] = PeriodsUtil.possiblePeriods;
  protected pageInputDefinition: PagingParameters = new PagingParameters();
  private observationFilter!: ViewObservationQueryModel;
  protected enableSave: boolean = false;
  protected enableView: boolean = true;
  protected numOfChanges: number = 0;
  protected allBoundariesIndices: number[] = [];
  private utcOffset: number = 0;

  private destroy$ = new Subject<void>();

  constructor(
    private pagesDataService: PagesDataService,
    private elementService: ElementsCacheService,
    private sourcesService: SourcesCacheService,
    private observationService: ObservationsService,
    private generalSettingsService: GeneralSettingsService,
  ) {

    this.elementService.cachedElements.pipe(
      takeUntil(this.destroy$),
    ).subscribe(data => {
      this.elementsMetadata = data;
    });

    this.sourcesService.cachedSources.pipe(
      takeUntil(this.destroy$),
    ).subscribe(data => {
      this.sourcessMetadata = data;
    });

    // Get the climsoft v4 setting
    this.generalSettingsService.findOne(3).pipe(
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

  protected onViewClick(): void {
    console.log('view click')
    // Get the data based on the selection filter
    this.observationFilter = { deleted: false };

    if (this.stationId !== null) {
      this.observationFilter.stationIds = [this.stationId];
    }

    if (this.elementId !== null) {
      this.observationFilter.elementIds = [this.elementId];
    }

    if (this.period !== null) {
      this.observationFilter.period = this.period;
    }

    if (this.elevation !== null) {
      this.observationFilter.elevation = this.elevation;
    }

    if (this.sourceId !== null) {
      this.observationFilter.sourceIds = [this.sourceId];
    }

    // TODO. Investigate. If this is set to false, the dto is sets it true for some reasons
    // So only setting to true (making it to defined) when its to be set to true.
    // When this.useEntryDate is false then don't define it, to avoid the bug defined above.
    if (this.useEntryDate) {
      this.observationFilter.useEntryDate = true;
    }

    // TODO. Use the display UTC setting
    if (this.fromDate !== null) {
      this.observationFilter.fromDate = `${this.fromDate}T00:00:00Z`;
    }

    if (this.toDate !== null) {
      this.observationFilter.toDate = `${this.toDate}T23:00:00Z`;
    }

    this.observationsEntries = [];
    this.pageInputDefinition.setTotalRowCount(0);
    this.enableView = false;
    this.observationService.count(this.observationFilter).pipe(take(1)).subscribe(count => {
      this.enableView = true;
      this.pageInputDefinition.setTotalRowCount(count);
      if (count > 0) {
        this.loadData();
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

    this.observationService.findProcessed(this.observationFilter).pipe(take(1)).subscribe(data => {
      this.enableSave = true;
      const observationsEntries = data.map(viewObservationModel => {
        const elementMetadata = this.elementsMetadata.find(item => item.id === viewObservationModel.elementId);
        if (!elementMetadata) {
          throw new Error("Developer error: Element not found.");
        }

        const sourceMetadata = this.sourcessMetadata.find(item => item.id === viewObservationModel.sourceId);
        if (!sourceMetadata) {
          throw new Error("Developer error: Source not found.");
        }

        return {
          obsDef: new ObservationDefinition(viewObservationModel, elementMetadata, sourceMetadata.allowMissingValue, false, undefined),
          newStationId: '',
          newElementId: 0,
          delete: false
        }

      });

      this.setRowBoundaryLineSettongs(observationsEntries);
      this.observationsEntries = observationsEntries;

    });
  }

  protected setRowBoundaryLineSettongs(observationsEntries: ObservationEntry[]): void {
    const obsIdentifierMap = new Map<string, number>();

    for (let i = 0; i < observationsEntries.length; i++) {
      const obs = observationsEntries[i].obsDef.observation;
      const obsIdentifier = `${obs.stationId}-${obs.elementId}-${obs.elevation}-${obs.period}-${obs.datetime}`;
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

  protected asViewObservationModel(observationsDef: ObservationDefinition): ViewObservationModel {
    return (observationsDef.observation as ViewObservationModel);
  }

  protected getFormattedDatetime(strDateTimeInUTC: string): string {
    // Will subtract the offset to get UTC time if local time is ahead of UTC and add the offset to get UTC time if local time is behind UTC
    // Note, it's addition and NOT subtraction because this is meant to display the datetime NOT submiting it
    const dateAdjusted = new Date(strDateTimeInUTC);
    dateAdjusted.setHours(dateAdjusted.getHours() + this.utcOffset); 

    // TODO. Leaving this loggging here to show Angular change detection effects
    console.log('Before conversion: ', strDateTimeInUTC, '. After conversion: ',dateAdjusted.toISOString(), '. Offset: ', this.utcOffset );
    return dateAdjusted.toISOString().replace('T', ' ').replace('Z', '');
  }

  protected getPeriodName(minutes: number): string {
    const periodFound = this.periods.find(item => item.id === minutes);
    return periodFound ? periodFound.name : minutes + 'mins';
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
    this.enableSave = false;
    // Create required observation dtos 
    const changedObs: CreateObservationModel[] = [];
    for (const obsEntry of this.observationsEntries) {
      // Get observation entries that have not been deleted nor tehir station or or element id changed.
      if (!obsEntry.delete && !obsEntry.newStationId && !obsEntry.newElementId && obsEntry.obsDef.observationChanged) {
        // Important. Explicitly convert the view model to create model
        const viewModel = obsEntry.obsDef.observation as ViewObservationModel;
        changedObs.push({
          stationId: viewModel.stationId,
          elementId: viewModel.elementId,
          sourceId: viewModel.sourceId,
          elevation: viewModel.elevation,
          datetime: viewModel.datetime,
          period: viewModel.period,
          value: viewModel.value,
          flag: viewModel.flag,
          comment: viewModel.comment
        })
      }
    }


    if (changedObs.length === 0) {
      return;
    }

    // Send to server for saving
    this.observationService.bulkPutDataFromEntryForm(changedObs).subscribe((data) => {
      this.enableSave = true;
      if (data) {
        this.pagesDataService.showToast({
          title: 'Observations', message: `${changedObs.length} observation${changedObs.length === 1 ? '' : 's'} saved`, type: ToastEventTypeEnum.SUCCESS
        });

        this.onViewClick();
      } else {
        this.pagesDataService.showToast({
          title: 'Observations', message: `${changedObs.length} observation${changedObs.length === 1 ? '' : 's'} NOT saved`, type: ToastEventTypeEnum.ERROR
        });
      }
    });
  }

  private deleteObservations(): void {
    this.enableSave = false;
    // Create required observation dtos 
    const deletedObs: DeleteObservationModel[] = [];
    for (const obsEntry of this.observationsEntries) {
      if (obsEntry.delete) {
        // Important. Explicitly convert the view model to create model
        const viewModel = obsEntry.obsDef.observation as ViewObservationModel;
        deletedObs.push({
          stationId: viewModel.stationId,
          elementId: viewModel.elementId,
          sourceId: viewModel.sourceId,
          elevation: viewModel.elevation,
          datetime: viewModel.datetime,
          period: viewModel.period
        })
      }
    }


    if (deletedObs.length === 0) {
      return;
    }

    // Send to server for saving
    this.observationService.softDelete(deletedObs).subscribe((data) => {
      this.enableSave = true;
      if (data) {
        this.pagesDataService.showToast({
          title: 'Observations', message: `${deletedObs.length} observation${deletedObs.length === 1 ? '' : 's'} deleted`, type: ToastEventTypeEnum.SUCCESS
        });

        this.onViewClick();
      } else {
        this.pagesDataService.showToast({
          title: 'Observations', message: `${deletedObs.length} observation${deletedObs.length === 1 ? '' : 's'} NOT deleted`, type: ToastEventTypeEnum.ERROR
        });
      }
    });
  }


  protected getRowNumber(currentRowIndex: number): number {
    return NumberUtils.getRowNumber(this.pageInputDefinition.page, this.pageInputDefinition.pageSize, currentRowIndex);
  }
}
