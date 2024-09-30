import { Component } from '@angular/core';
import { ViewObservationQueryModel } from 'src/app/core/models/observations/view-observation-query.model';
import { ViewObservationModel } from 'src/app/core/models/observations/view-observation.model';
import { ObservationsService } from 'src/app/core/services/observations/observations.service';
import { PagesDataService } from 'src/app/core/services/pages-data.service';
import { ElementsService } from 'src/app/core/services/elements/elements.service';
import { ViewElementModel } from 'src/app/core/models/elements/view-element.model';
import { take } from 'rxjs';
import { SourcesService } from 'src/app/core/services/sources/sources.service';
import { ViewSourceModel } from 'src/app/core/models/sources/view-source.model';
import { CreateObservationModel } from 'src/app/core/models/observations/create-observation.model';
import { PageInputDefinition } from 'src/app/shared/controls/page-input/page-input-definition';
import { DeleteObservationModel } from 'src/app/core/models/observations/delete-observation.model';
import { Period, PeriodsUtil } from 'src/app/shared/controls/period-input/period-single-input/Periods.util';
import { ObservationDefinition } from '../../form-entry/defintions/observation.definition';

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
  protected period: number | null = null;
  protected elevation: number | null = null;
  protected fromDate: string | null = null;
  protected toDate: string | null = null;
  protected hour: number | null = null;
  protected useEntryDate: boolean = false;
  protected observationsEntries: ObservationEntry[] = [];
  private elementsMetadata: ViewElementModel[] = [];
  private sourcessMetadata: ViewSourceModel[] = [];
  private periods: Period[] = PeriodsUtil.possiblePeriods;
  protected pageInputDefinition: PageInputDefinition = new PageInputDefinition();
  private observationFilter!: ViewObservationQueryModel;
  protected enableSave: boolean = false;
  protected enableView: boolean = true;
  protected numOfChanges: number = 0;
  protected allBoundariesIndices: number[] = [];

  constructor(
    private pagesDataService: PagesDataService,
    private elementService: ElementsService,
    private sourcesService: SourcesService,
    private observationService: ObservationsService
  ) {

    this.elementService.findAll().pipe(take(1)).subscribe(data => {
      this.elementsMetadata = data;
    });

    this.sourcesService.findAll().pipe(take(1)).subscribe(data => {
      this.sourcessMetadata = data;
    });
  }


  protected onDateToUseSelection(selection: string): void {
    this.useEntryDate = selection === 'Entry Date';
  }

  protected onViewClick(): void {
    // Get the data based on the selection filter
    this.observationFilter = {};

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

    if (this.fromDate !== null) {
      this.observationFilter.fromDate = `${this.fromDate}T00:00:00Z`;
    }

    if (this.toDate !== null) {
      this.observationFilter.toDate = `${this.toDate}T23:00:00Z`;
    }

    this.observationsEntries = [];
    this.pageInputDefinition.setTotalRowCount(0);
    this.enableView = false;
    this.observationService.countDeleted(this.observationFilter).pipe(take(1)).subscribe(count => {
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
    this.observationFilter.page = this.pageInputDefinition.page;
    this.observationFilter.pageSize = this.pageInputDefinition.pageSize;
    this.observationService.findDeleted(this.observationFilter).pipe(take(1)).subscribe(data => {
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
    const periodFound = this.periods.find(item => item.id === minutes);
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
          elevation: viewModel.elevation,
          datetime: viewModel.datetime,
          period: viewModel.period,
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
          title: 'Observations', message: `${deletedObs.length} observation${deletedObs.length === 1 ? '' : 's'} hard deleted`, type: 'success'
        });

        this.onViewClick();
      } else {
        this.pagesDataService.showToast({
          title: 'Observations', message: `${deletedObs.length} observation${deletedObs.length === 1 ? '' : 's'} NOT hard deleted`, type: 'error'
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
          elevation: viewModel.elevation,
          datetime: viewModel.datetime,
          period: viewModel.period
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
          title: 'Observations', message: `${restoredObs.length} observation${restoredObs.length === 1 ? '' : 's'} restored`, type: 'success'
        });

        this.onViewClick();
      } else {
        this.pagesDataService.showToast({
          title: 'Observations', message: `${restoredObs.length} observation${restoredObs.length === 1 ? '' : 's'} NOT restored`, type: 'error'
        });
      }
    });
  }



}
