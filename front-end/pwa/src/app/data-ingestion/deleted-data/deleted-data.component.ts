import { Component, OnDestroy } from '@angular/core';
import { ViewObservationQueryModel } from 'src/app/data-ingestion/models/view-observation-query.model';
import { ViewObservationModel } from 'src/app/data-ingestion/models/view-observation.model';
import { ObservationsService } from '../services/observations.service';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';
import { Subject, take, takeUntil } from 'rxjs';
import { DeleteObservationModel } from 'src/app/data-ingestion/models/delete-observation.model';
import { IntervalsUtil } from 'src/app/shared/controls/period-input/interval-single-input/Intervals.util';
import { ObservationDefinition } from '../form-entry/defintitions/observation.definition';
import { PagingParameters } from 'src/app/shared/controls/page-input/paging-parameters';
import { DateUtils } from 'src/app/shared/utils/date.utils';
import { CachedMetadataSearchService } from 'src/app/metadata/metadata-updates/cached-metadata-search.service';
import { GeneralSettingsService } from 'src/app/admin/general-settings/services/general-settings.service';
import { ClimsoftDisplayTimeZoneModel } from 'src/app/admin/general-settings/models/settings/climsoft-display-timezone.model';

interface ObservationEntry {
  obsDef: ObservationDefinition;
  restore: boolean;
  hardDelete: boolean;
  stationName: string;
  elementAbbrv: string;
  sourceName: string;
  formattedDatetime: string;
  intervalName: string;
}

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
  private observationFilter!: ViewObservationQueryModel;
  protected enableSave: boolean = false;
  protected enableQueryButton: boolean = true;
  protected numOfChanges: number = 0;
  protected allBoundariesIndices: number[] = [];
  private utcOffset: number = 0;

  private destroy$ = new Subject<void>();

  constructor(
    private pagesDataService: PagesDataService,
    private cachedMetadataSearchService: CachedMetadataSearchService,
    private observationService: ObservationsService,
    private generalSettingsService: GeneralSettingsService,
  ) {
    this.pagesDataService.setPageHeader('Deleted Data');
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

  protected get componentName(): string {
    return DeletedDataComponent.name;
  }

  protected onQueryClick(observationFilter: ViewObservationQueryModel): void {
    // Get the data based on the selection filter
    this.observationFilter = observationFilter;
    this.queryData();
  }

  private queryData(): void {
    this.observationsEntries = [];
    this.pageInputDefinition.setTotalRowCount(0);
    this.enableQueryButton = false;
    this.observationService.count(this.observationFilter).pipe(
      take(1)
    ).subscribe({
      next: count => {
        this.pageInputDefinition.setTotalRowCount(count);
        if (count > 0) {
          this.loadData();
        } else {
          this.pagesDataService.showToast({ title: 'Delete Data', message: 'No data', type: ToastEventTypeEnum.INFO });
          this.enableSave = false;
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
    this.enableSave = false;
    this.numOfChanges = 0;
    this.allBoundariesIndices = [];
    this.observationsEntries = [];
    this.observationFilter.deleted = true;
    this.observationFilter.page = this.pageInputDefinition.page;
    this.observationFilter.pageSize = this.pageInputDefinition.pageSize;
    this.observationService.findProcessed(this.observationFilter).pipe(
      take(1)
    ).subscribe({
      next: data => {
        this.observationsEntries = data.map(observation => {
          const stationMetadata = this.cachedMetadataSearchService.getStation(observation.stationId);
          const elementMetadata = this.cachedMetadataSearchService.getElement(observation.elementId);
          const sourceMetadata = this.cachedMetadataSearchService.getSource(observation.sourceId);

          const entry: ObservationEntry = {
            obsDef: new ObservationDefinition(observation, elementMetadata, sourceMetadata.allowMissingValue, false, undefined),
            restore: false,
            hardDelete: false,
            stationName: stationMetadata.name,
            elementAbbrv: elementMetadata.name,
            sourceName: sourceMetadata.name,
            formattedDatetime: DateUtils.getPresentableDatetime(observation.datetime, this.utcOffset),
            intervalName: IntervalsUtil.getIntervalName(observation.interval)
          }

          return entry;
        });

      },
      error: err => {
        this.pagesDataService.showToast({ title: 'Delete Data', message: err, type: ToastEventTypeEnum.ERROR });
      },
      complete: () => {
        this.enableQueryButton = true;
        this.enableSave = true;
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
    this.restoreObservations();
    this.hardDeleteObservations();
  }


  private hardDeleteObservations(): void {
    this.enableSave = false;
    // Create required observation dtos 
    const deletedObs: DeleteObservationModel[] = [];
    for (const obsEntry of this.observationsEntries) {
      if (obsEntry.hardDelete) {
        // Important. Explicitly convert the view model to create model
        const viewModel = obsEntry.obsDef.observation as ViewObservationModel;
        deletedObs.push({
          stationId: viewModel.stationId,
          elementId: viewModel.elementId,
          level: viewModel.level,
          datetime: viewModel.datetime,
          interval: viewModel.interval,
          sourceId: viewModel.sourceId
        })
      }
    }


    if (deletedObs.length === 0) {
      return;
    }

    // Send to server for saving
    this.observationService.hardDelete(deletedObs).subscribe((data) => {
      this.enableSave = true;
      if (data) {
        this.pagesDataService.showToast({
          title: 'Observations', message: `${deletedObs.length} observation${deletedObs.length === 1 ? '' : 's'} hard deleted`, type: ToastEventTypeEnum.SUCCESS
        });

        this.queryData();
      } else {
        this.pagesDataService.showToast({
          title: 'Observations', message: `${deletedObs.length} observation${deletedObs.length === 1 ? '' : 's'} NOT hard deleted`, type: ToastEventTypeEnum.ERROR
        });
      }
    });
  }

  private restoreObservations(): void {
    this.enableSave = false;
    // Create required observation dtos 
    const restoredObs: DeleteObservationModel[] = [];
    for (const obsEntry of this.observationsEntries) {
      if (obsEntry.restore) {
        // Important. Explicitly convert the view model to create model
        const viewModel = obsEntry.obsDef.observation as ViewObservationModel;
        restoredObs.push({
          stationId: viewModel.stationId,
          elementId: viewModel.elementId,
          sourceId: viewModel.sourceId,
          level: viewModel.level,
          datetime: viewModel.datetime,
          interval: viewModel.interval
        })
      }
    }


    if (restoredObs.length === 0) {
      return;
    }

    // Send to server for saving
    this.observationService.restore(restoredObs).subscribe((data) => {
      this.enableSave = true;
      if (data) {
        this.pagesDataService.showToast({
          title: 'Observations', message: `${restoredObs.length} observation${restoredObs.length === 1 ? '' : 's'} restored`, type: ToastEventTypeEnum.SUCCESS
        });

        this.queryData();
      } else {
        this.pagesDataService.showToast({
          title: 'Observations', message: `${restoredObs.length} observation${restoredObs.length === 1 ? '' : 's'} NOT restored`, type: ToastEventTypeEnum.ERROR
        });
      }
    });
  }



}
