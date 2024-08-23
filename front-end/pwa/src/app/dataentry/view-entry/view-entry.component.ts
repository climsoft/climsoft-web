import { Component } from '@angular/core';
import { ViewObservationQueryModel } from 'src/app/core/models/observations/view-observation-query.model';
import { ViewObservationModel } from 'src/app/core/models/observations/view-observation.model';
import { ObservationsService } from 'src/app/core/services/observations/observations.service';
import { PagesDataService } from 'src/app/core/services/pages-data.service';
import { ObservationDefinition } from '../form-entry/defintions/observation.definition';
import { ElementsService } from 'src/app/core/services/elements/elements.service';
import { ViewElementModel } from 'src/app/core/models/elements/view-element.model';
import { defer, take } from 'rxjs';
import { SourcesService } from 'src/app/core/services/sources/sources.service';
import { ViewSourceModel } from 'src/app/core/models/sources/view-source.model';
import { CreateObservationModel } from 'src/app/core/models/observations/create-observation.model';
import { PageInputDefinition } from 'src/app/shared/controls/page-input/page-input-definition';
import { getPossiblePeriods, Period } from 'src/app/shared/controls/period-input/period-single-input/Periods';
import { DeleteObservationModel } from 'src/app/core/models/observations/delete-observation.model';

interface ObservationEntry {
  obsDef: ObservationDefinition;
  delete: boolean;
  newStationId: string;
  newElementId: number;
}

@Component({
  selector: 'app-view-entry',
  templateUrl: './view-entry.component.html',
  styleUrls: ['./view-entry.component.scss']
})
export class ViewEntryComponent {

  protected stationId: string | null = null;
  protected sourceId: number | null = null;
  protected elementId: number | null = null;
  protected period: number | null = null;
  protected fromDate: string | null = null;
  protected toDate: string | null = null;
  protected hour: number | null = null;
  protected useEntryDate: boolean = false;
  protected observationsEntries: ObservationEntry[] = [];
  private elementsMetadata: ViewElementModel[] = [];
  private sourcessMetadata: ViewSourceModel[] = [];
  private periods: Period[] = getPossiblePeriods();
  protected pageInputDefinition: PageInputDefinition = new PageInputDefinition();
  private observationFilter!: ViewObservationQueryModel;
  protected enableSave: boolean = false;
  protected numOfChanges: number = 0;

  constructor(
    private pagesDataService: PagesDataService,
    private elementService: ElementsService,
    private sourcesService: SourcesService,
    private observationService: ObservationsService
  ) {
    this.pagesDataService.setPageHeader('Manage Data');

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

  protected refresh(): void {
    // Get the data based on the selection filter
    this.observationFilter = {};

    if (this.stationId) {
      this.observationFilter.stationIds = [this.stationId];
    }

    if (this.sourceId) {
      this.observationFilter.sourceIds = [this.sourceId];
    }

    if (this.elementId) {
      this.observationFilter.elementIds = [this.elementId];
    }

    if (this.period) {
      this.observationFilter.period = this.period;
    }

    // TODO. Investigate. If this is set to false, the dto is sets it true for some reasons
    // So only setting to true (making it to defined) when its to be set to true.
    // When this.useEntryDate is false then don't define it, to avoid the bug defined above.
    if (this.useEntryDate) {
      this.observationFilter.useEntryDate = true;
    }

    if (this.fromDate) {
      this.observationFilter.fromDate = `${this.fromDate}T00:00:00Z`;
    }

    if (this.toDate) {
      this.observationFilter.toDate = `${this.toDate}T23:00:00Z`;
    }

    this.observationsEntries = [];
    this.pageInputDefinition.setTotalRowCount(0)
    this.observationService.count(this.observationFilter).pipe(take(1)).subscribe(count => {
      this.pageInputDefinition.setTotalRowCount(count);
      if (count > 0) {
        this.loadData();
      }
    });

  }

  protected loadData(): void {
    this.enableSave = false;
    this.numOfChanges = 0;
    this.observationsEntries = [];
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
          obsDef: new ObservationDefinition(viewObservationModel, elementMetadata, sourceMetadata.allowMissingValue, false, false),
          newStationId: '',
          newElementId: 0,
          delete: false
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

  protected onOptionsSelected(optionSlected: 'Delete All'): void {
    switch (optionSlected) {
      case 'Delete All':
        this.observationsEntries.forEach(item => { item.delete = true });
        break;
      default:
        throw new Error("Developer error. Option not supported");
    }
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
    const changedObs: CreateObservationModel[] = []
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
    this.observationService.save(changedObs).subscribe((data) => {
      this.enableSave = true;
      if (data) {
        this.pagesDataService.showToast({
          title: 'Observations', message: `${changedObs.length} observation${changedObs.length === 1 ? '' : 's'} saved`, type: 'success'
        });

        this.refresh();
      } else {
        this.pagesDataService.showToast({
          title: 'Observations', message: `${changedObs.length} observation${changedObs.length === 1 ? '' : 's'} NOT saved`, type: 'error'
        });
      }
    });
  }

  private deleteObservations(): void {
    this.enableSave = false;
    // Create required observation dtos 
    const deletedObs: DeleteObservationModel[] = []
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
          title: 'Observations', message: `${deletedObs.length} observation${deletedObs.length === 1 ? '' : 's'} deleted`, type: 'success'
        });

        this.refresh();
      } else {
        this.pagesDataService.showToast({
          title: 'Observations', message: `${deletedObs.length} observation${deletedObs.length === 1 ? '' : 's'} NOT deleted`, type: 'error'
        });
      }
    });
  }

}
