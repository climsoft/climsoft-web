import { Component } from '@angular/core';
import { ViewObservationQueryModel } from 'src/app/data-ingestion/models/view-observation-query.model';
import { ViewObservationModel } from 'src/app/data-ingestion/models/view-observation.model';
import { ObservationsService } from '../services/observations.service';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';
import { take } from 'rxjs';
import { ViewSourceModel } from 'src/app/metadata/source-templates/models/view-source.model';
import { DeleteObservationModel } from 'src/app/data-ingestion/models/delete-observation.model';
import { Interval, IntervalsUtil } from 'src/app/shared/controls/period-input/period-single-input/Intervals.util';
import { ObservationDefinition } from '../form-entry/defintitions/observation.definition';
import { PagingParameters } from 'src/app/shared/controls/page-input/paging-parameters';
import { ElementCacheModel, ElementsCacheService } from 'src/app/metadata/elements/services/elements-cache.service';
import { SourceTemplatesCacheService } from 'src/app/metadata/source-templates/services/source-templates-cache.service';

interface ObservationEntry {
  obsDef: ObservationDefinition;
  restore: boolean;
  hardDelete: boolean;
}

@Component({
  selector: 'app-deleted-data',
  templateUrl: './deleted-data.component.html',
  styleUrls: ['./deleted-data.component.scss']
})
export class DeletedDataComponent {
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
  private elementsMetadata: ElementCacheModel[] = [];
  private sourcessMetadata: ViewSourceModel[] = [];
  private intervals: Interval[] = IntervalsUtil.possibleIntervals;
  protected pageInputDefinition: PagingParameters = new PagingParameters();
  private observationFilter!: ViewObservationQueryModel;
  protected enableSave: boolean = false;
  protected enableView: boolean = true;
  protected numOfChanges: number = 0;
  protected allBoundariesIndices: number[] = [];

  constructor(
    private pagesDataService: PagesDataService,
    private elementService: ElementsCacheService,
    private sourcesService: SourceTemplatesCacheService,
    private observationService: ObservationsService
  ) {
    this.pagesDataService.setPageHeader('Deleted Data');

    this.elementService.cachedElements.pipe(take(1)).subscribe(data => {
      this.elementsMetadata = data;
    });

    this.sourcesService.cachedSources.pipe(take(1)).subscribe(data => {
      this.sourcessMetadata = data;
    });
  }


  protected onDateToUseSelection(selection: string): void {
    this.useEntryDate = selection === 'Entry Date';
  }

  protected onViewClick(): void {
    // Get the data based on the selection filter
    this.observationFilter = { deleted: true };

    if (this.stationId !== null) {
      this.observationFilter.stationIds = [this.stationId];
    }

    if (this.elementId !== null) {
      this.observationFilter.elementIds = [this.elementId];
    }

    if (this.interval !== null) {
      this.observationFilter.interval = this.interval;
    }

    if (this.level !== null) {
      this.observationFilter.level = this.level;
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
    this.observationFilter.deleted = true;
    this.observationFilter.page = this.pageInputDefinition.page;
    this.observationFilter.pageSize = this.pageInputDefinition.pageSize;
    this.observationService.findProcessed(this.observationFilter).pipe(take(1)).subscribe(data => {
      this.enableSave = true;
      this.observationsEntries = data.map(viewObservationModel => {
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
          restore: false,
          hardDelete: false
        }

      });

    });
  }


  protected asViewObservationModel(observationsDef: ObservationDefinition): ViewObservationModel {
    return (observationsDef.observation as ViewObservationModel);
  }

  protected getFormattedDatetime(strDateTime: string): string {
    return strDateTime.replace('T', ' ').replace('Z', '');
  }

  protected getPeriodName(minutes: number): string {
    const periodFound = this.intervals.find(item => item.id === minutes);
    return periodFound ? periodFound.name : minutes + 'mins';
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

        this.onViewClick();
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

        this.onViewClick();
      } else {
        this.pagesDataService.showToast({
          title: 'Observations', message: `${restoredObs.length} observation${restoredObs.length === 1 ? '' : 's'} NOT restored`, type: ToastEventTypeEnum.ERROR
        });
      }
    });
  }



}
